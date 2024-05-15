import { arraySortByInto, iterableFirst, iterableSome, mapMapEntries, setFilter, withDefault } from "collection-utils";
import { minMaxLengthForType, minMaxValueForType } from "./attributes/Constraints";
import { StringTypes } from "./attributes/StringTypes";
import { combineTypeAttributes, emptyTypeAttributes } from "./attributes/TypeAttributes";
import { assert, defined, panic } from "./support/Support";
import { ArrayDecodingTransformer, ChoiceTransformer, DecodingChoiceTransformer, DecodingTransformer, MinMaxLengthCheckTransformer, MinMaxValueTransformer, ParseStringTransformer, StringMatchTransformer, StringProducerTransformer, Transformation, UnionInstantiationTransformer, transformationTypeAttributeKind } from "./Transformers";
import { ArrayType, EnumType, UnionType, isNumberTypeKind, isPrimitiveStringTypeKind, targetTypeKindForTransformedStringTypeKind } from "./Type";
import { typeRefIndex } from "./TypeGraph";
function transformationAttributes(graph, reconstitutedTargetType, transformer, debugPrintTransformations) {
    const transformation = new Transformation(graph, reconstitutedTargetType, transformer);
    if (debugPrintTransformations) {
        console.log(`transformation for ${typeRefIndex(reconstitutedTargetType)}:`);
        transformation.debugPrint();
        console.log("reverse:");
        transformation.reverse.debugPrint();
    }
    return transformationTypeAttributeKind.makeAttributes(transformation);
}
function makeEnumTransformer(graph, enumType, stringType, continuation) {
    const sortedCases = Array.from(enumType.cases).sort();
    const caseTransformers = sortedCases.map(c => new StringMatchTransformer(graph, stringType, new StringProducerTransformer(graph, stringType, continuation, c), c));
    return new ChoiceTransformer(graph, stringType, caseTransformers);
}
function replaceUnion(union, builder, forwardingRef, transformedTypes, debugPrintTransformations) {
    const graph = builder.typeGraph;
    assert(union.members.size > 0, "We can't have empty unions");
    // Type attributes that we lost during reconstitution.
    let additionalAttributes = emptyTypeAttributes;
    function reconstituteMember(t) {
        // Special handling for some transformed string type kinds: The type in
        // the union must be the target type, so if one already exists, use that
        // one, otherwise make a new one.
        if (isPrimitiveStringTypeKind(t.kind)) {
            const targetTypeKind = targetTypeKindForTransformedStringTypeKind(t.kind);
            if (targetTypeKind !== undefined) {
                const targetTypeMember = union.findMember(targetTypeKind);
                additionalAttributes = combineTypeAttributes("union", additionalAttributes, t.getAttributes());
                if (targetTypeMember !== undefined) {
                    return builder.reconstituteType(targetTypeMember);
                }
                return builder.getPrimitiveType(targetTypeKind);
            }
        }
        return builder.reconstituteType(t);
    }
    const reconstitutedMembersByKind = mapMapEntries(union.members.entries(), m => [m.kind, reconstituteMember(m)]);
    const reconstitutedMemberSet = new Set(reconstitutedMembersByKind.values());
    const haveUnion = reconstitutedMemberSet.size > 1;
    if (!haveUnion) {
        builder.setLostTypeAttributes();
    }
    const reconstitutedTargetType = haveUnion
        ? builder.getUnionType(union.getAttributes(), reconstitutedMemberSet)
        : defined(iterableFirst(reconstitutedMemberSet));
    function memberForKind(kind) {
        return defined(reconstitutedMembersByKind.get(kind));
    }
    function consumer(memberTypeRef) {
        if (!haveUnion)
            return undefined;
        return new UnionInstantiationTransformer(graph, memberTypeRef);
    }
    function transformerForKind(kind) {
        const member = union.findMember(kind);
        if (member === undefined)
            return undefined;
        const memberTypeRef = memberForKind(kind);
        return new DecodingTransformer(graph, memberTypeRef, consumer(memberTypeRef));
    }
    let maybeStringType = undefined;
    function getStringType() {
        if (maybeStringType === undefined) {
            maybeStringType = builder.getStringType(emptyTypeAttributes, StringTypes.unrestricted);
        }
        return maybeStringType;
    }
    function transformerForStringType(t) {
        const memberRef = memberForKind(t.kind);
        if (t.kind === "string") {
            const minMax = minMaxLengthForType(t);
            if (minMax === undefined) {
                return consumer(memberRef);
            }
            const [min, max] = minMax;
            return new MinMaxLengthCheckTransformer(graph, getStringType(), consumer(memberRef), min, max);
        }
        else if (t instanceof EnumType && transformedTypes.has(t)) {
            return makeEnumTransformer(graph, t, getStringType(), consumer(memberRef));
        }
        else {
            return new ParseStringTransformer(graph, getStringType(), consumer(memberRef));
        }
    }
    const stringTypes = arraySortByInto(Array.from(union.stringTypeMembers), t => t.kind);
    let transformerForString;
    if (stringTypes.length === 0) {
        transformerForString = undefined;
    }
    else if (stringTypes.length === 1) {
        const t = stringTypes[0];
        transformerForString = new DecodingTransformer(graph, getStringType(), transformerForStringType(t));
    }
    else {
        transformerForString = new DecodingTransformer(graph, getStringType(), new ChoiceTransformer(graph, getStringType(), stringTypes.map(t => defined(transformerForStringType(t)))));
    }
    const transformerForClass = transformerForKind("class");
    const transformerForMap = transformerForKind("map");
    assert(transformerForClass === undefined || transformerForMap === undefined, "Can't have both class and map in a transformed union");
    const transformerForObject = transformerForClass !== null && transformerForClass !== void 0 ? transformerForClass : transformerForMap;
    const transformer = new DecodingChoiceTransformer(graph, builder.getPrimitiveType("any"), transformerForKind("null"), transformerForKind("integer"), transformerForKind("double"), transformerForKind("bool"), transformerForString, transformerForKind("array"), transformerForObject);
    const attributes = transformationAttributes(graph, reconstitutedTargetType, transformer, debugPrintTransformations);
    return builder.getPrimitiveType("any", combineTypeAttributes("union", attributes, additionalAttributes), forwardingRef);
}
function replaceArray(arrayType, builder, forwardingRef, debugPrintTransformations) {
    const anyType = builder.getPrimitiveType("any");
    const anyArrayType = builder.getArrayType(emptyTypeAttributes, anyType);
    const reconstitutedItems = builder.reconstituteType(arrayType.items);
    const transformer = new ArrayDecodingTransformer(builder.typeGraph, anyArrayType, undefined, reconstitutedItems, new DecodingTransformer(builder.typeGraph, anyType, undefined));
    const reconstitutedArray = builder.getArrayType(builder.reconstituteTypeAttributes(arrayType.getAttributes()), reconstitutedItems);
    const attributes = transformationAttributes(builder.typeGraph, reconstitutedArray, transformer, debugPrintTransformations);
    return builder.getArrayType(attributes, anyType, forwardingRef);
}
function replaceEnum(enumType, builder, forwardingRef, debugPrintTransformations) {
    const stringType = builder.getStringType(emptyTypeAttributes, StringTypes.unrestricted);
    const transformer = new DecodingTransformer(builder.typeGraph, stringType, makeEnumTransformer(builder.typeGraph, enumType, stringType));
    const reconstitutedEnum = builder.getEnumType(enumType.getAttributes(), enumType.cases);
    const attributes = transformationAttributes(builder.typeGraph, reconstitutedEnum, transformer, debugPrintTransformations);
    return builder.getStringType(attributes, StringTypes.unrestricted, forwardingRef);
}
function replaceNumber(t, builder, forwardingRef, debugPrintTransformations) {
    const stringType = builder.getStringType(emptyTypeAttributes, StringTypes.unrestricted);
    const [min, max] = defined(minMaxValueForType(t));
    const transformer = new DecodingTransformer(builder.typeGraph, stringType, new MinMaxValueTransformer(builder.typeGraph, stringType, undefined, min, max));
    const reconstitutedAttributes = builder.reconstituteTypeAttributes(t.getAttributes());
    const attributes = transformationAttributes(builder.typeGraph, builder.getPrimitiveType("double", reconstitutedAttributes, undefined), transformer, debugPrintTransformations);
    return builder.getPrimitiveType("double", attributes, forwardingRef);
}
function replaceString(t, builder, forwardingRef, debugPrintTransformations) {
    const [min, max] = defined(minMaxLengthForType(t));
    const reconstitutedAttributes = builder.reconstituteTypeAttributes(t.getAttributes());
    const stringType = builder.getStringType(emptyTypeAttributes, StringTypes.unrestricted);
    const transformer = new DecodingTransformer(builder.typeGraph, stringType, new MinMaxLengthCheckTransformer(builder.typeGraph, stringType, undefined, min, max));
    const attributes = transformationAttributes(builder.typeGraph, builder.getStringType(reconstitutedAttributes, undefined), transformer, debugPrintTransformations);
    return builder.getStringType(attributes, StringTypes.unrestricted, forwardingRef);
}
function replaceTransformedStringType(t, kind, builder, forwardingRef, debugPrintTransformations) {
    const reconstitutedAttributes = builder.reconstituteTypeAttributes(t.getAttributes());
    const targetTypeKind = withDefault(targetTypeKindForTransformedStringTypeKind(kind), kind);
    const stringType = builder.getStringType(emptyTypeAttributes, StringTypes.unrestricted);
    const transformer = new DecodingTransformer(builder.typeGraph, stringType, new ParseStringTransformer(builder.typeGraph, stringType, undefined));
    const attributes = transformationAttributes(builder.typeGraph, builder.getPrimitiveType(targetTypeKind, reconstitutedAttributes), transformer, debugPrintTransformations);
    return builder.getStringType(attributes, StringTypes.unrestricted, forwardingRef);
}
export function makeTransformations(ctx, graph, targetLanguage) {
    const transformedTypes = setFilter(graph.allTypesUnordered(), t => {
        if (targetLanguage.needsTransformerForType(t))
            return true;
        if (!(t instanceof UnionType))
            return false;
        const stringMembers = t.stringTypeMembers;
        if (stringMembers.size <= 1)
            return false;
        return iterableSome(stringMembers, m => targetLanguage.needsTransformerForType(m));
    });
    function replace(setOfOneUnion, builder, forwardingRef) {
        const t = defined(iterableFirst(setOfOneUnion));
        if (t instanceof UnionType) {
            return replaceUnion(t, builder, forwardingRef, transformedTypes, ctx.debugPrintTransformations);
        }
        if (t instanceof ArrayType) {
            return replaceArray(t, builder, forwardingRef, ctx.debugPrintTransformations);
        }
        if (t instanceof EnumType) {
            return replaceEnum(t, builder, forwardingRef, ctx.debugPrintTransformations);
        }
        if (t.kind === "string") {
            return replaceString(t, builder, forwardingRef, ctx.debugPrintTransformations);
        }
        if (isNumberTypeKind(t.kind)) {
            return replaceNumber(t, builder, forwardingRef, ctx.debugPrintTransformations);
        }
        if (isPrimitiveStringTypeKind(t.kind)) {
            return replaceTransformedStringType(t, t.kind, builder, forwardingRef, ctx.debugPrintTransformations);
        }
        return panic(`Cannot make transformation for type ${t.kind}`);
    }
    const groups = Array.from(transformedTypes).map(t => [t]);
    return graph.rewrite("make-transformations", ctx.stringTypeMapping, false, groups, ctx.debugPrintReconstitution, replace);
}
