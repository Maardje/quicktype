import { ConvenienceRenderer } from "../ConvenienceRenderer";
import { type Name, type Namer } from "../Naming";
import { type RenderContext } from "../Renderer";
import { EnumOption, type Option, type OptionValues } from "../RendererOptions";
import { type Sourcelike } from "../Source";
import { AcronymStyleOptions } from "../support/Acronyms";
import { TargetLanguage } from "../TargetLanguage";
import { type ClassProperty, type ClassType, type Type } from "../Type";
import { type FixMeOptionsAnyType, type FixMeOptionsType } from "../types";
export declare const javaScriptPropTypesOptions: {
    acronymStyle: EnumOption<AcronymStyleOptions>;
    converters: EnumOption<import("../support/Converters").ConvertersOptions>;
    moduleSystem: EnumOption<boolean>;
};
export declare class JavaScriptPropTypesTargetLanguage extends TargetLanguage {
    protected getOptions(): Array<Option<FixMeOptionsAnyType>>;
    constructor(displayName?: string, names?: string[], extension?: string);
    protected makeRenderer(renderContext: RenderContext, untypedOptionValues: FixMeOptionsType): JavaScriptPropTypesRenderer;
}
export declare class JavaScriptPropTypesRenderer extends ConvenienceRenderer {
    private readonly _jsOptions;
    constructor(targetLanguage: TargetLanguage, renderContext: RenderContext, _jsOptions: OptionValues<typeof javaScriptPropTypesOptions>);
    protected nameStyle(original: string, upper: boolean): string;
    protected makeNamedTypeNamer(): Namer;
    protected namerForObjectProperty(): Namer;
    protected makeUnionMemberNamer(): null;
    protected makeEnumCaseNamer(): Namer;
    protected namedTypeToNameForTopLevel(type: Type): Type | undefined;
    protected makeNameForProperty(c: ClassType, className: Name, p: ClassProperty, jsonName: string, _assignedName: string | undefined): Name | undefined;
    private typeMapTypeFor;
    private typeMapTypeForProperty;
    private importStatement;
    protected emitUsageComments(): void;
    protected emitBlock(source: Sourcelike, end: Sourcelike, emit: () => void): void;
    protected emitImports(): void;
    private emitExport;
    protected emitTypes(): void;
    private emitObject;
    protected emitSourceStructure(): void;
}
