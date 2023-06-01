
import {AsyncComputation} from './AsyncComputation.js';
import {type AsyncIO} from './AsyncIO.js';
import {type AsyncTask} from './AsyncTask.js';
import {type AsyncContravariantFunctor} from './Contravariant.js';
import {type Either} from './Either.js';
import {type AsyncMonad} from './Monad.js';

export class AsyncSafeComputation<Input, out Output> implements AsyncMonad<Output>, AsyncContravariantFunctor<Input> {
	constructor(public readonly evaluate: (input: Input) => Promise<Output>) {}

	thenDo<Output2>(f: (..._: any[]) => Promise<Output2>): AsyncSafeComputation<Input, Output2> {
		return new AsyncSafeComputation<Input, Output2>(async input => f(await this.evaluate(input)));
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	thenDoIO<Output2>(io: AsyncIO<Output2>): AsyncSafeComputation<Input, Output2> {
		return this.thenDo(async () => io.evaluate());
	}

	thenDoWithError<Error, Output2>(f: (..._: any[]) => Promise<Either<Error, Output2>>): AsyncComputation<Input, Error, Output2> {
		return new AsyncComputation<Input, Error, Output2>(async input => f(await this.evaluate(input)));
	}

	thenDoTask<Error, Output2>(task: AsyncTask<Error, Output2>): AsyncComputation<Input, Error, Output2> {
		return this.thenDoWithError(async () => task.evaluate());
	}

	thenDoWithSameInput<Output2>(f: (input: Input) => Promise<Output2>): AsyncSafeComputation<Input, Output2> {
		return new AsyncSafeComputation<Input, Output2>(async (input: Input) => {
			await this.evaluate(input);
			return f(input);
		});
	}

	thenDoSafeComputationWithSameInput<Output2>(
		computation: AsyncSafeComputation<Input, Output2>,
	): AsyncSafeComputation<Input, Output2> {
		return this.thenDoWithSameInput(async (input: Input) => computation.evaluate(input));
	}

	thenDoWithNewInput<Input2, Output2>(f: (input: Input2) => Promise<Output2>): AsyncSafeComputation<[Input, Input2], Output2> {
		return new AsyncSafeComputation<[Input, Input2], Output2>(async ([input, input2]: [Input, Input2]) => {
			await this.evaluate(input);
			return f(input2);
		});
	}

	thenDoSafeComputation<Input2, Output2>(
		computation: AsyncSafeComputation<Input2, Output2>,
	): AsyncSafeComputation<[Input, Input2], Output2> {
		return this.thenDoWithNewInput(async (input: Input2) => computation.evaluate(input));
	}

	thenDoWithSameInputAndError<Error, Output2>(
		f: (input: Input) => Promise<Either<Error, Output2>>,
	): AsyncComputation<Input, Error, Output2> {
		return new AsyncComputation<Input, Error, Output2>(async (input: Input) => {
			await this.evaluate(input);
			return f(input);
		});
	}

	thenDoComputationWithSameInput<Error, Output2>(
		computation: AsyncComputation<Input, Error, Output2>,
	): AsyncComputation<Input, Error, Output2> {
		return this.thenDoWithError(async (input: Input) => computation.evaluate(input));
	}

	thenDoWithNewInputAndError<Input2, Error, Output2>(
		f: (input: Input2) => Promise<Either<Error, Output2>>,
	): AsyncComputation<[Input, Input2], Error, Output2> {
		return new AsyncComputation<[Input, Input2], Error, Output2>(async ([input, input2]: [Input, Input2]) => {
			await this.evaluate(input);
			return f(input2);
		});
	}

	thenDoComputation<Input2, Error, Output2>(
		computation: AsyncComputation<Input2, Error, Output2>,
	): AsyncComputation<[Input, Input2], Error, Output2> {
		return this.thenDoWithNewInputAndError(async (input: Input2) => computation.evaluate(input));
	}

	contramap<U>(f: (x: U) => Promise<Input>): AsyncSafeComputation<U, Output> {
		const evaluate = async (input: U): Promise<Output> => {
			const output = await f(input);
			return this.evaluate(output);
		};

		return new AsyncSafeComputation(evaluate);
	}

	map<O2>(f: (output: Output) => Promise<O2>): AsyncSafeComputation<Input, O2> {
		const evaluate = async (input: Input): Promise<O2> => {
			const output = await this.evaluate(input);

			return f(output);
		};

		return new AsyncSafeComputation(evaluate);
	}

	apply<O2>(f: AsyncSafeComputation<Input, (x: Output) => Promise<O2>>): AsyncSafeComputation<Input, O2> {
		return f.flatMap(g => this.map(g));
	}

	pure<U>(x: Promise<U>): AsyncSafeComputation<any, U> {
		return new AsyncSafeComputation<any, U>(async () => x);
	}

	flatMap<O2>(f: (x: Output) => AsyncSafeComputation<Input, O2>): AsyncSafeComputation<Input, O2> {
		const evaluate = async (input: Input): Promise<O2> => {
			const output = await this.evaluate(input);

			return f(output).evaluate(input);
		};

		return new AsyncSafeComputation(evaluate);
	}

	zip<U>(other: AsyncSafeComputation<Input, U>): AsyncSafeComputation<Input, [Output, U]> {
		const evaluate = async (input: Input): Promise<[Output, U]> => {
			const output = await this.evaluate(input);
			const otherOutput = await other.evaluate(input);

			return [output, otherOutput];
		};

		return new AsyncSafeComputation(evaluate);
	}

	zip2<U, V>(
		c2: AsyncSafeComputation<Input, U>,
		c3: AsyncSafeComputation<Input, V>,
	): AsyncSafeComputation<Input, [Output, U, V]> {
		const evaluate = async (input: Input): Promise<[Output, U, V]> => {
			const output = await this.evaluate(input);
			const o2 = await c2.evaluate(input);
			const o3 = await c3.evaluate(input);

			return [output, o2, o3];
		};

		return new AsyncSafeComputation(evaluate);
	}

	zip3<U, V, W>(
		c2: AsyncSafeComputation<Input, U>,
		c3: AsyncSafeComputation<Input, V>,
		c4: AsyncSafeComputation<Input, W>,
	): AsyncSafeComputation<Input, [Output, U, V, W]> {
		const evaluate = async (input: Input): Promise<[Output, U, V, W]> => {
			const output = await this.evaluate(input);
			const o2 = await c2.evaluate(input);
			const o3 = await c3.evaluate(input);
			const o4 = await c4.evaluate(input);

			return [output, o2, o3, o4];
		};

		return new AsyncSafeComputation(evaluate);
	}

	zip4<U, V, W, X>(
		c2: AsyncSafeComputation<Input, U>,
		c3: AsyncSafeComputation<Input, V>,
		c4: AsyncSafeComputation<Input, W>,
		c5: AsyncSafeComputation<Input, X>,
	): AsyncSafeComputation<Input, [Output, U, V, W, X]> {
		const evaluate = async (input: Input): Promise<[Output, U, V, W, X]> => {
			const output = await this.evaluate(input);
			const o2 = await c2.evaluate(input);
			const o3 = await c3.evaluate(input);
			const o4 = await c4.evaluate(input);
			const o5 = await c5.evaluate(input);

			return [output, o2, o3, o4, o5];
		};

		return new AsyncSafeComputation(evaluate);
	}

	zip5<U, V, W, X, Y>(
		c2: AsyncSafeComputation<Input, U>,
		c3: AsyncSafeComputation<Input, V>,
		c4: AsyncSafeComputation<Input, W>,
		c5: AsyncSafeComputation<Input, X>,
		c6: AsyncSafeComputation<Input, Y>,
	): AsyncSafeComputation<Input, [Output, U, V, W, X, Y]> {
		const evaluate = async (input: Input): Promise<[Output, U, V, W, X, Y]> => {
			const output = await this.evaluate(input);
			const o2 = await c2.evaluate(input);
			const o3 = await c3.evaluate(input);
			const o4 = await c4.evaluate(input);
			const o5 = await c5.evaluate(input);
			const o6 = await c6.evaluate(input);

			return [output, o2, o3, o4, o5, o6];
		};

		return new AsyncSafeComputation(evaluate);
	}

	zip6<U, V, W, X, Y, Z>(
		c2: AsyncSafeComputation<Input, U>,
		c3: AsyncSafeComputation<Input, V>,
		c4: AsyncSafeComputation<Input, W>,
		c5: AsyncSafeComputation<Input, X>,
		c6: AsyncSafeComputation<Input, Y>,
		c7: AsyncSafeComputation<Input, Z>,
	): AsyncSafeComputation<Input, [Output, U, V, W, X, Y, Z]> {
		const evaluate = async (input: Input): Promise<[Output, U, V, W, X, Y, Z]> => {
			const output = await this.evaluate(input);
			const o2 = await c2.evaluate(input);
			const o3 = await c3.evaluate(input);
			const o4 = await c4.evaluate(input);
			const o5 = await c5.evaluate(input);
			const o6 = await c6.evaluate(input);
			const o7 = await c7.evaluate(input);

			return [output, o2, o3, o4, o5, o6, o7];
		};

		return new AsyncSafeComputation(evaluate);
	}

	zipN<U>(...cs: Array<AsyncSafeComputation<Input, U>>): AsyncSafeComputation<Input, [Output, ...U[]]> {
		const evaluate = async (input: Input): Promise<[Output, ...U[]]> => {
			const output = await this.evaluate(input);
			const otherOutputs = await Promise.all(cs.map(async c => c.evaluate(input)));

			return [output, ...otherOutputs];
		};

		return new AsyncSafeComputation(evaluate);
	}
}
