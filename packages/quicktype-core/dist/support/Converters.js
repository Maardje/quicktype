import { EnumOption } from "../RendererOptions";
export var ConvertersOptions;
(function (ConvertersOptions) {
    ConvertersOptions["AllObjects"] = "all-objects";
    ConvertersOptions["TopLevel"] = "top-level";
})(ConvertersOptions || (ConvertersOptions = {}));
export function convertersOption() {
    return new EnumOption("converters", "Which converters to generate (top-level by default)", [
        [ConvertersOptions.TopLevel, ConvertersOptions.TopLevel],
        [ConvertersOptions.AllObjects, ConvertersOptions.AllObjects]
    ], ConvertersOptions.TopLevel, "secondary");
}
