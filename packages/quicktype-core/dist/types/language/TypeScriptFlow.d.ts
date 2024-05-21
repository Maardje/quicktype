import { type Name, type Namer } from "../Naming";
import { type RenderContext } from "../Renderer";
import { BooleanOption, type Option, type OptionValues } from "../RendererOptions";
import { type MultiWord, type Sourcelike } from "../Source";
import { type TargetLanguage } from "../TargetLanguage";
import { type ClassType, EnumType, type Type, UnionType } from "../Type";
import { type FixMeOptionsAnyType, type FixMeOptionsType } from "../types";
import { JavaScriptRenderer, JavaScriptTargetLanguage, type JavaScriptTypeAnnotations } from "./JavaScript";
export declare const tsFlowOptions: {
    acronymStyle: import("../RendererOptions").EnumOption<import("../support/Acronyms").AcronymStyleOptions>;
    runtimeTypecheck: BooleanOption;
    runtimeTypecheckIgnoreUnknownProperties: BooleanOption;
    converters: import("../RendererOptions").EnumOption<import("../support/Converters").ConvertersOptions>;
    rawType: import("../RendererOptions").EnumOption<"any" | "json">;
} & {
    justTypes: BooleanOption;
    nicePropertyNames: BooleanOption;
    declareUnions: BooleanOption;
    preferUnions: BooleanOption;
    preferTypes: BooleanOption;
    preferConstValues: BooleanOption;
    readonly: BooleanOption;
};
export declare abstract class TypeScriptFlowBaseTargetLanguage extends JavaScriptTargetLanguage {
    protected getOptions(): Array<Option<FixMeOptionsAnyType>>;
    get supportsOptionalClassProperties(): boolean;
    protected abstract makeRenderer(renderContext: RenderContext, untypedOptionValues: FixMeOptionsType): JavaScriptRenderer;
}
export declare class TypeScriptTargetLanguage extends TypeScriptFlowBaseTargetLanguage {
    constructor();
    protected makeRenderer(renderContext: RenderContext, untypedOptionValues: FixMeOptionsType): TypeScriptRenderer;
}
export declare abstract class TypeScriptFlowBaseRenderer extends JavaScriptRenderer {
    protected readonly _tsFlowOptions: OptionValues<typeof tsFlowOptions>;
    constructor(targetLanguage: TargetLanguage, renderContext: RenderContext, _tsFlowOptions: OptionValues<typeof tsFlowOptions>);
    protected namerForObjectProperty(): Namer;
    protected sourceFor(t: Type): MultiWord;
    protected abstract emitEnum(e: EnumType, enumName: Name): void;
    protected abstract emitClassBlock(c: ClassType, className: Name): void;
    protected emitClassBlockBody(c: ClassType): void;
    private emitClass;
    protected emitUnion(u: UnionType, unionName: Name): void;
    protected emitTypes(): void;
    protected emitUsageComments(): void;
    protected deserializerFunctionLine(t: Type, name: Name): Sourcelike;
    protected serializerFunctionLine(t: Type, name: Name): Sourcelike;
    protected get moduleLine(): string | undefined;
    protected get castFunctionLines(): [string, string];
    protected get typeAnnotations(): JavaScriptTypeAnnotations;
    protected emitConvertModule(): void;
    protected emitConvertModuleHelpers(): void;
    protected emitModuleExports(): void;
}
export declare class TypeScriptRenderer extends TypeScriptFlowBaseRenderer {
    protected forbiddenNamesForGlobalNamespace(): string[];
    protected deserializerFunctionLine(t: Type, name: Name): Sourcelike;
    protected serializerFunctionLine(t: Type, name: Name): Sourcelike;
    protected get moduleLine(): string | undefined;
    protected get typeAnnotations(): JavaScriptTypeAnnotations;
    protected emitModuleExports(): void;
    protected emitUsageImportComment(): void;
    protected emitEnum(e: EnumType, enumName: Name): void;
    protected emitClassBlock(c: ClassType, className: Name): void;
    protected emitSourceStructure(): void;
}
export declare class FlowTargetLanguage extends TypeScriptFlowBaseTargetLanguage {
    constructor();
    protected makeRenderer(renderContext: RenderContext, untypedOptionValues: FixMeOptionsType): FlowRenderer;
}
export declare class FlowRenderer extends TypeScriptFlowBaseRenderer {
    protected forbiddenNamesForGlobalNamespace(): string[];
    protected get typeAnnotations(): JavaScriptTypeAnnotations;
    protected emitEnum(e: EnumType, enumName: Name): void;
    protected emitClassBlock(c: ClassType, className: Name): void;
    protected emitSourceStructure(): void;
}
