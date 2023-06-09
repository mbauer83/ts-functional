import {type EqualityComparable} from '@mbauer83/ts-utils/src/comparison/equality.js';
import {type Monad} from './Monad.js';

export class Reader<in E, out T> implements Monad<T>, EqualityComparable<Reader<E, T>> {
	constructor(public readonly f: (x: E) => T) {}

	equals(other: Reader<E, T>): boolean {
		return this.f.toString() === other.f.toString();
	}

	map<U>(f: (x: T) => U): Reader<E, U> {
		return new Reader((x: E) => f(this.read(x)));
	}

	apply<U>(f: Reader<E, (x: T) => U>): Reader<E, U> {
		return new Reader((x: E) => f.read(x)(this.read(x)));
	}

	pure<U>(x: U): Reader<E, U> {
		return new Reader((_: E) => x);
	}

	flatMap<U>(f: (x: T) => Reader<E, U>): Reader<E, U> {
		return new Reader((x: E) => f(this.read(x)).read(x));
	}

	fold<U>(f: (t: T) => U): Reader<E, U> {
		return new Reader((env: E) => f(this.read(env)));
	}

	zip<U>(other: Reader<E, U>): Reader<E, [T, U]> {
		return new Reader((env: E) => [this.read(env), other.read(env)]);
	}

	zip2<U, V>(o1: Reader<E, U>, o2: Reader<E, V>): Reader<E, [T, U, V]> {
		return new Reader((env: E) => [this.read(env), o1.read(env), o2.read(env)]);
	}

	zip3<U, V, W>(
		o1: Reader<E, U>,
		o2: Reader<E, V>,
		o3: Reader<E, W>,
	): Reader<E, [T, U, V, W]> {
		return new Reader((env: E) => [
			this.read(env),
			o1.read(env),
			o2.read(env),
			o3.read(env),
		]);
	}

	zip4<U, V, W, X>(
		o1: Reader<E, U>,
		o2: Reader<E, V>,
		o3: Reader<E, W>,
		o4: Reader<E, X>,
	): Reader<E, [T, U, V, W, X]> {
		return new Reader((env: E) => [
			this.read(env),
			o1.read(env),
			o2.read(env),
			o3.read(env),
			o4.read(env),
		]);
	}

	zip5<U, V, W, X, Y>(
		o1: Reader<E, U>,
		o2: Reader<E, V>,
		o3: Reader<E, W>,
		o4: Reader<E, X>,
		o5: Reader<E, Y>,
	): Reader<E, [T, U, V, W, X, Y]> {
		return new Reader((env: E) => [
			this.read(env),
			o1.read(env),
			o2.read(env),
			o3.read(env),
			o4.read(env),
			o5.read(env),
		]);
	}

	zip6<U, V, W, X, Y, Z>(
		o1: Reader<E, U>,
		o2: Reader<E, V>,
		o3: Reader<E, W>,
		o4: Reader<E, X>,
		o5: Reader<E, Y>,
		o6: Reader<E, Z>,
	): Reader<E, [T, U, V, W, X, Y, Z]> {
		return new Reader((evn: E) => [
			this.read(evn),
			o1.read(evn),
			o2.read(evn),
			o3.read(evn),
			o4.read(evn),
			o5.read(evn),
			o6.read(evn),
		]);
	}

	zipN<U>(...others: Array<Reader<E, U>>): Reader<E, [T, ...U[]]> {
		return new Reader((evn: E) => [
			this.read(evn),
			...others.map(o => o.read(evn)),
		]);
	}

	read(x: E): T {
		return this.f(x);
	}

	runWithGetter(f: () => E): T {
		return this.read(f());
	}

	combine<E2, T2>(other: Reader<E2, T2>): Reader<E & E2, [T, T2]> {
		return new Reader((env: E & E2) => [this.read(env), other.read(env)]);
	}
}
