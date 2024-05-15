import { iterableFirst } from "collection-utils";
import { combineTypeAttributes } from "../attributes/TypeAttributes";
import { assert, defined } from "../support/Support";
import { combineTypeAttributesOfTypes, stringTypesForType } from "../TypeUtils";
// A union needs replacing if it contains more than one string type, one of them being
// a basic string type.
function unionNeedsReplacing(u) {
    const stringMembers = u.stringTypeMembers;
    if (stringMembers.size <= 1)
        return undefined;
    const stringType = u.findMember("string");
    if (stringType === undefined)
        return undefined;
    assert(!stringTypesForType(stringType).isRestricted, "We must only flatten strings if we have no restriced strings");
    return stringMembers;
}
// Replaces all string types in an enum with the basic string type.
function replaceUnion(group, builder, forwardingRef) {
    assert(group.size === 1);
    const u = defined(iterableFirst(group));
    const stringMembers = defined(unionNeedsReplacing(u));
    const stringAttributes = combineTypeAttributesOfTypes("union", stringMembers);
    const types = [];
    for (const t of u.members) {
        if (stringMembers.has(t))
            continue;
        types.push(builder.reconstituteType(t));
    }
    if (types.length === 0) {
        return builder.getStringType(combineTypeAttributes("union", stringAttributes, u.getAttributes()), undefined, forwardingRef);
    }
    types.push(builder.getStringType(stringAttributes, undefined));
    return builder.getUnionType(u.getAttributes(), new Set(types), forwardingRef);
}
export function flattenStrings(graph, stringTypeMapping, debugPrintReconstitution) {
    const allUnions = graph.allNamedTypesSeparated().unions;
    const unionsToReplace = Array.from(allUnions)
        .filter(unionNeedsReplacing)
        .map(t => [t]);
    return graph.rewrite("flatten strings", stringTypeMapping, false, unionsToReplace, debugPrintReconstitution, replaceUnion);
}
