import { arrayIntercalate } from "collection-utils";
import { ConvenienceRenderer } from "../ConvenienceRenderer";
import { funPrefixNamer } from "../Naming";
import { BooleanOption, getOptionValues } from "../RendererOptions";
import { AcronymStyleOptions, acronymStyle } from "../support/Acronyms";
import { allLowerWordStyle, capitalize, combineWords, firstUpperWordStyle, isLetterOrUnderscore, splitIntoWords, stringEscape, utf16StringEscape } from "../support/Strings";
import { panic } from "../support/Support";
import { TargetLanguage } from "../TargetLanguage";
import { ArrayType, EnumType, MapType } from "../Type";
import { matchType } from "../TypeUtils";
import { legalizeName } from "./JavaScript";
export const typeScriptEffectSchemaOptions = {
    justSchema: new BooleanOption("just-schema", "Schema only", false)
};
export class TypeScriptEffectSchemaTargetLanguage extends TargetLanguage {
    getOptions() {
        return [];
    }
    constructor(displayName = "TypeScript Effect Schema", names = ["typescript-effect-schema"], extension = "ts") {
        super(displayName, names, extension);
    }
    makeRenderer(renderContext, untypedOptionValues) {
        return new TypeScriptEffectSchemaRenderer(this, renderContext, getOptionValues(typeScriptEffectSchemaOptions, untypedOptionValues));
    }
}
export class TypeScriptEffectSchemaRenderer extends ConvenienceRenderer {
    constructor(targetLanguage, renderContext, _options) {
        super(targetLanguage, renderContext);
        this._options = _options;
        this.emittedObjects = new Set();
    }
    forbiddenNamesForGlobalNamespace() {
        return ["Class", "Date", "Object", "String", "Array", "JSON", "Error"];
    }
    nameStyle(original, upper) {
        const acronyms = acronymStyle(AcronymStyleOptions.Camel);
        const words = splitIntoWords(original);
        return combineWords(words, legalizeName, upper ? firstUpperWordStyle : allLowerWordStyle, firstUpperWordStyle, upper ? (s) => capitalize(acronyms(s)) : allLowerWordStyle, acronyms, "", isLetterOrUnderscore);
    }
    makeNamedTypeNamer() {
        return funPrefixNamer("types", s => this.nameStyle(s, true));
    }
    makeUnionMemberNamer() {
        return funPrefixNamer("properties", s => this.nameStyle(s, true));
    }
    namerForObjectProperty() {
        return funPrefixNamer("properties", s => this.nameStyle(s, true));
    }
    makeEnumCaseNamer() {
        return funPrefixNamer("enum-cases", s => this.nameStyle(s, false));
    }
    importStatement(lhs, moduleName) {
        return ["import ", lhs, " from ", moduleName, ";"];
    }
    emitImports() {
        this.ensureBlankLine();
        this.emitLine(this.importStatement("* as S", '"@effect/schema/Schema"'));
    }
    typeMapTypeForProperty(p) {
        const typeMap = this.typeMapTypeFor(p.type);
        return p.isOptional ? ["S.optional(", typeMap, ")"] : typeMap;
    }
    typeMapTypeFor(t, required = true) {
        if (t.kind === "class" || t.kind === "object" || t.kind === "enum") {
            const name = this.nameForNamedType(t);
            if (this.emittedObjects.has(name)) {
                return [name];
            }
            return ["S.suspend(() => ", name, ")"];
        }
        const match = matchType(t, _anyType => "S.Any", _nullType => "S.Null", _boolType => "S.Boolean", _integerType => "S.Number", _doubleType => "S.Number", _stringType => "S.String", arrayType => ["S.Array(", this.typeMapTypeFor(arrayType.items, false), ")"], _classType => panic("Should already be handled."), _mapType => ["S.Record(S.String, ", this.typeMapTypeFor(_mapType.values, false), ")"], _enumType => panic("Should already be handled."), unionType => {
            const children = Array.from(unionType.getChildren()).map((type) => this.typeMapTypeFor(type, false));
            return ["S.Union(", ...arrayIntercalate(", ", children), ")"];
        }, _transformedStringType => {
            return "S.String";
        });
        if (required) {
            return [match];
        }
        return match;
    }
    emitObject(name, t) {
        this.emittedObjects.add(name);
        this.ensureBlankLine();
        this.emitLine("\nexport class ", name, " extends S.Class<", name, '>("', name, '")({');
        this.indent(() => {
            this.forEachClassProperty(t, "none", (_, jsonName, property) => {
                this.emitLine(`"${utf16StringEscape(jsonName)}"`, ": ", this.typeMapTypeForProperty(property), ",");
            });
        });
        this.emitLine("}) {}");
    }
    emitEnum(e, enumName) {
        this.emittedObjects.add(enumName);
        this.ensureBlankLine();
        this.emitDescription(this.descriptionForType(e));
        this.emitLine("\nexport const ", enumName, " = ", "S.Literal(");
        this.indent(() => this.forEachEnumCase(e, "none", (_, jsonName) => {
            this.emitLine('"', stringEscape(jsonName), '",');
        }));
        this.emitLine(");");
        if (!this._options.justSchema) {
            this.emitLine("export type ", enumName, " = S.Schema.Type<typeof ", enumName, ">;");
        }
    }
    walkObjectNames(objectType) {
        const names = [];
        const recurse = (type) => {
            if (type.kind === "object" || type.kind === "class") {
                names.push(this.nameForNamedType(type));
                this.forEachClassProperty(type, "none", (_, __, prop) => {
                    recurse(prop.type);
                });
            }
            else if (type instanceof ArrayType) {
                recurse(type.items);
            }
            else if (type instanceof MapType) {
                recurse(type.values);
            }
            else if (type instanceof EnumType) {
                for (const t of type.getChildren()) {
                    recurse(t);
                }
            }
        };
        this.forEachClassProperty(objectType, "none", (_, __, prop) => {
            recurse(prop.type);
        });
        return names;
    }
    emitSchemas() {
        this.ensureBlankLine();
        this.forEachEnum("leading-and-interposing", (u, enumName) => {
            this.emitEnum(u, enumName);
        });
        const order = [];
        const mapKey = [];
        const mapValue = [];
        this.forEachObject("none", (type, name) => {
            mapKey.push(name);
            mapValue.push(type);
        });
        mapKey.forEach((_, index) => {
            // assume first
            let ordinal = 0;
            // pull out all names
            const source = mapValue[index];
            const names = this.walkObjectNames(source);
            // must be behind all these names
            names.forEach(name => {
                const depName = name;
                // find this name's ordinal, if it has already been added
                order.forEach(orderItem => {
                    const depIndex = orderItem;
                    if (mapKey[depIndex] === depName) {
                        // this is the index of the dependency, so make sure we come after it
                        ordinal = Math.max(ordinal, depIndex + 1);
                    }
                });
            });
            // insert index
            order.splice(ordinal, 0, index);
        });
        // now emit ordered source
        order.forEach(i => this.emitGatheredSource(this.gatherSource(() => this.emitObject(mapKey[i], mapValue[i]))));
    }
    emitSourceStructure() {
        if (this.leadingComments !== undefined) {
            this.emitComments(this.leadingComments);
        }
        this.emitImports();
        this.emitSchemas();
    }
}
