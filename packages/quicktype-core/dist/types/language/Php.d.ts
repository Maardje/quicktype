import { type StringTypeMapping } from "..";
import { ConvenienceRenderer, type ForbiddenWordsInfo } from "../ConvenienceRenderer";
import { type Name, type Namer } from "../Naming";
import { type RenderContext } from "../Renderer";
import { BooleanOption, type Option, type OptionValues } from "../RendererOptions";
import { type Sourcelike } from "../Source";
import { AcronymStyleOptions } from "../support/Acronyms";
import { TargetLanguage } from "../TargetLanguage";
import { type ClassProperty, type ClassType, type EnumType, type Type, type UnionType } from "../Type";
import { type FixMeOptionsAnyType, type FixMeOptionsType } from "../types";
export declare const phpOptions: {
    withGet: BooleanOption;
    fastGet: BooleanOption;
    withSet: BooleanOption;
    withClosing: BooleanOption;
    acronymStyle: import("../RendererOptions").EnumOption<AcronymStyleOptions>;
};
export declare class PhpTargetLanguage extends TargetLanguage {
    constructor();
    protected getOptions(): Array<Option<FixMeOptionsAnyType>>;
    get supportsUnionsWithBothNumberTypes(): boolean;
    protected makeRenderer(renderContext: RenderContext, untypedOptionValues: FixMeOptionsType): PhpRenderer;
    get stringTypeMapping(): StringTypeMapping;
}
export declare const stringEscape: (s: string) => string;
export declare function phpNameStyle(startWithUpper: boolean, upperUnderscore: boolean, original: string, acronymsStyle?: (s: string) => string): string;
export interface FunctionNames {
    readonly from: Name;
    readonly getter: Name;
    readonly sample: Name;
    readonly setter: Name;
    readonly to: Name;
    readonly validate: Name;
}
export declare class PhpRenderer extends ConvenienceRenderer {
    protected readonly _options: OptionValues<typeof phpOptions>;
    private readonly _gettersAndSettersForPropertyName;
    private _haveEmittedLeadingComments;
    protected readonly _converterClassname: string;
    protected readonly _converterKeywords: string[];
    constructor(targetLanguage: TargetLanguage, renderContext: RenderContext, _options: OptionValues<typeof phpOptions>);
    protected forbiddenForObjectProperties(_c: ClassType, _className: Name): ForbiddenWordsInfo;
    protected makeNamedTypeNamer(): Namer;
    protected namerForObjectProperty(): Namer;
    protected makeUnionMemberNamer(): Namer;
    protected makeEnumCaseNamer(): Namer;
    protected unionNeedsName(u: UnionType): boolean;
    protected namedTypeToNameForTopLevel(type: Type): Type | undefined;
    protected makeNamesForPropertyGetterAndSetter(_c: ClassType, _className: Name, _p: ClassProperty, _jsonName: string, name: Name): FunctionNames;
    protected makePropertyDependencyNames(c: ClassType, className: Name, p: ClassProperty, jsonName: string, name: Name): Name[];
    private getNameStyling;
    protected startFile(_basename: Sourcelike): void;
    protected finishFile(): void;
    protected emitFileHeader(fileName: Sourcelike, _imports: string[]): void;
    emitDescriptionBlock(lines: Sourcelike[]): void;
    emitBlock(line: Sourcelike, f: () => void): void;
    protected phpType(_reference: boolean, t: Type, isOptional?: boolean, prefix?: string, suffix?: string): Sourcelike;
    protected phpDocConvertType(className: Name, t: Type): Sourcelike;
    protected phpConvertType(className: Name, t: Type): Sourcelike;
    protected phpToObjConvert(className: Name, t: Type, lhs: Sourcelike[], args: Sourcelike[]): void;
    private transformDateTime;
    protected phpFromObjConvert(className: Name, t: Type, lhs: Sourcelike[], args: Sourcelike[]): void;
    protected phpSampleConvert(className: Name, t: Type, lhs: Sourcelike[], args: Sourcelike[], idx: number, suffix: Sourcelike): void;
    private phpValidate;
    protected emitFromMethod(names: FunctionNames, p: ClassProperty, className: Name, _name: Name, desc?: string[]): void;
    protected emitToMethod(names: FunctionNames, p: ClassProperty, className: Name, name: Name, desc?: string[]): void;
    protected emitValidateMethod(names: FunctionNames, p: ClassProperty, className: Name, name: Name, desc?: string[]): void;
    protected emitGetMethod(names: FunctionNames, p: ClassProperty, className: Name, name: Name, desc?: string[]): void;
    protected emitSetMethod(names: FunctionNames, p: ClassProperty, className: Name, name: Name, desc?: string[]): void;
    protected emitSampleMethod(names: FunctionNames, p: ClassProperty, className: Name, name: Name, desc: string[] | undefined, idx: number): void;
    protected emitClassDefinition(c: ClassType, className: Name): void;
    protected emitUnionAttributes(_u: UnionType, _unionName: Name): void;
    protected emitUnionSerializer(_u: UnionType, _unionName: Name): void;
    protected emitUnionDefinition(_u: UnionType, _unionName: Name): void;
    protected emitEnumSerializationAttributes(_e: EnumType): void;
    protected emitEnumDeserializationAttributes(_e: EnumType): void;
    protected emitEnumDefinition(e: EnumType, enumName: Name): void;
    protected emitSourceStructure(givenFilename: string): void;
}
