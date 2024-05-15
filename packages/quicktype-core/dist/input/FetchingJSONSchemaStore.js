var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// eslint-disable-next-line import/no-cycle
import { parseJSON } from "..";
import { readFromFileOrURL } from "./io/NodeIO";
import { JSONSchemaStore } from "./JSONSchemaStore";
export class FetchingJSONSchemaStore extends JSONSchemaStore {
    constructor(_httpHeaders) {
        super();
        this._httpHeaders = _httpHeaders;
    }
    fetch(address) {
        return __awaiter(this, void 0, void 0, function* () {
            // console.log(`Fetching ${address}`);
            return parseJSON(yield readFromFileOrURL(address, this._httpHeaders), "JSON Schema", address);
        });
    }
}
