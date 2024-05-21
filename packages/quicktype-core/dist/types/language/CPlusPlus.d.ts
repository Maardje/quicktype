import { ConvenienceRenderer, type ForbiddenWordsInfo } from "../ConvenienceRenderer";
import { type Declaration } from "../DeclarationIR";
import { type Name, type Namer } from "../Naming";
import { type RenderContext } from "../Renderer";
import { BooleanOption, EnumOption, type Option, type OptionValues, StringOption } from "../RendererOptions";
import { type Sourcelike } from "../Source";
import { type NamingStyle } from "../support/Strings";
import { TargetLanguage } from "../TargetLanguage";
import { type ClassProperty, ClassType, EnumType, type Type, type TypeKind, UnionType } from "../Type";
import { type FixMeOptionsAnyType, type FixMeOptionsType } from "../types";
export declare const cPlusPlusOptions: {
    typeSourceStyle: EnumOption<boolean>;
    includeLocation: EnumOption<boolean>;
    codeFormat: EnumOption<boolean>;
    wstring: EnumOption<boolean>;
    westConst: EnumOption<boolean>;
    justTypes: BooleanOption;
    namespace: StringOption;
    enumType: StringOption;
    typeNamingStyle: EnumOption<NamingStyle>;
    memberNamingStyle: EnumOption<NamingStyle>;
    enumeratorNamingStyle: EnumOption<NamingStyle>;
    boost: BooleanOption;
    hideNullOptional: BooleanOption;
};
export declare class CPlusPlusTargetLanguage extends TargetLanguage {
    constructor(displayName?: string, names?: string[], extension?: string);
    protected getOptions(): Array<Option<FixMeOptionsAnyType>>;
    get supportsUnionsWithBothNumberTypes(): boolean;
    get supportsOptionalClassProperties(): boolean;
    protected makeRenderer(renderContext: RenderContext, untypedOptionValues: FixMeOptionsType): CPlusPlusRenderer;
}
/**
 * To be able to support circles in multiple files -
 * e.g. class#A using class#B using class#A (obviously not directly,
 * but in vector or in variant) we can forward declare them;
 */
export declare enum IncludeKind {
    ForwardDeclare = "ForwardDeclare",
    Include = "Include"
}
export declare enum GlobalNames {
    ClassMemberConstraints = 1,
    ClassMemberConstraintException = 2,
    ValueTooLowException = 3,
    ValueTooHighException = 4,
    ValueTooShortException = 5,
    ValueTooLongException = 6,
    InvalidPatternException = 7,
    CheckConstraint = 8
}
export declare enum MemberNames {
    MinIntValue = 1,
    GetMinIntValue = 2,
    SetMinIntValue = 3,
    MaxIntValue = 4,
    GetMaxIntValue = 5,
    SetMaxIntValue = 6,
    MinDoubleValue = 7,
    GetMinDoubleValue = 8,
    SetMinDoubleValue = 9,
    MaxDoubleValue = 10,
    GetMaxDoubleValue = 11,
    SetMaxDoubleValue = 12,
    MinLength = 13,
    GetMinLength = 14,
    SetMinLength = 15,
    MaxLength = 16,
    GetMaxLength = 17,
    SetMaxLength = 18,
    Pattern = 19,
    GetPattern = 20,
    SetPattern = 21
}
interface ConstraintMember {
    cppConstType?: string;
    cppType: string;
    getter: MemberNames;
    name: MemberNames;
    setter: MemberNames;
}
export interface IncludeRecord {
    kind: IncludeKind | undefined /** How to include that */;
    typeKind: TypeKind | undefined /** What exactly to include */;
}
export interface TypeRecord {
    forceInclude: boolean;
    level: number;
    name: Name;
    type: Type;
    variant: boolean;
}
/**
 * We map each and every unique type to a include kind, e.g. how
 * to include the given type
 */
export type IncludeMap = Map<string, IncludeRecord>;
export interface TypeContext {
    inJsonNamespace: boolean;
    needsForwardIndirection: boolean;
    needsOptionalIndirection: boolean;
}
declare class WrappingCode {
    private readonly start;
    private readonly end;
    constructor(start: Sourcelike[], end: Sourcelike[]);
    wrap(qualifier: Sourcelike, inner: Sourcelike): Sourcelike;
}
export declare class CPlusPlusRenderer extends ConvenienceRenderer {
    private readonly _options;
    /**
     * For forward declaration practically
     */
    private readonly _enumType;
    private readonly _generatedFiles;
    private _currentFilename;
    private _allTypeNames;
    private readonly _gettersAndSettersForPropertyName;
    private readonly _namespaceNames;
    private readonly _memberNameStyle;
    private readonly _namedTypeNameStyle;
    private readonly _generatedGlobalNames;
    private readonly _generatedMemberNames;
    private readonly _forbiddenGlobalNames;
    private readonly _memberNamingFunction;
    private readonly _stringType;
    private readonly _optionalType;
    private readonly _optionalFactory;
    private readonly _nulloptType;
    private readonly _variantType;
    private readonly _variantIndexMethodName;
    protected readonly typeNamingStyle: NamingStyle;
    protected readonly enumeratorNamingStyle: NamingStyle;
    constructor(targetLanguage: TargetLanguage, renderContext: RenderContext, _options: OptionValues<typeof cPlusPlusOptions>);
    private isUnion;
    private isOptionalAsValuePossible;
    isImplicitCycleBreaker(t: Type): boolean;
    private optionalTypeStack;
    private optionalFactoryStack;
    private optionalTypeHeap;
    private optionalFactoryHeap;
    private optionalType;
    private optionalTypeLabel;
    protected getConstraintMembers(): ConstraintMember[];
    protected lookupGlobalName(type: GlobalNames): string;
    protected lookupMemberName(type: MemberNames): string;
    protected addGlobalName(type: GlobalNames): void;
    protected addMemberName(type: MemberNames): void;
    protected setupGlobalNames(): void;
    protected forbiddenNamesForGlobalNamespace(): string[];
    protected forbiddenForObjectProperties(_c: ClassType, _className: Name): ForbiddenWordsInfo;
    protected forbiddenForEnumCases(_e: EnumType, _enumName: Name): ForbiddenWordsInfo;
    protected makeNamedTypeNamer(): Namer;
    protected namerForObjectProperty(): Namer;
    protected makeUnionMemberNamer(): null;
    protected makeEnumCaseNamer(): Namer;
    protected makeNamesForPropertyGetterAndSetter(_c: ClassType, _className: Name, _p: ClassProperty, _jsonName: string, name: Name): [Name, Name, Name];
    protected makePropertyDependencyNames(c: ClassType, className: Name, p: ClassProperty, jsonName: string, name: Name): Name[];
    protected withConst(s: Sourcelike): Sourcelike;
    protected emitInclude(global: boolean, name: Sourcelike): void;
    protected startFile(basename: Sourcelike, includeHelper?: boolean): void;
    protected finishFile(): void;
    protected get needsTypeDeclarationBeforeUse(): boolean;
    protected canBeForwardDeclared(t: Type): boolean;
    protected emitDescriptionBlock(lines: Sourcelike[]): void;
    protected emitBlock(line: Sourcelike, withSemicolon: boolean, f: () => void, withIndent?: boolean): void;
    protected emitNamespaces(namespaceNames: Iterable<string>, f: () => void): void;
    protected cppTypeInOptional(nonNulls: ReadonlySet<Type>, ctx: TypeContext, withIssues: boolean, forceNarrowString: boolean): Sourcelike;
    protected variantType(u: UnionType, inJsonNamespace: boolean): Sourcelike;
    protected ourQualifier(inJsonNamespace: boolean): Sourcelike;
    protected jsonQualifier(inJsonNamespace: boolean): Sourcelike;
    protected variantIndirection(type: Type, needIndirection: boolean, typeSrc: Sourcelike): Sourcelike;
    protected cppType(t: Type, ctx: TypeContext, withIssues: boolean, forceNarrowString: boolean, isOptional: boolean): Sourcelike;
    /**
     * similar to cppType, it practically gathers all the generated types within
     * 't'. It also records, whether a given sub-type is part of a variant or not.
     */
    protected generatedTypes(isClassMember: boolean, theType: Type): TypeRecord[];
    protected constraintMember(jsonName: string): string;
    protected emitMember(cppType: Sourcelike, name: Sourcelike): void;
    protected emitClassMembers(c: ClassType, constraints: Map<string, Sourcelike> | undefined): void;
    protected generateClassConstraints(c: ClassType): Map<string, Sourcelike> | undefined;
    protected emitClass(c: ClassType, className: Name): void;
    protected emitTopLevelHeaders(t: Type, className: Name): void;
    protected emitClassHeaders(className: Name): void;
    protected emitTopLevelFunction(t: Type, className: Name): void;
    protected emitClassFunctions(c: ClassType, className: Name): void;
    protected emitEnum(e: EnumType, enumName: Name): void;
    protected emitUnionTypedefs(u: UnionType, unionName: Name): void;
    protected emitUnionHeaders(u: UnionType): void;
    protected emitUnionFunctions(u: UnionType): void;
    protected emitEnumHeaders(enumName: Name): void;
    private isLargeEnum;
    protected emitEnumFunctions(e: EnumType, enumName: Name): void;
    protected emitTopLevelTypedef(t: Type, name: Name): void;
    protected emitAllUnionFunctions(): void;
    protected emitAllUnionHeaders(): void;
    protected emitOptionalHelpers(): void;
    protected emitDeclaration(decl: Declaration): void;
    protected emitGetterSetter(t: string, getterName: string, setterName: string, memberName: string): void;
    protected emitNumericCheckConstraints(checkConst: string, classConstraint: string, getterMinValue: string, getterMaxValue: string, cppType: string): void;
    protected emitConstraintClasses(): void;
    protected emitHelperFunctions(): void;
    protected emitExtraIncludes(): void;
    protected emitHelper(): void;
    protected emitTypes(): void;
    protected gatherUserNamespaceForwardDecls(): Sourcelike[];
    protected gatherNlohmannNamespaceForwardDecls(): Sourcelike[];
    protected emitUserNamespaceImpls(): void;
    protected emitNlohmannNamespaceImpls(): void;
    protected emitGenerators(): void;
    protected emitSingleSourceStructure(proposedFilename: string): void;
    protected updateIncludes(isClassMember: boolean, includes: IncludeMap, propertyType: Type, _defName: string): void;
    protected emitIncludes(c: ClassType | UnionType | EnumType, defName: string): void;
    protected emitDefinition(d: ClassType | EnumType | UnionType, defName: Name): void;
    protected emitMultiSourceStructure(proposedFilename: string): void;
    protected emitSourceStructure(proposedFilename: string): void;
    protected isConversionRequired(t: Type): boolean;
    NarrowString: {
        wrapEncodingChange(_qualifier: Sourcelike[], _fromType: Sourcelike, _toType: Sourcelike, inner: Sourcelike): Sourcelike;
        emitHelperFunctions(): void;
        _stringType: string;
        _constStringType: string;
        _smatch: string;
        _regex: string;
        _stringLiteralPrefix: string;
        _toString: WrappingCode;
        _encodingClass: Sourcelike;
        _encodingFunction: Sourcelike;
        getType(): string;
        getConstType(): string;
        getSMatch(): string;
        getRegex(): string;
        createStringLiteral(inner: Sourcelike): Sourcelike;
        wrapToString(inner: Sourcelike): Sourcelike;
    };
    WideString: {
        superThis: CPlusPlusRenderer;
        wrapEncodingChange(qualifier: Sourcelike[], fromType: Sourcelike, toType: Sourcelike, inner: Sourcelike): Sourcelike;
        emitHelperFunctions(): void;
        _stringType: string;
        _constStringType: string;
        _smatch: string;
        _regex: string;
        _stringLiteralPrefix: string;
        _toString: WrappingCode;
        _encodingClass: Sourcelike;
        _encodingFunction: Sourcelike;
        getType(): string;
        getConstType(): string;
        getSMatch(): string;
        getRegex(): string;
        createStringLiteral(inner: Sourcelike): Sourcelike;
        wrapToString(inner: Sourcelike): Sourcelike;
    };
}
export {};
