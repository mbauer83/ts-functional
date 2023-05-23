import {type EqualityComparable} from '@mbauer83/ts-utils/src/comparison/equality.js';
import {List} from './List.js';
import {type Monad} from './Monad.js';
import {None, type Optional, Some} from './Optional.js';
import {Predicate, evaluatePredicate, type PredicateOrFn} from './Predicate.js';
import {type Either, Left, Right} from './Either.js';
import {optionalToEither} from './optionalHelper.js';

export class Tree<T> implements Monad<T>, EqualityComparable<Tree<T>> {
	private readonly size: number;

	constructor(public readonly value: T, public readonly children: Array<Tree<T>> = []) {
		this.size = this.children.reduce((acc, child) => acc + child.getSize(), 1);
	}

	getSize(): number {
		return this.size;
	}

	equals(other: Tree<T>): boolean {
		return this.value === other.value && this.children === (other.children);
	}

	visitPreorder(
		f: (x: T, depth: number, parent: Optional<Tree<T>>, childIdx: Optional<number>) => void,
		depth = 0,
		parent: Optional<Tree<T>> = new None<Tree<T>>(),
		childIdx: Optional<number> = new None<number>(),
	): void {
		f(this.value, depth, parent, childIdx);
		const someThis = new Some<Tree<T>>(this) as Optional<Tree<T>>;
		for (const [idx, child] of this.children.entries()) {
			child.visitPreorder(f, depth + 1, someThis, new Some<number>(idx) as Optional<number>);
		}
	}

	visitPostorder(
		f: (x: T, depth: number, parent: Optional<Tree<T>>, chlidIdx: Optional<number>) => void,
		depth = 0,
		parent: Optional<Tree<T>> = new None<Tree<T>>(),
		childIdx: Optional<number> = new None<number>(),
	): void {
		for (const [idx, child] of this.children.entries()) {
			child.visitPostorder(f, depth + 1, new Some<Tree<T>>(this) as Optional<Tree<T>>, new Some<number>(idx) as Optional<number>);
		}

		f(this.value, depth, parent, childIdx);
	}

	visitLevelOrder(
		f: (x: T, depth: number, parent: Optional<Tree<T>>, chlidIdx: Optional<number>) => void,
		depth = 0,
		parent: Optional<Tree<T>> = new None<Tree<T>>(),
		childIdx: Optional<number> = new None<number>(),
	): void {
		const queue: Array<[Tree<T>, number, Optional<Tree<T>>, Optional<number>]> = [[this, depth, parent, childIdx]];
		while (queue.length > 0) {
			const node = queue.shift();
			if (node === undefined) {
				return;
			}

			f(node[0].value, node[1], node[2], node[3]);
			const newNodes = node[0].children.map(
				(child, idx): [Tree<T>, number, Optional<Tree<T>>, Optional<number>] =>
					[child, node[1] + 1, new Some<Tree<T>>(node[0]) as Optional<Tree<T>>, new Some<number>(idx) as Optional<number>],
			);
			queue.push(...newNodes);
		}
	}

	map<U>(f: (x: T) => U): Tree<U> {
		const value = f(this.value);
		const children = this.children.map(child => child.map(t => f(t)));
		return new Tree<U>(value, children);
	}

	apply<U>(f: Tree<(x: T) => U>): Tree<U> {
		const value = f.value(this.value);
		const children = this.children.map(child => child.apply<U>(f));
		return new Tree<U>(value, children);
	}

	pure<U>(x: U): Tree<U> {
		return new Tree<U>(x, []);
	}

	flatMap<U>(f: (x: T) => Tree<U>): Tree<U> {
		const mappedRoot = f(this.value);
		const mappedChldren = this.children.map(child => child.flatMap(t => f(t)));
		const {value} = mappedRoot;
		const {children} = mappedRoot;
		for (const child of children) {
			child.children.push(...mappedChldren);
		}

		return new Tree<U>(value, children);
	}

	zip<U>(other: Tree<U>): Tree<[T, U]> {
		const value: [T, U] = [this.value, other.value];
		const minLength = Math.min(this.children.length, other.children.length);
		const children = Array.from({length: minLength});
		for (let i = 0; i < minLength; i++) {
			children[i] = this.children[i].zip(other.children[i]);
		}

		return new Tree<[T, U]>(value, children as Array<Tree<[T, U]>>);
	}

	zip2<U, V>(o1: Tree<U>, o2: Tree<V>): Tree<[T, U, V]> {
		const value: [T, U, V] = [this.value, o1.value, o2.value];
		const minLength = Math.min(this.children.length, o1.children.length, o2.children.length);
		const children = Array.from({length: minLength});
		for (let i = 0; i < minLength; i++) {
			children[i] = this.children[i].zip2(o1.children[i], o2.children[i]);
		}

		return new Tree<[T, U, V]>(value, children as Array<Tree<[T, U, V]>>);
	}

	zip3<U, V, W>(o1: Tree<U>, o2: Tree<V>, o3: Tree<W>): Tree<[T, U, V, W]> {
		const value: [T, U, V, W] = [this.value, o1.value, o2.value, o3.value];
		const minLength = Math.min(this.children.length, o1.children.length, o2.children.length, o3.children.length);
		const children = Array.from({length: minLength});
		for (let i = 0; i < minLength; i++) {
			children[i] = this.children[i].zip3(o1.children[i], o2.children[i], o3.children[i]);
		}

		return new Tree<[T, U, V, W]>(value, children as Array<Tree<[T, U, V, W]>>);
	}

	zip4<U, V, W, X>(o1: Tree<U>, o2: Tree<V>, o3: Tree<W>, o4: Tree<X>): Tree<[T, U, V, W, X]> {
		const value: [T, U, V, W, X] = [this.value, o1.value, o2.value, o3.value, o4.value];
		const minLength = Math.min(this.children.length, o1.children.length, o2.children.length, o3.children.length, o4.children.length);
		const children = Array.from({length: minLength});
		for (let i = 0; i < minLength; i++) {
			children[i] = this.children[i].zip4(o1.children[i], o2.children[i], o3.children[i], o4.children[i]);
		}

		return new Tree<[T, U, V, W, X]>(value, children as Array<Tree<[T, U, V, W, X]>>);
	}

	zip5<U, V, W, X, Y>(o1: Tree<U>, o2: Tree<V>, o3: Tree<W>, o4: Tree<X>, o5: Tree<Y>): Tree<[T, U, V, W, X, Y]> {
		const value: [T, U, V, W, X, Y] = [this.value, o1.value, o2.value, o3.value, o4.value, o5.value];
		const minLength = Math.min(this.children.length, o1.children.length, o2.children.length, o3.children.length, o4.children.length, o5.children.length);
		const children = Array.from({length: minLength});
		for (let i = 0; i < minLength; i++) {
			children[i] = this.children[i].zip5(o1.children[i], o2.children[i], o3.children[i], o4.children[i], o5.children[i]);
		}

		return new Tree<[T, U, V, W, X, Y]>(value, children as Array<Tree<[T, U, V, W, X, Y]>>);
	}

	zip6<U, V, W, X, Y, Z>(o1: Tree<U>, o2: Tree<V>, o3: Tree<W>, o4: Tree<X>, o5: Tree<Y>, o6: Tree<Z>): Tree<[T, U, V, W, X, Y, Z]> {
		const value: [T, U, V, W, X, Y, Z] = [this.value, o1.value, o2.value, o3.value, o4.value, o5.value, o6.value];
		const minLength = Math.min(this.children.length, o1.children.length, o2.children.length, o3.children.length, o4.children.length, o5.children.length, o6.children.length);
		const children = Array.from({length: minLength});
		for (let i = 0; i < minLength; i++) {
			children[i] = this.children[i].zip6(o1.children[i], o2.children[i], o3.children[i], o4.children[i], o5.children[i], o6.children[i]);
		}

		return new Tree<[T, U, V, W, X, Y, Z]>(value, children as Array<Tree<[T, U, V, W, X, Y, Z]>>);
	}

	zipN<U>(...others: Array<Tree<U>>): Tree<[T, ...U[]]> {
		const value: [T, ...U[]] = [this.value, ...others.map(o => o.value)];
		const minLength = Math.min(this.children.length, ...others.map(o => o.children.length));
		const children = Array.from({length: minLength});
		for (let i = 0; i < minLength; i++) {
			children[i] = this.children[i].zipN(...others.map(o => o.children[i]));
		}

		return new Tree<[T, ...U[]]>(value, children as Array<Tree<[T, ...U[]]>>);
	}

	/**
     *  Example usage:
     *
     *    # Replace all nodes with value "a" with a node with value "b"
     *      tree.replaceNodesPreOrder(node => node.value === "a", node => new Tree<U>Constructor()("b", node.children));
     *    # Replace all nodes with value "a" with a node with value "b" and prune all nodes with value "c"
     *      tree.replaceNodesPreOrder(node => ['a', 'c'].includes(node.value), node => {
     *        if (node.value === 'c') {
     *          return new Tree<U>Constructor()(node.value, []);
     *        } else if (node.value === 'a') {
     *          return new Tree<U>Constructor()("b", node.children);
     *        }
     *        return node;
     *      });
     *      # alternatively
     *      tree.replaceNodesPreOrder(
     *        node => ['a', 'c'].includes(node.value),
     *        node => (node.value === 'c') ?
     *                  new Tree<U>Constructor()(node.value, []) :
     *                  (node.value === 'a') ?
     *                    new Tree<U>Constructor()("b", node.children) :
     *                    node;
     *      });
     *
     *
     */
	replaceNodesPreOrder(predicate: PredicateOrFn<Tree<T>>, generator: (node: Tree<T>) => Tree<T>): Tree<T> {
		return this.replaceNodesByPredicateWithGeneratorInternal(predicate, generator, 'pre');
	}

	replaceNodesPostOrder(predicate: PredicateOrFn<Tree<T>>, generator: (node: Tree<T>) => Tree<T>): Tree<T> {
		return this.replaceNodesByPredicateWithGeneratorInternal(predicate, generator, 'post');
	}

	replaceFirstMatchingNodePreOrder(predicate: PredicateOrFn<Tree<T>>, generator: (node: Tree<T>) => Tree<T>): Tree<T> {
		return this.replaceNodeByPredicatewithGeneratorInternal(predicate, generator, 'pre', false);
	}

	replaceFirstMatchingNodePostOrder(predicate: PredicateOrFn<Tree<T>>, generator: (node: Tree<T>) => Tree<T>): Tree<T> {
		return this.replaceNodeByPredicatewithGeneratorInternal(predicate, generator, 'post', false);
	}

	removeNodesPreOrder(predicate: PredicateOrFn<Tree<T>>): Optional<Tree<T>> {
		return this.removeNodesByPredicateInternal(predicate, 'pre');
	}

	removeNodesPostOrder(predicate: PredicateOrFn<Tree<T>>): Optional<Tree<T>> {
		return this.removeNodesByPredicateInternal(predicate, 'post');
	}

	removeFirstMatchingNodePreOrder(predicate: PredicateOrFn<Tree<T>>): Optional<Tree<T>> {
		return this.removeNodeByPredicateInternal(predicate, 'pre', false);
	}

	removeFirstMatchingNodePostOrder(predicate: PredicateOrFn<Tree<T>>): Optional<Tree<T>> {
		return this.removeNodeByPredicateInternal(predicate, 'post', false);
	}

	protected replaceNodesByPredicateWithGeneratorInternal(
		predicate: PredicateOrFn<Tree<T>>,
		generator: (node: Tree<T>) => Tree<T>,
		traversalOrder: 'pre' | 'post',
	): Tree<T> {
		if (traversalOrder === 'pre' && evaluatePredicate(predicate, this)) {
			const newThis = generator(this);
			const children = newThis.children.map(c => c.replaceNodesByPredicateWithGeneratorInternal(predicate, generator, traversalOrder));
			return new Tree<T>(newThis.value, children);
		}

		if (traversalOrder === 'post') {
			const children = this.children.map(c => c.replaceNodesByPredicateWithGeneratorInternal(predicate, generator, traversalOrder));
			const newThis = new Tree<T>(this.value, children);
			if (evaluatePredicate(predicate, newThis)) {
				return generator(newThis);
			}
		}

		return this;
	}

	protected replaceNodeByPredicatewithGeneratorInternal(
		predicate: PredicateOrFn<Tree<T>>,
		generator: (node: Tree<T>) => Tree<T>,
		traversalOrder: 'pre' | 'post',
		replaced: & boolean,
	): Tree<T> {
		if (replaced) {
			return this;
		}

		if (traversalOrder === 'pre') {
			if (evaluatePredicate(predicate, this)) {
				replaced = true;
				return generator(this);
			}

			const children = this.children.map(c => c.replaceNodeByPredicatewithGeneratorInternal(predicate, generator, traversalOrder, replaced));
			if (replaced) {
				return new Tree<T>(this.value, children);
			}

			return this;
		}

		if (traversalOrder === 'post') {
			const children = this.children.map(c => c.replaceNodeByPredicatewithGeneratorInternal(predicate, generator, traversalOrder, replaced));
			const newThis = new Tree<T>(this.value, children);
			if (!replaced && evaluatePredicate(predicate, newThis)) {
				replaced = true;
				return generator(newThis);
			}

			return newThis;
		}

		return this;
	}

	protected removeNodeByPredicateInternal(predicate: PredicateOrFn<Tree<T>>, traversalOrder: 'pre' | 'post', removed: & boolean): Optional<Tree<T>> {
		if (traversalOrder === 'pre') {
			if (evaluatePredicate(predicate, this)) {
				removed = true;
				return new None<Tree<T>>();
			}

			const children
                = this.children
                	.map(c => c.removeNodeByPredicateInternal(predicate, traversalOrder, removed))
                	.filter(c => c.isSome())
                	.map(c => c.getOrThrow('No value present.'));
			if (removed) {
				return new Some<Tree<T>>(new Tree<T>(this.value, children));
			}

			return new Some<Tree<T>>(this);
		}

		const children
            = this.children
            	.map(c => c.removeNodeByPredicateInternal(predicate, traversalOrder, removed))
            	.filter(c => c.isSome())
            	.map(c => c.getOrThrow('No value present.'));

		const newThis = new Tree<T>(this.value, children);
		if (!removed && evaluatePredicate(predicate, newThis)) {
			removed = true;
			return new None<Tree<T>>();
		}

		return new Some<Tree<T>>(newThis);
	}

	protected removeNodesByPredicateInternal(predicate: PredicateOrFn<Tree<T>>, traversalOrder: 'pre' | 'post'): Optional<Tree<T>> {
		if (traversalOrder === 'pre') {
			if (evaluatePredicate(predicate, this)) {
				return new None<Tree<T>>();
			}

			const originalChildrenCount = this.children.length;
			const children
                = this.children
                	.map(c => c.removeNodesByPredicateInternal(predicate, traversalOrder))
                	.filter(c => c.isSome())
                	.map(c => c.getOrThrow('No value present.'));
			if (originalChildrenCount > children.length) {
				return new Some<Tree<T>>(new Tree<T>(this.value, children));
			}

			return new Some<Tree<T>>(this);
		}

		const originalChildrenCount = this.children.length;
		const children
            = this.children
            	.map(c => c.removeNodesByPredicateInternal(predicate, traversalOrder))
            	.filter(c => c.isSome())
            	.map(c => c.getOrThrow('No value present.'));
		const newThis = originalChildrenCount > children.length ? new Tree<T>(this.value, children) : this;
		if (evaluatePredicate(predicate, newThis)) {
			return new None<Tree<T>>();
		}

		return new Some<Tree<T>>(newThis);
	}

	protected findAllMatches(p: PredicateOrFn<Tree<T>>, traversalOrder: 'pre' | 'post'): List<Tree<T>> {
		const matches: List<Tree<T>> = new List<Tree<T>>([]);
		if (traversalOrder === 'pre') {
			if (evaluatePredicate(p, this)) {
				matches.push(this);
			}

			for (const c of this.children) {
				matches.push(...c.findAllMatches(p, traversalOrder));
			}
		} else if (traversalOrder === 'post') {
			for (const c of this.children) {
				matches.push(...c.findAllMatches(p, traversalOrder));
			}

			if (evaluatePredicate(p, this)) {
				matches.push(this);
			}
		}

		return matches;
	}

	protected findFirstMatchPreorder(p: PredicateOrFn<Tree<T>>): Optional<Tree<T>> {
		if (evaluatePredicate(p, this)) {
			return new Some<Tree<T>>(this);
		}

		let found: Some<Tree<T>> | undefined;
		for (const child of this.children) {
			const matched = child.findFirstMatchPreorder(p);
			// Linting won't work unless we use match here
			matched.match(
				// eslint-disable-next-line @typescript-eslint/no-loop-func
				(t: Tree<T>) => {
					found = new Some<Tree<T>>(t);
				},
				() => {/* do nothing */ },
			);
			if (found !== undefined) {
				return found;
			}
		}

		return new None<Tree<T>>();
	}

	protected findFirstMatchPostorder(p: PredicateOrFn<Tree<T>>): Optional<Tree<T>> {
		let found: Some<Tree<T>> | undefined;
		for (const child of this.children) {
			const matched = child.findFirstMatchPostorder(p);
			// Linting won't work unless we use match here
			matched.match(
				// eslint-disable-next-line @typescript-eslint/no-loop-func
				(t: Tree<T>) => {
					found = new Some<Tree<T>>(t);
				},
				() => {/* do nothing */ },
			);
			if (found !== undefined) {
				return found;
			}
		}

		if (evaluatePredicate(p, this)) {
			return new Some<Tree<T>>(this);
		}

		return new None<Tree<T>>();
	}

	protected moveChildNode(
		parentPredicate: PredicateOrFn<Tree<T>>,
		currChildIdx: number,
		newChildIdx: number,
		newParentPredicate: Optional<PredicateOrFn<Tree<T>>> = new None<PredicateOrFn<Tree<T>>>(),
	): Either<Error, Tree<T>> {
		if (newParentPredicate === null && newChildIdx === currChildIdx) {
			return new Right<Error, Tree<T>>(this);
		}

		const parentOption: Optional<Tree<T>> = this.findFirstMatchPreorder(parentPredicate);
		const parentNotFoundError = new Error('Parent could not be found.');
		const eitherParentOrError: Either<Error, Tree<T>> = optionalToEither(parentOption, parentNotFoundError);
		// Linting doesn't work here, but the code is correct.
		if (eitherParentOrError.isLeft()) {
			return new Left<Error, Tree<T>>(parentNotFoundError);
		}

		const mappedPredicate = newParentPredicate.flatMap(p => this.findFirstMatchPreorder(p));
		const newParentOption = mappedPredicate.match(
			t => mappedPredicate,
			() => parentOption,
		);

		if (!newParentOption.isSome()) {
			return new Left<Error, Tree<T>>(new Error('New parent could not be found.'));
		}

		const areEqual = newParentOption.equals(parentOption);
		const parent = parentOption.getOrQueriedValueNotPresent('Parent could not be found.').get() as Tree<T>;
		const newParent = newParentOption.getOrQueriedValueNotPresent('New parent could not be found.').get() as Tree<T>;

		if (areEqual) {
			if (newChildIdx === currChildIdx) {
				return new Right<Error, Tree<T>>(this);
			}

			const child = parent.children[currChildIdx] ?? null;
			if (child === null) {
				return new Right<Error, Tree<T>>(this);
			}

			const newChildren = [...parent.children];
			newChildren.splice(currChildIdx, 1);
			newChildren.splice(newChildIdx, 0, child);
			const parentReplacement = new Tree<T>(parent.value, newChildren);
			return new Right<Error, Tree<T>>(this.replaceFirstMatchingNodePreOrder(new Predicate((t: Tree<T>) => t === parent), () => parentReplacement));
		}

		const child = parent.children[currChildIdx] ?? null;
		if (child === null) {
			return new Right<Error, Tree<T>>(this);
		}

		const newParentNewChildren = [...newParent.children];
		const oldParentNewChildren = [...parent.children];
		oldParentNewChildren.splice(currChildIdx, 1);
		newParentNewChildren.splice(newChildIdx, 0, child);
		const newParentReplacement = new Tree<T>(newParent.value, newParentNewChildren);
		const oldParentReplacement = new Tree<T>(parent.value, oldParentNewChildren);
		const withOldParentReplaced
            = this.replaceFirstMatchingNodePreOrder(new Predicate((t: Tree<T>) => t === parent), () => oldParentReplacement);
		return new Right<Error, Tree<T>>(withOldParentReplaced.replaceFirstMatchingNodePreOrder(
			new Predicate((t: Tree<T>) => t === newParent), () => newParentReplacement,
		));
	}
}
