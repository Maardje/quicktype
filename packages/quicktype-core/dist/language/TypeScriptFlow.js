import { funPrefixNamer } from "../Naming";
import { BooleanOption, getOptionValues } from "../RendererOptions";
import { modifySource, multiWord, parenIfNeeded, singleWord } from "../Source";
import { camelCase, utf16StringEscape } from "../support/Strings";
import { defined, panic } from "../support/Support";
import { ArrayType, EnumType, UnionType } from "../Type";
import { isNamedType, matchType, nullableFromUnion } from "../TypeUtils";
import { JavaScriptRenderer, JavaScriptTargetLanguage, javaScriptOptions, legalizeName } from "./JavaScript";
import { isES3IdentifierStart } from "./JavaScriptUnicodeMaps";
export const tsFlowOptions = Object.assign({}, javaScriptOptions, {
    justTypes: new BooleanOption("just-types", "Interfaces only", false),
    nicePropertyNames: new BooleanOption("nice-property-names", "Transform property names to be JavaScripty", false),
    declareUnions: new BooleanOption("explicit-unions", "Explicitly name unions", false),
    preferUnions: new BooleanOption("prefer-unions", "Use union type instead of enum", false),
    preferTypes: new BooleanOption("prefer-types", "Use types instead of interfaces", false),
    preferConstValues: new BooleanOption("prefer-const-values", "Use string instead of enum for string enums with single value", false),
    readonly: new BooleanOption("readonly", "Use readonly type members", false)
});
const tsFlowTypeAnnotations = {
    any: ": any",
    anyArray: ": any[]",
    anyMap: ": { [k: string]: any }",
    string: ": string",
    stringArray: ": string[]",
    boolean: ": boolean"
};
export class TypeScriptFlowBaseTargetLanguage extends JavaScriptTargetLanguage {
    getOptions() {
        return [
            tsFlowOptions.justTypes,
            tsFlowOptions.nicePropertyNames,
            tsFlowOptions.declareUnions,
            tsFlowOptions.runtimeTypecheck,
            tsFlowOptions.runtimeTypecheckIgnoreUnknownProperties,
            tsFlowOptions.acronymStyle,
            tsFlowOptions.converters,
            tsFlowOptions.rawType,
            tsFlowOptions.preferUnions,
            tsFlowOptions.preferTypes,
            tsFlowOptions.preferConstValues,
            tsFlowOptions.readonly
        ];
    }
    get supportsOptionalClassProperties() {
        return true;
    }
}
export class TypeScriptTargetLanguage extends TypeScriptFlowBaseTargetLanguage {
    constructor() {
        super("TypeScript", ["typescript", "ts", "tsx"], "ts");
    }
    makeRenderer(renderContext, untypedOptionValues) {
        return new TypeScriptRenderer(this, renderContext, getOptionValues(tsFlowOptions, untypedOptionValues));
    }
}
function quotePropertyName(original) {
    const escaped = utf16StringEscape(original);
    const quoted = `"${escaped}"`;
    if (original.length === 0) {
        return quoted;
    }
    else if (!isES3IdentifierStart(original.codePointAt(0))) {
        return quoted;
    }
    else if (escaped !== original) {
        return quoted;
    }
    else if (legalizeName(original) !== original) {
        return quoted;
    }
    else {
        return original;
    }
}
export class TypeScriptFlowBaseRenderer extends JavaScriptRenderer {
    constructor(targetLanguage, renderContext, _tsFlowOptions) {
        super(targetLanguage, renderContext, _tsFlowOptions);
        this._tsFlowOptions = _tsFlowOptions;
    }
    namerForObjectProperty() {
        if (this._tsFlowOptions.nicePropertyNames) {
            return funPrefixNamer("properties", s => this.nameStyle(s, false));
        }
        else {
            return super.namerForObjectProperty();
        }
    }
    sourceFor(t) {
        if (this._tsFlowOptions.preferConstValues && t.kind === "enum" && t instanceof EnumType && t.cases.size === 1) {
            const item = t.cases.values().next().value;
            return singleWord(`"${utf16StringEscape(item)}"`);
        }
        if (["class", "object", "enum"].includes(t.kind)) {
            return singleWord(this.nameForNamedType(t));
        }
        return matchType(t, _anyType => singleWord("any"), _nullType => singleWord("null"), _boolType => singleWord("boolean"), _integerType => singleWord("number"), _doubleType => singleWord("number"), _stringType => singleWord("string"), arrayType => {
            const itemType = this.sourceFor(arrayType.items);
            if ((arrayType.items instanceof UnionType && !this._tsFlowOptions.declareUnions) ||
                arrayType.items instanceof ArrayType) {
                return singleWord(["Array<", itemType.source, ">"]);
            }
            else {
                return singleWord([parenIfNeeded(itemType), "[]"]);
            }
        }, _classType => panic("We handled this above"), mapType => singleWord(["{ [key: string]: ", this.sourceFor(mapType.values).source, " }"]), _enumType => panic("We handled this above"), unionType => {
            if (!this._tsFlowOptions.declareUnions || nullableFromUnion(unionType) !== null) {
                const children = Array.from(unionType.getChildren()).map(c => parenIfNeeded(this.sourceFor(c)));
                return multiWord(" | ", ...children);
            }
            else {
                return singleWord(this.nameForNamedType(unionType));
            }
        }, transformedStringType => {
            if (transformedStringType.kind === "date-time") {
                return singleWord("Date");
            }
            return singleWord("string");
        });
    }
    emitClassBlockBody(c) {
        this.emitPropertyTable(c, (name, _jsonName, p) => {
            const t = p.type;
            let propertyName = name;
            propertyName = modifySource(quotePropertyName, name);
            if (this._tsFlowOptions.readonly) {
                propertyName = modifySource(_propertyName => "readonly " + _propertyName, propertyName);
            }
            return [
                [propertyName, p.isOptional ? "?" : "", ": "],
                [this.sourceFor(t).source, ";"]
            ];
        });
        const additionalProperties = c.getAdditionalProperties();
        if (additionalProperties) {
            this.emitTable([["[property: string]", ": ", this.sourceFor(additionalProperties).source, ";"]]);
        }
    }
    emitClass(c, className) {
        this.emitDescription(this.descriptionForType(c));
        this.emitClassBlock(c, className);
    }
    emitUnion(u, unionName) {
        if (!this._tsFlowOptions.declareUnions) {
            return;
        }
        this.emitDescription(this.descriptionForType(u));
        const children = multiWord(" | ", ...Array.from(u.getChildren()).map(c => parenIfNeeded(this.sourceFor(c))));
        this.emitLine("export type ", unionName, " = ", children.source, ";");
    }
    emitTypes() {
        // emit primitive top levels
        this.forEachTopLevel("none", (t, name) => {
            if (!t.isPrimitive()) {
                return;
            }
            this.ensureBlankLine();
            this.emitDescription(this.descriptionForType(t));
            this.emitLine("type ", name, " = ", this.sourceFor(t).source, ";");
        });
        this.forEachNamedType("leading-and-interposing", (c, n) => this.emitClass(c, n), (e, n) => this.emitEnum(e, n), (u, n) => this.emitUnion(u, n));
    }
    emitUsageComments() {
        if (this._tsFlowOptions.justTypes)
            return;
        super.emitUsageComments();
    }
    deserializerFunctionLine(t, name) {
        const jsonType = this._tsFlowOptions.rawType === "json" ? "string" : "any";
        return ["function to", name, "(json: ", jsonType, "): ", this.sourceFor(t).source];
    }
    serializerFunctionLine(t, name) {
        const camelCaseName = modifySource(camelCase, name);
        const returnType = this._tsFlowOptions.rawType === "json" ? "string" : "any";
        return ["function ", camelCaseName, "ToJson(value: ", this.sourceFor(t).source, "): ", returnType];
    }
    get moduleLine() {
        return undefined;
    }
    get castFunctionLines() {
        return ["function cast<T>(val: any, typ: any): T", "function uncast<T>(val: T, typ: any): any"];
    }
    get typeAnnotations() {
        throw new Error("not implemented");
    }
    emitConvertModule() {
        if (this._tsFlowOptions.justTypes)
            return;
        super.emitConvertModule();
    }
    emitConvertModuleHelpers() {
        if (this._tsFlowOptions.justTypes)
            return;
        super.emitConvertModuleHelpers();
    }
    emitModuleExports() {
        if (this._tsFlowOptions.justTypes) {
            return;
        }
        else {
            super.emitModuleExports();
        }
    }
}
export class TypeScriptRenderer extends TypeScriptFlowBaseRenderer {
    forbiddenNamesForGlobalNamespace() {
        return ["Array", "Date"];
    }
    deserializerFunctionLine(t, name) {
        const jsonType = this._tsFlowOptions.rawType === "json" ? "string" : "any";
        return ["public static to", name, "(json: ", jsonType, "): ", this.sourceFor(t).source];
    }
    serializerFunctionLine(t, name) {
        const camelCaseName = modifySource(camelCase, name);
        const returnType = this._tsFlowOptions.rawType === "json" ? "string" : "any";
        return ["public static ", camelCaseName, "ToJson(value: ", this.sourceFor(t).source, "): ", returnType];
    }
    get moduleLine() {
        return "export class Convert";
    }
    get typeAnnotations() {
        return Object.assign({ never: ": never" }, tsFlowTypeAnnotations);
    }
    emitModuleExports() {
        return;
    }
    emitUsageImportComment() {
        const topLevelNames = [];
        this.forEachTopLevel("none", (_t, name) => {
            topLevelNames.push(", ", name);
        }, isNamedType);
        this.emitLine("//   import { Convert", topLevelNames, ' } from "./file";');
    }
    emitEnum(e, enumName) {
        this.emitDescription(this.descriptionForType(e));
        // enums with only one value are emitted as constants
        if (this._tsFlowOptions.preferConstValues && e.cases.size === 1)
            return;
        if (this._tsFlowOptions.preferUnions) {
            let items = "";
            e.cases.forEach(item => {
                if (items === "") {
                    items += `"${utf16StringEscape(item)}"`;
                    return;
                }
                items += ` | "${utf16StringEscape(item)}"`;
            });
            this.emitLine("export type ", enumName, " = ", items, ";");
        }
        else {
            this.emitBlock(["export enum ", enumName, " "], "", () => {
                this.forEachEnumCase(e, "none", (name, jsonName) => {
                    this.emitLine(name, ` = "${utf16StringEscape(jsonName)}",`);
                });
            });
        }
    }
    emitClassBlock(c, className) {
        this.emitBlock(this._tsFlowOptions.preferTypes
            ? ["export type ", className, " = "]
            : ["export interface ", className, " "], "", () => {
            this.emitClassBlockBody(c);
        });
    }
    emitSourceStructure() {
        super.emitSourceStructure();
    }
}
export class FlowTargetLanguage extends TypeScriptFlowBaseTargetLanguage {
    constructor() {
        super("Flow", ["flow"], "js");
    }
    makeRenderer(renderContext, untypedOptionValues) {
        return new FlowRenderer(this, renderContext, getOptionValues(tsFlowOptions, untypedOptionValues));
    }
}
export class FlowRenderer extends TypeScriptFlowBaseRenderer {
    forbiddenNamesForGlobalNamespace() {
        return ["Class", "Date", "Object", "String", "Array", "JSON", "Error"];
    }
    get typeAnnotations() {
        return Object.assign({ never: "" }, tsFlowTypeAnnotations);
    }
    emitEnum(e, enumName) {
        this.emitDescription(this.descriptionForType(e));
        const lines = [];
        this.forEachEnumCase(e, "none", (_, jsonName) => {
            const maybeOr = lines.length === 0 ? "  " : "| ";
            lines.push([maybeOr, '"', utf16StringEscape(jsonName), '"']);
        });
        defined(lines[lines.length - 1]).push(";");
        this.emitLine("export type ", enumName, " =");
        this.indent(() => {
            for (const line of lines) {
                this.emitLine(line);
            }
        });
    }
    emitClassBlock(c, className) {
        this.emitBlock(["export type ", className, " = "], ";", () => {
            this.emitClassBlockBody(c);
        });
    }
    emitSourceStructure() {
        this.emitLine("// @flow");
        this.ensureBlankLine();
        super.emitSourceStructure();
    }
}
