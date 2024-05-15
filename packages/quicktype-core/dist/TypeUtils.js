import { EqualityMap, iterableFirst, setFilter, setSortBy, setUnion } from "collection-utils";
// eslint-disable-next-line import/no-cycle
import { stringTypesTypeAttributeKind } from "./attributes/StringTypes";
import { combineTypeAttributes, emptyTypeAttributes } from "./attributes/TypeAttributes";
import { assert, assertNever, defined, panic } from "./support/Support";
import { ArrayType, ClassType, EnumType, MapType, ObjectType, UnionType, isPrimitiveStringTypeKind } from "./Type";
export function assertIsObject(t) {
    if (t instanceof ObjectType) {
        return t;
    }
    return panic("Supposed object type is not an object type");
}
export function assertIsClass(t) {
    if (!(t instanceof ClassType)) {
        return panic("Supposed class type is not a class type");
    }
    return t;
}
export function setOperationMembersRecursively(oneOrMany, combinationKind) {
    const setOperations = Array.isArray(oneOrMany) ? oneOrMany : [oneOrMany];
    const kind = setOperations[0].kind;
    const includeAny = kind !== "intersection";
    const processedSetOperations = new Set();
    const members = new Set();
    let attributes = emptyTypeAttributes;
    function process(t) {
        if (t.kind === kind) {
            const so = t;
            if (processedSetOperations.has(so))
                return;
            processedSetOperations.add(so);
            if (combinationKind !== undefined) {
                attributes = combineTypeAttributes(combinationKind, attributes, t.getAttributes());
            }
            for (const m of so.members) {
                process(m);
            }
        }
        else if (includeAny || t.kind !== "any") {
            members.add(t);
        }
        else {
            if (combinationKind !== undefined) {
                attributes = combineTypeAttributes(combinationKind, attributes, t.getAttributes());
            }
        }
    }
    for (const so of setOperations) {
        process(so);
    }
    return [members, attributes];
}
export function makeGroupsToFlatten(setOperations, include) {
    const typeGroups = new EqualityMap();
    for (const u of setOperations) {
        // FIXME: We shouldn't have to make a new set here once we got rid
        // of immutable.
        const members = new Set(setOperationMembersRecursively(u, undefined)[0]);
        if (include !== undefined) {
            if (!include(members))
                continue;
        }
        let maybeSet = typeGroups.get(members);
        if (maybeSet === undefined) {
            maybeSet = new Set();
            if (members.size === 1) {
                maybeSet.add(defined(iterableFirst(members)));
            }
        }
        maybeSet.add(u);
        typeGroups.set(members, maybeSet);
    }
    return Array.from(typeGroups.values()).map(ts => Array.from(ts));
}
export function combineTypeAttributesOfTypes(combinationKind, types) {
    return combineTypeAttributes(combinationKind, Array.from(types).map(t => t.getAttributes()));
}
export function isAnyOrNull(t) {
    return t.kind === "any" || t.kind === "null";
}
// FIXME: We shouldn't have to sort here.  This is just because we're not getting
// back the right order from JSON Schema, due to the changes the intersection types
// introduced.
export function removeNullFromUnion(t, sortBy = false) {
    function sort(s) {
        if (sortBy === false)
            return s;
        if (sortBy === true)
            return setSortBy(s, m => m.kind);
        return setSortBy(s, sortBy);
    }
    const nullType = t.findMember("null");
    if (nullType === undefined) {
        return [null, sort(t.members)];
    }
    return [nullType, sort(setFilter(t.members, m => m.kind !== "null"))];
}
export function removeNullFromType(t) {
    if (t.kind === "null") {
        return [t, new Set()];
    }
    if (!(t instanceof UnionType)) {
        return [null, new Set([t])];
    }
    return removeNullFromUnion(t);
}
export function nullableFromUnion(t) {
    const [hasNull, nonNulls] = removeNullFromUnion(t);
    if (hasNull === null)
        return null;
    if (nonNulls.size !== 1)
        return null;
    return defined(iterableFirst(nonNulls));
}
export function nonNullTypeCases(t) {
    return removeNullFromType(t)[1];
}
export function getNullAsOptional(cp) {
    const [maybeNull, nonNulls] = removeNullFromType(cp.type);
    if (cp.isOptional) {
        return [true, nonNulls];
    }
    return [maybeNull !== null, nonNulls];
}
// FIXME: Give this an appropriate name, considering that we don't distinguish
// between named and non-named types anymore.
export function isNamedType(t) {
    return ["class", "union", "enum", "object"].includes(t.kind);
}
export function separateNamedTypes(types) {
    const objects = setFilter(types, t => t.kind === "object" || t.kind === "class");
    const enums = setFilter(types, t => t instanceof EnumType);
    const unions = setFilter(types, t => t instanceof UnionType);
    return { objects, enums, unions };
}
export function directlyReachableTypes(t, setForType) {
    const set = setForType(t);
    if (set !== null)
        return set;
    return setUnion(...Array.from(t.getNonAttributeChildren()).map(c => directlyReachableTypes(c, setForType)));
}
export function directlyReachableSingleNamedType(type) {
    const definedTypes = directlyReachableTypes(type, t => {
        if ((!(t instanceof UnionType) && isNamedType(t)) ||
            (t instanceof UnionType && nullableFromUnion(t) === null)) {
            return new Set([t]);
        }
        return null;
    });
    assert(definedTypes.size <= 1, "Cannot have more than one defined type per top-level");
    return iterableFirst(definedTypes);
}
export function stringTypesForType(t) {
    assert(t.kind === "string", "Only strings can have string types");
    const stringTypes = stringTypesTypeAttributeKind.tryGetInAttributes(t.getAttributes());
    if (stringTypes === undefined) {
        return panic("All strings must have a string type attribute");
    }
    return stringTypes;
}
export function matchTypeExhaustive(t, noneType, anyType, nullType, boolType, integerType, doubleType, stringType, arrayType, classType, mapType, objectType, enumType, unionType, transformedStringType) {
    if (t.isPrimitive()) {
        if (isPrimitiveStringTypeKind(t.kind)) {
            if (t.kind === "string") {
                return stringType(t);
            }
            return transformedStringType(t);
        }
        const kind = t.kind;
        const f = {
            none: noneType,
            any: anyType,
            null: nullType,
            bool: boolType,
            integer: integerType,
            double: doubleType
        }[kind];
        if (f !== undefined)
            return f(t);
        return assertNever(f);
    }
    else if (t instanceof ArrayType)
        return arrayType(t);
    else if (t instanceof ClassType)
        return classType(t);
    else if (t instanceof MapType)
        return mapType(t);
    else if (t instanceof ObjectType)
        return objectType(t);
    else if (t instanceof EnumType)
        return enumType(t);
    else if (t instanceof UnionType)
        return unionType(t);
    return panic(`Unknown type ${t.kind}`);
}
export function matchType(type, anyType, nullType, boolType, integerType, doubleType, stringType, arrayType, classType, mapType, enumType, unionType, transformedStringType) {
    function typeNotSupported(t) {
        return panic(`Unsupported type ${t.kind} in non-exhaustive match`);
    }
    return matchTypeExhaustive(type, typeNotSupported, anyType, nullType, boolType, integerType, doubleType, stringType, arrayType, classType, mapType, typeNotSupported, enumType, unionType, transformedStringType !== null && transformedStringType !== void 0 ? transformedStringType : typeNotSupported);
}
export function matchCompoundType(t, arrayType, classType, mapType, objectType, unionType) {
    function ignore(_) {
        return;
    }
    matchTypeExhaustive(t, ignore, ignore, ignore, ignore, ignore, ignore, ignore, arrayType, classType, mapType, objectType, ignore, unionType, ignore);
}
