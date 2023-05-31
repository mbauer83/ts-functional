import {type EqualityComparable} from '@mbauer83/ts-utils/src/comparison/equality.js';
import {everyFilterable, type Filterable, noneFilterable, someFilterable} from './Filterable.js';
import {type Monad} from './Monad.js';
import {evaluatePredicate, type PredicateOrFn} from './Predicate.js';

export class MonadicSet<out T> implements Monad<T>, EqualityComparable<MonadicSet<T>>, Filterable<T> {
	protected readonly innerSet: Set<T>;
	protected readonly size: number;

	constructor(elements: T[] = []) {
		this.innerSet = new Set(elements);
		this.size = this.innerSet.size;
	}

	filter(p: PredicateOrFn<T>): MonadicSet<T> {
		const newElements = Array.from(this.innerSet.values()).filter(element => evaluatePredicate(p, element));
		return new MonadicSet(newElements);
	}

	every(p: PredicateOrFn<T>): boolean {
		return everyFilterable(this, p);
	}

	some(p: PredicateOrFn<T>): boolean {
		return someFilterable(this, p);
	}

	none(p: PredicateOrFn<T>): boolean {
		return noneFilterable(this, p);
	}

	getSize(): number {
		return this.size;
	}

	[Symbol.iterator](): IterableIterator<T> {
		return this.innerSet[Symbol.iterator]();
	}

	forEach(callbackfn: (value: T, value2: T, set: Set<T>) => void, thisArg?: any): void {
		// `forEach` here is a custom method
		// eslint-disable-next-line unicorn/no-array-for-each, unicorn/no-array-callback-reference, unicorn/no-array-method-this-argument
		this.innerSet.forEach(callbackfn, thisArg);
	}

	has(value: T): boolean {
		return this.innerSet.has(value);
	}

	equals(other: MonadicSet<T>): boolean {
		if (this.size !== other.getSize()) {
			return false;
		}

		let equal = true;
		for (const thisValue of this) {
			if (!other.has(thisValue)) {
				equal = false;
				break;
			}
		}

		return equal;
	}

	add(value: T): this {
		const prototype = Object.getPrototypeOf(this) as this;
		const ctor = (ts: T[]): this => prototype.constructor(ts) as this;
		const array = this.getElementsAsArray();
		return ctor([...array, value]);
	}

	delete(value: T): this {
		const prototype = Object.getPrototypeOf(this) as this;
		const ctor = (ts: T[]): this => prototype.constructor(ts) as this;
		const newArray: T[] = [];
		for (const thisValue of this) {
			if (thisValue === value) {
				continue;
			}

			newArray.push(thisValue);
		}

		return ctor(newArray);
	}

	getElementsAsArray(): T[] {
		return Array.from(this.values());
	}

	pure<U>(element: U): MonadicSet<U> {
		return new MonadicSet([element]);
	}

	map<U>(f: (x: T) => U): MonadicSet<U> {
		const mapped = new MonadicSet<U>();
		// `forEach` here is a custom method
		// eslint-disable-next-line unicorn/no-array-for-each
		this.forEach((value: T) => {
			const mappedValue = f(value);
			if (mapped.has(mappedValue)) {
				return;
			}

			mapped.add(mappedValue);
		});
		return mapped;
	}

	apply<U>(f: MonadicSet<(x: T) => U>): MonadicSet<U> {
		const all = new MonadicSet<U>();
		// `forEach` here is a custom method
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

	flatMap<U>(f: (x: T) => MonadicSet<U>): MonadicSet<U> {
		const allValues = new MonadicSet<U>();
		// `forEach` here is a custom method
		// eslint-disable-next-line unicorn/no-array-for-each
		this.forEach((value: T) => {
			const mappedValues = f(value);
			for (const mappedValue of mappedValues.getElementsAsArray()) {
				if (allValues.has(mappedValue)) {
					continue;
				}

				allValues.add(mappedValue);
			}
		});
		return allValues;
	}

	zip<U>(other: MonadicSet<U>): MonadicSet<[T, U]> {
		const shorterLength = this.size < other.getSize() ? this.size : other.getSize();
		const thisArray = this.getElementsAsArray();
		const otherArray = other.getElementsAsArray();
		const zipped = new MonadicSet<[T, U]>();
		for (let i = 0; i < shorterLength; i++) {
			const pair: [T, U] = [thisArray[i], otherArray[i]];
			zipped.add(pair);
		}

		return zipped;
	}

	zip2<U, V>(o1: MonadicSet<U>, o2: MonadicSet<V>): MonadicSet<[T, U, V]> {
		const shortestLength = Math.min(this.size, o1.getSize(), o2.getSize());
		const thisArray = this.getElementsAsArray();
		const other1Array = o1.getElementsAsArray();
		const other2Array = o2.getElementsAsArray();
		const zipped = new MonadicSet<[T, U, V]>();
		for (let i = 0; i < shortestLength; i++) {
			const pair: [T, U, V] = [thisArray[i], other1Array[i], other2Array[i]];
			zipped.add(pair);
		}

		return zipped;
	}

	zip3<U, V, W>(o1: MonadicSet<U>, o2: MonadicSet<V>, o3: MonadicSet<W>): MonadicSet<[T, U, V, W]> {
		const shortestLength = Math.min(this.size, o1.getSize(), o2.getSize(), o3.getSize());
		const thisArray = this.getElementsAsArray();
		const other1Array = o1.getElementsAsArray();
		const other2Array = o2.getElementsAsArray();
		const other3Array = o3.getElementsAsArray();
		const zipped = new MonadicSet<[T, U, V, W]>();
		for (let i = 0; i < shortestLength; i++) {
			const pair: [T, U, V, W] = [thisArray[i], other1Array[i], other2Array[i], other3Array[i]];
			zipped.add(pair);
		}

		return zipped;
	}

	zip4<U, V, W, X>(o1: MonadicSet<U>, o2: MonadicSet<V>, o3: MonadicSet<W>, o4: MonadicSet<X>): MonadicSet<[T, U, V, W, X]> {
		const shortestLength = Math.min(this.size, o1.getSize(), o2.getSize(), o3.getSize(), o4.getSize());
		const thisArray = this.getElementsAsArray();
		const other1Array = o1.getElementsAsArray();
		const other2Array = o2.getElementsAsArray();
		const other3Array = o3.getElementsAsArray();
		const other4Array = o4.getElementsAsArray();
		const zipped = new MonadicSet<[T, U, V, W, X]>();
		for (let i = 0; i < shortestLength; i++) {
			const pair: [T, U, V, W, X] = [thisArray[i], other1Array[i], other2Array[i], other3Array[i], other4Array[i]];
			zipped.add(pair);
		}

		return zipped;
	}

	zip5<U, V, W, X, Y>(
		o1: MonadicSet<U>,
		o2: MonadicSet<V>,
		o3: MonadicSet<W>,
		o4: MonadicSet<X>,
		o5: MonadicSet<Y>,
	): MonadicSet<[T, U, V, W, X, Y]> {
		const shortestLength = Math.min(this.size, o1.getSize(), o2.getSize(), o3.getSize(), o4.getSize(), o5.getSize());
		const thisArray = this.getElementsAsArray();
		const other1Array = o1.getElementsAsArray();
		const other2Array = o2.getElementsAsArray();
		const other3Array = o3.getElementsAsArray();
		const other4Array = o4.getElementsAsArray();
		const other5Array = o5.getElementsAsArray();
		const zipped = new MonadicSet<[T, U, V, W, X, Y]>();
		for (let i = 0; i < shortestLength; i++) {
			const pair: [T, U, V, W, X, Y] = [
				thisArray[i],
				other1Array[i],
				other2Array[i],
				other3Array[i],
				other4Array[i],
				other5Array[i],
			];
			zipped.add(pair);
		}

		return zipped;
	}

	zip6<U, V, W, X, Y, Z>(
		o1: MonadicSet<U>,
		o2: MonadicSet<V>,
		o3: MonadicSet<W>,
		o4: MonadicSet<X>,
		o5: MonadicSet<Y>,
		o6: MonadicSet<Z>,
	): MonadicSet<[T, U, V, W, X, Y, Z]> {
		const shortestLength = Math.min(this.size, o1.getSize(), o2.getSize(), o3.getSize(), o4.getSize(), o5.getSize(), o6.getSize());
		const thisArray = this.getElementsAsArray();
		const other1Array = o1.getElementsAsArray();
		const other2Array = o2.getElementsAsArray();
		const other3Array = o3.getElementsAsArray();
		const other4Array = o4.getElementsAsArray();
		const other5Array = o5.getElementsAsArray();
		const other6Array = o6.getElementsAsArray();
		const zipped = new MonadicSet<[T, U, V, W, X, Y, Z]>();
		for (let i = 0; i < shortestLength; i++) {
			const pair: [T, U, V, W, X, Y, Z] = [
				thisArray[i],
				other1Array[i],
				other2Array[i],
				other3Array[i],
				other4Array[i],
				other5Array[i],
				other6Array[i],
			];
			zipped.add(pair);
		}

		return zipped;
	}

	zipN<U>(...others: Array<MonadicSet<U>>): MonadicSet<[T, ...U[]]> {
		const shortestLength = Math.min(...others.map(o => o.getSize()));
		const thisArray = this.getElementsAsArray();
		const otherArrays = others.map(o => o.getElementsAsArray());
		const zipped = new MonadicSet<[T, ...U[]]>();
		for (let i = 0; i < shortestLength; i++) {
			const pair: [T, ...U[]] = [thisArray[i], ...otherArrays.map(a => a[i])];
			zipped.add(pair);
		}

		return zipped;
	}

	intersect(...others: Array<MonadicSet<T>>): MonadicSet<T> {
		const intersection = new MonadicSet<T>();
		for (const element of this) {
			if (others.every(other => other.has(element))) {
				intersection.add(element);
			}
		}

		return intersection;
	}

	union<U>(...others: Array<MonadicSet<U>>): MonadicSet<T | U> {
		const union = new MonadicSet<T | U>(this.getElementsAsArray());
		for (const other of others) {
			for (const element of other) {
				if (!union.has(element)) {
					union.add(element);
				}
			}
		}

		return union;
	}

	difference(...others: Array<MonadicSet<T>>): MonadicSet<T> {
		const difference = new MonadicSet<T>(this.getElementsAsArray());
		for (const other of others) {
			for (const element of other) {
				if (difference.has(element)) {
					difference.delete(element);
				}
			}
		}

		return difference;
	}

	symmetricDifference(other: MonadicSet<T>): MonadicSet<T> {
		return this.union<T>(other).difference(this.intersect(other));
	}

	clone(): MonadicSet<T> {
		return new MonadicSet<T>(this.getElementsAsArray());
	}

	protected values(): IterableIterator<T> {
		return this.innerSet.values();
	}
}
