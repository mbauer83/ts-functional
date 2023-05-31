import {type EqualityComparable} from '@mbauer83/ts-utils/src/comparison/equality.js';
import {type HasCount} from '@mbauer83/ts-utils/src/size/HasCount.js';
import {everyFilterable, type Filterable, noneFilterable, someFilterable} from './Filterable.js';
import {type Monad} from './Monad.js';
import {type PredicateOrFn, evaluatePredicate} from './Predicate.js';
import {None, type Optional, Some} from './Optional.js';

export class MonadicStack<out T> implements Monad<T>, EqualityComparable<MonadicStack<T>>, Filterable<T>, HasCount {
	static empty<T>(): MonadicStack<T> {
		return new MonadicStack();
	}

	static return<T>(t: T): MonadicStack<T> {
		return new MonadicStack(t);
	}

	static fromArray<T>(array: T[]): MonadicStack<T> {
		return new MonadicStack(...array);
	}

	static fromIterable<T>(iter: Iterable<T>): MonadicStack<T> {
		return new MonadicStack(...Array.from(iter));
	}

	public readonly stack: T[];

	constructor(...stack: T[]) {
		this.stack = stack;
	}

	equals(other: MonadicStack<T>): boolean {
		return this.stack.toString() === other.stack.toString();
	}

	toArray(): T[] {
		return this.stack;
	}

	toIterable(): Iterable<T> {
		return this.stack;
	}

	getSize(): number {
		return this.stack.length;
	}

	filter(p: PredicateOrFn<T>): MonadicStack<T> {
		return new MonadicStack(...this.stack.filter(entry => evaluatePredicate(p, entry)));
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

	peek(): Optional<T> {
		if (this.stack.length > 0) {
			return new Some<T>(this.stack[0]);
		}

		return None.for<T>();
	}

	pop(): [Optional<T>, MonadicStack<T>] {
		if (this.stack.length > 0) {
			const [head, ...tail] = this.stack;
			return [new Some<T>(head), new MonadicStack<T>(...tail)];
		}

		return [None.for<T>(), this];
	}

	push(...ts: T[]): MonadicStack<T> {
		return new MonadicStack(...ts, ...this.stack);
	}

	map<U>(f: (x: T) => U): MonadicStack<U> {
		return new MonadicStack(...this.stack.map(t => f(t)));
	}

	apply<U>(f: MonadicStack<(x: T) => U>): MonadicStack<U> {
		return new MonadicStack(...f.stack.map(g => g(this.stack[0])));
	}

	pure<U>(x: U): MonadicStack<U> {
		return new MonadicStack(x);
	}

	flatMap<U>(f: (x: T) => MonadicStack<U>): MonadicStack<U> {
		const mapped = this.stack.map(t => f(t));
		const reduced = mapped.reduce<U[]>((acc, cur) => acc.concat(cur.stack), []);
		return new MonadicStack<U>(...reduced);
	}

	zip<U>(other: MonadicStack<U>): MonadicStack<[T, U]> {
		const minLength = Math.min(this.stack.length, other.stack.length);
		const zipped = Array.from({length: minLength});
		for (let i = 0; i < minLength; i++) {
			zipped[i] = [this.stack[i], other.stack[i]];
		}

		return new MonadicStack(...(zipped as Array<[T, U]>));
	}

	zip2<U, V>(o1: MonadicStack<U>, o2: MonadicStack<V>): MonadicStack<[T, U, V]> {
		const minLength = Math.min(this.stack.length, o1.stack.length, o2.stack.length);
		const zipped = Array.from({length: minLength});
		for (let i = 0; i < minLength; i++) {
			zipped[i] = [this.stack[i], o1.stack[i], o2.stack[i]];
		}

		return new MonadicStack(...(zipped as Array<[T, U, V]>));
	}

	zip3<U, V, W>(o1: MonadicStack<U>, o2: MonadicStack<V>, o3: MonadicStack<W>): MonadicStack<[T, U, V, W]> {
		const minLength = Math.min(this.stack.length, o1.stack.length, o2.stack.length, o3.stack.length);
		const zipped = Array.from({length: minLength});
		for (let i = 0; i < minLength; i++) {
			zipped[i] = [this.stack[i], o1.stack[i], o2.stack[i], o3.stack[i]];
		}

		return new MonadicStack(...(zipped as Array<[T, U, V, W]>));
	}

	zip4<U, V, W, X>(o1: MonadicStack<U>, o2: MonadicStack<V>, o3: MonadicStack<W>, o4: MonadicStack<X>): MonadicStack<[T, U, V, W, X]> {
		const minLength = Math.min(this.stack.length, o1.stack.length, o2.stack.length, o3.stack.length, o4.stack.length);
		const zipped = Array.from({length: minLength});
		for (let i = 0; i < minLength; i++) {
			zipped[i] = [this.stack[i], o1.stack[i], o2.stack[i], o3.stack[i], o4.stack[i]];
		}

		return new MonadicStack(...(zipped as Array<[T, U, V, W, X]>));
	}

	zip5<U, V, W, X, Y>(
		o1: MonadicStack<U>,
		o2: MonadicStack<V>,
		o3: MonadicStack<W>,
		o4: MonadicStack<X>,
		o5: MonadicStack<Y>,
	): MonadicStack<[T, U, V, W, X, Y]> {
		const minLength = Math.min(this.stack.length, o1.stack.length, o2.stack.length, o3.stack.length, o4.stack.length, o5.stack.length);
		const zipped = Array.from({length: minLength});
		for (let i = 0; i < minLength; i++) {
			zipped[i] = [this.stack[i], o1.stack[i], o2.stack[i], o3.stack[i], o4.stack[i], o5.stack[i]];
		}

		return new MonadicStack(...(zipped as Array<[T, U, V, W, X, Y]>));
	}

	zip6<U, V, W, X, Y, Z>(
		o1: MonadicStack<U>,
		o2: MonadicStack<V>,
		o3: MonadicStack<W>,
		o4: MonadicStack<X>,
		o5: MonadicStack<Y>,
		o6: MonadicStack<Z>,
	): MonadicStack<[T, U, V, W, X, Y, Z]> {
		const minLength = Math.min(this.stack.length, o1.stack.length, o2.stack.length, o3.stack.length, o4.stack.length, o5.stack.length, o6.stack.length);
		const zipped = Array.from({length: minLength});
		for (let i = 0; i < minLength; i++) {
			zipped[i] = [this.stack[i], o1.stack[i], o2.stack[i], o3.stack[i], o4.stack[i], o5.stack[i], o6.stack[i]];
		}

		return new MonadicStack(...(zipped as Array<[T, U, V, W, X, Y, Z]>));
	}

	zipN<U>(...others: Array<MonadicStack<U>>): MonadicStack<[T, ...U[]]> {
		const minLength = others.reduce((acc, cur) => Math.min(acc, cur.stack.length), this.stack.length);
		const zipped = Array.from({length: minLength});
		for (let i = 0; i < minLength; i++) {
			zipped[i] = [this.stack[i], ...others.map(o => o.stack[i])];
		}

		return new MonadicStack(...(zipped as Array<[T, ...U[]]>));
	}
}
