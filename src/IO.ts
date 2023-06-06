import {AsyncIO} from './AsyncIO.js';
import {Computation} from './Computation.js';
import {Right, type Either} from './Either.js';
import {SafeComputation} from './SafeComputation.js';
import {Task} from './Task.js';
import {type BindEffectType, boundEffectToIO, type Effect, AnyEffect} from './definitions.js';

// eslint-disable-next-line @typescript-eslint/naming-convention
export class IO<out T> implements Effect<any, never, T> {
	static of<T>(value: T): IO<T> {
		return new IO(() => value);
	}

	static do(): IO<Record<any, any>> {
		return new IO(() => ({}));
	}

	constructor(public readonly evaluate: (..._: any[]) => T) {}

	bindKey<KeyT extends string | number | symbol, Output2T, EffectT extends BindEffectType<Output2T>>(key: KeyT, f: (input: T) => EffectT): IO<T & Record<KeyT, Output2T>> {
		return this.flatMap((input: T) => boundEffectToIO<Output2T, EffectT>(f(input)).map((output2: Output2T) => Object.assign({}, input, {[key]: output2} as Record<KeyT, Output2T>)));
	}

	tap<EffectT extends BindEffectType<any>>(f: (input: T) => EffectT): this {
		return this.flatMap((input: T) => boundEffectToIO<EffectT, EffectT>(f(input)).map(() => input)) as this;
	}

	thenDo<U>(f: (..._: any[]) => U): IO<U> {
		const resolver = (..._: any[]) => {
			this.evaluate();
			return f();
		};

		return new IO(resolver);
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	thenDoIO<U>(io: IO<U>): IO<U> {
		return this.thenDo(() => io.evaluate());
	}

	thenDoWithInput<Input, Output2>(f: (input: Input) => Output2): SafeComputation<Input, Output2> {
		const resolver = (input: Input) => {
			this.evaluate();
			return f(input);
		};

		return new SafeComputation(resolver);
	}

	thenDoSafeComputation<Input, Output2>(
		computation: SafeComputation<Input, Output2>,
	): SafeComputation<Input, Output2> {
		return this.thenDoWithInput((input: Input) => computation.evaluate(input));
	}

	thenDoWithError<E, U>(f: (..._: any[]) => Either<E, U>): Task<E, U> {
		const resolver = (..._: any[]) => {
			this.evaluate();
			return f();
		};

		return new Task(resolver);
	}

	thenDoTask<E2, O2>(task: Task<E2, O2>): Task<E2, O2> {
		return this.thenDoWithError(() => task.evaluate());
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
		return this.thenDoWithInputAndNewError((input: I) => computation.evaluate(input));
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

	flatMapWithInput<InputT, Output2T>(f: (input: T) => SafeComputation<InputT, Output2T>): SafeComputation<InputT, Output2T> {
		const evaluate = (input: InputT) => f(this.evaluate()).evaluate(input);
		return new SafeComputation(evaluate);
	}

	flatMapWithError<ErrorT, Output2T>(f: (x: T) => Task<ErrorT, Output2T>): Task<ErrorT, Output2T> {
		const evaluate = () => f(this.evaluate()).evaluate();
		return new Task(evaluate);
	}

	flatMapWithInputAndError<InputT, ErrorT, Output2T>(f: (x: T) => Computation<InputT, ErrorT, Output2T>): Computation<InputT, ErrorT, Output2T> {
		const evaluate = (input: InputT) => f(this.evaluate()).evaluate(input);
		return new Computation(evaluate);
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

	// eslint-disable-next-line @typescript-eslint/prefer-return-this-type
	bindInput<InputT>(input: InputT): IO<T> {
		return this;
	}

	toAsync(): AsyncIO<T> {
		return new AsyncIO(async () => this.evaluate());
	}

	toSafeComputation(): SafeComputation<any, T> {
		return new SafeComputation(() => this.evaluate());
	}

	toTask(): Task<never, T> {
		return new Task(() => new Right<never, T>(this.evaluate()));
	}

	toComputation(): Computation<any, never, T> {
		return new Computation(() => new Right<never, T>(this.evaluate()));
	}
}
