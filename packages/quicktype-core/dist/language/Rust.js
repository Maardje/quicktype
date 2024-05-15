/* eslint-disable @typescript-eslint/naming-convention */
import { mapFirst } from "collection-utils";
import { anyTypeIssueAnnotation, nullTypeIssueAnnotation } from "../Annotation";
import { ConvenienceRenderer } from "../ConvenienceRenderer";
import { funPrefixNamer } from "../Naming";
import { BooleanOption, EnumOption, getOptionValues } from "../RendererOptions";
import { maybeAnnotated } from "../Source";
import { allLowerWordStyle, combineWords, escapeNonPrintableMapper, firstUpperWordStyle, intToHex, isAscii, isLetterOrUnderscore, isLetterOrUnderscoreOrDigit, isPrintable, legalizeCharacters, splitIntoWords, utf32ConcatMap } from "../support/Strings";
import { defined } from "../support/Support";
import { TargetLanguage } from "../TargetLanguage";
import { UnionType } from "../Type";
import { matchType, nullableFromUnion, removeNullFromUnion } from "../TypeUtils";
export var Density;
(function (Density) {
    Density["Normal"] = "Normal";
    Density["Dense"] = "Dense";
})(Density || (Density = {}));
export var Visibility;
(function (Visibility) {
    Visibility["Private"] = "Private";
    Visibility["Crate"] = "Crate";
    Visibility["Public"] = "Public";
})(Visibility || (Visibility = {}));
export const rustOptions = {
    density: new EnumOption("density", "Density", [
        ["normal", Density.Normal],
        ["dense", Density.Dense]
    ]),
    visibility: new EnumOption("visibility", "Field visibility", [
        ["private", Visibility.Private],
        ["crate", Visibility.Crate],
        ["public", Visibility.Public]
    ]),
    deriveDebug: new BooleanOption("derive-debug", "Derive Debug impl", false),
    deriveClone: new BooleanOption("derive-clone", "Derive Clone impl", false),
    derivePartialEq: new BooleanOption("derive-partial-eq", "Derive PartialEq impl", false),
    skipSerializingNone: new BooleanOption("skip-serializing-none", "Skip serializing empty Option fields", false),
    edition2018: new BooleanOption("edition-2018", "Edition 2018", true),
    leadingComments: new BooleanOption("leading-comments", "Leading Comments", true)
};
const namingStyles = {
    snake_case: {
        regex: /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/,
        toParts: (name) => name.split("_"),
        fromParts: (parts) => parts.map(p => p.toLowerCase()).join("_")
    },
    SCREAMING_SNAKE_CASE: {
        regex: /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/,
        toParts: (name) => name.split("_"),
        fromParts: (parts) => parts.map(p => p.toUpperCase()).join("_")
    },
    camelCase: {
        regex: /^[a-z]+([A-Z0-9][a-z]*)*$/,
        toParts: (name) => namingStyles.snake_case.toParts(name.replace(/(.)([A-Z])/g, "$1_$2")),
        fromParts: (parts) => parts
            .map((p, i) => i === 0 ? p.toLowerCase() : p.substring(0, 1).toUpperCase() + p.substring(1).toLowerCase())
            .join("")
    },
    PascalCase: {
        regex: /^[A-Z][a-z]*([A-Z0-9][a-z]*)*$/,
        toParts: (name) => namingStyles.snake_case.toParts(name.replace(/(.)([A-Z])/g, "$1_$2")),
        fromParts: (parts) => parts.map(p => p.substring(0, 1).toUpperCase() + p.substring(1).toLowerCase()).join("")
    },
    "kebab-case": {
        regex: /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/,
        toParts: (name) => name.split("-"),
        fromParts: (parts) => parts.map(p => p.toLowerCase()).join("-")
    },
    "SCREAMING-KEBAB-CASE": {
        regex: /^[A-Z][A-Z0-9]*(-[A-Z0-9]+)*$/,
        toParts: (name) => name.split("-"),
        fromParts: (parts) => parts.map(p => p.toUpperCase()).join("-")
    },
    lowercase: {
        regex: /^[a-z][a-z0-9]*$/,
        toParts: (name) => [name],
        fromParts: (parts) => parts.map(p => p.toLowerCase()).join("")
    },
    UPPERCASE: {
        regex: /^[A-Z][A-Z0-9]*$/,
        toParts: (name) => [name],
        fromParts: (parts) => parts.map(p => p.toUpperCase()).join("")
    }
};
export class RustTargetLanguage extends TargetLanguage {
    makeRenderer(renderContext, untypedOptionValues) {
        return new RustRenderer(this, renderContext, getOptionValues(rustOptions, untypedOptionValues));
    }
    constructor() {
        super("Rust", ["rust", "rs", "rustlang"], "rs");
    }
    getOptions() {
        return [
            rustOptions.density,
            rustOptions.visibility,
            rustOptions.deriveDebug,
            rustOptions.deriveClone,
            rustOptions.derivePartialEq,
            rustOptions.edition2018,
            rustOptions.leadingComments,
            rustOptions.skipSerializingNone
        ];
    }
}
const keywords = [
    "Serialize",
    "Deserialize",
    // Special reserved identifiers used internally for elided lifetimes,
    // unnamed method parameters, crate root module, error recovery etc.
    "{{root}}",
    "$crate",
    // Keywords used in the language.
    "as",
    "async",
    "box",
    "break",
    "const",
    "continue",
    "crate",
    "else",
    "enum",
    "extern",
    "false",
    "fn",
    "for",
    "if",
    "impl",
    "in",
    "let",
    "loop",
    "match",
    "mod",
    "move",
    "mut",
    "pub",
    "ref",
    "return",
    "self",
    "Self",
    "static",
    "struct",
    "super",
    "trait",
    "true",
    "type",
    "unsafe",
    "use",
    "where",
    "while",
    // Keywords reserved for future use.
    "abstract",
    "alignof",
    "become",
    "do",
    "final",
    "macro",
    "offsetof",
    "override",
    "priv",
    "proc",
    "pure",
    "sizeof",
    "typeof",
    "unsized",
    "virtual",
    "yield",
    // Weak keywords, have special meaning only in specific contexts.
    "catch",
    "default",
    "dyn",
    "'static",
    "union",
    // Conflict between `std::Option` and potentially generated Option
    "option"
];
const isAsciiLetterOrUnderscoreOrDigit = (codePoint) => {
    if (!isAscii(codePoint)) {
        return false;
    }
    return isLetterOrUnderscoreOrDigit(codePoint);
};
const isAsciiLetterOrUnderscore = (codePoint) => {
    if (!isAscii(codePoint)) {
        return false;
    }
    return isLetterOrUnderscore(codePoint);
};
const legalizeName = legalizeCharacters(isAsciiLetterOrUnderscoreOrDigit);
function rustStyle(original, isSnakeCase) {
    const words = splitIntoWords(original);
    const wordStyle = isSnakeCase ? allLowerWordStyle : firstUpperWordStyle;
    const combined = combineWords(words, legalizeName, wordStyle, wordStyle, wordStyle, wordStyle, isSnakeCase ? "_" : "", isAsciiLetterOrUnderscore);
    return combined === "_" ? "_underscore" : combined;
}
const snakeNamingFunction = funPrefixNamer("default", (original) => rustStyle(original, true));
const camelNamingFunction = funPrefixNamer("camel", (original) => rustStyle(original, false));
const standardUnicodeRustEscape = (codePoint) => {
    if (codePoint <= 0xffff) {
        return "\\u{" + intToHex(codePoint, 4) + "}";
    }
    else {
        return "\\u{" + intToHex(codePoint, 6) + "}";
    }
};
const rustStringEscape = utf32ConcatMap(escapeNonPrintableMapper(isPrintable, standardUnicodeRustEscape));
export class RustRenderer extends ConvenienceRenderer {
    constructor(targetLanguage, renderContext, _options) {
        super(targetLanguage, renderContext);
        this._options = _options;
    }
    makeNamedTypeNamer() {
        return camelNamingFunction;
    }
    namerForObjectProperty() {
        return snakeNamingFunction;
    }
    makeUnionMemberNamer() {
        return camelNamingFunction;
    }
    makeEnumCaseNamer() {
        return camelNamingFunction;
    }
    forbiddenNamesForGlobalNamespace() {
        return keywords;
    }
    forbiddenForObjectProperties(_c, _className) {
        return { names: [], includeGlobalForbidden: true };
    }
    forbiddenForUnionMembers(_u, _unionName) {
        return { names: [], includeGlobalForbidden: true };
    }
    forbiddenForEnumCases(_e, _enumName) {
        return { names: [], includeGlobalForbidden: true };
    }
    get commentLineStart() {
        return "/// ";
    }
    nullableRustType(t, withIssues) {
        return ["Option<", this.breakCycle(t, withIssues), ">"];
    }
    isImplicitCycleBreaker(t) {
        const kind = t.kind;
        return kind === "array" || kind === "map";
    }
    rustType(t, withIssues = false) {
        return matchType(t, _anyType => maybeAnnotated(withIssues, anyTypeIssueAnnotation, "Option<serde_json::Value>"), _nullType => maybeAnnotated(withIssues, nullTypeIssueAnnotation, "Option<serde_json::Value>"), _boolType => "bool", _integerType => "i64", _doubleType => "f64", _stringType => "String", arrayType => ["Vec<", this.rustType(arrayType.items, withIssues), ">"], classType => this.nameForNamedType(classType), mapType => ["HashMap<String, ", this.rustType(mapType.values, withIssues), ">"], enumType => this.nameForNamedType(enumType), unionType => {
            const nullable = nullableFromUnion(unionType);
            if (nullable !== null)
                return this.nullableRustType(nullable, withIssues);
            const [hasNull] = removeNullFromUnion(unionType);
            const isCycleBreaker = this.isCycleBreakerType(unionType);
            const name = isCycleBreaker
                ? ["Box<", this.nameForNamedType(unionType), ">"]
                : this.nameForNamedType(unionType);
            return hasNull !== null ? ["Option<", name, ">"] : name;
        });
    }
    breakCycle(t, withIssues) {
        const rustType = this.rustType(t, withIssues);
        const isCycleBreaker = this.isCycleBreakerType(t);
        return isCycleBreaker ? ["Box<", rustType, ">"] : rustType;
    }
    emitRenameAttribute(propName, jsonName, defaultNamingStyle, preferedNamingStyle) {
        const escapedName = rustStringEscape(jsonName);
        const name = namingStyles[defaultNamingStyle].fromParts(this.sourcelikeToString(propName).split(" "));
        const styledName = nameToNamingStyle(name, preferedNamingStyle);
        const namesDiffer = escapedName !== styledName;
        if (namesDiffer) {
            this.emitLine('#[serde(rename = "', escapedName, '")]');
        }
    }
    emitSkipSerializeNone(t) {
        if (t instanceof UnionType) {
            const nullable = nullableFromUnion(t);
            if (nullable !== null)
                this.emitLine('#[serde(skip_serializing_if = "Option::is_none")]');
        }
    }
    get visibility() {
        if (this._options.visibility === Visibility.Crate) {
            return "pub(crate) ";
        }
        else if (this._options.visibility === Visibility.Public) {
            return "pub ";
        }
        return "";
    }
    emitStructDefinition(c, className) {
        this.emitDescription(this.descriptionForType(c));
        this.emitLine("#[derive(", this._options.deriveDebug ? "Debug, " : "", this._options.deriveClone ? "Clone, " : "", this._options.derivePartialEq ? "PartialEq, " : "", "Serialize, Deserialize)]");
        // List the possible naming styles for every class property
        const propertiesNamingStyles = {};
        this.forEachClassProperty(c, "none", (_name, jsonName, _prop) => {
            propertiesNamingStyles[jsonName] = listMatchingNamingStyles(jsonName);
        });
        // Set the default naming style on the struct
        const defaultStyle = "snake_case";
        const preferedNamingStyle = getPreferedNamingStyle(Object.values(propertiesNamingStyles).flat(), defaultStyle);
        if (preferedNamingStyle !== defaultStyle) {
            this.emitLine(`#[serde(rename_all = "${preferedNamingStyle}")]`);
        }
        const blankLines = this._options.density === Density.Dense ? "none" : "interposing";
        const structBody = () => this.forEachClassProperty(c, blankLines, (name, jsonName, prop) => {
            this.emitDescription(this.descriptionForClassProperty(c, jsonName));
            this.emitRenameAttribute(name, jsonName, defaultStyle, preferedNamingStyle);
            if (this._options.skipSerializingNone) {
                this.emitSkipSerializeNone(prop.type);
            }
            this.emitLine(this.visibility, name, ": ", this.breakCycle(prop.type, true), ",");
        });
        this.emitBlock(["pub struct ", className], structBody);
    }
    emitBlock(line, f) {
        this.emitLine(line, " {");
        this.indent(f);
        this.emitLine("}");
    }
    emitUnion(u, unionName) {
        const isMaybeWithSingleType = nullableFromUnion(u);
        if (isMaybeWithSingleType !== null) {
            return;
        }
        this.emitDescription(this.descriptionForType(u));
        this.emitLine("#[derive(", this._options.deriveDebug ? "Debug, " : "", this._options.deriveClone ? "Clone, " : "", this._options.derivePartialEq ? "PartialEq, " : "", "Serialize, Deserialize)]");
        this.emitLine("#[serde(untagged)]");
        const [, nonNulls] = removeNullFromUnion(u);
        const blankLines = this._options.density === Density.Dense ? "none" : "interposing";
        this.emitBlock(["pub enum ", unionName], () => this.forEachUnionMember(u, nonNulls, blankLines, null, (fieldName, t) => {
            const rustType = this.breakCycle(t, true);
            this.emitLine([fieldName, "(", rustType, "),"]);
        }));
    }
    emitEnumDefinition(e, enumName) {
        this.emitDescription(this.descriptionForType(e));
        this.emitLine("#[derive(", this._options.deriveDebug ? "Debug, " : "", this._options.deriveClone ? "Clone, " : "", this._options.derivePartialEq ? "PartialEq, " : "", "Serialize, Deserialize)]");
        // List the possible naming styles for every enum case
        const enumCasesNamingStyles = {};
        this.forEachEnumCase(e, "none", (_name, jsonName) => {
            enumCasesNamingStyles[jsonName] = listMatchingNamingStyles(jsonName);
        });
        // Set the default naming style on the enum
        const defaultStyle = "PascalCase";
        const preferedNamingStyle = getPreferedNamingStyle(Object.values(enumCasesNamingStyles).flat(), defaultStyle);
        if (preferedNamingStyle !== defaultStyle) {
            this.emitLine(`#[serde(rename_all = "${preferedNamingStyle}")]`);
        }
        const blankLines = this._options.density === Density.Dense ? "none" : "interposing";
        this.emitBlock(["pub enum ", enumName], () => this.forEachEnumCase(e, blankLines, (name, jsonName) => {
            this.emitRenameAttribute(name, jsonName, defaultStyle, preferedNamingStyle);
            this.emitLine([name, ","]);
        }));
    }
    emitTopLevelAlias(t, name) {
        this.emitLine("pub type ", name, " = ", this.rustType(t), ";");
    }
    emitLeadingComments() {
        if (this.leadingComments !== undefined) {
            this.emitComments(this.leadingComments);
            return;
        }
        const topLevelName = defined(mapFirst(this.topLevels)).getCombinedName();
        this.emitMultiline(`// Example code that deserializes and serializes the model.
// extern crate serde;
// #[macro_use]
// extern crate serde_derive;
// extern crate serde_json;
//
// use generated_module::${topLevelName};
//
// fn main() {
//     let json = r#"{"answer": 42}"#;
//     let model: ${topLevelName} = serde_json::from_str(&json).unwrap();
// }`);
    }
    emitSourceStructure() {
        if (this._options.leadingComments) {
            this.emitLeadingComments();
        }
        this.ensureBlankLine();
        if (this._options.edition2018) {
            this.emitLine("use serde::{Serialize, Deserialize};");
        }
        else {
            this.emitLine("extern crate serde_derive;");
        }
        if (this.haveMaps) {
            this.emitLine("use std::collections::HashMap;");
        }
        this.forEachTopLevel("leading", (t, name) => this.emitTopLevelAlias(t, name), t => this.namedTypeToNameForTopLevel(t) === undefined);
        this.forEachNamedType("leading-and-interposing", (c, name) => this.emitStructDefinition(c, name), (e, name) => this.emitEnumDefinition(e, name), (u, name) => this.emitUnion(u, name));
    }
}
function getPreferedNamingStyle(namingStyleOccurences, defaultStyle) {
    const occurrences = Object.fromEntries(Object.keys(namingStyles).map(key => [key, 0]));
    namingStyleOccurences.forEach(style => ++occurrences[style]);
    const max = Math.max(...Object.values(occurrences));
    const preferedStyles = Object.entries(occurrences)
        .filter(([_style, num]) => num === max)
        .map(([style, _num]) => style);
    if (preferedStyles.includes(defaultStyle)) {
        return defaultStyle;
    }
    return preferedStyles[0];
}
function listMatchingNamingStyles(name) {
    return Object.entries(namingStyles)
        .filter(([_, { regex }]) => regex.test(name))
        .map(([namingStyle, _]) => namingStyle);
}
function nameToNamingStyle(name, style) {
    if (namingStyles[style].regex.test(name)) {
        return name;
    }
    const fromStyle = listMatchingNamingStyles(name)[0];
    if (fromStyle === undefined) {
        return name;
    }
    return namingStyles[style].fromParts(namingStyles[fromStyle].toParts(name));
}
