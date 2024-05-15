import { iterableEnumerate, iterableSome, mapFilter, mapFilterMap, mapSome, mapSortBy, setFilter, setUnion } from "collection-utils";
import _wordwrap from "wordwrap";
import { enumCaseNames, getAccessorName, objectPropertyNames, unionMemberName } from "./attributes/AccessorNames";
import { descriptionTypeAttributeKind, propertyDescriptionsTypeAttributeKind } from "./attributes/Description";
import { TypeAttributeKind } from "./attributes/TypeAttributes";
import { cycleBreakerTypesForGraph, declarationsForGraph } from "./DeclarationIR";
import { DependencyName, FixedName, Namespace, SimpleName, keywordNamespace } from "./Naming";
import { Renderer } from "./Renderer";
import { serializeRenderResult, sourcelikeToSource } from "./Source";
import { isStringComment } from "./support/Comments";
import { trimEnd } from "./support/Strings";
import { assert, defined, nonNull, panic } from "./support/Support";
import { followTargetType, transformationForType } from "./Transformers";
import { ClassType, EnumType, MapType, ObjectType, UnionType } from "./Type";
import { TypeAttributeStoreView } from "./TypeGraph";
import { isNamedType, matchTypeExhaustive, nullableFromUnion, separateNamedTypes } from "./TypeUtils";
const wordWrap = _wordwrap(90);
export const topLevelNameOrder = 1;
const givenNameOrder = 10;
export const inferredNameOrder = 30;
const classPropertyNameOrder = 20;
const assignedClassPropertyNameOrder = 10;
const enumCaseNameOrder = 20;
const assignedEnumCaseNameOrder = 10;
const unionMemberNameOrder = 40;
function splitDescription(descriptions) {
    if (descriptions === undefined)
        return undefined;
    const description = Array.from(descriptions).join("\n\n").trim();
    if (description === "")
        return undefined;
    return wordWrap(description)
        .split("\n")
        .map(l => l.trim());
}
const assignedNameAttributeKind = new TypeAttributeKind("assignedName");
const assignedPropertyNamesAttributeKind = new TypeAttributeKind("assignedPropertyNames");
const assignedMemberNamesAttributeKind = new TypeAttributeKind("assignedMemberNames");
const assignedCaseNamesAttributeKind = new TypeAttributeKind("assignedCaseNames");
export class ConvenienceRenderer extends Renderer {
    constructor(targetLanguage, renderContext) {
        super(targetLanguage, renderContext);
        this._alphabetizeProperties = false;
    }
    get topLevels() {
        return this.typeGraph.topLevels;
    }
    /**
     * Return an array of strings which are not allowed as names in the global
     * namespace.  Since names of generated types are in the global namespace,
     * this will include anything built into the language or default libraries
     * that can conflict with that, such as reserved keywords or common type
     * names.
     */
    forbiddenNamesForGlobalNamespace() {
        return [];
    }
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
    forbiddenForObjectProperties(_o, _className) {
        return { names: [], includeGlobalForbidden: false };
    }
    forbiddenForUnionMembers(_u, _unionName) {
        return { names: [], includeGlobalForbidden: false };
    }
    forbiddenForEnumCases(_e, _enumName) {
        return { names: [], includeGlobalForbidden: false };
    }
    makeTopLevelDependencyNames(_t, _topLevelName) {
        return [];
    }
    makeNamedTypeDependencyNames(_t, _name) {
        return [];
    }
    makeNameForTransformation(_xf, _typeName) {
        return undefined;
    }
    namedTypeToNameForTopLevel(type) {
        if (isNamedType(type)) {
            return type;
        }
        return undefined;
    }
    get unionMembersInGlobalNamespace() {
        return false;
    }
    get enumCasesInGlobalNamespace() {
        return false;
    }
    get needsTypeDeclarationBeforeUse() {
        return false;
    }
    canBeForwardDeclared(_t) {
        return panic("If needsTypeDeclarationBeforeUse returns true, canBeForwardDeclared must be implemented");
    }
    unionNeedsName(u) {
        return nullableFromUnion(u) === null;
    }
    get globalNamespace() {
        return defined(this._globalNamespace);
    }
    get nameStoreView() {
        return defined(this._nameStoreView);
    }
    descriptionForType(t) {
        let description = this.typeGraph.attributeStore.tryGet(descriptionTypeAttributeKind, t);
        return splitDescription(description);
    }
    descriptionForClassProperty(o, name) {
        const descriptions = this.typeGraph.attributeStore.tryGet(propertyDescriptionsTypeAttributeKind, o);
        if (descriptions === undefined)
            return undefined;
        return splitDescription(descriptions.get(name));
    }
    setUpNaming() {
        this._nameStoreView = new TypeAttributeStoreView(this.typeGraph.attributeStore, assignedNameAttributeKind);
        this._propertyNamesStoreView = new TypeAttributeStoreView(this.typeGraph.attributeStore, assignedPropertyNamesAttributeKind);
        this._memberNamesStoreView = new TypeAttributeStoreView(this.typeGraph.attributeStore, assignedMemberNamesAttributeKind);
        this._caseNamesStoreView = new TypeAttributeStoreView(this.typeGraph.attributeStore, assignedCaseNamesAttributeKind);
        this._namesForTransformations = new Map();
        this._namedTypeNamer = this.makeNamedTypeNamer();
        this._unionMemberNamer = this.makeUnionMemberNamer();
        this._enumCaseNamer = this.makeEnumCaseNamer();
        this._globalForbiddenNamespace = keywordNamespace("forbidden", this.forbiddenNamesForGlobalNamespace());
        this._otherForbiddenNamespaces = new Map();
        this._globalNamespace = new Namespace("global", undefined, [this._globalForbiddenNamespace], []);
        const { objects, enums, unions } = this.typeGraph.allNamedTypesSeparated();
        const namedUnions = setFilter(unions, u => this.unionNeedsName(u));
        for (const [name, t] of this.topLevels) {
            this.nameStoreView.setForTopLevel(name, this.addNameForTopLevel(t, name));
        }
        for (const o of objects) {
            const name = this.addNameForNamedType(o);
            this.addPropertyNames(o, name);
        }
        for (const e of enums) {
            const name = this.addNameForNamedType(e);
            this.addEnumCaseNames(e, name);
        }
        for (const u of namedUnions) {
            const name = this.addNameForNamedType(u);
            this.addUnionMemberNames(u, name);
        }
        for (const t of this.typeGraph.allTypesUnordered()) {
            this.addNameForTransformation(t);
        }
        return setUnion([this._globalForbiddenNamespace, this._globalNamespace], this._otherForbiddenNamespaces.values());
    }
    addDependenciesForNamedType(type, named) {
        const dependencyNames = this.makeNamedTypeDependencyNames(type, named);
        for (const dn of dependencyNames) {
            this.globalNamespace.add(dn);
        }
    }
    makeNameForTopLevel(_t, givenName, _maybeNamedType) {
        return new SimpleName([givenName], defined(this._namedTypeNamer), topLevelNameOrder);
    }
    addNameForTopLevel(type, givenName) {
        const maybeNamedType = this.namedTypeToNameForTopLevel(type);
        const name = this.makeNameForTopLevel(type, givenName, maybeNamedType);
        this.globalNamespace.add(name);
        const dependencyNames = this.makeTopLevelDependencyNames(type, name);
        for (const dn of dependencyNames) {
            this.globalNamespace.add(dn);
        }
        if (maybeNamedType !== undefined) {
            this.addDependenciesForNamedType(maybeNamedType, name);
            this.nameStoreView.set(maybeNamedType, name);
        }
        return name;
    }
    makeNameForType(t, namer, givenOrder, inferredOrder) {
        const names = t.getNames();
        const order = names.areInferred ? inferredOrder : givenOrder;
        return new SimpleName(names.proposedNames, namer, order);
    }
    makeNameForNamedType(t) {
        return this.makeNameForType(t, defined(this._namedTypeNamer), givenNameOrder, inferredNameOrder);
    }
    addNameForNamedType(type) {
        const existing = this.nameStoreView.tryGet(type);
        if (existing !== undefined)
            return existing;
        const name = this.globalNamespace.add(this.makeNameForNamedType(type));
        this.addDependenciesForNamedType(type, name);
        this.nameStoreView.set(type, name);
        return name;
    }
    get typesWithNamedTransformations() {
        return defined(this._namesForTransformations);
    }
    nameForTransformation(t) {
        const xf = transformationForType(t);
        if (xf === undefined)
            return undefined;
        const name = defined(this._namesForTransformations).get(t);
        if (name === undefined) {
            return panic("No name for transformation");
        }
        return name;
    }
    addNameForTransformation(t) {
        const xf = transformationForType(t);
        if (xf === undefined)
            return;
        assert(defined(this._namesForTransformations).get(t) === undefined, "Tried to give two names to the same transformation");
        const name = this.makeNameForTransformation(xf, this.nameStoreView.tryGet(xf.targetType));
        if (name === undefined)
            return;
        this.globalNamespace.add(name);
        defined(this._namesForTransformations).set(t, name);
    }
    processForbiddenWordsInfo(info, namespaceName) {
        const forbiddenNames = [];
        const forbiddenStrings = [];
        for (const nameOrString of info.names) {
            if (typeof nameOrString === "string") {
                forbiddenStrings.push(nameOrString);
            }
            else {
                forbiddenNames.push(nameOrString);
            }
        }
        let namespace = defined(this._otherForbiddenNamespaces).get(namespaceName);
        if (forbiddenStrings.length > 0 && namespace === undefined) {
            namespace = keywordNamespace(namespaceName, forbiddenStrings);
            this._otherForbiddenNamespaces = defined(this._otherForbiddenNamespaces).set(namespaceName, namespace);
        }
        let forbiddenNamespaces = new Set();
        if (info.includeGlobalForbidden) {
            forbiddenNamespaces = forbiddenNamespaces.add(defined(this._globalForbiddenNamespace));
        }
        if (namespace !== undefined) {
            forbiddenNamespaces = forbiddenNamespaces.add(namespace);
        }
        return { forbiddenNames: new Set(forbiddenNames), forbiddenNamespaces };
    }
    makeNameForProperty(o, _className, p, jsonName, assignedName) {
        const namer = this.namerForObjectProperty(o, p);
        if (namer === null)
            return undefined;
        // FIXME: This alternative should really depend on what the
        // actual name of the class ends up being.  We can do this
        // with a DependencyName.
        // Also, we currently don't have any languages where properties
        // are global, so collisions here could only occur where two
        // properties of the same class have the same name, in which case
        // the alternative would also be the same, i.e. useless.  But
        // maybe we'll need global properties for some weird language at
        // some point.
        const alternative = `${o.getCombinedName()}_${jsonName}`;
        const order = assignedName === undefined ? classPropertyNameOrder : assignedClassPropertyNameOrder;
        const names = assignedName === undefined ? [jsonName, alternative] : [assignedName];
        return new SimpleName(names, namer, order);
    }
    makePropertyDependencyNames(_o, _className, _p, _jsonName, _name) {
        return [];
    }
    addPropertyNames(o, className) {
        const { forbiddenNames, forbiddenNamespaces } = this.processForbiddenWordsInfo(this.forbiddenForObjectProperties(o, className), "forbidden-for-properties");
        let ns;
        const accessorNames = objectPropertyNames(o, this.targetLanguage.name);
        const names = mapFilterMap(o.getSortedProperties(), (p, jsonName) => {
            const [assignedName, isFixed] = getAccessorName(accessorNames, jsonName);
            let name;
            if (isFixed) {
                name = new FixedName(defined(assignedName));
            }
            else {
                name = this.makeNameForProperty(o, className, p, jsonName, assignedName);
            }
            if (name === undefined)
                return undefined;
            if (ns === undefined) {
                ns = new Namespace(o.getCombinedName(), this.globalNamespace, forbiddenNamespaces, forbiddenNames);
            }
            ns.add(name);
            for (const depName of this.makePropertyDependencyNames(o, className, p, jsonName, name)) {
                ns.add(depName);
            }
            return name;
        });
        defined(this._propertyNamesStoreView).set(o, names);
    }
    makeNameForUnionMember(u, unionName, t) {
        const [assignedName, isFixed] = unionMemberName(u, t, this.targetLanguage.name);
        if (isFixed) {
            return new FixedName(defined(assignedName));
        }
        return new DependencyName(nonNull(this._unionMemberNamer), unionMemberNameOrder, lookup => {
            if (assignedName !== undefined)
                return assignedName;
            return this.proposeUnionMemberName(u, unionName, t, lookup);
        });
    }
    addUnionMemberNames(u, unionName) {
        const memberNamer = this._unionMemberNamer;
        if (memberNamer === null)
            return;
        const { forbiddenNames, forbiddenNamespaces } = this.processForbiddenWordsInfo(this.forbiddenForUnionMembers(u, unionName), "forbidden-for-union-members");
        let ns;
        if (this.unionMembersInGlobalNamespace) {
            ns = this.globalNamespace;
        }
        else {
            ns = new Namespace(u.getCombinedName(), this.globalNamespace, forbiddenNamespaces, forbiddenNames);
        }
        let names = new Map();
        for (const t of u.members) {
            const name = this.makeNameForUnionMember(u, unionName, followTargetType(t));
            names.set(t, ns.add(name));
        }
        defined(this._memberNamesStoreView).set(u, names);
    }
    makeNameForEnumCase(e, _enumName, caseName, assignedName) {
        // FIXME: See the FIXME in `makeNameForProperty`.  We do have global
        // enum cases, though (in Go), so this is actually useful already.
        const alternative = `${e.getCombinedName()}_${caseName}`;
        const order = assignedName === undefined ? enumCaseNameOrder : assignedEnumCaseNameOrder;
        const names = assignedName === undefined ? [caseName, alternative] : [assignedName];
        return new SimpleName(names, nonNull(this._enumCaseNamer), order);
    }
    // FIXME: this is very similar to addPropertyNameds and addUnionMemberNames
    addEnumCaseNames(e, enumName) {
        if (this._enumCaseNamer === null)
            return;
        const { forbiddenNames, forbiddenNamespaces } = this.processForbiddenWordsInfo(this.forbiddenForEnumCases(e, enumName), "forbidden-for-enum-cases");
        let ns;
        if (this.enumCasesInGlobalNamespace) {
            ns = this.globalNamespace;
        }
        else {
            ns = new Namespace(e.getCombinedName(), this.globalNamespace, forbiddenNamespaces, forbiddenNames);
        }
        let names = new Map();
        const accessorNames = enumCaseNames(e, this.targetLanguage.name);
        for (const caseName of e.cases) {
            const [assignedName, isFixed] = getAccessorName(accessorNames, caseName);
            let name;
            if (isFixed) {
                name = new FixedName(defined(assignedName));
            }
            else {
                name = this.makeNameForEnumCase(e, enumName, caseName, assignedName);
            }
            names.set(caseName, ns.add(name));
        }
        defined(this._caseNamesStoreView).set(e, names);
    }
    childrenOfType(t) {
        const names = this.names;
        if (t instanceof ClassType) {
            const propertyNameds = defined(this._propertyNamesStoreView).get(t);
            const filteredMap = mapFilterMap(t.getProperties(), (p, n) => {
                if (propertyNameds.get(n) === undefined)
                    return undefined;
                return p.type;
            });
            const sortedMap = mapSortBy(filteredMap, (_, n) => defined(names.get(defined(propertyNameds.get(n)))));
            return new Set(sortedMap.values());
        }
        return t.getChildren();
    }
    get namedUnions() {
        return defined(this._namedUnions);
    }
    get haveNamedUnions() {
        return this.namedUnions.size > 0;
    }
    get haveNamedTypes() {
        return defined(this._namedTypes).length > 0;
    }
    get haveUnions() {
        return defined(this._haveUnions);
    }
    get haveMaps() {
        return defined(this._haveMaps);
    }
    get haveOptionalProperties() {
        return defined(this._haveOptionalProperties);
    }
    // FIXME: Inconsistently named, though technically correct.  Right now all enums are named,
    // but this should really be called `namedEnums`.
    get enums() {
        return defined(this._namedEnums);
    }
    get haveEnums() {
        return this.enums.size > 0;
    }
    proposedUnionMemberNameForTypeKind(_kind) {
        return null;
    }
    proposeUnionMemberName(_u, _unionName, fieldType, lookup) {
        const simpleName = this.proposedUnionMemberNameForTypeKind(fieldType.kind);
        if (simpleName !== null) {
            return simpleName;
        }
        const typeNameForUnionMember = (t) => matchTypeExhaustive(t, _noneType => {
            return panic("none type should have been replaced");
        }, _anyType => "anything", _nullType => "null", _boolType => "bool", _integerType => "integer", _doubleType => "double", _stringType => "string", arrayType => typeNameForUnionMember(arrayType.items) + "_array", classType => lookup(this.nameForNamedType(classType)), mapType => typeNameForUnionMember(mapType.values) + "_map", objectType => {
            assert(this.targetLanguage.supportsFullObjectType, "Object type should have been replaced in `replaceObjectType`");
            return lookup(this.nameForNamedType(objectType));
        }, _enumType => "enum", _unionType => "union", transformedType => transformedType.kind.replace("-", "_"));
        return typeNameForUnionMember(fieldType);
    }
    nameForNamedType(t) {
        return this.nameStoreView.get(t);
    }
    isForwardDeclaredType(t) {
        return defined(this._declarationIR).forwardedTypes.has(t);
    }
    isImplicitCycleBreaker(_t) {
        return panic("A renderer that invokes isCycleBreakerType must implement isImplicitCycleBreaker");
    }
    canBreakCycles(_t) {
        return true;
    }
    isCycleBreakerType(t) {
        if (this._cycleBreakerTypes === undefined) {
            this._cycleBreakerTypes = cycleBreakerTypesForGraph(this.typeGraph, s => this.isImplicitCycleBreaker(s), s => this.canBreakCycles(s));
        }
        return this._cycleBreakerTypes.has(t);
    }
    forEachTopLevel(blankLocations, f, predicate) {
        let topLevels;
        if (predicate !== undefined) {
            topLevels = mapFilter(this.topLevels, predicate);
        }
        else {
            topLevels = this.topLevels;
        }
        return this.forEachWithBlankLines(topLevels, blankLocations, (t, name, pos) => f(t, this.nameStoreView.getForTopLevel(name), pos));
    }
    forEachDeclaration(blankLocations, f) {
        this.forEachWithBlankLines(iterableEnumerate(defined(this._declarationIR).declarations), blankLocations, (decl, _, pos) => f(decl, pos));
    }
    setAlphabetizeProperties(value) {
        this._alphabetizeProperties = value;
    }
    getAlphabetizeProperties() {
        return this._alphabetizeProperties;
    }
    // Returns the number of properties defined for the specified object type.
    propertyCount(o) {
        const propertyNames = defined(this._propertyNamesStoreView).get(o);
        return propertyNames.size;
    }
    sortClassProperties(properties, propertyNames) {
        if (this._alphabetizeProperties) {
            return mapSortBy(properties, (_p, jsonName) => {
                const name = defined(propertyNames.get(jsonName));
                return defined(this.names.get(name));
            });
        }
        else {
            return properties;
        }
    }
    forEachClassProperty(o, blankLocations, f) {
        const propertyNames = defined(this._propertyNamesStoreView).get(o);
        const sortedProperties = this.sortClassProperties(o.getProperties(), propertyNames);
        this.forEachWithBlankLines(sortedProperties, blankLocations, (p, jsonName, pos) => {
            const name = defined(propertyNames.get(jsonName));
            f(name, jsonName, p, pos);
        });
    }
    nameForUnionMember(u, t) {
        return defined(defined(this._memberNamesStoreView).get(u).get(t));
    }
    nameForEnumCase(e, caseName) {
        const caseNames = defined(this._caseNamesStoreView).get(e);
        return defined(caseNames.get(caseName));
    }
    forEachUnionMember(u, members, blankLocations, sortOrder, f) {
        const iterateMembers = members !== null && members !== void 0 ? members : u.members;
        if (sortOrder === null) {
            sortOrder = (n) => defined(this.names.get(n));
        }
        const memberNames = mapFilter(defined(this._memberNamesStoreView).get(u), (_, t) => iterateMembers.has(t));
        const sortedMemberNames = mapSortBy(memberNames, sortOrder);
        this.forEachWithBlankLines(sortedMemberNames, blankLocations, f);
    }
    forEachEnumCase(e, blankLocations, f) {
        const caseNames = defined(this._caseNamesStoreView).get(e);
        const sortedCaseNames = mapSortBy(caseNames, n => defined(this.names.get(n)));
        this.forEachWithBlankLines(sortedCaseNames, blankLocations, f);
    }
    forEachTransformation(blankLocations, f) {
        this.forEachWithBlankLines(defined(this._namesForTransformations), blankLocations, f);
    }
    forEachSpecificNamedType(blankLocations, types, f) {
        this.forEachWithBlankLines(types, blankLocations, (t, _, pos) => f(t, this.nameForNamedType(t), pos));
    }
    forEachObject(blankLocations, f) {
        // FIXME: This is ugly.
        this.forEachSpecificNamedType(blankLocations, defined(this._namedObjects).entries(), f);
    }
    forEachEnum(blankLocations, f) {
        this.forEachSpecificNamedType(blankLocations, this.enums.entries(), f);
    }
    forEachUnion(blankLocations, f) {
        this.forEachSpecificNamedType(blankLocations, this.namedUnions.entries(), f);
    }
    forEachUniqueUnion(blankLocations, uniqueValue, f) {
        const firstUnionByValue = new Map();
        for (const u of this.namedUnions) {
            const v = uniqueValue(u);
            if (!firstUnionByValue.has(v)) {
                firstUnionByValue.set(v, u);
            }
        }
        this.forEachWithBlankLines(firstUnionByValue, blankLocations, f);
    }
    forEachNamedType(blankLocations, objectFunc, enumFunc, unionFunc) {
        this.forEachWithBlankLines(defined(this._namedTypes).entries(), blankLocations, (t, _, pos) => {
            const name = this.nameForNamedType(t);
            if (t instanceof ObjectType) {
                // FIXME: This is ugly.  We can't runtime check that the function
                // takes full object types if we have them.
                objectFunc(t, name, pos);
            }
            else if (t instanceof EnumType) {
                enumFunc(t, name, pos);
            }
            else if (t instanceof UnionType) {
                unionFunc(t, name, pos);
            }
            else {
                return panic("Named type that's neither a class nor union");
            }
        });
    }
    // You should never have to use this to produce parts of your generated
    // code.  If you need to modify a Name, for example to change its casing,
    // use `modifySource`.
    sourcelikeToString(src) {
        return serializeRenderResult(sourcelikeToSource(src), this.names, "").lines.join("\n");
    }
    get commentLineStart() {
        return "// ";
    }
    emitComments(comments) {
        comments.forEach(comment => {
            if (isStringComment(comment)) {
                this.emitCommentLines([comment]);
            }
            else if ("lines" in comment) {
                this.emitCommentLines(comment.lines);
            }
            else if ("descriptionBlock" in comment) {
                this.emitDescriptionBlock(comment.descriptionBlock);
            }
            else {
                this.emitCommentLines(comment.customLines, comment);
            }
            this.ensureBlankLine();
        });
    }
    emitCommentLines(lines, { lineStart = this.commentLineStart, firstLineStart = lineStart, lineEnd, beforeComment, afterComment } = {}) {
        if (beforeComment !== undefined) {
            this.emitLine(beforeComment);
        }
        let first = true;
        for (const line of lines) {
            let start = first ? firstLineStart : lineStart;
            first = false;
            if (this.sourcelikeToString(line) === "") {
                start = trimEnd(start);
            }
            if (lineEnd) {
                this.emitLine(start, line, lineEnd);
            }
            else {
                this.emitLine(start, line);
            }
        }
        if (afterComment !== undefined) {
            this.emitLine(afterComment);
        }
    }
    emitDescription(description) {
        if (description === undefined)
            return;
        // FIXME: word-wrap
        this.emitDescriptionBlock(description);
    }
    emitDescriptionBlock(lines) {
        this.emitCommentLines(lines);
    }
    emitPropertyTable(c, makePropertyRow) {
        let table = [];
        const emitTable = () => {
            if (table.length === 0)
                return;
            this.emitTable(table);
            table = [];
        };
        this.forEachClassProperty(c, "none", (name, jsonName, p) => {
            const description = this.descriptionForClassProperty(c, jsonName);
            if (description !== undefined) {
                emitTable();
                this.emitDescription(description);
            }
            table.push(makePropertyRow(name, jsonName, p));
        });
        emitTable();
    }
    processGraph() {
        this._declarationIR = declarationsForGraph(this.typeGraph, this.needsTypeDeclarationBeforeUse ? (t) => this.canBeForwardDeclared(t) : undefined, t => this.childrenOfType(t), t => {
            if (t instanceof UnionType) {
                return this.unionNeedsName(t);
            }
            return isNamedType(t);
        });
        const types = this.typeGraph.allTypesUnordered();
        this._haveUnions = iterableSome(types, t => t instanceof UnionType);
        this._haveMaps = iterableSome(types, t => t instanceof MapType);
        const classTypes = setFilter(types, t => t instanceof ClassType);
        this._haveOptionalProperties = iterableSome(classTypes, c => mapSome(c.getProperties(), p => p.isOptional));
        this._namedTypes = this._declarationIR.declarations.filter(d => d.kind === "define").map(d => d.type);
        const { objects, enums, unions } = separateNamedTypes(this._namedTypes);
        this._namedObjects = new Set(objects);
        this._namedEnums = new Set(enums);
        this._namedUnions = new Set(unions);
    }
    emitSource(givenOutputFilename) {
        this.processGraph();
        this.emitSourceStructure(givenOutputFilename);
    }
    forEachType(process) {
        const visitedTypes = new Set();
        const processed = new Set();
        const queue = Array.from(this.typeGraph.topLevels.values());
        function visit(t) {
            if (visitedTypes.has(t))
                return;
            for (const c of t.getChildren()) {
                queue.push(c);
            }
            visitedTypes.add(t);
            processed.add(process(t));
        }
        for (;;) {
            const maybeType = queue.pop();
            if (maybeType === undefined) {
                break;
            }
            visit(maybeType);
        }
        return processed;
    }
}
