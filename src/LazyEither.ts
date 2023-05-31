import {type QueriedValueNotPresent, type Throwable} from './definitions.js';
import {type Either, Right, Left} from './Either.js';

export class LazyEither<out L, out R> implements Either<L, R> {
	private resolved: undefined | Either<L, R> = undefined;
	constructor(private readonly getter: (...args: any[]) => Either<L, R>, private readonly getterArgsProvider: () => any[]) {}

	getResolved(): Either<L, R> {
		if (this.resolved === undefined) {
			this.resolve();
		}

		return this.resolved!;
	}

	isLeft(): boolean {
		return this.getResolved().isLeft();
	}

	isRight(): boolean {
		return this.getResolved().isRight();
	}

	map<U>(f: (x: R) => U): LazyEither<L, U> {
		const resolver = () => {
			const resolved = this.getResolved();
			const mapped = resolved.map(t => f(t));
			return mapped;
		};

		return new LazyEither<L, U>(resolver, () => []);
	}

	mapWithNewLeft<U, L2>(f: (x: R) => U, g: (x: any) => L2): LazyEither<L2, U> {
		const resolver = () => {
			const resolved = this.getResolved();
			const mapped = resolved.mapWithNewLeft(f, g);
			return mapped;
		};

		return new LazyEither<L2, U>(resolver, () => []);
	}

	withNewLeft<L2>(x: L2 | ((...args: any[]) => L2)): LazyEither<L2, R> {
		const resolver = () => {
			const resolved = this.getResolved();
			const mapped = resolved.withNewLeft(x);
			return mapped;
		};

		return new LazyEither<L2, R>(resolver, () => []);
	}

	apply<U>(f: Either<L, (x: R) => U>): LazyEither<L, U> {
		const resolver = () => {
			const resolved = this.getResolved();
			// eslint fails with stack size exceeded if we try to use Either::apply here
			const mapped = resolved.match(
				l => new Left<L, U>(l) as Either<L, U>,
				r => f.match(
					l => new Left<L, U>(l) as Either<L, U>,
					g => new Right<L, U>(g(r)) as Either<L, U>,
				),
			);
			return mapped;
		};

		return new LazyEither<L, U>(resolver, () => []);
	}

	pure<U>(x: U): LazyEither<L, U> {
		const rightCtor = (x: U[]) => new Right<L, U>(x[0]);
		return new LazyEither<L, U>(rightCtor, () => [x]);
	}

	flatMap<U, L2>(f: (x: R) => Either<L2, U>): LazyEither<L | L2, U> {
		const resolver = () => {
			const resolved = this.getResolved();
			const mapped = resolved.flatMap<U, L2>(t => f(t));
			return mapped;
		};

		return new LazyEither<L | L2, U>(resolver, () => []);
	}

	fold<L2, R2>(lf: (l: L) => L2, rf: (r: R) => R2): L2 | R2 {
		return this.getResolved().fold(lf, rf);
	}

	zip<L2, R2>(other: Either<L2, R2>): LazyEither<L | L2, [R, R2]> {
		const resolver = () => {
			const resolved = this.getResolved();
			const mapped = resolved.zip<L2, R2>(other);
			return mapped;
		};

		return new LazyEither<L | L2, [R, R2]>(resolver, () => []);
	}

	zip2<L2, L3, R2, R3>(o1: Either<L2, R2>, o2: Either<L3, R3>): LazyEither<L | L2 | L3, [R, R2, R3]> {
		const fn = () => this.getResolved().zip2<L2, L3, R2, R3>(o1, o2);
		return new LazyEither<L | L2 | L3, [R, R2, R3]>(fn, () => []);
	}

	zip3<L2, L3, L4, R2, R3, R4>(
		o1: Either<L2, R2>,
		o2: Either<L3, R3>,
		o3: Either<L4, R4>,
	): LazyEither<L | L2 | L3 | L4, [R, R2, R3, R4]> {
		const fn = () => this.getResolved().zip3<L2, L3, L4, R2, R3, R4>(o1, o2, o3);
		return new LazyEither<L | L2 | L3 | L4, [R, R2, R3, R4]>(fn, () => []);
	}

	zip4<L2, L3, L4, L5, R2, R3, R4, R5>(
		o1: Either<L2, R2>,
		o2: Either<L3, R3>,
		o3: Either<L4, R4>,
		o4: Either<L5, R5>,
	): LazyEither<L | L2 | L3 | L4 | L5, [R, R2, R3, R4, R5]> {
		const fn = () => this.getResolved().zip4<L2, L3, L4, L5, R2, R3, R4, R5>(o1, o2, o3, o4);
		return new LazyEither<L | L2 | L3 | L4 | L5, [R, R2, R3, R4, R5]>(fn, () => []);
	}

	zip5<L2, L3, L4, L5, L6, R2, R3, R4, R5, R6>(
		o1: Either<L2, R2>,
		o2: Either<L3, R3>,
		o3: Either<L4, R4>,
		o4: Either<L5, R5>,
		o5: Either<L6, R6>,
	): LazyEither<L | L2 | L3 | L4 | L5 | L6, [R, R2, R3, R4, R5, R6]> {
		const fn = () => this.getResolved().zip5<L2, L3, L4, L5, L6, R2, R3, R4, R5, R6>(o1, o2, o3, o4, o5);
		return new LazyEither<L | L2 | L3 | L4 | L5 | L6, [R, R2, R3, R4, R5, R6]>(fn, () => []);
	}

	zip6<L2, L3, L4, L5, L6, L7, R2, R3, R4, R5, R6, R7>(
		o1: Either<L2, R2>,
		o2: Either<L3, R3>,
		o3: Either<L4, R4>,
		o4: Either<L5, R5>,
		o5: Either<L6, R6>,
		o6: Either<L7, R7>,
	): LazyEither<L | L2 | L3 | L4 | L5 | L6 | L7, [R, R2, R3, R4, R5, R6, R7]> {
		const fn = () => this.getResolved().zip6<L2, L3, L4, L5, L6, L7, R2, R3, R4, R5, R6, R7>(o1, o2, o3, o4, o5, o6);
		return new LazyEither<L | L2 | L3 | L4 | L5 | L6 | L7, [R, R2, R3, R4, R5, R6, R7]>(fn, () => []);
	}

	zipN<L2, R2>(...others: Array<Either<L2, R2>>): LazyEither<L | L2, [R, ...R2[]]> {
		const fn = () => this.getResolved().zipN<L2, R2>(...others);
		return new LazyEither<L | L2, [R, ...R2[]]>(fn, () => []);
	}

	get(): L | R {
		return this.getResolved().get();
	}

	getOrElse(x: R): R {
		return this.getResolved().getOrElse(x);
	}

	getOrThrow(t: Throwable): R {
		const resolved = this.getResolved();
		const value: L | R = resolved.get();
		if (resolved.isRight()) {
			return value as R;
		}

		if (typeof t === 'function') {
			t = t(value);
		}

		if (typeof t === 'string') {
			throw new TypeError(t);
		}

		throw t;
	}

	getOrQueriedValueNotPresent(message?: string): LazyEither<QueriedValueNotPresent, R> {
		const resolver = () => {
			const resolved = this.getResolved();
			const queried = resolved.getOrQueriedValueNotPresent(message);
			return queried;
		};

		return new LazyEither<QueriedValueNotPresent, R>(resolver, () => []);
	}

	equals(other: Either<L, R>): boolean {
		return this.getResolved().equals(other);
	}

	match<U>(left: (l: L) => U, right: (r: R) => U): U {
		return this.getResolved().match(left, right);
	}

	private resolve(): void {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		this.resolved = this.getter(...this.getterArgsProvider());
	}
}
