var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { addHashCode, hashCodeInit, hashString } from "collection-utils";
import { inferTransformedStringTypeKindForString } from "../attributes/StringTypes";
import { assert, defined, panic } from "../support/Support";
import { isPrimitiveStringTypeKind, transformedStringTypeTargetTypeKindsMap } from "../Type";
export var Tag;
(function (Tag) {
    Tag[Tag["Null"] = 1] = "Null";
    Tag[Tag["False"] = 2] = "False";
    Tag[Tag["True"] = 3] = "True";
    Tag[Tag["Integer"] = 4] = "Integer";
    Tag[Tag["Double"] = 5] = "Double";
    Tag[Tag["InternedString"] = 6] = "InternedString";
    Tag[Tag["UninternedString"] = 7] = "UninternedString";
    Tag[Tag["Object"] = 8] = "Object";
    Tag[Tag["Array"] = 9] = "Array";
    Tag[Tag["StringFormat"] = 10] = "StringFormat";
    Tag[Tag["TransformedString"] = 11] = "TransformedString";
})(Tag || (Tag = {}));
const TAG_BITS = 4;
const TAG_MASK = (1 << TAG_BITS) - 1;
export function makeValue(t, index) {
    return t | (index << TAG_BITS);
}
function getIndex(v, tag) {
    assert(valueTag(v) === tag, "Trying to get index for value with invalid tag");
    return v >> TAG_BITS;
}
export function valueTag(v) {
    return v & TAG_MASK;
}
export class CompressedJSON {
    constructor(dateTimeRecognizer, handleRefs) {
        this.dateTimeRecognizer = dateTimeRecognizer;
        this.handleRefs = handleRefs;
        this._contextStack = [];
        this._strings = [];
        this._stringIndexes = {};
        this._objects = [];
        this._arrays = [];
        this.getObjectForValue = (v) => {
            return this._objects[getIndex(v, Tag.Object)];
        };
        this.getArrayForValue = (v) => {
            return this._arrays[getIndex(v, Tag.Array)];
        };
        this.internArray = (arr) => {
            const index = this._arrays.length;
            this._arrays.push(arr);
            return makeValue(Tag.Array, index);
        };
    }
    parseSync(_input) {
        return panic("parseSync not implemented in CompressedJSON");
    }
    getStringForValue(v) {
        const tag = valueTag(v);
        assert(tag === Tag.InternedString || tag === Tag.TransformedString);
        return this._strings[getIndex(v, tag)];
    }
    getStringFormatTypeKind(v) {
        const kind = this._strings[getIndex(v, Tag.StringFormat)];
        if (!isPrimitiveStringTypeKind(kind) || kind === "string") {
            return panic("Not a transformed string type kind");
        }
        return kind;
    }
    get context() {
        return defined(this._ctx);
    }
    internString(s) {
        if (Object.prototype.hasOwnProperty.call(this._stringIndexes, s)) {
            return this._stringIndexes[s];
        }
        const index = this._strings.length;
        this._strings.push(s);
        this._stringIndexes[s] = index;
        return index;
    }
    makeString(s) {
        const value = makeValue(Tag.InternedString, this.internString(s));
        assert(typeof value === "number", `Interned string value is not a number: ${value}`);
        return value;
    }
    internObject(obj) {
        const index = this._objects.length;
        this._objects.push(obj);
        return makeValue(Tag.Object, index);
    }
    get isExpectingRef() {
        return this._ctx !== undefined && this._ctx.currentKey === "$ref";
    }
    commitValue(value) {
        assert(typeof value === "number", `CompressedJSON value is not a number: ${value}`);
        if (this._ctx === undefined) {
            assert(this._rootValue === undefined, "Committing value but nowhere to commit to - root value still there.");
            this._rootValue = value;
        }
        else if (this._ctx.currentObject !== undefined) {
            if (this._ctx.currentKey === undefined) {
                return panic("Must have key and can't have string when committing");
            }
            this._ctx.currentObject.push(this.makeString(this._ctx.currentKey), value);
            this._ctx.currentKey = undefined;
        }
        else if (this._ctx.currentArray !== undefined) {
            this._ctx.currentArray.push(value);
        }
        else {
            return panic("Committing value but nowhere to commit to");
        }
    }
    commitNull() {
        this.commitValue(makeValue(Tag.Null, 0));
    }
    commitBoolean(v) {
        this.commitValue(makeValue(v ? Tag.True : Tag.False, 0));
    }
    commitNumber(isDouble) {
        const numberTag = isDouble ? Tag.Double : Tag.Integer;
        this.commitValue(makeValue(numberTag, 0));
    }
    commitString(s) {
        let value = undefined;
        if (this.handleRefs && this.isExpectingRef) {
            value = this.makeString(s);
        }
        else {
            const format = inferTransformedStringTypeKindForString(s, this.dateTimeRecognizer);
            if (format !== undefined) {
                if (defined(transformedStringTypeTargetTypeKindsMap.get(format)).attributesProducer !== undefined) {
                    value = makeValue(Tag.TransformedString, this.internString(s));
                }
                else {
                    value = makeValue(Tag.StringFormat, this.internString(format));
                }
            }
            else if (s.length <= 64) {
                value = this.makeString(s);
            }
            else {
                value = makeValue(Tag.UninternedString, 0);
            }
        }
        this.commitValue(value);
    }
    finish() {
        const value = this._rootValue;
        if (value === undefined) {
            return panic("Finished without root document");
        }
        assert(this._ctx === undefined && this._contextStack.length === 0, "Finished with contexts present");
        this._rootValue = undefined;
        return value;
    }
    pushContext() {
        if (this._ctx !== undefined) {
            this._contextStack.push(this._ctx);
        }
        this._ctx = {
            currentObject: undefined,
            currentArray: undefined,
            currentKey: undefined,
            currentNumberIsDouble: false
        };
    }
    pushObjectContext() {
        this.pushContext();
        defined(this._ctx).currentObject = [];
    }
    setPropertyKey(key) {
        const ctx = this.context;
        ctx.currentKey = key;
    }
    finishObject() {
        const obj = this.context.currentObject;
        if (obj === undefined) {
            return panic("Object ended but not started");
        }
        this.popContext();
        this.commitValue(this.internObject(obj));
    }
    pushArrayContext() {
        this.pushContext();
        defined(this._ctx).currentArray = [];
    }
    finishArray() {
        const arr = this.context.currentArray;
        if (arr === undefined) {
            return panic("Array ended but not started");
        }
        this.popContext();
        this.commitValue(this.internArray(arr));
    }
    popContext() {
        assert(this._ctx !== undefined, "Popping context when there isn't one");
        this._ctx = this._contextStack.pop();
    }
    equals(other) {
        return this === other;
    }
    hashCode() {
        let hashAccumulator = hashCodeInit;
        for (const s of this._strings) {
            hashAccumulator = addHashCode(hashAccumulator, hashString(s));
        }
        for (const s of Object.getOwnPropertyNames(this._stringIndexes).sort()) {
            hashAccumulator = addHashCode(hashAccumulator, hashString(s));
            hashAccumulator = addHashCode(hashAccumulator, this._stringIndexes[s]);
        }
        for (const o of this._objects) {
            for (const v of o) {
                hashAccumulator = addHashCode(hashAccumulator, v);
            }
        }
        for (const o of this._arrays) {
            for (const v of o) {
                hashAccumulator = addHashCode(hashAccumulator, v);
            }
        }
        return hashAccumulator;
    }
}
export class CompressedJSONFromString extends CompressedJSON {
    parse(input) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.parseSync(input);
        });
    }
    parseSync(input) {
        const json = JSON.parse(input);
        this.process(json);
        return this.finish();
    }
    process(json) {
        if (json === null) {
            this.commitNull();
        }
        else if (typeof json === "boolean") {
            this.commitBoolean(json);
        }
        else if (typeof json === "string") {
            this.commitString(json);
        }
        else if (typeof json === "number") {
            const isDouble = json !== Math.floor(json) || json < Number.MIN_SAFE_INTEGER || json > Number.MAX_SAFE_INTEGER;
            this.commitNumber(isDouble);
        }
        else if (Array.isArray(json)) {
            this.pushArrayContext();
            for (const v of json) {
                this.process(v);
            }
            this.finishArray();
        }
        else if (typeof json === "object") {
            this.pushObjectContext();
            for (const key of Object.getOwnPropertyNames(json)) {
                this.setPropertyKey(key);
                this.process(json[key]);
            }
            this.finishObject();
        }
        else {
            return panic("Invalid JSON object");
        }
    }
}
