import {type EqualityComparable} from '@mbauer83/ts-utils/src/comparison/equality.js';
import {QueriedValueNotPresent, type Throwable} from './definitions.js';
import {type Monad} from './Monad.js';

export interface Either<L, R> extends Monad<R>, EqualityComparable<Either<L, R>> {
	map<U>(f: (x: R) => U): Either<L, U>;
	mapWithNewLeft<U, L2>(f: (x: R) => U, g: (x: any) => L2): Either<L2, U>;
	apply<U>(f: Either<L, (x: R) => U>): Either<L, U>;
	pure<U>(x: U): Either<L, U>;
	flatMap<U, L2>(f: (x: R) => Either<L2, U>): Either<L | L2, U>;
	fold<L2, R2>(lf: (l: L) => L2, rf: (r: R) => R2): L2 | R2;
	zip<L2, R2>(other: Either<L2, R2>): Either<L | L2, [R, R2]>;
	zip<L2, R2>(other: Either<L2, R2>): Either<L | L2, [R, R2]>;
	zip2<L2, L3, R2, R3>(
		o1: Either<L2, R2>,
		o2: Either<L3, R3>
	): Either<L | L2 | L3, [R, R2, R3]>;
	zip3<L2, L3, L4, R2, R3, R4>(
		o1: Either<L2, R2>,
		o2: Either<L3, R3>,
		o3: Either<L4, R4>
	): Either<L | L2 | L3 | L4, [R, R2, R3, R4]>;
	zip4<L2, L3, L4, L5, R2, R3, R4, R5>(
		o1: Either<L2, R2>,
		o2: Either<L3, R3>,
		o3: Either<L4, R4>,
		o4: Either<L5, R5>
	): Either<L | L2 | L3 | L4 | L5, [R, R2, R3, R4, R5]>;
	zip5<L2, L3, L4, L5, L6, R2, R3, R4, R5, R6>(
		o1: Either<L2, R2>,
		o2: Either<L3, R3>,
		o3: Either<L4, R4>,
		o4: Either<L5, R5>,
		o5: Either<L6, R6>
	): Either<L | L2 | L3 | L4 | L5 | L6, [R, R2, R3, R4, R5, R6]>;
	zip6<L2, L3, L4, L5, L6, L7, R2, R3, R4, R5, R6, R7>(
		o1: Either<L2, R2>,
		o2: Either<L3, R3>,
		o3: Either<L4, R4>,
		o4: Either<L5, R5>,
		o5: Either<L6, R6>,
		o6: Either<L7, R7>
	): Either<L | L2 | L3 | L4 | L5 | L6 | L7, [R, R2, R3, R4, R5, R6, R7]>;
	zipN<L2, R2>(
		...others: Array<Either<L2, R2>>
	): Either<L | L2, [R, ...R2[]]>;
	getOrElse(x: R): R;
	getOrThrow(t: Throwable): R;
	getOrQueriedValueNotPresent(message?: string): Either<QueriedValueNotPresent, R>;
	get(): L | R;
	withNewLeft<L2>(x: L2 | ((...args: any[]) => L2)): Either<L2, R>;
	isLeft(): this is Left<L, R>;
	isRight(): this is Right<L, R>;
	match<U>(left: (l: L) => U, right: (r: R) => U): U;
}

export class Left<L, R> implements Either<L, R> {
	constructor(public readonly value: L) {}

	equals(other: Either<L, R>): boolean {
		return other.isLeft() && this.value === other.get();
	}

	map<U>(f: (x: R) => U): Either<L, U> {
		return this as unknown as Left<L, U>;
	}

	mapWithNewLeft<U, L2>(f: (x: R) => U, g: (x: L) => L2): Either<L2, U> {
		return new Left<L2, U>(g(this.value));
	}

	apply<U>(f: Either<L, (x: R) => U>): Either<L, U> {
		return new Left<L, U>(this.value);
	}

	pure<U>(x: U): Either<L, U> {
		return new Right<L, U>(x);
	}

	flatMap<U, L2>(f: (x: R) => Either<L2, U>): Either<L | L2, U> {
		return new Left<L | L2, U>(this.value);
	}

	fold<L2, R2>(lf: (l: L) => L2, rf: (r: R) => R2): L2 | R2 {
		return lf(this.value);
	}

	zip<L2, R2>(other: Either<L2, R2>): Either<L | L2, [R, R2]> {
		return new Left(this.value);
	}

	zip2<L2, L3, R2, R3>(
		o1: Either<L2, R2>,
		o2: Either<L3, R3>,
	): Either<L | L2 | L3, [R, R2, R3]> {
		return new Left(this.value);
	}

	zip3<L2, L3, L4, R2, R3, R4>(
		o1: Either<L2, R2>,
		o2: Either<L3, R3>,
		o3: Either<L4, R4>,
	): Either<L | L2 | L3 | L4, [R, R2, R3, R4]> {
		return new Left(this.value);
	}

	zip4<L2, L3, L4, L5, R2, R3, R4, R5>(
		o1: Either<L2, R2>,
		o2: Either<L3, R3>,
		o3: Either<L4, R4>,
		o4: Either<L5, R5>,
	): Either<L | L2 | L3 | L4 | L5, [R, R2, R3, R4, R5]> {
		return new Left(this.value);
	}

	zip5<L2, L3, L4, L5, L6, R2, R3, R4, R5, R6>(
		o1: Either<L2, R2>,
		o2: Either<L3, R3>,
		o3: Either<L4, R4>,
		o4: Either<L5, R5>,
		o5: Either<L6, R6>,
	): Either<L | L2 | L3 | L4 | L5 | L6, [R, R2, R3, R4, R5, R6]> {
		return new Left(this.value);
	}

	zip6<L2, L3, L4, L5, L6, L7, R2, R3, R4, R5, R6, R7>(
		o1: Either<L2, R2>,
		o2: Either<L3, R3>,
		o3: Either<L4, R4>,
		o4: Either<L5, R5>,
		o5: Either<L6, R6>,
		o6: Either<L7, R7>,
	): Either<L | L2 | L3 | L4 | L5 | L6 | L7, [R, R2, R3, R4, R5, R6, R7]> {
		return new Left(this.value);
	}

	zipN<L2, R2>(
		...others: Array<Either<L2, R2>>
	): Either<L | L2, [R, ...R2[]]> {
		return new Left(this.value);
	}

	getOrElse(x: R): R {
		return x;
	}

	getOrThrow(t: Throwable): R {
		if (typeof t === 'function') {
			t = t(this.value);
		}

		if (typeof t === 'string') {
			throw new TypeError(t);
		}

		throw t;
	}

	getOrQueriedValueNotPresent(message?: string): Either<QueriedValueNotPresent, R> {
		return new Left<QueriedValueNotPresent, R>(new QueriedValueNotPresent(message ?? 'Either::getOrQueriedValueNotPresent'));
	}

	withNewLeft<L2>(x: L2 | ((...args: any[]) => L2)): Either<L2, R> {
		return (typeof x === 'function') ? new Left<L2, R>((x as (a: any) => L2)(this.value)) : new Left<L2, R>(x);
	}

	isLeft(): this is Left<L, R> {
		return true;
	}

	isRight(): this is Right<L, R> {
		return false;
	}

	get(): L {
		return this.value;
	}

	match<U>(left: (l: L) => U, right: (r: R) => U): U {
		return left(this.value);
	}
}

export class Right<L, R> implements Either<L, R> {
	constructor(public readonly value: R) {}

	equals(other: Either<L, R>): boolean {
		return other.isRight() && this.value === other.get();
	}

	map<U>(f: (x: R) => U): Either<L, U> {
		return new Right<L, U>(f(this.value));
	}

	mapWithNewLeft<U, L2>(f: (x: R) => U, g: (x: L) => L2): Either<L2, U> {
		return new Right<L2, U>(f(this.value));
	}

	apply<U>(f: Either<L, (x: R) => U>): Either<L, U> {
		return f.map((g: (x: R) => U) => g(this.value));
	}

	pure<U>(x: U): Either<L, U> {
		return new Right<L, U>(x);
	}

	flatMap<U, L2>(f: (x: R) => Either<L2, U>): Either<L | L2, U> {
		return f(this.value);
	}

	fold<L2, R2>(lf: (l: L) => L2, rf: (r: R) => R2): L2 | R2 {
		return rf(this.value);
	}

	zip<L2, R2>(other: Either<L2, R2>): Either<L | L2, [R, R2]> {
		const otherValue: L2 | R2 = other.get();
		return other.isLeft()
			? new Left<L2, [R, R2]>(otherValue as L2)
			: new Right<L | L2, [R, R2]>([this.value, otherValue as R2]);
	}

	zip2<L2, L3, R2, R3>(
		o1: Either<L2, R2>,
		o2: Either<L3, R3>,
	): Either<L | L2 | L3, [R, R2, R3]> {
		return o1.isLeft()
			? new Left<L | L2 | L3, [R, R2, R3]>(o1.get())
			: (o2.isLeft()
				? new Left<L | L2 | L3, [R, R2, R3]>(o2.get())
				: new Right<L | L2 | L3, [R, R2, R3]>([
					this.value,
					(o1 as Right<L2, R2>).get(),
					(o2 as Right<L3, R3>).get(),
				]));
	}

	zip3<L2, L3, L4, R2, R3, R4>(
		o1: Either<L2, R2>,
		o2: Either<L3, R3>,
		o3: Either<L4, R4>,
	): Either<L | L2 | L3 | L4, [R, R2, R3, R4]> {
		return o1.isLeft()
			? new Left<L | L2 | L3 | L4, [R, R2, R3, R4]>(o1.get())
			: (
				o2.isLeft()
					? new Left<L | L2 | L3 | L4, [R, R2, R3, R4]>(o2.get())
					: (
						// eslint-disable-next-line unicorn/no-nested-ternary
						o3.isLeft()
							? new Left<L | L2 | L3 | L4, [R, R2, R3, R4]>(o3.get())
							: new Right<L | L2 | L3 | L4, [R, R2, R3, R4]>([
								this.value,
								(o1 as Right<L2, R2>).get(),
								(o2 as Right<L3, R3>).get(),
								(o3 as Right<L4, R4>).get(),
							])
					)
			);
	}

	zip4<L2, L3, L4, L5, R2, R3, R4, R5>(
		o1: Either<L2, R2>,
		o2: Either<L3, R3>,
		o3: Either<L4, R4>,
		o4: Either<L5, R5>,
	): Either<L | L2 | L3 | L4 | L5, [R, R2, R3, R4, R5]> {
		return o1.isLeft()
			? new Left<L | L2 | L3 | L4 | L5, [R, R2, R3, R4, R5]>(o1.get())
			: (
				o2.isLeft()
					? new Left<L | L2 | L3 | L4 | L5, [R, R2, R3, R4, R5]>(o2.get())
					: (
						// eslint-disable-next-line unicorn/no-nested-ternary
						o3.isLeft()
							? new Left<L | L2 | L3 | L4 | L5, [R, R2, R3, R4, R5]>(o3.get())
							: (
								o4.isLeft()
									? new Left<L | L2 | L3 | L4 | L5, [R, R2, R3, R4, R5]>(o4.get())
									: new Right<L | L2 | L3 | L4 | L5, [R, R2, R3, R4, R5]>([
										this.value,
										(o1 as Right<L2, R2>).get(),
										(o2 as Right<L3, R3>).get(),
										(o3 as Right<L4, R4>).get(),
										(o4 as Right<L5, R5>).get(),
									])
							)

					)
			);
	}

	zip5<L2, L3, L4, L5, L6, R2, R3, R4, R5, R6>(
		o1: Either<L2, R2>,
		o2: Either<L3, R3>,
		o3: Either<L4, R4>,
		o4: Either<L5, R5>,
		o5: Either<L6, R6>,
	): Either<L | L2 | L3 | L4 | L5 | L6, [R, R2, R3, R4, R5, R6]> {
		return o1.isLeft()
			? new Left<L | L2 | L3 | L4 | L5 | L6, [R, R2, R3, R4, R5, R6]>(o1.get())
			: (
				o2.isLeft()
					? new Left<L | L2 | L3 | L4 | L5 | L6, [R, R2, R3, R4, R5, R6]>(o2.get())
					: (
						// eslint-disable-next-line unicorn/no-nested-ternary
						o3.isLeft()
							? new Left<L | L2 | L3 | L4 | L5 | L6, [R, R2, R3, R4, R5, R6]>(o3.get())
							: (
								o4.isLeft()
									? new Left<L | L2 | L3 | L4 | L5 | L6, [R, R2, R3, R4, R5, R6]>(o4.get())
									: (
										o5.isLeft()
											? new Left<L | L2 | L3 | L4 | L5 | L6, [R, R2, R3, R4, R5, R6]>(o5.get())
											: new Right<L | L2 | L3 | L4 | L5 | L6, [R, R2, R3, R4, R5, R6]>([
												this.value,
												(o1 as Right<L2, R2>).get(),
												(o2 as Right<L3, R3>).get(),
												(o3 as Right<L4, R4>).get(),
												(o4 as Right<L5, R5>).get(),
												(o5 as Right<L6, R6>).get(),
											])
									)
							)
					)
			);
	}

	zip6<L2, L3, L4, L5, L6, L7, R2, R3, R4, R5, R6, R7>(
		o1: Either<L2, R2>,
		o2: Either<L3, R3>,
		o3: Either<L4, R4>,
		o4: Either<L5, R5>,
		o5: Either<L6, R6>,
		o6: Either<L7, R7>,
	): Either<L | L2 | L3 | L4 | L5 | L6 | L7, [R, R2, R3, R4, R5, R6, R7]> {
		return o1.isLeft()
			? new Left<L | L2 | L3 | L4 | L5 | L6 | L7, [R, R2, R3, R4, R5, R6, R7]>(o1.get())
			// eslint-disable-next-line unicorn/no-nested-ternary
			: o2.isLeft()
				? new Left<L | L2 | L3 | L4 | L5 | L6 | L7, [R, R2, R3, R4, R5, R6, R7]>(o2.get())
				// eslint-disable-next-line unicorn/no-nested-ternary
				: (o3.isLeft()
					? new Left<L | L2 | L3 | L4 | L5 | L6 | L7, [R, R2, R3, R4, R5, R6, R7]>(o3.get())
					: (o4.isLeft()
						? new Left<L | L2 | L3 | L4 | L5 | L6 | L7, [R, R2, R3, R4, R5, R6, R7]>(o4.get())
						: (o5.isLeft()
							? new Left<L | L2 | L3 | L4 | L5 | L6 | L7, [R, R2, R3, R4, R5, R6, R7]>(o5.get())
							: (o6.isLeft()
								? new Left<L | L2 | L3 | L4 | L5 | L6 | L7, [R, R2, R3, R4, R5, R6, R7]>(o6.get())
								: new Right<L | L2 | L3 | L4 | L5 | L6 | L7, [R, R2, R3, R4, R5, R6, R7]>(
									[
										this.value,
										(o1 as Right<L2, R2>).get(),
										(o2 as Right<L3, R3>).get(),
										(o3 as Right<L4, R4>).get(),
										(o4 as Right<L5, R5>).get(),
										(o5 as Right<L6, R6>).get(),
										(o6 as Right<L7, R7>).get(),
									],
								)))));
	}

	zipN<L2, R2>(
		...others: Array<Either<L2, R2>>
	): Either<L | L2, [R, ...R2[]]> {
		const lefts = others.filter(o => o instanceof Left);
		if (lefts.length > 0) {
			return new Left<L | L2, [R, ...R2[]]>((lefts[0] as Left<L2, R2>).get());
		}

		return new Right<L | L2, [R, ...R2[]]>([
			this.value,
			...others.map(o => (o as Right<L2, R2>).get()),
		]);
	}

	getOrElse(x: R): R {
		return this.value;
	}

	getOrThrow(t: Throwable): R {
		return this.value;
	}

	getOrQueriedValueNotPresent(): Either<QueriedValueNotPresent, R> {
		return new Right<QueriedValueNotPresent, R>(this.value);
	}

	withNewLeft<L2>(x: L2 | ((...args: any[]) => L2)): Either<L2, R> {
		return new Right<L2, R>(this.value);
	}

	isLeft(): this is Left<L, R> {
		return false;
	}

	isRight(): this is Right<L, R> {
		return true;
	}

	get(): R {
		return this.value;
	}

	match<U>(left: (l: L) => U, right: (r: R) => U): U {
		return right(this.value);
	}
}

export function eitherFromFnOrErrorFn<L, R>(
	lf: (errorInput: any) => L,
	rf: () => R,
): Either<L, R> {
	try {
		const value: R = rf();
		return new Right(value);
	} catch (error) {
		return new Left(lf(error));
	}
}

export function eitherFromFnOrError<L, R>(
	l: L,
	rf: () => R,
): Either<L, R> {
	return eitherFromFnOrErrorFn(_ => l, rf);
}
