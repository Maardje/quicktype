"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.languageNamed = exports.all = void 0;
const collection_utils_1 = require("collection-utils");
const CJSON_1 = require("./CJSON");
const CPlusPlus_1 = require("./CPlusPlus");
const Crystal_1 = require("./Crystal");
const CSharp_1 = require("./CSharp");
const Dart_1 = require("./Dart");
const Elixir_1 = require("./Elixir");
const Elm_1 = require("./Elm");
const Golang_1 = require("./Golang");
const Haskell_1 = require("./Haskell");
const Java_1 = require("./Java");
const JavaScript_1 = require("./JavaScript");
// eslint-disable-next-line import/no-cycle
const JavaScriptPropTypes_1 = require("./JavaScriptPropTypes");
const JSONSchema_1 = require("./JSONSchema");
const Kotlin_1 = require("./Kotlin");
const Objective_C_1 = require("./Objective-C");
const Php_1 = require("./Php");
const Pike_1 = require("./Pike");
const Python_1 = require("./Python");
const ruby_1 = require("./ruby");
const Rust_1 = require("./Rust");
const Scala3_1 = require("./Scala3");
const Smithy4s_1 = require("./Smithy4s");
const Swift_1 = require("./Swift");
const TypeScriptEffectSchema_1 = require("./TypeScriptEffectSchema");
const TypeScriptFlow_1 = require("./TypeScriptFlow");
const TypeScriptZod_1 = require("./TypeScriptZod");
exports.all = [
    new CSharp_1.CSharpTargetLanguage(),
    new Golang_1.GoTargetLanguage(),
    new Rust_1.RustTargetLanguage(),
    new Crystal_1.CrystalTargetLanguage(),
    new CJSON_1.CJSONTargetLanguage(),
    new CPlusPlus_1.CPlusPlusTargetLanguage(),
    new Objective_C_1.ObjectiveCTargetLanguage(),
    new Java_1.JavaTargetLanguage(),
    new TypeScriptFlow_1.TypeScriptTargetLanguage(),
    new JavaScript_1.JavaScriptTargetLanguage(),
    new JavaScriptPropTypes_1.JavaScriptPropTypesTargetLanguage(),
    new TypeScriptFlow_1.FlowTargetLanguage(),
    new Swift_1.SwiftTargetLanguage(),
    new Scala3_1.Scala3TargetLanguage(),
    new Smithy4s_1.SmithyTargetLanguage(),
    new Kotlin_1.KotlinTargetLanguage(),
    new Elm_1.ElmTargetLanguage(),
    new JSONSchema_1.JSONSchemaTargetLanguage(),
    new ruby_1.RubyTargetLanguage(),
    new Dart_1.DartTargetLanguage(),
    new Python_1.PythonTargetLanguage("Python", ["python", "py"], "py"),
    new Pike_1.PikeTargetLanguage(),
    new Haskell_1.HaskellTargetLanguage(),
    new TypeScriptZod_1.TypeScriptZodTargetLanguage(),
    new TypeScriptEffectSchema_1.TypeScriptEffectSchemaTargetLanguage(),
    new Elixir_1.ElixirTargetLanguage(),
    new Php_1.PhpTargetLanguage()
];
function languageNamed(name, targetLanguages) {
    if (targetLanguages === undefined) {
        targetLanguages = exports.all;
    }
    const maybeTargetLanguage = (0, collection_utils_1.iterableFind)(targetLanguages, l => l.names.includes(name) || l.displayName === name);
    if (maybeTargetLanguage !== undefined)
        return maybeTargetLanguage;
    return (0, collection_utils_1.iterableFind)(targetLanguages, l => l.extension === name);
}
exports.languageNamed = languageNamed;
