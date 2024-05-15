import { iterableFirst, mapFirst } from "collection-utils";
import { addDescriptionToSchema } from "../attributes/Description";
import { ConvenienceRenderer } from "../ConvenienceRenderer";
import { funPrefixNamer } from "../Naming";
import { allUpperWordStyle, combineWords, firstUpperWordStyle, legalizeCharacters, splitIntoWords } from "../support/Strings";
import { defined, panic } from "../support/Support";
import { TargetLanguage } from "../TargetLanguage";
import { transformedStringTypeTargetTypeKindsMap } from "../Type";
import { getNoStringTypeMapping } from "../TypeBuilder";
import { matchTypeExhaustive } from "../TypeUtils";
export class JSONSchemaTargetLanguage extends TargetLanguage {
    constructor() {
        super("JSON Schema", ["schema", "json-schema"], "schema");
    }
    getOptions() {
        return [];
    }
    get stringTypeMapping() {
        return getNoStringTypeMapping();
    }
    get supportsOptionalClassProperties() {
        return true;
    }
    get supportsFullObjectType() {
        return true;
    }
    makeRenderer(renderContext, _untypedOptionValues) {
        return new JSONSchemaRenderer(this, renderContext);
    }
}
const namingFunction = funPrefixNamer("namer", jsonNameStyle);
const legalizeName = legalizeCharacters(cp => cp >= 32 && cp < 128 && cp !== 0x2f /* slash */);
function jsonNameStyle(original) {
    const words = splitIntoWords(original);
    return combineWords(words, legalizeName, firstUpperWordStyle, firstUpperWordStyle, allUpperWordStyle, allUpperWordStyle, "", _ => true);
}
export class JSONSchemaRenderer extends ConvenienceRenderer {
    makeNamedTypeNamer() {
        return namingFunction;
    }
    namerForObjectProperty() {
        return null;
    }
    makeUnionMemberNamer() {
        return null;
    }
    makeEnumCaseNamer() {
        return null;
    }
    nameForType(t) {
        return defined(this.names.get(this.nameForNamedType(t)));
    }
    makeOneOf(types) {
        const first = iterableFirst(types);
        if (first === undefined) {
            return panic("Must have at least one type for oneOf");
        }
        if (types.size === 1) {
            return this.schemaForType(first);
        }
        return { anyOf: Array.from(types).map((t) => this.schemaForType(t)) };
    }
    makeRef(t) {
        return { $ref: `#/definitions/${this.nameForType(t)}` };
    }
    addAttributesToSchema(t, schema) {
        const attributes = this.typeGraph.attributeStore.attributesForType(t);
        for (const [kind, attr] of attributes) {
            kind.addToSchema(schema, t, attr);
        }
    }
    schemaForType(t) {
        const schema = matchTypeExhaustive(t, _noneType => {
            return panic("none type should have been replaced");
        }, _anyType => ({}), _nullType => ({ type: "null" }), _boolType => ({ type: "boolean" }), _integerType => ({ type: "integer" }), _doubleType => ({ type: "number" }), _stringType => ({ type: "string" }), arrayType => ({ type: "array", items: this.schemaForType(arrayType.items) }), classType => this.makeRef(classType), mapType => this.definitionForObject(mapType, undefined), objectType => this.makeRef(objectType), enumType => this.makeRef(enumType), unionType => {
            if (this.unionNeedsName(unionType)) {
                return this.makeRef(unionType);
            }
            else {
                return this.definitionForUnion(unionType);
            }
        }, transformedStringType => {
            const target = transformedStringTypeTargetTypeKindsMap.get(transformedStringType.kind);
            if (target === undefined) {
                return panic(`Unknown transformed string type ${transformedStringType.kind}`);
            }
            return { type: "string", format: target.jsonSchema };
        });
        if (schema.$ref === undefined) {
            this.addAttributesToSchema(t, schema);
        }
        return schema;
    }
    definitionForObject(o, title) {
        let properties;
        let required;
        if (o.getProperties().size === 0) {
            properties = undefined;
            required = undefined;
        }
        else {
            const props = {};
            const req = [];
            for (const [name, p] of o.getProperties()) {
                const prop = this.schemaForType(p.type);
                if (prop.description === undefined) {
                    addDescriptionToSchema(prop, this.descriptionForClassProperty(o, name));
                }
                props[name] = prop;
                if (!p.isOptional) {
                    req.push(name);
                }
            }
            properties = props;
            required = req.sort();
        }
        const additional = o.getAdditionalProperties();
        const additionalProperties = additional !== undefined ? this.schemaForType(additional) : false;
        const schema = {
            type: "object",
            additionalProperties,
            properties,
            required,
            title
        };
        this.addAttributesToSchema(o, schema);
        return schema;
    }
    definitionForUnion(u, title) {
        const oneOf = this.makeOneOf(u.sortedMembers);
        if (title !== undefined) {
            oneOf.title = title;
        }
        this.addAttributesToSchema(u, oneOf);
        return oneOf;
    }
    definitionForEnum(e, title) {
        const schema = { type: "string", enum: Array.from(e.cases), title };
        this.addAttributesToSchema(e, schema);
        return schema;
    }
    emitSourceStructure() {
        // FIXME: Find a good way to do multiple top-levels.  Maybe multiple files?
        const topLevelType = this.topLevels.size === 1 ? this.schemaForType(defined(mapFirst(this.topLevels))) : {};
        const schema = Object.assign({ $schema: "http://json-schema.org/draft-06/schema#" }, topLevelType);
        const definitions = {};
        this.forEachObject("none", (o, name) => {
            const title = defined(this.names.get(name));
            definitions[title] = this.definitionForObject(o, title);
        });
        this.forEachUnion("none", (u, name) => {
            if (!this.unionNeedsName(u))
                return;
            const title = defined(this.names.get(name));
            definitions[title] = this.definitionForUnion(u, title);
        });
        this.forEachEnum("none", (e, name) => {
            const title = defined(this.names.get(name));
            definitions[title] = this.definitionForEnum(e, title);
        });
        schema.definitions = definitions;
        this.emitMultiline(JSON.stringify(schema, undefined, "    "));
    }
}
