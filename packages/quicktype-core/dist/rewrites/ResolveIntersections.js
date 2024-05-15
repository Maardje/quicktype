/* eslint-disable @typescript-eslint/brace-style */
import { iterableEvery, iterableFind, iterableFirst, mapMap, mapMapEntries, mapMergeWithInto, mapUpdateInto, setFilter, setIntersect, setMap, setUnionInto } from "collection-utils";
import { combineTypeAttributes, emptyTypeAttributes, makeTypeAttributesInferred } from "../attributes/TypeAttributes";
import { assert, defined, mustNotHappen, panic } from "../support/Support";
import { ArrayType, GenericClassProperty, IntersectionType, ObjectType, UnionType, isNumberTypeKind, isPrimitiveTypeKind } from "../Type";
import { makeGroupsToFlatten, matchTypeExhaustive, setOperationMembersRecursively } from "../TypeUtils";
import { UnionBuilder } from "../UnionBuilder";
function canResolve(t) {
    const members = setOperationMembersRecursively(t, undefined)[0];
    if (members.size <= 1)
        return true;
    return iterableEvery(members, m => !(m instanceof UnionType) || m.isCanonical);
}
function attributesForTypes(types) {
    return mapMapEntries(types.entries(), t => [t.kind, t.getAttributes()]);
}
class IntersectionAccumulator {
    constructor() {
        this._primitiveAttributes = new Map();
        this._arrayAttributes = emptyTypeAttributes;
        // We start out with all object types allowed, which means
        // _additionalPropertyTypes is empty - no restrictions - and
        // _classProperties is empty - no defined properties so far.
        //
        // If _additionalPropertyTypes is undefined, no additional
        // properties are allowed anymore.  If _classProperties is
        // undefined, no object types are allowed, in which case
        // _additionalPropertyTypes must also be undefined;
        this._objectProperties = new Map();
        this._objectAttributes = emptyTypeAttributes;
        this._additionalPropertyTypes = new Set();
        this._lostTypeAttributes = false;
    }
    updatePrimitiveTypes(members) {
        const types = setFilter(members, t => isPrimitiveTypeKind(t.kind));
        const attributes = attributesForTypes(types);
        mapMergeWithInto(this._primitiveAttributes, (a, b) => combineTypeAttributes("intersect", a, b), attributes);
        const kinds = setMap(types, t => t.kind);
        if (this._primitiveTypes === undefined) {
            this._primitiveTypes = new Set(kinds);
            return;
        }
        const haveNumber = iterableFind(this._primitiveTypes, isNumberTypeKind) !== undefined &&
            iterableFind(kinds, isNumberTypeKind) !== undefined;
        this._primitiveTypes = setIntersect(this._primitiveTypes, kinds);
        if (haveNumber && iterableFind(this._primitiveTypes, isNumberTypeKind) === undefined) {
            // One set has integer, the other has double.  The intersection
            // of that is integer.
            this._primitiveTypes = this._primitiveTypes.add("integer");
        }
    }
    updateArrayItemTypes(members) {
        const maybeArray = iterableFind(members, t => t instanceof ArrayType);
        if (maybeArray === undefined) {
            this._arrayItemTypes = false;
            return;
        }
        this._arrayAttributes = combineTypeAttributes("intersect", this._arrayAttributes, maybeArray.getAttributes());
        if (this._arrayItemTypes === undefined) {
            this._arrayItemTypes = new Set();
        }
        else if (this._arrayItemTypes !== false) {
            this._arrayItemTypes.add(maybeArray.items);
        }
    }
    updateObjectProperties(members) {
        const maybeObject = iterableFind(members, t => t instanceof ObjectType);
        if (maybeObject === undefined) {
            this._objectProperties = undefined;
            this._additionalPropertyTypes = undefined;
            return;
        }
        this._objectAttributes = combineTypeAttributes("intersect", this._objectAttributes, maybeObject.getAttributes());
        const objectAdditionalProperties = maybeObject.getAdditionalProperties();
        if (this._objectProperties === undefined) {
            assert(this._additionalPropertyTypes === undefined);
            return;
        }
        const allPropertyNames = setUnionInto(new Set(this._objectProperties.keys()), maybeObject.getProperties().keys());
        for (const name of allPropertyNames) {
            const existing = defined(this._objectProperties).get(name);
            const newProperty = maybeObject.getProperties().get(name);
            if (existing !== undefined && newProperty !== undefined) {
                const cp = new GenericClassProperty(existing.typeData.add(newProperty.type), existing.isOptional && newProperty.isOptional);
                defined(this._objectProperties).set(name, cp);
            }
            else if (existing !== undefined && objectAdditionalProperties !== undefined) {
                const cp = new GenericClassProperty(existing.typeData.add(objectAdditionalProperties), existing.isOptional);
                defined(this._objectProperties).set(name, cp);
            }
            else if (existing !== undefined) {
                defined(this._objectProperties).delete(name);
            }
            else if (newProperty !== undefined && this._additionalPropertyTypes !== undefined) {
                // FIXME: This is potentially slow
                const types = new Set(this._additionalPropertyTypes).add(newProperty.type);
                defined(this._objectProperties).set(name, new GenericClassProperty(types, newProperty.isOptional));
            }
            else if (newProperty !== undefined) {
                defined(this._objectProperties).delete(name);
            }
            else {
                return mustNotHappen();
            }
        }
        if (this._additionalPropertyTypes !== undefined && objectAdditionalProperties !== undefined) {
            this._additionalPropertyTypes.add(objectAdditionalProperties);
        }
        else if (this._additionalPropertyTypes !== undefined || objectAdditionalProperties !== undefined) {
            this._additionalPropertyTypes = undefined;
            this._lostTypeAttributes = true;
        }
    }
    addUnionSet(members) {
        this.updatePrimitiveTypes(members);
        this.updateArrayItemTypes(members);
        this.updateObjectProperties(members);
    }
    addType(t) {
        let attributes = t.getAttributes();
        matchTypeExhaustive(t, _noneType => {
            return panic("There shouldn't be a none type");
        }, _anyType => {
            return panic("The any type should have been filtered out in setOperationMembersRecursively");
        }, nullType => this.addUnionSet([nullType]), boolType => this.addUnionSet([boolType]), integerType => this.addUnionSet([integerType]), doubleType => this.addUnionSet([doubleType]), stringType => this.addUnionSet([stringType]), arrayType => this.addUnionSet([arrayType]), _classType => panic("We should never see class types in intersections"), _mapType => panic("We should never see map types in intersections"), objectType => this.addUnionSet([objectType]), _enumType => panic("We should never see enum types in intersections"), unionType => {
            attributes = combineTypeAttributes("intersect", [attributes].concat(Array.from(unionType.members).map(m => m.getAttributes())));
            this.addUnionSet(unionType.members);
        }, transformedStringType => this.addUnionSet([transformedStringType]));
        return makeTypeAttributesInferred(attributes);
    }
    get arrayData() {
        if (this._arrayItemTypes === undefined || this._arrayItemTypes === false) {
            return panic("This should not be called if the type can't be an array");
        }
        return this._arrayItemTypes;
    }
    get objectData() {
        if (this._objectProperties === undefined) {
            assert(this._additionalPropertyTypes === undefined);
            return undefined;
        }
        return [this._objectProperties, this._additionalPropertyTypes];
    }
    get enumCases() {
        return panic("We don't support enums in intersections");
    }
    getMemberKinds() {
        const kinds = mapMap(defined(this._primitiveTypes).entries(), k => defined(this._primitiveAttributes.get(k)));
        const maybeDoubleAttributes = this._primitiveAttributes.get("double");
        // If double was eliminated, add its attributes to integer
        if (maybeDoubleAttributes !== undefined && !kinds.has("double") && kinds.has("integer")) {
            // FIXME: How can this ever happen???  Where do we "eliminate" double?
            mapUpdateInto(kinds, "integer", a => {
                return combineTypeAttributes("intersect", defined(a), maybeDoubleAttributes);
            });
        }
        if (this._arrayItemTypes !== undefined && this._arrayItemTypes !== false) {
            kinds.set("array", this._arrayAttributes);
        }
        else if (this._arrayAttributes.size > 0) {
            this._lostTypeAttributes = true;
        }
        if (this._objectProperties !== undefined) {
            kinds.set("object", this._objectAttributes);
        }
        else if (this._objectAttributes.size > 0) {
            this._lostTypeAttributes = true;
        }
        return kinds;
    }
    get lostTypeAttributes() {
        return this._lostTypeAttributes;
    }
}
class IntersectionUnionBuilder extends UnionBuilder {
    constructor() {
        super(...arguments);
        this._createdNewIntersections = false;
    }
    makeIntersection(members, attributes) {
        const reconstitutedMembers = setMap(members, t => this.typeBuilder.reconstituteTypeRef(t.typeRef));
        const first = defined(iterableFirst(reconstitutedMembers));
        if (reconstitutedMembers.size === 1) {
            this.typeBuilder.addAttributes(first, attributes);
            return first;
        }
        this._createdNewIntersections = true;
        return this.typeBuilder.getUniqueIntersectionType(attributes, reconstitutedMembers);
    }
    get createdNewIntersections() {
        return this._createdNewIntersections;
    }
    makeObject(maybeData, typeAttributes, forwardingRef) {
        if (maybeData === undefined) {
            return panic("Either properties or additional properties must be given to make an object type");
        }
        const [propertyTypes, maybeAdditionalProperties] = maybeData;
        const properties = mapMap(propertyTypes, cp => this.typeBuilder.makeClassProperty(this.makeIntersection(cp.typeData, emptyTypeAttributes), cp.isOptional));
        const additionalProperties = maybeAdditionalProperties === undefined
            ? undefined
            : this.makeIntersection(maybeAdditionalProperties, emptyTypeAttributes);
        return this.typeBuilder.getUniqueObjectType(typeAttributes, properties, additionalProperties, forwardingRef);
    }
    makeArray(arrays, typeAttributes, forwardingRef) {
        // FIXME: attributes
        const itemsType = this.makeIntersection(arrays, emptyTypeAttributes);
        const tref = this.typeBuilder.getArrayType(typeAttributes, itemsType, forwardingRef);
        return tref;
    }
}
export function resolveIntersections(graph, stringTypeMapping, debugPrintReconstitution) {
    let needsRepeat = false;
    function replace(types, builder, forwardingRef) {
        const intersections = setFilter(types, t => t instanceof IntersectionType);
        const [members, intersectionAttributes] = setOperationMembersRecursively(Array.from(intersections), "intersect");
        if (members.size === 0) {
            const t = builder.getPrimitiveType("any", intersectionAttributes, forwardingRef);
            return t;
        }
        if (members.size === 1) {
            return builder.reconstituteType(defined(iterableFirst(members)), intersectionAttributes, forwardingRef);
        }
        const accumulator = new IntersectionAccumulator();
        const extraAttributes = makeTypeAttributesInferred(combineTypeAttributes("intersect", Array.from(members).map(t => accumulator.addType(t))));
        const attributes = combineTypeAttributes("intersect", intersectionAttributes, extraAttributes);
        const unionBuilder = new IntersectionUnionBuilder(builder);
        const tref = unionBuilder.buildUnion(accumulator, true, attributes, forwardingRef);
        if (unionBuilder.createdNewIntersections) {
            needsRepeat = true;
        }
        return tref;
    }
    // FIXME: We need to handle intersections that resolve to the same set of types.
    // See for example the intersections-nested.schema example.
    const allIntersections = setFilter(graph.allTypesUnordered(), t => t instanceof IntersectionType);
    const resolvableIntersections = setFilter(allIntersections, canResolve);
    const groups = makeGroupsToFlatten(resolvableIntersections, undefined);
    graph = graph.rewrite("resolve intersections", stringTypeMapping, false, groups, debugPrintReconstitution, replace);
    // console.log(`resolved ${resolvableIntersections.size} of ${intersections.size} intersections`);
    return [graph, !needsRepeat && allIntersections.size === resolvableIntersections.size];
}
