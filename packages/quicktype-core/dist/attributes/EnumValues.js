import { mapMap } from "collection-utils";
import { lookupKey, makeAccessorNames } from "./AccessorNames";
import { TypeAttributeKind } from "./TypeAttributes";
class EnumValuesTypeAttributeKind extends TypeAttributeKind {
    constructor() {
        super("enumValues");
    }
    makeInferred(_) {
        return undefined;
    }
}
export const enumValuesTypeAttributeKind = new EnumValuesTypeAttributeKind();
export function enumCaseValues(e, language) {
    const enumValues = enumValuesTypeAttributeKind.tryGetInAttributes(e.getAttributes());
    if (enumValues === undefined)
        return mapMap(e.cases.entries(), _ => undefined);
    return mapMap(e.cases.entries(), c => lookupKey(enumValues, c, language));
}
export function enumValuesAttributeProducer(schema, _canonicalRef, _types) {
    if (typeof schema !== "object")
        return undefined;
    const maybeEnumValues = schema["qt-enum-values"];
    if (maybeEnumValues === undefined)
        return undefined;
    return { forType: enumValuesTypeAttributeKind.makeAttributes(makeAccessorNames(maybeEnumValues)) };
}
