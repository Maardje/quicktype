var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { EqualityMap, addHashCode, arrayGetFromEnd, arrayLast, arrayMapSync, definedMap, 
// eslint-disable-next-line @typescript-eslint/no-redeclare
hasOwnProperty, hashCodeOf, hashString, iterableFind, iterableFirst, mapFromIterable, mapFromObject, mapMap, mapMapSync, mapMergeInto, mapSortBy, setFilter, setSubtract } from "collection-utils";
import URI from "urijs";
import { accessorNamesAttributeProducer } from "../attributes/AccessorNames";
import { minMaxAttributeProducer, minMaxLengthAttributeProducer, patternAttributeProducer } from "../attributes/Constraints";
// eslint-disable-next-line import/no-cycle
import { descriptionAttributeProducer } from "../attributes/Description";
import { enumValuesAttributeProducer } from "../attributes/EnumValues";
import { StringTypes } from "../attributes/StringTypes";
import { combineTypeAttributes, emptyTypeAttributes, makeTypeAttributesInferred } from "../attributes/TypeAttributes";
import { TypeNames, makeNamesTypeAttributes, modifyTypeNames, singularizeTypeNames } from "../attributes/TypeNames";
import { uriSchemaAttributesProducer } from "../attributes/URIAttributes";
import { messageAssert, messageError } from "../Messages";
import { assert, assertNever, defined, panic, parseJSON } from "../support/Support";
import { isNumberTypeKind, transformedStringTypeTargetTypeKindsMap } from "../Type";
import { JSONSchemaStore } from "./JSONSchemaStore";
// There's a cyclic import here. Ignoring now because it requires a large refactor.
// skipcq: JS-E1008
export var PathElementKind;
(function (PathElementKind) {
    PathElementKind[PathElementKind["Root"] = 1] = "Root";
    PathElementKind[PathElementKind["KeyOrIndex"] = 2] = "KeyOrIndex";
    PathElementKind[PathElementKind["Type"] = 3] = "Type";
    PathElementKind[PathElementKind["Object"] = 4] = "Object";
})(PathElementKind || (PathElementKind = {}));
function keyOrIndex(pe) {
    if (pe.kind !== PathElementKind.KeyOrIndex)
        return undefined;
    return pe.key;
}
function pathElementEquals(a, b) {
    if (a.kind !== b.kind)
        return false;
    if (a.kind === PathElementKind.Type && b.kind === PathElementKind.Type) {
        return a.index === b.index;
    }
    if (a.kind === PathElementKind.KeyOrIndex && b.kind === PathElementKind.KeyOrIndex) {
        return a.key === b.key;
    }
    return true;
}
function withRef(refOrLoc, props) {
    const ref = typeof refOrLoc === "function" ? refOrLoc() : refOrLoc instanceof Ref ? refOrLoc : refOrLoc.canonicalRef;
    return Object.assign({ ref }, props !== null && props !== void 0 ? props : {});
}
function checkJSONSchemaObject(x, refOrLoc) {
    if (Array.isArray(x)) {
        return messageError("SchemaArrayIsInvalidSchema", withRef(refOrLoc));
    }
    if (x === null) {
        return messageError("SchemaNullIsInvalidSchema", withRef(refOrLoc));
    }
    if (typeof x !== "object") {
        return messageError("SchemaInvalidJSONSchemaType", withRef(refOrLoc, { type: typeof x }));
    }
    return x;
}
function checkJSONSchema(x, refOrLoc) {
    if (typeof x === "boolean")
        return x;
    return checkJSONSchemaObject(x, refOrLoc);
}
const numberRegexp = new RegExp("^[0-9]+$");
function normalizeURI(uri) {
    // FIXME: This is overly complicated and a bit shady.  The problem is
    // that `normalize` will URL-escape, with the result that if we want to
    // open the URL as a file, escaped character will thwart us.  I think the
    // JSONSchemaStore should take a URI, not a string, and if it reads from
    // a file it can decode by itself.
    if (typeof uri === "string") {
        uri = new URI(uri);
    }
    return new URI(URI.decode(uri.clone().normalize().toString()));
}
export class Ref {
    static root(address) {
        const uri = definedMap(address, a => new URI(a));
        return new Ref(uri, []);
    }
    static parsePath(path) {
        const elements = [];
        if (path.startsWith("/")) {
            elements.push({ kind: PathElementKind.Root });
            path = path.slice(1);
        }
        if (path !== "") {
            const parts = path.split("/");
            parts.forEach(part => elements.push({ kind: PathElementKind.KeyOrIndex, key: part }));
        }
        return elements;
    }
    static parseURI(uri, destroyURI = false) {
        if (!destroyURI) {
            uri = uri.clone();
        }
        let path = uri.fragment();
        uri.fragment("");
        if ((uri.host() !== "" || uri.filename() !== "") && path === "") {
            path = "/";
        }
        const elements = Ref.parsePath(path);
        return new Ref(uri, elements);
    }
    static parse(ref) {
        return Ref.parseURI(new URI(ref), true);
    }
    constructor(addressURI, path) {
        this.path = path;
        if (addressURI !== undefined) {
            assert(addressURI.fragment() === "", `Ref URI with fragment is not allowed: ${addressURI.toString()}`);
            this.addressURI = normalizeURI(addressURI);
        }
        else {
            this.addressURI = undefined;
        }
    }
    get hasAddress() {
        return this.addressURI !== undefined;
    }
    get address() {
        return defined(this.addressURI).toString();
    }
    get isRoot() {
        return this.path.length === 1 && this.path[0].kind === PathElementKind.Root;
    }
    pushElement(pe) {
        const newPath = Array.from(this.path);
        newPath.push(pe);
        return new Ref(this.addressURI, newPath);
    }
    push(...keys) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let ref = this;
        for (const key of keys) {
            ref = ref.pushElement({ kind: PathElementKind.KeyOrIndex, key });
        }
        return ref;
    }
    pushObject() {
        return this.pushElement({ kind: PathElementKind.Object });
    }
    pushType(index) {
        return this.pushElement({ kind: PathElementKind.Type, index });
    }
    resolveAgainst(base) {
        let addressURI = this.addressURI;
        if ((base === null || base === void 0 ? void 0 : base.addressURI) !== undefined) {
            addressURI = addressURI === undefined ? base.addressURI : addressURI.absoluteTo(base.addressURI);
        }
        return new Ref(addressURI, this.path);
    }
    get name() {
        const path = Array.from(this.path);
        for (;;) {
            const e = path.pop();
            if (e === undefined || e.kind === PathElementKind.Root) {
                let name = this.addressURI !== undefined ? this.addressURI.filename() : "";
                const suffix = this.addressURI !== undefined ? this.addressURI.suffix() : "";
                if (name.length > suffix.length + 1) {
                    name = name.slice(0, name.length - suffix.length - 1);
                }
                if (name === "") {
                    return "Something";
                }
                return name;
            }
            switch (e.kind) {
                case PathElementKind.KeyOrIndex:
                    if (numberRegexp.test(e.key)) {
                        return e.key;
                    }
                    break;
                case PathElementKind.Type:
                case PathElementKind.Object:
                    return panic("We shouldn't try to get the name of Type or Object refs");
                default:
                    return assertNever(e);
            }
        }
    }
    get definitionName() {
        const pe = arrayGetFromEnd(this.path, 2);
        if (pe === undefined)
            return undefined;
        if (keyOrIndex(pe) === "definitions")
            return keyOrIndex(defined(arrayLast(this.path)));
        return undefined;
    }
    toString() {
        function elementToString(e) {
            switch (e.kind) {
                case PathElementKind.Root:
                    return "";
                case PathElementKind.Type:
                    return `type/${e.index.toString()}`;
                case PathElementKind.Object:
                    return "object";
                case PathElementKind.KeyOrIndex:
                    return e.key;
                default:
                    return assertNever(e);
            }
        }
        const address = this.addressURI === undefined ? "" : this.addressURI.toString();
        return address + "#" + this.path.map(elementToString).join("/");
    }
    lookup(local, path, root) {
        const refMaker = () => new Ref(this.addressURI, path);
        const first = path[0];
        if (first === undefined) {
            return checkJSONSchema(local, refMaker);
        }
        const rest = path.slice(1);
        switch (first.kind) {
            case PathElementKind.Root:
                return this.lookup(root, rest, root);
            case PathElementKind.KeyOrIndex:
                const key = first.key;
                if (Array.isArray(local)) {
                    if (!/^\d+$/.test(key)) {
                        return messageError("SchemaCannotIndexArrayWithNonNumber", withRef(refMaker, { actual: key }));
                    }
                    const index = parseInt(first.key, 10);
                    if (index >= local.length) {
                        return messageError("SchemaIndexNotInArray", withRef(refMaker, { index }));
                    }
                    return this.lookup(local[index], rest, root);
                }
                else {
                    if (!hasOwnProperty(local, key)) {
                        return messageError("SchemaKeyNotInObject", withRef(refMaker, { key }));
                    }
                    return this.lookup(checkJSONSchemaObject(local, refMaker)[first.key], rest, root);
                }
            case PathElementKind.Type:
                return panic('Cannot look up path that indexes "type"');
            case PathElementKind.Object:
                return panic('Cannot look up path that indexes "object"');
            default:
                return assertNever(first);
        }
    }
    lookupRef(root) {
        return this.lookup(root, this.path, root);
    }
    equals(other) {
        if (!(other instanceof Ref))
            return false;
        if (this.addressURI !== undefined && other.addressURI !== undefined) {
            if (!this.addressURI.equals(other.addressURI))
                return false;
        }
        else {
            if ((this.addressURI === undefined) !== (other.addressURI === undefined))
                return false;
        }
        const l = this.path.length;
        if (l !== other.path.length)
            return false;
        for (let i = 0; i < l; i++) {
            if (!pathElementEquals(this.path[i], other.path[i]))
                return false;
        }
        return true;
    }
    hashCode() {
        let acc = hashCodeOf(definedMap(this.addressURI, u => u.toString()));
        for (const pe of this.path) {
            acc = addHashCode(acc, pe.kind);
            switch (pe.kind) {
                case PathElementKind.Type:
                    acc = addHashCode(acc, pe.index);
                    break;
                case PathElementKind.KeyOrIndex:
                    acc = addHashCode(acc, hashString(pe.key));
                    break;
                default:
                    break;
            }
        }
        return acc;
    }
}
class Location {
    constructor(canonicalRef, virtualRef, haveID = false) {
        this.haveID = haveID;
        this.canonicalRef = canonicalRef;
        this.virtualRef = virtualRef !== null && virtualRef !== void 0 ? virtualRef : canonicalRef;
    }
    updateWithID(id) {
        if (typeof id !== "string")
            return this;
        const parsed = Ref.parse(id);
        const virtual = this.haveID ? parsed.resolveAgainst(this.virtualRef) : parsed;
        if (!this.haveID) {
            messageAssert(virtual.hasAddress, "SchemaIDMustHaveAddress", withRef(this, { id }));
        }
        return new Location(this.canonicalRef, virtual, true);
    }
    push(...keys) {
        return new Location(this.canonicalRef.push(...keys), this.virtualRef.push(...keys), this.haveID);
    }
    pushObject() {
        return new Location(this.canonicalRef.pushObject(), this.virtualRef.pushObject(), this.haveID);
    }
    pushType(index) {
        return new Location(this.canonicalRef.pushType(index), this.virtualRef.pushType(index), this.haveID);
    }
    toString() {
        return `${this.virtualRef.toString()} (${this.canonicalRef.toString()})`;
    }
}
class Canonizer {
    constructor(_ctx) {
        this._ctx = _ctx;
        this._map = new EqualityMap();
        this._schemaAddressesAdded = new Set();
    }
    addIDs(schema, loc) {
        if (schema === null)
            return;
        if (Array.isArray(schema)) {
            for (let i = 0; i < schema.length; i++) {
                this.addIDs(schema[i], loc.push(i.toString()));
            }
            return;
        }
        if (typeof schema !== "object") {
            return;
        }
        const locWithoutID = loc;
        const maybeID = "$id" in schema ? schema.$id : undefined;
        if (typeof maybeID === "string") {
            loc = loc.updateWithID(maybeID);
        }
        if (loc.haveID) {
            if (this._ctx.debugPrintSchemaResolving) {
                console.log(`adding mapping ${loc.toString()}`);
            }
            this._map.set(loc.virtualRef, locWithoutID);
        }
        for (const property of Object.getOwnPropertyNames(schema)) {
            this.addIDs(schema[property], loc.push(property));
        }
    }
    addSchema(schema, address) {
        if (this._schemaAddressesAdded.has(address))
            return false;
        this.addIDs(schema, new Location(Ref.root(address), Ref.root(undefined)));
        this._schemaAddressesAdded.add(address);
        return true;
    }
    // Returns: Canonical ref
    canonize(base, ref) {
        const virtual = ref.resolveAgainst(base.virtualRef);
        const loc = this._map.get(virtual);
        if (loc !== undefined) {
            return loc;
        }
        const canonicalRef = virtual.addressURI === undefined ? new Ref(base.canonicalRef.addressURI, virtual.path) : virtual;
        return new Location(canonicalRef, new Ref(undefined, virtual.path));
    }
}
function checkTypeList(typeOrTypes, loc) {
    let set;
    if (typeof typeOrTypes === "string") {
        set = new Set([typeOrTypes]);
    }
    else if (Array.isArray(typeOrTypes)) {
        const arr = [];
        for (const t of typeOrTypes) {
            if (typeof t !== "string") {
                return messageError("SchemaTypeElementMustBeString", withRef(loc, { element: t }));
            }
            arr.push(t);
        }
        set = new Set(arr);
    }
    else {
        return messageError("SchemaTypeMustBeStringOrStringArray", withRef(loc, { actual: typeOrTypes }));
    }
    messageAssert(set.size > 0, "SchemaNoTypeSpecified", withRef(loc));
    const validTypes = ["null", "boolean", "object", "array", "number", "string", "integer"];
    const maybeInvalid = iterableFind(set, s => !validTypes.includes(s));
    if (maybeInvalid !== undefined) {
        return messageError("SchemaInvalidType", withRef(loc, { type: maybeInvalid }));
    }
    return set;
}
function checkRequiredArray(arr, loc) {
    if (!Array.isArray(arr)) {
        return messageError("SchemaRequiredMustBeStringOrStringArray", withRef(loc, { actual: arr }));
    }
    for (const e of arr) {
        if (typeof e !== "string") {
            return messageError("SchemaRequiredElementMustBeString", withRef(loc, { element: e }));
        }
    }
    return arr;
}
export const schemaTypeDict = {
    null: true,
    boolean: true,
    string: true,
    integer: true,
    number: true,
    array: true,
    object: true
};
const schemaTypes = Object.getOwnPropertyNames(schemaTypeDict);
function typeKindForJSONSchemaFormat(format) {
    const target = iterableFind(transformedStringTypeTargetTypeKindsMap, ([_, { jsonSchema }]) => jsonSchema === format);
    if (target === undefined)
        return undefined;
    return target[0];
}
function schemaFetchError(base, address) {
    if (base === undefined) {
        return messageError("SchemaFetchErrorTopLevel", { address });
    }
    else {
        return messageError("SchemaFetchError", { address, base: base.canonicalRef });
    }
}
class Resolver {
    constructor(_ctx, _store, _canonizer) {
        this._ctx = _ctx;
        this._store = _store;
        this._canonizer = _canonizer;
    }
    tryResolveVirtualRef(fetchBase, lookupBase, virtualRef) {
        return __awaiter(this, void 0, void 0, function* () {
            let didAdd = false;
            // If we are resolving into a schema file that we haven't seen yet then
            // we don't know its $id mapping yet, which means we don't know where we
            // will end up.  What we do if we encounter a new schema is add all its
            // IDs first, and then try to canonize again.
            for (;;) {
                const loc = this._canonizer.canonize(fetchBase, virtualRef);
                const canonical = loc.canonicalRef;
                assert(canonical.hasAddress, "Canonical ref can't be resolved without an address");
                const address = canonical.address;
                let schema = canonical.addressURI === undefined
                    ? undefined
                    : yield this._store.get(address, this._ctx.debugPrintSchemaResolving);
                if (schema === undefined) {
                    return [undefined, loc];
                }
                if (this._canonizer.addSchema(schema, address)) {
                    assert(!didAdd, "We can't add a schema twice");
                    didAdd = true;
                }
                else {
                    let lookupLoc = this._canonizer.canonize(lookupBase, virtualRef);
                    if (fetchBase !== undefined) {
                        lookupLoc = new Location(new Ref(loc.canonicalRef.addressURI, lookupLoc.canonicalRef.path), lookupLoc.virtualRef, lookupLoc.haveID);
                    }
                    return [lookupLoc.canonicalRef.lookupRef(schema), lookupLoc];
                }
            }
        });
    }
    resolveVirtualRef(base, virtualRef) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._ctx.debugPrintSchemaResolving) {
                console.log(`resolving ${virtualRef.toString()} relative to ${base.toString()}`);
            }
            // Try with the virtual base first.  If that doesn't work, use the
            // canonical ref's address with the virtual base's path.
            let result = yield this.tryResolveVirtualRef(base, base, virtualRef);
            let schema = result[0];
            if (schema !== undefined) {
                if (this._ctx.debugPrintSchemaResolving) {
                    console.log(`resolved to ${result[1].toString()}`);
                }
                return [schema, result[1]];
            }
            const altBase = new Location(base.canonicalRef, new Ref(base.canonicalRef.addressURI, base.virtualRef.path), base.haveID);
            result = yield this.tryResolveVirtualRef(altBase, base, virtualRef);
            schema = result[0];
            if (schema !== undefined) {
                if (this._ctx.debugPrintSchemaResolving) {
                    console.log(`resolved to ${result[1].toString()}`);
                }
                return [schema, result[1]];
            }
            return schemaFetchError(base, virtualRef.address);
        });
    }
    resolveTopLevelRef(ref) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.resolveVirtualRef(new Location(new Ref(ref.addressURI, [])), new Ref(undefined, ref.path));
        });
    }
}
function addTypesInSchema(resolver, typeBuilder, references, attributeProducers) {
    return __awaiter(this, void 0, void 0, function* () {
        let typeForCanonicalRef = new EqualityMap();
        function setTypeForLocation(loc, t) {
            const maybeRef = typeForCanonicalRef.get(loc.canonicalRef);
            if (maybeRef !== undefined) {
                assert(maybeRef === t, "Trying to set path again to different type");
            }
            typeForCanonicalRef.set(loc.canonicalRef, t);
        }
        function makeObject(loc, attributes, properties, requiredArray, additionalProperties, sortKey = (k) => k.toLowerCase()) {
            return __awaiter(this, void 0, void 0, function* () {
                const required = new Set(requiredArray);
                const propertiesMap = mapSortBy(mapFromObject(properties), (_, k) => sortKey(k));
                const props = yield mapMapSync(propertiesMap, (propSchema, propName) => __awaiter(this, void 0, void 0, function* () {
                    const propLoc = loc.push("properties", propName);
                    const t = yield toType(checkJSONSchema(propSchema, propLoc.canonicalRef), propLoc, makeNamesTypeAttributes(propName, true));
                    const isOptional = !required.has(propName);
                    return typeBuilder.makeClassProperty(t, isOptional);
                }));
                let additionalPropertiesType;
                if (additionalProperties === undefined || additionalProperties === true) {
                    additionalPropertiesType = typeBuilder.getPrimitiveType("any");
                }
                else if (additionalProperties === false) {
                    additionalPropertiesType = undefined;
                }
                else {
                    const additionalLoc = loc.push("additionalProperties");
                    additionalPropertiesType = yield toType(checkJSONSchema(additionalProperties, additionalLoc.canonicalRef), additionalLoc, singularizeTypeNames(attributes));
                }
                const additionalRequired = setSubtract(required, props.keys());
                if (additionalRequired.size > 0) {
                    const t = additionalPropertiesType;
                    if (t === undefined) {
                        return messageError("SchemaAdditionalTypesForbidRequired", withRef(loc));
                    }
                    const additionalProps = mapFromIterable(additionalRequired, _name => typeBuilder.makeClassProperty(t, false));
                    mapMergeInto(props, additionalProps);
                }
                return typeBuilder.getUniqueObjectType(attributes, props, additionalPropertiesType);
            });
        }
        function convertToType(schema, loc, typeAttributes) {
            var _a;
            return __awaiter(this, void 0, void 0, function* () {
                const enumArray = Array.isArray(schema.enum) ? schema.enum : undefined;
                const isConst = schema.const !== undefined;
                const typeSet = definedMap(schema.type, t => checkTypeList(t, loc));
                function isTypeIncluded(name) {
                    var _a;
                    if (typeSet !== undefined && !typeSet.has(name)) {
                        return false;
                    }
                    if (enumArray !== undefined) {
                        let predicate;
                        switch (name) {
                            case "null":
                                predicate = (x) => x === null;
                                break;
                            case "integer":
                                predicate = (x) => typeof x === "number" && x === Math.floor(x);
                                break;
                            default:
                                predicate = (x) => typeof x === name;
                                break;
                        }
                        return enumArray.find(predicate) !== undefined;
                    }
                    if (isConst) {
                        return name === ((_a = schema.type) !== null && _a !== void 0 ? _a : typeof schema.const);
                    }
                    return true;
                }
                const includedTypes = setFilter(schemaTypes, isTypeIncluded);
                let producedAttributesForNoCases = undefined;
                function forEachProducedAttribute(cases, f) {
                    let attributes;
                    if (cases === undefined && producedAttributesForNoCases !== undefined) {
                        attributes = producedAttributesForNoCases;
                    }
                    else {
                        attributes = [];
                        for (const producer of attributeProducers) {
                            const newAttributes = producer(schema, loc.canonicalRef, includedTypes, cases);
                            if (newAttributes === undefined)
                                continue;
                            attributes.push(newAttributes);
                        }
                        if (cases === undefined) {
                            producedAttributesForNoCases = attributes;
                        }
                    }
                    for (const a of attributes) {
                        f(a);
                    }
                }
                function combineProducedAttributes(f) {
                    let result = emptyTypeAttributes;
                    forEachProducedAttribute(undefined, attr => {
                        const maybeAttributes = f(attr);
                        if (maybeAttributes === undefined)
                            return;
                        result = combineTypeAttributes("union", result, maybeAttributes);
                    });
                    return result;
                }
                function makeAttributes(attributes) {
                    if (schema.oneOf === undefined) {
                        attributes = combineTypeAttributes("union", attributes, combineProducedAttributes(({ forType, forUnion, forCases }) => {
                            assert(forUnion === undefined && forCases === undefined, "We can't have attributes for unions and cases if we don't have a union");
                            return forType;
                        }));
                    }
                    return modifyTypeNames(attributes, maybeTypeNames => {
                        const typeNames = defined(maybeTypeNames);
                        if (!typeNames.areInferred) {
                            return typeNames;
                        }
                        let title = schema.title;
                        if (typeof title !== "string") {
                            title = loc.canonicalRef.definitionName;
                        }
                        if (typeof title === "string") {
                            return TypeNames.make(new Set([title]), new Set(), schema.$ref !== undefined);
                        }
                        else {
                            return typeNames.makeInferred();
                        }
                    });
                }
                typeAttributes = makeAttributes(typeAttributes);
                const inferredAttributes = makeTypeAttributesInferred(typeAttributes);
                function makeStringType(attributes) {
                    const kind = typeKindForJSONSchemaFormat(schema.format);
                    if (kind === undefined) {
                        return typeBuilder.getStringType(attributes, StringTypes.unrestricted);
                    }
                    else {
                        return typeBuilder.getPrimitiveType(kind, attributes);
                    }
                }
                function makeArrayType() {
                    return __awaiter(this, void 0, void 0, function* () {
                        const singularAttributes = singularizeTypeNames(typeAttributes);
                        const items = schema.items;
                        let itemType;
                        if (Array.isArray(items)) {
                            const itemsLoc = loc.push("items");
                            const itemTypes = yield arrayMapSync(items, (item, i) => __awaiter(this, void 0, void 0, function* () {
                                const itemLoc = itemsLoc.push(i.toString());
                                return yield toType(checkJSONSchema(item, itemLoc.canonicalRef), itemLoc, singularAttributes);
                            }));
                            itemType = typeBuilder.getUnionType(emptyTypeAttributes, new Set(itemTypes));
                        }
                        else if (typeof items === "object") {
                            const itemsLoc = loc.push("items");
                            itemType = yield toType(checkJSONSchema(items, itemsLoc.canonicalRef), itemsLoc, singularAttributes);
                        }
                        else if (items !== undefined && items !== true) {
                            return messageError("SchemaArrayItemsMustBeStringOrArray", withRef(loc, { actual: items }));
                        }
                        else {
                            itemType = typeBuilder.getPrimitiveType("any");
                        }
                        typeBuilder.addAttributes(itemType, singularAttributes);
                        return typeBuilder.getArrayType(emptyTypeAttributes, itemType);
                    });
                }
                function makeObjectType() {
                    return __awaiter(this, void 0, void 0, function* () {
                        let required;
                        if (schema.required === undefined || typeof schema.required === "boolean") {
                            required = [];
                        }
                        else {
                            required = Array.from(checkRequiredArray(schema.required, loc));
                        }
                        let properties;
                        if (schema.properties === undefined) {
                            properties = {};
                        }
                        else {
                            properties = checkJSONSchemaObject(schema.properties, loc.canonicalRef);
                        }
                        // In Schema Draft 3, `required` is `true` on a property that's required.
                        for (const p of Object.getOwnPropertyNames(properties)) {
                            if (properties[p].required === true && !required.includes(p)) {
                                required.push(p);
                            }
                        }
                        let additionalProperties = schema.additionalProperties;
                        // This is an incorrect hack to fix an issue with a Go->Schema generator:
                        // https://github.com/quicktype/quicktype/issues/976
                        if (additionalProperties === undefined &&
                            typeof schema.patternProperties === "object" &&
                            hasOwnProperty(schema.patternProperties, ".*")) {
                            additionalProperties = schema.patternProperties[".*"];
                        }
                        const objectAttributes = combineTypeAttributes("union", inferredAttributes, combineProducedAttributes(({ forObject }) => forObject));
                        const order = schema.quicktypePropertyOrder ? schema.quicktypePropertyOrder : [];
                        const orderKey = (propertyName) => {
                            // use the index of the order array
                            const index = order.indexOf(propertyName);
                            // if no index then use the property name
                            return index !== -1 ? index : propertyName.toLowerCase();
                        };
                        return yield makeObject(loc, objectAttributes, properties, required, additionalProperties, orderKey);
                    });
                }
                function makeTypesFromCases(cases, kind) {
                    return __awaiter(this, void 0, void 0, function* () {
                        const kindLoc = loc.push(kind);
                        if (!Array.isArray(cases)) {
                            return messageError("SchemaSetOperationCasesIsNotArray", withRef(kindLoc, { operation: kind, cases }));
                        }
                        return yield arrayMapSync(cases, (t, index) => __awaiter(this, void 0, void 0, function* () {
                            const caseLoc = kindLoc.push(index.toString());
                            return yield toType(checkJSONSchema(t, caseLoc.canonicalRef), caseLoc, makeTypeAttributesInferred(typeAttributes));
                        }));
                    });
                }
                const intersectionType = typeBuilder.getUniqueIntersectionType(typeAttributes, undefined);
                setTypeForLocation(loc, intersectionType);
                function convertOneOrAnyOf(cases, kind) {
                    return __awaiter(this, void 0, void 0, function* () {
                        const typeRefs = yield makeTypesFromCases(cases, kind);
                        let unionAttributes = makeTypeAttributesInferred(typeAttributes);
                        if (kind === "oneOf") {
                            forEachProducedAttribute(cases, ({ forType, forUnion, forCases }) => {
                                if (forType !== undefined) {
                                    typeBuilder.addAttributes(intersectionType, forType);
                                }
                                if (forUnion !== undefined) {
                                    unionAttributes = combineTypeAttributes("union", unionAttributes, forUnion);
                                }
                                if (forCases !== undefined) {
                                    assert(forCases.length === typeRefs.length, "Number of case attributes doesn't match number of cases");
                                    for (let i = 0; i < typeRefs.length; i++) {
                                        typeBuilder.addAttributes(typeRefs[i], forCases[i]);
                                    }
                                }
                            });
                        }
                        const unionType = typeBuilder.getUniqueUnionType(unionAttributes, undefined);
                        typeBuilder.setSetOperationMembers(unionType, new Set(typeRefs));
                        return unionType;
                    });
                }
                const includeObject = enumArray === undefined && !isConst && (typeSet === undefined || typeSet.has("object"));
                const includeArray = enumArray === undefined && !isConst && (typeSet === undefined || typeSet.has("array"));
                const needStringEnum = includedTypes.has("string") &&
                    enumArray !== undefined &&
                    enumArray.find(x => typeof x === "string") !== undefined;
                const needUnion = typeSet !== undefined ||
                    schema.properties !== undefined ||
                    schema.additionalProperties !== undefined ||
                    schema.items !== undefined ||
                    schema.required !== undefined ||
                    enumArray !== undefined ||
                    isConst;
                const types = [];
                if (needUnion) {
                    const unionTypes = [];
                    const numberAttributes = combineProducedAttributes(({ forNumber }) => forNumber);
                    for (const [name, kind] of [
                        ["null", "null"],
                        ["number", "double"],
                        ["integer", "integer"],
                        ["boolean", "bool"]
                    ]) {
                        if (!includedTypes.has(name))
                            continue;
                        const attributes = isNumberTypeKind(kind) ? numberAttributes : undefined;
                        unionTypes.push(typeBuilder.getPrimitiveType(kind, attributes));
                    }
                    const stringAttributes = combineTypeAttributes("union", inferredAttributes, combineProducedAttributes(({ forString }) => forString));
                    if (needStringEnum || isConst) {
                        const cases = isConst ? [schema.const] : (_a = enumArray === null || enumArray === void 0 ? void 0 : enumArray.filter(x => typeof x === "string")) !== null && _a !== void 0 ? _a : [];
                        unionTypes.push(typeBuilder.getStringType(stringAttributes, StringTypes.fromCases(cases)));
                    }
                    else if (includedTypes.has("string")) {
                        unionTypes.push(makeStringType(stringAttributes));
                    }
                    if (includeArray) {
                        unionTypes.push(yield makeArrayType());
                    }
                    if (includeObject) {
                        unionTypes.push(yield makeObjectType());
                    }
                    types.push(typeBuilder.getUniqueUnionType(inferredAttributes, new Set(unionTypes)));
                }
                if (schema.$ref !== undefined) {
                    if (typeof schema.$ref !== "string") {
                        return messageError("SchemaRefMustBeString", withRef(loc, { actual: typeof schema.$ref }));
                    }
                    const virtualRef = Ref.parse(schema.$ref);
                    const [target, newLoc] = yield resolver.resolveVirtualRef(loc, virtualRef);
                    const attributes = modifyTypeNames(typeAttributes, tn => {
                        if (!defined(tn).areInferred)
                            return tn;
                        return TypeNames.make(new Set([newLoc.canonicalRef.name]), new Set(), true);
                    });
                    types.push(yield toType(target, newLoc, attributes));
                }
                if (schema.allOf !== undefined) {
                    types.push(...(yield makeTypesFromCases(schema.allOf, "allOf")));
                }
                if (schema.oneOf !== undefined) {
                    types.push(yield convertOneOrAnyOf(schema.oneOf, "oneOf"));
                }
                if (schema.anyOf !== undefined) {
                    types.push(yield convertOneOrAnyOf(schema.anyOf, "anyOf"));
                }
                typeBuilder.setSetOperationMembers(intersectionType, new Set(types));
                return intersectionType;
            });
        }
        function toType(schema, loc, typeAttributes) {
            return __awaiter(this, void 0, void 0, function* () {
                const maybeType = typeForCanonicalRef.get(loc.canonicalRef);
                if (maybeType !== undefined) {
                    return maybeType;
                }
                let result;
                if (typeof schema === "boolean") {
                    // FIXME: Empty union.  We'd have to check that it's supported everywhere,
                    // in particular in union flattening.
                    messageAssert(schema === true, "SchemaFalseNotSupported", withRef(loc));
                    result = typeBuilder.getPrimitiveType("any");
                }
                else {
                    loc = loc.updateWithID(schema.$id);
                    result = yield convertToType(schema, loc, typeAttributes);
                }
                setTypeForLocation(loc, result);
                return result;
            });
        }
        for (const [topLevelName, topLevelRef] of references) {
            const [target, loc] = yield resolver.resolveTopLevelRef(topLevelRef);
            const t = yield toType(target, loc, makeNamesTypeAttributes(topLevelName, false));
            typeBuilder.addTopLevel(topLevelName, t);
        }
    });
}
function removeExtension(fn) {
    const lower = fn.toLowerCase();
    const extensions = [".json", ".schema"];
    for (const ext of extensions) {
        if (lower.endsWith(ext)) {
            const base = fn.slice(0, fn.length - ext.length);
            if (base.length > 0) {
                return base;
            }
        }
    }
    return fn;
}
function nameFromURI(uri) {
    const fragment = uri.fragment();
    if (fragment !== "") {
        const components = fragment.split("/");
        const len = components.length;
        if (components[len - 1] !== "") {
            return removeExtension(components[len - 1]);
        }
        if (len > 1 && components[len - 2] !== "") {
            return removeExtension(components[len - 2]);
        }
    }
    const filename = uri.filename();
    if (filename !== "") {
        return removeExtension(filename);
    }
    return messageError("DriverCannotInferNameForSchema", { uri: uri.toString() });
}
function refsInSchemaForURI(resolver, uri, defaultName) {
    return __awaiter(this, void 0, void 0, function* () {
        const fragment = uri.fragment();
        let propertiesAreTypes = fragment.endsWith("/");
        if (propertiesAreTypes) {
            uri = uri.clone().fragment(fragment.slice(0, -1));
        }
        const ref = Ref.parseURI(uri);
        if (ref.isRoot) {
            propertiesAreTypes = false;
        }
        const schema = (yield resolver.resolveTopLevelRef(ref))[0];
        if (propertiesAreTypes) {
            if (typeof schema !== "object") {
                return messageError("SchemaCannotGetTypesFromBoolean", { ref: ref.toString() });
            }
            return mapMap(mapFromObject(schema), (_, name) => ref.push(name));
        }
        else {
            let name;
            if (typeof schema === "object" && typeof schema.title === "string") {
                name = schema.title;
            }
            else {
                const maybeName = nameFromURI(uri);
                name = maybeName !== null && maybeName !== void 0 ? maybeName : defaultName;
            }
            return [name, ref];
        }
    });
}
class InputJSONSchemaStore extends JSONSchemaStore {
    constructor(_inputs, _delegate) {
        super();
        this._inputs = _inputs;
        this._delegate = _delegate;
    }
    fetch(address) {
        return __awaiter(this, void 0, void 0, function* () {
            const maybeInput = this._inputs.get(address);
            if (maybeInput !== undefined) {
                return checkJSONSchema(parseJSON(maybeInput, "JSON Schema", address), () => Ref.root(address));
            }
            if (this._delegate === undefined) {
                return panic(`Schema URI ${address} requested, but no store given`);
            }
            return yield this._delegate.fetch(address);
        });
    }
}
export class JSONSchemaInput {
    constructor(_schemaStore, additionalAttributeProducers = [], _additionalSchemaAddresses = []) {
        this._schemaStore = _schemaStore;
        this._additionalSchemaAddresses = _additionalSchemaAddresses;
        this.kind = "schema";
        this.needSchemaProcessing = true;
        this._schemaInputs = new Map();
        this._schemaSources = [];
        this._topLevels = new Map();
        this._needIR = false;
        this._attributeProducers = [
            descriptionAttributeProducer,
            accessorNamesAttributeProducer,
            enumValuesAttributeProducer,
            uriSchemaAttributesProducer,
            minMaxAttributeProducer,
            minMaxLengthAttributeProducer,
            patternAttributeProducer
        ].concat(additionalAttributeProducers);
    }
    get needIR() {
        return this._needIR;
    }
    addTopLevel(name, ref) {
        this._topLevels.set(name, ref);
    }
    addTypes(ctx, typeBuilder) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._schemaSources.length === 0)
                return;
            let maybeSchemaStore = this._schemaStore;
            if (this._schemaInputs.size === 0) {
                if (maybeSchemaStore === undefined) {
                    return panic("Must have a schema store to process JSON Schema");
                }
            }
            else {
                maybeSchemaStore = this._schemaStore = new InputJSONSchemaStore(this._schemaInputs, maybeSchemaStore);
            }
            const schemaStore = maybeSchemaStore;
            const canonizer = new Canonizer(ctx);
            for (const address of this._additionalSchemaAddresses) {
                const schema = yield schemaStore.get(address, ctx.debugPrintSchemaResolving);
                if (schema === undefined) {
                    return messageError("SchemaFetchErrorAdditional", { address });
                }
                canonizer.addSchema(schema, address);
            }
            const resolver = new Resolver(ctx, defined(this._schemaStore), canonizer);
            for (const [normalizedURI, source] of this._schemaSources) {
                const givenName = source.name;
                const refs = yield refsInSchemaForURI(resolver, normalizedURI, givenName);
                if (Array.isArray(refs)) {
                    let name;
                    if (this._schemaSources.length === 1 && givenName !== undefined) {
                        name = givenName;
                    }
                    else {
                        name = refs[0];
                    }
                    this.addTopLevel(name, refs[1]);
                }
                else {
                    for (const [refName, ref] of refs) {
                        this.addTopLevel(refName, ref);
                    }
                }
            }
            yield addTypesInSchema(resolver, typeBuilder, this._topLevels, this._attributeProducers);
        });
    }
    addTypesSync() {
        return panic("addTypesSync not supported in JSONSchemaInput");
    }
    addSource(schemaSource) {
        return __awaiter(this, void 0, void 0, function* () {
            this.addSourceSync(schemaSource);
        });
    }
    addSourceSync(schemaSource) {
        const { name, uris, schema, isConverted } = schemaSource;
        if (isConverted !== true) {
            this._needIR = true;
        }
        let normalizedURIs;
        if (uris === undefined) {
            normalizedURIs = [new URI(name)];
        }
        else {
            normalizedURIs = uris.map(uri => {
                const normalizedURI = normalizeURI(uri);
                if (normalizedURI.clone().hash("").toString() === "") {
                    normalizedURI.path(name);
                }
                return normalizedURI;
            });
        }
        if (schema === undefined) {
            assert(uris !== undefined, "URIs must be given if schema source is not specified");
        }
        else {
            for (let i = 0; i < normalizedURIs.length; i++) {
                const normalizedURI = normalizedURIs[i];
                const uri = normalizedURI.clone().hash("");
                const path = uri.path();
                let suffix = 0;
                do {
                    if (suffix > 0) {
                        uri.path(`${path}-${suffix}`);
                    }
                    suffix++;
                } while (this._schemaInputs.has(uri.toString()));
                this._schemaInputs.set(uri.toString(), schema);
                normalizedURIs[i] = uri.hash(normalizedURI.hash());
            }
        }
        // FIXME: Why do we need both _schemaSources and _schemaInputs?
        for (const normalizedURI of normalizedURIs) {
            this._schemaSources.push([normalizedURI, schemaSource]);
        }
    }
    singleStringSchemaSource() {
        if (!this._schemaSources.every(([_, { schema }]) => typeof schema === "string")) {
            return undefined;
        }
        const set = new Set(this._schemaSources.map(([_, { schema }]) => schema));
        if (set.size === 1) {
            return defined(iterableFirst(set));
        }
        return undefined;
    }
}
