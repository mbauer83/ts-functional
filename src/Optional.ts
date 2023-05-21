import {type EqualityComparable} from '@mbauer83/ts-utils/src/comparison/equality.js';
import {QueriedValueNotPresent, type Throwable} from './definitions.js';
import {type Either, Left, Right} from './Either.js';
import {type Monad} from './Monad.js';

export interface Optional<T> extends Monad<T>, EqualityComparable<Optional<T>> {
	map<U>(f: (x: T) => U): Optional<U>;
	apply<U>(f: Optional<(x: T) => U>): Optional<U>;
	pure<U>(x: U): Optional<U>;
	flatMap<U>(f: (x: T) => Optional<U>): Optional<U>;
	fold<U>(none: () => U, some: (t: T) => U): U;
	zip<U>(other: Optional<U>): Optional<[T, U]>;
	zip2<U, V>(o1: Optional<U>, o2: Optional<V>): Optional<[T, U, V]>;
	zip3<U, V, W>(
		o1: Optional<U>,
		o2: Optional<V>,
		o3: Optional<W>
	): Optional<[T, U, V, W]>;
	zip4<U, V, W, X>(
		o1: Optional<U>,
		o2: Optional<V>,
		o3: Optional<W>,
		o4: Optional<X>
	): Optional<[T, U, V, W, X]>;
	zip5<U, V, W, X, Y>(
		o1: Optional<U>,
		o2: Optional<V>,
		o3: Optional<W>,
		o4: Optional<X>,
		o5: Optional<Y>
	): Optional<[T, U, V, W, X, Y]>;
	zip6<U, V, W, X, Y, Z>(
		o1: Optional<U>,
		o2: Optional<V>,
		o3: Optional<W>,
		o4: Optional<X>,
		o5: Optional<Y>,
		o6: Optional<Z>
	): Optional<[T, U, V, W, X, Y, Z]>;
	zipN<U>(others: Array<Optional<U>>): Optional<[T, ...U[]]>;
	getOrElse(x: T): T;
	getOrThrow(t: Throwable): T;
	getOrQueriedValueNotPresent(message?: string): Either<QueriedValueNotPresent, T>;
	isSome(): this is Some<T>;
	isNone(): this is None<T>;

	match<U>(some: (t: T) => U, none: () => U): U;
}

export class None<T> implements Optional<T> {
	equals(other: Optional<T>): boolean {
		return other.isNone();
	}

	map<U>(f: (x: T) => U): Optional<U> {
		return this as unknown as None<U>;
	}

	apply<U>(f: Optional<(x: T) => U>): Optional<U> {
		return new None<U>();
	}

	pure<U>(x: U): Optional<U> {
		return new Some<U>(x);
	}

	flatMap<U>(f: (x: T) => Optional<U>): Optional<U> {
		return new None<U>();
	}

	fold<U>(none: () => U, some: (t: T) => U): U {
		return none();
	}

	zip<U>(other: Optional<U>): Optional<[T, U]> {
		return new None<[T, U]>();
	}

	zip2<U, V>(o1: Optional<U>, o2: Optional<V>): Optional<[T, U, V]> {
		return new None<[T, U, V]>();
	}

	zip3<U, V, W>(
		o1: Optional<U>,
		o2: Optional<V>,
		o3: Optional<W>,
	): Optional<[T, U, V, W]> {
		return new None<[T, U, V, W]>();
	}

	zip4<U, V, W, X>(
		o1: Optional<U>,
		o2: Optional<V>,
		o3: Optional<W>,
		o4: Optional<X>,
	): Optional<[T, U, V, W, X]> {
		return new None<[T, U, V, W, X]>();
	}

	zip5<U, V, W, X, Y>(
		o1: Optional<U>,
		o2: Optional<V>,
		o3: Optional<W>,
		o4: Optional<X>,
		o5: Optional<Y>,
	): Optional<[T, U, V, W, X, Y]> {
		return new None<[T, U, V, W, X, Y]>();
	}

	zip6<U, V, W, X, Y, Z>(
		o1: Optional<U>,
		o2: Optional<V>,
		o3: Optional<W>,
		o4: Optional<X>,
		o5: Optional<Y>,
		o6: Optional<Z>,
	): Optional<[T, U, V, W, X, Y, Z]> {
		return new None<[T, U, V, W, X, Y, Z]>();
	}

	zipN<U>(others: Array<Optional<U>>): Optional<[T, ...U[]]> {
		return new None<[T, ...U[]]>();
	}

	getOrElse(x: T): T {
		return x;
	}

	getOrThrow(t: Throwable): T {
		if (typeof t === 'function') {
			t = t();
		}

		if (typeof t === 'string') {
			throw new TypeError(t);
		}

		throw t;
	}

	getOrQueriedValueNotPresent(message?: string): Either<QueriedValueNotPresent, T> {
		return new Left<QueriedValueNotPresent, T>(new QueriedValueNotPresent(message ?? 'Optional::getOrQueriedValueNotPresent'));
	}

	isSome(): this is Some<T> {
		return !this.isNone();
	}

	isNone(): this is None<T> {
		return true;
	}

	match<U>(some: (t: T) => U, none: () => U): U {
		return none();
	}
}

export class Some<T> implements Optional<T> {
	constructor(private readonly value: T) {}

	equals(other: Optional<T>): boolean {
		if (other.isNone()) {
			return false;
		}

		return this.value === (other as Some<T>).getOrThrow('Cannot get value from None.');
	}

	map<U>(f: (x: T) => U): Optional<U> {
		return new Some<U>(f(this.value));
	}

	apply<U>(f: Optional<(x: T) => U>): Optional<U> {
		return f.map(g => g(this.value));
	}

	pure<U>(x: U): Optional<U> {
		return new Some<U>(x);
	}

	flatMap<U>(f: (x: T) => Optional<U>): Optional<U> {
		return f(this.value);
	}

	fold<U>(none: () => U, some: (t: T) => U): U {
		return some(this.value);
	}

	zip<U>(other: Optional<U>): Optional<[T, U]> {
		return other.map(o => [this.value, o]);
	}

	zip2<U, V>(o1: Optional<U>, o2: Optional<V>): Optional<[T, U, V]> {
		return o1.flatMap(o1 => o2.map(o2 => [this.value, o1, o2]));
	}

	zip3<U, V, W>(
		o1: Optional<U>,
		o2: Optional<V>,
		o3: Optional<W>,
	): Optional<[T, U, V, W]> {
		return o1.flatMap(o1 =>
			o2.flatMap(o2 => o3.map(o3 => [this.value, o1, o2, o3])),
		);
	}

	zip4<U, V, W, X>(
		o1: Optional<U>,
		o2: Optional<V>,
		o3: Optional<W>,
		o4: Optional<X>,
	): Optional<[T, U, V, W, X]> {
		return o1.flatMap(o1 =>
			o2.flatMap(o2 =>
				o3.flatMap(o3 => o4.map(o4 => [this.value, o1, o2, o3, o4])),
			),
		);
	}

	zip5<U, V, W, X, Y>(
		o1: Optional<U>,
		o2: Optional<V>,
		o3: Optional<W>,
		o4: Optional<X>,
		o5: Optional<Y>,
	): Optional<[T, U, V, W, X, Y]> {
		return o1.flatMap(o1 =>
			o2.flatMap(o2 =>
				o3.flatMap(o3 =>
					o4.flatMap(o4 => o5.map(o5 => [this.value, o1, o2, o3, o4, o5])),
				),
			),
		);
	}

	zip6<U, V, W, X, Y, Z>(
		o1: Optional<U>,
		o2: Optional<V>,
		o3: Optional<W>,
		o4: Optional<X>,
		o5: Optional<Y>,
		o6: Optional<Z>,
	): Optional<[T, U, V, W, X, Y, Z]> {
		return o1.flatMap(o1 =>
			o2.flatMap(o2 =>
				o3.flatMap(o3 =>
					o4.flatMap(o4 =>
						o5.flatMap(o5 => o6.map(o6 => [this.value, o1, o2, o3, o4, o5, o6])),
					),
				),
			),
		);
	}

	zipN<U>(others: Array<Optional<U>>): Optional<[T, ...U[]]> {
		return others.reduce(
			(acc, o) => acc.flatMap(a => o.map(b => [...a, b])),
			this.map(t => [t] as [T, ...U[]]),
		);
	}

	getOrElse(x: T): T {
		return this.value;
	}

	getOrThrow(t: Throwable): T {
		return this.value;
	}

	getOrQueriedValueNotPresent(message?: string): Either<QueriedValueNotPresent, T> {
		return new Right<QueriedValueNotPresent, T>(this.value);
	}

	isSome(): this is Some<T> {
		return true;
	}

	isNone(): this is None<T> {
		return !this.isSome();
	}

	match<U>(some: (t: T) => U, none: () => U): U {
		return some(this.value);
	}
}

export function optionalFromValue<T>(t: T | undefined): Optional<T> {
	return (t === undefined || t === null) ? new None<T>() : new Some<T>(t);
}
