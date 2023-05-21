import {MonadicSet} from './MonadicSet.js';
import {type Predicate} from './Predicate.js';

export class LazyMonadicSet<T> extends MonadicSet<T> {
	protected resolved: undefined | MonadicSet<T> = undefined;

	constructor(protected readonly f: () => T[]) {
		super();
	}

	filter(p: Predicate<T>): LazyMonadicSet<T> {
		const resolver = () => {
			const resolved = this.getResolved();
			// `p` is a predicate, and this custom method takes only predicates
			// eslint-disable-next-line unicorn/no-array-callback-reference
			const filtered = resolved.filter(p);
			return filtered.getElementsAsArray();
		};

		return new LazyMonadicSet(resolver);
	}

	every(p: Predicate<T>): boolean {
		// `p` is a predicate, and this custom method takes only predicates
		// eslint-disable-next-line unicorn/no-array-callback-reference
		return this.getResolved().every(p);
	}

	some(p: Predicate<T>): boolean {
		// `p` is a predicate, and this custom method takes only predicates
		// eslint-disable-next-line unicorn/no-array-callback-reference
		return this.getResolved().some(p);
	}

	none(p: Predicate<T>): boolean {
		return this.getResolved().none(p);
	}

	getSize(): number {
		return this.getResolved().getSize();
	}

	[Symbol.iterator](): IterableIterator<T> {
		return this.innerSet[Symbol.iterator]();
	}

	forEach(callbackfn: (value: T, value2: T, set: Set<T>) => void, thisArg?: any): void {
		// `forEach` here is a custom method
		// eslint-disable-next-line unicorn/no-array-for-each, unicorn/no-array-callback-reference, unicorn/no-array-method-this-argument
		this.getResolved().forEach(callbackfn, thisArg);
	}

	has(value: T): boolean {
		return this.getResolved().has(value);
	}

	equals(other: MonadicSet<T>): boolean {
		return this.getResolved().equals(other);
	}

	add(value: T): this {
		const prototype = Object.getPrototypeOf(this) as this;
		const ctor = (ts: T[]): this => prototype.constructor(ts) as this;
		return ctor(this.getElementsAsArray().concat(value));
	}

	delete(value: T): this {
		const prototype = Object.getPrototypeOf(this) as this;
		const ctor = (ts: T[]): this => prototype.constructor(ts) as this;
		const array = this.getResolved().delete(value).getElementsAsArray();
		return ctor(array);
	}

	getElementsAsArray(): T[] {
		return this.getResolved().getElementsAsArray();
	}

	pure<U>(element: U): LazyMonadicSet<U> {
		return new LazyMonadicSet(() => [element]);
	}

	map<U>(f: (x: T) => U): LazyMonadicSet<U> {
		return new LazyMonadicSet(() => this.getResolved().map(t => f(t)).getElementsAsArray());
	}

	apply<U>(f: MonadicSet<(x: T) => U>): MonadicSet<U> {
		const all = new MonadicSet<U>();
		// eslint-disable-next-line unicorn/no-array-for-each
		this.forEach((value: T) => {
			const mappedValues = f.map(fn => fn(value));
			for (const mappedValue of mappedValues.getElementsAsArray()) {
				if (all.has(mappedValue)) {
					continue;
				}

				all.add(mappedValue);
			}
		});
		return all;
	}

	flatMap<U>(f: (x: T) => MonadicSet<U>): LazyMonadicSet<U> {
		return new LazyMonadicSet(() => this.getResolved().flatMap(t => f(t)).getElementsAsArray());
	}

	zip<U>(other: MonadicSet<U>): LazyMonadicSet<[T, U]> {
		return new LazyMonadicSet(() => this.getResolved().zip(other).getElementsAsArray());
	}

	zip2<U, V>(o1: MonadicSet<U>, o2: MonadicSet<V>): LazyMonadicSet<[T, U, V]> {
		return new LazyMonadicSet(() => this.getResolved().zip2(o1, o2).getElementsAsArray());
	}

	zip3<U, V, W>(o1: MonadicSet<U>, o2: MonadicSet<V>, o3: MonadicSet<W>): LazyMonadicSet<[T, U, V, W]> {
		return new LazyMonadicSet(() => this.getResolved().zip3(o1, o2, o3).getElementsAsArray());
	}

	zip4<U, V, W, X>(o1: MonadicSet<U>, o2: MonadicSet<V>, o3: MonadicSet<W>, o4: MonadicSet<X>): LazyMonadicSet<[T, U, V, W, X]> {
		return new LazyMonadicSet(() => this.getResolved().zip4(o1, o2, o3, o4).getElementsAsArray());
	}

	zip5<U, V, W, X, Y>(
		o1: MonadicSet<U>,
		o2: MonadicSet<V>,
		o3: MonadicSet<W>,
		o4: MonadicSet<X>,
		o5: MonadicSet<Y>,
	): LazyMonadicSet<[T, U, V, W, X, Y]> {
		return new LazyMonadicSet(() => this.getResolved().zip5(o1, o2, o3, o4, o5).getElementsAsArray());
	}

	zip6<U, V, W, X, Y, Z>(
		o1: MonadicSet<U>,
		o2: MonadicSet<V>,
		o3: MonadicSet<W>,
		o4: MonadicSet<X>,
		o5: MonadicSet<Y>,
		o6: MonadicSet<Z>,
	): LazyMonadicSet<[T, U, V, W, X, Y, Z]> {
		return new LazyMonadicSet(() => this.getResolved().zip6(o1, o2, o3, o4, o5, o6).getElementsAsArray());
	}

	zipN<U>(...others: Array<MonadicSet<U>>): LazyMonadicSet<[T, ...U[]]> {
		return new LazyMonadicSet(() => this.getResolved().zipN(...others).getElementsAsArray());
	}

	intersect(...others: Array<MonadicSet<T>>): LazyMonadicSet<T> {
		return new LazyMonadicSet(() => this.getResolved().intersect(...others).getElementsAsArray());
	}

	union<U>(...others: Array<MonadicSet<U>>): LazyMonadicSet<T | U> {
		return new LazyMonadicSet(() => this.getResolved().union(...others).getElementsAsArray());
	}

	difference(...others: Array<MonadicSet<T>>): LazyMonadicSet<T> {
		return new LazyMonadicSet(() => this.getResolved().difference(...others).getElementsAsArray());
	}

	symmetricDifference(other: MonadicSet<T>): LazyMonadicSet<T> {
		return new LazyMonadicSet(() => this.getResolved().symmetricDifference(other).getElementsAsArray());
	}

	protected values(): IterableIterator<T> {
		return this.getResolved()[Symbol.iterator]();
	}

	protected getResolved(): MonadicSet<T> {
		if (this.resolved === undefined) {
			this.resolved = new MonadicSet(this.f());
		}

		return this.resolved;
	}
}
