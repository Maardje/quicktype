import { type Type } from "./Type";
import { type TypeGraph } from "./TypeGraph";
export type DeclarationKind = "forward" | "define";
export interface Declaration {
    readonly kind: DeclarationKind;
    readonly type: Type;
}
export declare class DeclarationIR {
    readonly forwardedTypes: Set<Type>;
    readonly declarations: readonly Declaration[];
    constructor(declarations: Iterable<Declaration>, forwardedTypes: Set<Type>);
}
export declare function cycleBreakerTypesForGraph(graph: TypeGraph, isImplicitCycleBreaker: (t: Type) => boolean, canBreakCycles: (t: Type) => boolean): Set<Type>;
export declare function declarationsForGraph(typeGraph: TypeGraph, canBeForwardDeclared: ((t: Type) => boolean) | undefined, childrenOfType: (t: Type) => ReadonlySet<Type>, needsDeclaration: (t: Type) => boolean): DeclarationIR;
