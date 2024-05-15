import { anyTypeIssueAnnotation, nullTypeIssueAnnotation } from "../Annotation";
import { ConvenienceRenderer } from "../ConvenienceRenderer";
import { DependencyName, funPrefixNamer } from "../Naming";
import { BooleanOption, StringOption, getOptionValues } from "../RendererOptions";
import { maybeAnnotated, modifySource } from "../Source";
import { allUpperWordStyle, camelCase, combineWords, firstUpperWordStyle, isLetterOrUnderscore, isLetterOrUnderscoreOrDigit, legalizeCharacters, splitIntoWords, stringEscape } from "../support/Strings";
import { assert, defined } from "../support/Support";
import { TargetLanguage } from "../TargetLanguage";
import { UnionType } from "../Type";
import { matchType, nullableFromUnion, removeNullFromUnion } from "../TypeUtils";
export const goOptions = {
    justTypes: new BooleanOption("just-types", "Plain types only", false),
    justTypesAndPackage: new BooleanOption("just-types-and-package", "Plain types with package only", false),
    packageName: new StringOption("package", "Generated package name", "NAME", "main"),
    multiFileOutput: new BooleanOption("multi-file-output", "Renders each top-level object in its own Go file", false),
    fieldTags: new StringOption("field-tags", "list of tags which should be generated for fields", "TAGS", "json"),
    omitEmpty: new BooleanOption("omit-empty", 'If set, all non-required objects will be tagged with ",omitempty"', false)
};
export class GoTargetLanguage extends TargetLanguage {
    constructor() {
        super("Go", ["go", "golang"], "go");
    }
    getOptions() {
        return [
            goOptions.justTypes,
            goOptions.justTypesAndPackage,
            goOptions.packageName,
            goOptions.multiFileOutput,
            goOptions.fieldTags,
            goOptions.omitEmpty
        ];
    }
    get supportsUnionsWithBothNumberTypes() {
        return true;
    }
    get stringTypeMapping() {
        const mapping = new Map();
        mapping.set("date-time", "date-time");
        return mapping;
    }
    get supportsOptionalClassProperties() {
        return true;
    }
    makeRenderer(renderContext, untypedOptionValues) {
        return new GoRenderer(this, renderContext, getOptionValues(goOptions, untypedOptionValues));
    }
    get defaultIndentation() {
        return "\t";
    }
}
const namingFunction = funPrefixNamer("namer", goNameStyle);
const legalizeName = legalizeCharacters(isLetterOrUnderscoreOrDigit);
function goNameStyle(original) {
    const words = splitIntoWords(original);
    return combineWords(words, legalizeName, firstUpperWordStyle, firstUpperWordStyle, allUpperWordStyle, allUpperWordStyle, "", isLetterOrUnderscore);
}
const primitiveValueTypeKinds = ["integer", "double", "bool", "string"];
const compoundTypeKinds = ["array", "class", "map", "enum"];
function isValueType(t) {
    const kind = t.kind;
    return primitiveValueTypeKinds.includes(kind) || kind === "class" || kind === "enum" || kind === "date-time";
}
function canOmitEmpty(cp, omitEmptyOption) {
    if (!cp.isOptional)
        return false;
    if (omitEmptyOption)
        return true;
    const t = cp.type;
    return !["union", "null", "any"].includes(t.kind);
}
export class GoRenderer extends ConvenienceRenderer {
    constructor(targetLanguage, renderContext, _options) {
        super(targetLanguage, renderContext);
        this._options = _options;
        this._topLevelUnmarshalNames = new Map();
    }
    makeNamedTypeNamer() {
        return namingFunction;
    }
    namerForObjectProperty() {
        return namingFunction;
    }
    makeUnionMemberNamer() {
        return namingFunction;
    }
    makeEnumCaseNamer() {
        return namingFunction;
    }
    get enumCasesInGlobalNamespace() {
        return true;
    }
    makeTopLevelDependencyNames(_, topLevelName) {
        const unmarshalName = new DependencyName(namingFunction, topLevelName.order, lookup => `unmarshal_${lookup(topLevelName)}`);
        this._topLevelUnmarshalNames.set(topLevelName, unmarshalName);
        return [unmarshalName];
    }
    /// startFile takes a file name, lowercases it, appends ".go" to it, and sets it as the current filename.
    startFile(basename) {
        if (this._options.multiFileOutput === false) {
            return;
        }
        assert(this._currentFilename === undefined, "Previous file wasn't finished: " + this._currentFilename);
        this._currentFilename = `${this.sourcelikeToString(basename)}.go`;
        this.initializeEmitContextForFilename(this._currentFilename);
    }
    /// endFile pushes the current file name onto the collection of finished files and then resets the current file name. These finished files are used in index.ts to write the output.
    endFile() {
        if (this._options.multiFileOutput === false) {
            return;
        }
        this.finishFile(defined(this._currentFilename));
        this._currentFilename = undefined;
    }
    emitBlock(line, f) {
        this.emitLine(line, " {");
        this.indent(f);
        this.emitLine("}");
    }
    emitFunc(decl, f) {
        this.emitBlock(["func ", decl], f);
    }
    emitStruct(name, table) {
        this.emitBlock(["type ", name, " struct"], () => this.emitTable(table));
    }
    nullableGoType(t, withIssues) {
        const goType = this.goType(t, withIssues);
        if (isValueType(t)) {
            return ["*", goType];
        }
        else {
            return goType;
        }
    }
    propertyGoType(cp) {
        const t = cp.type;
        if (t instanceof UnionType && nullableFromUnion(t) === null) {
            return ["*", this.goType(t, true)];
        }
        if (cp.isOptional) {
            return this.nullableGoType(t, true);
        }
        return this.goType(t, true);
    }
    goType(t, withIssues = false) {
        return matchType(t, _anyType => maybeAnnotated(withIssues, anyTypeIssueAnnotation, "interface{}"), _nullType => maybeAnnotated(withIssues, nullTypeIssueAnnotation, "interface{}"), _boolType => "bool", _integerType => "int64", _doubleType => "float64", _stringType => "string", arrayType => ["[]", this.goType(arrayType.items, withIssues)], classType => this.nameForNamedType(classType), mapType => {
            let valueSource;
            const v = mapType.values;
            if (v instanceof UnionType && nullableFromUnion(v) === null) {
                valueSource = ["*", this.nameForNamedType(v)];
            }
            else {
                valueSource = this.goType(v, withIssues);
            }
            return ["map[string]", valueSource];
        }, enumType => this.nameForNamedType(enumType), unionType => {
            const nullable = nullableFromUnion(unionType);
            if (nullable !== null)
                return this.nullableGoType(nullable, withIssues);
            return this.nameForNamedType(unionType);
        }, transformedStringType => {
            if (transformedStringType.kind === "date-time") {
                return "time.Time";
            }
            return "string";
        });
    }
    emitTopLevel(t, name) {
        this.startFile(name);
        if (this._options.multiFileOutput &&
            this._options.justTypes === false &&
            this._options.justTypesAndPackage === false &&
            this.leadingComments === undefined) {
            this.emitLineOnce("// This file was generated from JSON Schema using quicktype, do not modify it directly.");
            this.emitLineOnce("// To parse and unparse this JSON data, add this code to your project and do:");
            this.emitLineOnce("//");
            const ref = modifySource(camelCase, name);
            this.emitLineOnce("//    ", ref, ", err := ", defined(this._topLevelUnmarshalNames.get(name)), "(bytes)");
            this.emitLineOnce("//    bytes, err = ", ref, ".Marshal()");
        }
        this.emitPackageDefinitons(true);
        const unmarshalName = defined(this._topLevelUnmarshalNames.get(name));
        if (this.namedTypeToNameForTopLevel(t) === undefined) {
            this.emitLine("type ", name, " ", this.goType(t));
        }
        if (this._options.justTypes || this._options.justTypesAndPackage)
            return;
        this.ensureBlankLine();
        this.emitFunc([unmarshalName, "(data []byte) (", name, ", error)"], () => {
            this.emitLine("var r ", name);
            this.emitLine("err := json.Unmarshal(data, &r)");
            this.emitLine("return r, err");
        });
        this.ensureBlankLine();
        this.emitFunc(["(r *", name, ") Marshal() ([]byte, error)"], () => {
            this.emitLine("return json.Marshal(r)");
        });
        this.endFile();
    }
    emitClass(c, className) {
        this.startFile(className);
        let columns = [];
        const usedTypes = new Set();
        this.forEachClassProperty(c, "none", (name, jsonName, p) => {
            const description = this.descriptionForClassProperty(c, jsonName);
            const docStrings = description !== undefined && description.length > 0 ? description.map(d => "// " + d) : [];
            const goType = this.propertyGoType(p);
            const omitEmpty = canOmitEmpty(p, this._options.omitEmpty) ? ",omitempty" : [];
            docStrings.forEach(doc => columns.push([doc]));
            const tags = this._options.fieldTags
                .split(",")
                .map(tag => tag + ':"' + stringEscape(jsonName) + omitEmpty + '"')
                .join(" ");
            columns.push([
                [name, " "],
                [goType, " "],
                ["`", tags, "`"]
            ]);
            usedTypes.add(goType.toString());
        });
        this.emitPackageDefinitons(false, usedTypes.has("time.Time") || usedTypes.has("*,time.Time") || usedTypes.has("[],time.Time")
            ? new Set(["time"])
            : undefined);
        this.emitDescription(this.descriptionForType(c));
        this.emitStruct(className, columns);
        this.endFile();
    }
    emitEnum(e, enumName) {
        this.startFile(enumName);
        this.emitPackageDefinitons(false);
        this.emitDescription(this.descriptionForType(e));
        this.emitLine("type ", enumName, " string");
        this.ensureBlankLine();
        this.emitLine("const (");
        let columns = [];
        this.forEachEnumCase(e, "none", (name, jsonName) => {
            columns.push([
                [name, " "],
                [enumName, ' = "', stringEscape(jsonName), '"']
            ]);
        });
        this.indent(() => this.emitTable(columns));
        this.emitLine(")");
        this.endFile();
    }
    emitUnion(u, unionName) {
        this.startFile(unionName);
        this.emitPackageDefinitons(false);
        const [hasNull, nonNulls] = removeNullFromUnion(u);
        const isNullableArg = hasNull !== null ? "true" : "false";
        const ifMember = (kind, ifNotMember, f) => {
            const maybeType = u.findMember(kind);
            if (maybeType === undefined)
                return ifNotMember;
            return f(maybeType, this.nameForUnionMember(u, maybeType), this.goType(maybeType));
        };
        const maybeAssignNil = (kind) => {
            ifMember(kind, undefined, (_1, fieldName, _2) => {
                this.emitLine("x.", fieldName, " = nil");
            });
        };
        const makeArgs = (primitiveArg, compoundArg) => {
            const args = [];
            for (const kind of primitiveValueTypeKinds) {
                args.push(ifMember(kind, "nil", (_1, fieldName, _2) => primitiveArg(fieldName)), ", ");
            }
            for (const kind of compoundTypeKinds) {
                args.push(ifMember(kind, "false, nil", (t, fieldName, _) => compoundArg(t.kind === "class", fieldName)), ", ");
            }
            args.push(isNullableArg);
            return args;
        };
        let columns = [];
        this.forEachUnionMember(u, nonNulls, "none", null, (fieldName, t) => {
            const goType = this.nullableGoType(t, true);
            columns.push([[fieldName, " "], goType]);
        });
        this.emitDescription(this.descriptionForType(u));
        this.emitStruct(unionName, columns);
        if (this._options.justTypes || this._options.justTypesAndPackage)
            return;
        this.ensureBlankLine();
        this.emitFunc(["(x *", unionName, ") UnmarshalJSON(data []byte) error"], () => {
            for (const kind of compoundTypeKinds) {
                maybeAssignNil(kind);
            }
            ifMember("class", undefined, (_1, _2, goType) => {
                this.emitLine("var c ", goType);
            });
            const args = makeArgs(fn => ["&x.", fn], (isClass, fn) => {
                if (isClass) {
                    return "true, &c";
                }
                else {
                    return ["true, &x.", fn];
                }
            });
            this.emitLine("object, err := unmarshalUnion(data, ", args, ")");
            this.emitBlock("if err != nil", () => {
                this.emitLine("return err");
            });
            this.emitBlock("if object", () => {
                ifMember("class", undefined, (_1, fieldName, _2) => {
                    this.emitLine("x.", fieldName, " = &c");
                });
            });
            this.emitLine("return nil");
        });
        this.ensureBlankLine();
        this.emitFunc(["(x *", unionName, ") MarshalJSON() ([]byte, error)"], () => {
            const args = makeArgs(fn => ["x.", fn], (_, fn) => ["x.", fn, " != nil, x.", fn]);
            this.emitLine("return marshalUnion(", args, ")");
        });
        this.endFile();
    }
    emitSingleFileHeaderComments() {
        this.emitLineOnce("// This file was generated from JSON Schema using quicktype, do not modify it directly.");
        this.emitLineOnce("// To parse and unparse this JSON data, add this code to your project and do:");
        this.forEachTopLevel("none", (_, name) => {
            this.emitLine("//");
            const ref = modifySource(camelCase, name);
            this.emitLine("//    ", ref, ", err := ", defined(this._topLevelUnmarshalNames.get(name)), "(bytes)");
            this.emitLine("//    bytes, err = ", ref, ".Marshal()");
        });
    }
    emitPackageDefinitons(includeJSONEncodingImport, imports = new Set()) {
        if (!this._options.justTypes || this._options.justTypesAndPackage) {
            this.ensureBlankLine();
            const packageDeclaration = "package " + this._options.packageName;
            this.emitLineOnce(packageDeclaration);
            this.ensureBlankLine();
        }
        if (!this._options.justTypes && !this._options.justTypesAndPackage) {
            if (this.haveNamedUnions && this._options.multiFileOutput === false) {
                imports.add("bytes");
                imports.add("errors");
            }
            if (includeJSONEncodingImport) {
                imports.add("encoding/json");
            }
        }
        this.emitImports(imports);
    }
    emitImports(imports) {
        const sortedImports = Array.from(imports).sort((a, b) => a.localeCompare(b));
        if (sortedImports.length === 0) {
            return;
        }
        sortedImports.forEach(packageName => {
            this.emitLineOnce(`import "${packageName}"`);
        });
        this.ensureBlankLine();
    }
    emitHelperFunctions() {
        if (this.haveNamedUnions) {
            this.startFile("JSONSchemaSupport");
            const imports = new Set();
            if (this._options.multiFileOutput) {
                imports.add("bytes");
                imports.add("errors");
            }
            this.emitPackageDefinitons(true, imports);
            this.ensureBlankLine();
            this
                .emitMultiline(`func unmarshalUnion(data []byte, pi **int64, pf **float64, pb **bool, ps **string, haveArray bool, pa interface{}, haveObject bool, pc interface{}, haveMap bool, pm interface{}, haveEnum bool, pe interface{}, nullable bool) (bool, error) {
    if pi != nil {
        *pi = nil
    }
    if pf != nil {
        *pf = nil
    }
    if pb != nil {
        *pb = nil
    }
    if ps != nil {
        *ps = nil
    }

    dec := json.NewDecoder(bytes.NewReader(data))
    dec.UseNumber()
    tok, err := dec.Token()
    if err != nil {
        return false, err
    }

    switch v := tok.(type) {
    case json.Number:
        if pi != nil {
            i, err := v.Int64()
            if err == nil {
                *pi = &i
                return false, nil
            }
        }
        if pf != nil {
            f, err := v.Float64()
            if err == nil {
                *pf = &f
                return false, nil
            }
            return false, errors.New("Unparsable number")
        }
        return false, errors.New("Union does not contain number")
    case float64:
        return false, errors.New("Decoder should not return float64")
    case bool:
        if pb != nil {
            *pb = &v
            return false, nil
        }
        return false, errors.New("Union does not contain bool")
    case string:
        if haveEnum {
            return false, json.Unmarshal(data, pe)
        }
        if ps != nil {
            *ps = &v
            return false, nil
        }
        return false, errors.New("Union does not contain string")
    case nil:
        if nullable {
            return false, nil
        }
        return false, errors.New("Union does not contain null")
    case json.Delim:
        if v == '{' {
            if haveObject {
                return true, json.Unmarshal(data, pc)
            }
            if haveMap {
                return false, json.Unmarshal(data, pm)
            }
            return false, errors.New("Union does not contain object")
        }
        if v == '[' {
            if haveArray {
                return false, json.Unmarshal(data, pa)
            }
            return false, errors.New("Union does not contain array")
        }
        return false, errors.New("Cannot handle delimiter")
    }
    return false, errors.New("Cannot unmarshal union")

}

func marshalUnion(pi *int64, pf *float64, pb *bool, ps *string, haveArray bool, pa interface{}, haveObject bool, pc interface{}, haveMap bool, pm interface{}, haveEnum bool, pe interface{}, nullable bool) ([]byte, error) {
    if pi != nil {
        return json.Marshal(*pi)
    }
    if pf != nil {
        return json.Marshal(*pf)
    }
    if pb != nil {
        return json.Marshal(*pb)
    }
    if ps != nil {
        return json.Marshal(*ps)
    }
    if haveArray {
        return json.Marshal(pa)
    }
    if haveObject {
        return json.Marshal(pc)
    }
    if haveMap {
        return json.Marshal(pm)
    }
    if haveEnum {
        return json.Marshal(pe)
    }
    if nullable {
        return json.Marshal(nil)
    }
    return nil, errors.New("Union must not be null")
}`);
            this.endFile();
        }
    }
    emitSourceStructure() {
        if (this._options.multiFileOutput === false &&
            this._options.justTypes === false &&
            this._options.justTypesAndPackage === false &&
            this.leadingComments === undefined) {
            this.emitSingleFileHeaderComments();
            this.emitPackageDefinitons(false, this.collectAllImports());
        }
        this.forEachTopLevel("leading-and-interposing", (t, name) => this.emitTopLevel(t, name), t => !(this._options.justTypes || this._options.justTypesAndPackage) ||
            this.namedTypeToNameForTopLevel(t) === undefined);
        this.forEachObject("leading-and-interposing", (c, className) => this.emitClass(c, className));
        this.forEachEnum("leading-and-interposing", (u, enumName) => this.emitEnum(u, enumName));
        this.forEachUnion("leading-and-interposing", (u, unionName) => this.emitUnion(u, unionName));
        if (this._options.justTypes || this._options.justTypesAndPackage) {
            return;
        }
        this.emitHelperFunctions();
    }
    collectAllImports() {
        let imports = new Set();
        this.forEachObject("leading-and-interposing", (c, _className) => {
            const classImports = this.collectClassImports(c);
            imports = new Set([...imports, ...classImports]);
        });
        this.forEachUnion("leading-and-interposing", (u, _unionName) => {
            const unionImports = this.collectUnionImports(u);
            imports = new Set([...imports, ...unionImports]);
        });
        return imports;
    }
    collectClassImports(c) {
        const usedTypes = new Set();
        const mapping = new Map();
        mapping.set("time.Time", "time");
        mapping.set("*,time.Time", "time");
        mapping.set("[],time.Time", "time");
        this.forEachClassProperty(c, "none", (_name, _jsonName, p) => {
            const goType = this.propertyGoType(p);
            usedTypes.add(goType.toString());
        });
        const imports = new Set();
        usedTypes.forEach(k => {
            const typeImport = mapping.get(k);
            if (typeImport) {
                imports.add(typeImport);
            }
        });
        return imports;
    }
    collectUnionImports(u) {
        const usedTypes = new Set();
        const mapping = new Map();
        mapping.set("time.Time", "time");
        mapping.set("*,time.Time", "time");
        this.forEachUnionMember(u, null, "none", null, (_fieldName, t) => {
            const goType = this.nullableGoType(t, true);
            usedTypes.add(goType.toString());
        });
        const imports = new Set();
        usedTypes.forEach(k => {
            const typeImport = mapping.get(k);
            if (!typeImport) {
                return;
            }
            imports.add(typeImport);
        });
        return imports;
    }
}
