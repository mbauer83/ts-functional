/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {type Either, Left, Right} from './Either';
import {type Monad} from './Monad';

export class ConditionalExecution<T, E> implements Monad<T> {
	constructor(
		protected readonly then: (...args: any[]) => T,
		protected readonly otherwise: (...args: any[]) => E,
	) {}

	evaluate(bool: boolean | (() => boolean), leftArgs?: any[], rightArgs?: any[]): Either<E, T> {
		if (typeof bool === 'function') {
			bool = bool();
		}

		if (bool) {
			return new Right(this.then(...rightArgs ?? []));
		}

		return new Left(this.otherwise(...leftArgs ?? []));
	}

	map<U>(f: (x: T) => U): ConditionalExecution<U, E> {
		return new ConditionalExecution<U, E>(

			(...args) => f(this.then(...args)),
			this.otherwise,
		);
	}

	apply<U>(f: ConditionalExecution<(x: T) => U, E>): ConditionalExecution<U, E> {
		return f.map(g => g(this.then()));
	}

	pure<U>(x: U): ConditionalExecution<U, E> {
		return new ConditionalExecution<U, E>(
			() => x,
			this.otherwise,
		);
	}

	flatMap<U>(f: (x: T) => ConditionalExecution<U, E>): ConditionalExecution<U, E> {
		const newThen = (...args: any[]) => f(this.then(...args)).evaluate(true).get() as U;
		return new ConditionalExecution<U, E>(
			newThen,
			this.otherwise,
		);
	}

	zip<U>(other: ConditionalExecution<U, E>): ConditionalExecution<[T, U], E> {
		const newThen: (...args: any[]) => [T, U] = (...args: any[]) => [this.then(...args), other.then(...args)];
		return new ConditionalExecution<[T, U], E>(
			newThen,
			this.otherwise,
		);
	}

	zip2<U, V>(o1: ConditionalExecution<U, E>, o2: ConditionalExecution<V, E>): ConditionalExecution<[T, U, V], E> {
		const newThen: (...args: any[]) => [T, U, V] = (...args: any[]) => [this.then(...args), o1.then(...args), o2.then(...args)];
		return new ConditionalExecution<[T, U, V], E>(
			newThen,
			this.otherwise,
		);
	}

	zip3<U, V, W>(
		o1: ConditionalExecution<U, E>,
		o2: ConditionalExecution<V, E>,
		o3: ConditionalExecution<W, E>,
	): ConditionalExecution<[T, U, V, W], E> {
		const newThen: (...args: any[]) => [T, U, V, W]
            = (...args: any[]) => [
            	this.then(...args),
            	o1.then(...args),
            	o2.then(...args),
            	o3.then(...args),
            ];
		return new ConditionalExecution<[T, U, V, W], E>(
			newThen,
			this.otherwise,
		);
	}

	zip4<U, V, W, X>(
		o1: ConditionalExecution<U, E>,
		o2: ConditionalExecution<V, E>,
		o3: ConditionalExecution<W, E>,
		o4: ConditionalExecution<X, E>,
	): ConditionalExecution<[T, U, V, W, X], E> {
		const newThen: (...args: any[]) => [T, U, V, W, X]
            = (...args: any[]) => [
            	this.then(...args),
            	o1.then(...args),
            	o2.then(...args),
            	o3.then(...args),
            	o4.then(...args),
            ];
		return new ConditionalExecution<[T, U, V, W, X], E>(
			newThen,
			this.otherwise,
		);
	}

	zip5<U, V, W, X, Y>(
		o1: ConditionalExecution<U, E>,
		o2: ConditionalExecution<V, E>,
		o3: ConditionalExecution<W, E>,
		o4: ConditionalExecution<X, E>,
		o5: ConditionalExecution<Y, E>,
	): ConditionalExecution<[T, U, V, W, X, Y], E> {
		const newThen: (...args: any[]) => [T, U, V, W, X, Y]
            = (...args: any[]) => [
            	this.then(...args),
            	o1.then(...args),
            	o2.then(...args),
            	o3.then(...args),
            	o4.then(...args),
            	o5.then(...args),
            ];
		return new ConditionalExecution<[T, U, V, W, X, Y], E>(
			newThen,
			this.otherwise,
		);
	}

	zip6<U, V, W, X, Y, Z>(
		o1: ConditionalExecution<U, E>,
		o2: ConditionalExecution<V, E>,
		o3: ConditionalExecution<W, E>,
		o4: ConditionalExecution<X, E>,
		o5: ConditionalExecution<Y, E>,
		o6: ConditionalExecution<Z, E>,
	): ConditionalExecution<[T, U, V, W, X, Y, Z], E> {
		const newThen: (...args: any[]) => [T, U, V, W, X, Y, Z]
            = (...args: any[]) => [
            	this.then(...args),
            	o1.then(...args),
            	o2.then(...args),
            	o3.then(...args),
            	o4.then(...args),
            	o5.then(...args),
            	o6.then(...args),
            ];
		return new ConditionalExecution<[T, U, V, W, X, Y, Z], E>(
			newThen,
			this.otherwise,
		);
	}

	zipWithElse<T2, E2>(other: ConditionalExecution<T2, E2>): ConditionalExecution<[T, T2], [E, E2]> {
		const newThen: (...args: any[]) => [T, T2]
            = (...args: any[]) => [
            	this.then(...args),
            	other.then(...args),
            ];
		const newOtherwise: (...args: any[]) => [E, E2]
            = (...args: any[]) => [
            	this.otherwise(...args),
            	other.otherwise(...args),
            ];
		return new ConditionalExecution<[T, T2], [E, E2]>(
			newThen,
			newOtherwise,
		);
	}

	zip2WithElse<T2, T3, E2, E3>(
		o1: ConditionalExecution<T2, E2>,
		o2: ConditionalExecution<T3, E3>,
	): ConditionalExecution<[T, T2, T3], [E, E2, E3]> {
		const newThen: (...args: any[]) => [T, T2, T3]
            = (...args: any[]) => [
            	this.then(...args),
            	o1.then(...args),
            	o2.then(...args),
            ];
		const newOtherwise: (...args: any[]) => [E, E2, E3]
            = (...args: any[]) => [
            	this.otherwise(...args),
            	o1.otherwise(...args),
            	o2.otherwise(...args),
            ];
		return new ConditionalExecution<[T, T2, T3], [E, E2, E3]>(
			newThen,
			newOtherwise,
		);
	}

	zip3WithElse<T2, T3, T4, E2, E3, E4>(
		o1: ConditionalExecution<T2, E2>,
		o2: ConditionalExecution<T3, E3>,
		o3: ConditionalExecution<T4, E4>,
	): ConditionalExecution<[T, T2, T3, T4], [E, E2, E3, E4]> {
		const newThen: (...args: any[]) => [T, T2, T3, T4]
            = (...args: any[]) => [
            	this.then(...args),
            	o1.then(...args),
            	o2.then(...args),
            	o3.then(...args),
            ];
		const newOtherwise: (...args: any[]) => [E, E2, E3, E4]
            = (...args: any[]) => [
            	this.otherwise(...args),
            	o1.otherwise(...args),
            	o2.otherwise(...args),
            	o3.otherwise(...args),
            ];

		return new ConditionalExecution<[T, T2, T3, T4], [E, E2, E3, E4]>(
			newThen,
			newOtherwise,
		);
	}

	zip4WithElse<T2, T3, T4, T5, E2, E3, E4, E5>(
		o1: ConditionalExecution<T2, E2>,
		o2: ConditionalExecution<T3, E3>,
		o3: ConditionalExecution<T4, E4>,
		o4: ConditionalExecution<T5, E5>,
	): ConditionalExecution<[T, T2, T3, T4, T5], [E, E2, E3, E4, E5]> {
		const newThen: (...args: any[]) => [T, T2, T3, T4, T5]
            = (...args: any[]) => [
            	this.then(...args),
            	o1.then(...args),
            	o2.then(...args),
            	o3.then(...args),
            	o4.then(...args),
            ];
		const newOtherwise: (...args: any[]) => [E, E2, E3, E4, E5]
            = (...args: any[]) => [
            	this.otherwise(...args),
            	o1.otherwise(...args),
            	o2.otherwise(...args),
            	o3.otherwise(...args),
            	o4.otherwise(...args),
            ];
		return new ConditionalExecution<[T, T2, T3, T4, T5], [E, E2, E3, E4, E5]>(
			newThen,
			newOtherwise,
		);
	}

	zip5WithElse<T2, T3, T4, T5, T6, E2, E3, E4, E5, E6>(
		o1: ConditionalExecution<T2, E2>,
		o2: ConditionalExecution<T3, E3>,
		o3: ConditionalExecution<T4, E4>,
		o4: ConditionalExecution<T5, E5>,
		o5: ConditionalExecution<T6, E6>,
	): ConditionalExecution<[T, T2, T3, T4, T5, T6], [E, E2, E3, E4, E5, E6]> {
		const newThen: (...args: any[]) => [T, T2, T3, T4, T5, T6]
            = (...args: any[]) => [
            	this.then(...args),
            	o1.then(...args),
            	o2.then(...args),
            	o3.then(...args),
            	o4.then(...args),
            	o5.then(...args),
            ];
		const newOtherwise: (...args: any[]) => [E, E2, E3, E4, E5, E6]
            = (...args: any[]) => [
            	this.otherwise(...args),
            	o1.otherwise(...args),
            	o2.otherwise(...args),
            	o3.otherwise(...args),
            	o4.otherwise(...args),
            	o5.otherwise(...args),
            ];
		return new ConditionalExecution<[T, T2, T3, T4, T5, T6], [E, E2, E3, E4, E5, E6]>(
			newThen,
			newOtherwise,
		);
	}

	zip6WithElse<T2, T3, T4, T5, T6, T7, E2, E3, E4, E5, E6, E7>(
		o1: ConditionalExecution<T2, E2>,
		o2: ConditionalExecution<T3, E3>,
		o3: ConditionalExecution<T4, E4>,
		o4: ConditionalExecution<T5, E5>,
		o5: ConditionalExecution<T6, E6>,
		o6: ConditionalExecution<T7, E7>,
	): ConditionalExecution<[T, T2, T3, T4, T5, T6, T7], [E, E2, E3, E4, E5, E6, E7]> {
		const newThen: (...args: any[]) => [T, T2, T3, T4, T5, T6, T7]
            = (...args: any[]) => [
            	this.then(...args),
            	o1.then(...args),
            	o2.then(...args),
            	o3.then(...args),
            	o4.then(...args),
            	o5.then(...args),
            	o6.then(...args),
            ];
		const newOtherwise: (...args: any[]) => [E, E2, E3, E4, E5, E6, E7]
            = (...args: any[]) => [
            	this.otherwise(...args),
            	o1.otherwise(...args),
            	o2.otherwise(...args),
            	o3.otherwise(...args),
            	o4.otherwise(...args),
            	o5.otherwise(...args),
            	o6.otherwise(...args),
            ];
		return new ConditionalExecution<[T, T2, T3, T4, T5, T6, T7], [E, E2, E3, E4, E5, E6, E7]>(
			newThen,
			newOtherwise,
		);
	}

	mapElse<U>(f: (x: E) => U): ConditionalExecution<T, U> {
		return new ConditionalExecution<T, U>(
			this.then,
			(...args) => f(this.otherwise(...args)),
		);
	}

	mapWithElse<T2, E2>(f: (x: T) => T2, g: (x: E) => E2): ConditionalExecution<T2, E2> {
		return new ConditionalExecution<T2, E2>(
			(...args) => f(this.then(...args)),
			(...args) => g(this.otherwise(...args)),
		);
	}

	applyElse<U>(f: ConditionalExecution<any, (x: E) => U>): ConditionalExecution<T, U> {
		return f.mapElse(g => g(this.otherwise())) as ConditionalExecution<T, U>;
	}

	applyWithElse<T2, E2>(f: ConditionalExecution<(x: T) => T2, (x: E) => E2>): ConditionalExecution<T2, E2> {
		return f.mapWithElse(g => g(this.then()), g => g(this.otherwise()));
	}

	flatMapElse<U>(f: (x: E) => ConditionalExecution<T, U>): ConditionalExecution<T, U> {
		const newOtherwise: (...args: any[]) => U = (...args: any[]) => f(this.otherwise(...args)).evaluate(false).get() as U;
		return new ConditionalExecution<T, U>(
			this.then,
			newOtherwise,
		);
	}

	flatMapWithElse<T2, E2>(f: (x: T) => ConditionalExecution<T2, any>, g: (x: E) => ConditionalExecution<any, E2>): ConditionalExecution<T2, E2> {
		const newThen: (...args: any[]) => T2 = (...args: any[]) => f(this.then(...args)).evaluate(true).get() as T2;
		const newOtherwise: (...args: any[]) => E2 = (...args: any[]) => g(this.otherwise(...args)).evaluate(false).get() as E2;
		return new ConditionalExecution<T2, E2>(
			newThen,
			newOtherwise,
		);
	}

	fold<U>(f: (x: T) => U, g: (x: E) => U): (b: boolean) => U {
		return (b: boolean) => b ? f(this.then()) : g(this.otherwise());
	}
}
