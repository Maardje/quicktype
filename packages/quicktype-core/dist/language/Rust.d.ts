import { ConvenienceRenderer, type ForbiddenWordsInfo } from "../ConvenienceRenderer";
import { type Name, type Namer } from "../Naming";
import { type RenderContext } from "../Renderer";
import { BooleanOption, EnumOption, type Option, type OptionValues } from "../RendererOptions";
import { type Sourcelike } from "../Source";
import { TargetLanguage } from "../TargetLanguage";
import { type ClassType, type EnumType, type Type, UnionType } from "../Type";
import { type FixMeOptionsAnyType, type FixMeOptionsType } from "../types";
export declare enum Density {
    Normal = "Normal",
    Dense = "Dense"
}
export declare enum Visibility {
    Private = "Private",
    Crate = "Crate",
    Public = "Public"
}
export declare const rustOptions: {
    density: EnumOption<Density>;
    visibility: EnumOption<Visibility>;
    deriveDebug: BooleanOption;
    deriveClone: BooleanOption;
    derivePartialEq: BooleanOption;
    skipSerializingNone: BooleanOption;
    edition2018: BooleanOption;
    leadingComments: BooleanOption;
};
export declare class RustTargetLanguage extends TargetLanguage {
    protected makeRenderer(renderContext: RenderContext, untypedOptionValues: FixMeOptionsType): RustRenderer;
    constructor();
    protected getOptions(): Array<Option<FixMeOptionsAnyType>>;
}
export declare class RustRenderer extends ConvenienceRenderer {
    private readonly _options;
    constructor(targetLanguage: TargetLanguage, renderContext: RenderContext, _options: OptionValues<typeof rustOptions>);
    protected makeNamedTypeNamer(): Namer;
    protected namerForObjectProperty(): Namer | null;
    protected makeUnionMemberNamer(): Namer | null;
    protected makeEnumCaseNamer(): Namer | null;
    protected forbiddenNamesForGlobalNamespace(): string[];
    protected forbiddenForObjectProperties(_c: ClassType, _className: Name): ForbiddenWordsInfo;
    protected forbiddenForUnionMembers(_u: UnionType, _unionName: Name): ForbiddenWordsInfo;
    protected forbiddenForEnumCases(_e: EnumType, _enumName: Name): ForbiddenWordsInfo;
    protected get commentLineStart(): string;
    private nullableRustType;
    protected isImplicitCycleBreaker(t: Type): boolean;
    private rustType;
    private breakCycle;
    private emitRenameAttribute;
    private emitSkipSerializeNone;
    private get visibility();
    protected emitStructDefinition(c: ClassType, className: Name): void;
    protected emitBlock(line: Sourcelike, f: () => void): void;
    protected emitUnion(u: UnionType, unionName: Name): void;
    protected emitEnumDefinition(e: EnumType, enumName: Name): void;
    protected emitTopLevelAlias(t: Type, name: Name): void;
    protected emitLeadingComments(): void;
    protected emitSourceStructure(): void;
}
