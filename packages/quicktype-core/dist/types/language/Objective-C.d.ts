import { ConvenienceRenderer, type ForbiddenWordsInfo } from "../ConvenienceRenderer";
import { type Name, Namer } from "../Naming";
import { type RenderContext } from "../Renderer";
import { BooleanOption, EnumOption, type Option, type OptionValues, StringOption } from "../RendererOptions";
import { type Sourcelike } from "../Source";
import { TargetLanguage } from "../TargetLanguage";
import { type ClassProperty, ClassType, EnumType, Type } from "../Type";
import { type FixMeOptionsAnyType, type FixMeOptionsType } from "../types";
export type MemoryAttribute = "assign" | "strong" | "copy";
export interface OutputFeatures {
    implementation: boolean;
    interface: boolean;
}
export declare const objcOptions: {
    features: EnumOption<{
        interface: boolean;
        implementation: boolean;
    }>;
    justTypes: BooleanOption;
    marshallingFunctions: BooleanOption;
    classPrefix: StringOption;
    extraComments: BooleanOption;
};
export declare class ObjectiveCTargetLanguage extends TargetLanguage {
    constructor();
    protected getOptions(): Array<Option<FixMeOptionsAnyType>>;
    protected makeRenderer(renderContext: RenderContext, untypedOptionValues: FixMeOptionsType): ObjectiveCRenderer;
}
export declare class ObjectiveCRenderer extends ConvenienceRenderer {
    private readonly _options;
    private _currentFilename;
    private readonly _classPrefix;
    constructor(targetLanguage: TargetLanguage, renderContext: RenderContext, _options: OptionValues<typeof objcOptions>);
    private inferClassPrefix;
    protected forbiddenNamesForGlobalNamespace(): string[];
    protected forbiddenForObjectProperties(_c: ClassType, _className: Name): ForbiddenWordsInfo;
    protected forbiddenForEnumCases(_e: EnumType, _enumName: Name): ForbiddenWordsInfo;
    protected makeNamedTypeNamer(): Namer;
    protected namerForObjectProperty(_: ClassType, p: ClassProperty): Namer;
    protected makeUnionMemberNamer(): null;
    protected makeEnumCaseNamer(): Namer;
    protected namedTypeToNameForTopLevel(type: Type): Type | undefined;
    protected emitDescriptionBlock(lines: Sourcelike[]): void;
    protected emitBlock(line: Sourcelike, f: () => void): void;
    protected emitMethod(declaration: Sourcelike, f: () => void): void;
    protected emitExtraComments(...comments: Sourcelike[]): void;
    protected startFile(basename: Sourcelike, extension: string): void;
    protected finishFile(): void;
    protected memoryAttribute(t: Type, isNullable: boolean): MemoryAttribute;
    protected objcType(t: Type, nullableOrBoxed?: boolean): [Sourcelike, string];
    private jsonType;
    protected fromDynamicExpression(t: Type, ...dynamic: Sourcelike[]): Sourcelike;
    protected toDynamicExpression(t: Type, typed: Sourcelike): Sourcelike;
    protected implicitlyConvertsFromJSON(t: Type): boolean;
    protected implicitlyConvertsToJSON(t: Type): boolean;
    protected emitPropertyAssignment(propertyName: Name, jsonName: string, propertyType: Type): void;
    protected emitPrivateClassInterface(_: ClassType, name: Name): void;
    protected pointerAwareTypeName(t: Type | [Sourcelike, string]): Sourcelike;
    private emitNonClassTopLevelTypedef;
    private topLevelFromDataPrototype;
    private topLevelFromJSONPrototype;
    private topLevelToDataPrototype;
    private topLevelToJSONPrototype;
    private emitTopLevelFunctionDeclarations;
    private emitTryCatchAsError;
    private emitTopLevelFunctions;
    private emitClassInterface;
    protected hasIrregularProperties(t: ClassType): boolean;
    protected hasUnsafeProperties(t: ClassType): boolean;
    private emitClassImplementation;
    protected emitMark(label: string): void;
    protected variableNameForTopLevel(name: Name): Sourcelike;
    private emitPseudoEnumInterface;
    private emitPseudoEnumImplementation;
    protected emitSourceStructure(proposedFilename: string): void;
    private get needsMap();
    protected emitMapFunction(): void;
}
