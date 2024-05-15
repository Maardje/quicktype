import { arrayIntercalate, iterableMax, withDefault } from "collection-utils";
import { Name } from "./Naming";
import { repeatString } from "./support/Strings";
import { assert, assertNever, defined, panic } from "./support/Support";
export function newline() {
    // We're returning a new object instead of using a singleton
    // here because `Renderer` will modify `indentationChange`.
    return { kind: "newline", indentationChange: 0 };
}
export function sourcelikeToSource(sl) {
    if (sl instanceof Array) {
        return {
            kind: "sequence",
            sequence: sl.map(sourcelikeToSource)
        };
    }
    if (typeof sl === "string") {
        const lines = sl.split("\n");
        if (lines.length === 1) {
            return { kind: "text", text: sl };
        }
        return {
            kind: "sequence",
            sequence: arrayIntercalate(newline(), lines.map((l) => ({ kind: "text", text: l })))
        };
    }
    if (sl instanceof Name) {
        return { kind: "name", named: sl };
    }
    return sl;
}
export function annotated(annotation, sl) {
    return {
        kind: "annotated",
        annotation,
        source: sourcelikeToSource(sl)
    };
}
export function maybeAnnotated(doAnnotate, annotation, sl) {
    if (!doAnnotate) {
        return sl;
    }
    return annotated(annotation, sl);
}
export function modifySource(modifier, sl) {
    return {
        kind: "modified",
        modifier,
        source: sourcelikeToSource(sl)
    };
}
function sourceLineLength(source, names) {
    switch (source.kind) {
        case "text":
            return source.text.length;
        case "newline":
            return panic("Newline must not occur within a line.");
        case "sequence":
            return source.sequence
                .map((s) => sourceLineLength(s, names))
                .reduce((a, b) => a + b, 0);
        case "table":
            return panic("Table must not occur within a  line.");
        case "annotated":
            return sourceLineLength(source.source, names);
        case "name":
            return defined(names.get(source.named)).length;
        case "modified":
            return serializeRenderResult(source, names, "").lines.join("\n").length;
        default:
            return assertNever(source);
    }
}
export function serializeRenderResult(rootSource, names, indentation) {
    let indent = 0;
    let indentNeeded = 0;
    const lines = [];
    let currentLine = [];
    const annotations = [];
    function indentIfNeeded() {
        if (indentNeeded === 0)
            return;
        currentLine.push(repeatString(indentation, indentNeeded));
        indentNeeded = 0;
    }
    function flattenCurrentLine() {
        const str = currentLine.join("");
        currentLine = [str];
        return str;
    }
    function currentLocation() {
        return { line: lines.length, column: flattenCurrentLine().length };
    }
    function finishLine() {
        lines.push(flattenCurrentLine());
        currentLine = [];
    }
    function serializeToStringArray(source) {
        switch (source.kind) {
            case "text":
                indentIfNeeded();
                currentLine.push(source.text);
                break;
            case "newline":
                finishLine();
                indent += source.indentationChange;
                indentNeeded = indent;
                break;
            case "sequence":
                for (const s of source.sequence) {
                    serializeToStringArray(s);
                }
                break;
            case "table":
                const t = source.table;
                const numRows = t.length;
                if (numRows === 0)
                    break;
                const widths = t.map(l => l.map(s => sourceLineLength(s, names)));
                const numColumns = defined(iterableMax(t.map(l => l.length)));
                if (numColumns === 0)
                    break;
                const columnWidths = [];
                for (let i = 0; i < numColumns; i++) {
                    columnWidths.push(defined(iterableMax(widths.map(l => withDefault(l[i], 0)))));
                }
                for (let y = 0; y < numRows; y++) {
                    indentIfNeeded();
                    const row = defined(t[y]);
                    const rowWidths = defined(widths[y]);
                    for (let x = 0; x < numColumns; x++) {
                        const colWidth = columnWidths[x];
                        const src = withDefault(row[x], { kind: "text", text: "" });
                        const srcWidth = withDefault(rowWidths[x], 0);
                        serializeToStringArray(src);
                        if (x < numColumns - 1 && srcWidth < colWidth) {
                            currentLine.push(repeatString(" ", colWidth - srcWidth));
                        }
                    }
                    if (y < numRows - 1) {
                        finishLine();
                        indentNeeded = indent;
                    }
                }
                break;
            case "annotated":
                const start = currentLocation();
                serializeToStringArray(source.source);
                const end = currentLocation();
                annotations.push({ annotation: source.annotation, span: { start, end } });
                break;
            case "name":
                assert(names.has(source.named), "No name for Named");
                indentIfNeeded();
                currentLine.push(defined(names.get(source.named)));
                break;
            case "modified":
                indentIfNeeded();
                const serialized = serializeRenderResult(source.source, names, indentation).lines;
                assert(serialized.length === 1, "Cannot modify more than one line.");
                currentLine.push(source.modifier(serialized[0]));
                break;
            default:
                return assertNever(source);
        }
    }
    serializeToStringArray(rootSource);
    finishLine();
    return { lines, annotations: annotations };
}
export function singleWord(...source) {
    return { source, needsParens: false };
}
export function multiWord(separator, ...words) {
    assert(words.length > 0, "Zero words is not multiple");
    if (words.length === 1) {
        return singleWord(words[0]);
    }
    const items = [];
    for (let i = 0; i < words.length; i++) {
        if (i > 0)
            items.push(separator);
        items.push(words[i]);
    }
    return { source: items, needsParens: true };
}
export function parenIfNeeded({ source, needsParens }) {
    if (needsParens) {
        return ["(", source, ")"];
    }
    return source;
}
