import { type FixMeOptionsAnyType, type FixMeOptionsType } from "./types";
/**
 * Primary options show up in the web UI in the "Language" settings tab,
 * secondary options in "Other".
 */
export type OptionKind = "primary" | "secondary";
export interface OptionDefinition {
    alias?: string;
    defaultOption?: boolean;
    defaultValue?: FixMeOptionsAnyType;
    description: string;
    kind?: OptionKind;
    legalValues?: string[];
    multiple?: boolean;
    name: string;
    renderer?: boolean;
    type: StringConstructor | BooleanConstructor;
    typeLabel?: string;
}
/**
 * The superclass for target language options.  You probably want to use one of its
 * subclasses, `BooleanOption`, `EnumOption`, or `StringOption`.
 */
export declare abstract class Option<T> {
    readonly definition: OptionDefinition;
    constructor(definition: OptionDefinition);
    getValue(values: FixMeOptionsType): T;
    get cliDefinitions(): {
        actual: OptionDefinition[];
        display: OptionDefinition[];
    };
}
export type OptionValueType<O> = O extends Option<infer T> ? T : never;
export type OptionValues<T> = {
    [P in keyof T]: OptionValueType<T[P]>;
};
export declare function getOptionValues<T extends {
    [name: string]: Option<FixMeOptionsAnyType>;
}>(options: T, untypedOptionValues: FixMeOptionsType): OptionValues<T>;
/**
 * A target language option that allows setting a boolean flag.
 */
export declare class BooleanOption extends Option<boolean> {
    /**
     * @param name The shorthand name.
     * @param description Short-ish description of the option.
     * @param defaultValue The default value.
     * @param kind Whether it's a primary or secondary option.
     */
    constructor(name: string, description: string, defaultValue: boolean, kind?: OptionKind);
    get cliDefinitions(): {
        actual: OptionDefinition[];
        display: OptionDefinition[];
    };
    getValue(values: FixMeOptionsType): boolean;
}
export declare class StringOption extends Option<string> {
    constructor(name: string, description: string, typeLabel: string, defaultValue: string, kind?: OptionKind);
}
export declare class EnumOption<T> extends Option<T> {
    private readonly _values;
    constructor(name: string, description: string, values: Array<[string, T]>, defaultValue?: string | undefined, kind?: OptionKind);
    getValue(values: FixMeOptionsType): T;
}
