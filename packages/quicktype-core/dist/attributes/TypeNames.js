import { definedMap, iterableFirst, iterableSkip, setMap, setUnionInto } from "collection-utils";
import * as pluralize from "pluralize";
import { Chance } from "../support/Chance";
import { splitIntoWords } from "../support/Strings";
import { assert, defined, panic } from "../support/Support";
import { TypeAttributeKind } from "./TypeAttributes";
let chance;
let usedRandomNames;
export function initTypeNames() {
    chance = new Chance(31415);
    usedRandomNames = new Set();
}
initTypeNames();
function makeRandomName() {
    for (;;) {
        const name = `${chance.city()} ${chance.animal()}`;
        if (usedRandomNames.has(name))
            continue;
        usedRandomNames.add(name);
        return name;
    }
}
// FIXME: In the case of overlapping prefixes and suffixes we will
// produce a name that includes the overlap twice.  For example, for
// the names "aaa" and "aaaa" we have the common prefix "aaa" and the
// common suffix "aaa", so we will produce the combined name "aaaaaa".
function combineNames(names) {
    let originalFirst = iterableFirst(names);
    if (originalFirst === undefined) {
        return panic("Named type has no names");
    }
    if (names.size === 1) {
        return originalFirst;
    }
    const namesSet = setMap(names, s => splitIntoWords(s)
        .map(w => w.word.toLowerCase())
        .join("_"));
    const first = defined(iterableFirst(namesSet));
    if (namesSet.size === 1) {
        return first;
    }
    let prefixLength = first.length;
    let suffixLength = first.length;
    for (const n of iterableSkip(namesSet, 1)) {
        prefixLength = Math.min(prefixLength, n.length);
        for (let i = 0; i < prefixLength; i++) {
            if (first[i] !== n[i]) {
                prefixLength = i;
                break;
            }
        }
        suffixLength = Math.min(suffixLength, n.length);
        for (let i = 0; i < suffixLength; i++) {
            if (first[first.length - i - 1] !== n[n.length - i - 1]) {
                suffixLength = i;
                break;
            }
        }
    }
    const prefix = prefixLength > 2 ? first.slice(0, prefixLength) : "";
    const suffix = suffixLength > 2 ? first.slice(first.length - suffixLength) : "";
    const combined = prefix + suffix;
    if (combined.length > 2) {
        return combined;
    }
    return first;
}
export const tooManyNamesThreshold = 1000;
export class TypeNames {
    static makeWithDistance(names, alternativeNames, distance) {
        if (names.size >= tooManyNamesThreshold) {
            return new TooManyTypeNames(distance);
        }
        if (alternativeNames === undefined || alternativeNames.size > tooManyNamesThreshold) {
            alternativeNames = undefined;
        }
        return new RegularTypeNames(names, alternativeNames, distance);
    }
    static make(names, alternativeNames, areInferred) {
        return TypeNames.makeWithDistance(names, alternativeNames, areInferred ? 1 : 0);
    }
    constructor(distance) {
        this.distance = distance;
    }
    get areInferred() {
        return this.distance > 0;
    }
}
export class RegularTypeNames extends TypeNames {
    constructor(names, _alternativeNames, distance) {
        super(distance);
        this.names = names;
        this._alternativeNames = _alternativeNames;
    }
    add(namesArray, startIndex = 0) {
        let newNames = new Set(this.names);
        let newDistance = this.distance;
        let newAlternativeNames = definedMap(this._alternativeNames, s => new Set(s));
        for (let i = startIndex; i < namesArray.length; i++) {
            const other = namesArray[i];
            if (other instanceof RegularTypeNames && other._alternativeNames !== undefined) {
                if (newAlternativeNames === undefined) {
                    newAlternativeNames = new Set();
                }
                setUnionInto(newAlternativeNames, other._alternativeNames);
            }
            if (other.distance > newDistance)
                continue;
            if (!(other instanceof RegularTypeNames)) {
                assert(other instanceof TooManyTypeNames, "Unknown TypeNames instance");
                // The other one is at most our distance, so let it sort it out
                return other.add(namesArray, i + 1);
            }
            if (other.distance < newDistance) {
                // The other one is closer, so take its names
                newNames = new Set(other.names);
                newDistance = other.distance;
                newAlternativeNames = definedMap(other._alternativeNames, s => new Set(s));
            }
            else {
                // Same distance, merge them
                assert(other.distance === newDistance, "This should be the only case left");
                setUnionInto(newNames, other.names);
            }
        }
        return TypeNames.makeWithDistance(newNames, newAlternativeNames, newDistance);
    }
    clearInferred() {
        const newNames = this.areInferred ? new Set() : this.names;
        return TypeNames.makeWithDistance(newNames, new Set(), this.distance);
    }
    get combinedName() {
        return combineNames(this.names);
    }
    get proposedNames() {
        const set = new Set([this.combinedName]);
        if (this._alternativeNames === undefined) {
            return set;
        }
        setUnionInto(set, this._alternativeNames);
        return set;
    }
    makeInferred() {
        return TypeNames.makeWithDistance(this.names, this._alternativeNames, this.distance + 1);
    }
    singularize() {
        return TypeNames.makeWithDistance(setMap(this.names, pluralize.singular), definedMap(this._alternativeNames, an => setMap(an, pluralize.singular)), this.distance + 1);
    }
    toString() {
        const inferred = this.areInferred ? `distance ${this.distance}` : "given";
        const names = `${inferred} ${Array.from(this.names).join(",")}`;
        if (this._alternativeNames === undefined) {
            return names;
        }
        return `${names} (${Array.from(this._alternativeNames).join(",")})`;
    }
}
export class TooManyTypeNames extends TypeNames {
    constructor(distance, name) {
        super(distance);
        if (name === undefined) {
            name = makeRandomName();
        }
        this.names = new Set([name]);
    }
    get combinedName() {
        return defined(iterableFirst(this.names));
    }
    get proposedNames() {
        return this.names;
    }
    add(namesArray, startIndex = 0) {
        if (!this.areInferred)
            return this;
        for (let i = startIndex; i < namesArray.length; i++) {
            const other = namesArray[i];
            if (other.distance < this.distance) {
                return other.add(namesArray, i + 1);
            }
        }
        return this;
    }
    clearInferred() {
        if (!this.areInferred) {
            return this;
        }
        return TypeNames.makeWithDistance(new Set(), new Set(), this.distance);
    }
    makeInferred() {
        return new TooManyTypeNames(this.distance + 1, iterableFirst(this.names));
    }
    singularize() {
        return this;
    }
    toString() {
        return `too many ${this.combinedName}`;
    }
}
class TypeNamesTypeAttributeKind extends TypeAttributeKind {
    constructor() {
        super("names");
    }
    combine(namesArray) {
        assert(namesArray.length > 0, "Can't combine zero type names");
        return namesArray[0].add(namesArray, 1);
    }
    makeInferred(tn) {
        return tn.makeInferred();
    }
    increaseDistance(tn) {
        return tn.makeInferred();
    }
    stringify(tn) {
        return tn.toString();
    }
}
export const namesTypeAttributeKind = new TypeNamesTypeAttributeKind();
export function modifyTypeNames(attributes, modifier) {
    return namesTypeAttributeKind.modifyInAttributes(attributes, modifier);
}
export function singularizeTypeNames(attributes) {
    return modifyTypeNames(attributes, maybeNames => {
        if (maybeNames === undefined)
            return undefined;
        return maybeNames.singularize();
    });
}
export function makeNamesTypeAttributes(nameOrNames, areNamesInferred) {
    let typeNames;
    if (typeof nameOrNames === "string") {
        typeNames = TypeNames.make(new Set([nameOrNames]), new Set(), defined(areNamesInferred));
    }
    else {
        typeNames = nameOrNames;
    }
    return namesTypeAttributeKind.makeAttributes(typeNames);
}
