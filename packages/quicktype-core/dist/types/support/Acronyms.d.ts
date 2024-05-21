import { EnumOption } from "../RendererOptions";
export declare const acronyms: string[];
export declare enum AcronymStyleOptions {
    Camel = "camel",
    Lower = "lowerCase",
    Original = "original",
    Pascal = "pascal"
}
export declare const acronymOption: (defaultOption: AcronymStyleOptions) => EnumOption<AcronymStyleOptions>;
export declare function acronymStyle(style: AcronymStyleOptions): (s: string) => string;
