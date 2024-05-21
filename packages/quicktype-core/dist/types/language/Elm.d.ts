import { ConvenienceRenderer, type ForbiddenWordsInfo } from "../ConvenienceRenderer";
import { DependencyName, type Name, type Namer } from "../Naming";
import { type RenderContext } from "../Renderer";
import { BooleanOption, EnumOption, type Option, type OptionValues, StringOption } from "../RendererOptions";
import { type Sourcelike } from "../Source";
import { TargetLanguage } from "../TargetLanguage";
import { type ClassType, type Type, UnionType } from "../Type";
import { type FixMeOptionsAnyType, type FixMeOptionsType } from "../types";
export declare const elmOptions: {
    justTypes: BooleanOption;
    useList: EnumOption<boolean>;
    moduleName: StringOption;
};
export declare class ElmTargetLanguage extends TargetLanguage {
    constructor();
    protected getOptions(): Array<Option<FixMeOptionsAnyType>>;
    get supportsOptionalClassProperties(): boolean;
    get supportsUnionsWithBothNumberTypes(): boolean;
    protected makeRenderer(renderContext: RenderContext, untypedOptionValues: FixMeOptionsType): ElmRenderer;
}
export declare class ElmRenderer extends ConvenienceRenderer {
    private readonly _options;
    private readonly _topLevelDependents;
    private readonly _namedTypeDependents;
    constructor(targetLanguage: TargetLanguage, renderContext: RenderContext, _options: OptionValues<typeof elmOptions>);
    protected forbiddenNamesForGlobalNamespace(): string[];
    protected makeTopLevelDependencyNames(t: Type, topLevelName: Name): DependencyName[];
    protected makeNamedTypeNamer(): Namer;
    protected makeNamedTypeDependencyNames(_: Type, typeName: Name): DependencyName[];
    protected namerForObjectProperty(): Namer;
    protected forbiddenForObjectProperties(_c: ClassType, _className: Name): ForbiddenWordsInfo;
    protected makeUnionMemberNamer(): Namer;
    protected get unionMembersInGlobalNamespace(): boolean;
    protected makeEnumCaseNamer(): Namer;
    protected get enumCasesInGlobalNamespace(): boolean;
    protected proposeUnionMemberName(u: UnionType, unionName: Name, fieldType: Type, lookup: (n: Name) => string): string;
    protected get commentLineStart(): string;
    protected emitDescriptionBlock(lines: Sourcelike[]): void;
    private get arrayType();
    private elmType;
    private elmProperty;
    private decoderNameForNamedType;
    private decoderNameForType;
    private decoderNameForProperty;
    private encoderNameForNamedType;
    private encoderNameForType;
    private encoderNameForProperty;
    private emitTopLevelDefinition;
    private emitClassDefinition;
    private emitEnumDefinition;
    private emitUnionDefinition;
    private emitTopLevelFunctions;
    private emitClassFunctions;
    private emitEnumFunctions;
    private emitUnionFunctions;
    protected emitSourceStructure(): void;
}
