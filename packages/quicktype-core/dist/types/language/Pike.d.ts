import { ConvenienceRenderer, type ForbiddenWordsInfo } from "../ConvenienceRenderer";
import { type Name, type Namer } from "../Naming";
import { type RenderContext } from "../Renderer";
import { type Option } from "../RendererOptions";
import { type MultiWord } from "../Source";
import { TargetLanguage } from "../TargetLanguage";
import { type ClassType, type EnumType, type Type, type UnionType } from "../Type";
import { type FixMeOptionsAnyType } from "../types";
export declare const pikeOptions: {};
export declare class PikeTargetLanguage extends TargetLanguage {
    constructor();
    protected getOptions(): Array<Option<FixMeOptionsAnyType>>;
    protected makeRenderer(renderContext: RenderContext): PikeRenderer;
}
export declare class PikeRenderer extends ConvenienceRenderer {
    protected emitSourceStructure(): void;
    protected get enumCasesInGlobalNamespace(): boolean;
    protected makeEnumCaseNamer(): Namer;
    protected makeNamedTypeNamer(): Namer;
    protected makeUnionMemberNamer(): Namer;
    protected namerForObjectProperty(): Namer;
    protected forbiddenNamesForGlobalNamespace(): string[];
    protected forbiddenForObjectProperties(_c: ClassType, _className: Name): ForbiddenWordsInfo;
    protected forbiddenForEnumCases(_e: EnumType, _enumName: Name): ForbiddenWordsInfo;
    protected forbiddenForUnionMembers(_u: UnionType, _unionName: Name): ForbiddenWordsInfo;
    protected sourceFor(t: Type): MultiWord;
    protected emitClassDefinition(c: ClassType, className: Name): void;
    protected emitEnum(e: EnumType, enumName: Name): void;
    protected emitUnion(u: UnionType, unionName: Name): void;
    private emitBlock;
    private emitMappingBlock;
    private emitClassMembers;
    private emitInformationComment;
    private emitTopLevelTypedef;
    private emitTopLevelConverter;
    private emitEncodingFunction;
    private emitDecodingFunction;
}
