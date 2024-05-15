import { setUnionManyInto } from "collection-utils";
import URI from "urijs";
import { checkArray, checkString } from "../support/Support";
import { TypeAttributeKind, emptyTypeAttributes } from "./TypeAttributes";
const protocolsSchemaProperty = "qt-uri-protocols";
const extensionsSchemaProperty = "qt-uri-extensions";
class URITypeAttributeKind extends TypeAttributeKind {
    constructor() {
        super("uriAttributes");
    }
    get inIdentity() {
        return true;
    }
    combine(attrs) {
        const protocolSets = attrs.map(a => a[0]);
        const extensionSets = attrs.map(a => a[1]);
        return [setUnionManyInto(new Set(), protocolSets), setUnionManyInto(new Set(), extensionSets)];
    }
    makeInferred(_) {
        return undefined;
    }
    addToSchema(schema, t, attrs) {
        if (t.kind !== "string" && t.kind !== "uri")
            return;
        const [protocols, extensions] = attrs;
        if (protocols.size > 0) {
            schema[protocolsSchemaProperty] = Array.from(protocols).sort();
        }
        if (extensions.size > 0) {
            schema[extensionsSchemaProperty] = Array.from(extensions).sort();
        }
    }
}
export const uriTypeAttributeKind = new URITypeAttributeKind();
const extensionRegex = /^.+(\.[^./\\]+)$/;
function pathExtension(path) {
    const matches = extensionRegex.exec(path);
    if (matches === null)
        return undefined;
    return matches[1];
}
export function uriInferenceAttributesProducer(s) {
    try {
        const uri = URI(s);
        const extension = pathExtension(uri.path());
        const extensions = extension === undefined ? [] : [extension.toLowerCase()];
        return uriTypeAttributeKind.makeAttributes([new Set([uri.protocol().toLowerCase()]), new Set(extensions)]);
    }
    catch (_a) {
        return emptyTypeAttributes;
    }
}
export function uriSchemaAttributesProducer(schema, _ref, types) {
    if (!(typeof schema === "object"))
        return undefined;
    if (!types.has("string"))
        return undefined;
    let protocols;
    const maybeProtocols = schema[protocolsSchemaProperty];
    if (maybeProtocols !== undefined) {
        protocols = new Set(checkArray(maybeProtocols, checkString));
    }
    else {
        protocols = new Set();
    }
    let extensions;
    const maybeExtensions = schema[extensionsSchemaProperty];
    if (maybeExtensions !== undefined) {
        extensions = new Set(checkArray(maybeExtensions, checkString));
    }
    else {
        extensions = new Set();
    }
    if (protocols.size === 0 && extensions.size === 0)
        return undefined;
    return { forString: uriTypeAttributeKind.makeAttributes([protocols, extensions]) };
}
