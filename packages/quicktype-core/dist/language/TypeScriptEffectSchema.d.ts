import { ConvenienceRenderer } from "../ConvenienceRenderer";
import { type Name, type Namer } from "../Naming";
import { type RenderContext } from "../Renderer";
import { BooleanOption, type Option, type OptionValues } from "../RendererOptions";
import { TargetLanguage } from "../TargetLanguage";
import { type ObjectType } from "../Type";
import { type FixMeOptionsAnyType, type FixMeOptionsType } from "../types";
export declare const typeScriptEffectSchemaOptions: {
    justSchema: BooleanOption;
};
export declare class TypeScriptEffectSchemaTargetLanguage extends TargetLanguage {
    protected getOptions(): Array<Option<FixMeOptionsAnyType>>;
    constructor(displayName?: string, names?: string[], extension?: string);
    protected makeRenderer(renderContext: RenderContext, untypedOptionValues: FixMeOptionsType): TypeScriptEffectSchemaRenderer;
}
export declare class TypeScriptEffectSchemaRenderer extends ConvenienceRenderer {
    private readonly _options;
    private emittedObjects;
    constructor(targetLanguage: TargetLanguage, renderContext: RenderContext, _options: OptionValues<typeof typeScriptEffectSchemaOptions>);
    protected forbiddenNamesForGlobalNamespace(): string[];
    protected nameStyle(original: string, upper: boolean): string;
    protected makeNamedTypeNamer(): Namer;
    protected makeUnionMemberNamer(): Namer;
    protected namerForObjectProperty(): Namer;
    protected makeEnumCaseNamer(): Namer;
    private importStatement;
    protected emitImports(): void;
    private typeMapTypeForProperty;
    private typeMapTypeFor;
    private emitObject;
    private emitEnum;
    protected walkObjectNames(objectType: ObjectType): Name[];
    protected emitSchemas(): void;
    protected emitSourceStructure(): void;
}
