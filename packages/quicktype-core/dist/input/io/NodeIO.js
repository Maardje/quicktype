var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var _a;
import * as fs from "fs";
import { defined, exceptionToString } from "@glideapps/ts-necessities";
import { isNode } from "browser-or-node";
import _fetch from "cross-fetch";
import isURL from "is-url";
// eslint-disable-next-line import/no-cycle
import { messageError, panic } from "../../index";
import { getStream } from "./get-stream";
// Only use cross-fetch in CI
// FIXME: type global
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fetch = process.env.CI ? _fetch : (_a = global.fetch) !== null && _a !== void 0 ? _a : _fetch;
function parseHeaders(httpHeaders) {
    if (!Array.isArray(httpHeaders)) {
        return {};
    }
    return httpHeaders.reduce(function (result, httpHeader) {
        if (httpHeader !== undefined && httpHeader.length > 0) {
            const split = httpHeader.indexOf(":");
            if (split < 0) {
                return panic(`Could not parse HTTP header "${httpHeader}".`);
            }
            const key = httpHeader.slice(0, split).trim();
            const value = httpHeader.slice(split + 1).trim();
            result[key] = value;
        }
        return result;
    }, {});
}
export function readableFromFileOrURL(fileOrURL, httpHeaders) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (isURL(fileOrURL)) {
                const response = yield fetch(fileOrURL, {
                    headers: parseHeaders(httpHeaders)
                });
                return defined(response.body);
            }
            else if (isNode) {
                if (fileOrURL === "-") {
                    // Cast node readable to isomorphic readable from readable-stream
                    return process.stdin;
                }
                const filePath = fs.lstatSync(fileOrURL).isSymbolicLink() ? fs.readlinkSync(fileOrURL) : fileOrURL;
                if (fs.existsSync(filePath)) {
                    // Cast node readable to isomorphic readable from readable-stream
                    return fs.createReadStream(filePath, "utf8");
                }
            }
        }
        catch (e) {
            return messageError("MiscReadError", { fileOrURL, message: exceptionToString(e) });
        }
        return messageError("DriverInputFileDoesNotExist", { filename: fileOrURL });
    });
}
export function readFromFileOrURL(fileOrURL, httpHeaders) {
    return __awaiter(this, void 0, void 0, function* () {
        const readable = yield readableFromFileOrURL(fileOrURL, httpHeaders);
        try {
            return yield getStream(readable);
        }
        catch (e) {
            return messageError("MiscReadError", { fileOrURL, message: exceptionToString(e) });
        }
    });
}
