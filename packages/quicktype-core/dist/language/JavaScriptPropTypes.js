import { panic } from "@glideapps/ts-necessities";
import { arrayIntercalate } from "collection-utils";
import { ConvenienceRenderer } from "../ConvenienceRenderer";
import { funPrefixNamer } from "../Naming";
import { EnumOption, getOptionValues } from "../RendererOptions";
import { AcronymStyleOptions, acronymOption, acronymStyle } from "../support/Acronyms";
import { convertersOption } from "../support/Converters";
import { allLowerWordStyle, capitalize, combineWords, firstUpperWordStyle, splitIntoWords, utf16StringEscape } from "../support/Strings";
import { TargetLanguage } from "../TargetLanguage";
import { PrimitiveType } from "../Type";
import { directlyReachableSingleNamedType, matchType } from "../TypeUtils";
import { legalizeName } from "./JavaScript";
import { isES3IdentifierStart } from "./JavaScriptUnicodeMaps";
export const javaScriptPropTypesOptions = {
    acronymStyle: acronymOption(AcronymStyleOptions.Pascal),
    converters: convertersOption(),
    moduleSystem: new EnumOption("module-system", "Which module system to use", [
        ["common-js", false],
        ["es6", true]
    ], "es6")
};
export class JavaScriptPropTypesTargetLanguage extends TargetLanguage {
    getOptions() {
        return [javaScriptPropTypesOptions.acronymStyle, javaScriptPropTypesOptions.converters];
    }
    constructor(displayName = "JavaScript PropTypes", names = ["javascript-prop-types"], extension = "js") {
        super(displayName, names, extension);
    }
    makeRenderer(renderContext, untypedOptionValues) {
        return new JavaScriptPropTypesRenderer(this, renderContext, getOptionValues(javaScriptPropTypesOptions, untypedOptionValues));
    }
}
const identityNamingFunction = funPrefixNamer("properties", s => s);
export class JavaScriptPropTypesRenderer extends ConvenienceRenderer {
    constructor(targetLanguage, renderContext, _jsOptions) {
        super(targetLanguage, renderContext);
        this._jsOptions = _jsOptions;
    }
    nameStyle(original, upper) {
        const acronyms = acronymStyle(this._jsOptions.acronymStyle);
        const words = splitIntoWords(original);
        return combineWords(words, legalizeName, upper ? firstUpperWordStyle : allLowerWordStyle, firstUpperWordStyle, upper ? (s) => capitalize(acronyms(s)) : allLowerWordStyle, acronyms, "", isES3IdentifierStart);
    }
    makeNamedTypeNamer() {
        return funPrefixNamer("types", s => this.nameStyle(s, true));
    }
    namerForObjectProperty() {
        return identityNamingFunction;
    }
    makeUnionMemberNamer() {
        return null;
    }
    makeEnumCaseNamer() {
        return funPrefixNamer("enum-cases", s => this.nameStyle(s, false));
    }
    namedTypeToNameForTopLevel(type) {
        return directlyReachableSingleNamedType(type);
    }
    makeNameForProperty(c, className, p, jsonName, _assignedName) {
        // Ignore the assigned name
        return super.makeNameForProperty(c, className, p, jsonName, undefined);
    }
    typeMapTypeFor(t, required = true) {
        if (["class", "object", "enum"].includes(t.kind)) {
            return ["_", this.nameForNamedType(t)];
        }
        const match = matchType(t, _anyType => "PropTypes.any", _nullType => "PropTypes.any", _boolType => "PropTypes.bool", _integerType => "PropTypes.number", _doubleType => "PropTypes.number", _stringType => "PropTypes.string", arrayType => ["PropTypes.arrayOf(", this.typeMapTypeFor(arrayType.items, false), ")"], _classType => panic("Should already be handled."), _mapType => "PropTypes.object", _enumType => panic("Should already be handled."), unionType => {
            const children = Array.from(unionType.getChildren()).map((type) => this.typeMapTypeFor(type, false));
            return ["PropTypes.oneOfType([", ...arrayIntercalate(", ", children), "])"];
        }, _transformedStringType => {
            return "PropTypes.string";
        });
        if (required) {
            return [match];
        }
        return match;
    }
    typeMapTypeForProperty(p) {
        return this.typeMapTypeFor(p.type);
    }
    importStatement(lhs, moduleName) {
        if (this._jsOptions.moduleSystem) {
            return ["import ", lhs, " from ", moduleName, ";"];
        }
        else {
            return ["const ", lhs, " = require(", moduleName, ");"];
        }
    }
    emitUsageComments() {
        // FIXME: Use the correct type name
        this.emitCommentLines([
            "Example usage:",
            "",
            this.importStatement("{ MyShape }", "./myShape.js"),
            "",
            "class MyComponent extends React.Component {",
            "  //",
            "}",
            "",
            "MyComponent.propTypes = {",
            "  input: MyShape",
            "};"
        ], { lineStart: "// " });
    }
    emitBlock(source, end, emit) {
        this.emitLine(source, "{");
        this.indent(emit);
        this.emitLine("}", end);
    }
    emitImports() {
        this.ensureBlankLine();
        this.emitLine(this.importStatement("PropTypes", '"prop-types"'));
    }
    emitExport(name, value) {
        if (this._jsOptions.moduleSystem) {
            this.emitLine("export const ", name, " = ", value, ";");
        }
        else {
            this.emitLine("module.exports = exports = { ", name, ": ", value, " };");
        }
    }
    emitTypes() {
        this.ensureBlankLine();
        this.forEachObject("none", (_type, name) => {
            this.emitLine("let _", name, ";");
        });
        this.forEachEnum("none", (enumType, enumName) => {
            const options = [];
            this.forEachEnumCase(enumType, "none", (name, _jsonName, _position) => {
                options.push("'");
                options.push(name);
                options.push("'");
                options.push(", ");
            });
            options.pop();
            this.emitLine(["const _", enumName, " = PropTypes.oneOfType([", ...options, "]);"]);
        });
        const order = [];
        const mapKey = [];
        const mapValue = [];
        this.forEachObject("none", (type, name) => {
            mapKey.push(name);
            mapValue.push(this.gatherSource(() => this.emitObject(name, type)));
        });
        // order these
        mapKey.forEach((_, index) => {
            // assume first
            let ordinal = 0;
            // pull out all names
            const source = mapValue[index];
            const names = source.filter(value => value);
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
        order.forEach(i => this.emitGatheredSource(mapValue[i]));
        // now emit top levels
        this.forEachTopLevel("none", (type, name) => {
            if (type instanceof PrimitiveType) {
                this.ensureBlankLine();
                this.emitExport(name, this.typeMapTypeFor(type));
            }
            else {
                if (type.kind === "array") {
                    this.ensureBlankLine();
                    this.emitExport(name, ["PropTypes.arrayOf(", this.typeMapTypeFor(type.items), ")"]);
                }
                else {
                    this.ensureBlankLine();
                    this.emitExport(name, ["_", name]);
                }
            }
        });
    }
    emitObject(name, t) {
        this.ensureBlankLine();
        this.emitLine("_", name, " = PropTypes.shape({");
        this.indent(() => {
            this.forEachClassProperty(t, "none", (_, jsonName, property) => {
                this.emitLine(`"${utf16StringEscape(jsonName)}"`, ": ", this.typeMapTypeForProperty(property), ",");
            });
        });
        this.emitLine("});");
    }
    emitSourceStructure() {
        if (this.leadingComments !== undefined) {
            this.emitComments(this.leadingComments);
        }
        else {
            this.emitUsageComments();
        }
        this.emitImports();
        this.emitTypes();
    }
}
