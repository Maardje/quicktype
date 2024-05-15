import { anyTypeIssueAnnotation, nullTypeIssueAnnotation } from "../Annotation";
import { ConvenienceRenderer } from "../ConvenienceRenderer";
import { funPrefixNamer } from "../Naming";
import { maybeAnnotated } from "../Source";
import { allLowerWordStyle, combineWords, escapeNonPrintableMapper, firstUpperWordStyle, intToHex, isAscii, isLetterOrUnderscore, isLetterOrUnderscoreOrDigit, isPrintable, legalizeCharacters, splitIntoWords, utf32ConcatMap } from "../support/Strings";
import { TargetLanguage } from "../TargetLanguage";
import { matchType, nullableFromUnion, removeNullFromUnion } from "../TypeUtils";
export class CrystalTargetLanguage extends TargetLanguage {
    makeRenderer(renderContext) {
        return new CrystalRenderer(this, renderContext);
    }
    constructor() {
        super("Crystal", ["crystal", "cr", "crystallang"], "cr");
    }
    get defaultIndentation() {
        return "  ";
    }
    getOptions() {
        return [];
    }
}
const keywords = [
    "Any",
    "Array",
    "Atomic",
    "Bool",
    "Channel",
    "Char",
    "Class",
    "Enum",
    "Enumerable",
    "Event",
    "Extern",
    "Exception",
    "File",
    "Float",
    "Float32",
    "Float64",
    "GC",
    "GZip",
    "Hash",
    "HTML",
    "HTTP",
    "Int",
    "Int128",
    "Int16",
    "Int32",
    "Int64",
    "Int8",
    "Iterable",
    "Link",
    "Logger",
    "Math",
    "Mutex",
    "Nil",
    "Number",
    "JSON",
    "IO",
    "Object",
    "Pointer",
    "Proc",
    "Process",
    "Range",
    "Random",
    "Regex",
    "Reference",
    "Set",
    "Signal",
    "Slice",
    "Spec",
    "StaticArray",
    "String",
    "Struct",
    "Symbol",
    "System",
    "TCPServer",
    "TCPSocket",
    "Socket",
    "Tempfile",
    "Termios",
    "Time",
    "Tuple",
    "ThreadLocal",
    "UDPSocket",
    "UInt128",
    "UInt16",
    "UInt32",
    "UInt64",
    "UInt8",
    "Union",
    "UNIXServer",
    "UNIXSocket",
    "UUID",
    "URI",
    "VaList",
    "Value",
    "Void",
    "WeakRef",
    "XML",
    "YAML",
    "Zip",
    "Zlib",
    "abstract",
    "alias",
    "as",
    "as?",
    "asm",
    "begin",
    "break",
    "case",
    "class",
    "def",
    "do",
    "else",
    "elsif",
    "end",
    "ensure",
    "enum",
    "extend",
    "false",
    "for",
    "fun",
    "if",
    "in",
    "include",
    "instance_sizeof",
    "is_a?",
    "lib",
    "macro",
    "module",
    "next",
    "nil",
    "nil?",
    "of",
    "out",
    "pointerof",
    "private",
    "protected",
    "require",
    "rescue",
    "return",
    "select",
    "self",
    "sizeof",
    "struct",
    "super",
    "then",
    "true",
    "type",
    "typeof",
    "uninitialized",
    "union",
    "unless",
    "until",
    "when",
    "while",
    "with",
    "yield"
];
function isAsciiLetterOrUnderscoreOrDigit(codePoint) {
    if (!isAscii(codePoint)) {
        return false;
    }
    return isLetterOrUnderscoreOrDigit(codePoint);
}
function isAsciiLetterOrUnderscore(codePoint) {
    if (!isAscii(codePoint)) {
        return false;
    }
    return isLetterOrUnderscore(codePoint);
}
const legalizeName = legalizeCharacters(isAsciiLetterOrUnderscoreOrDigit);
function crystalStyle(original, isSnakeCase) {
    const words = splitIntoWords(original);
    const wordStyle = isSnakeCase ? allLowerWordStyle : firstUpperWordStyle;
    const combined = combineWords(words, legalizeName, wordStyle, wordStyle, wordStyle, wordStyle, isSnakeCase ? "_" : "", isAsciiLetterOrUnderscore);
    return combined === "_" ? "_underscore" : combined;
}
const snakeNamingFunction = funPrefixNamer("default", (original) => crystalStyle(original, true));
const camelNamingFunction = funPrefixNamer("camel", (original) => crystalStyle(original, false));
function standardUnicodeCrystalEscape(codePoint) {
    if (codePoint <= 0xffff) {
        return "\\u{" + intToHex(codePoint, 4) + "}";
    }
    else {
        return "\\u{" + intToHex(codePoint, 6) + "}";
    }
}
const crystalStringEscape = utf32ConcatMap(escapeNonPrintableMapper(isPrintable, standardUnicodeCrystalEscape));
export class CrystalRenderer extends ConvenienceRenderer {
    constructor(targetLanguage, renderContext) {
        super(targetLanguage, renderContext);
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
        return "# ";
    }
    nullableCrystalType(t, withIssues) {
        return [this.crystalType(t, withIssues), "?"];
    }
    isImplicitCycleBreaker(t) {
        const kind = t.kind;
        return kind === "array" || kind === "map";
    }
    crystalType(t, withIssues = false) {
        return matchType(t, _anyType => maybeAnnotated(withIssues, anyTypeIssueAnnotation, "JSON::Any?"), _nullType => maybeAnnotated(withIssues, nullTypeIssueAnnotation, "Nil"), _boolType => "Bool", _integerType => "Int32", _doubleType => "Float64", _stringType => "String", arrayType => ["Array(", this.crystalType(arrayType.items, withIssues), ")"], classType => this.nameForNamedType(classType), mapType => ["Hash(String, ", this.crystalType(mapType.values, withIssues), ")"], _enumType => "String", unionType => {
            const nullable = nullableFromUnion(unionType);
            if (nullable !== null)
                return this.nullableCrystalType(nullable, withIssues);
            const [hasNull] = removeNullFromUnion(unionType);
            const name = this.nameForNamedType(unionType);
            return hasNull !== null ? [name, "?"] : name;
        });
    }
    breakCycle(t, withIssues) {
        return this.crystalType(t, withIssues);
    }
    emitRenameAttribute(propName, jsonName) {
        const escapedName = crystalStringEscape(jsonName);
        const namesDiffer = this.sourcelikeToString(propName) !== escapedName;
        if (namesDiffer) {
            this.emitLine('@[JSON::Field(key: "', escapedName, '")]');
        }
    }
    emitStructDefinition(c, className) {
        this.emitDescription(this.descriptionForType(c));
        const structBody = () => this.forEachClassProperty(c, "none", (name, jsonName, prop) => {
            this.ensureBlankLine();
            this.emitDescription(this.descriptionForClassProperty(c, jsonName));
            this.emitRenameAttribute(name, jsonName);
            this.emitLine("property ", name, " : ", this.crystalType(prop.type, true));
        });
        this.emitBlock(["class ", className], structBody);
    }
    emitBlock(line, f) {
        this.emitLine(line);
        this.indent(() => {
            this.emitLine("include JSON::Serializable");
        });
        this.ensureBlankLine();
        this.indent(f);
        this.emitLine("end");
    }
    emitEnum(line, f) {
        this.emitLine(line);
        this.indent(f);
        this.emitLine("end");
    }
    emitUnion(u, unionName) {
        const isMaybeWithSingleType = nullableFromUnion(u);
        if (isMaybeWithSingleType !== null) {
            return;
        }
        this.emitDescription(this.descriptionForType(u));
        const [, nonNulls] = removeNullFromUnion(u);
        let types = [];
        this.forEachUnionMember(u, nonNulls, "none", null, (_name, t) => {
            const crystalType = this.breakCycle(t, true);
            types.push([crystalType]);
        });
        this.emitLine([
            "alias ",
            unionName,
            " = ",
            types.map(r => r.map(sl => this.sourcelikeToString(sl))).join(" | ")
        ]);
    }
    emitTopLevelAlias(t, name) {
        this.emitLine("alias ", name, " = ", this.crystalType(t));
    }
    emitLeadingComments() {
        if (this.leadingComments !== undefined) {
            this.emitComments(this.leadingComments);
            return;
        }
    }
    emitSourceStructure() {
        this.emitLeadingComments();
        this.ensureBlankLine();
        this.emitLine('require "json"');
        this.forEachTopLevel("leading", (t, name) => this.emitTopLevelAlias(t, name), t => this.namedTypeToNameForTopLevel(t) === undefined);
        this.forEachObject("leading-and-interposing", (c, name) => this.emitStructDefinition(c, name));
        this.forEachUnion("leading-and-interposing", (u, name) => this.emitUnion(u, name));
    }
}
