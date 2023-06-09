import {List} from './List.js';
import {evaluatePredicate, type PredicateOrFn} from './Predicate.js';

export class LazyList<T> extends List<T> {
	static combine<U>(l: List<U>, r: List<U>): LazyList<U> {
		return new LazyList(() => new List([...l.getAsArray(), ...r.getAsArray()]), () => []);
	}

	private resolved: undefined | List<T> = undefined;
	constructor(private readonly fn: (args: any[]) => List<T>, private readonly argsProvider: () => any[]) {
		super([]);
	}

	getResolved(): List<T> {
		if (this.resolved === null) {
			this.resolve();
		}

		return this.resolved!;
	}

	[Symbol.iterator](): Iterator<T> {
		return this.getResolved()[Symbol.iterator]();
	}

	forEach(callbackFn: (value: T, index: number, array: T[]) => void, thisArg?: any): void {
		// `forEach` here is a custom method
		// eslint-disable-next-line unicorn/no-array-for-each, unicorn/no-array-callback-reference
		this.getResolved().forEach(callbackFn);
	}

	hasElementForPredicate(predicate: PredicateOrFn<T>): boolean {
		const list = this.getResolved();
		for (const value of list) {
			if (evaluatePredicate(predicate, value)) {
				return true;
			}
		}

		return false;
	}

	id(): List<T> {
		return List.empty<T>();
	}

	getAsArray(): T[] {
		return this.getResolved().getAsArray();
	}

	append(other: List<T>): LazyList<T> {
		const fn = () => this.getResolved().append(other);
		return new LazyList(fn, () => []);
	}

	push(...others: T[]): LazyList<T> {
		return new LazyList(() => this.getResolved().push(...others), () => []);
	}

	pushLazy(fn: (args: any[]) => T[], argsProvider: () => any[]): LazyList<T> {
		return new LazyList(() => this.getResolved().push(...fn(argsProvider())), () => []);
	}

	prepend(other: List<T>): LazyList<T> {
		return new LazyList(() => this.getResolved().prepend(other), () => []);
	}

	unshift(...others: T[]): LazyList<T> {
		return new LazyList(() => this.getResolved().unshift(...others), () => []);
	}

	slice(start: number, end: number): LazyList<T> {
		return new LazyList(() => this.getResolved().slice(start, end), () => []);
	}

	splice(start: number, deleteCount: number, ...items: T[]): LazyList<T> {
		return new LazyList(() => this.getResolved().splice(start, deleteCount, ...items), () => []);
	}

	spliceLazy(start: number, deleteCount: number, fn: (args: any[]) => T[], argsProvider: () => any[]): LazyList<T> {
		return new LazyList(() => this.getResolved().splice(start, deleteCount, ...(fn(argsProvider()))), () => []);
	}

	orderBy(comparator: (a: T, b: T) => -1 | 0 | 1): LazyList<T> {
		return new LazyList(() => this.getResolved().orderBy(comparator), () => []);
	}

	orderByInverse(comparator: (a: T, b: T) => -1 | 0 | 1): LazyList<T> {
		return new LazyList(() => this.getResolved().orderByInverse(comparator), () => []);
	}

	reduce<U>(reducer: (acc: U, t: T) => U, initial: U): U {
		// `reduce` here is a custom method
		// eslint-disable-next-line unicorn/no-array-callback-reference
		return this.getResolved().reduce(reducer, initial);
	}

	filter(p: PredicateOrFn<T>): LazyList<T> {
		// `p` is a predicate, and this custom method takes only predicates
		// eslint-disable-next-line unicorn/no-array-callback-reference
		return new LazyList(() => this.getResolved().filter(p), () => []);
	}

	every(p: PredicateOrFn<T>): boolean {
		// `p` is a predicate, and this custom method takes only predicates
		// eslint-disable-next-line unicorn/no-array-callback-reference
		return this.getResolved().every(p);
	}

	some(p: PredicateOrFn<T>): boolean {
		// `p` is a predicate, and this custom method takes only predicates
		// eslint-disable-next-line unicorn/no-array-callback-reference
		return this.getResolved().some(p);
	}

	none(p: PredicateOrFn<T>): boolean {
		return this.getResolved().none(p);
	}

	op: (a: List<T>, b: List<T>) => LazyList<T>
		= (a, b) => new LazyList<T>(() => new List<T>([...a.getAsArray(), ...b.getAsArray()]), () => []);

	concat(other: List<T>): LazyList<T> {
		return new LazyList(() => this.getResolved().concat(other), () => []);
	}

	interleave(other: List<T>): LazyList<T> {
		return new LazyList(() => this.getResolved().interleave(other), () => []);
	}

	map<U>(f: (x: T) => U): LazyList<U> {
		return new LazyList(() => this.getResolved().map(t => f(t)), () => []);
	}

	apply<U>(ftu: List<(t: T) => U>): LazyList<U> {
		return new LazyList(() => this.getResolved().apply(ftu), () => []);
	}

	pure<U>(x: U): List<U> {
		return new List([x]);
	}

	flatMap<U>(f: (x: T) => List<U>): LazyList<U> {
		return new LazyList(() => this.getResolved().flatMap(t => f(t)), () => []);
	}

	zip<U>(other: List<U>): LazyList<[T, U]> {
		return new LazyList(() => this.getResolved().zip(other), () => []);
	}

	zip2<U, U2>(
		o1: List<U>,
		o2: List<U2>,
	): LazyList<[T, U, U2]> {
		return new LazyList(() => this.getResolved().zip2(o1, o2), () => []);
	}

	zip3<U, U2, U3>(
		o1: List<U>,
		o2: List<U2>,
		o3: List<U3>,
	): LazyList<[T, U, U2, U3]> {
		return new LazyList(() => this.getResolved().zip3(o1, o2, o3), () => []);
	}

	zip4<U, U2, U3, U4>(
		o1: List<U>,
		o2: List<U2>,
		o3: List<U3>,
		o4: List<U4>,
	): LazyList<[T, U, U2, U3, U4]> {
		return new LazyList(() => this.getResolved().zip4(o1, o2, o3, o4), () => []);
	}

	zip5<U, U2, U3, U4, U5>(
		o1: List<U>,
		o2: List<U2>,
		o3: List<U3>,
		o4: List<U4>,
		o5: List<U5>,
	): LazyList<[T, U, U2, U3, U4, U5]> {
		return new LazyList(() => this.getResolved().zip5(o1, o2, o3, o4, o5), () => []);
	}

	zip6<U, U2, U3, U4, U5, U6>(
		o1: List<U>,
		o2: List<U2>,
		o3: List<U3>,
		o4: List<U4>,
		o5: List<U5>,
		o6: List<U6>,
	): LazyList<[T, U, U2, U3, U4, U5, U6]> {
		return new LazyList(() => this.getResolved().zip6(o1, o2, o3, o4, o5, o6), () => []);
	}

	zipN<U>(...others: Array<List<U>>): LazyList<Array<T | U>> {
		return new LazyList(() => this.getResolved().zipN(...others), () => []);
	}

	reverse(): LazyList<T> {
		return new LazyList(() => this.getResolved().reverse(), () => []);
	}

	valueAt(index: number): T | undefined {
		return this.getResolved().valueAt(index);
	}

	private resolve(): void {
		this.resolved = this.fn(this.argsProvider());
	}
}
