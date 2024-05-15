import { StringTypes, inferTransformedStringTypeKindForString } from "../attributes/StringTypes";
import { emptyTypeAttributes } from "../attributes/TypeAttributes";
import { messageError } from "../Messages";
import { assert, assertNever, defined, panic } from "../support/Support";
import { ArrayType, ClassType, MapType, UnionType, transformedStringTypeTargetTypeKindsMap } from "../Type";
import { derefTypeRef } from "../TypeGraph";
import { nullableFromUnion } from "../TypeUtils";
import { UnionAccumulator, UnionBuilder } from "../UnionBuilder";
import { Tag, valueTag } from "./CompressedJSON";
function forEachArrayInNestedValueArray(va, f) {
    if (va.length === 0) {
        return;
    }
    if (Array.isArray(va[0])) {
        for (const x of va) {
            forEachArrayInNestedValueArray(x, f);
        }
    }
    else {
        f(va);
    }
}
function forEachValueInNestedValueArray(va, f) {
    forEachArrayInNestedValueArray(va, a => {
        for (const x of a) {
            f(x);
        }
    });
}
class InferenceUnionBuilder extends UnionBuilder {
    constructor(typeBuilder, _typeInference, _fixed) {
        super(typeBuilder);
        this._typeInference = _typeInference;
        this._fixed = _fixed;
    }
    makeObject(objects, typeAttributes, forwardingRef) {
        return this._typeInference.inferClassType(typeAttributes, objects, this._fixed, forwardingRef);
    }
    makeArray(arrays, typeAttributes, forwardingRef) {
        return this.typeBuilder.getArrayType(typeAttributes, this._typeInference.inferType(emptyTypeAttributes, arrays, this._fixed, forwardingRef));
    }
}
function canBeEnumCase(_s) {
    return true;
}
export class TypeInference {
    constructor(_cjson, _typeBuilder, _inferMaps, _inferEnums) {
        this._cjson = _cjson;
        this._typeBuilder = _typeBuilder;
        this._inferMaps = _inferMaps;
        this._inferEnums = _inferEnums;
    }
    addValuesToAccumulator(valueArray, accumulator) {
        forEachValueInNestedValueArray(valueArray, value => {
            const t = valueTag(value);
            switch (t) {
                case Tag.Null:
                    accumulator.addPrimitive("null", emptyTypeAttributes);
                    break;
                case Tag.False:
                case Tag.True:
                    accumulator.addPrimitive("bool", emptyTypeAttributes);
                    break;
                case Tag.Integer:
                    accumulator.addPrimitive("integer", emptyTypeAttributes);
                    break;
                case Tag.Double:
                    accumulator.addPrimitive("double", emptyTypeAttributes);
                    break;
                case Tag.InternedString:
                    if (this._inferEnums) {
                        const s = this._cjson.getStringForValue(value);
                        if (canBeEnumCase(s)) {
                            accumulator.addStringCase(s, 1, emptyTypeAttributes);
                        }
                        else {
                            accumulator.addStringType("string", emptyTypeAttributes);
                        }
                    }
                    else {
                        accumulator.addStringType("string", emptyTypeAttributes);
                    }
                    break;
                case Tag.UninternedString:
                    accumulator.addStringType("string", emptyTypeAttributes);
                    break;
                case Tag.Object:
                    accumulator.addObject(this._cjson.getObjectForValue(value), emptyTypeAttributes);
                    break;
                case Tag.Array:
                    accumulator.addArray(this._cjson.getArrayForValue(value), emptyTypeAttributes);
                    break;
                case Tag.StringFormat: {
                    const kind = this._cjson.getStringFormatTypeKind(value);
                    accumulator.addStringType("string", emptyTypeAttributes, new StringTypes(new Map(), new Set([kind])));
                    break;
                }
                case Tag.TransformedString: {
                    const s = this._cjson.getStringForValue(value);
                    const kind = inferTransformedStringTypeKindForString(s, this._cjson.dateTimeRecognizer);
                    if (kind === undefined) {
                        return panic("TransformedString does not have a kind");
                    }
                    const producer = defined(transformedStringTypeTargetTypeKindsMap.get(kind)).attributesProducer;
                    if (producer === undefined) {
                        return panic("TransformedString does not have attribute producer");
                    }
                    accumulator.addStringType("string", producer(s), new StringTypes(new Map(), new Set([kind])));
                    break;
                }
                default:
                    return assertNever(t);
            }
        });
    }
    inferType(typeAttributes, valueArray, fixed, forwardingRef) {
        const accumulator = this.accumulatorForArray(valueArray);
        return this.makeTypeFromAccumulator(accumulator, typeAttributes, fixed, forwardingRef);
    }
    resolveRef(ref, topLevel) {
        if (!ref.startsWith("#/")) {
            return messageError("InferenceJSONReferenceNotRooted", { reference: ref });
        }
        const parts = ref.split("/").slice(1);
        const graph = this._typeBuilder.typeGraph;
        let tref = topLevel;
        for (const part of parts) {
            let t = derefTypeRef(tref, graph);
            if (t instanceof UnionType) {
                const nullable = nullableFromUnion(t);
                if (nullable === null) {
                    // FIXME: handle unions
                    return messageError("InferenceJSONReferenceToUnion", { reference: ref });
                }
                t = nullable;
            }
            if (t instanceof ClassType) {
                const cp = t.getProperties().get(part);
                if (cp === undefined) {
                    return messageError("InferenceJSONReferenceWrongProperty", { reference: ref });
                }
                tref = cp.typeRef;
            }
            else if (t instanceof MapType) {
                tref = t.values.typeRef;
            }
            else if (t instanceof ArrayType) {
                if (/^[0-9]+$/.exec(part) === null) {
                    return messageError("InferenceJSONReferenceInvalidArrayIndex", { reference: ref });
                }
                tref = t.items.typeRef;
            }
            else {
                return messageError("InferenceJSONReferenceWrongProperty", { reference: ref });
            }
        }
        return tref;
    }
    inferTopLevelType(typeAttributes, valueArray, fixed) {
        assert(this._refIntersections === undefined, "Didn't reset ref intersections - nested invocations?");
        if (this._cjson.handleRefs) {
            this._refIntersections = [];
        }
        const topLevel = this.inferType(typeAttributes, valueArray, fixed);
        if (this._cjson.handleRefs) {
            for (const [tref, refs] of defined(this._refIntersections)) {
                const resolved = refs.map(r => this.resolveRef(r, topLevel));
                this._typeBuilder.setSetOperationMembers(tref, new Set(resolved));
            }
            this._refIntersections = undefined;
        }
        return topLevel;
    }
    accumulatorForArray(valueArray) {
        const accumulator = new UnionAccumulator(true);
        this.addValuesToAccumulator(valueArray, accumulator);
        return accumulator;
    }
    makeTypeFromAccumulator(accumulator, typeAttributes, fixed, forwardingRef) {
        const unionBuilder = new InferenceUnionBuilder(this._typeBuilder, this, fixed);
        return unionBuilder.buildUnion(accumulator, false, typeAttributes, forwardingRef);
    }
    inferClassType(typeAttributes, objects, fixed, forwardingRef) {
        const propertyNames = [];
        const propertyValues = {};
        forEachArrayInNestedValueArray(objects, arr => {
            for (let i = 0; i < arr.length; i += 2) {
                const key = this._cjson.getStringForValue(arr[i]);
                const value = arr[i + 1];
                if (!Object.prototype.hasOwnProperty.call(propertyValues, key)) {
                    propertyNames.push(key);
                    propertyValues[key] = [];
                }
                propertyValues[key].push(value);
            }
        });
        if (this._cjson.handleRefs && propertyNames.length === 1 && propertyNames[0] === "$ref") {
            const values = propertyValues.$ref;
            if (values.every(v => valueTag(v) === Tag.InternedString)) {
                const allRefs = values.map(v => this._cjson.getStringForValue(v));
                // FIXME: Add is-ref attribute
                const tref = this._typeBuilder.getUniqueIntersectionType(typeAttributes, undefined);
                defined(this._refIntersections).push([tref, allRefs]);
                return tref;
            }
        }
        if (this._inferMaps && propertyNames.length > 500) {
            const accumulator = new UnionAccumulator(true);
            for (const key of propertyNames) {
                this.addValuesToAccumulator(propertyValues[key], accumulator);
            }
            const values = this.makeTypeFromAccumulator(accumulator, emptyTypeAttributes, fixed);
            return this._typeBuilder.getMapType(typeAttributes, values, forwardingRef);
        }
        const properties = new Map();
        for (const key of propertyNames) {
            const values = propertyValues[key];
            const t = this.inferType(emptyTypeAttributes, values, false);
            const isOptional = values.length < objects.length;
            properties.set(key, this._typeBuilder.makeClassProperty(t, isOptional));
        }
        if (fixed) {
            return this._typeBuilder.getUniqueClassType(typeAttributes, true, properties, forwardingRef);
        }
        else {
            return this._typeBuilder.getClassType(typeAttributes, properties, forwardingRef);
        }
    }
}
