import { iterableFirst, mapFilterMap, mapFromObject, mapMergeWithInto, setSubtract, setUnion, setUnionManyInto } from "collection-utils";
// There's a cyclic import here. Ignoring now because it requires a large refactor.
// skipcq: JS-E1008
// FIXME: This is a circular import
// eslint-disable-next-line import/no-cycle
import { PathElementKind } from "../input/JSONSchemaInput";
import { TypeAttributeKind, emptyTypeAttributes } from "./TypeAttributes";
export function addDescriptionToSchema(schema, description) {
    if (description === undefined)
        return;
    schema.description = Array.from(description).join("\n");
}
class DescriptionTypeAttributeKind extends TypeAttributeKind {
    constructor() {
        super("description");
    }
    combine(attrs) {
        return setUnionManyInto(new Set(), attrs);
    }
    makeInferred(_) {
        return undefined;
    }
    addToSchema(schema, _t, attrs) {
        addDescriptionToSchema(schema, attrs);
    }
    stringify(descriptions) {
        let result = iterableFirst(descriptions);
        if (result === undefined)
            return undefined;
        if (result.length > 5 + 3) {
            result = `${result.slice(0, 5)}...`;
        }
        if (descriptions.size > 1) {
            result = `${result}, ...`;
        }
        return result;
    }
}
export const descriptionTypeAttributeKind = new DescriptionTypeAttributeKind();
class PropertyDescriptionsTypeAttributeKind extends TypeAttributeKind {
    constructor() {
        super("propertyDescriptions");
    }
    combine(attrs) {
        // FIXME: Implement this with mutable sets
        const result = new Map();
        for (const attr of attrs) {
            mapMergeWithInto(result, (sa, sb) => setUnion(sa, sb), attr);
        }
        return result;
    }
    makeInferred(_) {
        return undefined;
    }
    stringify(propertyDescriptions) {
        if (propertyDescriptions.size === 0)
            return undefined;
        return `prop descs: ${propertyDescriptions.size}`;
    }
}
export const propertyDescriptionsTypeAttributeKind = new PropertyDescriptionsTypeAttributeKind();
function isPropertiesKey(el) {
    return el.kind === PathElementKind.KeyOrIndex && el.key === "properties";
}
export function descriptionAttributeProducer(schema, ref, types) {
    if (!(typeof schema === "object"))
        return undefined;
    let description = emptyTypeAttributes;
    let propertyDescription = emptyTypeAttributes;
    const pathLength = ref.path.length;
    if (types.has("object") ||
        setSubtract(types, ["null"]).size > 1 ||
        schema.enum !== undefined ||
        pathLength < 2 ||
        !isPropertiesKey(ref.path[pathLength - 2])) {
        const maybeDescription = schema.description;
        if (typeof maybeDescription === "string") {
            description = descriptionTypeAttributeKind.makeAttributes(new Set([maybeDescription]));
        }
    }
    if (types.has("object") && typeof schema.properties === "object") {
        const propertyDescriptions = mapFilterMap(mapFromObject(schema.properties), propSchema => {
            if (propSchema && typeof propSchema === "object" && "description" in propSchema) {
                const desc = propSchema.description;
                if (typeof desc === "string") {
                    return new Set([desc]);
                }
            }
            return undefined;
        });
        if (propertyDescriptions.size > 0) {
            propertyDescription = propertyDescriptionsTypeAttributeKind.makeAttributes(propertyDescriptions);
        }
    }
    return { forType: description, forObject: propertyDescription };
}
