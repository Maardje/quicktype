import { ConvenienceRenderer, type ForbiddenWordsInfo } from "../ConvenienceRenderer";
import { type Name, type Namer } from "../Naming";
import { type RenderContext } from "../Renderer";
import { type Option } from "../RendererOptions";
import { type Sourcelike } from "../Source";
import { TargetLanguage } from "../TargetLanguage";
import { type ClassType, type EnumType, type Type, type UnionType } from "../Type";
import { type FixMeOptionsAnyType } from "../types";
export declare class CrystalTargetLanguage extends TargetLanguage {
    protected makeRenderer(renderContext: RenderContext): CrystalRenderer;
    constructor();
    protected get defaultIndentation(): string;
    protected getOptions(): Array<Option<FixMeOptionsAnyType>>;
}
export declare class CrystalRenderer extends ConvenienceRenderer {
    constructor(targetLanguage: TargetLanguage, renderContext: RenderContext);
    protected makeNamedTypeNamer(): Namer;
    protected namerForObjectProperty(): Namer | null;
    protected makeUnionMemberNamer(): Namer | null;
    protected makeEnumCaseNamer(): Namer | null;
    protected forbiddenNamesForGlobalNamespace(): string[];
    protected forbiddenForObjectProperties(_c: ClassType, _className: Name): ForbiddenWordsInfo;
    protected forbiddenForUnionMembers(_u: UnionType, _unionName: Name): ForbiddenWordsInfo;
    protected forbiddenForEnumCases(_e: EnumType, _enumName: Name): ForbiddenWordsInfo;
    protected get commentLineStart(): string;
    private nullableCrystalType;
    protected isImplicitCycleBreaker(t: Type): boolean;
    private crystalType;
    private breakCycle;
    private emitRenameAttribute;
    protected emitStructDefinition(c: ClassType, className: Name): void;
    protected emitBlock(line: Sourcelike, f: () => void): void;
    protected emitEnum(line: Sourcelike, f: () => void): void;
    protected emitUnion(u: UnionType, unionName: Name): void;
    protected emitTopLevelAlias(t: Type, name: Name): void;
    protected emitLeadingComments(): void;
    protected emitSourceStructure(): void;
}
