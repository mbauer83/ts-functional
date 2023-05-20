import { EqualityComparable } from '@mbauer83/ts-utils/src/comparison/equality';
import { List } from "./List";
import { Monad } from "./Monad";
import { None, Optional, Some } from "./Optional";
import { Predicate } from "./Predicate";

export class Tree<T> implements Monad<T>, EqualityComparable<Tree<T>> {

    private readonly size: number;
    
    public getSize(): number { return this.size; }

    constructor(public readonly value: T, public readonly children: Tree<T>[] = []) {
        this.size = this.children.reduce((acc, child) => acc + child.getSize(), 1);
     }

    equals(other: Tree<T>): boolean {
        return this.value === other.value && this.children === (other.children);
    }
    
    protected newInstance: <U, V extends Tree<U>>(value: U, children: V[]) => V = Object.getPrototypeOf(this).constructor;

    visitPreorder(
        f: (x: T, depth: number, parent: Optional<Tree<T>>, childIdx: Optional<number>) => void, 
        depth: number = 0, 
        parent: Optional<Tree<T>> = new None(), 
        childIdx: Optional<number> = new None()
    ): void {
        f(this.value, depth, parent, childIdx);
        this.children.forEach((child, idx) => child.visitPreorder(f, depth + 1, new Some(this), new Some(idx)));
    }

    visitPostorder(
        f: (x: T, depth: number, parent: Optional<Tree<T>>, chlidIdx: Optional<number>) => void,
        depth: number = 0,
        parent: Optional<Tree<T>> = new None(), 
        childIdx: Optional<number> = new None()
    ): void {
        this.children.forEach((child, idx) => child.visitPostorder(f, depth + 1, new Some(this), new Some(idx)));
        f(this.value, depth, parent, childIdx);
    }

    visitLevelOrder(
        f: (x: T, depth: number, parent: Optional<Tree<T>>, chlidIdx: Optional<number>) => void,
        depth: number = 0,
        parent: Optional<Tree<T>> = new None(), 
        childIdx: Optional<number> = new None()
    ): void {
        const queue: Array<[Tree<T>, number, Optional<Tree<T>>, Optional<number>]> = [[this, depth, parent, childIdx]];
        while (queue.length > 0) {
            const node = queue.shift();
            if (typeof node === "undefined") {
                return
            }
            f(node[0].value, node[1], node[2], node[3]);
            const newNodes = node[0].children.map(
                (child, idx): [Tree<T>, number, Optional<Tree<T>>, Optional<number>]  => 
                    [child, node[1] + 1, new Some(node[0]), new Some(idx)]
            );
            queue.push(...newNodes);
        }
    }

    map<U>(f: (x: T) => U): Tree<U> {
        const value = f(this.value);
        const children = this.children.map(child => child.map(f));
        return this.newInstance(value, children);
    }
    apply<U>(f: Tree<(x: T) => U>): Tree<U> {
        const value = f.value(this.value);
        const children = this.children.map(child => child.apply(f));
        return this.newInstance(value, children);
    }
    pure<U>(x: U): Tree<U> {
        return this.newInstance(x, []);
    }
    flatMap<U>(f: (x: T) => Tree<U>): Tree<U> {
        const mappedRoot = f(this.value);
        const mappedChldren = this.children.map(child => child.flatMap(f));
        const value = mappedRoot.value;
        const children = mappedRoot.children;
        for (const child of children) {
            child.children.push(...mappedChldren);
        }
        return this.newInstance(value, children);
    }
    zip<U>(other: Tree<U>): Tree<[T, U]> {
        const value: [T, U] = [this.value, other.value];
        const minLength = Math.min(this.children.length, other.children.length);
        const children = new Array<Tree<[T, U]>>(minLength);
        for (let i = 0; i < minLength; i++) {
            children[i] = this.children[i].zip(other.children[i]);
        }
        return this.newInstance(value, children);
    }
    zip2<U, V>(o1: Tree<U>, o2: Tree<V>): Tree<[T, U, V]> {
        const value: [T, U, V] = [this.value, o1.value, o2.value];
        const minLength = Math.min(this.children.length, o1.children.length, o2.children.length);
        const children = new Array<Tree<[T, U, V]>>(minLength);
        for (let i = 0; i < minLength; i++) {
            children[i] = this.children[i].zip2(o1.children[i], o2.children[i]);
        }
        return this.newInstance(value, children);
    }
    zip3<U, V, W>(o1: Tree<U>, o2: Tree<V>, o3: Tree<W>): Tree<[T, U, V, W]> {
        const value: [T, U, V, W] = [this.value, o1.value, o2.value, o3.value];
        const minLength = Math.min(this.children.length, o1.children.length, o2.children.length, o3.children.length);
        const children = new Array<Tree<[T, U, V, W]>>(minLength);
        for (let i = 0; i < minLength; i++) {
            children[i] = this.children[i].zip3(o1.children[i], o2.children[i], o3.children[i]);
        }
        return this.newInstance(value, children);
    }
    zip4<U, V, W, X>(o1: Tree<U>, o2: Tree<V>, o3: Tree<W>, o4: Tree<X>): Tree<[T, U, V, W, X]> {
        const value: [T, U, V, W, X] = [this.value, o1.value, o2.value, o3.value, o4.value];
        const minLength = Math.min(this.children.length, o1.children.length, o2.children.length, o3.children.length, o4.children.length);
        const children = new Array<Tree<[T, U, V, W, X]>>(minLength);
        for (let i = 0; i < minLength; i++) {
            children[i] = this.children[i].zip4(o1.children[i], o2.children[i], o3.children[i], o4.children[i]);
        }
        return this.newInstance(value, children);
    }
    zip5<U, V, W, X, Y>(o1: Tree<U>, o2: Tree<V>, o3: Tree<W>, o4: Tree<X>, o5: Tree<Y>): Tree<[T, U, V, W, X, Y]> {
        const value: [T, U, V, W, X, Y] = [this.value, o1.value, o2.value, o3.value, o4.value, o5.value];
        const minLength = Math.min(this.children.length, o1.children.length, o2.children.length, o3.children.length, o4.children.length, o5.children.length);
        const children = new Array<Tree<[T, U, V, W, X, Y]>>(minLength);
        for (let i = 0; i < minLength; i++) {
            children[i] = this.children[i].zip5(o1.children[i], o2.children[i], o3.children[i], o4.children[i], o5.children[i]);
        }
        return this.newInstance(value, children);
    }
    zip6<U, V, W, X, Y, Z>(o1: Tree<U>, o2: Tree<V>, o3: Tree<W>, o4: Tree<X>, o5: Tree<Y>, o6: Tree<Z>): Tree<[T, U, V, W, X, Y, Z]> {
        const value: [T, U, V, W, X, Y, Z] = [this.value, o1.value, o2.value, o3.value, o4.value, o5.value, o6.value];
        const minLength = Math.min(this.children.length, o1.children.length, o2.children.length, o3.children.length, o4.children.length, o5.children.length, o6.children.length);
        const children = new Array<Tree<[T, U, V, W, X, Y, Z]>>(minLength);
        for (let i = 0; i < minLength; i++) {
            children[i] = this.children[i].zip6(o1.children[i], o2.children[i], o3.children[i], o4.children[i], o5.children[i], o6.children[i]);
        }
        return this.newInstance(value, children);
    }
    zipN<U>(...others: Tree<U>[]): Tree<[T, ...U[]]> {
        const value: [T, ...U[]] = [this.value, ...others.map(o => o.value)];
        const minLength = Math.min(this.children.length, ...others.map(o => o.children.length));
        const children = new Array<Tree<[T, ...U[]]>>(minLength);
        for (let i = 0; i < minLength; i++) {
            children[i] = this.children[i].zipN(...others.map(o => o.children[i]));
        }
        return this.newInstance(value, children);
    }
    /**
     *  Example usage:
     * 
     *    # Replace all nodes with value "a" with a node with value "b"
     *      tree.replaceNodesPreOrder(node => node.value === "a", node => this.newInstanceConstructor()("b", node.children));
     *    # Replace all nodes with value "a" with a node with value "b" and prune all nodes with value "c"
     *      tree.replaceNodesPreOrder(node => ['a', 'c'].includes(node.value), node => {
     *        if (node.value === 'c') {
     *          return this.newInstanceConstructor()(node.value, []);
     *        } else if (node.value === 'a') {
     *          return this.newInstanceConstructor()("b", node.children);
     *        }
     *        return node;
     *      });
     *      # alternatively
     *      tree.replaceNodesPreOrder(
     *        node => ['a', 'c'].includes(node.value), 
     *        node => (node.value === 'c') ?
     *                  this.newInstanceConstructor()(node.value, []) :
     *                  (node.value === 'a') ?
     *                    this.newInstanceConstructor()("b", node.children) :
     *                    node;
     *      });
     *    
     * 
     */
    replaceNodesPreOrder(predicate: Predicate<Tree<T>>, generator: (node: Tree<T>) => Tree<T>): Tree<T> {
        return this.replaceNodesByPredicateWithGeneratorInternal(predicate, generator, "pre");
    }
    replaceNodesPostOrder(predicate: Predicate<Tree<T>>, generator: (node: Tree<T>) => Tree<T>): Tree<T> {
        return this.replaceNodesByPredicateWithGeneratorInternal(predicate, generator, "post");
    }
    replaceFirstMatchingNodePreOrder(predicate: Predicate<Tree<T>>, generator: (node: Tree<T>) => Tree<T>): Tree<T> {
        return this.replaceNodeByPredicatewithGeneratorInternal(predicate, generator, "pre", false);
    }
    replaceFirstMatchingNodePostOrder(predicate: Predicate<Tree<T>>, generator: (node: Tree<T>) => Tree<T>): Tree<T> {
        return this.replaceNodeByPredicatewithGeneratorInternal(predicate, generator, "post", false);
    }

    removeNodesPreOrder(predicate: Predicate<Tree<T>>): Optional<Tree<T>> {
        return this.removeNodesByPredicateInternal(predicate, "pre");
    }
    removeNodesPostOrder(predicate: Predicate<Tree<T>>): Optional<Tree<T>> {
        return this.removeNodesByPredicateInternal(predicate, "post");
    }
    removeFirstMatchingNodePreOrder(predicate: Predicate<Tree<T>>): Optional<Tree<T>> {
        return this.removeNodeByPredicateInternal(predicate, "pre", false);
    }
    removeFirstMatchingNodePostOrder(predicate: Predicate<Tree<T>>): Optional<Tree<T>> {
        return this.removeNodeByPredicateInternal(predicate, "post", false);
    }
    
    protected replaceNodesByPredicateWithGeneratorInternal(
        predicate: Predicate<Tree<T>>,
        generator: (node: Tree<T>) => Tree<T>,
        traversalOrder: "pre" | "post"
    ): Tree<T> {
        if ("pre" === traversalOrder && predicate.evaluate(this)) {
            const newThis = generator(this);
            const children = newThis.children.map(c => c.replaceNodesByPredicateWithGeneratorInternal(predicate, generator, traversalOrder));
            return this.newInstance(newThis.value, children);
        } else if ("post" === traversalOrder) {
            const children = this.children.map(c => c.replaceNodesByPredicateWithGeneratorInternal(predicate, generator, traversalOrder));
            const newThis = this.newInstance(this.value, children);
            if (predicate.evaluate(newThis)) {
                return generator(newThis);
            }
        }
        return this;
    }

    protected replaceNodeByPredicatewithGeneratorInternal(
        predicate: Predicate<Tree<T>>, 
        generator: (node: Tree<T>) => Tree<T>, 
        traversalOrder: "pre" | "post",
        replaced: &boolean
    ): Tree<T> {
        if (replaced) {
            return this;
        }
        if ("pre" === traversalOrder) { 
            if (predicate.evaluate(this)) {
                replaced = true;
                return generator(this);
            }
            const children = this.children.map(c => c.replaceNodeByPredicatewithGeneratorInternal(predicate, generator, traversalOrder, replaced));
            if (replaced) {
                return this.newInstance(this.value, children);
            }
            return this;
        } else if ("post" === traversalOrder) {
            const children = this.children.map(c => c.replaceNodeByPredicatewithGeneratorInternal(predicate, generator, traversalOrder, replaced));
            const newThis = this.newInstance(this.value, children);
            if (!replaced && predicate.evaluate(newThis)) {
                replaced = true;
                return generator(newThis);
            }
            return newThis;
        }
        return this;
    }

    protected removeNodeByPredicateInternal(predicate: Predicate<Tree<T>>, traversalOrder: "pre" | "post", removed: &boolean): Optional<Tree<T>> {
        if ("pre" === traversalOrder) {
            if (predicate.evaluate(this)) {
                removed = true;
                return new None();
            }
            const children = 
                this.children
                    .map(
                        c => c.removeNodeByPredicateInternal(predicate, traversalOrder, removed)
                    )
                    .filter(
                        c => c.isSome()
                    )
                    .map(
                        c => c.getOrThrow('No value present.')
                    ) as Tree<T>[];
            if (removed) {
                return new Some(this.newInstance(this.value, children));
            }
            return new Some(this);
        }
        const children = 
            this.children
                .map(
                    c => c.removeNodeByPredicateInternal(predicate, traversalOrder, removed)
                )
                .filter(
                    c => c.isSome()
                )
                .map(
                    c => c.getOrThrow('No value present.')
                ) as Tree<T>[];

        const newThis = this.newInstance(this.value, children);
        if (!removed && predicate.evaluate(newThis)) {
            removed = true;
            return new None();
        }
        return new Some(newThis);
    }

    protected removeNodesByPredicateInternal(predicate: Predicate<Tree<T>>, traversalOrder: "pre" | "post"): Optional<Tree<T>> {
        if ("pre" === traversalOrder) {
            if (predicate.evaluate(this)) {
                return new None();
            }
            const originalChildrenCount = this.children.length;
            const children = 
                this.children
                    .map(
                        c => c.removeNodesByPredicateInternal(predicate, traversalOrder)
                    )
                    .filter(
                        c => c.isSome()
                    )
                    .map(
                        c => c.getOrThrow('No value present.')
                    ) as Tree<T>[];
            if (originalChildrenCount > children.length) {
                return new Some(this.newInstance(this.value, children));
            }
            return new Some(this);
        }
        const originalChildrenCount = this.children.length;
        const children = 
            this.children
                .map(
                    c => c.removeNodesByPredicateInternal(predicate, traversalOrder)
                )
                .filter(
                    c => c.isSome()
                )
                .map(
                    c => c.getOrThrow('No value present.')
                ) as Tree<T>[];
        const newThis = originalChildrenCount > children.length ? this.newInstance(this.value, children) : this;
        if (predicate.evaluate(newThis)) {
            return new None();
        }
        return new Some(newThis);
    }

    protected findAllMatches(p: Predicate<Tree<T>>, traversalOrder: "pre" | "post"): List<Tree<T>> {
        const matches: List<Tree<T>> = new List<Tree<T>>([]);
        if ("pre" === traversalOrder) {
            if (p.evaluate(this)) {
                matches;
            }
            this.children.forEach(c => matches.push(...c.findAllMatches(p, traversalOrder)));
        } else if ("post" === traversalOrder) {
            this.children.forEach(c => matches.push(...c.findAllMatches(p, traversalOrder)));
            if (p.evaluate(this)) {
                matches.push(this);
            }
        }
        return matches;
    }

    protected findFirstMatchPreorder(p: Predicate<Tree<T>>): Optional<Tree<T>> {
        if (p.evaluate(this)) {
            return new Some(this);
        }
        for (let i = 0; i < this.children.length; i++) {
            const child = this.children[i];
            const match = child.findFirstMatchPreorder(p);
            if (match.isSome()) {
                return match;
            }
        }
        return new None();
    }

    protected findFirstMatchPostorder(p: Predicate<Tree<T>>): Optional<Tree<T>> {
        for (let i = 0; i < this.children.length; i++) {
            const child = this.children[i];
            const match = child.findFirstMatchPostorder(p);
            if (match.isSome()) {
                return match;
            }
        }
        if (p.evaluate(this)) {
            return new Some(this);
        }
        return new None();
    }

    protected moveChildNode(
        parentPredicate: Predicate<Tree<T>>, 
        currChildIdx: number, 
        newChildIdx: number, 
        newParentPredicate: Optional<Predicate<Tree<T>>> = new None()
    ): Tree<T> {
        if (null === newParentPredicate && newChildIdx === currChildIdx) {
            return this;
        }
        const parentOption = this.findFirstMatchPreorder(parentPredicate);
        if (!parentOption.isSome()) {
            return this;
        }
        const parent = parentOption.getOrThrow('No value present.');
        
        const newParentOption = 
            !newParentPredicate.isSome() ? 
                parentOption : 
                this.findFirstMatchPreorder(newParentPredicate.getOrThrow('No value present.'));
        if (!newParentOption.isSome()) {
            return this;
        }
        const newParent = newParentOption.getOrThrow('No value present.');

        if (newParent === parent) {
            if (newChildIdx === currChildIdx) {
                return this;
            }
            const child = parent.children[currChildIdx] ?? null;
            if (null === child) {
                return this;
            }
            const newChildren = [...parent.children];
            newChildren.splice(currChildIdx, 1);
            newChildren.splice(newChildIdx, 0, child);
            const parentReplacement = this.newInstance(parent.value, newChildren);
            return this.replaceFirstMatchingNodePreOrder(new Predicate((t: Tree<T>) => t === parent), () => parentReplacement);
        }
        const child = parent.children[currChildIdx] ?? null;
        if (null === child) {
            return this;
        }
        const newParentNewChildren = [...newParent.children];
        const oldParentNewChildren = [...parent.children];
        oldParentNewChildren.splice(currChildIdx, 1);
        newParentNewChildren.splice(newChildIdx, 0, child);
        const newParentReplacement = this.newInstance(newParent.value, newParentNewChildren);
        const oldParentReplacement = this.newInstance(parent.value, oldParentNewChildren);
        const withOldParentReplaced = 
            this.replaceFirstMatchingNodePreOrder(new Predicate((t: Tree<T>) => t === parent), () => oldParentReplacement);
        return withOldParentReplaced.replaceFirstMatchingNodePreOrder(
            new Predicate((t: Tree<T>) => t === newParent), () => newParentReplacement
        );

    }

}
