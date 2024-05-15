/* eslint-disable @typescript-eslint/no-explicit-any */
import { PassThrough } from "readable-stream";
export default function bufferStream(opts) {
    opts = Object.assign({}, opts);
    const array = opts.array;
    let encoding = opts.encoding;
    const buffer = encoding === "buffer";
    let objectMode = false;
    if (array) {
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        objectMode = !(encoding || buffer);
    }
    else {
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        encoding = encoding || "utf8";
    }
    if (buffer) {
        encoding = undefined;
    }
    let len = 0;
    const ret = [];
    const stream = new PassThrough({
        objectMode
    });
    if (encoding) {
        stream.setEncoding(encoding);
    }
    stream.on("data", (chunk) => {
        ret.push(chunk);
        if (objectMode) {
            len = ret.length;
        }
        else {
            len += chunk.length;
        }
    });
    stream.getBufferedValue = () => {
        if (array) {
            return ret;
        }
        return buffer ? Buffer.concat(ret, len) : ret.join("");
    };
    stream.getBufferedLength = () => len;
    return stream;
}
