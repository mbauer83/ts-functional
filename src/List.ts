import {type EqualityComparable} from '@mbauer83/ts-utils/src/comparison/equality.js';
import {type HasCount} from '@mbauer83/ts-utils/src/size/HasCount.js';
import {type Monad} from './Monad.js';
import {type Monoid} from './Monoid.js';
import {everyFilterable, type Filterable, noneFilterable, someFilterable} from './Filterable.js';
import {type Predicate} from './Predicate.js';

export class List<T> implements Monad<T>, Monoid<List<T>>, Filterable<T>, EqualityComparable<List<T>>, HasCount {
	static empty<T2>(): List<T2> {
		return new List<T2>([]);
	}

	static combine<U>(l: List<U>, r: List<U>): List<U> {
		return l.concat(r);
	}

	constructor(private readonly list: T[]) {}

	getSize(): number {
		return this.list.length;
	}

	equals(other: List<T>, comparator: (a: T, b: T) => boolean = (a, b) => a === b): boolean {
		if (this.getSize() !== other.getSize()) {
			return false;
		}

		for (let i = 0; i < this.getSize(); i++) {
			if (!comparator(this.list[i], other.list[i])) {
				return false;
			}
		}

		return true;
	}

	[Symbol.iterator](): Iterator<T> {
		return this.list[Symbol.iterator]();
	}

	forEach(callbackFn: (value: T, index: number, array: T[]) => void, thisArg?: any): void {
		for (let i = 0; i < this.list.length; i++) {
			callbackFn(this.list[i], i, this.list);
		}
	}

	hasElementForPredicate(predicate: Predicate<T>): boolean {
		for (const thisValue of this) {
			if (predicate.evaluate(thisValue)) {
				return true;
			}
		}

		return false;
	}

	id(): List<T> {
		return List.empty<T>();
	}

	getAsArray(): T[] {
		return this.list;
	}

	append(other: List<T>): List<T> {
		return new List([...this.list, ...other.list]);
	}

	push(...others: T[]): List<T> {
		return new List([...this.list, ...others]);
	}

	prepend(other: List<T>): List<T> {
		return new List([...other.list, ...this.list]);
	}

	unshift(...others: T[]): List<T> {
		return new List([...others, ...this.list]);
	}

	slice(start: number, end: number): List<T> {
		return new List(this.list.slice(start, end));
	}

	splice(start: number, deleteCount: number, ...items: T[]): List<T> {
		const newArray = [...this.list];
		newArray.splice(start, deleteCount, ...items);
		return new List(newArray);
	}

	orderBy(comparator: (a: T, b: T) => -1 | 0 | 1): List<T> {
		return new List([...this.list].sort(comparator));
	}

	orderByInverse(comparator: (a: T, b: T) => -1 | 0 | 1): List<T> {
		return new List([...this.list].sort((a, b) => comparator(a, b) * -1));
	}

	reduce<U>(reducer: (acc: U, t: T) => U, initial: U): U {
		return this.list.reduce((u, t, _) => reducer(u, t), initial);
	}

	filter(p: Predicate<T>): List<T> {
		const newArray: T[] = [];
		for (const element of this.list) {
			if (p.evaluate(element)) {
				newArray.push(element);
			}
		}

		return new List(newArray);
	}

	every(p: Predicate<T>): boolean {
		return everyFilterable(this, p);
	}

	some(p: Predicate<T>): boolean {
		return someFilterable(this, p);
	}

	none(p: Predicate<T>): boolean {
		return noneFilterable(this, p);
	}

	op = (a: List<T>, b: List<T>) => new List([...a.getAsArray(), ...b.getAsArray()]);

	concat(other: List<T>): List<T> {
		return this.op(this, other);
	}

	interleave(other: List<T>): List<T> {
		const newValues: T[] = [];
		const thisLength = this.getSize();
		const otherLength = other.getSize();
		const length = Math.max(thisLength, otherLength);
		for (let i = 0; i < length; i++) {
			if (i < thisLength) {
				newValues.push(this.list[i]);
			}

			if (i < otherLength) {
				newValues.push(other.list[i]);
			}
		}

		return new List(newValues);
	}

	map<U>(f: (x: T) => U): List<U> {
		return new List(this.list.map(t => f(t)));
	}

	apply<U>(ftu: List<(t: T) => U>): List<U> {
		return ftu.flatMap(f => this.map(f));
	}

	pure<U>(x: U): List<U> {
		return new List([x]);
	}

	flatMap<U>(f: (x: T) => List<U>): List<U> {
		return this.list.reduce((acc, t) => acc.concat(f(t)), List.empty<U>());
	}

	zip<U>(other: List<U>): List<[T, U]> {
		const newValues: Array<[T, U]> = [];
		const thisLength = this.getSize();
		const otherLength = other.getSize();
		const length = Math.min(thisLength, otherLength);
		for (let i = 0; i < length; i++) {
			newValues.push([this.list[i], other.valueAt(i)!]);
		}

		return new List(newValues);
	}

	zip2<U, U2>(
		o1: List<U>,
		o2: List<U2>,
	): List<[T, U, U2]> {
		const newValues: Array<[T, U, U2]> = [];
		const otherLength = o1.getSize();
		const otherLength2 = o2.getSize();
		const length = Math.min(this.getSize(), otherLength, otherLength2);
		for (let i = 0; i < length; i++) {
			const newValue: [T, U, U2] = [this.list[i], o1.valueAt(i)!, o2.valueAt(i)!];
			newValues.push(newValue);
		}

		return new List(newValues);
	}

	zip3<U, U2, U3>(
		o1: List<U>,
		o2: List<U2>,
		o3: List<U3>,
	): List<[T, U, U2, U3]> {
		const newValues: Array<[T, U, U2, U3]> = [];
		const otherLength = o1.getSize();
		const otherLength2 = o2.getSize();
		const otherLength3 = o3.getSize();
		const length = Math.min(this.getSize(), otherLength, otherLength2, otherLength3);
		for (let i = 0; i < length; i++) {
			const newValue: [T, U, U2, U3] = [this.list[i], o1.valueAt(i)!, o2.valueAt(i)!, o3.valueAt(i)!];
			newValues.push(newValue);
		}

		return new List(newValues);
	}

	zip4<U, U2, U3, U4>(
		o1: List<U>,
		o2: List<U2>,
		o3: List<U3>,
		o4: List<U4>,
	): List<
		[T, U, U2, U3, U4]
		> {
		const newValues: Array<[T, U, U2, U3, U4]> = [];
		const otherLength = o1.getSize();
		const otherLength2 = o2.getSize();
		const otherLength3 = o3.getSize();
		const otherLength4 = o4.getSize();
		const length = Math.min(this.getSize(), otherLength, otherLength2, otherLength3, otherLength4);
		for (let i = 0; i < length; i++) {
			const newValue: [T, U, U2, U3, U4] = [this.list[i], o1.valueAt(i)!, o2.valueAt(i)!, o3.valueAt(i)!, o4.valueAt(i)!];
			newValues.push(newValue);
		}

		return new List(newValues);
	}

	zip5<U, U2, U3, U4, U5>(
		o1: List<U>,
		o2: List<U2>,
		o3: List<U3>,
		o4: List<U4>,
		o5: List<U5>,
	): List<[T, U, U2, U3, U4, U5]> {
		const newValues: Array<[T, U, U2, U3, U4, U5]> = [];
		const otherLength = o1.getSize();
		const otherLength2 = o2.getSize();
		const otherLength3 = o3.getSize();
		const otherLength4 = o4.getSize();
		const otherLength5 = o5.getSize();
		const length = Math.min(this.getSize(), otherLength, otherLength2, otherLength3, otherLength4, otherLength5);
		for (let i = 0; i < length; i++) {
			const newValue: [T, U, U2, U3, U4, U5]
                = [this.list[i], o1.valueAt(i)!, o2.valueAt(i)!, o3.valueAt(i)!, o4.valueAt(i)!, o5.valueAt(i)!];
			newValues.push(newValue);
		}

		return new List(newValues);
	}

	zip6<U, U2, U3, U4, U5, U6>(
		o1: List<U>,
		o2: List<U2>,
		o3: List<U3>,
		o4: List<U4>,
		o5: List<U5>,
		o6: List<U6>,
	): List<[T, U, U2, U3, U4, U5, U6]> {
		const newValues: Array<[T, U, U2, U3, U4, U5, U6]> = [];
		const otherLength = o1.getSize();
		const otherLength2 = o2.getSize();
		const otherLength3 = o3.getSize();
		const otherLength4 = o4.getSize();
		const otherLength5 = o5.getSize();
		const otherLength6 = o6.getSize();
		const length = Math.min(this.getSize(), otherLength, otherLength2, otherLength3, otherLength4, otherLength5, otherLength6);
		for (let i = 0; i < length; i++) {
			const newValue: [T, U, U2, U3, U4, U5, U6]
                = [this.list[i], o1.valueAt(i)!, o2.valueAt(i)!, o3.valueAt(i)!, o4.valueAt(i)!, o5.valueAt(i)!, o6.valueAt(i)!];
			newValues.push(newValue);
		}

		return new List(newValues);
	}

	zipN<U>(...others: Array<List<U>>): List<Array<T | U>> {
		const newValues: Array<Array<T | U>> = [];
		const lengths = others.map(o => o.getSize()).concat(this.getSize());
		const length = Math.min(...lengths);
		for (let i = 0; i < length; i++) {
			const newValue: Array<T | U> = [this.list[i]];
			for (const other of others) {
				newValue.push(other.valueAt(i)!);
			}

			newValues.push(newValue);
		}

		return new List(newValues);
	}

	reverse(): List<T> {
		return new List(this.list.reverse());
	}

	valueAt(index: number): T | undefined {
		return this.list[index] ?? undefined;
	}
}
