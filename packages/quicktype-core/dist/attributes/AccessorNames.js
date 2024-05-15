import { iterableFirst, mapFromIterable, mapFromObject, mapMap, mapMergeInto, setUnionManyInto } from "collection-utils";
import { messageAssert } from "../Messages";
import { checkArray, checkStringMap, defined, isStringMap } from "../support/Support";
import { TypeAttributeKind } from "./TypeAttributes";
class AccessorNamesTypeAttributeKind extends TypeAttributeKind {
    constructor() {
        super("accessorNames");
    }
    makeInferred(_) {
        return undefined;
    }
}
export const accessorNamesTypeAttributeKind = new AccessorNamesTypeAttributeKind();
// Returns [name, isFixed].
function getFromEntry(entry, language) {
    if (typeof entry === "string")
        return [entry, false];
    const maybeForLanguage = entry.get(language);
    if (maybeForLanguage !== undefined)
        return [maybeForLanguage, true];
    const maybeWildcard = entry.get("*");
    if (maybeWildcard !== undefined)
        return [maybeWildcard, false];
    return undefined;
}
export function lookupKey(accessors, key, language) {
    const entry = accessors.get(key);
    if (entry === undefined)
        return undefined;
    return getFromEntry(entry, language);
}
export function objectPropertyNames(o, language) {
    const accessors = accessorNamesTypeAttributeKind.tryGetInAttributes(o.getAttributes());
    const map = o.getProperties();
    if (accessors === undefined)
        return mapMap(map, _ => undefined);
    return mapMap(map, (_cp, n) => lookupKey(accessors, n, language));
}
export function enumCaseNames(e, language) {
    const accessors = accessorNamesTypeAttributeKind.tryGetInAttributes(e.getAttributes());
    if (accessors === undefined)
        return mapMap(e.cases.entries(), _ => undefined);
    return mapMap(e.cases.entries(), c => lookupKey(accessors, c, language));
}
export function getAccessorName(names, original) {
    const maybeName = names.get(original);
    if (maybeName === undefined)
        return [undefined, false];
    return maybeName;
}
// Union members can be recombined and reordered, and unions are combined as well, so
// we can't just store an array of accessor entries in a union, one array entry for each
// union member.  Instead, we give each union in the origin type graph a union identifier,
// and each union member type gets a map from union identifiers to accessor entries.
// That way, no matter how the types are recombined, if we find a union member, we can look
// up its union's identifier(s), and then look up the member's accessor entries for that
// identifier.  Of course we might find more than one, potentially conflicting.
class UnionIdentifierTypeAttributeKind extends TypeAttributeKind {
    constructor() {
        super("unionIdentifier");
    }
    combine(arr) {
        return setUnionManyInto(new Set(), arr);
    }
    makeInferred(_) {
        return new Set();
    }
}
export const unionIdentifierTypeAttributeKind = new UnionIdentifierTypeAttributeKind();
let nextUnionIdentifier = 0;
export function makeUnionIdentifierAttribute() {
    const attributes = unionIdentifierTypeAttributeKind.makeAttributes(new Set([nextUnionIdentifier]));
    nextUnionIdentifier += 1;
    return attributes;
}
class UnionMemberNamesTypeAttributeKind extends TypeAttributeKind {
    constructor() {
        super("unionMemberNames");
    }
    combine(arr) {
        const result = new Map();
        for (const m of arr) {
            mapMergeInto(result, m);
        }
        return result;
    }
}
export const unionMemberNamesTypeAttributeKind = new UnionMemberNamesTypeAttributeKind();
export function makeUnionMemberNamesAttribute(unionAttributes, entry) {
    const identifiers = defined(unionIdentifierTypeAttributeKind.tryGetInAttributes(unionAttributes));
    const map = mapFromIterable(identifiers, _ => entry);
    return unionMemberNamesTypeAttributeKind.makeAttributes(map);
}
export function unionMemberName(u, member, language) {
    const identifiers = unionIdentifierTypeAttributeKind.tryGetInAttributes(u.getAttributes());
    if (identifiers === undefined)
        return [undefined, false];
    const memberNames = unionMemberNamesTypeAttributeKind.tryGetInAttributes(member.getAttributes());
    if (memberNames === undefined)
        return [undefined, false];
    const names = new Set();
    const fixedNames = new Set();
    for (const i of identifiers) {
        const maybeEntry = memberNames.get(i);
        if (maybeEntry === undefined)
            continue;
        const maybeName = getFromEntry(maybeEntry, language);
        if (maybeName === undefined)
            continue;
        const [name, isNameFixed] = maybeName;
        if (isNameFixed) {
            fixedNames.add(name);
        }
        else {
            names.add(name);
        }
    }
    let size;
    let isFixed;
    let first = iterableFirst(fixedNames);
    if (first !== undefined) {
        size = fixedNames.size;
        isFixed = true;
    }
    else {
        first = iterableFirst(names);
        if (first === undefined)
            return [undefined, false];
        size = names.size;
        isFixed = false;
    }
    messageAssert(size === 1, "SchemaMoreThanOneUnionMemberName", { names: Array.from(names) });
    return [first, isFixed];
}
function isAccessorEntry(x) {
    if (typeof x === "string") {
        return true;
    }
    return isStringMap(x, (v) => typeof v === "string");
}
function makeAccessorEntry(ae) {
    if (typeof ae === "string")
        return ae;
    return mapFromObject(ae);
}
export function makeAccessorNames(x) {
    // FIXME: Do proper error reporting
    const stringMap = checkStringMap(x, isAccessorEntry);
    return mapMap(mapFromObject(stringMap), makeAccessorEntry);
}
export function accessorNamesAttributeProducer(schema, canonicalRef, _types, cases) {
    if (typeof schema !== "object")
        return undefined;
    const maybeAccessors = schema["qt-accessors"];
    if (maybeAccessors === undefined)
        return undefined;
    if (cases === undefined) {
        return { forType: accessorNamesTypeAttributeKind.makeAttributes(makeAccessorNames(maybeAccessors)) };
    }
    else {
        const identifierAttribute = makeUnionIdentifierAttribute();
        const accessors = checkArray(maybeAccessors, isAccessorEntry);
        messageAssert(cases.length === accessors.length, "SchemaWrongAccessorEntryArrayLength", {
            operation: "oneOf",
            ref: canonicalRef.push("oneOf")
        });
        const caseAttributes = accessors.map(accessor => makeUnionMemberNamesAttribute(identifierAttribute, makeAccessorEntry(accessor)));
        return { forUnion: identifierAttribute, forCases: caseAttributes };
    }
}
