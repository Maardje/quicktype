import { arrayIntercalate, iterableFirst, iterableSome, mapSortBy, mapUpdateInto, setUnionInto } from "collection-utils";
import unicode from "unicode-properties";
import { ConvenienceRenderer, topLevelNameOrder } from "../ConvenienceRenderer";
import { DependencyName, funPrefixNamer } from "../Naming";
import { BooleanOption, EnumOption, getOptionValues } from "../RendererOptions";
import { modifySource, multiWord, parenIfNeeded, singleWord } from "../Source";
import { allLowerWordStyle, allUpperWordStyle, combineWords, firstUpperWordStyle, originalWord, splitIntoWords, stringEscape, utf16LegalizeCharacters } from "../support/Strings";
import { assertNever, defined, panic } from "../support/Support";
import { TargetLanguage } from "../TargetLanguage";
import { ChoiceTransformer, DecodingChoiceTransformer, DecodingTransformer, EncodingTransformer, ParseStringTransformer, StringifyTransformer, UnionInstantiationTransformer, UnionMemberMatchTransformer, followTargetType, transformationForType } from "../Transformers";
import { ClassType, EnumType, UnionType } from "../Type";
import { matchType, nullableFromUnion, removeNullFromUnion } from "../TypeUtils";
const forbiddenTypeNames = [
    "Any",
    "True",
    "False",
    "None",
    "Enum",
    "List",
    "Dict",
    "Optional",
    "Union",
    "Iterable",
    "Type",
    "TypeVar",
    "T",
    "EnumT"
];
const forbiddenPropertyNames = [
    "and",
    "as",
    "assert",
    "async",
    "await",
    "bool",
    "break",
    "class",
    "continue",
    "datetime",
    "def",
    "del",
    "dict",
    "elif",
    "else",
    "except",
    "finally",
    "float",
    "for",
    "from",
    "global",
    "if",
    "import",
    "in",
    "int",
    "is",
    "lambda",
    "nonlocal",
    "not",
    "or",
    "pass",
    "print",
    "raise",
    "return",
    "self",
    "str",
    "try",
    "while",
    "with",
    "yield"
];
export const pythonOptions = {
    features: new EnumOption("python-version", "Python version", [
        ["3.5", { typeHints: false, dataClasses: false }],
        ["3.6", { typeHints: true, dataClasses: false }],
        ["3.7", { typeHints: true, dataClasses: true }]
    ], "3.6"),
    justTypes: new BooleanOption("just-types", "Classes only", false),
    nicePropertyNames: new BooleanOption("nice-property-names", "Transform property names to be Pythonic", true)
};
export class PythonTargetLanguage extends TargetLanguage {
    getOptions() {
        return [pythonOptions.features, pythonOptions.justTypes, pythonOptions.nicePropertyNames];
    }
    get stringTypeMapping() {
        const mapping = new Map();
        const dateTimeType = "date-time";
        mapping.set("date", dateTimeType);
        mapping.set("time", dateTimeType);
        mapping.set("date-time", dateTimeType);
        mapping.set("uuid", "uuid");
        mapping.set("integer-string", "integer-string");
        mapping.set("bool-string", "bool-string");
        return mapping;
    }
    get supportsUnionsWithBothNumberTypes() {
        return true;
    }
    get supportsOptionalClassProperties() {
        return false;
    }
    needsTransformerForType(t) {
        if (t instanceof UnionType) {
            return iterableSome(t.members, m => this.needsTransformerForType(m));
        }
        return t.kind === "integer-string" || t.kind === "bool-string";
    }
    makeRenderer(renderContext, untypedOptionValues) {
        const options = getOptionValues(pythonOptions, untypedOptionValues);
        if (options.justTypes) {
            return new PythonRenderer(this, renderContext, options);
        }
        else {
            return new JSONPythonRenderer(this, renderContext, options);
        }
    }
}
function isNormalizedStartCharacter3(utf16Unit) {
    // FIXME: add Other_ID_Start - https://docs.python.org/3/reference/lexical_analysis.html#identifiers
    const category = unicode.getCategory(utf16Unit);
    return ["Lu", "Ll", "Lt", "Lm", "Lo", "Nl"].includes(category);
}
function isNormalizedPartCharacter3(utf16Unit) {
    // FIXME: add Other_ID_Continue - https://docs.python.org/3/reference/lexical_analysis.html#identifiers
    if (isNormalizedStartCharacter3(utf16Unit))
        return true;
    const category = unicode.getCategory(utf16Unit);
    return ["Mn", "Mc", "Nd", "Pc"].includes(category);
}
function isStartCharacter3(utf16Unit) {
    const s = String.fromCharCode(utf16Unit).normalize("NFKC");
    const l = s.length;
    if (l === 0 || !isNormalizedStartCharacter3(s.charCodeAt(0)))
        return false;
    for (let i = 1; i < l; i++) {
        if (!isNormalizedPartCharacter3(s.charCodeAt(i)))
            return false;
    }
    return true;
}
function isPartCharacter3(utf16Unit) {
    const s = String.fromCharCode(utf16Unit).normalize("NFKC");
    const l = s.length;
    for (let i = 0; i < l; i++) {
        if (!isNormalizedPartCharacter3(s.charCodeAt(i)))
            return false;
    }
    return true;
}
const legalizeName3 = utf16LegalizeCharacters(isPartCharacter3);
function classNameStyle(original) {
    const words = splitIntoWords(original);
    return combineWords(words, legalizeName3, firstUpperWordStyle, firstUpperWordStyle, allUpperWordStyle, allUpperWordStyle, "", isStartCharacter3);
}
function getWordStyle(uppercase, forceSnakeNameStyle) {
    if (!forceSnakeNameStyle) {
        return originalWord;
    }
    return uppercase ? allUpperWordStyle : allLowerWordStyle;
}
function snakeNameStyle(original, uppercase, forceSnakeNameStyle) {
    const wordStyle = getWordStyle(uppercase, forceSnakeNameStyle);
    const separator = forceSnakeNameStyle ? "_" : "";
    const words = splitIntoWords(original);
    return combineWords(words, legalizeName3, wordStyle, wordStyle, wordStyle, wordStyle, separator, isStartCharacter3);
}
export class PythonRenderer extends ConvenienceRenderer {
    constructor(targetLanguage, renderContext, pyOptions) {
        super(targetLanguage, renderContext);
        this.pyOptions = pyOptions;
        this.imports = new Map();
        this.declaredTypes = new Set();
    }
    forbiddenNamesForGlobalNamespace() {
        return forbiddenTypeNames;
    }
    forbiddenForObjectProperties(_, _classNamed) {
        return { names: forbiddenPropertyNames, includeGlobalForbidden: false };
    }
    makeNamedTypeNamer() {
        return funPrefixNamer("type", classNameStyle);
    }
    namerForObjectProperty() {
        return funPrefixNamer("property", s => snakeNameStyle(s, false, this.pyOptions.nicePropertyNames));
    }
    makeUnionMemberNamer() {
        return null;
    }
    makeEnumCaseNamer() {
        return funPrefixNamer("enum-case", s => snakeNameStyle(s, true, this.pyOptions.nicePropertyNames));
    }
    get commentLineStart() {
        return "# ";
    }
    emitDescriptionBlock(lines) {
        if (lines.length === 1) {
            const docstring = modifySource(content => {
                if (content.endsWith('"')) {
                    return content.slice(0, -1) + '\\"';
                }
                return content;
            }, lines[0]);
            this.emitComments([{ customLines: [docstring], lineStart: '"""', lineEnd: '"""' }]);
        }
        else {
            this.emitCommentLines(lines, {
                firstLineStart: '"""',
                lineStart: "",
                afterComment: '"""'
            });
        }
    }
    get needsTypeDeclarationBeforeUse() {
        return true;
    }
    canBeForwardDeclared(t) {
        const kind = t.kind;
        return kind === "class" || kind === "enum";
    }
    emitBlock(line, f) {
        this.emitLine(line);
        this.indent(f);
    }
    string(s) {
        const openQuote = '"';
        return [openQuote, stringEscape(s), '"'];
    }
    withImport(module, name) {
        if (this.pyOptions.features.typeHints || module !== "typing") {
            // FIXME: This is ugly.  We should rather not generate that import in the first
            // place, but right now we just make the type source and then throw it away.  It's
            // not a performance issue, so it's fine, I just bemoan this special case, and
            // potential others down the road.
            mapUpdateInto(this.imports, module, s => (s ? setUnionInto(s, [name]) : new Set([name])));
        }
        return name;
    }
    withTyping(name) {
        return this.withImport("typing", name);
    }
    namedType(t) {
        const name = this.nameForNamedType(t);
        if (this.declaredTypes.has(t))
            return name;
        return ["'", name, "'"];
    }
    pythonType(t, _isRootTypeDef = false) {
        const actualType = followTargetType(t);
        return matchType(actualType, _anyType => this.withTyping("Any"), _nullType => "None", _boolType => "bool", _integerType => "int", _doubletype => "float", _stringType => "str", arrayType => [this.withTyping("List"), "[", this.pythonType(arrayType.items), "]"], classType => this.namedType(classType), mapType => [this.withTyping("Dict"), "[str, ", this.pythonType(mapType.values), "]"], enumType => this.namedType(enumType), unionType => {
            const [hasNull, nonNulls] = removeNullFromUnion(unionType);
            const memberTypes = Array.from(nonNulls).map(m => this.pythonType(m));
            if (hasNull !== null) {
                let rest = [];
                if (!this.getAlphabetizeProperties() && this.pyOptions.features.dataClasses && _isRootTypeDef) {
                    // Only push "= None" if this is a root level type def
                    //   otherwise we may get type defs like List[Optional[int] = None]
                    //   which are invalid
                    rest.push(" = None");
                }
                if (nonNulls.size > 1) {
                    this.withImport("typing", "Union");
                    return [
                        this.withTyping("Optional"),
                        "[Union[",
                        arrayIntercalate(", ", memberTypes),
                        "]]",
                        ...rest
                    ];
                }
                else {
                    return [this.withTyping("Optional"), "[", defined(iterableFirst(memberTypes)), "]", ...rest];
                }
            }
            else {
                return [this.withTyping("Union"), "[", arrayIntercalate(", ", memberTypes), "]"];
            }
        }, transformedStringType => {
            if (transformedStringType.kind === "date-time") {
                return this.withImport("datetime", "datetime");
            }
            if (transformedStringType.kind === "uuid") {
                return this.withImport("uuid", "UUID");
            }
            return panic(`Transformed type ${transformedStringType.kind} not supported`);
        });
    }
    declarationLine(t) {
        if (t instanceof ClassType) {
            return ["class ", this.nameForNamedType(t), ":"];
        }
        if (t instanceof EnumType) {
            return ["class ", this.nameForNamedType(t), "(", this.withImport("enum", "Enum"), "):"];
        }
        return panic(`Can't declare type ${t.kind}`);
    }
    declareType(t, emitter) {
        this.emitBlock(this.declarationLine(t), () => {
            this.emitDescription(this.descriptionForType(t));
            emitter();
        });
        this.declaredTypes.add(t);
    }
    emitClassMembers(t) {
        if (this.pyOptions.features.dataClasses)
            return;
        const args = [];
        this.forEachClassProperty(t, "none", (name, _, cp) => {
            args.push([name, this.typeHint(": ", this.pythonType(cp.type))]);
        });
        this.emitBlock(["def __init__(self, ", arrayIntercalate(", ", args), ")", this.typeHint(" -> None"), ":"], () => {
            if (args.length === 0) {
                this.emitLine("pass");
            }
            else {
                this.forEachClassProperty(t, "none", name => {
                    this.emitLine("self.", name, " = ", name);
                });
            }
        });
    }
    typeHint(...sl) {
        if (this.pyOptions.features.typeHints) {
            return sl;
        }
        return [];
    }
    typingDecl(name, type) {
        return [name, this.typeHint(": ", this.withTyping(type))];
    }
    typingReturn(type) {
        return this.typeHint(" -> ", this.withTyping(type));
    }
    sortClassProperties(properties, propertyNames) {
        if (this.pyOptions.features.dataClasses) {
            return mapSortBy(properties, (p) => {
                return (p.type instanceof UnionType && nullableFromUnion(p.type) != null) || p.isOptional ? 1 : 0;
            });
        }
        else {
            return super.sortClassProperties(properties, propertyNames);
        }
    }
    emitClass(t) {
        if (this.pyOptions.features.dataClasses) {
            this.emitLine("@", this.withImport("dataclasses", "dataclass"));
        }
        this.declareType(t, () => {
            if (this.pyOptions.features.typeHints) {
                if (t.getProperties().size === 0) {
                    this.emitLine("pass");
                }
                else {
                    this.forEachClassProperty(t, "none", (name, jsonName, cp) => {
                        this.emitLine(name, this.typeHint(": ", this.pythonType(cp.type, true)));
                        this.emitDescription(this.descriptionForClassProperty(t, jsonName));
                    });
                }
                this.ensureBlankLine();
            }
            this.emitClassMembers(t);
        });
    }
    emitEnum(t) {
        this.declareType(t, () => {
            this.forEachEnumCase(t, "none", (name, jsonName) => {
                this.emitLine([name, " = ", this.string(jsonName)]);
            });
        });
    }
    emitImports() {
        this.imports.forEach((names, module) => {
            this.emitLine("from ", module, " import ", Array.from(names).join(", "));
        });
    }
    emitSupportCode() {
        return;
    }
    emitClosingCode() {
        return;
    }
    emitSourceStructure(_givenOutputFilename) {
        const declarationLines = this.gatherSource(() => {
            this.forEachNamedType(["interposing", 2], (c) => this.emitClass(c), e => this.emitEnum(e), _u => {
                return;
            });
        });
        const closingLines = this.gatherSource(() => this.emitClosingCode());
        const supportLines = this.gatherSource(() => this.emitSupportCode());
        if (this.leadingComments !== undefined) {
            this.emitComments(this.leadingComments);
        }
        this.ensureBlankLine();
        this.emitImports();
        this.ensureBlankLine(2);
        this.emitGatheredSource(supportLines);
        this.ensureBlankLine(2);
        this.emitGatheredSource(declarationLines);
        this.ensureBlankLine(2);
        this.emitGatheredSource(closingLines);
    }
}
function compose(input, f) {
    if (typeof f === "function") {
        if (input.value !== undefined) {
            // `input` is a value, so just apply `f` to its source form.
            return { value: f(makeValue(input)) };
        }
        if (input.lambda !== undefined) {
            // `input` is a lambda, so build `lambda x: f(input(x))`.
            return { lambda: multiWord(" ", "lambda x:", f([parenIfNeeded(input.lambda), "(x)"])), value: undefined };
        }
        // `input` is the identify function, so the composition is `lambda x: f(x)`.
        return { lambda: multiWord(" ", "lambda x:", f("x")), value: undefined };
    }
    if (f.value !== undefined) {
        return panic("Cannot compose into a value");
    }
    if (f.lambda === undefined) {
        // `f` is the identity function, so the result is just `input`.
        return input;
    }
    if (input.value === undefined) {
        // `input` is a lambda
        if (input.lambda === undefined) {
            // `input` is the identity function, so the result is just `f`.
            return f;
        }
        // `input` is a lambda, so the result is `lambda x: f(input(x))`.
        return {
            lambda: multiWord("", "lambda x: ", parenIfNeeded(f.lambda), "(", parenIfNeeded(input.lambda), "(x))"),
            value: undefined
        };
    }
    // `input` is a value, so return `f(input)`.
    return { lambda: f.lambda, value: makeValue(input) };
}
const identity = { value: undefined };
// If `vol` is a lambda, return it in its source form.  If it's
// a value, return a `lambda` that returns the value.
function makeLambda(vol) {
    if (vol.lambda !== undefined) {
        if (vol.value === undefined) {
            return vol.lambda;
        }
        return multiWord("", "lambda x: ", parenIfNeeded(vol.lambda), "(", vol.value, ")");
    }
    else if (vol.value !== undefined) {
        return multiWord(" ", "lambda x:", vol.value);
    }
    return multiWord(" ", "lambda x:", "x");
}
// If `vol` is a value, return the value in its source form.
// Calling this with `vol` being a lambda is not allowed.
function makeValue(vol) {
    if (vol.value === undefined) {
        return panic("Cannot make value from lambda without value");
    }
    if (vol.lambda !== undefined) {
        return [parenIfNeeded(vol.lambda), "(", vol.value, ")"];
    }
    return vol.value;
}
export class JSONPythonRenderer extends PythonRenderer {
    constructor() {
        super(...arguments);
        this._deserializerFunctions = new Set();
        this._converterNamer = funPrefixNamer("converter", s => snakeNameStyle(s, false, this.pyOptions.nicePropertyNames));
        this._topLevelConverterNames = new Map();
        this._haveTypeVar = false;
        this._haveEnumTypeVar = false;
        this._haveDateutil = false;
    }
    emitTypeVar(tvar, constraints) {
        if (!this.pyOptions.features.typeHints) {
            return;
        }
        this.emitLine(tvar, " = ", this.withTyping("TypeVar"), "(", this.string(tvar), constraints, ")");
    }
    typeVar() {
        this._haveTypeVar = true;
        // FIXME: This is ugly, but the code that requires the type variables, in
        // `emitImports` actually runs after imports have been imported.  The proper
        // solution would be to either allow more complex dependencies, or to
        // gather-emit the type variable declarations, too.  Unfortunately the
        // gather-emit is a bit buggy with blank lines, and I can't be bothered to
        // fix it now.
        this.withTyping("TypeVar");
        return "T";
    }
    enumTypeVar() {
        this._haveEnumTypeVar = true;
        // See the comment above.
        this.withTyping("TypeVar");
        this.withImport("enum", "Enum");
        return "EnumT";
    }
    cast(type, v) {
        if (!this.pyOptions.features.typeHints) {
            return v;
        }
        return [this.withTyping("cast"), "(", type, ", ", v, ")"];
    }
    emitNoneConverter() {
        // FIXME: We can't return the None type here because mypy thinks that means
        // We're not returning any value, when we're actually returning `None`.
        this.emitBlock(["def from_none(", this.typingDecl("x", "Any"), ")", this.typeHint(" -> ", this.withTyping("Any")), ":"], () => {
            this.emitLine("assert x is None");
            this.emitLine("return x");
        });
    }
    emitBoolConverter() {
        this.emitBlock(["def from_bool(", this.typingDecl("x", "Any"), ")", this.typeHint(" -> bool"), ":"], () => {
            this.emitLine("assert isinstance(x, bool)");
            this.emitLine("return x");
        });
    }
    emitIntConverter() {
        this.emitBlock(["def from_int(", this.typingDecl("x", "Any"), ")", this.typeHint(" -> int"), ":"], () => {
            this.emitLine("assert isinstance(x, int) and not isinstance(x, bool)");
            this.emitLine("return x");
        });
    }
    emitFromFloatConverter() {
        this.emitBlock(["def from_float(", this.typingDecl("x", "Any"), ")", this.typeHint(" -> float"), ":"], () => {
            this.emitLine("assert isinstance(x, (float, int)) and not isinstance(x, bool)");
            this.emitLine("return float(x)");
        });
    }
    emitToFloatConverter() {
        this.emitBlock(["def to_float(", this.typingDecl("x", "Any"), ")", this.typeHint(" -> float"), ":"], () => {
            this.emitLine("assert isinstance(x, (int, float))");
            this.emitLine("return x");
        });
    }
    emitStrConverter() {
        this.emitBlock(["def from_str(", this.typingDecl("x", "Any"), ")", this.typeHint(" -> str"), ":"], () => {
            const strType = "str";
            this.emitLine("assert isinstance(x, ", strType, ")");
            this.emitLine("return x");
        });
    }
    emitToEnumConverter() {
        const tvar = this.enumTypeVar();
        this.emitBlock([
            "def to_enum(c",
            this.typeHint(": ", this.withTyping("Type"), "[", tvar, "]"),
            ", ",
            this.typingDecl("x", "Any"),
            ")",
            this.typeHint(" -> ", tvar),
            ":"
        ], () => {
            this.emitLine("assert isinstance(x, c)");
            this.emitLine("return x.value");
        });
    }
    emitListConverter() {
        const tvar = this.typeVar();
        this.emitBlock([
            "def from_list(f",
            this.typeHint(": ", this.withTyping("Callable"), "[[", this.withTyping("Any"), "], ", tvar, "]"),
            ", ",
            this.typingDecl("x", "Any"),
            ")",
            this.typeHint(" -> ", this.withTyping("List"), "[", tvar, "]"),
            ":"
        ], () => {
            this.emitLine("assert isinstance(x, list)");
            this.emitLine("return [f(y) for y in x]");
        });
    }
    emitToClassConverter() {
        const tvar = this.typeVar();
        this.emitBlock([
            "def to_class(c",
            this.typeHint(": ", this.withTyping("Type"), "[", tvar, "]"),
            ", ",
            this.typingDecl("x", "Any"),
            ")",
            this.typeHint(" -> dict"),
            ":"
        ], () => {
            this.emitLine("assert isinstance(x, c)");
            this.emitLine("return ", this.cast(this.withTyping("Any"), "x"), ".to_dict()");
        });
    }
    emitDictConverter() {
        const tvar = this.typeVar();
        this.emitBlock([
            "def from_dict(f",
            this.typeHint(": ", this.withTyping("Callable"), "[[", this.withTyping("Any"), "], ", tvar, "]"),
            ", ",
            this.typingDecl("x", "Any"),
            ")",
            this.typeHint(" -> ", this.withTyping("Dict"), "[str, ", tvar, "]"),
            ":"
        ], () => {
            this.emitLine("assert isinstance(x, dict)");
            this.emitLine("return { k: f(v) for (k, v) in x.items() }");
        });
    }
    // This is not easily idiomatically typeable in Python.  See
    // https://stackoverflow.com/questions/51066468/computed-types-in-mypy/51084497
    emitUnionConverter() {
        this.emitMultiline(`def from_union(fs, x):
    for f in fs:
        try:
            return f(x)
        except:
            pass
    assert False`);
    }
    emitFromDatetimeConverter() {
        this.emitBlock([
            "def from_datetime(",
            this.typingDecl("x", "Any"),
            ")",
            this.typeHint(" -> ", this.withImport("datetime", "datetime")),
            ":"
        ], () => {
            this._haveDateutil = true;
            this.emitLine("return dateutil.parser.parse(x)");
        });
    }
    emitFromStringifiedBoolConverter() {
        this.emitBlock(["def from_stringified_bool(x", this.typeHint(": str"), ")", this.typeHint(" -> bool"), ":"], () => {
            this.emitBlock('if x == "true":', () => this.emitLine("return True"));
            this.emitBlock('if x == "false":', () => this.emitLine("return False"));
            this.emitLine("assert False");
        });
    }
    emitIsTypeConverter() {
        const tvar = this.typeVar();
        this.emitBlock([
            "def is_type(t",
            this.typeHint(": ", this.withTyping("Type"), "[", tvar, "]"),
            ", ",
            this.typingDecl("x", "Any"),
            ")",
            this.typeHint(" -> ", tvar),
            ":"
        ], () => {
            this.emitLine("assert isinstance(x, t)");
            this.emitLine("return x");
        });
    }
    emitConverter(cf) {
        switch (cf) {
            case "none": {
                this.emitNoneConverter();
                return;
            }
            case "bool": {
                this.emitBoolConverter();
                return;
            }
            case "int": {
                this.emitIntConverter();
                return;
            }
            case "from-float": {
                this.emitFromFloatConverter();
                return;
            }
            case "to-float": {
                this.emitToFloatConverter();
                return;
            }
            case "str": {
                this.emitStrConverter();
                return;
            }
            case "to-enum": {
                this.emitToEnumConverter();
                return;
            }
            case "list": {
                this.emitListConverter();
                return;
            }
            case "to-class": {
                this.emitToClassConverter();
                return;
            }
            case "dict": {
                this.emitDictConverter();
                return;
            }
            case "union": {
                this.emitUnionConverter();
                return;
            }
            case "from-datetime": {
                this.emitFromDatetimeConverter();
                return;
            }
            case "from-stringified-bool": {
                this.emitFromStringifiedBoolConverter();
                return;
            }
            case "is-type": {
                this.emitIsTypeConverter();
                return;
            }
            default:
                return assertNever(cf);
        }
    }
    // Return the name of the Python converter function `cf`.
    conv(cf) {
        this._deserializerFunctions.add(cf);
        const name = cf.replace(/-/g, "_");
        if (cf.startsWith("from-") || cf.startsWith("to-") || cf.startsWith("is-"))
            return name;
        return ["from_", name];
    }
    // Applies the converter function to `arg`
    convFn(cf, arg) {
        return compose(arg, { lambda: singleWord(this.conv(cf)), value: undefined });
    }
    typeObject(t) {
        const s = matchType(t, _anyType => undefined, _nullType => "type(None)", _boolType => "bool", _integerType => "int", _doubleType => "float", _stringType => "str", _arrayType => "List", classType => this.nameForNamedType(classType), _mapType => "dict", enumType => this.nameForNamedType(enumType), _unionType => undefined, transformedStringType => {
            if (transformedStringType.kind === "date-time") {
                return this.withImport("datetime", "datetime");
            }
            if (transformedStringType.kind === "uuid") {
                return this.withImport("uuid", "UUID");
            }
            return undefined;
        });
        if (s === undefined) {
            return panic(`No type object for ${t.kind}`);
        }
        return s;
    }
    transformer(inputTransformer, xfer, targetType) {
        const consume = (consumer, vol) => {
            if (consumer === undefined) {
                return vol;
            }
            return this.transformer(vol, consumer, targetType);
        };
        const isType = (t, valueToCheck) => {
            return compose(valueToCheck, v => [this.conv("is-type"), "(", this.typeObject(t), ", ", v, ")"]);
        };
        if (xfer instanceof DecodingChoiceTransformer || xfer instanceof ChoiceTransformer) {
            const lambdas = xfer.transformers.map(x => makeLambda(this.transformer(identity, x, targetType)).source);
            return compose(inputTransformer, v => [
                this.conv("union"),
                "([",
                arrayIntercalate(", ", lambdas),
                "], ",
                v,
                ")"
            ]);
        }
        else if (xfer instanceof DecodingTransformer) {
            const consumer = xfer.consumer;
            const vol = this.deserializer(inputTransformer, xfer.sourceType);
            return consume(consumer, vol);
        }
        else if (xfer instanceof EncodingTransformer) {
            return this.serializer(inputTransformer, xfer.sourceType);
        }
        else if (xfer instanceof UnionInstantiationTransformer) {
            return inputTransformer;
        }
        else if (xfer instanceof UnionMemberMatchTransformer) {
            const consumer = xfer.transformer;
            const vol = isType(xfer.memberType, inputTransformer);
            return consume(consumer, vol);
        }
        else if (xfer instanceof ParseStringTransformer) {
            const consumer = xfer.consumer;
            const immediateTargetType = consumer === undefined ? targetType : consumer.sourceType;
            let vol;
            switch (immediateTargetType.kind) {
                case "integer":
                    vol = compose(inputTransformer, v => ["int(", v, ")"]);
                    break;
                case "bool":
                    vol = this.convFn("from-stringified-bool", inputTransformer);
                    break;
                case "enum":
                    vol = this.deserializer(inputTransformer, immediateTargetType);
                    break;
                case "date-time":
                    vol = this.convFn("from-datetime", inputTransformer);
                    break;
                case "uuid":
                    vol = compose(inputTransformer, v => [this.withImport("uuid", "UUID"), "(", v, ")"]);
                    break;
                default:
                    return panic(`Parsing of ${immediateTargetType.kind} in a transformer is not supported`);
            }
            return consume(consumer, vol);
        }
        else if (xfer instanceof StringifyTransformer) {
            const consumer = xfer.consumer;
            let vol;
            switch (xfer.sourceType.kind) {
                case "integer":
                    vol = compose(inputTransformer, v => ["str(", v, ")"]);
                    break;
                case "bool":
                    vol = compose(inputTransformer, v => ["str(", v, ").lower()"]);
                    break;
                case "enum":
                    vol = this.serializer(inputTransformer, xfer.sourceType);
                    break;
                case "date-time":
                    vol = compose(inputTransformer, v => [v, ".isoformat()"]);
                    break;
                case "uuid":
                    vol = compose(inputTransformer, v => ["str(", v, ")"]);
                    break;
                default:
                    return panic(`Parsing of ${xfer.sourceType.kind} in a transformer is not supported`);
            }
            return consume(consumer, vol);
        }
        else {
            return panic(`Transformer ${xfer.kind} is not supported`);
        }
    }
    // Returns the code to deserialize `value` as type `t`.  If `t` has
    // an associated transformer, the code for that transformer is
    // returned.
    deserializer(value, t) {
        const xf = transformationForType(t);
        if (xf !== undefined) {
            return this.transformer(value, xf.transformer, xf.targetType);
        }
        return matchType(t, _anyType => value, _nullType => this.convFn("none", value), _boolType => this.convFn("bool", value), _integerType => this.convFn("int", value), _doubleType => this.convFn("from-float", value), _stringType => this.convFn("str", value), arrayType => compose(value, v => [
            this.conv("list"),
            "(",
            makeLambda(this.deserializer(identity, arrayType.items)).source,
            ", ",
            v,
            ")"
        ]), classType => compose(value, {
            lambda: singleWord(this.nameForNamedType(classType), ".from_dict"),
            value: undefined
        }), mapType => compose(value, v => [
            this.conv("dict"),
            "(",
            makeLambda(this.deserializer(identity, mapType.values)).source,
            ", ",
            v,
            ")"
        ]), enumType => compose(value, { lambda: singleWord(this.nameForNamedType(enumType)), value: undefined }), unionType => {
            // FIXME: handle via transformers
            const deserializers = Array.from(unionType.members).map(m => makeLambda(this.deserializer(identity, m)).source);
            return compose(value, v => [
                this.conv("union"),
                "([",
                arrayIntercalate(", ", deserializers),
                "], ",
                v,
                ")"
            ]);
        }, transformedStringType => {
            // FIXME: handle via transformers
            if (transformedStringType.kind === "date-time") {
                return this.convFn("from-datetime", value);
            }
            if (transformedStringType.kind === "uuid") {
                return compose(value, v => [this.withImport("uuid", "UUID"), "(", v, ")"]);
            }
            return panic(`Transformed type ${transformedStringType.kind} not supported`);
        });
    }
    serializer(value, t) {
        const xf = transformationForType(t);
        if (xf !== undefined) {
            const reverse = xf.reverse;
            return this.transformer(value, reverse.transformer, reverse.targetType);
        }
        return matchType(t, _anyType => value, _nullType => this.convFn("none", value), _boolType => this.convFn("bool", value), _integerType => this.convFn("int", value), _doubleType => this.convFn("to-float", value), _stringType => this.convFn("str", value), arrayType => compose(value, v => [
            this.conv("list"),
            "(",
            makeLambda(this.serializer(identity, arrayType.items)).source,
            ", ",
            v,
            ")"
        ]), classType => compose(value, v => [this.conv("to-class"), "(", this.nameForNamedType(classType), ", ", v, ")"]), mapType => compose(value, v => [
            this.conv("dict"),
            "(",
            makeLambda(this.serializer(identity, mapType.values)).source,
            ", ",
            v,
            ")"
        ]), enumType => compose(value, v => [this.conv("to-enum"), "(", this.nameForNamedType(enumType), ", ", v, ")"]), unionType => {
            const serializers = Array.from(unionType.members).map(m => makeLambda(this.serializer(identity, m)).source);
            return compose(value, v => [
                this.conv("union"),
                "([",
                arrayIntercalate(", ", serializers),
                "], ",
                v,
                ")"
            ]);
        }, transformedStringType => {
            if (transformedStringType.kind === "date-time") {
                return compose(value, v => [v, ".isoformat()"]);
            }
            if (transformedStringType.kind === "uuid") {
                return compose(value, v => ["str(", v, ")"]);
            }
            return panic(`Transformed type ${transformedStringType.kind} not supported`);
        });
    }
    emitClassMembers(t) {
        super.emitClassMembers(t);
        this.ensureBlankLine();
        const className = this.nameForNamedType(t);
        this.emitLine("@staticmethod");
        this.emitBlock(["def from_dict(", this.typingDecl("obj", "Any"), ")", this.typeHint(" -> ", this.namedType(t)), ":"], () => {
            const args = [];
            this.emitLine("assert isinstance(obj, dict)");
            this.forEachClassProperty(t, "none", (name, jsonName, cp) => {
                const property = { value: ["obj.get(", this.string(jsonName), ")"] };
                this.emitLine(name, " = ", makeValue(this.deserializer(property, cp.type)));
                args.push(name);
            });
            this.emitLine("return ", className, "(", arrayIntercalate(", ", args), ")");
        });
        this.ensureBlankLine();
        this.emitBlock(["def to_dict(self)", this.typeHint(" -> dict"), ":"], () => {
            this.emitLine("result", this.typeHint(": dict"), " = {}");
            this.forEachClassProperty(t, "none", (name, jsonName, cp) => {
                const property = { value: ["self.", name] };
                if (cp.isOptional) {
                    this.emitBlock(["if self.", name, " is not None:"], () => {
                        this.emitLine("result[", this.string(jsonName), "] = ", makeValue(this.serializer(property, cp.type)));
                    });
                }
                else {
                    this.emitLine("result[", this.string(jsonName), "] = ", makeValue(this.serializer(property, cp.type)));
                }
            });
            this.emitLine("return result");
        });
    }
    emitImports() {
        super.emitImports();
        if (this._haveDateutil) {
            this.emitLine("import dateutil.parser");
        }
        if (!this._haveTypeVar && !this._haveEnumTypeVar)
            return;
        this.ensureBlankLine(2);
        if (this._haveTypeVar) {
            this.emitTypeVar(this.typeVar(), []);
        }
        if (this._haveEnumTypeVar) {
            this.emitTypeVar(this.enumTypeVar(), [", bound=", this.withImport("enum", "Enum")]);
        }
    }
    emitSupportCode() {
        const map = Array.from(this._deserializerFunctions).map(f => [f, f]);
        this.forEachWithBlankLines(map, ["interposing", 2], cf => {
            this.emitConverter(cf);
        });
    }
    makeTopLevelDependencyNames(_t, topLevelName) {
        const fromDict = new DependencyName(this._converterNamer, topLevelNameOrder, l => `${l(topLevelName)}_from_dict`);
        const toDict = new DependencyName(this._converterNamer, topLevelNameOrder, l => `${l(topLevelName)}_to_dict`);
        this._topLevelConverterNames.set(topLevelName, { fromDict, toDict });
        return [fromDict, toDict];
    }
    emitDefaultLeadingComments() {
        this.ensureBlankLine();
        if (this._haveDateutil) {
            this.emitCommentLines([
                "This code parses date/times, so please",
                "",
                "    pip install python-dateutil",
                ""
            ]);
        }
        this.emitCommentLines([
            "To use this code, make sure you",
            "",
            "    import json",
            "",
            "and then, to convert JSON from a string, do",
            ""
        ]);
        this.forEachTopLevel("none", (_, name) => {
            const { fromDict } = defined(this._topLevelConverterNames.get(name));
            this.emitLine(this.commentLineStart, "    result = ", fromDict, "(json.loads(json_string))");
        });
    }
    emitClosingCode() {
        this.forEachTopLevel(["interposing", 2], (t, name) => {
            const { fromDict, toDict } = defined(this._topLevelConverterNames.get(name));
            const pythonType = this.pythonType(t);
            this.emitBlock(["def ", fromDict, "(", this.typingDecl("s", "Any"), ")", this.typeHint(" -> ", pythonType), ":"], () => {
                this.emitLine("return ", makeValue(this.deserializer({ value: "s" }, t)));
            });
            this.ensureBlankLine(2);
            this.emitBlock(["def ", toDict, "(x", this.typeHint(": ", pythonType), ")", this.typingReturn("Any"), ":"], () => {
                this.emitLine("return ", makeValue(this.serializer({ value: "x" }, t)));
            });
        });
    }
}
