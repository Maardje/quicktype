import { iterableSome, setFilter } from "collection-utils";
import { emptyTypeAttributes } from "../attributes/TypeAttributes";
import { messageAssert } from "../Messages";
import { assert } from "../support/Support";
import { IntersectionType, UnionType } from "../Type";
import { derefTypeRef } from "../TypeGraph";
import { makeGroupsToFlatten } from "../TypeUtils";
import { UnifyUnionBuilder, unifyTypes } from "../UnifyClasses";
export function flattenUnions(graph, stringTypeMapping, conflateNumbers, makeObjectTypes, debugPrintReconstitution) {
    let needsRepeat = false;
    function replace(types, builder, forwardingRef) {
        const unionBuilder = new UnifyUnionBuilder(builder, makeObjectTypes, true, trefs => {
            assert(trefs.length > 0, "Must have at least one type to build union");
            trefs = trefs.map(tref => builder.reconstituteType(derefTypeRef(tref, graph)));
            if (trefs.length === 1) {
                return trefs[0];
            }
            needsRepeat = true;
            return builder.getUnionType(emptyTypeAttributes, new Set(trefs));
        });
        return unifyTypes(types, emptyTypeAttributes, builder, unionBuilder, conflateNumbers, forwardingRef);
    }
    const allUnions = setFilter(graph.allTypesUnordered(), t => t instanceof UnionType);
    const nonCanonicalUnions = setFilter(allUnions, u => !u.isCanonical);
    let foundIntersection = false;
    const groups = makeGroupsToFlatten(nonCanonicalUnions, members => {
        messageAssert(members.size > 0, "IRNoEmptyUnions", {});
        if (!iterableSome(members, m => m instanceof IntersectionType))
            return true;
        // FIXME: This is stupid.  `flattenUnions` returns true when no more union
        // flattening is necessary, but `resolveIntersections` can introduce new
        // unions that might require flattening, so now `flattenUnions` needs to take
        // that into account.  Either change `resolveIntersections` such that it
        // doesn't introduce non-canonical unions (by using `unifyTypes`), or have
        // some other way to tell whether more work is needed that doesn't require
        // the two passes to know about each other.
        foundIntersection = true;
        return false;
    });
    graph = graph.rewrite("flatten unions", stringTypeMapping, false, groups, debugPrintReconstitution, replace);
    // console.log(`flattened ${nonCanonicalUnions.size} of ${unions.size} unions`);
    return [graph, !needsRepeat && !foundIntersection];
}
