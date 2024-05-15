import { hashString, mapFilter, mapFilterMap, mapTranspose } from "collection-utils";
import { assert, panic } from "../support/Support";
export class TypeAttributeKind {
    constructor(name) {
        this.name = name;
    }
    appliesToTypeKind(kind) {
        return kind !== "any";
    }
    combine(_attrs) {
        return panic(`Cannot combine type attribute ${this.name}`);
    }
    intersect(attrs) {
        return this.combine(attrs);
    }
    makeInferred(_) {
        return panic(`Cannot make type attribute ${this.name} inferred`);
    }
    increaseDistance(attrs) {
        return attrs;
    }
    addToSchema(_schema, _t, _attrs) {
        return;
    }
    children(_) {
        return new Set();
    }
    stringify(_) {
        return undefined;
    }
    get inIdentity() {
        return false;
    }
    requiresUniqueIdentity(_) {
        return false;
    }
    reconstitute(_builder, a) {
        return a;
    }
    makeAttributes(value) {
        const kvps = [[this, value]];
        return new Map(kvps);
    }
    tryGetInAttributes(a) {
        return a.get(this);
    }
    setInAttributes(a, value) {
        // FIXME: This is potentially super slow
        return new Map(a).set(this, value);
    }
    modifyInAttributes(a, modify) {
        const modified = modify(this.tryGetInAttributes(a));
        if (modified === undefined) {
            // FIXME: This is potentially super slow
            const result = new Map(a);
            result.delete(this);
            return result;
        }
        return this.setInAttributes(a, modified);
    }
    setDefaultInAttributes(a, makeDefault) {
        if (this.tryGetInAttributes(a) !== undefined)
            return a;
        return this.modifyInAttributes(a, makeDefault);
    }
    removeInAttributes(a) {
        return mapFilter(a, (_, k) => k !== this);
    }
    equals(other) {
        if (!(other instanceof TypeAttributeKind)) {
            return false;
        }
        return this.name === other.name;
    }
    hashCode() {
        return hashString(this.name);
    }
}
export const emptyTypeAttributes = new Map();
export function combineTypeAttributes(combinationKind, firstOrArray, second) {
    const union = combinationKind === "union";
    let attributeArray;
    if (Array.isArray(firstOrArray)) {
        attributeArray = firstOrArray;
    }
    else {
        if (second === undefined) {
            return panic("Must have on array or two attributes");
        }
        attributeArray = [firstOrArray, second];
    }
    const attributesByKind = mapTranspose(attributeArray);
    // FIXME: strongly type this
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function combine(attrs, kind) {
        assert(attrs.length > 0, "Cannot combine zero type attributes");
        if (attrs.length === 1)
            return attrs[0];
        if (union) {
            return kind.combine(attrs);
        }
        else {
            return kind.intersect(attrs);
        }
    }
    return mapFilterMap(attributesByKind, combine);
}
export function makeTypeAttributesInferred(attr) {
    return mapFilterMap(attr, (value, kind) => kind.makeInferred(value));
}
export function increaseTypeAttributesDistance(attr) {
    return mapFilterMap(attr, (value, kind) => kind.increaseDistance(value));
}
