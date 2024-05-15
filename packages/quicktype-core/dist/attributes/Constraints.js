import { messageError } from "../Messages";
import { assert } from "../support/Support";
import { TypeAttributeKind } from "./TypeAttributes";
function checkMinMaxConstraint(minmax) {
    const [min, max] = minmax;
    if (typeof min === "number" && typeof max === "number" && min > max) {
        return messageError("MiscInvalidMinMaxConstraint", { min, max });
    }
    if (min === undefined && max === undefined) {
        return undefined;
    }
    return minmax;
}
export class MinMaxConstraintTypeAttributeKind extends TypeAttributeKind {
    constructor(name, _typeKinds, _minSchemaProperty, _maxSchemaProperty) {
        super(name);
        this._typeKinds = _typeKinds;
        this._minSchemaProperty = _minSchemaProperty;
        this._maxSchemaProperty = _maxSchemaProperty;
    }
    get inIdentity() {
        return true;
    }
    combine(arr) {
        assert(arr.length > 0);
        let [min, max] = arr[0];
        for (let i = 1; i < arr.length; i++) {
            const [otherMin, otherMax] = arr[i];
            if (typeof min === "number" && typeof otherMin === "number") {
                min = Math.min(min, otherMin);
            }
            else {
                min = undefined;
            }
            if (typeof max === "number" && typeof otherMax === "number") {
                max = Math.max(max, otherMax);
            }
            else {
                max = undefined;
            }
        }
        return checkMinMaxConstraint([min, max]);
    }
    intersect(arr) {
        assert(arr.length > 0);
        let [min, max] = arr[0];
        for (let i = 1; i < arr.length; i++) {
            const [otherMin, otherMax] = arr[i];
            if (typeof min === "number" && typeof otherMin === "number") {
                min = Math.max(min, otherMin);
            }
            else if (min === undefined) {
                min = otherMin;
            }
            if (typeof max === "number" && typeof otherMax === "number") {
                max = Math.min(max, otherMax);
            }
            else if (max === undefined) {
                max = otherMax;
            }
        }
        return checkMinMaxConstraint([min, max]);
    }
    makeInferred(_) {
        return undefined;
    }
    addToSchema(schema, t, attr) {
        if (this._typeKinds.has(t.kind))
            return;
        const [min, max] = attr;
        if (min !== undefined) {
            schema[this._minSchemaProperty] = min;
        }
        if (max !== undefined) {
            schema[this._maxSchemaProperty] = max;
        }
    }
    stringify([min, max]) {
        return `${min}-${max}`;
    }
}
export const minMaxTypeAttributeKind = new MinMaxConstraintTypeAttributeKind("minMax", new Set(["integer", "double"]), "minimum", "maximum");
export const minMaxLengthTypeAttributeKind = new MinMaxConstraintTypeAttributeKind("minMaxLength", new Set(["string"]), "minLength", "maxLength");
function producer(schema, minProperty, maxProperty) {
    if (!(typeof schema === "object"))
        return undefined;
    let min = undefined;
    let max = undefined;
    if (typeof schema[minProperty] === "number") {
        min = schema[minProperty];
    }
    if (typeof schema[maxProperty] === "number") {
        max = schema[maxProperty];
    }
    if (min === undefined && max === undefined)
        return undefined;
    return [min, max];
}
export function minMaxAttributeProducer(schema, _ref, types) {
    if (!types.has("number") && !types.has("integer"))
        return undefined;
    const maybeMinMax = producer(schema, "minimum", "maximum");
    if (maybeMinMax === undefined)
        return undefined;
    return { forNumber: minMaxTypeAttributeKind.makeAttributes(maybeMinMax) };
}
export function minMaxLengthAttributeProducer(schema, _ref, types) {
    if (!types.has("string"))
        return undefined;
    const maybeMinMaxLength = producer(schema, "minLength", "maxLength");
    if (maybeMinMaxLength === undefined)
        return undefined;
    return { forString: minMaxLengthTypeAttributeKind.makeAttributes(maybeMinMaxLength) };
}
export function minMaxValueForType(t) {
    return minMaxTypeAttributeKind.tryGetInAttributes(t.getAttributes());
}
export function minMaxLengthForType(t) {
    return minMaxLengthTypeAttributeKind.tryGetInAttributes(t.getAttributes());
}
export class PatternTypeAttributeKind extends TypeAttributeKind {
    constructor() {
        super("pattern");
    }
    get inIdentity() {
        return true;
    }
    combine(arr) {
        assert(arr.length > 0);
        return arr.map(p => `(${p})`).join("|");
    }
    intersect(_arr) {
        /** FIXME!!! what is the intersection of regexps? */
        return undefined;
    }
    makeInferred(_) {
        return undefined;
    }
    addToSchema(schema, t, attr) {
        if (t.kind !== "string")
            return;
        schema.pattern = attr;
    }
}
export const patternTypeAttributeKind = new PatternTypeAttributeKind();
export function patternAttributeProducer(schema, _ref, types) {
    if (!(typeof schema === "object"))
        return undefined;
    if (!types.has("string"))
        return undefined;
    const patt = schema.pattern;
    if (typeof patt !== "string")
        return undefined;
    return { forString: patternTypeAttributeKind.makeAttributes(patt) };
}
export function patternForType(t) {
    return patternTypeAttributeKind.tryGetInAttributes(t.getAttributes());
}
