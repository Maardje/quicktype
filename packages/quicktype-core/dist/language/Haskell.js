import { mapContains } from "collection-utils";
import { ConvenienceRenderer } from "../ConvenienceRenderer";
import { funPrefixNamer } from "../Naming";
import { BooleanOption, EnumOption, StringOption, getOptionValues } from "../RendererOptions";
import { multiWord, parenIfNeeded, singleWord } from "../Source";
import { allLowerWordStyle, allUpperWordStyle, combineWords, firstUpperWordStyle, isAscii, isLetterOrUnderscore, isLetterOrUnderscoreOrDigit, legalizeCharacters, splitIntoWords, stringEscape } from "../support/Strings";
import { TargetLanguage } from "../TargetLanguage";
import { matchType, nullableFromUnion } from "../TypeUtils";
export const haskellOptions = {
    justTypes: new BooleanOption("just-types", "Plain types only", false),
    useList: new EnumOption("array-type", "Use Array or List", [
        ["array", false],
        ["list", true]
    ]),
    moduleName: new StringOption("module", "Generated module name", "NAME", "QuickType")
};
export class HaskellTargetLanguage extends TargetLanguage {
    constructor() {
        super("Haskell", ["haskell"], "haskell");
    }
    getOptions() {
        return [haskellOptions.justTypes, haskellOptions.moduleName, haskellOptions.useList];
    }
    get supportsOptionalClassProperties() {
        return true;
    }
    get supportsUnionsWithBothNumberTypes() {
        return true;
    }
    makeRenderer(renderContext, untypedOptionValues) {
        return new HaskellRenderer(this, renderContext, getOptionValues(haskellOptions, untypedOptionValues));
    }
}
const forbiddenNames = [
    // reserved keywords
    "as",
    "case",
    "class",
    "data",
    "default",
    "deriving",
    "do",
    "else",
    "family",
    "forall",
    "foreign",
    "hiding",
    "if",
    "import",
    "in",
    "infix",
    "infixl",
    "infixr",
    "instance",
    "let",
    "of",
    "mdo",
    "module",
    "newtype",
    "proc",
    "qualified",
    "rec",
    "then",
    "type",
    "where",
    // in Prelude keywords ...
    "id",
    "Array",
    "HashMap",
    "Map",
    "Maybe",
    "Bool",
    "Int",
    "True",
    "False",
    "Enum",
    // Aeson types
    "encode",
    "decode",
    "text",
    "Text",
    "Value",
    "Object",
    "Result",
    "Series",
    "Error"
];
const legalizeName = legalizeCharacters(cp => isAscii(cp) && isLetterOrUnderscoreOrDigit(cp));
function haskellNameStyle(original, upper) {
    const words = splitIntoWords(original);
    return combineWords(words, legalizeName, upper ? firstUpperWordStyle : allLowerWordStyle, firstUpperWordStyle, upper ? allUpperWordStyle : allLowerWordStyle, allUpperWordStyle, "", isLetterOrUnderscore);
}
const upperNamingFunction = funPrefixNamer("upper", n => haskellNameStyle(n, true));
const lowerNamingFunction = funPrefixNamer("lower", n => haskellNameStyle(n, false));
export class HaskellRenderer extends ConvenienceRenderer {
    constructor(targetLanguage, renderContext, _options) {
        super(targetLanguage, renderContext);
        this._options = _options;
    }
    forbiddenNamesForGlobalNamespace() {
        return forbiddenNames;
    }
    makeNamedTypeNamer() {
        return upperNamingFunction;
    }
    namerForObjectProperty() {
        return lowerNamingFunction;
    }
    forbiddenForObjectProperties(_c, _className) {
        return { names: [], includeGlobalForbidden: true };
    }
    makeUnionMemberNamer() {
        return upperNamingFunction;
    }
    get unionMembersInGlobalNamespace() {
        return true;
    }
    makeEnumCaseNamer() {
        return upperNamingFunction;
    }
    get enumCasesInGlobalNamespace() {
        return true;
    }
    proposeUnionMemberName(u, unionName, fieldType, lookup) {
        const fieldName = super.proposeUnionMemberName(u, unionName, fieldType, lookup);
        return `${fieldName}_in_${lookup(unionName)}`;
    }
    get commentLineStart() {
        return "-- ";
    }
    emitDescriptionBlock(lines) {
        if (lines.length === 1) {
            this.emitComments([{ customLines: lines, lineStart: "{-| ", lineEnd: " -}" }]);
        }
        else {
            this.emitCommentLines(lines, {
                firstLineStart: "{-| ",
                lineStart: "",
                afterComment: "-}"
            });
        }
    }
    haskellType(t, noOptional = false) {
        return matchType(t, _anyType => multiWord(" ", "Maybe", "Text"), _nullType => multiWord(" ", "Maybe", "Text"), _boolType => singleWord("Bool"), _integerType => singleWord("Int"), _doubleType => singleWord("Float"), _stringType => singleWord("Text"), arrayType => {
            if (this._options.useList) {
                return multiWord("", "[", parenIfNeeded(this.haskellType(arrayType.items)), "]");
            }
            return multiWord(" ", "Vector", parenIfNeeded(this.haskellType(arrayType.items)));
        }, classType => singleWord(this.nameForNamedType(classType)), mapType => multiWord(" ", "HashMap Text", parenIfNeeded(this.haskellType(mapType.values))), enumType => singleWord(this.nameForNamedType(enumType)), unionType => {
            const nullable = nullableFromUnion(unionType);
            if (nullable !== null) {
                const nullableType = this.haskellType(nullable);
                if (noOptional)
                    return nullableType;
                return multiWord(" ", "Maybe", parenIfNeeded(nullableType));
            }
            return singleWord(this.nameForNamedType(unionType));
        });
    }
    haskellProperty(p) {
        if (p.isOptional) {
            return multiWord(" ", "Maybe", parenIfNeeded(this.haskellType(p.type, true))).source;
        }
        else {
            return this.haskellType(p.type).source;
        }
    }
    encoderNameForType(t) {
        return matchType(t, _anyType => singleWord("String"), _nullType => singleWord("Null"), _boolType => singleWord("Bool"), _integerType => singleWord("Number"), _doubleType => singleWord("Number"), _stringType => singleWord("String"), _arrayType => singleWord("Array"), _classType => singleWord("Object"), _mapType => singleWord("Object"), _enumType => singleWord("Object"), _unionType => singleWord("Object"));
    }
    emitTopLevelDefinition(t, topLevelName) {
        this.emitLine("type ", topLevelName, " = ", this.haskellType(t).source);
    }
    emitClassDefinition(c, className) {
        let description = this.descriptionForType(c);
        this.forEachClassProperty(c, "none", (name, jsonName) => {
            const propertyDescription = this.descriptionForClassProperty(c, jsonName);
            if (propertyDescription === undefined)
                return;
            if (description === undefined) {
                description = [];
            }
            else {
                description.push("");
            }
            description.push(`${this.sourcelikeToString(name)}:`);
            description.push(...propertyDescription);
        });
        this.emitDescription(description);
        this.emitLine("data ", className, " = ", className);
        this.indent(() => {
            let onFirst = true;
            this.forEachClassProperty(c, "none", (name, _jsonName, p) => {
                this.emitLine(onFirst ? "{ " : ", ", name, className, " :: ", this.haskellProperty(p));
                onFirst = false;
            });
            if (onFirst) {
                this.emitLine("{");
            }
            this.emitLine("} deriving (Show)");
        });
    }
    emitEnumDefinition(e, enumName) {
        this.emitDescription(this.descriptionForType(e));
        this.emitLine("data ", enumName);
        this.indent(() => {
            let onFirst = true;
            this.forEachEnumCase(e, "none", name => {
                const equalsOrPipe = onFirst ? "=" : "|";
                this.emitLine(equalsOrPipe, " ", name, enumName);
                onFirst = false;
            });
            this.emitLine("deriving (Show)");
        });
    }
    emitUnionDefinition(u, unionName) {
        this.emitDescription(this.descriptionForType(u));
        this.emitLine("data ", unionName);
        this.indent(() => {
            let onFirst = true;
            this.forEachUnionMember(u, null, "none", null, (constructor, t) => {
                const equalsOrPipe = onFirst ? "=" : "|";
                if (t.kind === "null") {
                    this.emitLine(equalsOrPipe, " ", constructor);
                }
                else {
                    this.emitLine(equalsOrPipe, " ", constructor, " ", parenIfNeeded(this.haskellType(t)));
                }
                onFirst = false;
            });
            this.emitLine("deriving (Show)");
        });
    }
    emitTopLevelFunctions(topLevelName) {
        this.emitLine("decodeTopLevel :: ByteString -> Maybe ", topLevelName);
        this.emitLine("decodeTopLevel = decode");
    }
    classPropertyLength(c) {
        let counter = 0;
        this.forEachClassProperty(c, "none", () => {
            counter += 1;
        });
        return counter;
    }
    emitClassEncoderInstance(c, className) {
        let classProperties = [];
        this.forEachClassProperty(c, "none", name => {
            classProperties.push(" ");
            classProperties.push(name);
            classProperties.push(className);
        });
        this.emitLine("instance ToJSON ", className, " where");
        this.indent(() => {
            if (classProperties.length === 0) {
                this.emitLine("toJSON = \\_ -> emptyObject");
            }
            else {
                this.emitLine("toJSON (", className, ...classProperties, ") =");
                this.indent(() => {
                    this.emitLine("object");
                    let onFirst = true;
                    this.forEachClassProperty(c, "none", (name, jsonName) => {
                        this.emitLine(onFirst ? "[ " : ", ", '"', stringEscape(jsonName), '" .= ', name, className);
                        onFirst = false;
                    });
                    if (onFirst) {
                        this.emitLine("[");
                    }
                    this.emitLine("]");
                });
            }
        });
    }
    emitClassDecoderInstance(c, className) {
        this.emitLine("instance FromJSON ", className, " where");
        this.indent(() => {
            if (this.classPropertyLength(c) === 0) {
                this.emitLine("parseJSON emptyObject = return ", className);
            }
            else {
                this.emitLine("parseJSON (Object v) = ", className);
                this.indent(() => {
                    let onFirst = true;
                    this.forEachClassProperty(c, "none", (_, jsonName, p) => {
                        const operator = p.isOptional ? ".:?" : ".:";
                        this.emitLine(onFirst ? "<$> " : "<*> ", "v ", operator, ' "', stringEscape(jsonName), '"');
                        onFirst = false;
                    });
                });
            }
        });
    }
    emitClassFunctions(c, className) {
        this.emitClassEncoderInstance(c, className);
        this.ensureBlankLine();
        this.emitClassDecoderInstance(c, className);
    }
    emitEnumEncoderInstance(e, enumName) {
        this.emitLine("instance ToJSON ", enumName, " where");
        this.indent(() => {
            this.forEachEnumCase(e, "none", (name, jsonName) => {
                this.emitLine("toJSON ", name, enumName, ' = "', stringEscape(jsonName), '"');
            });
        });
    }
    emitEnumDecoderInstance(e, enumName) {
        this.emitLine("instance FromJSON ", enumName, " where");
        this.indent(() => {
            this.emitLine('parseJSON = withText "', enumName, '" parseText');
            this.indent(() => {
                this.emitLine("where");
                this.indent(() => {
                    this.forEachEnumCase(e, "none", (name, jsonName) => {
                        this.emitLine('parseText "', stringEscape(jsonName), '" = return ', name, enumName);
                    });
                });
            });
        });
    }
    emitEnumFunctions(e, enumName) {
        this.emitEnumEncoderInstance(e, enumName);
        this.ensureBlankLine();
        this.emitEnumDecoderInstance(e, enumName);
    }
    emitUnionEncoderInstance(u, unionName) {
        this.emitLine("instance ToJSON ", unionName, " where");
        this.indent(() => {
            this.forEachUnionMember(u, null, "none", null, (constructor, t) => {
                if (t.kind === "null") {
                    this.emitLine("toJSON ", constructor, " = Null");
                }
                else {
                    this.emitLine("toJSON (", constructor, " x) = toJSON x");
                }
            });
        });
    }
    emitUnionDecoderInstance(u, unionName) {
        this.emitLine("instance FromJSON ", unionName, " where");
        this.indent(() => {
            this.forEachUnionMember(u, null, "none", null, (constructor, t) => {
                if (t.kind === "null") {
                    this.emitLine("parseJSON Null = return ", constructor);
                }
                else {
                    this.emitLine("parseJSON xs@(", this.encoderNameForType(t).source, " _) = (fmap ", constructor, " . parseJSON) xs");
                }
            });
        });
    }
    emitUnionFunctions(u, unionName) {
        this.emitUnionEncoderInstance(u, unionName);
        this.ensureBlankLine();
        this.emitUnionDecoderInstance(u, unionName);
    }
    emitLanguageExtensions(ext) {
        this.emitLine(`{-# LANGUAGE ${ext} #-}`);
    }
    emitSourceStructure() {
        const exports = [];
        this.forEachTopLevel("none", (_, name) => {
            exports.push([name, " (..)"]);
        });
        this.forEachObject("none", (t, name) => {
            if (!mapContains(this.topLevels, t))
                exports.push([name, " (..)"]);
        });
        this.forEachEnum("none", (t, name) => {
            if (!mapContains(this.topLevels, t))
                exports.push([name, " (..)"]);
        });
        this.forEachUnion("none", (t, name) => {
            if (!mapContains(this.topLevels, t))
                exports.push([name, " (..)"]);
        });
        this.emitLanguageExtensions("StrictData");
        this.emitLanguageExtensions("OverloadedStrings");
        if (!this._options.justTypes) {
            this.ensureBlankLine();
            this.emitLine("module ", this._options.moduleName);
            this.indent(() => {
                for (let i = 0; i < exports.length; i++) {
                    this.emitLine(i === 0 ? "(" : ",", " ", exports[i]);
                }
                this.emitLine(", decodeTopLevel");
                this.emitLine(") where");
            });
            this.ensureBlankLine();
            this.emitMultiline(`import Data.Aeson
import Data.Aeson.Types (emptyObject)
import Data.ByteString.Lazy (ByteString)
import Data.HashMap.Strict (HashMap)
import Data.Text (Text)`);
            if (this._options.useList) {
                // this.emitLine("import List (map)");
            }
            else {
                this.emitLine("import Data.Vector (Vector)");
            }
        }
        this.forEachTopLevel("leading-and-interposing", (t, topLevelName) => this.emitTopLevelDefinition(t, topLevelName), t => this.namedTypeToNameForTopLevel(t) === undefined);
        this.forEachNamedType("leading-and-interposing", (c, className) => this.emitClassDefinition(c, className), (e, enumName) => this.emitEnumDefinition(e, enumName), (u, unionName) => this.emitUnionDefinition(u, unionName));
        this.forEachTopLevel("leading-and-interposing", (_, topLevelName) => this.emitTopLevelFunctions(topLevelName));
        this.forEachNamedType("leading-and-interposing", (c, className) => this.emitClassFunctions(c, className), (e, enumName) => this.emitEnumFunctions(e, enumName), (u, unionName) => this.emitUnionFunctions(u, unionName));
        if (this._options.justTypes)
            return;
        this.ensureBlankLine();
    }
}
