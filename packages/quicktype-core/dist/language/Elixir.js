"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElixirRenderer = exports.ElixirTargetLanguage = exports.elixirOptions = void 0;
const unicode = __importStar(require("unicode-properties"));
const ConvenienceRenderer_1 = require("../ConvenienceRenderer");
const Naming_1 = require("../Naming");
const RendererOptions_1 = require("../RendererOptions");
const Strings_1 = require("../support/Strings");
const TargetLanguage_1 = require("../TargetLanguage");
const Type_1 = require("../Type");
const TypeUtils_1 = require("../TypeUtils");
const forbiddenModuleNames = [
    "Access",
    "Agent",
    "Any",
    "Application",
    "ArgumentError",
    "ArithmeticError",
    "Atom",
    "BadArityError",
    "BadBooleanError",
    "BadFunctionError",
    "BadMapError",
    "BadStructError",
    "Base",
    "Behaviour",
    "Bitwise",
    "Calendar",
    "CaseClauseError",
    "Code",
    "Collectable",
    "CondClauseError",
    "Config",
    "Date",
    "DateTime",
    "Dict",
    "DynamicSupervisor",
    "Enum",
    "ErlangError",
    "Exception",
    "File",
    "Float",
    "Function",
    "FunctionClauseError",
    "GenEvent",
    "GenServer",
    "HashDict",
    "HashSet",
    "IO",
    "Inspect",
    "Integer",
    "Kernel",
    "KeyError",
    "Keyword",
    "List",
    "Macro",
    "Map",
    "MapSet",
    "MatchError",
    "Module",
    "Node",
    "OptionParser",
    "Path",
    "Port",
    "Process",
    "Protocol",
    "Range",
    "Record",
    "Regex",
    "Registry",
    "RuntimeError",
    "Set",
    "Stream",
    "String",
    "StringIO",
    "Supervisor",
    "SyntaxError",
    "System",
    "SystemLimitError",
    "Task",
    "Time",
    "TokenMissingError",
    "Tuple",
    "URI",
    "UndefinedFunctionError",
    "UnicodeConversionError",
    "Version",
    "WithClauseError"
];
const reservedWords = [
    "def",
    "defmodule",
    "use",
    "import",
    "alias",
    "true",
    "false",
    "nil",
    "when",
    "and",
    "or",
    "not",
    "in",
    "fn",
    "do",
    "end",
    "catch",
    "rescue",
    "after",
    "else"
];
function unicodeEscape(codePoint) {
    return `\\u{${(0, Strings_1.intToHex)(codePoint, 0)}}`;
}
function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
const stringEscape = (0, Strings_1.utf32ConcatMap)((0, Strings_1.escapeNonPrintableMapper)(Strings_1.isPrintable, unicodeEscape));
function escapeDoubleQuotes(str) {
    return str.replace(/"/g, '\\"');
}
function escapeNewLines(str) {
    return str.replace(/\n/g, "\\n");
}
exports.elixirOptions = {
    justTypes: new RendererOptions_1.BooleanOption("just-types", "Plain types only", false),
    namespace: new RendererOptions_1.StringOption("namespace", "Specify a module namespace", "NAME", "")
};
class ElixirTargetLanguage extends TargetLanguage_1.TargetLanguage {
    constructor() {
        super("Elixir", ["elixir"], "ex");
    }
    getOptions() {
        return [exports.elixirOptions.justTypes, exports.elixirOptions.namespace];
    }
    get supportsOptionalClassProperties() {
        return true;
    }
    get defaultIndentation() {
        return "  ";
    }
    makeRenderer(renderContext, untypedOptionValues) {
        return new ElixirRenderer(this, renderContext, (0, RendererOptions_1.getOptionValues)(exports.elixirOptions, untypedOptionValues));
    }
}
exports.ElixirTargetLanguage = ElixirTargetLanguage;
const isStartCharacter = Strings_1.isLetterOrUnderscore;
function isPartCharacter(utf16Unit) {
    const category = unicode.getCategory(utf16Unit);
    return ["Nd", "Pc", "Mn", "Mc"].includes(category) || isStartCharacter(utf16Unit);
}
const legalizeName = (0, Strings_1.legalizeCharacters)(isPartCharacter);
function simpleNameStyle(original, uppercase) {
    if (/^[0-9]+$/.test(original)) {
        original = `${original}N`;
    }
    const words = (0, Strings_1.splitIntoWords)(original);
    return (0, Strings_1.combineWords)(words, legalizeName, uppercase ? Strings_1.firstUpperWordStyle : Strings_1.allLowerWordStyle, uppercase ? Strings_1.firstUpperWordStyle : Strings_1.allLowerWordStyle, Strings_1.allUpperWordStyle, Strings_1.allUpperWordStyle, "", isStartCharacter);
}
function memberNameStyle(original) {
    const words = (0, Strings_1.splitIntoWords)(original);
    return (0, Strings_1.combineWords)(words, legalizeName, Strings_1.allLowerWordStyle, Strings_1.allLowerWordStyle, Strings_1.allLowerWordStyle, Strings_1.allLowerWordStyle, "_", isStartCharacter);
}
class ElixirRenderer extends ConvenienceRenderer_1.ConvenienceRenderer {
    constructor(targetLanguage, renderContext, _options) {
        super(targetLanguage, renderContext);
        this._options = _options;
    }
    get commentLineStart() {
        return "# ";
    }
    get needsTypeDeclarationBeforeUse() {
        return true;
    }
    canBeForwardDeclared(t) {
        return "class" === t.kind;
    }
    forbiddenNamesForGlobalNamespace() {
        return [...forbiddenModuleNames, ...reservedWords.map(word => capitalizeFirstLetter(word))];
    }
    forbiddenForObjectProperties(_c, _classNamed) {
        return { names: reservedWords, includeGlobalForbidden: true };
    }
    makeNamedTypeNamer() {
        return new Naming_1.Namer("types", n => simpleNameStyle(n, true), []);
    }
    namerForObjectProperty() {
        return new Naming_1.Namer("properties", memberNameStyle, []);
    }
    makeUnionMemberNamer() {
        return new Naming_1.Namer("properties", memberNameStyle, []);
    }
    makeEnumCaseNamer() {
        return new Naming_1.Namer("enum-cases", n => simpleNameStyle(n, true), []);
    }
    nameForNamedTypeWithNamespace(t) {
        if (this._options.namespace) {
            return [this._options.namespace, ".", this.nameForNamedType(t)];
        }
        else {
            return [this.nameForNamedType(t)];
        }
    }
    nameWithNamespace(n) {
        if (this._options.namespace) {
            return [this._options.namespace, ".", n];
        }
        else {
            return [n];
        }
    }
    elixirType(t, isOptional = false) {
        const optional = isOptional ? " | nil" : "";
        return (0, TypeUtils_1.matchType)(t, _anyType => ["any()", optional], _nullType => ["nil"], _boolType => ["boolean()", optional], _integerType => ["integer()", optional], _doubleType => ["float()", optional], _stringType => ["String.t()", optional], arrayType => ["[", this.elixirType(arrayType.items), "]", optional], classType => [this.nameForNamedTypeWithNamespace(classType), ".t()", optional], mapType => ["%{String.t() => ", this.elixirType(mapType.values), "}", optional], enumType => [this.nameForNamedTypeWithNamespace(enumType), ".t()", optional], unionType => {
            const children = [...unionType.getChildren()].map(ut => this.elixirType(ut));
            return [
                children.flatMap((element, index) => (index === children.length - 1 ? element : [element, " | "])),
                optional
            ];
        });
    }
    patternMatchClauseDecode(t, attributeName, suffix = "") {
        return (0, TypeUtils_1.matchType)(t, _anyType => [], _nullType => ["def decode_", attributeName, suffix, "(value) when is_nil(value), do: value"], _boolType => ["def decode_", attributeName, suffix, "(value) when is_boolean(value), do: value"], _integerType => ["def decode_", attributeName, suffix, "(value) when is_integer(value), do: value"], _doubleType => [
            "def decode_",
            attributeName,
            suffix,
            "(value) when is_float(value), do: value\n",
            "def decode_",
            attributeName,
            suffix,
            "(value) when is_integer(value), do: value"
        ], _stringType => ["def decode_", attributeName, suffix, "(value) when is_binary(value), do: value"], _arrayType => ["def decode_", attributeName, suffix, "(value) when is_list(value), do: value"], classType => {
            const requiredAttributeArgs = [];
            this.forEachClassProperty(classType, "none", (_name, jsonName, p) => {
                if (!p.isOptional) {
                    requiredAttributeArgs.push(['"', jsonName, '" => _,']);
                }
            });
            return [
                "def decode_",
                attributeName,
                suffix,
                "(%{",
                requiredAttributeArgs,
                "} = value), do: ",
                this.nameForNamedTypeWithNamespace(classType),
                ".from_map(value)"
            ];
        }, _mapType => ["def decode_", attributeName, suffix, "(value) when is_map(value), do: value"], enumType => [
            "def decode_",
            attributeName,
            suffix,
            "(value) when is_binary(value)",
            ", do: ",
            this.nameForNamedTypeWithNamespace(enumType),
            ".decode(value)"
        ], _unionType => []);
    }
    patternMatchClauseEncode(t, attributeName, suffix = "") {
        return (0, TypeUtils_1.matchType)(t, _anyType => [], _nullType => ["def encode_", attributeName, suffix, "(value) when is_nil(value), do: value"], _boolType => ["def encode_", attributeName, suffix, "(value) when is_boolean(value), do: value"], _integerType => ["def encode_", attributeName, suffix, "(value) when is_integer(value), do: value"], _doubleType => [
            "def encode_",
            attributeName,
            suffix,
            "(value) when is_float(value), do: value\n",
            "def encode_",
            attributeName,
            suffix,
            "(value) when is_integer(value), do: value"
        ], _stringType => ["def encode_", attributeName, suffix, "(value) when is_binary(value), do: value"], _arrayType => ["def encode_", attributeName, suffix, "(value) when is_list(value), do: value"], classType => {
            const requiredAttributeArgs = [];
            this.forEachClassProperty(classType, "none", (_name, jsonName, p) => {
                if (!p.isOptional) {
                    requiredAttributeArgs.push(['"', jsonName, '" => _,']);
                }
            });
            return [
                "def encode_",
                attributeName,
                suffix,
                "(%",
                this.nameForNamedTypeWithNamespace(classType),
                "{} = value), do: ",
                this.nameForNamedTypeWithNamespace(classType),
                ".to_map(value)"
            ];
        }, _mapType => ["def encode_", attributeName, suffix, "(value) when is_map(value), do: value"], enumType => [
            "def encode_",
            attributeName,
            suffix,
            "(value) when is_atom(value)",
            ", do: ",
            this.nameForNamedTypeWithNamespace(enumType),
            ".encode(value)"
        ], _unionType => []);
    }
    sortAndFilterPatternMatchTypes(types) {
        return types
            .filter(type => !(type instanceof Type_1.UnionType))
            .sort((a, b) => {
            if (a instanceof Type_1.ClassType && !(b instanceof Type_1.ClassType)) {
                return -1;
            }
            else if (b instanceof Type_1.ClassType && !(a instanceof Type_1.ClassType)) {
                return 1;
            }
            else if (a.kind === "bool" && b.kind !== "bool") {
                return -1;
            }
            else if (b.kind === "bool" && a.kind !== "bool") {
                return 1;
            }
            else if (a instanceof Type_1.EnumType && !(b instanceof Type_1.EnumType)) {
                return -1;
            }
            else if (b instanceof Type_1.EnumType && !(a instanceof Type_1.EnumType)) {
                return 1;
            }
            else if (a.isPrimitive() && !b.isPrimitive()) {
                return -1;
            }
            else if (b.isPrimitive() && !a.isPrimitive()) {
                return 1;
            }
            else {
                return 0;
            }
        });
    }
    emitPatternMatches(types, name, parentName, suffix = "", optional = false) {
        this.ensureBlankLine();
        let typesToMatch = this.sortAndFilterPatternMatchTypes(types);
        if (typesToMatch.length < 2) {
            return;
        }
        if (typesToMatch.find(type => type.kind === "double")) {
            typesToMatch = typesToMatch.filter(type => type.kind !== "integer");
        }
        typesToMatch.forEach(type => {
            this.emitLine(this.patternMatchClauseDecode(type, name, suffix));
        });
        if (optional && !typesToMatch.find(type => type.kind === "null")) {
            this.emitLine("def decode_", name, suffix, "(value) when is_nil(value), do: value");
        }
        this.emitLine("def decode_", name, suffix, '(_), do: {:error, "Unexpected type when decoding ', parentName, ".", name, '"}');
        this.ensureBlankLine();
        typesToMatch.forEach(type => {
            this.emitLine(this.patternMatchClauseEncode(type, name, suffix));
        });
        if (optional && !typesToMatch.find(type => type.kind === "null")) {
            this.emitLine("def encode_", name, suffix, "(value) when is_nil(value), do: value");
        }
        this.emitLine("def encode_", name, suffix, '(_), do: {:error, "Unexpected type when encoding ', parentName, ".", name, '"}');
        this.ensureBlankLine();
    }
    nameOfTransformFunction(t, name, encode = false, prefix = "") {
        let mode = "decode";
        if (encode) {
            mode = "encode";
        }
        return (0, TypeUtils_1.matchType)(t, _anyType => [], _nullType => [], _boolType => [], _integerType => [], _doubleType => [], _stringType => [], _arrayType => [], classType => [this.nameForNamedTypeWithNamespace(classType), `.${encode ? "to" : "from"}_map`], _mapType => [], enumType => {
            return [this.nameForNamedTypeWithNamespace(enumType), `.${mode}`];
        }, _unionType => {
            return [`${mode}_`, name, prefix];
        });
    }
    fromDynamic(t, jsonName, name, optional = false) {
        const primitive = ['m["', jsonName, '"]'];
        return (0, TypeUtils_1.matchType)(t, _anyType => primitive, _nullType => primitive, _boolType => primitive, _integerType => primitive, _doubleType => primitive, _stringType => primitive, arrayType => {
            const arrayElement = arrayType.items;
            if (arrayElement instanceof Type_1.ArrayType) {
                return primitive;
            }
            else if (arrayElement.isPrimitive()) {
                return primitive;
            }
            else if (arrayElement instanceof Type_1.MapType) {
                return primitive;
            }
            else {
                if (optional) {
                    return [
                        "m",
                        '["',
                        jsonName,
                        '"] && Enum.map(m["',
                        jsonName,
                        '"], &',
                        this.nameOfTransformFunction(arrayElement, name, false, "_element"),
                        "/1)"
                    ];
                }
                else {
                    return [
                        'Enum.map(m["',
                        jsonName,
                        '"], &',
                        this.nameOfTransformFunction(arrayElement, name, false, "_element"),
                        "/1)"
                    ];
                }
            }
        }, classType => [
            optional ? [primitive, " && "] : "",
            this.nameForNamedTypeWithNamespace(classType),
            ".from_map(",
            primitive,
            ")"
        ], mapType => {
            const mapValueTypes = [...mapType.values.getChildren()];
            const mapValueTypesNotPrimitive = mapValueTypes.filter(type => !(type instanceof Type_1.PrimitiveType));
            if (mapValueTypesNotPrimitive.length === 0) {
                return [primitive];
            }
            else {
                if (mapType.values.kind === "union") {
                    return [
                        'm["',
                        jsonName,
                        '"]\n|> Map.new(fn {key, value} -> {key, ',
                        this.nameOfTransformFunction(mapType.values, jsonName, false),
                        "_value(value)} end)"
                    ];
                }
                else if (mapType.values instanceof Type_1.EnumType || mapType.values instanceof Type_1.ClassType) {
                    return [
                        'm["',
                        jsonName,
                        '"]\n|> Map.new(fn {key, value} -> {key, ',
                        this.nameOfTransformFunction(mapType.values, jsonName, false),
                        "(value)} end)"
                    ];
                }
                return [primitive];
            }
        }, enumType => {
            return [
                optional ? [primitive, " && "] : "",
                this.nameOfTransformFunction(enumType, name),
                "(",
                primitive,
                ")"
            ];
        }, unionType => {
            const unionTypes = [...unionType.getChildren()];
            const unionPrimitiveTypes = unionTypes.filter(type => type.isPrimitive());
            if (unionTypes.length === unionPrimitiveTypes.length) {
                return ['m["', jsonName, '"]'];
            }
            const nullable = (0, TypeUtils_1.nullableFromUnion)(unionType);
            if (nullable !== null) {
                if (nullable instanceof Type_1.ClassType) {
                    return this.fromDynamic(nullable, jsonName, name, true);
                }
                const nullableTypes = [...nullable.getChildren()];
                if (nullableTypes.length < 2) {
                    return this.fromDynamic(nullable, jsonName, name, true);
                }
                return ['m["', jsonName, '"] && decode_', name, '(m["', jsonName, '"])'];
            }
            return ["decode_", name, '(m["', jsonName, '"])'];
        });
    }
    toDynamic(t, e, optional = false) {
        const expression = ["struct.", e];
        return (0, TypeUtils_1.matchType)(t, _anyType => expression, _nullType => expression, _boolType => expression, _integerType => expression, _doubleType => expression, _stringType => expression, arrayType => {
            const arrayElement = arrayType.items;
            if (arrayElement instanceof Type_1.ArrayType) {
                return expression;
            }
            if (arrayElement.isPrimitive()) {
                return expression;
            }
            else if (arrayElement instanceof Type_1.MapType) {
                return expression;
            }
            else {
                if (arrayElement.kind === "array") {
                    return expression;
                }
                else {
                    if (optional) {
                        return [
                            "struct.",
                            e,
                            " && Enum.map(struct.",
                            e,
                            ", &",
                            this.nameOfTransformFunction(arrayElement, e, true, "_element"),
                            "/1)"
                        ];
                    }
                    else {
                        return [
                            "struct.",
                            e,
                            " && Enum.map(struct.",
                            e,
                            ", &",
                            this.nameOfTransformFunction(arrayElement, e, true, "_element"),
                            "/1)"
                        ];
                    }
                }
            }
        }, classType => [
            optional ? ["struct.", e, " && "] : "",
            this.nameForNamedTypeWithNamespace(classType),
            ".to_map(",
            "struct.",
            e,
            ")"
        ], mapType => {
            const mapValueTypes = [...mapType.values.getChildren()];
            const mapValueTypesNotPrimitive = mapValueTypes.filter(type => !(type instanceof Type_1.PrimitiveType));
            if (mapValueTypesNotPrimitive.length === 0) {
                return [expression];
            }
            else {
                if (mapType.values.kind === "union") {
                    return [
                        "struct.",
                        e,
                        "\n|> Map.new(fn {key, value} -> {key, ",
                        this.nameOfTransformFunction(mapType.values, e, true),
                        "_value(value)} end)"
                    ];
                }
                else if (mapType.values instanceof Type_1.EnumType || mapType.values instanceof Type_1.ClassType) {
                    return [
                        "struct.",
                        e,
                        "\n|> Map.new(fn {key, value} -> {key, ",
                        this.nameOfTransformFunction(mapType.values, e, true),
                        "(value)} end)"
                    ];
                }
                return [expression];
            }
        }, enumType => {
            return [
                optional ? ["struct.", e, " && "] : "",
                this.nameForNamedTypeWithNamespace(enumType),
                ".encode(struct.",
                e,
                ")"
            ];
        }, unionType => {
            const unionTypes = [...unionType.getChildren()];
            const unionPrimitiveTypes = unionTypes.filter(type => type.isPrimitive());
            if (unionTypes.length === unionPrimitiveTypes.length) {
                return ["struct.", e];
            }
            const nullable = (0, TypeUtils_1.nullableFromUnion)(unionType);
            if (nullable !== null) {
                if (nullable instanceof Type_1.ClassType) {
                    return this.toDynamic(nullable, e, true);
                }
                const nullableTypes = [...nullable.getChildren()];
                if (nullableTypes.length < 2) {
                    return this.toDynamic(nullable, e, true);
                }
                return ["struct.", e, " && encode_", e, "(struct.", e, ")"];
            }
            return ["encode_", e, "(struct.", e, ")"];
        });
    }
    emitBlock(source, emit) {
        this.emitLine(source);
        this.indent(emit);
        this.emitLine("end");
    }
    emitDescriptionBlock(lines) {
        this.emitCommentLines(lines, {
            firstLineStart: '@moduledoc """\n',
            lineStart: "",
            afterComment: '"""'
        });
    }
    emitModule(c, moduleName) {
        this.emitBlock(["defmodule ", this.nameWithNamespace(moduleName), " do"], () => {
            var _a;
            const structDescription = (_a = this.descriptionForType(c)) !== null && _a !== void 0 ? _a : [];
            const attributeDescriptions = [];
            this.forEachClassProperty(c, "none", (name, jsonName, _p) => {
                const attributeDescription = this.descriptionForClassProperty(c, jsonName);
                if (attributeDescription) {
                    attributeDescriptions.push(["- `:", name, "` - ", attributeDescription]);
                }
            });
            if (structDescription.length || attributeDescriptions.length) {
                this.emitDescription([...structDescription, ...attributeDescriptions]);
                this.ensureBlankLine();
            }
            const requiredAttributes = [];
            this.forEachClassProperty(c, "none", (name, _jsonName, p) => {
                if (!p.isOptional) {
                    if (requiredAttributes.length === 0) {
                        requiredAttributes.push([":", name]);
                    }
                    else {
                        requiredAttributes.push([", :", name]);
                    }
                }
            });
            if (requiredAttributes.length) {
                this.emitLine(["@enforce_keys [", requiredAttributes, "]"]);
            }
            const attributeNames = [];
            this.forEachClassProperty(c, "none", (name, _jsonName, _p) => {
                if (attributeNames.length === 0) {
                    attributeNames.push([":", name]);
                }
                else {
                    attributeNames.push([", :", name]);
                }
            });
            this.emitLine(["defstruct [", attributeNames, "]"]);
            this.ensureBlankLine();
            const typeDefinitionTable = [[["@type "], ["t :: %__MODULE__{"]]];
            let count = c.getProperties().size;
            this.forEachClassProperty(c, "none", (name, _jsonName, p) => {
                const last = --count === 0;
                const attributeRow = [
                    [],
                    ["  ", name, ": ", this.elixirType(p.type), p.isOptional ? " | nil" : "", last ? "" : ","]
                ];
                typeDefinitionTable.push(attributeRow);
            });
            typeDefinitionTable.push([[], ["}"]]);
            this.emitTable(typeDefinitionTable);
            if (this._options.justTypes) {
                return;
            }
            this.forEachClassProperty(c, "none", (name, _jsonName, p) => {
                if (p.type.kind === "union") {
                    const unionTypes = [...p.type.getChildren()];
                    const unionPrimitiveTypes = unionTypes.filter(type => type.isPrimitive());
                    if (unionTypes.length === unionPrimitiveTypes.length) {
                        return;
                    }
                    const unionTypesNonNull = unionTypes.filter(type => type.kind !== "null");
                    if (unionTypesNonNull.length === 1) {
                        let suffix = "";
                        let itemTypes = [];
                        if (unionTypesNonNull[0] instanceof Type_1.ArrayType) {
                            suffix = "_element";
                            itemTypes = [...unionTypesNonNull[0].getChildren()];
                        }
                        else if (unionTypesNonNull[0] instanceof Type_1.MapType) {
                            suffix = "_value";
                            itemTypes = [...unionTypesNonNull[0].getChildren()];
                        }
                        if (itemTypes.length === 1 && itemTypes[0] instanceof Type_1.UnionType) {
                            itemTypes = [...itemTypes[0].getChildren()];
                        }
                        this.emitPatternMatches(itemTypes, name, this.nameForNamedTypeWithNamespace(c), suffix, p.isOptional);
                    }
                    else {
                        this.emitPatternMatches(unionTypes, name, this.nameForNamedTypeWithNamespace(c), "", p.isOptional);
                    }
                }
                else if (p.type.kind === "array") {
                    const arrayType = p.type;
                    if (arrayType.items instanceof Type_1.UnionType) {
                        const unionType = arrayType.items;
                        const typesInUnion = [...unionType.getChildren()];
                        this.emitPatternMatches(typesInUnion, name, this.nameForNamedTypeWithNamespace(c), "_element");
                    }
                }
                else if (p.type.kind === "map") {
                    const mapType = p.type;
                    if (mapType.values instanceof Type_1.UnionType) {
                        const unionType = mapType.values;
                        const typesInUnion = [...unionType.getChildren()];
                        this.emitPatternMatches(typesInUnion, name, this.nameForNamedTypeWithNamespace(c), "_value");
                    }
                }
            });
            let propCount = 0;
            this.forEachClassProperty(c, "none", (_name, _jsonName, _p) => {
                propCount++;
            });
            const isEmpty = propCount ? false : true;
            this.ensureBlankLine();
            this.emitBlock([`def from_map(${isEmpty ? "_" : ""}m) do`], () => {
                this.emitLine("%", this.nameWithNamespace(moduleName), "{");
                this.indent(() => {
                    this.forEachClassProperty(c, "none", (name, jsonName, p) => {
                        jsonName = escapeDoubleQuotes(jsonName);
                        jsonName = escapeNewLines(jsonName);
                        const expression = this.fromDynamic(p.type, jsonName, name, p.isOptional);
                        this.emitLine(name, ": ", expression, ",");
                    });
                });
                this.emitLine("}");
            });
            this.ensureBlankLine();
            this.emitBlock("def from_json(json) do", () => {
                this.emitMultiline(`json
        |> Jason.decode!()
        |> from_map()`);
            });
            this.ensureBlankLine();
            this.emitBlock([`def to_map(${isEmpty ? "_" : ""}struct) do`], () => {
                this.emitLine("%{");
                this.indent(() => {
                    this.forEachClassProperty(c, "none", (name, jsonName, p) => {
                        const expression = this.toDynamic(p.type, name, p.isOptional);
                        this.emitLine([[`"${stringEscape(jsonName)}"`], [" => ", expression, ","]]);
                    });
                });
                this.emitLine("}");
            });
            this.ensureBlankLine();
            this.emitBlock("def to_json(struct) do", () => {
                this.emitMultiline(`struct
        |> to_map()
        |> Jason.encode!()`);
            });
        });
    }
    isValidAtom(str) {
        function isLetter(char) {
            return /^[A-Za-z_]$/.test(char);
        }
        function isLetterOrDigit(char) {
            return /^[A-Za-z0-9_]$/.test(char);
        }
        if (str.length === 0) {
            return false;
        }
        const firstChar = str[0];
        if (!isLetter(firstChar)) {
            return false;
        }
        for (let i = 1; i < str.length; i++) {
            const char = str[i];
            if (!isLetterOrDigit(char) && char !== "@" && !(i === str.length - 1 && (char === "!" || char === "?"))) {
                return false;
            }
        }
        return true;
    }
    emitEnum(e, enumName) {
        this.emitBlock(["defmodule ", this.nameWithNamespace(enumName), " do"], () => {
            this.emitDescription(this.descriptionForType(e));
            this.emitLine("@valid_enum_members [");
            this.indent(() => {
                this.forEachEnumCase(e, "none", (_name, json) => {
                    if (this.isValidAtom(json)) {
                        this.emitLine(":", json, ",");
                    }
                    else {
                        this.emitLine(":", `"${json}"`, ",");
                    }
                });
            });
            this.emitLine("]");
            this.ensureBlankLine();
            this.emitMultiline(`def valid_atom?(value), do: value in @valid_enum_members

def valid_atom_string?(value) do
    try do
        atom = String.to_existing_atom(value)
        atom in @valid_enum_members
    rescue
        ArgumentError -> false
    end
end

def encode(value) do
    if valid_atom?(value) do
        Atom.to_string(value)
    else
        {:error, "Unexpected value when encoding atom: #{inspect(value)}"}
    end
end

def decode(value) do
    if valid_atom_string?(value) do
        String.to_existing_atom(value)
    else
        {:error, "Unexpected value when decoding atom: #{inspect(value)}"}
    end
end

def from_json(json) do
    json
    |> Jason.decode!()
    |> decode()
end

def to_json(data) do
    data
    |> encode()
    |> Jason.encode!()
end`);
        });
    }
    emitUnion(_u, _unionName) {
        return;
    }
    emitSourceStructure() {
        if (this.leadingComments !== undefined) {
            this.emitComments(this.leadingComments);
        }
        else if (!this._options.justTypes) {
            this.emitMultiline(`# This file was autogenerated using quicktype https://github.com/quicktype/quicktype
#
# Add Jason to your mix.exs`);
            this.forEachTopLevel("none", (_topLevel, name) => {
                this.emitLine("#");
                this.emitLine("# Decode a JSON string: ", this.nameWithNamespace(name), ".from_json(data)");
                this.emitLine("# Encode into a JSON string: ", this.nameWithNamespace(name), ".to_json(struct)");
            });
        }
        this.ensureBlankLine();
        this.forEachNamedType("leading-and-interposing", (c, n) => this.emitModule(c, n), (e, n) => this.emitEnum(e, n), (u, n) => this.emitUnion(u, n));
        if (!this._options.justTypes) {
            this.forEachTopLevel("leading-and-interposing", (topLevel, name) => {
                const isTopLevelArray = "array" === topLevel.kind;
                this.emitBlock(["defmodule ", this.nameWithNamespace(name), " do"], () => {
                    var _a;
                    const description = (_a = this.descriptionForType(topLevel)) !== null && _a !== void 0 ? _a : [];
                    if (description.length) {
                        this.emitDescription([...description]);
                        this.ensureBlankLine();
                    }
                    if (isTopLevelArray) {
                        const arrayElement = topLevel.items;
                        let isUnion = false;
                        if (arrayElement instanceof Type_1.UnionType) {
                            this.emitPatternMatches([...arrayElement.getChildren()], "element", name);
                            isUnion = true;
                        }
                        this.emitBlock("def from_json(json) do", () => {
                            this.emitLine("json");
                            this.emitLine("|> Jason.decode!()");
                            this.emitLine("|> Enum.map(&", isUnion
                                ? ["decode_element/1)"]
                                : [this.nameWithNamespace(name), "Element.from_map/1)"]);
                        });
                        this.ensureBlankLine();
                        this.emitBlock("def to_json(list) do", () => {
                            this.emitLine("Enum.map(list, &", isUnion
                                ? ["encode_element/1)"]
                                : [this.nameWithNamespace(name), "Element.to_map/1)"]);
                            this.emitLine("|> Jason.encode!()");
                        });
                    }
                    else {
                        this.emitBlock("def from_json(json) do", () => {
                            this.emitLine("Jason.decode!(json)");
                        });
                        this.ensureBlankLine();
                        this.emitBlock("def to_json(data) do", () => {
                            this.emitLine("Jason.encode!(data)");
                        });
                    }
                });
            }, t => this.namedTypeToNameForTopLevel(t) === undefined);
        }
    }
}
exports.ElixirRenderer = ElixirRenderer;
