import { ConvenienceRenderer, type ForbiddenWordsInfo } from "../ConvenienceRenderer";
import { type Name, Namer } from "../Naming";
import { type RenderContext } from "../Renderer";
import { BooleanOption, type Option, type OptionValues, StringOption } from "../RendererOptions";
import { type Sourcelike } from "../Source";
import { TargetLanguage } from "../TargetLanguage";
import { ClassType, type Type } from "../Type";
import { type FixMeOptionsAnyType, type FixMeOptionsType } from "../types";
export declare const elixirOptions: {
    justTypes: BooleanOption;
    namespace: StringOption;
};
export declare class ElixirTargetLanguage extends TargetLanguage {
    constructor();
    protected getOptions(): Array<Option<FixMeOptionsAnyType>>;
    get supportsOptionalClassProperties(): boolean;
    protected get defaultIndentation(): string;
    protected makeRenderer(renderContext: RenderContext, untypedOptionValues: FixMeOptionsType): ElixirRenderer;
}
export declare class ElixirRenderer extends ConvenienceRenderer {
    private readonly _options;
    constructor(targetLanguage: TargetLanguage, renderContext: RenderContext, _options: OptionValues<typeof elixirOptions>);
    protected get commentLineStart(): string;
    protected get needsTypeDeclarationBeforeUse(): boolean;
    protected canBeForwardDeclared(t: Type): boolean;
    protected forbiddenNamesForGlobalNamespace(): string[];
    protected forbiddenForObjectProperties(_c: ClassType, _classNamed: Name): ForbiddenWordsInfo;
    protected makeNamedTypeNamer(): Namer;
    protected namerForObjectProperty(): Namer;
    protected makeUnionMemberNamer(): Namer;
    protected makeEnumCaseNamer(): Namer;
    private nameForNamedTypeWithNamespace;
    private nameWithNamespace;
    private elixirType;
    private patternMatchClauseDecode;
    private patternMatchClauseEncode;
    private sortAndFilterPatternMatchTypes;
    private emitPatternMatches;
    private nameOfTransformFunction;
    private fromDynamic;
    private toDynamic;
    private emitBlock;
    protected emitDescriptionBlock(lines: Sourcelike[]): void;
    private emitModule;
    private isValidAtom;
    private emitEnum;
    private emitUnion;
    protected emitSourceStructure(): void;
}
