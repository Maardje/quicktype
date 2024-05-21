import URI from 'urijs';
import { Readable } from 'readable-stream';

interface DateTimeRecognizer {
    isDate: (s: string) => boolean;
    isDateTime: (s: string) => boolean;
    isTime: (s: string) => boolean;
}

declare class AnnotationData {
}
declare class IssueAnnotationData extends AnnotationData {
    readonly message: string;
    constructor(message: string);
}

declare class Namespace {
    readonly forbiddenNamespaces: ReadonlySet<Namespace>;
    readonly additionalForbidden: ReadonlySet<Name>;
    private readonly _children;
    private readonly _members;
    constructor(_name: string, parent: Namespace | undefined, forbiddenNamespaces: Iterable<Namespace>, additionalForbidden: Iterable<Name>);
    private addChild;
    get children(): ReadonlySet<Namespace>;
    get members(): ReadonlySet<Name>;
    get forbiddenNameds(): ReadonlySet<Name>;
    add<TName extends Name>(named: TName): TName;
}
type NameStyle = (rawName: string) => string;
declare class Namer {
    readonly name: string;
    readonly nameStyle: NameStyle;
    prefixes: string[];
    private readonly _prefixes;
    constructor(name: string, nameStyle: NameStyle, prefixes: string[]);
    assignNames(names: ReadonlyMap<Name, string>, forbiddenNamesIterable: Iterable<string>, namesToAssignIterable: Iterable<Name>): ReadonlyMap<Name, string>;
}
declare function funPrefixNamer(name: string, nameStyle: NameStyle): Namer;
declare abstract class Name {
    private readonly _namingFunction;
    readonly order: number;
    private readonly _associates;
    constructor(_namingFunction: Namer | undefined, order: number);
    addAssociate(associate: AssociatedName): void;
    abstract get dependencies(): readonly Name[];
    isFixed(): this is FixedName;
    get namingFunction(): Namer;
    abstract proposeUnstyledNames(names: ReadonlyMap<Name, string>): ReadonlySet<string>;
    firstProposedName(names: ReadonlyMap<Name, string>): string;
    nameAssignments(forbiddenNames: ReadonlySet<string>, assignedName: string): ReadonlyMap<Name, string> | null;
}
declare class FixedName extends Name {
    private readonly _fixedName;
    constructor(_fixedName: string);
    get dependencies(): readonly Name[];
    addAssociate(_: AssociatedName): never;
    get fixedName(): string;
    proposeUnstyledNames(_?: ReadonlyMap<Name, string>): ReadonlySet<string>;
}
declare class AssociatedName extends Name {
    private readonly _sponsor;
    readonly getName: (sponsorName: string) => string;
    constructor(_sponsor: Name, order: number, getName: (sponsorName: string) => string);
    get dependencies(): readonly Name[];
    proposeUnstyledNames(_?: ReadonlyMap<Name, string>): never;
}
declare class DependencyName extends Name {
    private readonly _proposeUnstyledName;
    private readonly _dependencies;
    constructor(namingFunction: Namer | undefined, order: number, _proposeUnstyledName: (lookup: (n: Name) => string) => string);
    get dependencies(): readonly Name[];
    proposeUnstyledNames(names: ReadonlyMap<Name, string>): ReadonlySet<string>;
}

type Source = TextSource | NewlineSource | SequenceSource | TableSource | AnnotatedSource | NameSource | ModifiedSource;
interface TextSource {
    kind: "text";
    text: string;
}
interface NewlineSource {
    indentationChange: number;
    kind: "newline";
}
interface SequenceSource {
    kind: "sequence";
    sequence: readonly Source[];
}
interface TableSource {
    kind: "table";
    table: ReadonlyArray<readonly Source[]>;
}
interface AnnotatedSource {
    annotation: AnnotationData;
    kind: "annotated";
    source: Source;
}
interface NameSource {
    kind: "name";
    named: Name;
}
interface ModifiedSource {
    kind: "modified";
    modifier: (serialized: string) => string;
    source: Source;
}
type Sourcelike = Source | string | Name | SourcelikeArray;
type SourcelikeArray = Sourcelike[];
declare function modifySource(modifier: (serialized: string) => string, sl: Sourcelike): Sourcelike;
interface Location {
    column: number;
    line: number;
}
interface Span {
    end: Location;
    start: Location;
}
interface Annotation {
    annotation: AnnotationData;
    span: Span;
}
interface SerializedRenderResult {
    annotations: readonly Annotation[];
    lines: string[];
}
interface MultiWord {
    needsParens: boolean;
    source: Sourcelike;
}
declare function singleWord(...source: Sourcelike[]): MultiWord;
declare function parenIfNeeded({ source, needsParens }: MultiWord): Sourcelike;

interface CommentOptions {
    afterComment?: string;
    beforeComment?: string;
    firstLineStart?: string;
    lineEnd?: string;
    lineStart?: string;
}
interface DescriptionBlockCommentConfig {
    descriptionBlock: Sourcelike[];
}
interface InlineCommentConfig {
    lines: Sourcelike[];
}
type CustomCommentConfig = CommentOptions & {
    customLines: Sourcelike[];
};
type CommentConfig = DescriptionBlockCommentConfig | InlineCommentConfig | CustomCommentConfig;
type Comment = string | CommentConfig;

type NameOrNames = string | TypeNames;
declare abstract class TypeNames {
    readonly distance: number;
    static makeWithDistance(names: ReadonlySet<string>, alternativeNames: ReadonlySet<string> | undefined, distance: number): TypeNames;
    static make(names: ReadonlySet<string>, alternativeNames: ReadonlySet<string> | undefined, areInferred: boolean): TypeNames;
    constructor(distance: number);
    get areInferred(): boolean;
    abstract get names(): ReadonlySet<string>;
    abstract get combinedName(): string;
    abstract get proposedNames(): ReadonlySet<string>;
    abstract add(namesArray: TypeNames[], startIndex?: number): TypeNames;
    abstract clearInferred(): TypeNames;
    abstract makeInferred(): TypeNames;
    abstract singularize(): TypeNames;
    abstract toString(): string;
}
declare const namesTypeAttributeKind: TypeAttributeKind<TypeNames>;
declare function makeNamesTypeAttributes(nameOrNames: NameOrNames, areNamesInferred?: boolean): TypeAttributes;

declare class StringTypes {
    readonly cases: ReadonlyMap<string, number> | undefined;
    readonly transformations: ReadonlySet<TransformedStringTypeKind>;
    static readonly unrestricted: StringTypes;
    static fromCase(s: string, count: number): StringTypes;
    static fromCases(cases: string[]): StringTypes;
    constructor(cases: ReadonlyMap<string, number> | undefined, transformations: ReadonlySet<TransformedStringTypeKind>);
    get isRestricted(): boolean;
    union(othersArray: StringTypes[], startIndex: number): StringTypes;
    intersect(othersArray: StringTypes[], startIndex: number): StringTypes;
    applyStringTypeMapping(mapping: StringTypeMapping): StringTypes;
    equals<T extends StringTypes>(other: T): boolean;
    hashCode(): number;
    toString(): string;
}

type StringTypeMapping = ReadonlyMap<TransformedStringTypeKind, PrimitiveStringTypeKind>;
declare class TypeBuilder {
    private readonly _stringTypeMapping;
    readonly canonicalOrder: boolean;
    private readonly _allPropertiesOptional;
    private readonly _addProvenanceAttributes;
    readonly typeGraph: TypeGraph;
    protected readonly topLevels: Map<string, TypeRef>;
    protected readonly types: Array<Type | undefined>;
    private readonly typeAttributes;
    private _addedForwardingIntersection;
    constructor(typeGraphSerial: number, _stringTypeMapping: StringTypeMapping, canonicalOrder: boolean, _allPropertiesOptional: boolean, _addProvenanceAttributes: boolean, inheritsProvenanceAttributes: boolean);
    addTopLevel(name: string, tref: TypeRef): void;
    reserveTypeRef(): TypeRef;
    private assertTypeRefGraph;
    private assertTypeRefSetGraph;
    private filterTypeAttributes;
    private commitType;
    protected addType<T extends Type>(forwardingRef: TypeRef | undefined, creator: (tref: TypeRef) => T, attributes: TypeAttributes | undefined): TypeRef;
    typeAtIndex(index: number): Type;
    atIndex(index: number): [Type, TypeAttributes];
    addAttributes(tref: TypeRef, attributes: TypeAttributes): void;
    finish(): TypeGraph;
    protected addForwardingIntersection(forwardingRef: TypeRef, tref: TypeRef): TypeRef;
    protected forwardIfNecessary(forwardingRef: TypeRef | undefined, tref: undefined): undefined;
    protected forwardIfNecessary(forwardingRef: TypeRef | undefined, tref: TypeRef): TypeRef;
    protected forwardIfNecessary(forwardingRef: TypeRef | undefined, tref: TypeRef | undefined): TypeRef | undefined;
    get didAddForwardingIntersection(): boolean;
    private readonly _typeForIdentity;
    private registerTypeForIdentity;
    protected makeIdentity(maker: () => MaybeTypeIdentity): MaybeTypeIdentity;
    private getOrAddType;
    private registerType;
    getPrimitiveType(kind: PrimitiveTypeKind, maybeAttributes?: TypeAttributes, forwardingRef?: TypeRef): TypeRef;
    getStringType(attributes: TypeAttributes, stringTypes: StringTypes | undefined, forwardingRef?: TypeRef): TypeRef;
    getEnumType(attributes: TypeAttributes, cases: ReadonlySet<string>, forwardingRef?: TypeRef): TypeRef;
    makeClassProperty(tref: TypeRef, isOptional: boolean): ClassProperty;
    getUniqueObjectType(attributes: TypeAttributes, properties: ReadonlyMap<string, ClassProperty> | undefined, additionalProperties: TypeRef | undefined, forwardingRef?: TypeRef): TypeRef;
    getUniqueMapType(forwardingRef?: TypeRef): TypeRef;
    getMapType(attributes: TypeAttributes, values: TypeRef, forwardingRef?: TypeRef): TypeRef;
    setObjectProperties(ref: TypeRef, properties: ReadonlyMap<string, ClassProperty>, additionalProperties: TypeRef | undefined): void;
    getUniqueArrayType(forwardingRef?: TypeRef): TypeRef;
    getArrayType(attributes: TypeAttributes, items: TypeRef, forwardingRef?: TypeRef): TypeRef;
    setArrayItems(ref: TypeRef, items: TypeRef): void;
    modifyPropertiesIfNecessary(properties: ReadonlyMap<string, ClassProperty>): ReadonlyMap<string, ClassProperty>;
    getClassType(attributes: TypeAttributes, properties: ReadonlyMap<string, ClassProperty>, forwardingRef?: TypeRef): TypeRef;
    getUniqueClassType(attributes: TypeAttributes, isFixed: boolean, properties: ReadonlyMap<string, ClassProperty> | undefined, forwardingRef?: TypeRef): TypeRef;
    getUnionType(attributes: TypeAttributes, members: ReadonlySet<TypeRef>, forwardingRef?: TypeRef): TypeRef;
    getUniqueUnionType(attributes: TypeAttributes, members: ReadonlySet<TypeRef> | undefined, forwardingRef?: TypeRef): TypeRef;
    getIntersectionType(attributes: TypeAttributes, members: ReadonlySet<TypeRef>, forwardingRef?: TypeRef): TypeRef;
    getUniqueIntersectionType(attributes: TypeAttributes, members: ReadonlySet<TypeRef> | undefined, forwardingRef?: TypeRef): TypeRef;
    setSetOperationMembers(ref: TypeRef, members: ReadonlySet<TypeRef>): void;
    setLostTypeAttributes(): void;
}

interface StringMap {
    [name: string]: any;
}
declare function checkStringMap(x: unknown): StringMap;
declare function checkStringMap<T>(x: unknown, checkValue: (v: unknown) => v is T): {
    [name: string]: T;
};
declare function checkArray(x: unknown): unknown[];
declare function checkArray<T>(x: unknown, checkItem: (v: unknown) => v is T): T[];
declare function defined<T>(x: T | undefined): T;
declare function assertNever(x: never): never;
declare function assert(condition: boolean, message?: string): void;
declare function panic(message: string): never;
declare function inflateBase64(encoded: string): string;
declare function parseJSON(text: string, description: string, address?: string): JSONSchema | undefined;

type JSONSchema = StringMap | boolean;
declare abstract class JSONSchemaStore {
    private readonly _schemas;
    private add;
    abstract fetch(_address: string): Promise<JSONSchema | undefined>;
    get(address: string, debugPrint: boolean): Promise<JSONSchema | undefined>;
}

declare enum PathElementKind {
    Root = 1,
    KeyOrIndex = 2,
    Type = 3,
    Object = 4
}
type PathElement = {
    kind: PathElementKind.Root;
} | {
    key: string;
    kind: PathElementKind.KeyOrIndex;
} | {
    index: number;
    kind: PathElementKind.Type;
} | {
    kind: PathElementKind.Object;
};
declare class Ref {
    readonly path: readonly PathElement[];
    static root(address: string | undefined): Ref;
    private static parsePath;
    static parseURI(uri: URI, destroyURI?: boolean): Ref;
    static parse(ref: string): Ref;
    addressURI: URI | undefined;
    constructor(addressURI: URI | undefined, path: readonly PathElement[]);
    get hasAddress(): boolean;
    get address(): string;
    get isRoot(): boolean;
    private pushElement;
    push(...keys: string[]): Ref;
    pushObject(): Ref;
    pushType(index: number): Ref;
    resolveAgainst(base: Ref | undefined): Ref;
    get name(): string;
    get definitionName(): string | undefined;
    toString(): string;
    private lookup;
    lookupRef(root: JSONSchema): JSONSchema;
    equals<R extends Ref>(other: R): boolean;
    hashCode(): number;
}
declare const schemaTypeDict: {
    null: boolean;
    boolean: boolean;
    string: boolean;
    integer: boolean;
    number: boolean;
    array: boolean;
    object: boolean;
};
type JSONSchemaType = keyof typeof schemaTypeDict;
interface JSONSchemaAttributes {
    forCases?: TypeAttributes[];
    forNumber?: TypeAttributes;
    forObject?: TypeAttributes;
    forString?: TypeAttributes;
    forType?: TypeAttributes;
    forUnion?: TypeAttributes;
}
type JSONSchemaAttributeProducer = (schema: JSONSchema, canonicalRef: Ref, types: Set<JSONSchemaType>, unionCases: JSONSchema[] | undefined) => JSONSchemaAttributes | undefined;
interface JSONSchemaSourceData {
    isConverted?: boolean;
    name: string;
    schema?: string;
    uris?: string[];
}
declare class JSONSchemaInput implements Input<JSONSchemaSourceData> {
    private _schemaStore;
    private readonly _additionalSchemaAddresses;
    readonly kind: string;
    readonly needSchemaProcessing: boolean;
    private readonly _attributeProducers;
    private readonly _schemaInputs;
    private _schemaSources;
    private readonly _topLevels;
    private _needIR;
    constructor(_schemaStore: JSONSchemaStore | undefined, additionalAttributeProducers?: JSONSchemaAttributeProducer[], _additionalSchemaAddresses?: readonly string[]);
    get needIR(): boolean;
    addTopLevel(name: string, ref: Ref): void;
    addTypes(ctx: RunContext, typeBuilder: TypeBuilder): Promise<void>;
    addTypesSync(): void;
    addSource(schemaSource: JSONSchemaSourceData): Promise<void>;
    addSourceSync(schemaSource: JSONSchemaSourceData): void;
    singleStringSchemaSource(): string | undefined;
}

type URIAttributes = [ReadonlySet<string>, ReadonlySet<string>];
declare const uriTypeAttributeKind: TypeAttributeKind<URIAttributes>;
declare function uriInferenceAttributesProducer(s: string): TypeAttributes;

/**
 * `jsonSchema` is the `format` to be used to represent this string type in
 * JSON Schema.  It's ok to "invent" a new one if the JSON Schema standard doesn't
 * have that particular type yet.
 *
 * For transformed type kinds that map to an existing primitive type, `primitive`
 * must specify that type kind.
 */
interface TransformedStringTypeTargets {
    attributesProducer?: (s: string) => TypeAttributes;
    jsonSchema: string;
    primitive: PrimitiveNonStringTypeKind | undefined;
}
/**
 * All the transformed string type kinds and the JSON Schema formats and
 * primitive type kinds they map to.  Not all transformed string types map to
 * primitive types.  Date-time types, for example, stand on their own, but
 * stringified integers map to integers.
 */
declare const transformedStringTypeTargetTypeKinds: {
    date: {
        jsonSchema: string;
        primitive: any;
    };
    time: {
        jsonSchema: string;
        primitive: any;
    };
    "date-time": {
        jsonSchema: string;
        primitive: any;
    };
    uuid: {
        jsonSchema: string;
        primitive: any;
    };
    uri: {
        jsonSchema: string;
        primitive: any;
        attributesProducer: typeof uriInferenceAttributesProducer;
    };
    "integer-string": TransformedStringTypeTargets;
    "bool-string": TransformedStringTypeTargets;
};
type TransformedStringTypeKind = keyof typeof transformedStringTypeTargetTypeKinds;
type PrimitiveStringTypeKind = "string" | TransformedStringTypeKind;
type PrimitiveNonStringTypeKind = "none" | "any" | "null" | "bool" | "integer" | "double";
type PrimitiveTypeKind = PrimitiveNonStringTypeKind | PrimitiveStringTypeKind;
type NamedTypeKind = "class" | "enum" | "union";
type TypeKind = PrimitiveTypeKind | NamedTypeKind | "array" | "object" | "map" | "intersection";
type ObjectTypeKind = "object" | "map" | "class";
declare class TypeIdentity {
    private readonly _kind;
    private readonly _components;
    private readonly _hashCode;
    constructor(_kind: TypeKind, _components: readonly unknown[]);
    equals<T extends TypeIdentity>(other: T): boolean;
    hashCode(): number;
}
type MaybeTypeIdentity = TypeIdentity | undefined;
declare abstract class Type {
    readonly typeRef: TypeRef;
    protected readonly graph: TypeGraph;
    abstract readonly kind: TypeKind;
    constructor(typeRef: TypeRef, graph: TypeGraph);
    get index(): number;
    abstract getNonAttributeChildren(): Set<Type>;
    getChildren(): ReadonlySet<Type>;
    getAttributes(): TypeAttributes;
    get hasNames(): boolean;
    getNames(): TypeNames;
    getCombinedName(): string;
    abstract get isNullable(): boolean;
    abstract isPrimitive(): this is PrimitiveType;
    abstract get identity(): MaybeTypeIdentity;
    abstract reconstitute<T extends BaseGraphRewriteBuilder>(builder: TypeReconstituter<T>, canonicalOrder: boolean): void;
    get debugPrintKind(): string;
    equals<T extends Type>(other: T): boolean;
    hashCode(): number;
    protected abstract structuralEqualityStep(other: Type, conflateNumbers: boolean, queue: (a: Type, b: Type) => boolean): boolean;
    structurallyCompatible(other: Type, conflateNumbers?: boolean): boolean;
    getParentTypes(): ReadonlySet<Type>;
    getAncestorsNotInSet(set: ReadonlySet<TypeRef>): ReadonlySet<Type>;
}
declare class PrimitiveType extends Type {
    readonly kind: PrimitiveTypeKind;
    constructor(typeRef: TypeRef, graph: TypeGraph, kind: PrimitiveTypeKind);
    get isNullable(): boolean;
    isPrimitive(): this is PrimitiveType;
    getNonAttributeChildren(): Set<Type>;
    get identity(): MaybeTypeIdentity;
    reconstitute<T extends BaseGraphRewriteBuilder>(builder: TypeReconstituter<T>): void;
    protected structuralEqualityStep(_other: Type, _conflateNumbers: boolean, _queue: (a: Type, b: Type) => boolean): boolean;
}
declare class ArrayType extends Type {
    private _itemsRef?;
    readonly kind = "array";
    constructor(typeRef: TypeRef, graph: TypeGraph, _itemsRef?: TypeRef);
    setItems(itemsRef: TypeRef): void;
    private getItemsRef;
    get items(): Type;
    getNonAttributeChildren(): Set<Type>;
    get isNullable(): boolean;
    isPrimitive(): this is PrimitiveType;
    get identity(): MaybeTypeIdentity;
    reconstitute<T extends BaseGraphRewriteBuilder>(builder: TypeReconstituter<T>): void;
    protected structuralEqualityStep(other: ArrayType, _conflateNumbers: boolean, queue: (a: Type, b: Type) => boolean): boolean;
}
declare class GenericClassProperty<T> {
    readonly typeData: T;
    readonly isOptional: boolean;
    constructor(typeData: T, isOptional: boolean);
    equals(other: GenericClassProperty<unknown>): boolean;
    hashCode(): number;
}
declare class ClassProperty extends GenericClassProperty<TypeRef> {
    readonly graph: TypeGraph;
    constructor(typeRef: TypeRef, graph: TypeGraph, isOptional: boolean);
    get typeRef(): TypeRef;
    get type(): Type;
}
declare class ObjectType extends Type {
    readonly kind: ObjectTypeKind;
    readonly isFixed: boolean;
    private _properties;
    private _additionalPropertiesRef;
    constructor(typeRef: TypeRef, graph: TypeGraph, kind: ObjectTypeKind, isFixed: boolean, _properties: ReadonlyMap<string, ClassProperty> | undefined, _additionalPropertiesRef: TypeRef | undefined);
    setProperties(properties: ReadonlyMap<string, ClassProperty>, additionalPropertiesRef: TypeRef | undefined): void;
    getProperties(): ReadonlyMap<string, ClassProperty>;
    getSortedProperties(): ReadonlyMap<string, ClassProperty>;
    private getAdditionalPropertiesRef;
    getAdditionalProperties(): Type | undefined;
    getNonAttributeChildren(): Set<Type>;
    get isNullable(): boolean;
    isPrimitive(): this is PrimitiveType;
    get identity(): MaybeTypeIdentity;
    reconstitute<T extends BaseGraphRewriteBuilder>(builder: TypeReconstituter<T>, canonicalOrder: boolean): void;
    protected structuralEqualityStep(other: ObjectType, _conflateNumbers: boolean, queue: (a: Type, b: Type) => boolean): boolean;
}
declare class ClassType extends ObjectType {
    constructor(typeRef: TypeRef, graph: TypeGraph, isFixed: boolean, properties: ReadonlyMap<string, ClassProperty> | undefined);
}
declare class MapType extends ObjectType {
    constructor(typeRef: TypeRef, graph: TypeGraph, valuesRef: TypeRef | undefined);
    get values(): Type;
}
declare class EnumType extends Type {
    readonly cases: ReadonlySet<string>;
    readonly kind = "enum";
    constructor(typeRef: TypeRef, graph: TypeGraph, cases: ReadonlySet<string>);
    get isNullable(): boolean;
    isPrimitive(): this is PrimitiveType;
    get identity(): MaybeTypeIdentity;
    getNonAttributeChildren(): Set<Type>;
    reconstitute<T extends BaseGraphRewriteBuilder>(builder: TypeReconstituter<T>): void;
    protected structuralEqualityStep(other: EnumType, _conflateNumbers: boolean, _queue: (a: Type, b: Type) => void): boolean;
}
declare abstract class SetOperationType extends Type {
    readonly kind: TypeKind;
    private _memberRefs?;
    constructor(typeRef: TypeRef, graph: TypeGraph, kind: TypeKind, _memberRefs?: ReadonlySet<TypeRef>);
    setMembers(memberRefs: ReadonlySet<TypeRef>): void;
    protected getMemberRefs(): ReadonlySet<TypeRef>;
    get members(): ReadonlySet<Type>;
    get sortedMembers(): ReadonlySet<Type>;
    getNonAttributeChildren(): Set<Type>;
    isPrimitive(): this is PrimitiveType;
    get identity(): MaybeTypeIdentity;
    protected reconstituteSetOperation<T extends BaseGraphRewriteBuilder>(builder: TypeReconstituter<T>, canonicalOrder: boolean, getType: (members: ReadonlySet<TypeRef> | undefined) => void): void;
    protected structuralEqualityStep(other: SetOperationType, conflateNumbers: boolean, queue: (a: Type, b: Type) => boolean): boolean;
}
declare class UnionType extends SetOperationType {
    constructor(typeRef: TypeRef, graph: TypeGraph, memberRefs?: ReadonlySet<TypeRef>);
    setMembers(memberRefs: ReadonlySet<TypeRef>): void;
    get stringTypeMembers(): ReadonlySet<Type>;
    findMember(kind: TypeKind): Type | undefined;
    get isNullable(): boolean;
    get isCanonical(): boolean;
    reconstitute<T extends BaseGraphRewriteBuilder>(builder: TypeReconstituter<T>, canonicalOrder: boolean): void;
}

interface TypeLookerUp {
    lookupTypeRefs: (typeRefs: TypeRef[], forwardingRef?: TypeRef) => TypeRef | undefined;
    reconstituteTypeRef: (typeRef: TypeRef, attributes?: TypeAttributes, forwardingRef?: TypeRef) => TypeRef;
}
declare class TypeReconstituter<TBuilder extends BaseGraphRewriteBuilder> {
    private readonly _typeBuilder;
    private readonly _makeClassUnique;
    private readonly _typeAttributes;
    private readonly _forwardingRef;
    private readonly _register;
    private _wasUsed;
    private _typeRef;
    constructor(_typeBuilder: TBuilder, _makeClassUnique: boolean, _typeAttributes: TypeAttributes, _forwardingRef: TypeRef | undefined, _register: (tref: TypeRef) => void);
    private builderForNewType;
    private builderForSetting;
    getResult(): TypeRef;
    private register;
    private registerAndAddAttributes;
    lookup(tref: TypeRef): TypeRef | undefined;
    lookup(trefs: Iterable<TypeRef>): readonly TypeRef[] | undefined;
    lookupMap<K>(trefs: ReadonlyMap<K, TypeRef>): ReadonlyMap<K, TypeRef> | undefined;
    reconstitute(tref: TypeRef): TypeRef;
    reconstitute(trefs: Iterable<TypeRef>): readonly TypeRef[];
    reconstituteMap<K>(trefs: ReadonlyMap<K, TypeRef>): ReadonlyMap<K, TypeRef>;
    getPrimitiveType(kind: PrimitiveTypeKind): void;
    getEnumType(cases: ReadonlySet<string>): void;
    getUniqueMapType(): void;
    getMapType(values: TypeRef): void;
    getUniqueArrayType(): void;
    getArrayType(items: TypeRef): void;
    setArrayItems(items: TypeRef): void;
    makeClassProperty(tref: TypeRef, isOptional: boolean): ClassProperty;
    getObjectType(properties: ReadonlyMap<string, ClassProperty>, additionalProperties: TypeRef | undefined): void;
    getUniqueObjectType(properties: ReadonlyMap<string, ClassProperty> | undefined, additionalProperties: TypeRef | undefined): void;
    getClassType(properties: ReadonlyMap<string, ClassProperty>): void;
    getUniqueClassType(isFixed: boolean, properties: ReadonlyMap<string, ClassProperty> | undefined): void;
    setObjectProperties(properties: ReadonlyMap<string, ClassProperty>, additionalProperties: TypeRef | undefined): void;
    getUnionType(members: ReadonlySet<TypeRef>): void;
    getUniqueUnionType(): void;
    getIntersectionType(members: ReadonlySet<TypeRef>): void;
    getUniqueIntersectionType(members?: ReadonlySet<TypeRef>): void;
    setSetOperationMembers(members: ReadonlySet<TypeRef>): void;
}
declare abstract class BaseGraphRewriteBuilder extends TypeBuilder implements TypeLookerUp {
    readonly originalGraph: TypeGraph;
    protected readonly debugPrint: boolean;
    protected readonly reconstitutedTypes: Map<number, TypeRef>;
    private _lostTypeAttributes;
    private _printIndent;
    constructor(originalGraph: TypeGraph, stringTypeMapping: StringTypeMapping, alphabetizeProperties: boolean, graphHasProvenanceAttributes: boolean, debugPrint: boolean);
    withForwardingRef(maybeForwardingRef: TypeRef | undefined, typeCreator: (forwardingRef: TypeRef) => TypeRef): TypeRef;
    reconstituteType(t: Type, attributes?: TypeAttributes, forwardingRef?: TypeRef): TypeRef;
    abstract lookupTypeRefs(typeRefs: TypeRef[], forwardingRef?: TypeRef, replaceSet?: boolean): TypeRef | undefined;
    protected abstract forceReconstituteTypeRef(originalRef: TypeRef, attributes?: TypeAttributes, maybeForwardingRef?: TypeRef): TypeRef;
    reconstituteTypeRef(originalRef: TypeRef, attributes?: TypeAttributes, maybeForwardingRef?: TypeRef): TypeRef;
    reconstituteTypeAttributes(attributes: TypeAttributes): TypeAttributes;
    protected assertTypeRefsToReconstitute(typeRefs: TypeRef[], forwardingRef?: TypeRef): void;
    protected changeDebugPrintIndent(delta: number): void;
    protected get debugPrintIndentation(): string;
    finish(): TypeGraph;
    setLostTypeAttributes(): void;
    get lostTypeAttributes(): boolean;
}
declare class GraphRewriteBuilder<T extends Type> extends BaseGraphRewriteBuilder {
    private readonly _replacer;
    private readonly _setsToReplaceByMember;
    private readonly _reconstitutedUnions;
    constructor(originalGraph: TypeGraph, stringTypeMapping: StringTypeMapping, alphabetizeProperties: boolean, graphHasProvenanceAttributes: boolean, setsToReplace: T[][], debugPrintReconstitution: boolean, _replacer: (typesToReplace: ReadonlySet<T>, builder: GraphRewriteBuilder<T>, forwardingRef: TypeRef) => TypeRef);
    registerUnion(typeRefs: TypeRef[], reconstituted: TypeRef): void;
    private replaceSet;
    protected forceReconstituteTypeRef(originalRef: TypeRef, attributes?: TypeAttributes, maybeForwardingRef?: TypeRef): TypeRef;
    lookupTypeRefs(typeRefs: TypeRef[], forwardingRef?: TypeRef, replaceSet?: boolean): TypeRef | undefined;
}

declare class TypeAttributeKind<T> {
    readonly name: string;
    constructor(name: string);
    appliesToTypeKind(kind: TypeKind): boolean;
    combine(_attrs: T[]): T | undefined;
    intersect(attrs: T[]): T | undefined;
    makeInferred(_: T): T | undefined;
    increaseDistance(attrs: T): T | undefined;
    addToSchema(_schema: {
        [name: string]: unknown;
    }, _t: Type, _attrs: T): void;
    children(_: T): ReadonlySet<Type>;
    stringify(_: T): string | undefined;
    get inIdentity(): boolean;
    requiresUniqueIdentity(_: T): boolean;
    reconstitute<TBuilder extends BaseGraphRewriteBuilder>(_builder: TBuilder, a: T): T;
    makeAttributes(value: T): TypeAttributes;
    tryGetInAttributes(a: TypeAttributes): T | undefined;
    private setInAttributes;
    modifyInAttributes(a: TypeAttributes, modify: (value: T | undefined) => T | undefined): TypeAttributes;
    setDefaultInAttributes(a: TypeAttributes, makeDefault: () => T): TypeAttributes;
    removeInAttributes(a: TypeAttributes): TypeAttributes;
    equals(other: TypeAttributeKind<unknown>): boolean;
    hashCode(): number;
}
type TypeAttributes = ReadonlyMap<TypeAttributeKind<any>, any>;
declare const emptyTypeAttributes: TypeAttributes;

declare class Graph<T> {
    private readonly _nodes;
    private readonly _indexByNode;
    private readonly _successors;
    constructor(nodes: Iterable<T>, invertDirection: boolean, edges: number[][] | ((node: T) => ReadonlySet<T>));
    get size(): number;
    get nodes(): readonly T[];
    findRoots(): ReadonlySet<T>;
    dfsTraversal(root: T, preOrder: boolean, process: (node: T) => void): void;
    stronglyConnectedComponents(): Graph<ReadonlySet<T>>;
    makeDot(includeNode: (n: T) => boolean, nodeLabel: (n: T) => string): string;
}

declare function removeNullFromUnion(t: UnionType, sortBy?: boolean | ((t: Type) => string | number)): [PrimitiveType | null, ReadonlySet<Type>];
declare function nullableFromUnion(t: UnionType): Type | null;
interface SeparatedNamedTypes {
    enums: ReadonlySet<EnumType>;
    objects: ReadonlySet<ObjectType>;
    unions: ReadonlySet<UnionType>;
}
declare function matchType<U>(type: Type, anyType: (anyType: PrimitiveType) => U, nullType: (nullType: PrimitiveType) => U, boolType: (boolType: PrimitiveType) => U, integerType: (integerType: PrimitiveType) => U, doubleType: (doubleType: PrimitiveType) => U, stringType: (stringType: PrimitiveType) => U, arrayType: (arrayType: ArrayType) => U, classType: (classType: ClassType) => U, mapType: (mapType: MapType) => U, enumType: (enumType: EnumType) => U, unionType: (unionType: UnionType) => U, transformedStringType?: (transformedStringType: PrimitiveType) => U): U;

type TypeRef = number;
declare function derefTypeRef(tref: TypeRef, graphOrBuilder: TypeGraph | BaseGraphRewriteBuilder): Type;
declare class TypeAttributeStore {
    private readonly _typeGraph;
    private _values;
    private readonly _topLevelValues;
    constructor(_typeGraph: TypeGraph, _values: Array<TypeAttributes | undefined>);
    private getTypeIndex;
    attributesForType(t: Type): TypeAttributes;
    attributesForTopLevel(name: string): TypeAttributes;
    setInMap<T>(attributes: TypeAttributes, kind: TypeAttributeKind<T>, value: T): TypeAttributes;
    set<T>(kind: TypeAttributeKind<T>, t: Type, value: T): void;
    setForTopLevel<T>(kind: TypeAttributeKind<T>, topLevelName: string, value: T): void;
    tryGetInMap<T>(attributes: TypeAttributes, kind: TypeAttributeKind<T>): T | undefined;
    tryGet<T>(kind: TypeAttributeKind<T>, t: Type): T | undefined;
    tryGetForTopLevel<T>(kind: TypeAttributeKind<T>, topLevelName: string): T | undefined;
}
declare class TypeGraph {
    readonly serial: number;
    private readonly _haveProvenanceAttributes;
    private _typeBuilder?;
    private _attributeStore;
    private _topLevels;
    private _types?;
    private _parents;
    private _printOnRewrite;
    constructor(typeBuilder: TypeBuilder, serial: number, _haveProvenanceAttributes: boolean);
    private get isFrozen();
    get attributeStore(): TypeAttributeStore;
    freeze(topLevels: ReadonlyMap<string, TypeRef>, types: Type[], typeAttributes: Array<TypeAttributes | undefined>): void;
    get topLevels(): ReadonlyMap<string, Type>;
    typeAtIndex(index: number): Type;
    atIndex(index: number): [Type, TypeAttributes];
    private filterTypes;
    allNamedTypes(): ReadonlySet<Type>;
    allNamedTypesSeparated(): SeparatedNamedTypes;
    private allProvenance;
    setPrintOnRewrite(): void;
    private checkLostTypeAttributes;
    private printRewrite;
    rewrite<T extends Type>(title: string, stringTypeMapping: StringTypeMapping, alphabetizeProperties: boolean, replacementGroups: T[][], debugPrintReconstitution: boolean, replacer: (typesToReplace: ReadonlySet<T>, builder: GraphRewriteBuilder<T>, forwardingRef: TypeRef) => TypeRef, force?: boolean): TypeGraph;
    remap(title: string, stringTypeMapping: StringTypeMapping, alphabetizeProperties: boolean, map: ReadonlyMap<Type, Type>, debugPrintRemapping: boolean, force?: boolean): TypeGraph;
    garbageCollect(alphabetizeProperties: boolean, debugPrintReconstitution: boolean): TypeGraph;
    rewriteFixedPoint(alphabetizeProperties: boolean, debugPrintReconstitution: boolean): TypeGraph;
    allTypesUnordered(): ReadonlySet<Type>;
    makeGraph(invertDirection: boolean, childrenOfType: (t: Type) => ReadonlySet<Type>): Graph<Type>;
    getParentsOfType(t: Type): Set<Type>;
    printGraph(): void;
}

interface RenderResult {
    names: ReadonlyMap<Name, string>;
    sources: ReadonlyMap<string, Source>;
}
type BlankLinePosition = "none" | "interposing" | "leading" | "leading-and-interposing";
type BlankLineConfig = BlankLinePosition | [BlankLinePosition, number];
interface RenderContext {
    leadingComments?: Comment[];
    typeGraph: TypeGraph;
}
type ForEachPosition = "first" | "last" | "middle" | "only";
declare abstract class Renderer {
    protected readonly targetLanguage: TargetLanguage;
    protected readonly typeGraph: TypeGraph;
    protected readonly leadingComments: Comment[] | undefined;
    private _names;
    private readonly _finishedFiles;
    private readonly _finishedEmitContexts;
    private _emitContext;
    constructor(targetLanguage: TargetLanguage, renderContext: RenderContext);
    ensureBlankLine(numBlankLines?: number): void;
    protected preventBlankLine(): void;
    protected emitItem(item: Sourcelike): void;
    protected emitItemOnce(item: Sourcelike): boolean;
    protected emitLineOnce(...lineParts: Sourcelike[]): void;
    emitLine(...lineParts: Sourcelike[]): void;
    protected emitMultiline(linesString: string): void;
    protected gatherSource(emitter: () => void): Sourcelike[];
    protected emitGatheredSource(items: Sourcelike[]): void;
    protected emitAnnotated(annotation: AnnotationData, emitter: () => void): void;
    protected emitIssue(message: string, emitter: () => void): void;
    protected emitTable: (tableArray: Sourcelike[][]) => void;
    protected changeIndent(offset: number): void;
    protected iterableForEach<T>(iterable: Iterable<T>, emitter: (v: T, position: ForEachPosition) => void): void;
    protected forEach<K, V>(iterable: Iterable<[K, V]>, interposedBlankLines: number, leadingBlankLines: number, emitter: (v: V, k: K, position: ForEachPosition) => void): boolean;
    protected forEachWithBlankLines<K, V>(iterable: Iterable<[K, V]>, blankLineConfig: BlankLineConfig, emitter: (v: V, k: K, position: ForEachPosition) => void): boolean;
    indent(fn: () => void): void;
    protected abstract setUpNaming(): Iterable<Namespace>;
    protected abstract emitSource(givenOutputFilename: string): void;
    protected assignNames(): ReadonlyMap<Name, string>;
    protected initializeEmitContextForFilename(filename: string): void;
    protected finishFile(filename: string): void;
    render(givenOutputFilename: string): RenderResult;
    get names(): ReadonlyMap<Name, string>;
}

type FixMeOptionsType = Record<string, any>;
type FixMeOptionsAnyType = any;

/**
 * Primary options show up in the web UI in the "Language" settings tab,
 * secondary options in "Other".
 */
type OptionKind = "primary" | "secondary";
interface OptionDefinition {
    alias?: string;
    defaultOption?: boolean;
    defaultValue?: FixMeOptionsAnyType;
    description: string;
    kind?: OptionKind;
    legalValues?: string[];
    multiple?: boolean;
    name: string;
    renderer?: boolean;
    type: StringConstructor | BooleanConstructor;
    typeLabel?: string;
}
/**
 * The superclass for target language options.  You probably want to use one of its
 * subclasses, `BooleanOption`, `EnumOption`, or `StringOption`.
 */
declare abstract class Option<T> {
    readonly definition: OptionDefinition;
    constructor(definition: OptionDefinition);
    getValue(values: FixMeOptionsType): T;
    get cliDefinitions(): {
        actual: OptionDefinition[];
        display: OptionDefinition[];
    };
}
type OptionValueType<O> = O extends Option<infer T> ? T : never;
type OptionValues<T> = {
    [P in keyof T]: OptionValueType<T[P]>;
};
declare function getOptionValues<T extends {
    [name: string]: Option<FixMeOptionsAnyType>;
}>(options: T, untypedOptionValues: FixMeOptionsType): OptionValues<T>;
/**
 * A target language option that allows setting a boolean flag.
 */
declare class BooleanOption extends Option<boolean> {
    /**
     * @param name The shorthand name.
     * @param description Short-ish description of the option.
     * @param defaultValue The default value.
     * @param kind Whether it's a primary or secondary option.
     */
    constructor(name: string, description: string, defaultValue: boolean, kind?: OptionKind);
    get cliDefinitions(): {
        actual: OptionDefinition[];
        display: OptionDefinition[];
    };
    getValue(values: FixMeOptionsType): boolean;
}
declare class StringOption extends Option<string> {
    constructor(name: string, description: string, typeLabel: string, defaultValue: string, kind?: OptionKind);
}
declare class EnumOption<T> extends Option<T> {
    private readonly _values;
    constructor(name: string, description: string, values: Array<[string, T]>, defaultValue?: string | undefined, kind?: OptionKind);
    getValue(values: FixMeOptionsType): T;
}

type MultiFileRenderResult = ReadonlyMap<string, SerializedRenderResult>;
declare abstract class TargetLanguage {
    readonly displayName: string;
    readonly names: string[];
    readonly extension: string;
    constructor(displayName: string, names: string[], extension: string);
    protected abstract getOptions(): Array<Option<FixMeOptionsAnyType>>;
    get optionDefinitions(): OptionDefinition[];
    get cliOptionDefinitions(): {
        actual: OptionDefinition[];
        display: OptionDefinition[];
    };
    get name(): string;
    protected abstract makeRenderer(renderContext: RenderContext, optionValues: FixMeOptionsType): Renderer;
    renderGraphAndSerialize(typeGraph: TypeGraph, givenOutputFilename: string, alphabetizeProperties: boolean, leadingComments: Comment[] | undefined, rendererOptions: FixMeOptionsType, indentation?: string): MultiFileRenderResult;
    protected get defaultIndentation(): string;
    get stringTypeMapping(): StringTypeMapping;
    get supportsOptionalClassProperties(): boolean;
    get supportsUnionsWithBothNumberTypes(): boolean;
    get supportsFullObjectType(): boolean;
    needsTransformerForType(_t: Type): boolean;
    get dateTimeRecognizer(): DateTimeRecognizer;
}

type Value = number;
interface Context {
    currentArray: Value[] | undefined;
    currentKey: string | undefined;
    currentNumberIsDouble: boolean;
    currentObject: Value[] | undefined;
}
declare abstract class CompressedJSON<T> {
    readonly dateTimeRecognizer: DateTimeRecognizer;
    readonly handleRefs: boolean;
    private _rootValue;
    private _ctx;
    private _contextStack;
    private _strings;
    private _stringIndexes;
    private _objects;
    private _arrays;
    constructor(dateTimeRecognizer: DateTimeRecognizer, handleRefs: boolean);
    abstract parse(input: T): Promise<Value>;
    parseSync(_input: T): Value;
    getStringForValue(v: Value): string;
    getObjectForValue: (v: Value) => Value[];
    getArrayForValue: (v: Value) => Value[];
    getStringFormatTypeKind(v: Value): TransformedStringTypeKind;
    protected get context(): Context;
    protected internString(s: string): number;
    protected makeString(s: string): Value;
    protected internObject(obj: Value[]): Value;
    protected internArray: (arr: Value[]) => Value;
    protected get isExpectingRef(): boolean;
    protected commitValue(value: Value): void;
    protected commitNull(): void;
    protected commitBoolean(v: boolean): void;
    protected commitNumber(isDouble: boolean): void;
    protected commitString(s: string): void;
    protected finish(): Value;
    protected pushContext(): void;
    protected pushObjectContext(): void;
    protected setPropertyKey(key: string): void;
    protected finishObject(): void;
    protected pushArrayContext(): void;
    protected finishArray(): void;
    protected popContext(): void;
    equals(other: CompressedJSON<unknown>): boolean;
    hashCode(): number;
}

interface Input<T> {
    addSource: (source: T) => Promise<void>;
    addSourceSync: (source: T) => void;
    addTypes: (ctx: RunContext, typeBuilder: TypeBuilder, inferMaps: boolean, inferEnums: boolean, fixedTopLevels: boolean) => Promise<void>;
    addTypesSync: (ctx: RunContext, typeBuilder: TypeBuilder, inferMaps: boolean, inferEnums: boolean, fixedTopLevels: boolean) => void;
    readonly kind: string;
    readonly needIR: boolean;
    readonly needSchemaProcessing: boolean;
    singleStringSchemaSource: () => string | undefined;
}
interface JSONSourceData<T> {
    description?: string;
    name: string;
    samples: T[];
}
declare class JSONInput<T> implements Input<JSONSourceData<T>> {
    private readonly _compressedJSON;
    readonly kind: string;
    readonly needIR: boolean;
    readonly needSchemaProcessing: boolean;
    private readonly _topLevels;
    constructor(_compressedJSON: CompressedJSON<T>);
    private addSample;
    private setDescription;
    private addSamples;
    addSource(source: JSONSourceData<T>): Promise<void>;
    addSourceSync(source: JSONSourceData<T>): void;
    singleStringSchemaSource(): undefined;
    addTypes(ctx: RunContext, typeBuilder: TypeBuilder, inferMaps: boolean, inferEnums: boolean, fixedTopLevels: boolean): Promise<void>;
    addTypesSync(_ctx: RunContext, typeBuilder: TypeBuilder, inferMaps: boolean, inferEnums: boolean, fixedTopLevels: boolean): void;
}
declare function jsonInputForTargetLanguage(targetLanguage: string | TargetLanguage, languages?: TargetLanguage[], handleJSONRefs?: boolean): JSONInput<string>;
declare class InputData {
    private _inputs;
    addInput<T>(input: Input<T>): void;
    private getOrAddInput;
    addSource<T>(kind: string, source: T, makeInput: () => Input<T>): Promise<void>;
    addSourceSync<T>(kind: string, source: T, makeInput: () => Input<T>): void;
    addTypes(ctx: RunContext, typeBuilder: TypeBuilder, inferMaps: boolean, inferEnums: boolean, fixedTopLevels: boolean): Promise<void>;
    addTypesSync(ctx: RunContext, typeBuilder: TypeBuilder, inferMaps: boolean, inferEnums: boolean, fixedTopLevels: boolean): void;
    get needIR(): boolean;
    get needSchemaProcessing(): boolean;
    singleStringSchemaSource(): string | undefined;
}

declare function getTargetLanguage(nameOrInstance: string | TargetLanguage): TargetLanguage;
interface RendererOptions {
    [name: string]: string | boolean;
}
interface InferenceFlag {
    description: string;
    explanation: string;
    negationDescription: string;
    order: number;
    stringType?: TransformedStringTypeKind;
}
declare const inferenceFlagsObject: {
    /** Whether to infer map types from JSON data */
    inferMaps: {
        description: string;
        negationDescription: string;
        explanation: string;
        order: number;
    };
    /** Whether to infer enum types from JSON data */
    inferEnums: {
        description: string;
        negationDescription: string;
        explanation: string;
        order: number;
    };
    /** Whether to convert UUID strings to UUID objects */
    inferUuids: {
        description: string;
        negationDescription: string;
        explanation: string;
        stringType: "date" | "time" | "date-time" | "uuid" | "uri" | "integer-string" | "bool-string";
        order: number;
    };
    /** Whether to assume that JSON strings that look like dates are dates */
    inferDateTimes: {
        description: string;
        negationDescription: string;
        explanation: string;
        stringType: "date" | "time" | "date-time" | "uuid" | "uri" | "integer-string" | "bool-string";
        order: number;
    };
    /** Whether to convert stringified integers to integers */
    inferIntegerStrings: {
        description: string;
        negationDescription: string;
        explanation: string;
        stringType: "date" | "time" | "date-time" | "uuid" | "uri" | "integer-string" | "bool-string";
        order: number;
    };
    /** Whether to convert stringified booleans to boolean values */
    inferBooleanStrings: {
        description: string;
        negationDescription: string;
        explanation: string;
        stringType: "date" | "time" | "date-time" | "uuid" | "uri" | "integer-string" | "bool-string";
        order: number;
    };
    /** Combine similar classes.  This doesn't apply to classes from a schema, only from inference. */
    combineClasses: {
        description: string;
        negationDescription: string;
        explanation: string;
        order: number;
    };
    /** Whether to treat $ref as references within JSON */
    ignoreJsonRefs: {
        description: string;
        negationDescription: string;
        explanation: string;
        order: number;
    };
};
type InferenceFlagName = keyof typeof inferenceFlagsObject;
declare const inferenceFlagNames: ("inferMaps" | "inferEnums" | "inferUuids" | "inferDateTimes" | "inferIntegerStrings" | "inferBooleanStrings" | "combineClasses" | "ignoreJsonRefs")[];
declare const inferenceFlags: {
    [F in InferenceFlagName]: InferenceFlag;
};
type InferenceFlags = {
    [F in InferenceFlagName]: boolean;
};
/**
 * The options type for the main quicktype entry points,
 * `quicktypeMultiFile` and `quicktype`.
 */
interface NonInferenceOptions {
    /** Make all class property optional */
    allPropertiesOptional: boolean;
    /** Put class properties in alphabetical order, instead of in the order found in the JSON */
    alphabetizeProperties: boolean;
    /** Check that we're propagating all type attributes (unless we actually can't) */
    checkProvenance: boolean;
    /**
     * Print name gathering debug information to the console.  This might help to figure out why
     * your types get weird names, but the output is quite arcane.
     */
    debugPrintGatherNames: boolean;
    /** Print the type graph to the console at every processing step */
    debugPrintGraph: boolean;
    /**
     * Print type reconstitution debug information to the console.  You'll only ever need this if
     * you're working deep inside quicktype-core.
     */
    debugPrintReconstitution: boolean;
    /** Print schema resolving steps */
    debugPrintSchemaResolving: boolean;
    /** Print the time it took for each pass to run */
    debugPrintTimes: boolean;
    /** Print all transformations to the console prior to generating code */
    debugPrintTransformations: boolean;
    /**
     * Make top-levels classes from JSON fixed.  That means even if two top-level classes are exactly
     * the same, quicktype will still generate two separate types for them.
     */
    fixedTopLevels: boolean;
    /** String to use for one indentation level.  If not given, use the target language's default. */
    indentation: string | undefined;
    /** The input data from which to produce types */
    inputData: InputData;
    /**
     * The target language for which to produce code.  This can be either an instance of `TargetLanguage`,
     * or a string specifying one of the names for quicktype's built-in target languages.  For example,
     * both `cs` and `csharp` will generate C#.
     */
    lang: string | TargetLanguage;
    /** If given, output these comments at the beginning of the main output file */
    leadingComments?: Comment[];
    /** Don't render output.  This is mainly useful for benchmarking. */
    noRender: boolean;
    /** Name of the output file.  Note that quicktype will not write that file, but you'll get its name
     * back as a key in the resulting `Map`.
     */
    outputFilename: string;
    /** Options for the target language's renderer */
    rendererOptions: RendererOptions;
}
type Options$1 = NonInferenceOptions & InferenceFlags;
interface RunContext {
    debugPrintReconstitution: boolean;
    debugPrintSchemaResolving: boolean;
    debugPrintTransformations: boolean;
    stringTypeMapping: StringTypeMapping;
    time: <T>(name: string, f: () => T) => T;
    timeSync: <T>(name: string, f: () => Promise<T>) => Promise<T>;
}
declare const defaultInferenceFlags: InferenceFlags;
/**
 * Run quicktype and produce one or more output files.
 *
 * @param options Partial options.  For options that are not defined, the
 * defaults will be used.
 */
declare function quicktypeMultiFile(options: Partial<Options$1>): Promise<MultiFileRenderResult>;
declare function quicktypeMultiFileSync(options: Partial<Options$1>): MultiFileRenderResult;
/**
 * Combines a multi-file render result into a single output.  All the files
 * are concatenated and prefixed with a `//`-style comment giving the
 * filename.
 */
declare function combineRenderResults(result: MultiFileRenderResult): SerializedRenderResult;
/**
 * Run quicktype like `quicktypeMultiFile`, but if there are multiple
 * output files they will all be squashed into one output, with comments at the
 * start of each file.
 *
 * @param options Partial options.  For options that are not defined, the
 * defaults will be used.
 */
declare function quicktype(options: Partial<Options$1>): Promise<SerializedRenderResult>;

declare const all: TargetLanguage[];
declare function languageNamed(name: string, targetLanguages?: TargetLanguage[]): TargetLanguage | undefined;

type NamingStyle = "pascal" | "camel" | "underscore" | "upper-underscore" | "pascal-upper-acronyms" | "camel-upper-acronyms";
declare function legalizeCharacters(isLegal: (codePoint: number) => boolean): (s: string) => string;
declare function isLetterOrDigit(codePoint: number): boolean;
declare function capitalize(str: string): string;
interface WordInName {
    isAcronym: boolean;
    word: string;
}
declare function splitIntoWords(s: string): WordInName[];
type WordStyle = (word: string) => string;
declare function firstUpperWordStyle(s: string): string;
declare function allUpperWordStyle(s: string): string;
declare function combineWords(words: WordInName[], removeInvalidCharacters: (s: string) => string, firstWordStyle: WordStyle, restWordStyle: WordStyle, firstWordAcronymStyle: WordStyle, restAcronymStyle: WordStyle, separator: string, isStartCharacter: (codePoint: number) => boolean): string;

type SubTrie = number | null | Trie;
interface Trie {
    arr: SubTrie[];
    count: number;
}
interface MarkovChain {
    depth: number;
    trie: Trie;
}
declare function train(lines: string[], depth: number): MarkovChain;

type ErrorProperties = {
    kind: "InternalError";
    properties: {
        message: string;
    };
} | {
    kind: "MiscJSONParseError";
    properties: {
        address: string;
        description: string;
        message: string;
    };
} | {
    kind: "MiscReadError";
    properties: {
        fileOrURL: string;
        message: string;
    };
} | {
    kind: "MiscUnicodeHighSurrogateWithoutLowSurrogate";
    properties: {};
} | {
    kind: "MiscInvalidMinMaxConstraint";
    properties: {
        max: number;
        min: number;
    };
} | {
    kind: "InferenceJSONReferenceNotRooted";
    properties: {
        reference: string;
    };
} | {
    kind: "InferenceJSONReferenceToUnion";
    properties: {
        reference: string;
    };
} | {
    kind: "InferenceJSONReferenceWrongProperty";
    properties: {
        reference: string;
    };
} | {
    kind: "InferenceJSONReferenceInvalidArrayIndex";
    properties: {
        reference: string;
    };
} | {
    kind: "SchemaArrayIsInvalidSchema";
    properties: {
        ref: Ref;
    };
} | {
    kind: "SchemaNullIsInvalidSchema";
    properties: {
        ref: Ref;
    };
} | {
    kind: "SchemaRefMustBeString";
    properties: {
        actual: string;
        ref: Ref;
    };
} | {
    kind: "SchemaAdditionalTypesForbidRequired";
    properties: {
        ref: Ref;
    };
} | {
    kind: "SchemaNoTypeSpecified";
    properties: {
        ref: Ref;
    };
} | {
    kind: "SchemaInvalidType";
    properties: {
        ref: Ref;
        type: string;
    };
} | {
    kind: "SchemaFalseNotSupported";
    properties: {
        ref: Ref;
    };
} | {
    kind: "SchemaInvalidJSONSchemaType";
    properties: {
        ref: Ref;
        type: string;
    };
} | {
    kind: "SchemaRequiredMustBeStringOrStringArray";
    properties: {
        actual: any;
        ref: Ref;
    };
} | {
    kind: "SchemaRequiredElementMustBeString";
    properties: {
        element: any;
        ref: Ref;
    };
} | {
    kind: "SchemaTypeMustBeStringOrStringArray";
    properties: {
        actual: any;
    };
} | {
    kind: "SchemaTypeElementMustBeString";
    properties: {
        element: any;
        ref: Ref;
    };
} | {
    kind: "SchemaArrayItemsMustBeStringOrArray";
    properties: {
        actual: any;
        ref: Ref;
    };
} | {
    kind: "SchemaIDMustHaveAddress";
    properties: {
        id: string;
        ref: Ref;
    };
} | {
    kind: "SchemaWrongAccessorEntryArrayLength";
    properties: {
        operation: string;
        ref: Ref;
    };
} | {
    kind: "SchemaSetOperationCasesIsNotArray";
    properties: {
        cases: any;
        operation: string;
        ref: Ref;
    };
} | {
    kind: "SchemaMoreThanOneUnionMemberName";
    properties: {
        names: string[];
    };
} | {
    kind: "SchemaCannotGetTypesFromBoolean";
    properties: {
        ref: string;
    };
} | {
    kind: "SchemaCannotIndexArrayWithNonNumber";
    properties: {
        actual: string;
        ref: Ref;
    };
} | {
    kind: "SchemaIndexNotInArray";
    properties: {
        index: number;
        ref: Ref;
    };
} | {
    kind: "SchemaKeyNotInObject";
    properties: {
        key: string;
        ref: Ref;
    };
} | {
    kind: "SchemaFetchError";
    properties: {
        address: string;
        base: Ref;
    };
} | {
    kind: "SchemaFetchErrorTopLevel";
    properties: {
        address: string;
    };
} | {
    kind: "SchemaFetchErrorAdditional";
    properties: {
        address: string;
    };
} | {
    kind: "GraphQLNoQueriesDefined";
    properties: {};
} | {
    kind: "DriverUnknownSourceLanguage";
    properties: {
        lang: string;
    };
} | {
    kind: "DriverUnknownOutputLanguage";
    properties: {
        lang: string;
    };
} | {
    kind: "DriverMoreThanOneInputGiven";
    properties: {
        topLevel: string;
    };
} | {
    kind: "DriverCannotInferNameForSchema";
    properties: {
        uri: string;
    };
} | {
    kind: "DriverNoGraphQLQueryGiven";
    properties: {};
} | {
    kind: "DriverNoGraphQLSchemaInDir";
    properties: {
        dir: string;
    };
} | {
    kind: "DriverMoreThanOneGraphQLSchemaInDir";
    properties: {
        dir: string;
    };
} | {
    kind: "DriverSourceLangMustBeGraphQL";
    properties: {};
} | {
    kind: "DriverGraphQLSchemaNeeded";
    properties: {};
} | {
    kind: "DriverInputFileDoesNotExist";
    properties: {
        filename: string;
    };
} | {
    kind: "DriverCannotMixJSONWithOtherSamples";
    properties: {
        dir: string;
    };
} | {
    kind: "DriverCannotMixNonJSONInputs";
    properties: {
        dir: string;
    };
} | {
    kind: "DriverUnknownDebugOption";
    properties: {
        option: string;
    };
} | {
    kind: "DriverNoLanguageOrExtension";
    properties: {};
} | {
    kind: "DriverCLIOptionParsingFailed";
    properties: {
        message: string;
    };
} | {
    kind: "IRNoForwardDeclarableTypeInCycle";
    properties: {};
} | {
    kind: "IRTypeAttributesNotPropagated";
    properties: {
        count: number;
        indexes: number[];
    };
} | {
    kind: "IRNoEmptyUnions";
    properties: {};
} | {
    kind: "RendererUnknownOptionValue";
    properties: {
        name: string;
        value: string;
    };
} | {
    kind: "TypeScriptCompilerError";
    properties: {
        message: string;
    };
};
type ErrorKinds = ErrorProperties extends {
    kind: infer K;
} ? K : never;
type ErrorPropertiesForName<K> = Extract<ErrorProperties, {
    kind: K;
}> extends {
    properties: infer P;
} ? P : never;
declare class QuickTypeError extends Error {
    readonly errorMessage: string;
    readonly messageName: string;
    userMessage: string;
    readonly properties: StringMap;
    constructor(errorMessage: string, messageName: string, userMessage: string, properties: StringMap);
}
declare function messageError<N extends ErrorKinds>(kind: N, properties: ErrorPropertiesForName<N>): never;
declare function messageAssert<N extends ErrorKinds>(assertion: boolean, kind: N, properties: ErrorPropertiesForName<N>): void;

interface Options {
    array?: boolean;
    encoding?: string;
    maxBuffer?: number;
}
declare function getStream(inputStream: Readable, opts?: Options): Promise<any>;

declare function readableFromFileOrURL(fileOrURL: string, httpHeaders?: string[]): Promise<Readable>;
declare function readFromFileOrURL(fileOrURL: string, httpHeaders?: string[]): Promise<string>;

declare class FetchingJSONSchemaStore extends JSONSchemaStore {
    private readonly _httpHeaders?;
    constructor(_httpHeaders?: string[]);
    fetch(address: string): Promise<JSONSchema | undefined>;
}

declare function sourcesFromPostmanCollection(collectionJSON: string, collectionJSONAddress?: string): {
    description: string | undefined;
    sources: Array<JSONSourceData<string>>;
};

type DeclarationKind = "forward" | "define";
interface Declaration {
    readonly kind: DeclarationKind;
    readonly type: Type;
}

declare abstract class Transformer {
    readonly kind: string;
    protected readonly graph: TypeGraph;
    readonly sourceTypeRef: TypeRef;
    constructor(kind: string, graph: TypeGraph, sourceTypeRef: TypeRef);
    get sourceType(): Type;
    /** This must return a newly constructed set. */
    getChildren(): Set<Type>;
    getNumberOfNodes(): number;
    abstract get canFail(): boolean;
    abstract reverse(targetTypeRef: TypeRef, continuationTransformer: Transformer | undefined): Transformer;
    abstract reconstitute<TBuilder extends BaseGraphRewriteBuilder>(builder: TBuilder): Transformer;
    equals<T extends Transformer>(other: T): boolean;
    hashCode(): number;
    protected debugDescription(): string;
    protected debugPrintContinuations(_indent: number): void;
    debugPrint(indent: number): void;
}
declare class Transformation {
    private readonly _graph;
    private readonly _targetTypeRef;
    readonly transformer: Transformer;
    constructor(_graph: TypeGraph, _targetTypeRef: TypeRef, transformer: Transformer);
    get sourceType(): Type;
    get targetType(): Type;
    get reverse(): Transformation;
    getChildren(): Set<Type>;
    reconstitute<TBuilder extends BaseGraphRewriteBuilder>(builder: TBuilder): Transformation;
    equals<T extends Transformer>(other: T): boolean;
    hashCode(): number;
    debugPrint(): void;
}

interface ForbiddenWordsInfo {
    includeGlobalForbidden: boolean;
    names: Array<Name | string>;
}
declare abstract class ConvenienceRenderer extends Renderer {
    private _globalForbiddenNamespace;
    private _otherForbiddenNamespaces;
    private _globalNamespace;
    private _nameStoreView;
    private _propertyNamesStoreView;
    private _memberNamesStoreView;
    private _caseNamesStoreView;
    private _namesForTransformations;
    private _namedTypeNamer;
    private _unionMemberNamer;
    private _enumCaseNamer;
    private _declarationIR;
    private _namedTypes;
    private _namedObjects;
    private _namedEnums;
    private _namedUnions;
    private _haveUnions;
    private _haveMaps;
    private _haveOptionalProperties;
    private _cycleBreakerTypes?;
    private _alphabetizeProperties;
    constructor(targetLanguage: TargetLanguage, renderContext: RenderContext);
    get topLevels(): ReadonlyMap<string, Type>;
    /**
     * Return an array of strings which are not allowed as names in the global
     * namespace.  Since names of generated types are in the global namespace,
     * this will include anything built into the language or default libraries
     * that can conflict with that, such as reserved keywords or common type
     * names.
     */
    protected forbiddenNamesForGlobalNamespace(): string[];
    /**
     * Returns which names are forbidden for the property names of an object
     * type.  `names` can contain strings as well as `Name`s.  In some
     * languages, the class name can't be used as the name for a property, for
     * example, in which case `_className` would have to be return in `names`.
     * If `includeGlobalForbidden` is set, then all names that are forbidden
     * in the global namespace will also be forbidden for the properties.
     * Note: That doesn't mean that the names in the global namespace will be
     * forbidden, too!
     */
    protected forbiddenForObjectProperties(_o: ObjectType, _className: Name): ForbiddenWordsInfo;
    protected forbiddenForUnionMembers(_u: UnionType, _unionName: Name): ForbiddenWordsInfo;
    protected forbiddenForEnumCases(_e: EnumType, _enumName: Name): ForbiddenWordsInfo;
    protected makeTopLevelDependencyNames(_t: Type, _topLevelName: Name): DependencyName[];
    protected makeNamedTypeDependencyNames(_t: Type, _name: Name): DependencyName[];
    protected abstract makeNamedTypeNamer(): Namer;
    protected abstract namerForObjectProperty(o: ObjectType, p: ClassProperty): Namer | null;
    protected abstract makeUnionMemberNamer(): Namer | null;
    protected abstract makeEnumCaseNamer(): Namer | null;
    protected abstract emitSourceStructure(givenOutputFilename: string): void;
    protected makeNameForTransformation(_xf: Transformation, _typeName: Name | undefined): Name | undefined;
    protected namedTypeToNameForTopLevel(type: Type): Type | undefined;
    protected get unionMembersInGlobalNamespace(): boolean;
    protected get enumCasesInGlobalNamespace(): boolean;
    protected get needsTypeDeclarationBeforeUse(): boolean;
    protected canBeForwardDeclared(_t: Type): boolean;
    protected unionNeedsName(u: UnionType): boolean;
    private get globalNamespace();
    private get nameStoreView();
    protected descriptionForType(t: Type): string[] | undefined;
    protected descriptionForClassProperty(o: ObjectType, name: string): string[] | undefined;
    protected setUpNaming(): ReadonlySet<Namespace>;
    private addDependenciesForNamedType;
    protected makeNameForTopLevel(_t: Type, givenName: string, _maybeNamedType: Type | undefined): Name;
    private addNameForTopLevel;
    private makeNameForType;
    protected makeNameForNamedType(t: Type): Name;
    private addNameForNamedType;
    protected get typesWithNamedTransformations(): ReadonlyMap<Type, Name>;
    protected nameForTransformation(t: Type): Name | undefined;
    private addNameForTransformation;
    private processForbiddenWordsInfo;
    protected makeNameForProperty(o: ObjectType, _className: Name, p: ClassProperty, jsonName: string, assignedName: string | undefined): Name | undefined;
    protected makePropertyDependencyNames(_o: ObjectType, _className: Name, _p: ClassProperty, _jsonName: string, _name: Name): Name[];
    private addPropertyNames;
    protected makeNameForUnionMember(u: UnionType, unionName: Name, t: Type): Name;
    private addUnionMemberNames;
    protected makeNameForEnumCase(e: EnumType, _enumName: Name, caseName: string, assignedName: string | undefined): Name;
    private addEnumCaseNames;
    private childrenOfType;
    protected get namedUnions(): ReadonlySet<UnionType>;
    protected get haveNamedUnions(): boolean;
    protected get haveNamedTypes(): boolean;
    protected get haveUnions(): boolean;
    protected get haveMaps(): boolean;
    protected get haveOptionalProperties(): boolean;
    protected get enums(): ReadonlySet<EnumType>;
    protected get haveEnums(): boolean;
    protected proposedUnionMemberNameForTypeKind(_kind: TypeKind): string | null;
    protected proposeUnionMemberName(_u: UnionType, _unionName: Name, fieldType: Type, lookup: (n: Name) => string): string;
    protected nameForNamedType(t: Type): Name;
    protected isForwardDeclaredType(t: Type): boolean;
    protected isImplicitCycleBreaker(_t: Type): boolean;
    protected canBreakCycles(_t: Type): boolean;
    protected isCycleBreakerType(t: Type): boolean;
    protected forEachTopLevel(blankLocations: BlankLineConfig, f: (t: Type, name: Name, position: ForEachPosition) => void, predicate?: (t: Type) => boolean): boolean;
    protected forEachDeclaration(blankLocations: BlankLineConfig, f: (decl: Declaration, position: ForEachPosition) => void): void;
    setAlphabetizeProperties(value: boolean): void;
    protected getAlphabetizeProperties(): boolean;
    protected propertyCount(o: ObjectType): number;
    protected sortClassProperties(properties: ReadonlyMap<string, ClassProperty>, propertyNames: ReadonlyMap<string, Name>): ReadonlyMap<string, ClassProperty>;
    protected forEachClassProperty(o: ObjectType, blankLocations: BlankLineConfig, f: (name: Name, jsonName: string, p: ClassProperty, position: ForEachPosition) => void): void;
    protected nameForUnionMember(u: UnionType, t: Type): Name;
    protected nameForEnumCase(e: EnumType, caseName: string): Name;
    protected forEachUnionMember(u: UnionType, members: ReadonlySet<Type> | null, blankLocations: BlankLineConfig, sortOrder: ((n: Name, t: Type) => string) | null, f: (name: Name, t: Type, position: ForEachPosition) => void): void;
    protected forEachEnumCase(e: EnumType, blankLocations: BlankLineConfig, f: (name: Name, jsonName: string, position: ForEachPosition) => void): void;
    protected forEachTransformation(blankLocations: BlankLineConfig, f: (n: Name, t: Type, position: ForEachPosition) => void): void;
    protected forEachSpecificNamedType<T extends Type>(blankLocations: BlankLineConfig, types: Iterable<[T, T]>, f: (t: T, name: Name, position: ForEachPosition) => void): void;
    protected forEachObject(blankLocations: BlankLineConfig, f: ((c: ClassType, className: Name, position: ForEachPosition) => void) | ((o: ObjectType, objectName: Name, position: ForEachPosition) => void)): void;
    protected forEachEnum(blankLocations: BlankLineConfig, f: (u: EnumType, enumName: Name, position: ForEachPosition) => void): void;
    protected forEachUnion(blankLocations: BlankLineConfig, f: (u: UnionType, unionName: Name, position: ForEachPosition) => void): void;
    protected forEachUniqueUnion<T>(blankLocations: BlankLineConfig, uniqueValue: (u: UnionType) => T, f: (firstUnion: UnionType, value: T, position: ForEachPosition) => void): void;
    protected forEachNamedType(blankLocations: BlankLineConfig, objectFunc: ((c: ClassType, className: Name, position: ForEachPosition) => void) | ((o: ObjectType, objectName: Name, position: ForEachPosition) => void), enumFunc: (e: EnumType, enumName: Name, position: ForEachPosition) => void, unionFunc: (u: UnionType, unionName: Name, position: ForEachPosition) => void): void;
    protected sourcelikeToString(src: Sourcelike): string;
    protected get commentLineStart(): string;
    protected emitComments(comments: Comment[]): void;
    protected emitCommentLines(lines: Sourcelike[], { lineStart, firstLineStart, lineEnd, beforeComment, afterComment }?: CommentOptions): void;
    protected emitDescription(description: Sourcelike[] | undefined): void;
    protected emitDescriptionBlock(lines: Sourcelike[]): void;
    protected emitPropertyTable(c: ClassType, makePropertyRow: (name: Name, jsonName: string, p: ClassProperty) => Sourcelike[]): void;
    private processGraph;
    protected emitSource(givenOutputFilename: string): void;
    protected forEachType<TResult>(process: (t: Type) => TResult): Set<TResult>;
}

/**
 * CJSON.ts
 * This file is used to generate cJSON code with quicktype
 * The generated code depends of https://github.com/DaveGamble/cJSON, https://github.com/joelguittet/c-list and https://github.com/joelguittet/c-hashtable
 *
 * Similarly to C++ generator, it is possible to generate a single header file or multiple header files.
 * To generate multiple header files, use the following option: --source-style multi-source
 *
 * JSON data are represented using structures, and functions in the cJSON style are created to use them.
 * To parse json data from json string use the following: struct <type> * data = cJSON_Parse<type>(<string>);
 * To get json data from cJSON object use the following: struct <type> * data = cJSON_Get<type>Value(<cjson>);
 * To get cJSON object from json data use the following: cJSON * cjson = cJSON_Create<type>(<data>);
 * To print json string from json data use the following: char * string = cJSON_Print<type>(<data>);
 * To delete json data use the following: cJSON_Delete<type>(<data>);
 *
 * TODO list for future enhancements:
 * - Management of Class, Union and TopLevel should be mutualized to reduce code size and to permit Union and TopLevel having recursive Array/Map
 * - Types check should be added to verify unwanted inputs (for example a Number passed while a String is expected, etc)
 * - Constraints should be implemented (verification of Enum values, min/max values for Numbers and min/max length for Strings, regex)
 * - Support of pure Any type for example providing a callback from the application to handle these cases dynamically
 * See test/languages.ts for the test cases which are not implmented/checked.
 */

declare const cJSONOptions: {
    typeSourceStyle: EnumOption<boolean>;
    typeIntegerSize: EnumOption<string>;
    hashtableSize: StringOption;
    addTypedefAlias: EnumOption<boolean>;
    printStyle: EnumOption<boolean>;
    typeNamingStyle: EnumOption<NamingStyle>;
    memberNamingStyle: EnumOption<NamingStyle>;
    enumeratorNamingStyle: EnumOption<NamingStyle>;
};
declare class CJSONTargetLanguage extends TargetLanguage {
    /**
     * Constructor
     * @param displayName: display name
     * @params names: names
     * @param extension: extension of files
     */
    constructor(displayName?: string, names?: string[], extension?: string);
    /**
     * Return cJSON generator options
     * @return cJSON generator options array
     */
    protected getOptions(): Array<Option<FixMeOptionsAnyType>>;
    /**
     * Indicate if language support union with both number types
     * @return true
     */
    get supportsUnionsWithBothNumberTypes(): boolean;
    /**
     * Indicate if language support optional class properties
     * @return true
     */
    get supportsOptionalClassProperties(): boolean;
    /**
     * Create renderer
     * @param renderContext: render context
     * @param untypedOptionValues
     * @return cJSON renderer
     */
    protected makeRenderer(renderContext: RenderContext, untypedOptionValues: FixMeOptionsType): CJSONRenderer;
}
declare enum IncludeKind$1 {
    ForwardDeclare = "ForwardDeclare",
    Include = "Include"
}
interface IncludeRecord$1 {
    kind: IncludeKind$1 | undefined;
    typeKind: TypeKind | undefined;
}
interface TypeRecord$1 {
    forceInclude: boolean;
    level: number;
    name: Name;
    type: Type;
    variant: boolean;
}
type IncludeMap$1 = Map<string, IncludeRecord$1>;
interface TypeCJSON {
    addToObject: Sourcelike;
    cType: Sourcelike;
    cjsonType: string;
    createObject: Sourcelike;
    deleteType: Sourcelike;
    getValue: Sourcelike;
    isNullable: boolean;
    isType: Sourcelike;
    items: TypeCJSON | undefined;
    optionalQualifier: string;
}
declare class CJSONRenderer extends ConvenienceRenderer {
    private readonly _options;
    private currentFilename;
    private readonly memberNameStyle;
    private readonly namedTypeNameStyle;
    private readonly forbiddenGlobalNames;
    protected readonly typeIntegerSize: string;
    protected readonly hashtableSize: string;
    protected readonly typeNamingStyle: NamingStyle;
    protected readonly enumeratorNamingStyle: NamingStyle;
    /**
     * Constructor
     * @param targetLanguage: target language
     * @param renderContext: render context
     * @param _options: renderer options
     */
    constructor(targetLanguage: TargetLanguage, renderContext: RenderContext, _options: OptionValues<typeof cJSONOptions>);
    /**
     * Build forbidden names for namespace
     * @return Forbidden names for namespace
     */
    protected forbiddenNamesForGlobalNamespace(): string[];
    /**
     * Build forbidden names for enums
     * @return Forbidden names for enums
     */
    protected forbiddenForEnumCases(_enumType: EnumType, _enumName: Name): ForbiddenWordsInfo;
    /**
     * Build forbidden names for unions members
     * @return Forbidden names for unions members
     */
    protected forbiddenForUnionMembers(_u: UnionType, _unionName: Name): ForbiddenWordsInfo;
    /**
     * Build forbidden names for objects
     * @return Forbidden names for objects
     */
    protected forbiddenForObjectProperties(_c: ClassType, _className: Name): ForbiddenWordsInfo;
    /**
     * Build types member names
     * @return types member namer
     */
    protected makeNamedTypeNamer(): Namer;
    /**
     * Build object properties member names
     * @return object properties member namer
     */
    protected namerForObjectProperty(): Namer;
    /**
     * Build union member names
     * @return union member namer
     */
    protected makeUnionMemberNamer(): Namer;
    /**
     * Build enum member names
     * @return enum member namer
     */
    protected makeEnumCaseNamer(): Namer;
    /**
     * Override of super proposeUnionMemberName function
     * @param unionType: union type
     * @param unionName: union name
     * @param fieldType: field type
     * @param lookup: Lookup function
     * @return Proposed union member name
     */
    protected proposeUnionMemberName(unionType: UnionType, unionName: Name, fieldType: Type, lookup: (n: Name) => string): string;
    /**
     * Function called to emit typedef alias for a a given type
     * @param fieldType: the variable type
     * @param fieldName: name of the variable
     */
    protected emitTypedefAlias(fieldType: Type, fieldName: Name): void;
    /**
     * Function called to create header file(s)
     * @param proposedFilename: source filename provided from stdin
     */
    protected emitSourceStructure(proposedFilename: string): void;
    /**
     * Function called to create a single header file with types and generators
     * @param proposedFilename: source filename provided from stdin
     */
    protected emitSingleSourceStructure(proposedFilename: string): void;
    /**
     * Function called to create a multiple header files with types and generators
     */
    protected emitMultiSourceStructure(): void;
    /**
     * Function called to create an enum header files with types and generators
     * @param enumType: enum type
     * @param includes: Array of includes
     */
    protected emitEnum(enumType: EnumType, includes: string[]): void;
    /**
     * Function called to create enum typedef
     * @param enumType: enum type
     */
    protected emitEnumTypedef(enumType: EnumType): void;
    /**
     * Function called to create enum prototypes
     * @param enumType: enum type
     */
    protected emitEnumPrototypes(enumType: EnumType): void;
    /**
     * Function called to create enum functions
     * @param enumType: enum type
     */
    protected emitEnumFunctions(enumType: EnumType): void;
    /**
     * Function called to create a union header files with types and generators
     * @param unionType: union type
     * @param includes: Array of includes
     */
    protected emitUnion(unionType: UnionType, includes: string[]): void;
    /**
     * Function called to create union typedef
     * @param unionType: union type
     */
    protected emitUnionTypedef(unionType: UnionType): void;
    /**
     * Function called to create union prototypes
     * @param unionType: union type
     */
    protected emitUnionPrototypes(unionType: UnionType): void;
    /**
     * Function called to create union functions
     * @param unionType: union type
     */
    protected emitUnionFunctions(unionType: UnionType): void;
    /**
     * Function called to create a class header files with types and generators
     * @param classType: class type
     * @param includes: Array of includes
     */
    protected emitClass(classType: ClassType, includes: string[]): void;
    /**
     * Function called to create class typedef
     * @param classType: class type
     */
    protected emitClassTypedef(classType: ClassType): void;
    /**
     * Function called to create class prototypes
     * @param classType: class type
     */
    protected emitClassPrototypes(classType: ClassType): void;
    /**
     * Function called to create class functions
     * @param classType: class type
     */
    protected emitClassFunctions(classType: ClassType): void;
    /**
     * Function called to create a top level header files with types and generators
     * @param type: type of the top level element
     * @param className: top level class name
     * @param includes: Array of includes
     */
    protected emitTopLevel(type: Type, className: Name, includes: string[]): void;
    /**
     * Function called to create top level typedef
     * @param type: type of the top level element
     * @param className: top level class name
     */
    protected emitTopLevelTypedef(type: Type, className: Name): void;
    /**
     * Function called to create top level prototypes
     * @param type: type of the top level element
     * @param className: top level class name
     */
    protected emitTopLevelPrototypes(_type: Type, className: Name): void;
    /**
     * Function called to create top level functions
     * @param type: type of the top level element
     * @param className: top level class name
     */
    protected emitTopLevelFunctions(type: Type, className: Name): void;
    /**
     * Convert quicktype type to cJSON type
     * @param t: quicktype type
     * @param isOptional: true if the field is optional
     * @param isNullable: true if the field is nullable
     * @return cJSON type
     */
    protected quicktypeTypeToCJSON(t: Type, isOptional: boolean, isNullable?: boolean): TypeCJSON;
    /**
     * Function called to create a file
     * @param proposedFilename: source filename provided from stdin
     */
    protected startFile(proposedFilename: Sourcelike): void;
    /**
     * Function called to close current file
     */
    protected finishFile(): void;
    /**
     * Check if type need declaration before use
     * @note If returning true, canBeForwardDeclared must be declared
     * @return Always returns true
     */
    protected get needsTypeDeclarationBeforeUse(): boolean;
    /**
     * Check if type can be forward declared
     * @return true for classes, false otherwise
     */
    protected canBeForwardDeclared(type: Type): boolean;
    /**
     * Add const to wanted Sourcelike
     * @return Const Sourcelike
     */
    protected withConst(s: Sourcelike): Sourcelike;
    /**
     * Emit include line
     * @param name: filename to include
     * @pram global: true if global include, false otherwise (default)
     */
    protected emitIncludeLine(name: Sourcelike, global?: boolean): void;
    /**
     * Emit description block
     * @param lines: description block lines
     */
    protected emitDescriptionBlock(lines: Sourcelike[]): void;
    /**
     * Emit code block
     * @param line: code block line
     * @param f: callback function
     * @param withName: name of the block as string
     * @param withSemicolon: true to add semicolon at the end of the block, false otherwise
     * @param withIndent: true to indent the block (default), false otherwise
     */
    protected emitBlock(line: Sourcelike, f: () => void, withName?: string, withSemicolon?: boolean, withIndent?: boolean): void;
    /**
     * Emit includes
     * @param type: class, union or enum type
     * @param filename: current file name
     */
    protected emitIncludes(type: ClassType | UnionType | EnumType, filename: string): void;
    /**
     * Compute includes
     * @param isClassMender: true if class, false otherwise
     * @param includes: include map
     * @param propertyType: property type
     */
    protected updateIncludes(isClassMember: boolean, includes: IncludeMap$1, propertyType: Type): void;
    /**
     * Compute generated types
     * @param isClassMender: true if class, false otherwise
     * @param type: type
     * @return Type record array
     */
    protected generatedTypes(isClassMember: boolean, type: Type): TypeRecord$1[];
}

declare const cPlusPlusOptions: {
    typeSourceStyle: EnumOption<boolean>;
    includeLocation: EnumOption<boolean>;
    codeFormat: EnumOption<boolean>;
    wstring: EnumOption<boolean>;
    westConst: EnumOption<boolean>;
    justTypes: BooleanOption;
    namespace: StringOption;
    enumType: StringOption;
    typeNamingStyle: EnumOption<NamingStyle>;
    memberNamingStyle: EnumOption<NamingStyle>;
    enumeratorNamingStyle: EnumOption<NamingStyle>;
    boost: BooleanOption;
    hideNullOptional: BooleanOption;
};
declare class CPlusPlusTargetLanguage extends TargetLanguage {
    constructor(displayName?: string, names?: string[], extension?: string);
    protected getOptions(): Array<Option<FixMeOptionsAnyType>>;
    get supportsUnionsWithBothNumberTypes(): boolean;
    get supportsOptionalClassProperties(): boolean;
    protected makeRenderer(renderContext: RenderContext, untypedOptionValues: FixMeOptionsType): CPlusPlusRenderer;
}
/**
 * To be able to support circles in multiple files -
 * e.g. class#A using class#B using class#A (obviously not directly,
 * but in vector or in variant) we can forward declare them;
 */
declare enum IncludeKind {
    ForwardDeclare = "ForwardDeclare",
    Include = "Include"
}
declare enum GlobalNames {
    ClassMemberConstraints = 1,
    ClassMemberConstraintException = 2,
    ValueTooLowException = 3,
    ValueTooHighException = 4,
    ValueTooShortException = 5,
    ValueTooLongException = 6,
    InvalidPatternException = 7,
    CheckConstraint = 8
}
declare enum MemberNames {
    MinIntValue = 1,
    GetMinIntValue = 2,
    SetMinIntValue = 3,
    MaxIntValue = 4,
    GetMaxIntValue = 5,
    SetMaxIntValue = 6,
    MinDoubleValue = 7,
    GetMinDoubleValue = 8,
    SetMinDoubleValue = 9,
    MaxDoubleValue = 10,
    GetMaxDoubleValue = 11,
    SetMaxDoubleValue = 12,
    MinLength = 13,
    GetMinLength = 14,
    SetMinLength = 15,
    MaxLength = 16,
    GetMaxLength = 17,
    SetMaxLength = 18,
    Pattern = 19,
    GetPattern = 20,
    SetPattern = 21
}
interface ConstraintMember {
    cppConstType?: string;
    cppType: string;
    getter: MemberNames;
    name: MemberNames;
    setter: MemberNames;
}
interface IncludeRecord {
    kind: IncludeKind | undefined /** How to include that */;
    typeKind: TypeKind | undefined /** What exactly to include */;
}
interface TypeRecord {
    forceInclude: boolean;
    level: number;
    name: Name;
    type: Type;
    variant: boolean;
}
/**
 * We map each and every unique type to a include kind, e.g. how
 * to include the given type
 */
type IncludeMap = Map<string, IncludeRecord>;
interface TypeContext {
    inJsonNamespace: boolean;
    needsForwardIndirection: boolean;
    needsOptionalIndirection: boolean;
}
declare class WrappingCode {
    private readonly start;
    private readonly end;
    constructor(start: Sourcelike[], end: Sourcelike[]);
    wrap(qualifier: Sourcelike, inner: Sourcelike): Sourcelike;
}
declare class CPlusPlusRenderer extends ConvenienceRenderer {
    private readonly _options;
    /**
     * For forward declaration practically
     */
    private readonly _enumType;
    private readonly _generatedFiles;
    private _currentFilename;
    private _allTypeNames;
    private readonly _gettersAndSettersForPropertyName;
    private readonly _namespaceNames;
    private readonly _memberNameStyle;
    private readonly _namedTypeNameStyle;
    private readonly _generatedGlobalNames;
    private readonly _generatedMemberNames;
    private readonly _forbiddenGlobalNames;
    private readonly _memberNamingFunction;
    private readonly _stringType;
    private readonly _optionalType;
    private readonly _optionalFactory;
    private readonly _nulloptType;
    private readonly _variantType;
    private readonly _variantIndexMethodName;
    protected readonly typeNamingStyle: NamingStyle;
    protected readonly enumeratorNamingStyle: NamingStyle;
    constructor(targetLanguage: TargetLanguage, renderContext: RenderContext, _options: OptionValues<typeof cPlusPlusOptions>);
    private isUnion;
    private isOptionalAsValuePossible;
    isImplicitCycleBreaker(t: Type): boolean;
    private optionalTypeStack;
    private optionalFactoryStack;
    private optionalTypeHeap;
    private optionalFactoryHeap;
    private optionalType;
    private optionalTypeLabel;
    protected getConstraintMembers(): ConstraintMember[];
    protected lookupGlobalName(type: GlobalNames): string;
    protected lookupMemberName(type: MemberNames): string;
    protected addGlobalName(type: GlobalNames): void;
    protected addMemberName(type: MemberNames): void;
    protected setupGlobalNames(): void;
    protected forbiddenNamesForGlobalNamespace(): string[];
    protected forbiddenForObjectProperties(_c: ClassType, _className: Name): ForbiddenWordsInfo;
    protected forbiddenForEnumCases(_e: EnumType, _enumName: Name): ForbiddenWordsInfo;
    protected makeNamedTypeNamer(): Namer;
    protected namerForObjectProperty(): Namer;
    protected makeUnionMemberNamer(): null;
    protected makeEnumCaseNamer(): Namer;
    protected makeNamesForPropertyGetterAndSetter(_c: ClassType, _className: Name, _p: ClassProperty, _jsonName: string, name: Name): [Name, Name, Name];
    protected makePropertyDependencyNames(c: ClassType, className: Name, p: ClassProperty, jsonName: string, name: Name): Name[];
    protected withConst(s: Sourcelike): Sourcelike;
    protected emitInclude(global: boolean, name: Sourcelike): void;
    protected startFile(basename: Sourcelike, includeHelper?: boolean): void;
    protected finishFile(): void;
    protected get needsTypeDeclarationBeforeUse(): boolean;
    protected canBeForwardDeclared(t: Type): boolean;
    protected emitDescriptionBlock(lines: Sourcelike[]): void;
    protected emitBlock(line: Sourcelike, withSemicolon: boolean, f: () => void, withIndent?: boolean): void;
    protected emitNamespaces(namespaceNames: Iterable<string>, f: () => void): void;
    protected cppTypeInOptional(nonNulls: ReadonlySet<Type>, ctx: TypeContext, withIssues: boolean, forceNarrowString: boolean): Sourcelike;
    protected variantType(u: UnionType, inJsonNamespace: boolean): Sourcelike;
    protected ourQualifier(inJsonNamespace: boolean): Sourcelike;
    protected jsonQualifier(inJsonNamespace: boolean): Sourcelike;
    protected variantIndirection(type: Type, needIndirection: boolean, typeSrc: Sourcelike): Sourcelike;
    protected cppType(t: Type, ctx: TypeContext, withIssues: boolean, forceNarrowString: boolean, isOptional: boolean): Sourcelike;
    /**
     * similar to cppType, it practically gathers all the generated types within
     * 't'. It also records, whether a given sub-type is part of a variant or not.
     */
    protected generatedTypes(isClassMember: boolean, theType: Type): TypeRecord[];
    protected constraintMember(jsonName: string): string;
    protected emitMember(cppType: Sourcelike, name: Sourcelike): void;
    protected emitClassMembers(c: ClassType, constraints: Map<string, Sourcelike> | undefined): void;
    protected generateClassConstraints(c: ClassType): Map<string, Sourcelike> | undefined;
    protected emitClass(c: ClassType, className: Name): void;
    protected emitTopLevelHeaders(t: Type, className: Name): void;
    protected emitClassHeaders(className: Name): void;
    protected emitTopLevelFunction(t: Type, className: Name): void;
    protected emitClassFunctions(c: ClassType, className: Name): void;
    protected emitEnum(e: EnumType, enumName: Name): void;
    protected emitUnionTypedefs(u: UnionType, unionName: Name): void;
    protected emitUnionHeaders(u: UnionType): void;
    protected emitUnionFunctions(u: UnionType): void;
    protected emitEnumHeaders(enumName: Name): void;
    private isLargeEnum;
    protected emitEnumFunctions(e: EnumType, enumName: Name): void;
    protected emitTopLevelTypedef(t: Type, name: Name): void;
    protected emitAllUnionFunctions(): void;
    protected emitAllUnionHeaders(): void;
    protected emitOptionalHelpers(): void;
    protected emitDeclaration(decl: Declaration): void;
    protected emitGetterSetter(t: string, getterName: string, setterName: string, memberName: string): void;
    protected emitNumericCheckConstraints(checkConst: string, classConstraint: string, getterMinValue: string, getterMaxValue: string, cppType: string): void;
    protected emitConstraintClasses(): void;
    protected emitHelperFunctions(): void;
    protected emitExtraIncludes(): void;
    protected emitHelper(): void;
    protected emitTypes(): void;
    protected gatherUserNamespaceForwardDecls(): Sourcelike[];
    protected gatherNlohmannNamespaceForwardDecls(): Sourcelike[];
    protected emitUserNamespaceImpls(): void;
    protected emitNlohmannNamespaceImpls(): void;
    protected emitGenerators(): void;
    protected emitSingleSourceStructure(proposedFilename: string): void;
    protected updateIncludes(isClassMember: boolean, includes: IncludeMap, propertyType: Type, _defName: string): void;
    protected emitIncludes(c: ClassType | UnionType | EnumType, defName: string): void;
    protected emitDefinition(d: ClassType | EnumType | UnionType, defName: Name): void;
    protected emitMultiSourceStructure(proposedFilename: string): void;
    protected emitSourceStructure(proposedFilename: string): void;
    protected isConversionRequired(t: Type): boolean;
    NarrowString: {
        wrapEncodingChange(_qualifier: Sourcelike[], _fromType: Sourcelike, _toType: Sourcelike, inner: Sourcelike): Sourcelike;
        emitHelperFunctions(): void;
        _stringType: string;
        _constStringType: string;
        _smatch: string;
        _regex: string;
        _stringLiteralPrefix: string;
        _toString: WrappingCode;
        _encodingClass: Sourcelike;
        _encodingFunction: Sourcelike;
        getType(): string;
        getConstType(): string;
        getSMatch(): string;
        getRegex(): string;
        createStringLiteral(inner: Sourcelike): Sourcelike;
        wrapToString(inner: Sourcelike): Sourcelike;
    };
    WideString: {
        superThis: CPlusPlusRenderer;
        wrapEncodingChange(qualifier: Sourcelike[], fromType: Sourcelike, toType: Sourcelike, inner: Sourcelike): Sourcelike;
        emitHelperFunctions(): void;
        _stringType: string;
        _constStringType: string;
        _smatch: string;
        _regex: string;
        _stringLiteralPrefix: string;
        _toString: WrappingCode;
        _encodingClass: Sourcelike;
        _encodingFunction: Sourcelike;
        getType(): string;
        getConstType(): string;
        getSMatch(): string;
        getRegex(): string;
        createStringLiteral(inner: Sourcelike): Sourcelike;
        wrapToString(inner: Sourcelike): Sourcelike;
    };
}

declare enum Framework$3 {
    Newtonsoft = "Newtonsoft",
    SystemTextJson = "SystemTextJson"
}
type Version = 5 | 6;
declare enum AccessModifier {
    None = "None",
    Public = "Public",
    Internal = "Internal"
}
type CSharpTypeForAny = "object" | "dynamic";
declare const cSharpOptions: {
    framework: EnumOption<Framework$3>;
    useList: EnumOption<boolean>;
    dense: EnumOption<boolean>;
    namespace: StringOption;
    version: EnumOption<Version>;
    virtual: BooleanOption;
    typeForAny: EnumOption<CSharpTypeForAny>;
    useDecimal: EnumOption<boolean>;
    features: EnumOption<{
        namespaces: boolean;
        helpers: boolean;
        attributes: boolean;
    }>;
    baseclass: EnumOption<string>;
    checkRequired: BooleanOption;
    keepPropertyName: BooleanOption;
};
declare class CSharpTargetLanguage extends TargetLanguage {
    constructor();
    protected getOptions(): Array<Option<FixMeOptionsAnyType>>;
    get stringTypeMapping(): StringTypeMapping;
    get supportsUnionsWithBothNumberTypes(): boolean;
    get supportsOptionalClassProperties(): boolean;
    needsTransformerForType(t: Type): boolean;
    protected makeRenderer(renderContext: RenderContext, untypedOptionValues: FixMeOptionsType): ConvenienceRenderer;
}
declare class CSharpRenderer extends ConvenienceRenderer {
    private readonly _csOptions;
    constructor(targetLanguage: TargetLanguage, renderContext: RenderContext, _csOptions: OptionValues<typeof cSharpOptions>);
    protected forbiddenNamesForGlobalNamespace(): string[];
    protected forbiddenForObjectProperties(_: ClassType, classNamed: Name): ForbiddenWordsInfo;
    protected forbiddenForUnionMembers(_: UnionType, unionNamed: Name): ForbiddenWordsInfo;
    protected makeNamedTypeNamer(): Namer;
    protected namerForObjectProperty(): Namer;
    protected makeUnionMemberNamer(): Namer;
    protected makeEnumCaseNamer(): Namer;
    protected unionNeedsName(u: UnionType): boolean;
    protected namedTypeToNameForTopLevel(type: Type): Type | undefined;
    protected emitBlock(f: () => void, semicolon?: boolean): void;
    protected get doubleType(): string;
    protected csType(t: Type, follow?: (t: Type) => Type, withIssues?: boolean): Sourcelike;
    protected nullableCSType(t: Type, follow?: (t: Type) => Type, withIssues?: boolean): Sourcelike;
    protected baseclassForType(_t: Type): Sourcelike | undefined;
    protected emitType(description: string[] | undefined, accessModifier: AccessModifier, declaration: Sourcelike, name: Sourcelike, baseclass: Sourcelike | undefined, emitter: () => void): void;
    protected attributesForProperty(_property: ClassProperty, _name: Name, _c: ClassType, _jsonName: string): Sourcelike[] | undefined;
    protected propertyDefinition(property: ClassProperty, name: Name, _c: ClassType, _jsonName: string): Sourcelike;
    protected emitDescriptionBlock(lines: Sourcelike[]): void;
    protected blankLinesBetweenAttributes(): boolean;
    private emitClassDefinition;
    private emitUnionDefinition;
    private emitEnumDefinition;
    protected emitExpressionMember(declare: Sourcelike, define: Sourcelike, isProperty?: boolean): void;
    protected emitTypeSwitch<T extends Sourcelike>(types: Iterable<T>, condition: (t: T) => Sourcelike, withBlock: boolean, withReturn: boolean, f: (t: T) => void): void;
    protected emitUsing(ns: Sourcelike): void;
    protected emitUsings(): void;
    protected emitRequiredHelpers(): void;
    private emitTypesAndSupport;
    protected emitDefaultLeadingComments(): void;
    protected emitDefaultFollowingComments(): void;
    protected needNamespace(): boolean;
    protected emitSourceStructure(): void;
}

interface PythonFeatures {
    dataClasses: boolean;
    typeHints: boolean;
}
declare const pythonOptions: {
    features: EnumOption<PythonFeatures>;
    justTypes: BooleanOption;
    nicePropertyNames: BooleanOption;
};
declare class PythonTargetLanguage extends TargetLanguage {
    protected getOptions(): Array<Option<FixMeOptionsAnyType>>;
    get stringTypeMapping(): StringTypeMapping;
    get supportsUnionsWithBothNumberTypes(): boolean;
    get supportsOptionalClassProperties(): boolean;
    needsTransformerForType(t: Type): boolean;
    protected makeRenderer(renderContext: RenderContext, untypedOptionValues: FixMeOptionsType): PythonRenderer;
}
declare class PythonRenderer extends ConvenienceRenderer {
    protected readonly pyOptions: OptionValues<typeof pythonOptions>;
    private readonly imports;
    private readonly declaredTypes;
    constructor(targetLanguage: TargetLanguage, renderContext: RenderContext, pyOptions: OptionValues<typeof pythonOptions>);
    protected forbiddenNamesForGlobalNamespace(): string[];
    protected forbiddenForObjectProperties(_: ClassType, _classNamed: Name): ForbiddenWordsInfo;
    protected makeNamedTypeNamer(): Namer;
    protected namerForObjectProperty(): Namer;
    protected makeUnionMemberNamer(): null;
    protected makeEnumCaseNamer(): Namer;
    protected get commentLineStart(): string;
    protected emitDescriptionBlock(lines: Sourcelike[]): void;
    protected get needsTypeDeclarationBeforeUse(): boolean;
    protected canBeForwardDeclared(t: Type): boolean;
    protected emitBlock(line: Sourcelike, f: () => void): void;
    protected string(s: string): Sourcelike;
    protected withImport(module: string, name: string): Sourcelike;
    protected withTyping(name: string): Sourcelike;
    protected namedType(t: Type): Sourcelike;
    protected pythonType(t: Type, _isRootTypeDef?: boolean): Sourcelike;
    protected declarationLine(t: Type): Sourcelike;
    protected declareType<T extends Type>(t: T, emitter: () => void): void;
    protected emitClassMembers(t: ClassType): void;
    protected typeHint(...sl: Sourcelike[]): Sourcelike;
    protected typingDecl(name: Sourcelike, type: string): Sourcelike;
    protected typingReturn(type: string): Sourcelike;
    protected sortClassProperties(properties: ReadonlyMap<string, ClassProperty>, propertyNames: ReadonlyMap<string, Name>): ReadonlyMap<string, ClassProperty>;
    protected emitClass(t: ClassType): void;
    protected emitEnum(t: EnumType): void;
    protected emitImports(): void;
    protected emitSupportCode(): void;
    protected emitClosingCode(): void;
    protected emitSourceStructure(_givenOutputFilename: string): void;
}

declare const goOptions: {
    justTypes: BooleanOption;
    justTypesAndPackage: BooleanOption;
    packageName: StringOption;
    multiFileOutput: BooleanOption;
    fieldTags: StringOption;
    omitEmpty: BooleanOption;
};
declare class GoTargetLanguage extends TargetLanguage {
    constructor();
    protected getOptions(): Array<Option<FixMeOptionsAnyType>>;
    get supportsUnionsWithBothNumberTypes(): boolean;
    get stringTypeMapping(): StringTypeMapping;
    get supportsOptionalClassProperties(): boolean;
    protected makeRenderer(renderContext: RenderContext, untypedOptionValues: FixMeOptionsType): GoRenderer;
    protected get defaultIndentation(): string;
}
declare class GoRenderer extends ConvenienceRenderer {
    private readonly _options;
    private readonly _topLevelUnmarshalNames;
    private _currentFilename;
    constructor(targetLanguage: TargetLanguage, renderContext: RenderContext, _options: OptionValues<typeof goOptions>);
    protected makeNamedTypeNamer(): Namer;
    protected namerForObjectProperty(): Namer;
    protected makeUnionMemberNamer(): Namer;
    protected makeEnumCaseNamer(): Namer;
    protected get enumCasesInGlobalNamespace(): boolean;
    protected makeTopLevelDependencyNames(_: Type, topLevelName: Name): DependencyName[];
    protected startFile(basename: Sourcelike): void;
    protected endFile(): void;
    private emitBlock;
    private emitFunc;
    private emitStruct;
    private nullableGoType;
    private propertyGoType;
    private goType;
    private emitTopLevel;
    private emitClass;
    private emitEnum;
    private emitUnion;
    private emitSingleFileHeaderComments;
    private emitPackageDefinitons;
    private emitImports;
    private emitHelperFunctions;
    protected emitSourceStructure(): void;
    private collectAllImports;
    private collectClassImports;
    private collectUnionImports;
}

type MemoryAttribute = "assign" | "strong" | "copy";
declare const objcOptions: {
    features: EnumOption<{
        interface: boolean;
        implementation: boolean;
    }>;
    justTypes: BooleanOption;
    marshallingFunctions: BooleanOption;
    classPrefix: StringOption;
    extraComments: BooleanOption;
};
declare class ObjectiveCTargetLanguage extends TargetLanguage {
    constructor();
    protected getOptions(): Array<Option<FixMeOptionsAnyType>>;
    protected makeRenderer(renderContext: RenderContext, untypedOptionValues: FixMeOptionsType): ObjectiveCRenderer;
}
declare class ObjectiveCRenderer extends ConvenienceRenderer {
    private readonly _options;
    private _currentFilename;
    private readonly _classPrefix;
    constructor(targetLanguage: TargetLanguage, renderContext: RenderContext, _options: OptionValues<typeof objcOptions>);
    private inferClassPrefix;
    protected forbiddenNamesForGlobalNamespace(): string[];
    protected forbiddenForObjectProperties(_c: ClassType, _className: Name): ForbiddenWordsInfo;
    protected forbiddenForEnumCases(_e: EnumType, _enumName: Name): ForbiddenWordsInfo;
    protected makeNamedTypeNamer(): Namer;
    protected namerForObjectProperty(_: ClassType, p: ClassProperty): Namer;
    protected makeUnionMemberNamer(): null;
    protected makeEnumCaseNamer(): Namer;
    protected namedTypeToNameForTopLevel(type: Type): Type | undefined;
    protected emitDescriptionBlock(lines: Sourcelike[]): void;
    protected emitBlock(line: Sourcelike, f: () => void): void;
    protected emitMethod(declaration: Sourcelike, f: () => void): void;
    protected emitExtraComments(...comments: Sourcelike[]): void;
    protected startFile(basename: Sourcelike, extension: string): void;
    protected finishFile(): void;
    protected memoryAttribute(t: Type, isNullable: boolean): MemoryAttribute;
    protected objcType(t: Type, nullableOrBoxed?: boolean): [Sourcelike, string];
    private jsonType;
    protected fromDynamicExpression(t: Type, ...dynamic: Sourcelike[]): Sourcelike;
    protected toDynamicExpression(t: Type, typed: Sourcelike): Sourcelike;
    protected implicitlyConvertsFromJSON(t: Type): boolean;
    protected implicitlyConvertsToJSON(t: Type): boolean;
    protected emitPropertyAssignment(propertyName: Name, jsonName: string, propertyType: Type): void;
    protected emitPrivateClassInterface(_: ClassType, name: Name): void;
    protected pointerAwareTypeName(t: Type | [Sourcelike, string]): Sourcelike;
    private emitNonClassTopLevelTypedef;
    private topLevelFromDataPrototype;
    private topLevelFromJSONPrototype;
    private topLevelToDataPrototype;
    private topLevelToJSONPrototype;
    private emitTopLevelFunctionDeclarations;
    private emitTryCatchAsError;
    private emitTopLevelFunctions;
    private emitClassInterface;
    protected hasIrregularProperties(t: ClassType): boolean;
    protected hasUnsafeProperties(t: ClassType): boolean;
    private emitClassImplementation;
    protected emitMark(label: string): void;
    protected variableNameForTopLevel(name: Name): Sourcelike;
    private emitPseudoEnumInterface;
    private emitPseudoEnumImplementation;
    protected emitSourceStructure(proposedFilename: string): void;
    private get needsMap();
    protected emitMapFunction(): void;
}

declare enum AcronymStyleOptions {
    Camel = "camel",
    Lower = "lowerCase",
    Original = "original",
    Pascal = "pascal"
}

declare const javaOptions: {
    useList: EnumOption<boolean>;
    justTypes: BooleanOption;
    dateTimeProvider: EnumOption<string>;
    acronymStyle: EnumOption<AcronymStyleOptions>;
    packageName: StringOption;
    lombok: BooleanOption;
    lombokCopyAnnotations: BooleanOption;
};
declare class JavaTargetLanguage extends TargetLanguage {
    constructor();
    protected getOptions(): Array<Option<FixMeOptionsAnyType>>;
    get supportsUnionsWithBothNumberTypes(): boolean;
    protected makeRenderer(renderContext: RenderContext, untypedOptionValues: FixMeOptionsType): JavaRenderer;
    get stringTypeMapping(): StringTypeMapping;
}
declare abstract class JavaDateTimeProvider {
    protected readonly _renderer: JavaRenderer;
    protected readonly _className: string;
    constructor(_renderer: JavaRenderer, _className: string);
    abstract keywords: string[];
    abstract dateTimeImports: string[];
    abstract dateImports: string[];
    abstract timeImports: string[];
    abstract converterImports: string[];
    abstract dateTimeType: string;
    abstract dateType: string;
    abstract timeType: string;
    abstract dateTimeJacksonAnnotations: string[];
    abstract dateJacksonAnnotations: string[];
    abstract timeJacksonAnnotations: string[];
    abstract emitDateTimeConverters(): void;
    shouldEmitDateTimeConverter: boolean;
    shouldEmitTimeConverter: boolean;
    shouldEmitDateConverter: boolean;
    abstract convertStringToDateTime(variable: Sourcelike): Sourcelike;
    abstract convertStringToTime(variable: Sourcelike): Sourcelike;
    abstract convertStringToDate(variable: Sourcelike): Sourcelike;
    abstract convertDateTimeToString(variable: Sourcelike): Sourcelike;
    abstract convertTimeToString(variable: Sourcelike): Sourcelike;
    abstract convertDateToString(variable: Sourcelike): Sourcelike;
}
declare class JavaRenderer extends ConvenienceRenderer {
    protected readonly _options: OptionValues<typeof javaOptions>;
    private _currentFilename;
    private readonly _gettersAndSettersForPropertyName;
    private _haveEmittedLeadingComments;
    protected readonly _dateTimeProvider: JavaDateTimeProvider;
    protected readonly _converterClassname: string;
    protected readonly _converterKeywords: string[];
    constructor(targetLanguage: TargetLanguage, renderContext: RenderContext, _options: OptionValues<typeof javaOptions>);
    protected forbiddenNamesForGlobalNamespace(): string[];
    protected forbiddenForObjectProperties(_c: ClassType, _className: Name): ForbiddenWordsInfo;
    protected makeNamedTypeNamer(): Namer;
    protected namerForObjectProperty(): Namer;
    protected makeUnionMemberNamer(): Namer;
    protected makeEnumCaseNamer(): Namer;
    protected unionNeedsName(u: UnionType): boolean;
    protected namedTypeToNameForTopLevel(type: Type): Type | undefined;
    protected makeNamesForPropertyGetterAndSetter(_c: ClassType, _className: Name, _p: ClassProperty, _jsonName: string, name: Name): [Name, Name];
    protected makePropertyDependencyNames(c: ClassType, className: Name, p: ClassProperty, jsonName: string, name: Name): Name[];
    private getNameStyling;
    protected fieldOrMethodName(methodName: string, topLevelName: Name): Sourcelike;
    protected methodName(prefix: string, suffix: string, topLevelName: Name): Sourcelike;
    protected decoderName(topLevelName: Name): Sourcelike;
    protected encoderName(topLevelName: Name): Sourcelike;
    protected readerGetterName(topLevelName: Name): Sourcelike;
    protected writerGetterName(topLevelName: Name): Sourcelike;
    protected startFile(basename: Sourcelike): void;
    protected finishFile(): void;
    protected emitPackageAndImports(imports: string[]): void;
    protected emitFileHeader(fileName: Sourcelike, imports: string[]): void;
    emitDescriptionBlock(lines: Sourcelike[]): void;
    emitBlock(line: Sourcelike, f: () => void): void;
    emitTryCatch(main: () => void, handler: () => void, exception?: string): void;
    emitIgnoredTryCatchBlock(f: () => void): void;
    protected javaType(reference: boolean, t: Type, withIssues?: boolean): Sourcelike;
    protected javaImport(t: Type): string[];
    protected javaTypeWithoutGenerics(reference: boolean, t: Type): Sourcelike;
    protected emitClassAttributes(_c: ClassType, _className: Name): void;
    protected annotationsForAccessor(_c: ClassType, _className: Name, _propertyName: Name, _jsonName: string, _p: ClassProperty, _isSetter: boolean): string[];
    protected importsForType(t: ClassType | UnionType | EnumType): string[];
    protected importsForClass(c: ClassType): string[];
    protected importsForUnionMembers(u: UnionType): string[];
    protected emitClassDefinition(c: ClassType, className: Name): void;
    protected unionField(u: UnionType, t: Type, withIssues?: boolean): {
        fieldName: Sourcelike;
        fieldType: Sourcelike;
    };
    protected emitUnionAttributes(_u: UnionType, _unionName: Name): void;
    protected emitUnionSerializer(_u: UnionType, _unionName: Name): void;
    protected emitUnionDefinition(u: UnionType, unionName: Name): void;
    protected emitEnumSerializationAttributes(_e: EnumType): void;
    protected emitEnumDeserializationAttributes(_e: EnumType): void;
    protected emitEnumDefinition(e: EnumType, enumName: Name): void;
    protected emitSourceStructure(): void;
}

declare enum ConvertersOptions {
    AllObjects = "all-objects",
    TopLevel = "top-level"
}

declare const javaScriptOptions: {
    acronymStyle: EnumOption<AcronymStyleOptions>;
    runtimeTypecheck: BooleanOption;
    runtimeTypecheckIgnoreUnknownProperties: BooleanOption;
    converters: EnumOption<ConvertersOptions>;
    rawType: EnumOption<"any" | "json">;
};
interface JavaScriptTypeAnnotations {
    any: string;
    anyArray: string;
    anyMap: string;
    boolean: string;
    never: string;
    string: string;
    stringArray: string;
}
declare class JavaScriptTargetLanguage extends TargetLanguage {
    constructor(displayName?: string, names?: string[], extension?: string);
    protected getOptions(): Array<Option<FixMeOptionsAnyType>>;
    get stringTypeMapping(): StringTypeMapping;
    get supportsOptionalClassProperties(): boolean;
    get supportsFullObjectType(): boolean;
    protected makeRenderer(renderContext: RenderContext, untypedOptionValues: FixMeOptionsType): JavaScriptRenderer;
}
declare class JavaScriptRenderer extends ConvenienceRenderer {
    private readonly _jsOptions;
    constructor(targetLanguage: TargetLanguage, renderContext: RenderContext, _jsOptions: OptionValues<typeof javaScriptOptions>);
    protected nameStyle(original: string, upper: boolean): string;
    protected makeNamedTypeNamer(): Namer;
    protected namerForObjectProperty(): Namer;
    protected makeUnionMemberNamer(): null;
    protected makeEnumCaseNamer(): Namer;
    protected namedTypeToNameForTopLevel(type: Type): Type | undefined;
    protected makeNameForProperty(c: ClassType, className: Name, p: ClassProperty, jsonName: string, _assignedName: string | undefined): Name | undefined;
    protected emitDescriptionBlock(lines: Sourcelike[]): void;
    private typeMapTypeFor;
    private typeMapTypeForProperty;
    protected emitBlock(source: Sourcelike, end: Sourcelike, emit: () => void): void;
    private emitTypeMap;
    protected deserializerFunctionName(name: Name): Sourcelike;
    protected deserializerFunctionLine(_t: Type, name: Name): Sourcelike;
    protected serializerFunctionName(name: Name): Sourcelike;
    protected serializerFunctionLine(_t: Type, name: Name): Sourcelike;
    protected get moduleLine(): string | undefined;
    protected get castFunctionLines(): [string, string];
    protected get typeAnnotations(): JavaScriptTypeAnnotations;
    protected emitConvertModuleBody(): void;
    protected emitConvertModuleHelpers(): void;
    protected emitConvertModule(): void;
    protected emitTypes(): void;
    protected emitUsageImportComment(): void;
    protected emitUsageComments(): void;
    protected emitModuleExports(): void;
    protected emitSourceStructure(): void;
}

declare const javaScriptPropTypesOptions: {
    acronymStyle: EnumOption<AcronymStyleOptions>;
    converters: EnumOption<ConvertersOptions>;
    moduleSystem: EnumOption<boolean>;
};
declare class JavaScriptPropTypesTargetLanguage extends TargetLanguage {
    protected getOptions(): Array<Option<FixMeOptionsAnyType>>;
    constructor(displayName?: string, names?: string[], extension?: string);
    protected makeRenderer(renderContext: RenderContext, untypedOptionValues: FixMeOptionsType): JavaScriptPropTypesRenderer;
}
declare class JavaScriptPropTypesRenderer extends ConvenienceRenderer {
    private readonly _jsOptions;
    constructor(targetLanguage: TargetLanguage, renderContext: RenderContext, _jsOptions: OptionValues<typeof javaScriptPropTypesOptions>);
    protected nameStyle(original: string, upper: boolean): string;
    protected makeNamedTypeNamer(): Namer;
    protected namerForObjectProperty(): Namer;
    protected makeUnionMemberNamer(): null;
    protected makeEnumCaseNamer(): Namer;
    protected namedTypeToNameForTopLevel(type: Type): Type | undefined;
    protected makeNameForProperty(c: ClassType, className: Name, p: ClassProperty, jsonName: string, _assignedName: string | undefined): Name | undefined;
    private typeMapTypeFor;
    private typeMapTypeForProperty;
    private importStatement;
    protected emitUsageComments(): void;
    protected emitBlock(source: Sourcelike, end: Sourcelike, emit: () => void): void;
    protected emitImports(): void;
    private emitExport;
    protected emitTypes(): void;
    private emitObject;
    protected emitSourceStructure(): void;
}

declare const tsFlowOptions: {
    acronymStyle: EnumOption<AcronymStyleOptions>;
    runtimeTypecheck: BooleanOption;
    runtimeTypecheckIgnoreUnknownProperties: BooleanOption;
    converters: EnumOption<ConvertersOptions>;
    rawType: EnumOption<"any" | "json">;
} & {
    justTypes: BooleanOption;
    nicePropertyNames: BooleanOption;
    declareUnions: BooleanOption;
    preferUnions: BooleanOption;
    preferTypes: BooleanOption;
    preferConstValues: BooleanOption;
    readonly: BooleanOption;
};
declare abstract class TypeScriptFlowBaseTargetLanguage extends JavaScriptTargetLanguage {
    protected getOptions(): Array<Option<FixMeOptionsAnyType>>;
    get supportsOptionalClassProperties(): boolean;
    protected abstract makeRenderer(renderContext: RenderContext, untypedOptionValues: FixMeOptionsType): JavaScriptRenderer;
}
declare class TypeScriptTargetLanguage extends TypeScriptFlowBaseTargetLanguage {
    constructor();
    protected makeRenderer(renderContext: RenderContext, untypedOptionValues: FixMeOptionsType): TypeScriptRenderer;
}
declare abstract class TypeScriptFlowBaseRenderer extends JavaScriptRenderer {
    protected readonly _tsFlowOptions: OptionValues<typeof tsFlowOptions>;
    constructor(targetLanguage: TargetLanguage, renderContext: RenderContext, _tsFlowOptions: OptionValues<typeof tsFlowOptions>);
    protected namerForObjectProperty(): Namer;
    protected sourceFor(t: Type): MultiWord;
    protected abstract emitEnum(e: EnumType, enumName: Name): void;
    protected abstract emitClassBlock(c: ClassType, className: Name): void;
    protected emitClassBlockBody(c: ClassType): void;
    private emitClass;
    protected emitUnion(u: UnionType, unionName: Name): void;
    protected emitTypes(): void;
    protected emitUsageComments(): void;
    protected deserializerFunctionLine(t: Type, name: Name): Sourcelike;
    protected serializerFunctionLine(t: Type, name: Name): Sourcelike;
    protected get moduleLine(): string | undefined;
    protected get castFunctionLines(): [string, string];
    protected get typeAnnotations(): JavaScriptTypeAnnotations;
    protected emitConvertModule(): void;
    protected emitConvertModuleHelpers(): void;
    protected emitModuleExports(): void;
}
declare class TypeScriptRenderer extends TypeScriptFlowBaseRenderer {
    protected forbiddenNamesForGlobalNamespace(): string[];
    protected deserializerFunctionLine(t: Type, name: Name): Sourcelike;
    protected serializerFunctionLine(t: Type, name: Name): Sourcelike;
    protected get moduleLine(): string | undefined;
    protected get typeAnnotations(): JavaScriptTypeAnnotations;
    protected emitModuleExports(): void;
    protected emitUsageImportComment(): void;
    protected emitEnum(e: EnumType, enumName: Name): void;
    protected emitClassBlock(c: ClassType, className: Name): void;
    protected emitSourceStructure(): void;
}
declare class FlowTargetLanguage extends TypeScriptFlowBaseTargetLanguage {
    constructor();
    protected makeRenderer(renderContext: RenderContext, untypedOptionValues: FixMeOptionsType): FlowRenderer;
}
declare class FlowRenderer extends TypeScriptFlowBaseRenderer {
    protected forbiddenNamesForGlobalNamespace(): string[];
    protected get typeAnnotations(): JavaScriptTypeAnnotations;
    protected emitEnum(e: EnumType, enumName: Name): void;
    protected emitClassBlock(c: ClassType, className: Name): void;
    protected emitSourceStructure(): void;
}

declare const swiftOptions: {
    justTypes: BooleanOption;
    convenienceInitializers: BooleanOption;
    explicitCodingKeys: BooleanOption;
    codingKeysProtocol: StringOption;
    alamofire: BooleanOption;
    namedTypePrefix: StringOption;
    useClasses: EnumOption<boolean>;
    mutableProperties: BooleanOption;
    acronymStyle: EnumOption<AcronymStyleOptions>;
    dense: EnumOption<boolean>;
    linux: BooleanOption;
    objcSupport: BooleanOption;
    optionalEnums: BooleanOption;
    swift5Support: BooleanOption;
    sendable: BooleanOption;
    multiFileOutput: BooleanOption;
    accessLevel: EnumOption<string>;
    protocol: EnumOption<{
        equatable: boolean;
        hashable: boolean;
    }>;
};
interface SwiftProperty {
    jsonName: string;
    name: Name;
    parameter: ClassProperty;
    position: ForEachPosition;
}
declare class SwiftTargetLanguage extends TargetLanguage {
    constructor();
    protected getOptions(): Array<Option<FixMeOptionsAnyType>>;
    get stringTypeMapping(): StringTypeMapping;
    get supportsOptionalClassProperties(): boolean;
    get supportsUnionsWithBothNumberTypes(): boolean;
    protected makeRenderer(renderContext: RenderContext, untypedOptionValues: FixMeOptionsType): SwiftRenderer;
    get dateTimeRecognizer(): DateTimeRecognizer;
}
declare class SwiftRenderer extends ConvenienceRenderer {
    private readonly _options;
    private _currentFilename;
    private _needAny;
    private _needNull;
    constructor(targetLanguage: TargetLanguage, renderContext: RenderContext, _options: OptionValues<typeof swiftOptions>);
    protected forbiddenNamesForGlobalNamespace(): string[];
    protected forbiddenForObjectProperties(_c: ClassType, _classNamed: Name): ForbiddenWordsInfo;
    protected forbiddenForEnumCases(_e: EnumType, _enumName: Name): ForbiddenWordsInfo;
    protected forbiddenForUnionMembers(_u: UnionType, _unionName: Name): ForbiddenWordsInfo;
    protected makeNamedTypeNamer(): Namer;
    protected namerForObjectProperty(): Namer;
    protected makeUnionMemberNamer(): Namer;
    protected makeEnumCaseNamer(): Namer;
    protected isImplicitCycleBreaker(t: Type): boolean;
    protected emitDescriptionBlock(lines: Sourcelike[]): void;
    private emitBlock;
    private emitBlockWithAccess;
    private justTypesCase;
    private get lowerNamingFunction();
    protected swiftPropertyType(p: ClassProperty): Sourcelike;
    protected swiftType(t: Type, withIssues?: boolean, noOptional?: boolean): Sourcelike;
    protected proposedUnionMemberNameForTypeKind(kind: TypeKind): string | null;
    private renderSingleFileHeaderComments;
    private renderHeader;
    private renderTopLevelAlias;
    protected getProtocolsArray(kind: "struct" | "class" | "enum"): string[];
    private getProtocolString;
    private getEnumPropertyGroups;
    private get accessLevel();
    private get objcMembersDeclaration();
    protected startFile(basename: Sourcelike): void;
    protected endFile(): void;
    protected propertyLinesDefinition(name: Name, parameter: ClassProperty): Sourcelike;
    private renderClassDefinition;
    protected initializableProperties(c: ClassType): SwiftProperty[];
    private emitNewEncoderDecoder;
    private emitConvenienceInitializersExtension;
    private renderEnumDefinition;
    private renderUnionDefinition;
    private emitTopLevelMapAndArrayConvenienceInitializerExtensions;
    private emitDecodingError;
    private readonly emitSupportFunctions4;
    private emitConvenienceMutator;
    protected emitMark(line: Sourcelike, horizontalLine?: boolean): void;
    protected emitSourceStructure(): void;
    private emitAlamofireExtension;
}

declare enum Framework$2 {
    None = "None",
    Jackson = "Jackson",
    Klaxon = "Klaxon",
    KotlinX = "KotlinX"
}
declare const kotlinOptions: {
    framework: EnumOption<Framework$2>;
    acronymStyle: EnumOption<AcronymStyleOptions>;
    packageName: StringOption;
};
declare class KotlinTargetLanguage extends TargetLanguage {
    constructor();
    protected getOptions(): Array<Option<FixMeOptionsAnyType>>;
    get supportsOptionalClassProperties(): boolean;
    get supportsUnionsWithBothNumberTypes(): boolean;
    protected makeRenderer(renderContext: RenderContext, untypedOptionValues: FixMeOptionsType): ConvenienceRenderer;
}
declare class KotlinRenderer extends ConvenienceRenderer {
    protected readonly _kotlinOptions: OptionValues<typeof kotlinOptions>;
    constructor(targetLanguage: TargetLanguage, renderContext: RenderContext, _kotlinOptions: OptionValues<typeof kotlinOptions>);
    protected forbiddenNamesForGlobalNamespace(): string[];
    protected forbiddenForObjectProperties(_o: ObjectType, _classNamed: Name): ForbiddenWordsInfo;
    protected forbiddenForEnumCases(_e: EnumType, _enumName: Name): ForbiddenWordsInfo;
    protected forbiddenForUnionMembers(_u: UnionType, _unionName: Name): ForbiddenWordsInfo;
    protected topLevelNameStyle(rawName: string): string;
    protected makeNamedTypeNamer(): Namer;
    protected namerForObjectProperty(): Namer;
    protected makeUnionMemberNamer(): Namer;
    protected makeEnumCaseNamer(): Namer;
    protected emitDescriptionBlock(lines: Sourcelike[]): void;
    protected emitBlock(line: Sourcelike, f: () => void, delimiter?: "curly" | "paren" | "lambda"): void;
    protected anySourceType(optional: string): Sourcelike;
    protected arrayType(arrayType: ArrayType, withIssues?: boolean, _noOptional?: boolean): Sourcelike;
    protected mapType(mapType: MapType, withIssues?: boolean, _noOptional?: boolean): Sourcelike;
    protected kotlinType(t: Type, withIssues?: boolean, noOptional?: boolean): Sourcelike;
    protected emitUsageHeader(): void;
    protected emitHeader(): void;
    protected emitTopLevelPrimitive(t: PrimitiveType, name: Name): void;
    protected emitTopLevelArray(t: ArrayType, name: Name): void;
    protected emitTopLevelMap(t: MapType, name: Name): void;
    protected emitEmptyClassDefinition(c: ClassType, className: Name): void;
    protected emitClassDefinition(c: ClassType, className: Name): void;
    protected emitClassDefinitionMethods(_c: ClassType, _className: Name): void;
    protected emitClassAnnotations(_c: Type, _className: Name): void;
    protected renameAttribute(_name: Name, _jsonName: string, _required: boolean, _meta: Array<() => void>): void;
    protected emitEnumDefinition(e: EnumType, enumName: Name): void;
    protected emitUnionDefinition(u: UnionType, unionName: Name): void;
    protected emitUnionDefinitionMethods(_u: UnionType, _nonNulls: ReadonlySet<Type>, _maybeNull: PrimitiveType | null, _unionName: Name): void;
    protected emitSourceStructure(): void;
}

declare enum Framework$1 {
    None = "None",
    Upickle = "Upickle",
    Circe = "Circe"
}
declare const scala3Options: {
    framework: EnumOption<Framework$1>;
    packageName: StringOption;
};
declare class Scala3Renderer extends ConvenienceRenderer {
    protected readonly _scalaOptions: OptionValues<typeof scala3Options>;
    constructor(targetLanguage: TargetLanguage, renderContext: RenderContext, _scalaOptions: OptionValues<typeof scala3Options>);
    protected forbiddenNamesForGlobalNamespace(): string[];
    protected forbiddenForObjectProperties(_: ObjectType, _classNamed: Name): ForbiddenWordsInfo;
    protected forbiddenForEnumCases(_: EnumType, _enumName: Name): ForbiddenWordsInfo;
    protected forbiddenForUnionMembers(_u: UnionType, _unionName: Name): ForbiddenWordsInfo;
    protected topLevelNameStyle(rawName: string): string;
    protected makeNamedTypeNamer(): Namer;
    protected namerForObjectProperty(): Namer;
    protected makeUnionMemberNamer(): Namer;
    protected makeEnumCaseNamer(): Namer;
    protected emitDescriptionBlock(lines: Sourcelike[]): void;
    protected emitBlock(line: Sourcelike, f: () => void, delimiter?: "curly" | "paren" | "lambda" | "none"): void;
    protected anySourceType(optional: boolean): Sourcelike;
    protected arrayType(arrayType: ArrayType, withIssues?: boolean): Sourcelike;
    protected mapType(mapType: MapType, withIssues?: boolean): Sourcelike;
    protected scalaType(t: Type, withIssues?: boolean, noOptional?: boolean): Sourcelike;
    protected emitUsageHeader(): void;
    protected emitHeader(): void;
    protected emitTopLevelArray(t: ArrayType, name: Name): void;
    protected emitTopLevelMap(t: MapType, name: Name): void;
    protected emitEmptyClassDefinition(c: ClassType, className: Name): void;
    protected emitClassDefinition(c: ClassType, className: Name): void;
    protected emitClassDefinitionMethods(): void;
    protected emitEnumDefinition(e: EnumType, enumName: Name): void;
    protected emitUnionDefinition(u: UnionType, unionName: Name): void;
    protected emitSourceStructure(): void;
}
declare class Scala3TargetLanguage extends TargetLanguage {
    constructor();
    protected getOptions(): Array<Option<FixMeOptionsAnyType>>;
    get supportsOptionalClassProperties(): boolean;
    get supportsUnionsWithBothNumberTypes(): boolean;
    protected makeRenderer(renderContext: RenderContext, untypedOptionValues: FixMeOptionsType): ConvenienceRenderer;
}

declare enum Framework {
    None = "None"
}
declare const SmithyOptions: {
    framework: EnumOption<Framework>;
    packageName: StringOption;
};
declare class Smithy4sRenderer extends ConvenienceRenderer {
    protected readonly _scalaOptions: OptionValues<typeof SmithyOptions>;
    constructor(targetLanguage: TargetLanguage, renderContext: RenderContext, _scalaOptions: OptionValues<typeof SmithyOptions>);
    protected forbiddenNamesForGlobalNamespace(): string[];
    protected forbiddenForObjectProperties(_: ObjectType, _classNamed: Name): ForbiddenWordsInfo;
    protected forbiddenForEnumCases(_: EnumType, _enumName: Name): ForbiddenWordsInfo;
    protected forbiddenForUnionMembers(_u: UnionType, _unionName: Name): ForbiddenWordsInfo;
    protected topLevelNameStyle(rawName: string): string;
    protected makeNamedTypeNamer(): Namer;
    protected namerForObjectProperty(): Namer;
    protected makeUnionMemberNamer(): Namer;
    protected makeEnumCaseNamer(): Namer;
    protected emitDescriptionBlock(lines: Sourcelike[]): void;
    protected emitBlock(line: Sourcelike, f: () => void, delimiter?: "curly" | "paren" | "lambda" | "none"): void;
    protected anySourceType(_: boolean): Sourcelike;
    protected arrayType(arrayType: ArrayType, _?: boolean): Sourcelike;
    protected emitArrayType(_: ArrayType, smithyType: Sourcelike): void;
    protected mapType(mapType: MapType, _?: boolean): Sourcelike;
    protected scalaType(t: Type, withIssues?: boolean, noOptional?: boolean): Sourcelike;
    protected emitUsageHeader(): void;
    protected emitHeader(): void;
    protected emitTopLevelArray(t: ArrayType, name: Name): void;
    protected emitTopLevelMap(t: MapType, name: Name): void;
    protected emitEmptyClassDefinition(c: ClassType, className: Name): void;
    protected emitClassDefinition(c: ClassType, className: Name): void;
    protected emitClassDefinitionMethods(arrayTypes: ClassProperty[]): void;
    protected emitEnumDefinition(e: EnumType, enumName: Name): void;
    protected emitUnionDefinition(u: UnionType, unionName: Name): void;
    protected emitSourceStructure(): void;
}
declare class SmithyTargetLanguage extends TargetLanguage {
    constructor();
    protected getOptions(): Array<Option<FixMeOptionsAnyType>>;
    get supportsOptionalClassProperties(): boolean;
    get supportsUnionsWithBothNumberTypes(): boolean;
    protected makeRenderer(renderContext: RenderContext, untypedOptionValues: FixMeOptionsType): ConvenienceRenderer;
}

declare const elmOptions: {
    justTypes: BooleanOption;
    useList: EnumOption<boolean>;
    moduleName: StringOption;
};
declare class ElmTargetLanguage extends TargetLanguage {
    constructor();
    protected getOptions(): Array<Option<FixMeOptionsAnyType>>;
    get supportsOptionalClassProperties(): boolean;
    get supportsUnionsWithBothNumberTypes(): boolean;
    protected makeRenderer(renderContext: RenderContext, untypedOptionValues: FixMeOptionsType): ElmRenderer;
}
declare class ElmRenderer extends ConvenienceRenderer {
    private readonly _options;
    private readonly _topLevelDependents;
    private readonly _namedTypeDependents;
    constructor(targetLanguage: TargetLanguage, renderContext: RenderContext, _options: OptionValues<typeof elmOptions>);
    protected forbiddenNamesForGlobalNamespace(): string[];
    protected makeTopLevelDependencyNames(t: Type, topLevelName: Name): DependencyName[];
    protected makeNamedTypeNamer(): Namer;
    protected makeNamedTypeDependencyNames(_: Type, typeName: Name): DependencyName[];
    protected namerForObjectProperty(): Namer;
    protected forbiddenForObjectProperties(_c: ClassType, _className: Name): ForbiddenWordsInfo;
    protected makeUnionMemberNamer(): Namer;
    protected get unionMembersInGlobalNamespace(): boolean;
    protected makeEnumCaseNamer(): Namer;
    protected get enumCasesInGlobalNamespace(): boolean;
    protected proposeUnionMemberName(u: UnionType, unionName: Name, fieldType: Type, lookup: (n: Name) => string): string;
    protected get commentLineStart(): string;
    protected emitDescriptionBlock(lines: Sourcelike[]): void;
    private get arrayType();
    private elmType;
    private elmProperty;
    private decoderNameForNamedType;
    private decoderNameForType;
    private decoderNameForProperty;
    private encoderNameForNamedType;
    private encoderNameForType;
    private encoderNameForProperty;
    private emitTopLevelDefinition;
    private emitClassDefinition;
    private emitEnumDefinition;
    private emitUnionDefinition;
    private emitTopLevelFunctions;
    private emitClassFunctions;
    private emitEnumFunctions;
    private emitUnionFunctions;
    protected emitSourceStructure(): void;
}

declare class JSONSchemaTargetLanguage extends TargetLanguage {
    constructor();
    protected getOptions(): Array<Option<FixMeOptionsAnyType>>;
    get stringTypeMapping(): StringTypeMapping;
    get supportsOptionalClassProperties(): boolean;
    get supportsFullObjectType(): boolean;
    protected makeRenderer(renderContext: RenderContext, _untypedOptionValues: FixMeOptionsType): JSONSchemaRenderer;
}
declare class JSONSchemaRenderer extends ConvenienceRenderer {
    protected makeNamedTypeNamer(): Namer;
    protected namerForObjectProperty(): null;
    protected makeUnionMemberNamer(): null;
    protected makeEnumCaseNamer(): null;
    private nameForType;
    private makeOneOf;
    private makeRef;
    private addAttributesToSchema;
    private schemaForType;
    private definitionForObject;
    private definitionForUnion;
    private definitionForEnum;
    protected emitSourceStructure(): void;
}

declare enum Density {
    Normal = "Normal",
    Dense = "Dense"
}
declare enum Visibility {
    Private = "Private",
    Crate = "Crate",
    Public = "Public"
}
declare const rustOptions: {
    density: EnumOption<Density>;
    visibility: EnumOption<Visibility>;
    deriveDebug: BooleanOption;
    deriveClone: BooleanOption;
    derivePartialEq: BooleanOption;
    skipSerializingNone: BooleanOption;
    edition2018: BooleanOption;
    leadingComments: BooleanOption;
};
declare class RustTargetLanguage extends TargetLanguage {
    protected makeRenderer(renderContext: RenderContext, untypedOptionValues: FixMeOptionsType): RustRenderer;
    constructor();
    protected getOptions(): Array<Option<FixMeOptionsAnyType>>;
}
declare class RustRenderer extends ConvenienceRenderer {
    private readonly _options;
    constructor(targetLanguage: TargetLanguage, renderContext: RenderContext, _options: OptionValues<typeof rustOptions>);
    protected makeNamedTypeNamer(): Namer;
    protected namerForObjectProperty(): Namer | null;
    protected makeUnionMemberNamer(): Namer | null;
    protected makeEnumCaseNamer(): Namer | null;
    protected forbiddenNamesForGlobalNamespace(): string[];
    protected forbiddenForObjectProperties(_c: ClassType, _className: Name): ForbiddenWordsInfo;
    protected forbiddenForUnionMembers(_u: UnionType, _unionName: Name): ForbiddenWordsInfo;
    protected forbiddenForEnumCases(_e: EnumType, _enumName: Name): ForbiddenWordsInfo;
    protected get commentLineStart(): string;
    private nullableRustType;
    protected isImplicitCycleBreaker(t: Type): boolean;
    private rustType;
    private breakCycle;
    private emitRenameAttribute;
    private emitSkipSerializeNone;
    private get visibility();
    protected emitStructDefinition(c: ClassType, className: Name): void;
    protected emitBlock(line: Sourcelike, f: () => void): void;
    protected emitUnion(u: UnionType, unionName: Name): void;
    protected emitEnumDefinition(e: EnumType, enumName: Name): void;
    protected emitTopLevelAlias(t: Type, name: Name): void;
    protected emitLeadingComments(): void;
    protected emitSourceStructure(): void;
}

declare enum Strictness {
    Coercible = "Coercible::",
    None = "Types::",
    Strict = "Strict::"
}
declare const rubyOptions: {
    justTypes: BooleanOption;
    strictness: EnumOption<Strictness>;
    namespace: StringOption;
};
declare class RubyTargetLanguage extends TargetLanguage {
    constructor();
    protected getOptions(): Array<Option<FixMeOptionsAnyType>>;
    get supportsOptionalClassProperties(): boolean;
    protected get defaultIndentation(): string;
    protected makeRenderer(renderContext: RenderContext, untypedOptionValues: FixMeOptionsType): RubyRenderer;
}
declare class RubyRenderer extends ConvenienceRenderer {
    private readonly _options;
    constructor(targetLanguage: TargetLanguage, renderContext: RenderContext, _options: OptionValues<typeof rubyOptions>);
    protected get commentLineStart(): string;
    protected get needsTypeDeclarationBeforeUse(): boolean;
    protected canBeForwardDeclared(t: Type): boolean;
    protected forbiddenNamesForGlobalNamespace(): string[];
    protected forbiddenForObjectProperties(_c: ClassType, _classNamed: Name): ForbiddenWordsInfo;
    protected makeNamedTypeNamer(): Namer;
    protected namerForObjectProperty(): Namer;
    protected makeUnionMemberNamer(): Namer;
    protected makeEnumCaseNamer(): Namer;
    private dryType;
    private exampleUse;
    private jsonSample;
    private fromDynamic;
    private toDynamic;
    private marshalsImplicitlyToDynamic;
    private propertyTypeMarshalsImplicitlyFromDynamic;
    private emitBlock;
    private emitModule;
    private emitClass;
    private emitEnum;
    private emitUnion;
    private emitTypesModule;
    protected emitSourceStructure(): void;
}

declare class CrystalTargetLanguage extends TargetLanguage {
    protected makeRenderer(renderContext: RenderContext): CrystalRenderer;
    constructor();
    protected get defaultIndentation(): string;
    protected getOptions(): Array<Option<FixMeOptionsAnyType>>;
}
declare class CrystalRenderer extends ConvenienceRenderer {
    constructor(targetLanguage: TargetLanguage, renderContext: RenderContext);
    protected makeNamedTypeNamer(): Namer;
    protected namerForObjectProperty(): Namer | null;
    protected makeUnionMemberNamer(): Namer | null;
    protected makeEnumCaseNamer(): Namer | null;
    protected forbiddenNamesForGlobalNamespace(): string[];
    protected forbiddenForObjectProperties(_c: ClassType, _className: Name): ForbiddenWordsInfo;
    protected forbiddenForUnionMembers(_u: UnionType, _unionName: Name): ForbiddenWordsInfo;
    protected forbiddenForEnumCases(_e: EnumType, _enumName: Name): ForbiddenWordsInfo;
    protected get commentLineStart(): string;
    private nullableCrystalType;
    protected isImplicitCycleBreaker(t: Type): boolean;
    private crystalType;
    private breakCycle;
    private emitRenameAttribute;
    protected emitStructDefinition(c: ClassType, className: Name): void;
    protected emitBlock(line: Sourcelike, f: () => void): void;
    protected emitEnum(line: Sourcelike, f: () => void): void;
    protected emitUnion(u: UnionType, unionName: Name): void;
    protected emitTopLevelAlias(t: Type, name: Name): void;
    protected emitLeadingComments(): void;
    protected emitSourceStructure(): void;
}

declare const haskellOptions: {
    justTypes: BooleanOption;
    useList: EnumOption<boolean>;
    moduleName: StringOption;
};
declare class HaskellTargetLanguage extends TargetLanguage {
    constructor();
    protected getOptions(): Array<Option<FixMeOptionsAnyType>>;
    get supportsOptionalClassProperties(): boolean;
    get supportsUnionsWithBothNumberTypes(): boolean;
    protected makeRenderer(renderContext: RenderContext, untypedOptionValues: FixMeOptionsType): HaskellRenderer;
}
declare class HaskellRenderer extends ConvenienceRenderer {
    private readonly _options;
    constructor(targetLanguage: TargetLanguage, renderContext: RenderContext, _options: OptionValues<typeof haskellOptions>);
    protected forbiddenNamesForGlobalNamespace(): string[];
    protected makeNamedTypeNamer(): Namer;
    protected namerForObjectProperty(): Namer;
    protected forbiddenForObjectProperties(_c: ClassType, _className: Name): ForbiddenWordsInfo;
    protected makeUnionMemberNamer(): Namer;
    protected get unionMembersInGlobalNamespace(): boolean;
    protected makeEnumCaseNamer(): Namer;
    protected get enumCasesInGlobalNamespace(): boolean;
    protected proposeUnionMemberName(u: UnionType, unionName: Name, fieldType: Type, lookup: (n: Name) => string): string;
    protected get commentLineStart(): string;
    protected emitDescriptionBlock(lines: Sourcelike[]): void;
    private haskellType;
    private haskellProperty;
    private encoderNameForType;
    private emitTopLevelDefinition;
    private emitClassDefinition;
    private emitEnumDefinition;
    private emitUnionDefinition;
    private emitTopLevelFunctions;
    private classPropertyLength;
    private emitClassEncoderInstance;
    private emitClassDecoderInstance;
    private emitClassFunctions;
    private emitEnumEncoderInstance;
    private emitEnumDecoderInstance;
    private emitEnumFunctions;
    private emitUnionEncoderInstance;
    private emitUnionDecoderInstance;
    private emitUnionFunctions;
    private emitLanguageExtensions;
    protected emitSourceStructure(): void;
}

declare const dartOptions: {
    nullSafety: BooleanOption;
    justTypes: BooleanOption;
    codersInClass: BooleanOption;
    methodNamesWithMap: BooleanOption;
    requiredProperties: BooleanOption;
    finalProperties: BooleanOption;
    generateCopyWith: BooleanOption;
    useFreezed: BooleanOption;
    useHive: BooleanOption;
    useJsonAnnotation: BooleanOption;
    partName: StringOption;
};
declare class DartTargetLanguage extends TargetLanguage {
    constructor();
    protected getOptions(): Array<Option<FixMeOptionsAnyType>>;
    get supportsUnionsWithBothNumberTypes(): boolean;
    get stringTypeMapping(): StringTypeMapping;
    protected makeRenderer(renderContext: RenderContext, untypedOptionValues: FixMeOptionsType): DartRenderer;
}
declare class DartRenderer extends ConvenienceRenderer {
    private readonly _options;
    private readonly _gettersAndSettersForPropertyName;
    private _needEnumValues;
    private classCounter;
    private classPropertyCounter;
    private readonly _topLevelDependents;
    private readonly _enumValues;
    constructor(targetLanguage: TargetLanguage, renderContext: RenderContext, _options: OptionValues<typeof dartOptions>);
    protected forbiddenNamesForGlobalNamespace(): string[];
    protected forbiddenForObjectProperties(_c: ClassType, _className: Name): ForbiddenWordsInfo;
    protected makeNamedTypeNamer(): Namer;
    protected namerForObjectProperty(): Namer;
    protected makeUnionMemberNamer(): Namer;
    protected makeEnumCaseNamer(): Namer;
    protected unionNeedsName(u: UnionType): boolean;
    protected namedTypeToNameForTopLevel(type: Type): Type | undefined;
    protected get toJson(): string;
    protected get fromJson(): string;
    protected makeTopLevelDependencyNames(_t: Type, name: Name): DependencyName[];
    protected makeNamesForPropertyGetterAndSetter(_c: ClassType, _className: Name, _p: ClassProperty, _jsonName: string, name: Name): [Name, Name];
    protected makePropertyDependencyNames(c: ClassType, className: Name, p: ClassProperty, jsonName: string, name: Name): Name[];
    protected makeNamedTypeDependencyNames(t: Type, name: Name): DependencyName[];
    protected emitFileHeader(): void;
    protected emitDescriptionBlock(lines: Sourcelike[]): void;
    protected emitBlock(line: Sourcelike, f: () => void): void;
    protected dartType(t: Type, withIssues?: boolean, forceNullable?: boolean): Sourcelike;
    protected mapList(isNullable: boolean, itemType: Sourcelike, list: Sourcelike, mapper: Sourcelike): Sourcelike;
    protected mapMap(isNullable: boolean, valueType: Sourcelike, map: Sourcelike, valueMapper: Sourcelike): Sourcelike;
    protected mapClass(isNullable: boolean, classType: ClassType, dynamic: Sourcelike): Sourcelike;
    protected fromDynamicExpression(isNullable: boolean, t: Type, ...dynamic: Sourcelike[]): Sourcelike;
    protected toDynamicExpression(isNullable: boolean, t: Type, ...dynamic: Sourcelike[]): Sourcelike;
    private _emitEmptyConstructor;
    private _emitConstructor;
    private _emitVariables;
    private _emitCopyConstructor;
    private _emitStringJsonEncoderDecoder;
    private _emitMapEncoderDecoder;
    protected emitClassDefinition(c: ClassType, className: Name): void;
    protected emitFreezedClassDefinition(c: ClassType, className: Name): void;
    protected emitEnumDefinition(e: EnumType, enumName: Name): void;
    protected emitEnumValues(): void;
    private _emitTopLvlEncoderDecoder;
    protected emitSourceStructure(): void;
}

declare const elixirOptions: {
    justTypes: BooleanOption;
    namespace: StringOption;
};
declare class ElixirTargetLanguage extends TargetLanguage {
    constructor();
    protected getOptions(): Array<Option<FixMeOptionsAnyType>>;
    get supportsOptionalClassProperties(): boolean;
    protected get defaultIndentation(): string;
    protected makeRenderer(renderContext: RenderContext, untypedOptionValues: FixMeOptionsType): ElixirRenderer;
}
declare class ElixirRenderer extends ConvenienceRenderer {
    private readonly _options;
    constructor(targetLanguage: TargetLanguage, renderContext: RenderContext, _options: OptionValues<typeof elixirOptions>);
    protected get commentLineStart(): string;
    protected get needsTypeDeclarationBeforeUse(): boolean;
    protected canBeForwardDeclared(t: Type): boolean;
    protected forbiddenNamesForGlobalNamespace(): string[];
    protected forbiddenForObjectProperties(_c: ClassType, _classNamed: Name): ForbiddenWordsInfo;
    protected makeNamedTypeNamer(): Namer;
    protected namerForObjectProperty(): Namer;
    protected makeUnionMemberNamer(): Namer;
    protected makeEnumCaseNamer(): Namer;
    private nameForNamedTypeWithNamespace;
    private nameWithNamespace;
    private elixirType;
    private patternMatchClauseDecode;
    private patternMatchClauseEncode;
    private sortAndFilterPatternMatchTypes;
    private emitPatternMatches;
    private nameOfTransformFunction;
    private fromDynamic;
    private toDynamic;
    private emitBlock;
    protected emitDescriptionBlock(lines: Sourcelike[]): void;
    private emitModule;
    private isValidAtom;
    private emitEnum;
    private emitUnion;
    protected emitSourceStructure(): void;
}

export { type Annotation, ArrayType, CJSONRenderer, CJSONTargetLanguage, CPlusPlusRenderer, CPlusPlusTargetLanguage, CSharpRenderer, CSharpTargetLanguage, ClassProperty, ClassType, CompressedJSON, ConvenienceRenderer, CrystalRenderer, CrystalTargetLanguage, DartRenderer, DartTargetLanguage, ElixirRenderer, ElixirTargetLanguage, ElmRenderer, ElmTargetLanguage, EnumType, FetchingJSONSchemaStore, FlowRenderer, FlowTargetLanguage, GoRenderer, GoTargetLanguage, HaskellRenderer, HaskellTargetLanguage, type InferenceFlagName, type InferenceFlags, type Input, InputData, IssueAnnotationData, JSONInput, type JSONSchema, type JSONSchemaAttributes, JSONSchemaInput, JSONSchemaRenderer, type JSONSchemaSourceData, JSONSchemaStore, JSONSchemaTargetLanguage, type JSONSchemaType, type JSONSourceData, JavaRenderer, JavaScriptPropTypesRenderer, JavaScriptPropTypesTargetLanguage, JavaScriptRenderer, JavaScriptTargetLanguage, JavaTargetLanguage, KotlinRenderer, KotlinTargetLanguage, MapType, type MultiFileRenderResult, type MultiWord, Name, Namer, ObjectType, ObjectiveCRenderer, ObjectiveCTargetLanguage, Option, type OptionDefinition, type OptionValues, type Options$1 as Options, type PrimitiveStringTypeKind, PrimitiveType, PythonRenderer, PythonTargetLanguage, QuickTypeError, Ref, type RenderContext, type RendererOptions, RubyRenderer, RubyTargetLanguage, type RunContext, RustRenderer, RustTargetLanguage, Scala3Renderer, Scala3TargetLanguage, type SerializedRenderResult, Smithy4sRenderer, SmithyOptions, SmithyTargetLanguage, type Sourcelike, type StringTypeMapping, StringTypes, SwiftRenderer, SwiftTargetLanguage, TargetLanguage, type TransformedStringTypeKind, Type, TypeAttributeKind, type TypeAttributes, TypeBuilder, type TypeKind, TypeNames, type TypeRef, TypeScriptRenderer, TypeScriptTargetLanguage, UnionType, type Value, allUpperWordStyle, assert, assertNever, cJSONOptions, cPlusPlusOptions, cSharpOptions, capitalize, checkArray, checkStringMap, combineRenderResults, combineWords, dartOptions, defaultInferenceFlags, all as defaultTargetLanguages, defined, derefTypeRef, elixirOptions, elmOptions, emptyTypeAttributes, firstUpperWordStyle, funPrefixNamer, getOptionValues, getStream, getTargetLanguage, goOptions, haskellOptions, inferenceFlagNames, inferenceFlags, inferenceFlagsObject, inflateBase64, isLetterOrDigit, javaOptions, javaScriptOptions, javaScriptPropTypesOptions, jsonInputForTargetLanguage, kotlinOptions, languageNamed, legalizeCharacters, makeNamesTypeAttributes, matchType, messageAssert, messageError, modifySource, namesTypeAttributeKind, nullableFromUnion, objcOptions, panic, parenIfNeeded, parseJSON, pythonOptions, quicktype, quicktypeMultiFile, quicktypeMultiFileSync, readFromFileOrURL, readableFromFileOrURL, removeNullFromUnion, rubyOptions, rustOptions, scala3Options, singleWord, sourcesFromPostmanCollection, splitIntoWords, swiftOptions, train as trainMarkovChain, tsFlowOptions, uriTypeAttributeKind };
