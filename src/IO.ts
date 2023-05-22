import {type Monad} from './Monad.js';

// eslint-disable-next-line @typescript-eslint/naming-convention
export class IO<T> implements Monad<T> {
	constructor(public readonly evaluate: () => T) {}

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
