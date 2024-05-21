import { ConvenienceRenderer, type ForbiddenWordsInfo } from "../../ConvenienceRenderer";
import { type Name, Namer } from "../../Naming";
import { type RenderContext } from "../../Renderer";
import { BooleanOption, EnumOption, type Option, type OptionValues, StringOption } from "../../RendererOptions";
import { TargetLanguage } from "../../TargetLanguage";
import { ClassType, type Type } from "../../Type";
import { type FixMeOptionsAnyType, type FixMeOptionsType } from "../../types";
export declare enum Strictness {
    Coercible = "Coercible::",
    None = "Types::",
    Strict = "Strict::"
}
export declare const rubyOptions: {
    justTypes: BooleanOption;
    strictness: EnumOption<Strictness>;
    namespace: StringOption;
};
export declare class RubyTargetLanguage extends TargetLanguage {
    constructor();
    protected getOptions(): Array<Option<FixMeOptionsAnyType>>;
    get supportsOptionalClassProperties(): boolean;
    protected get defaultIndentation(): string;
    protected makeRenderer(renderContext: RenderContext, untypedOptionValues: FixMeOptionsType): RubyRenderer;
}
export declare class RubyRenderer extends ConvenienceRenderer {
    private readonly _options;
    constructor(targetLanguage: TargetLanguage, renderContext: RenderContext, _options: OptionValues<typeof rubyOptions>);
    protected get commentLineStart(): string;
    protected get needsTypeDeclarationBeforeUse(): boolean;
    protected canBeForwardDeclared(t: Type): boolean;
    protected forbiddenNamesForGlobalNamespace(): string[];
    protected forbiddenForObjectProperties(_c: ClassType, _classNamed: Name): ForbiddenWordsInfo;
    protected makeNamedTypeNamer(): Namer;
    protected namerForObjectProperty(): Namer;
    protected makeUnionMemberNamer(): Namer;
    protected makeEnumCaseNamer(): Namer;
    private dryType;
    private exampleUse;
    private jsonSample;
    private fromDynamic;
    private toDynamic;
    private marshalsImplicitlyToDynamic;
    private propertyTypeMarshalsImplicitlyFromDynamic;
    private emitBlock;
    private emitModule;
    private emitClass;
    private emitEnum;
    private emitUnion;
    private emitTypesModule;
    protected emitSourceStructure(): void;
}
