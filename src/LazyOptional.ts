import {type QueriedValueNotPresent, type Throwable} from './definitions.js';
import {type Either} from './Either.js';
import {None, type Optional, Some} from './Optional.js';

export class LazyOptional<T> implements Optional<T> {
	private resolved: Optional<T> | undefined = undefined;
	private readonly argsProvider: () => any[];
	constructor(private readonly fn: (args: any[]) => Optional<T>, argsProvider: () => any[] = () => []) {
		this.argsProvider = argsProvider;
	}

	getResolved(): Optional<T> {
		if (this.resolved === null) {
			this.resolve();
		}

		return this.resolved!;
	}

	map<U>(f: (x: T) => U): LazyOptional<U> {
		return new LazyOptional<U>(() => this.getResolved().map<U>(t => f(t)));
	}

	pure<U>(x: U): LazyOptional<U> {
		const fn: (args: any[]) => Optional<U> = () => new Some<U>(x);
		return new LazyOptional<U>(fn);
	}

	apply<U>(f: Optional<(x: T) => U>): LazyOptional<U> {
		const resolver = () => {
			const resolved = this.getResolved();
			const fmapped = f.match<Optional<U>>(
				g => resolved.map<U>(t => g(t)),
				() => new None<U>() as Optional<U>,
			);
			return fmapped;
		};

		return new LazyOptional<U>(resolver);
	}

	flatMap<U>(f: (x: T) => Optional<U>): LazyOptional<U> {
		return new LazyOptional<U>(() => this.getResolved().flatMap<U>(t => f(t)), () => []);
	}

	fold<U>(f: () => U, g: (x: T) => U): U {
		return this.getResolved().fold(f, g);
	}

	zip<U>(other: Optional<U>): LazyOptional<[T, U]> {
		return new LazyOptional<[T, U]>(() => this.getResolved().zip<U>(other), () => []);
	}

	zip2<U, V>(o1: Optional<U>, o2: Optional<V>): LazyOptional<[T, U, V]> {
		return new LazyOptional<[T, U, V]>(() => this.getResolved().zip2<U, V>(o1, o2), () => []);
	}

	zip3<U, V, W>(o1: Optional<U>, o2: Optional<V>, o3: Optional<W>): LazyOptional<[T, U, V, W]> {
		return new LazyOptional<[T, U, V, W]>(() => this.getResolved().zip3<U, V, W>(o1, o2, o3), () => []);
	}

	zip4<U, V, W, X>(
		o1: Optional<U>,
		o2: Optional<V>,
		o3: Optional<W>,
		o4: Optional<X>,
	): LazyOptional<[T, U, V, W, X]> {
		return new LazyOptional<[T, U, V, W, X]>(() => this.getResolved().zip4<U, V, W, X>(o1, o2, o3, o4), () => []);
	}

	zip5<U, V, W, X, Y>(
		o1: Optional<U>,
		o2: Optional<V>,
		o3: Optional<W>,
		o4: Optional<X>,
		o5: Optional<Y>,
	): LazyOptional<[T, U, V, W, X, Y]> {
		return new LazyOptional<[T, U, V, W, X, Y]>(() => this.getResolved().zip5<U, V, W, X, Y>(o1, o2, o3, o4, o5), () => []);
	}

	zip6<U, V, W, X, Y, Z>(
		o1: Optional<U>,
		o2: Optional<V>,
		o3: Optional<W>,
		o4: Optional<X>,
		o5: Optional<Y>,
		o6: Optional<Z>,
	): LazyOptional<[T, U, V, W, X, Y, Z]> {
		return new LazyOptional<[T, U, V, W, X, Y, Z]>(() => this.getResolved().zip6<U, V, W, X, Y, Z>(o1, o2, o3, o4, o5, o6), () => []);
	}

	zipN<U>(os: Array<Optional<U>>): LazyOptional<[T, ...U[]]> {
		return new LazyOptional<[T, ...U[]]>(() => this.getResolved().zipN(os), () => []);
	}

	getOrElse(x: T): T {
		return this.getResolved().getOrElse(x);
	}

	getOrThrow(t: Throwable): T {
		return this.getResolved().getOrThrow(t);
	}

	getOrQueriedValueNotPresent(message?: string): Either<QueriedValueNotPresent, T> {
		return this.getResolved().getOrQueriedValueNotPresent(message);
	}

	isSome(): this is Some<T> {
		return this.getResolved().isSome();
	}

	isNone(): this is None<T> {
		return this.getResolved().isNone();
	}

	equals(other: Optional<T>): boolean {
		return this.getResolved().equals(other);
	}

	match<U>(some: (t: T) => U, none: () => U): U {
		return this.getResolved().match(some, none);
	}

	private resolve(): void {
		this.resolved = this.fn(this.argsProvider());
	}
}
