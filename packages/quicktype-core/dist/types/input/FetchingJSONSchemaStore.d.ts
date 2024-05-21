import { type JSONSchema, JSONSchemaStore } from "./JSONSchemaStore";
export declare class FetchingJSONSchemaStore extends JSONSchemaStore {
    private readonly _httpHeaders?;
    constructor(_httpHeaders?: string[]);
    fetch(address: string): Promise<JSONSchema | undefined>;
}
