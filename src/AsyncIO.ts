import {AsyncComputation} from './AsyncComputation.js';
import {AsyncSafeComputation} from './AsyncSafeComputation.js';
import {AsyncTask} from './AsyncTask.js';
import {Right, type Either} from './Either.js';
import {type AsyncBindEffectType, asyncBindEffectToIO, type BindEffectType, type AsyncEffect} from './definitions.js';

// eslint-disable-next-line @typescript-eslint/naming-convention
export class AsyncIO<out T> implements AsyncEffect<any, never, T> {
	static of<OutputT>(value: OutputT): AsyncIO<OutputT> {
		return new AsyncIO(async () => value);
	}

	static do(): AsyncIO<Record<any, any>> {
		return AsyncIO.of({});
	}

	constructor(public readonly evaluate: (..._: any[]) => Promise<T>) {}

	bindKey<KeyT extends (string | symbol | number), Output2T, EffectT extends (BindEffectType<Output2T> | AsyncBindEffectType<Output2T>)>(key: KeyT, f: (input: T) => EffectT): AsyncIO<T & Record<KeyT, Output2T>> {
		return this.flatMap((output: T) => {
			const asyncEffect = f(output).toAsync();
			// eslint-disable-next-line @typescript-eslint/naming-convention
			const asyncIOEffect = asyncBindEffectToIO<Output2T, typeof asyncEffect>(asyncEffect);
			return asyncIOEffect.map(async (output2: Output2T) => Object.assign({}, output, {[key]: output2} as Record<KeyT, Output2T>));
		});
	}

	thenDo<U>(f: (..._: any[]) => Promise<U>): AsyncIO<U> {
		const resolver = async (..._: any[]) => {
			await this.evaluate();
			return f();
		};

		return new AsyncIO(resolver);
	}

	tap<EffectT extends BindEffectType<any> | AsyncBindEffectType<any>>(f: (input: T) => EffectT): this {
		return this.flatMap((output: T) => {
			const asyncEffect = f(output).toAsync();
			// eslint-disable-next-line @typescript-eslint/naming-convention
			const asyncIOEffect = asyncBindEffectToIO(asyncEffect);
			return asyncIOEffect.map(async () => output);
		}) as this;
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	thenDoIO<U>(io: AsyncIO<U>): AsyncIO<U> {
		return this.thenDo(async () => io.evaluate());
	}

	thenDoWithInput<InputT, Output2T>(f: (input: InputT) => Promise<Output2T>): AsyncSafeComputation<InputT, Output2T> {
		const resolver = async (input: InputT) => {
			await this.evaluate();
			return f(input);
		};

		return new AsyncSafeComputation(resolver);
	}

	thenDoSafeComputation<InputT, Output2T>(
		computation: AsyncSafeComputation<InputT, Output2T>,
	): AsyncSafeComputation<InputT, Output2T> {
		return this.thenDoWithInput(async (input: InputT) => computation.evaluate(input));
	}

	thenDoWithError<ErrorT, Output2T>(f: (..._: any[]) => Promise<Either<ErrorT, Output2T>>): AsyncTask<ErrorT, Output2T> {
		const resolver = async (..._: any[]) => {
			await this.evaluate();
			return f();
		};

		return new AsyncTask(resolver);
	}

	thenDoTask<Error2T, Output2T>(task: AsyncTask<Error2T, Output2T>): AsyncTask<Error2T, Output2T> {
		return this.thenDoWithError(async () => task.evaluate());
	}

	thenDoWithInputAndError<InputT, Error2T, Output2T>(
		f: (input: InputT) => Promise<Either<Error2T, Output2T>>,
	): AsyncComputation<InputT, Error2T, Output2T> {
		const resolver = async (input: InputT) => {
			await this.evaluate();
			return f(input);
		};

		return new AsyncComputation(resolver);
	}

	thenDoComputation<InputT, Error2T, Output2T>(
		computation: AsyncComputation<InputT, Error2T, Output2T>,
	): AsyncComputation<InputT, Error2T, Output2T> {
		return this.thenDoWithInputAndError(async (input: InputT) => computation.evaluate(input));
	}

	mapToTask<ErrorT, Output2T>(f: (x: T) => Promise<Either<ErrorT, Output2T>>): AsyncTask<ErrorT, Output2T> {
		const evaluate = async () => f(await this.evaluate());
		return new AsyncTask<ErrorT, Output2T>(evaluate);
	}

	mapToComputation<InputT, ErrorT, Output2T>(f: (x: T) => (i: InputT) => Promise<Either<ErrorT, Output2T>>): AsyncComputation<InputT, ErrorT, Output2T> {
		const evaluate = async (i: InputT) => f(await this.evaluate())(i);
		return new AsyncComputation<InputT, ErrorT, Output2T>(evaluate);
	}

	map<Output2T>(f: (x: T) => Promise<Output2T>): AsyncIO<Output2T> {
		const evaluate = async () => f(await this.evaluate());
		return new AsyncIO(evaluate);
	}

	apply<Output2T>(f: AsyncIO<(x: T) => Promise<Output2T>>): AsyncIO<Output2T> {
		return f.flatMap(g => this.map(g));
	}

	pure<Output2T>(x: Promise<Output2T>): AsyncIO<Output2T> {
		return new AsyncIO(async () => x);
	}

	flatMap<Output2T>(f: (x: T) => AsyncIO<Output2T>): AsyncIO<Output2T> {
		const evaluate = async () => f(await this.evaluate()).evaluate();
		return new AsyncIO(evaluate);
	}

	flatMapWithInput<InputT, Output2T>(f: (x: T) => AsyncSafeComputation<InputT, Output2T>): AsyncSafeComputation<InputT, Output2T> {
		const evaluate = async (input: InputT) => f(await this.evaluate()).evaluate(input);
		return new AsyncSafeComputation(evaluate);
	}

	flatMapWithError<ErrorT>(f: (x: T) => AsyncTask<ErrorT, T>): AsyncTask<ErrorT, T> {
		const evaluate = async () => f(await this.evaluate()).evaluate();
		return new AsyncTask(evaluate);
	}

	flatMapWithInputAndError<InputT, ErrorT, Output2T>(
		f: (x: T) => AsyncComputation<InputT, ErrorT, Output2T>,
	): AsyncComputation<InputT, ErrorT, Output2T> {
		const evaluate = async (input: InputT) => f(await this.evaluate()).evaluate(input);
		return new AsyncComputation(evaluate);
	}

	zip<Output2T>(other: AsyncIO<Output2T>): AsyncIO<[T, Output2T]> {
		const evaluate = async (): Promise<[T, Output2T]> => {
			const output = await this.evaluate();
			const otherOutput = await other.evaluate();

			return [output, otherOutput];
		};

		return new AsyncIO(evaluate);
	}

	zip2<U, V>(
		u: AsyncIO<U>,
		v: AsyncIO<V>,
	): AsyncIO<[T, U, V]> {
		const evaluate = async (): Promise<[T, U, V]> => {
			const output = await this.evaluate();
			const uOutput = await u.evaluate();
			const vOutput = await v.evaluate();

			return [output, uOutput, vOutput];
		};

		return new AsyncIO(evaluate);
	}

	zip3<U, V, W>(
		u: AsyncIO<U>,
		v: AsyncIO<V>,
		w: AsyncIO<W>,
	): AsyncIO<[T, U, V, W]> {
		const evaluate = async (): Promise<[T, U, V, W]> => {
			const output = await this.evaluate();
			const uOutput = await u.evaluate();
			const vOutput = await v.evaluate();
			const wOutput = await w.evaluate();

			return [output, uOutput, vOutput, wOutput];
		};

		return new AsyncIO(evaluate);
	}

	zip4<U, V, W, X>(
		u: AsyncIO<U>,
		v: AsyncIO<V>,
		w: AsyncIO<W>,
		x: AsyncIO<X>,
	): AsyncIO<[T, U, V, W, X]> {
		const evaluate = async (): Promise<[T, U, V, W, X]> => {
			const output = await this.evaluate();
			const uOutput = await u.evaluate();
			const vOutput = await v.evaluate();
			const wOutput = await w.evaluate();
			const xOutput = await x.evaluate();

			return [output, uOutput, vOutput, wOutput, xOutput];
		};

		return new AsyncIO(evaluate);
	}

	zip5<U, V, W, X, Y>(
		u: AsyncIO<U>,
		v: AsyncIO<V>,
		w: AsyncIO<W>,
		x: AsyncIO<X>,
		y: AsyncIO<Y>,
	): AsyncIO<[T, U, V, W, X, Y]> {
		const evaluate = async (): Promise<[T, U, V, W, X, Y]> => {
			const output = await this.evaluate();
			const uOutput = await u.evaluate();
			const vOutput = await v.evaluate();
			const wOutput = await w.evaluate();
			const xOutput = await x.evaluate();
			const yOutput = await y.evaluate();

			return [output, uOutput, vOutput, wOutput, xOutput, yOutput];
		};

		return new AsyncIO(evaluate);
	}

	zip6<U, V, W, X, Y, Z>(
		u: AsyncIO<U>,
		v: AsyncIO<V>,
		w: AsyncIO<W>,
		x: AsyncIO<X>,
		y: AsyncIO<Y>,
		z: AsyncIO<Z>,
	): AsyncIO<[T, U, V, W, X, Y, Z]> {
		const evaluate = async (): Promise<[T, U, V, W, X, Y, Z]> => {
			const output = await this.evaluate();
			const uOutput = await u.evaluate();
			const vOutput = await v.evaluate();
			const wOutput = await w.evaluate();
			const xOutput = await x.evaluate();
			const yOutput = await y.evaluate();
			const zOutput = await z.evaluate();

			return [output, uOutput, vOutput, wOutput, xOutput, yOutput, zOutput];
		};

		return new AsyncIO(evaluate);
	}

	zipN<U>(...others: Array<AsyncIO<U>>): AsyncIO<[T, ...U[]]> {
		const evaluate = async (): Promise<[T, ...U[]]> => {
			const output = await this.evaluate();
			const otherOutputs = await Promise.all(others.map(async other => other.evaluate()));

			return [output, ...otherOutputs];
		};

		return new AsyncIO(evaluate);
	}

	// eslint-disable-next-line @typescript-eslint/prefer-return-this-type
	bindInput<InputT>(input: InputT): AsyncIO<T> {
		return this;
	}

	toAsync(): this {
		return this;
	}

	toTask(): AsyncTask<never, T> {
		return new AsyncTask(async () => new Right<never, T>(await this.evaluate()));
	}

	toSafeComputation(): AsyncSafeComputation<any, T> {
		return new AsyncSafeComputation(async () => this.evaluate());
	}

	toComputation(): AsyncComputation<any, never, T> {
		return new AsyncComputation(async () => new Right<never, T>(await this.evaluate()));
	}
}
