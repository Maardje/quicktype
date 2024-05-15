import { mapMap } from "collection-utils";
import { ConvenienceRenderer } from "./ConvenienceRenderer";
import { DefaultDateTimeRecognizer } from "./DateTime";
import { serializeRenderResult } from "./Source";
import { defined } from "./support/Support";
export class TargetLanguage {
    constructor(displayName, names, extension) {
        this.displayName = displayName;
        this.names = names;
        this.extension = extension;
    }
    get optionDefinitions() {
        return this.getOptions().map(o => o.definition);
    }
    get cliOptionDefinitions() {
        let actual = [];
        let display = [];
        for (const { cliDefinitions } of this.getOptions()) {
            actual = actual.concat(cliDefinitions.actual);
            display = display.concat(cliDefinitions.display);
        }
        return { actual, display };
    }
    get name() {
        return defined(this.names[0]);
    }
    renderGraphAndSerialize(typeGraph, givenOutputFilename, alphabetizeProperties, leadingComments, rendererOptions, indentation) {
        if (indentation === undefined) {
            indentation = this.defaultIndentation;
        }
        const renderContext = { typeGraph, leadingComments };
        const renderer = this.makeRenderer(renderContext, rendererOptions);
        if (renderer instanceof ConvenienceRenderer) {
            renderer.setAlphabetizeProperties(alphabetizeProperties);
        }
        const renderResult = renderer.render(givenOutputFilename);
        return mapMap(renderResult.sources, s => serializeRenderResult(s, renderResult.names, defined(indentation)));
    }
    get defaultIndentation() {
        return "    ";
    }
    get stringTypeMapping() {
        return new Map();
    }
    get supportsOptionalClassProperties() {
        return false;
    }
    get supportsUnionsWithBothNumberTypes() {
        return false;
    }
    get supportsFullObjectType() {
        return false;
    }
    needsTransformerForType(_t) {
        return false;
    }
    get dateTimeRecognizer() {
        return new DefaultDateTimeRecognizer();
    }
}
