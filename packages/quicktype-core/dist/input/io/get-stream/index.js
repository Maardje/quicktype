var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import bufferStream from "./buffer-stream";
export function getStream(inputStream, opts = {}) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        if (!inputStream) {
            return yield Promise.reject(new Error("Expected a stream"));
        }
        opts = Object.assign({ maxBuffer: Infinity }, opts);
        const maxBuffer = (_a = opts.maxBuffer) !== null && _a !== void 0 ? _a : Infinity;
        let stream;
        let clean;
        const p = new Promise((resolve, reject) => {
            const error = (err) => {
                if (err) {
                    // null check
                    err.bufferedData = stream.getBufferedValue();
                }
                reject(err);
            };
            stream = bufferStream(opts);
            inputStream.once("error", error);
            inputStream.pipe(stream);
            stream.on("data", () => {
                if (stream.getBufferedLength() > maxBuffer) {
                    reject(new Error("maxBuffer exceeded"));
                }
            });
            stream.once("error", error);
            stream.on("end", resolve);
            clean = () => {
                // some streams doesn't implement the `stream.Readable` interface correctly
                if (inputStream.unpipe) {
                    inputStream.unpipe(stream);
                }
            };
        });
        return yield p.then(clean, clean).then(() => stream.getBufferedValue());
    });
}
// FIXME: should these be async ?
export function buffer(stream, opts = {}) {
    void getStream(stream, Object.assign({}, opts, { encoding: "buffer" }));
}
// FIXME: should these be async ?
export function array(stream, opts = {}) {
    void getStream(stream, Object.assign({}, opts, { array: true }));
}
