import {Computation} from './Computation.js';
import {type Either} from './Either.js';
import {type Monad} from './Monad.js';
import {Task} from './Task.js';

// eslint-disable-next-line @typescript-eslint/naming-convention
export class IO<out T> implements Monad<T> {
	constructor(public readonly evaluate: (..._: any[]) => T) {}

	thenDo<U>(f: (..._: any[]) => U): IO<U> {
		const resolver = (..._: any[]) => {
			this.evaluate();
			return f();
		};

		return new IO(resolver);
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	thenDoIO<U>(io: IO<U>): IO<U> {
		const resolver = (..._: any[]) => {
			this.evaluate();
			return io.evaluate();
		};

		return new IO(resolver);
	}

	thenDoWithError<E, U>(f: (..._: any[]) => Either<E, U>): Task<E, U> {
		const resolver = (..._: any[]) => {
			this.evaluate();
			return f();
		};

		return new Task(resolver);
	}

	thenDoTask<E2, O2>(task: Task<E2, O2>): Task<E2, O2> {
		const resolver = (..._: any[]) => {
			this.evaluate();
			return task.evaluate();
		};

		return new Task(resolver);
	}

	thenDoWithInputAndNewError<I, E2, O2>(
		f: (input: I) => Either<E2, O2>,
	): Computation<I, E2, O2> {
		const resolver = (input: I) => {
			this.evaluate();
			return f(input);
		};

		return new Computation(resolver);
	}

	thenDoComputation<I, E2, O2>(
		computation: Computation<I, E2, O2>,
	): Computation<I, E2, O2> {
		const resolver = (input: I) => {
			this.evaluate();
			return computation.evaluate(input);
		};

		return new Computation(resolver);
	}

	mapToTask<E, U>(f: (x: T) => Either<E, U>): Task<E, U> {
		const evaluate = () => f(this.evaluate());
		return new Task<E, U>(evaluate);
	}

	mapToComputation<I, E, U>(f: (x: T) => (i: I) => Either<E, U>): Computation<I, E, U> {
		const evaluate = (i: I) => f(this.evaluate())(i);
		return new Computation<I, E, U>(evaluate);
	}

	map<U>(f: (x: T) => U): IO<U> {
		const evaluate = () => f(this.evaluate());
		return new IO(evaluate);
	}

	apply<U>(f: IO<(x: T) => U>): IO<U> {
		const evaluate = () => f.evaluate()(this.evaluate());
		return new IO(evaluate);
	}

	pure<U>(x: U): IO<U> {
		const evaluate = () => x;
		return new IO(evaluate);
	}

	flatMap<U>(f: (x: T) => IO<U>): IO<U> {
		const evaluate = () => f(this.evaluate()).evaluate();
		return new IO(evaluate);
	}

	zip<U>(other: IO<U>): IO<[T, U]> {
		const evaluate: () => [T, U] = () => [this.evaluate(), other.evaluate()];
		return new IO(evaluate);
	}

	zip2<U, V>(
		u: IO<U>,
		v: IO<V>,
	): IO<[T, U, V]> {
		const evaluate: () => [T, U, V]
            = () => [this.evaluate(), u.evaluate(), v.evaluate()];
		return new IO(evaluate);
	}

	zip3<U, V, W>(
		u: IO<U>,
		v: IO<V>,
		w: IO<W>,
	): IO<[T, U, V, W]> {
		const evaluate: () => [T, U, V, W]
            = () => [this.evaluate(), u.evaluate(), v.evaluate(), w.evaluate()];
		return new IO(evaluate);
	}

	zip4<U, V, W, X>(
		u: IO<U>,
		v: IO<V>,
		w: IO<W>,
		x: IO<X>,
	): IO<[T, U, V, W, X]> {
		const evaluate: () => [T, U, V, W, X]
            = () => [this.evaluate(), u.evaluate(), v.evaluate(), w.evaluate(), x.evaluate()];
		return new IO(evaluate);
	}

	zip5<U, V, W, X, Y>(
		u: IO<U>,
		v: IO<V>,
		w: IO<W>,
		x: IO<X>,
		y: IO<Y>,
	): IO<[T, U, V, W, X, Y]> {
		const evaluate: () => [T, U, V, W, X, Y]
            = () => [this.evaluate(), u.evaluate(), v.evaluate(), w.evaluate(), x.evaluate(), y.evaluate()];
		return new IO(evaluate);
	}

	zip6<U, V, W, X, Y, Z>(
		u: IO<U>,
		v: IO<V>,
		w: IO<W>,
		x: IO<X>,
		y: IO<Y>,
		z: IO<Z>,
	): IO<[T, U, V, W, X, Y, Z]> {
		const evaluate: () => [T, U, V, W, X, Y, Z]
            = () => [this.evaluate(), u.evaluate(), v.evaluate(), w.evaluate(), x.evaluate(), y.evaluate(), z.evaluate()];
		return new IO(evaluate);
	}

	zipN<U>(...us: Array<IO<U>>): IO<[T, ...U[]]> {
		const evaluate: () => [T, ...U[]]
            = () => [this.evaluate(), ...us.map(u => u.evaluate())];
		return new IO(evaluate);
	}
}
