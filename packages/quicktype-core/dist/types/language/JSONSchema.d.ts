import { ConvenienceRenderer } from "../ConvenienceRenderer";
import { type Namer } from "../Naming";
import { type RenderContext } from "../Renderer";
import { type Option } from "../RendererOptions";
import { TargetLanguage } from "../TargetLanguage";
import { type StringTypeMapping } from "../TypeBuilder";
import { type FixMeOptionsAnyType, type FixMeOptionsType } from "../types";
export declare class JSONSchemaTargetLanguage extends TargetLanguage {
    constructor();
    protected getOptions(): Array<Option<FixMeOptionsAnyType>>;
    get stringTypeMapping(): StringTypeMapping;
    get supportsOptionalClassProperties(): boolean;
    get supportsFullObjectType(): boolean;
    protected makeRenderer(renderContext: RenderContext, _untypedOptionValues: FixMeOptionsType): JSONSchemaRenderer;
}
export declare class JSONSchemaRenderer extends ConvenienceRenderer {
    protected makeNamedTypeNamer(): Namer;
    protected namerForObjectProperty(): null;
    protected makeUnionMemberNamer(): null;
    protected makeEnumCaseNamer(): null;
    private nameForType;
    private makeOneOf;
    private makeRef;
    private addAttributesToSchema;
    private schemaForType;
    private definitionForObject;
    private definitionForUnion;
    private definitionForEnum;
    protected emitSourceStructure(): void;
}
