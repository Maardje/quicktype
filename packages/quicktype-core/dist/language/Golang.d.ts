import { type StringTypeMapping } from "..";
import { ConvenienceRenderer } from "../ConvenienceRenderer";
import { DependencyName, type Name, type Namer } from "../Naming";
import { type RenderContext } from "../Renderer";
import { BooleanOption, type Option, type OptionValues, StringOption } from "../RendererOptions";
import { type Sourcelike } from "../Source";
import { TargetLanguage } from "../TargetLanguage";
import { type Type } from "../Type";
import { type FixMeOptionsAnyType, type FixMeOptionsType } from "../types";
export declare const goOptions: {
    justTypes: BooleanOption;
    justTypesAndPackage: BooleanOption;
    packageName: StringOption;
    multiFileOutput: BooleanOption;
    fieldTags: StringOption;
    omitEmpty: BooleanOption;
};
export declare class GoTargetLanguage extends TargetLanguage {
    constructor();
    protected getOptions(): Array<Option<FixMeOptionsAnyType>>;
    get supportsUnionsWithBothNumberTypes(): boolean;
    get stringTypeMapping(): StringTypeMapping;
    get supportsOptionalClassProperties(): boolean;
    protected makeRenderer(renderContext: RenderContext, untypedOptionValues: FixMeOptionsType): GoRenderer;
    protected get defaultIndentation(): string;
}
export declare class GoRenderer extends ConvenienceRenderer {
    private readonly _options;
    private readonly _topLevelUnmarshalNames;
    private _currentFilename;
    constructor(targetLanguage: TargetLanguage, renderContext: RenderContext, _options: OptionValues<typeof goOptions>);
    protected makeNamedTypeNamer(): Namer;
    protected namerForObjectProperty(): Namer;
    protected makeUnionMemberNamer(): Namer;
    protected makeEnumCaseNamer(): Namer;
    protected get enumCasesInGlobalNamespace(): boolean;
    protected makeTopLevelDependencyNames(_: Type, topLevelName: Name): DependencyName[];
    protected startFile(basename: Sourcelike): void;
    protected endFile(): void;
    private emitBlock;
    private emitFunc;
    private emitStruct;
    private nullableGoType;
    private propertyGoType;
    private goType;
    private emitTopLevel;
    private emitClass;
    private emitEnum;
    private emitUnion;
    private emitSingleFileHeaderComments;
    private emitPackageDefinitons;
    private emitImports;
    private emitHelperFunctions;
    protected emitSourceStructure(): void;
    private collectAllImports;
    private collectClassImports;
    private collectUnionImports;
}
