import {AsyncComputation} from './AsyncComputation.js';
import {AsyncTask} from './AsyncTask.js';
import {type Either} from './Either.js';
import {type AsyncMonad} from './Monad.js';

// eslint-disable-next-line @typescript-eslint/naming-convention
export class AsyncIO<T> implements AsyncMonad<T> {
	constructor(public readonly evaluate: (..._: any[]) => Promise<T>) {}

	thenDo<U>(f: (..._: any[]) => Promise<U>): AsyncIO<U> {
		const resolver = async (..._: any[]) => {
			await this.evaluate();
			return f();
		};

		return new AsyncIO(resolver);
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	thenDoIO<U>(io: AsyncIO<U>): AsyncIO<U> {
		const resolver = async (..._: any[]) => {
			await this.evaluate();
			return io.evaluate();
		};

		return new AsyncIO(resolver);
	}

	thenDoWithError<E, U>(f: (..._: any[]) => Promise<Either<E, U>>): AsyncTask<E, U> {
		const resolver = async (..._: any[]) => {
			await this.evaluate();
			return f();
		};

		return new AsyncTask(resolver);
	}

	thenDoTask<E2, O2>(task: AsyncTask<E2, O2>): AsyncTask<E2, O2> {
		const resolver = async (..._: any[]) => {
			await this.evaluate();
			return task.evaluate();
		};

		return new AsyncTask(resolver);
	}

	thenDoWithNewInputAndError<I, E2, O2>(
		f: (input: I) => Promise<Either<E2, O2>>,
	): AsyncComputation<I, E2, O2> {
		const resolver = async (input: I) => {
			await this.evaluate();
			return f(input);
		};

		return new AsyncComputation(resolver);
	}

	thenDoComputation<I, E2, O2>(
		computation: AsyncComputation<I, E2, O2>,
	): AsyncComputation<I, E2, O2> {
		const resolver = async (input: I) => {
			await this.evaluate();
			return computation.evaluate(input);
		};

		return new AsyncComputation(resolver);
	}

	mapToTask<E, U>(f: (x: T) => Promise<Either<E, U>>): AsyncTask<E, U> {
		const evaluate = async () => f(await this.evaluate());
		return new AsyncTask<E, U>(evaluate);
	}

	mapToComputation<I, E, U>(f: (x: T) => (i: I) => Promise<Either<E, U>>): AsyncComputation<I, E, U> {
		const evaluate = async (i: I) => f(await this.evaluate())(i);
		return new AsyncComputation<I, E, U>(evaluate);
	}

	map<U>(f: (x: T) => Promise<U>): AsyncIO<U> {
		const evaluate = async () => f(await this.evaluate());
		return new AsyncIO(evaluate);
	}

	apply<U>(f: AsyncIO<(x: T) => Promise<U>>): AsyncIO<U> {
		return f.flatMap(g => this.map(g));
	}

	pure<U>(x: Promise<U>): AsyncIO<U> {
		return new AsyncIO(async () => x);
	}

	flatMap<U>(f: (x: T) => AsyncIO<U>): AsyncIO<U> {
		const evaluate = async () => f(await this.evaluate()).evaluate();
		return new AsyncIO(evaluate);
	}

	zip<U>(other: AsyncIO<U>): AsyncIO<[T, U]> {
		const evaluate = async (): Promise<[T, U]> => {
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
}
