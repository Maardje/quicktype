import { anyTypeIssueAnnotation, nullTypeIssueAnnotation } from "../Annotation";
import { ConvenienceRenderer } from "../ConvenienceRenderer";
import { funPrefixNamer } from "../Naming";
import { EnumOption, StringOption, getOptionValues } from "../RendererOptions";
import { maybeAnnotated } from "../Source";
import { allLowerWordStyle, allUpperWordStyle, combineWords, firstUpperWordStyle, isDigit, isLetterOrUnderscore, isNumeric, legalizeCharacters, splitIntoWords } from "../support/Strings";
import { assertNever } from "../support/Support";
import { TargetLanguage } from "../TargetLanguage";
import { ArrayType, MapType } from "../Type";
import { matchType, nullableFromUnion, removeNullFromUnion } from "../TypeUtils";
export var Framework;
(function (Framework) {
    Framework["None"] = "None";
    Framework["Upickle"] = "Upickle";
    Framework["Circe"] = "Circe";
})(Framework || (Framework = {}));
export const scala3Options = {
    framework: new EnumOption("framework", "Serialization framework", [
        ["just-types", Framework.None],
        ["circe", Framework.Circe],
        ["upickle", Framework.Upickle]
    ], undefined),
    packageName: new StringOption("package", "Package", "PACKAGE", "quicktype")
};
// Use backticks for param names with symbols
const invalidSymbols = [
    ":",
    "-",
    "+",
    "!",
    "@",
    "#",
    "$",
    "%",
    "^",
    "&",
    "*",
    "(",
    ")",
    ">",
    "<",
    "/",
    ";",
    "'",
    '"',
    "{",
    "}",
    ":",
    "~",
    "`",
    "."
];
const keywords = [
    "abstract",
    "case",
    "catch",
    "class",
    "def",
    "do",
    "else",
    "enum",
    "extends",
    "export",
    "false",
    "final",
    "finally",
    "for",
    "forSome",
    "if",
    "implicit",
    "import",
    "lazy",
    "match",
    "new",
    "null",
    "object",
    "override",
    "package",
    "private",
    "protected",
    "return",
    "sealed",
    "super",
    "this",
    "then",
    "throw",
    "trait",
    "try",
    "true",
    "type",
    "val",
    "var",
    "while",
    "with",
    "yield",
    "Any",
    "Boolean",
    "Double",
    "Float",
    "Long",
    "Int",
    "Short",
    "System",
    "Byte",
    "String",
    "Array",
    "List",
    "Map",
    "Enum"
];
/**
 * Check if given parameter name should be wrapped in a backtick
 * @param paramName
 */
const shouldAddBacktick = (paramName) => {
    return (keywords.some(s => paramName === s) ||
        invalidSymbols.some(s => paramName.includes(s)) ||
        !isNaN(+parseFloat(paramName)) ||
        !isNaN(parseInt(paramName.charAt(0))));
};
const wrapOption = (s, optional) => {
    if (optional) {
        return "Option[" + s + "]";
    }
    else {
        return s;
    }
};
function isPartCharacter(codePoint) {
    return isLetterOrUnderscore(codePoint) || isNumeric(codePoint);
}
function isStartCharacter(codePoint) {
    return isPartCharacter(codePoint) && !isDigit(codePoint);
}
const legalizeName = legalizeCharacters(isPartCharacter);
function scalaNameStyle(isUpper, original) {
    const words = splitIntoWords(original);
    return combineWords(words, legalizeName, isUpper ? firstUpperWordStyle : allLowerWordStyle, firstUpperWordStyle, isUpper ? allUpperWordStyle : allLowerWordStyle, allUpperWordStyle, "", isStartCharacter);
}
/* function unicodeEscape(codePoint: number): string {
    return "\\u" + intToHex(codePoint, 4);
} */
// const _stringEscape = utf32ConcatMap(escapeNonPrintableMapper(isPrintable, unicodeEscape));
/* function stringEscape(s: string): string {
    // "$this" is a template string in Kotlin so we have to escape $
    return _stringEscape(s).replace(/\$/g, "\\$");
} */
const upperNamingFunction = funPrefixNamer("upper", s => scalaNameStyle(true, s));
const lowerNamingFunction = funPrefixNamer("lower", s => scalaNameStyle(false, s));
export class Scala3Renderer extends ConvenienceRenderer {
    constructor(targetLanguage, renderContext, _scalaOptions) {
        super(targetLanguage, renderContext);
        this._scalaOptions = _scalaOptions;
    }
    forbiddenNamesForGlobalNamespace() {
        return keywords;
    }
    forbiddenForObjectProperties(_, _classNamed) {
        return { names: [], includeGlobalForbidden: true };
    }
    forbiddenForEnumCases(_, _enumName) {
        return { names: [], includeGlobalForbidden: true };
    }
    forbiddenForUnionMembers(_u, _unionName) {
        return { names: [], includeGlobalForbidden: false };
    }
    topLevelNameStyle(rawName) {
        return scalaNameStyle(true, rawName);
    }
    makeNamedTypeNamer() {
        return upperNamingFunction;
    }
    namerForObjectProperty() {
        return lowerNamingFunction;
    }
    makeUnionMemberNamer() {
        return funPrefixNamer("upper", s => scalaNameStyle(true, s) + "Value");
    }
    makeEnumCaseNamer() {
        return funPrefixNamer("upper", s => s.replace(" ", "")); // TODO - add backticks where appropriate
    }
    emitDescriptionBlock(lines) {
        this.emitCommentLines(lines, { lineStart: " * ", beforeComment: "/**", afterComment: " */" });
    }
    emitBlock(line, f, delimiter = "curly") {
        const [open, close] = delimiter === "curly"
            ? ["{", "}"]
            : delimiter === "paren"
                ? ["(", ")"]
                : delimiter === "none"
                    ? ["", ""]
                    : ["{", "})"];
        this.emitLine(line, " ", open);
        this.indent(f);
        this.emitLine(close);
    }
    anySourceType(optional) {
        return [wrapOption("Any", optional)];
    }
    // (asarazan): I've broken out the following two functions
    // because some renderers, such as kotlinx, can cope with `any`, while some get mad.
    arrayType(arrayType, withIssues = false) {
        return ["Seq[", this.scalaType(arrayType.items, withIssues), "]"];
    }
    mapType(mapType, withIssues = false) {
        return ["Map[String, ", this.scalaType(mapType.values, withIssues), "]"];
    }
    scalaType(t, withIssues = false, noOptional = false) {
        return matchType(t, _anyType => {
            return maybeAnnotated(withIssues, anyTypeIssueAnnotation, this.anySourceType(!noOptional));
        }, _nullType => {
            // return "None.type"
            return maybeAnnotated(withIssues, nullTypeIssueAnnotation, this.anySourceType(!noOptional));
        }, _boolType => "Boolean", _integerType => "Long", _doubleType => "Double", _stringType => "String", arrayType => this.arrayType(arrayType, withIssues), classType => this.nameForNamedType(classType), mapType => this.mapType(mapType, withIssues), enumType => this.nameForNamedType(enumType), unionType => {
            const nullable = nullableFromUnion(unionType);
            if (nullable !== null) {
                if (noOptional) {
                    return [this.scalaType(nullable, withIssues)];
                }
                else {
                    return ["Option[", this.scalaType(nullable, withIssues), "]"];
                }
            }
            return this.nameForNamedType(unionType);
        });
    }
    emitUsageHeader() {
        // To be overridden
    }
    emitHeader() {
        if (this.leadingComments !== undefined) {
            this.emitComments(this.leadingComments);
        }
        else {
            this.emitUsageHeader();
        }
        this.ensureBlankLine();
        this.emitLine("package ", this._scalaOptions.packageName);
        this.ensureBlankLine();
    }
    emitTopLevelArray(t, name) {
        const elementType = this.scalaType(t.items);
        this.emitLine(["type ", name, " = List[", elementType, "]"]);
    }
    emitTopLevelMap(t, name) {
        const elementType = this.scalaType(t.values);
        this.emitLine(["type ", name, " = Map[String, ", elementType, "]"]);
    }
    emitEmptyClassDefinition(c, className) {
        this.emitDescription(this.descriptionForType(c));
        this.emitLine("case class ", className, "()");
    }
    emitClassDefinition(c, className) {
        if (c.getProperties().size === 0) {
            this.emitEmptyClassDefinition(c, className);
            return;
        }
        const scalaType = (p) => {
            if (p.isOptional) {
                return ["Option[", this.scalaType(p.type, true, true), "]"];
            }
            else {
                return this.scalaType(p.type, true);
            }
        };
        this.emitDescription(this.descriptionForType(c));
        this.emitLine("case class ", className, " (");
        this.indent(() => {
            let count = c.getProperties().size;
            let first = true;
            this.forEachClassProperty(c, "none", (_, jsonName, p) => {
                const nullable = p.type.kind === "union" && nullableFromUnion(p.type) !== null;
                const nullableOrOptional = p.isOptional || p.type.kind === "null" || nullable;
                const last = --count === 0;
                const meta = [];
                const description = this.descriptionForClassProperty(c, jsonName);
                if (description !== undefined) {
                    meta.push(() => this.emitDescription(description));
                }
                if (meta.length > 0 && !first) {
                    this.ensureBlankLine();
                }
                for (const emit of meta) {
                    emit();
                }
                const nameNeedsBackticks = jsonName.endsWith("_") || shouldAddBacktick(jsonName);
                const nameWithBackticks = nameNeedsBackticks ? "`" + jsonName + "`" : jsonName;
                this.emitLine("val ", nameWithBackticks, " : ", scalaType(p), p.isOptional ? " = None" : nullableOrOptional ? " = None" : "", last ? "" : ",");
                if (meta.length > 0 && !last) {
                    this.ensureBlankLine();
                }
                first = false;
            });
        });
        this.emitClassDefinitionMethods();
    }
    emitClassDefinitionMethods() {
        this.emitLine(")");
    }
    emitEnumDefinition(e, enumName) {
        this.emitDescription(this.descriptionForType(e));
        this.emitBlock(["enum ", enumName, " : "], () => {
            let count = e.cases.size;
            if (count > 0) {
                this.emitItem("\t case ");
            }
            this.forEachEnumCase(e, "none", (name, jsonName) => {
                if (!(jsonName == "")) {
                    const backticks = shouldAddBacktick(jsonName) ||
                        jsonName.includes(" ") ||
                        !isNaN(parseInt(jsonName.charAt(0)));
                    if (backticks) {
                        this.emitItem("`");
                    }
                    this.emitItemOnce([name]);
                    if (backticks) {
                        this.emitItem("`");
                    }
                    if (--count > 0)
                        this.emitItem([","]);
                }
                else {
                    --count;
                }
            });
        }, "none");
    }
    emitUnionDefinition(u, unionName) {
        function sortBy(t) {
            const kind = t.kind;
            if (kind === "class")
                return kind;
            return "_" + kind;
        }
        this.emitDescription(this.descriptionForType(u));
        const [maybeNull, nonNulls] = removeNullFromUnion(u, sortBy);
        const theTypes = [];
        this.forEachUnionMember(u, nonNulls, "none", null, (_, t) => {
            theTypes.push(this.scalaType(t));
        });
        if (maybeNull !== null) {
            theTypes.push(this.nameForUnionMember(u, maybeNull));
        }
        this.emitItem(["type ", unionName, " = "]);
        theTypes.forEach((t, i) => {
            this.emitItem(i === 0 ? t : [" | ", t]);
        });
        this.ensureBlankLine();
    }
    emitSourceStructure() {
        this.emitHeader();
        // Top-level arrays, maps
        this.forEachTopLevel("leading", (t, name) => {
            if (t instanceof ArrayType) {
                this.emitTopLevelArray(t, name);
            }
            else if (t instanceof MapType) {
                this.emitTopLevelMap(t, name);
            }
        });
        this.forEachNamedType("leading-and-interposing", (c, n) => this.emitClassDefinition(c, n), (e, n) => this.emitEnumDefinition(e, n), (u, n) => this.emitUnionDefinition(u, n));
    }
}
export class UpickleRenderer extends Scala3Renderer {
    emitClassDefinitionMethods() {
        this.emitLine(") derives ReadWriter ");
    }
    emitHeader() {
        super.emitHeader();
        this.emitLine("import upickle.default.*");
        this.ensureBlankLine();
    }
}
export class CirceRenderer extends Scala3Renderer {
    constructor() {
        super(...arguments);
        this.seenUnionTypes = [];
    }
    circeEncoderForType(t, __ = false, noOptional = false, paramName = "") {
        return matchType(t, _anyType => ["Encoder.encodeJson(", paramName, ")"], _nullType => ["Encoder.encodeNone(", paramName, ")"], _boolType => ["Encoder.encodeBoolean(", paramName, ")"], _integerType => ["Encoder.encodeLong(", paramName, ")"], _doubleType => ["Encoder.encodeDouble(", paramName, ")"], _stringType => ["Encoder.encodeString(", paramName, ")"], arrayType => ["Encoder.encodeSeq[", this.scalaType(arrayType.items), "].apply(", paramName, ")"], classType => ["Encoder.AsObject[", this.scalaType(classType), "].apply(", paramName, ")"], mapType => ["Encoder.encodeMap[String,", this.scalaType(mapType.values), "].apply(", paramName, ")"], _ => ["Encoder.encodeString(", paramName, ")"], unionType => {
            const nullable = nullableFromUnion(unionType);
            if (nullable !== null) {
                if (noOptional) {
                    return ["Encoder.AsObject[", this.nameForNamedType(nullable), "]"];
                }
                else {
                    return ["Encoder.AsObject[Option[", this.nameForNamedType(nullable), "]]"];
                }
            }
            return ["Encoder.AsObject[", this.nameForNamedType(unionType), "]"];
        });
    }
    emitEmptyClassDefinition(c, className) {
        this.emitDescription(this.descriptionForType(c));
        this.ensureBlankLine();
        this.emitLine("case class ", className, "()  derives Encoder.AsObject, Decoder");
    }
    anySourceType(optional) {
        return [wrapOption("Json", optional)];
    }
    emitClassDefinitionMethods() {
        this.emitLine(") derives Encoder.AsObject, Decoder");
    }
    emitEnumDefinition(e, enumName) {
        this.emitDescription(this.descriptionForType(e));
        this.ensureBlankLine();
        this.emitItem(["type ", enumName, " = "]);
        let count = e.cases.size;
        this.forEachEnumCase(e, "none", (_, jsonName) => {
            // if (!(jsonName == "")) {
            /*                 const backticks =
                                shouldAddBacktick(jsonName) ||
                                jsonName.includes(" ") ||
                                !isNaN(parseInt(jsonName.charAt(0)))
                            if (backticks) {this.emitItem("`")} else  */
            this.emitItem(['"', jsonName, '"']);
            //                if (backticks) {this.emitItem("`")}
            if (--count > 0)
                this.emitItem([" | "]);
            // } else {
            // --count
            // }
        });
        this.ensureBlankLine();
    }
    emitHeader() {
        super.emitHeader();
        this.emitLine("import scala.util.Try");
        this.emitLine("import io.circe.syntax._");
        this.emitLine("import io.circe._");
        this.emitLine("import cats.syntax.functor._");
        this.ensureBlankLine();
        this.emitLine("// For serialising string unions");
        this.emitLine("given [A <: Singleton](using A <:< String): Decoder[A] = Decoder.decodeString.emapTry(x => Try(x.asInstanceOf[A])) ");
        this.emitLine("given [A <: Singleton](using ev: A <:< String): Encoder[A] = Encoder.encodeString.contramap(ev) ");
        this.ensureBlankLine();
        this.emitLine("// If a union has a null in, then we'll need this too... ");
        this.emitLine("type NullValue = None.type");
    }
    emitTopLevelArray(t, name) {
        super.emitTopLevelArray(t, name);
        const elementType = this.scalaType(t.items);
        this.emitLine([
            "given (using ev : ",
            elementType,
            "): Encoder[Map[String,",
            elementType,
            "]] = Encoder.encodeMap[String, ",
            elementType,
            "]"
        ]);
    }
    emitTopLevelMap(t, name) {
        super.emitTopLevelMap(t, name);
        const elementType = this.scalaType(t.values);
        this.ensureBlankLine();
        this.emitLine([
            "given (using ev : ",
            elementType,
            "): Encoder[Map[String, ",
            elementType,
            "]] = Encoder.encodeMap[String, ",
            elementType,
            "]"
        ]);
    }
    emitUnionDefinition(u, unionName) {
        function sortBy(t) {
            const kind = t.kind;
            if (kind === "class")
                return kind;
            return "_" + kind;
        }
        this.emitDescription(this.descriptionForType(u));
        const [maybeNull, nonNulls] = removeNullFromUnion(u, sortBy);
        const theTypes = [];
        this.forEachUnionMember(u, nonNulls, "none", null, (_, t) => {
            theTypes.push(this.scalaType(t));
        });
        if (maybeNull !== null) {
            theTypes.push(this.nameForUnionMember(u, maybeNull));
        }
        this.emitItem(["type ", unionName, " = "]);
        theTypes.forEach((t, i) => {
            this.emitItem(i === 0 ? t : [" | ", t]);
        });
        const thisUnionType = theTypes.map(x => this.sourcelikeToString(x)).join(" | ");
        this.ensureBlankLine();
        if (!this.seenUnionTypes.some(y => y === thisUnionType)) {
            this.seenUnionTypes.push(thisUnionType);
            const sourceLikeTypes = [];
            this.forEachUnionMember(u, nonNulls, "none", null, (_, t) => {
                sourceLikeTypes.push([this.scalaType(t), t]);
            });
            if (maybeNull !== null) {
                sourceLikeTypes.push([this.nameForUnionMember(u, maybeNull), maybeNull]);
            }
            this.emitLine(["given Decoder[", unionName, "] = {"]);
            this.indent(() => {
                this.emitLine(["List[Decoder[", unionName, "]]("]);
                this.indent(() => {
                    sourceLikeTypes.forEach(t => {
                        this.emitLine(["Decoder[", t[0], "].widen,"]);
                    });
                });
                this.emitLine(").reduceLeft(_ or _)");
            });
            this.emitLine(["}"]);
            this.ensureBlankLine();
            this.emitLine(["given Encoder[", unionName, "] = Encoder.instance {"]);
            this.indent(() => {
                sourceLikeTypes.forEach((t, i) => {
                    const paramTemp = `enc${i.toString()}`;
                    this.emitLine([
                        "case ",
                        paramTemp,
                        " : ",
                        t[0],
                        " => ",
                        this.circeEncoderForType(t[1], false, false, paramTemp)
                    ]);
                });
            });
            this.emitLine("}");
        }
    }
}
export class Scala3TargetLanguage extends TargetLanguage {
    constructor() {
        super("Scala3", ["scala3"], "scala");
    }
    getOptions() {
        return [scala3Options.framework, scala3Options.packageName];
    }
    get supportsOptionalClassProperties() {
        return true;
    }
    get supportsUnionsWithBothNumberTypes() {
        return true;
    }
    makeRenderer(renderContext, untypedOptionValues) {
        const options = getOptionValues(scala3Options, untypedOptionValues);
        switch (options.framework) {
            case Framework.None:
                return new Scala3Renderer(this, renderContext, options);
            case Framework.Upickle:
                return new UpickleRenderer(this, renderContext, options);
            case Framework.Circe:
                return new CirceRenderer(this, renderContext, options);
            default:
                return assertNever(options.framework);
        }
    }
}
