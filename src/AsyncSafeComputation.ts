
import {AsyncComputation} from './AsyncComputation.js';
import {AsyncIO} from './AsyncIO.js';
import {type AsyncTask} from './AsyncTask.js';
import {type AsyncContravariantFunctor} from './Contravariant.js';
import {Right, type Either} from './Either.js';
import {type AsyncMonad} from './Monad.js';
import {type AsyncEffect, type AsyncBindEffectType, type BindEffectType, asyncBindEffectToIO} from './definitions.js';

export class AsyncSafeComputation<in InputT, out OutputT> implements AsyncEffect<InputT, never, OutputT>, AsyncContravariantFunctor<InputT> {
	static of<OutputT>(x: OutputT): AsyncSafeComputation<any, OutputT> {
		return new AsyncSafeComputation<any, OutputT>(async () => x);
	}

	static do(): AsyncSafeComputation<any, Record<any, any>> {
		return AsyncSafeComputation.of({});
	}

	constructor(public readonly evaluate: (input: InputT) => Promise<OutputT>) {}

	bindKey<KeyT extends string | number | symbol, Output2T>(key: KeyT, f: (input: OutputT) => BindEffectType<Output2T> | AsyncBindEffectType<Output2T>): AsyncSafeComputation<InputT, OutputT & Record<KeyT, Output2T>> {
		const resolver = async (input: InputT) => {
			const output = await this.evaluate(input);
			const asyncEffect = f(output).toAsync();
			const asyncSafeComputationEffect = asyncBindEffectToIO<Output2T, typeof asyncEffect>(asyncEffect).toSafeComputation();
			const output2 = await asyncSafeComputationEffect.evaluate(input);
			return Object.assign({}, output, {[key]: output2} as Record<KeyT, Output2T>);
		};

		return new AsyncSafeComputation<InputT, OutputT & Record<KeyT, Output2T>>(resolver);
	}

	tap<EffectT extends BindEffectType<any> | AsyncBindEffectType<any>>(f: (input: OutputT) => EffectT): this {
		const resolver = async (input: InputT) => {
			const output = await this.evaluate(input);
			const effect = f(output);
			await effect.evaluate(input);
			return output;
		};

		return new AsyncSafeComputation<InputT, OutputT>(resolver) as this;
	}

	thenDo<Output2T>(f: (..._: any[]) => Promise<Output2T>): AsyncSafeComputation<InputT, Output2T> {
		return new AsyncSafeComputation<InputT, Output2T>(async input => f(await this.evaluate(input)));
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	thenDoIO<Output2T>(io: AsyncIO<Output2T>): AsyncSafeComputation<InputT, Output2T> {
		return this.thenDo(async () => io.evaluate());
	}

	thenDoWithError<ErrorT, Output2T>(f: (..._: any[]) => Promise<Either<ErrorT, Output2T>>): AsyncComputation<InputT, ErrorT, Output2T> {
		return new AsyncComputation<InputT, ErrorT, Output2T>(async input => f(await this.evaluate(input)));
	}

	thenDoTask<ErrorT, Output2T>(task: AsyncTask<ErrorT, Output2T>): AsyncComputation<InputT, ErrorT, Output2T> {
		return this.thenDoWithError(async () => task.evaluate());
	}

	thenDoWithSameInput<Input2T extends InputT, Output2T>(f: (input: Input2T) => Promise<Output2T>): AsyncSafeComputation<Input2T, Output2T> {
		return new AsyncSafeComputation<Input2T, Output2T>(async (input: Input2T) => {
			await this.evaluate(input);
			return f(input);
		});
	}

	thenDoSafeComputationWithSameInput<Input2T extends InputT, Output2T>(
		computation: AsyncSafeComputation<Input2T, Output2T>,
	): AsyncSafeComputation<Input2T, Output2T> {
		return this.thenDoWithSameInput(async (input: Input2T) => computation.evaluate(input));
	}

	thenDoWithNewInput<Input2T, Output2T>(f: (input: Input2T) => Promise<Output2T>): AsyncSafeComputation<[InputT, Input2T], Output2T> {
		return new AsyncSafeComputation<[InputT, Input2T], Output2T>(async ([input, input2]: [InputT, Input2T]) => {
			await this.evaluate(input);
			return f(input2);
		});
	}

	thenDoSafeComputation<Input2, Output2>(
		computation: AsyncSafeComputation<Input2, Output2>,
	): AsyncSafeComputation<[InputT, Input2], Output2> {
		return this.thenDoWithNewInput(async (input: Input2) => computation.evaluate(input));
	}

	thenDoWithSameInputAndError<Input2T extends InputT, ErrorT, Output2T>(
		f: (input: Input2T) => Promise<Either<ErrorT, Output2T>>,
	): AsyncComputation<Input2T, ErrorT, Output2T> {
		return new AsyncComputation<Input2T, ErrorT, Output2T>(async (input: Input2T) => {
			await this.evaluate(input);
			return f(input);
		});
	}

	thenDoComputationWithSameInput<Input2T extends InputT, ErrorT, Output2T>(
		computation: AsyncComputation<Input2T, ErrorT, Output2T>,
	): AsyncComputation<Input2T, ErrorT, Output2T> {
		return this.thenDoWithSameInputAndError(async (input: Input2T) => computation.evaluate(input));
	}

	thenDoWithNewInputAndError<Input2T, ErrorT, Output2T>(
		f: (input: Input2T) => Promise<Either<ErrorT, Output2T>>,
	): AsyncComputation<[InputT, Input2T], ErrorT, Output2T> {
		return new AsyncComputation<[InputT, Input2T], ErrorT, Output2T>(async ([input, input2]: [InputT, Input2T]) => {
			await this.evaluate(input);
			return f(input2);
		});
	}

	thenDoComputation<Input2T, ErrorT, Output2T>(
		computation: AsyncComputation<Input2T, ErrorT, Output2T>,
	): AsyncComputation<[InputT, Input2T], ErrorT, Output2T> {
		return this.thenDoWithNewInputAndError(async (input: Input2T) => computation.evaluate(input));
	}

	contramap<Input2T>(f: (x: Input2T) => Promise<InputT>): AsyncSafeComputation<Input2T, OutputT> {
		const evaluate = async (input: Input2T): Promise<OutputT> => {
			const output = await f(input);
			return this.evaluate(output);
		};

		return new AsyncSafeComputation(evaluate);
	}

	map<Output2T>(f: (output: OutputT) => Promise<Output2T>): AsyncSafeComputation<InputT, Output2T> {
		const evaluate = async (input: InputT): Promise<Output2T> => {
			const output = await this.evaluate(input);

			return f(output);
		};

		return new AsyncSafeComputation(evaluate);
	}

	apply<Output2T>(f: AsyncSafeComputation<InputT, (x: OutputT) => Promise<Output2T>>): AsyncSafeComputation<InputT, Output2T> {
		return f.flatMap(g => this.map(g));
	}

	pure<Output2T>(x: Promise<Output2T>): AsyncSafeComputation<any, Output2T> {
		return new AsyncSafeComputation<any, Output2T>(async () => x);
	}

	flatMap<Output2T>(f: (x: OutputT) => AsyncSafeComputation<InputT, Output2T>): AsyncSafeComputation<InputT, Output2T> {
		const evaluate = async (input: InputT): Promise<Output2T> => {
			const output = await this.evaluate(input);

			return f(output).evaluate(input);
		};

		return new AsyncSafeComputation(evaluate);
	}

	flatMapWithNewInput<Input2T, Output2T>(
		f: (x: OutputT) => AsyncSafeComputation<Input2T, Output2T>,
	): AsyncSafeComputation<[InputT, Input2T], Output2T> {
		const evaluate = async ([input, input2]: [InputT, Input2T]): Promise<Output2T> => {
			const output = await this.evaluate(input);

			return f(output).evaluate(input2);
		};

		return new AsyncSafeComputation(evaluate);
	}

	flatMapWithError<ErrorT, Output2T>(
		f: (x: OutputT) => AsyncTask<ErrorT, Output2T>,
	): AsyncComputation<InputT, ErrorT, Output2T> {
		const evaluate = async (input: InputT): Promise<Either<ErrorT, Output2T>> => {
			const output = await this.evaluate(input);

			return f(output).evaluate();
		};

		return new AsyncComputation(evaluate);
	}

	flatMapWithNewInputAndError<Input2T, ErrorT, Output2T>(
		f: (x: OutputT) => AsyncComputation<Input2T, ErrorT, Output2T>,
	): AsyncComputation<[InputT, Input2T], ErrorT, Output2T> {
		const evaluate = async ([input, input2]: [InputT, Input2T]): Promise<Either<ErrorT, Output2T>> => {
			const output = await this.evaluate(input);

			return f(output).evaluate(input2);
		};

		return new AsyncComputation(evaluate);
	}

	zip<Output2T>(other: AsyncSafeComputation<InputT, Output2T>): AsyncSafeComputation<InputT, [OutputT, Output2T]> {
		const evaluate = async (input: InputT): Promise<[OutputT, Output2T]> => {
			const output = await this.evaluate(input);
			const otherOutput = await other.evaluate(input);

			return [output, otherOutput];
		};

		return new AsyncSafeComputation(evaluate);
	}

	zip2<O2T, O3T>(
		c2: AsyncSafeComputation<InputT, O2T>,
		c3: AsyncSafeComputation<InputT, O3T>,
	): AsyncSafeComputation<InputT, [OutputT, O2T, O3T]> {
		const evaluate = async (input: InputT): Promise<[OutputT, O2T, O3T]> => {
			const output = await this.evaluate(input);
			const o2 = await c2.evaluate(input);
			const o3 = await c3.evaluate(input);

			return [output, o2, o3];
		};

		return new AsyncSafeComputation(evaluate);
	}

	zip3<O2T, O3T, O4T>(
		c2: AsyncSafeComputation<InputT, O2T>,
		c3: AsyncSafeComputation<InputT, O3T>,
		c4: AsyncSafeComputation<InputT, O4T>,
	): AsyncSafeComputation<InputT, [OutputT, O2T, O3T, O4T]> {
		const evaluate = async (input: InputT): Promise<[OutputT, O2T, O3T, O4T]> => {
			const output = await this.evaluate(input);
			const o2 = await c2.evaluate(input);
			const o3 = await c3.evaluate(input);
			const o4 = await c4.evaluate(input);

			return [output, o2, o3, o4];
		};

		return new AsyncSafeComputation(evaluate);
	}

	zip4<O2T, O3T, O4T, O5T>(
		c2: AsyncSafeComputation<InputT, O2T>,
		c3: AsyncSafeComputation<InputT, O3T>,
		c4: AsyncSafeComputation<InputT, O4T>,
		c5: AsyncSafeComputation<InputT, O5T>,
	): AsyncSafeComputation<InputT, [OutputT, O2T, O3T, O4T, O5T]> {
		const evaluate = async (input: InputT): Promise<[OutputT, O2T, O3T, O4T, O5T]> => {
			const output = await this.evaluate(input);
			const o2 = await c2.evaluate(input);
			const o3 = await c3.evaluate(input);
			const o4 = await c4.evaluate(input);
			const o5 = await c5.evaluate(input);

			return [output, o2, o3, o4, o5];
		};

		return new AsyncSafeComputation(evaluate);
	}

	zip5<O2T, O3T, O4T, O5T, O6T>(
		c2: AsyncSafeComputation<InputT, O2T>,
		c3: AsyncSafeComputation<InputT, O3T>,
		c4: AsyncSafeComputation<InputT, O4T>,
		c5: AsyncSafeComputation<InputT, O5T>,
		c6: AsyncSafeComputation<InputT, O6T>,
	): AsyncSafeComputation<InputT, [OutputT, O2T, O3T, O4T, O5T, O6T]> {
		const evaluate = async (input: InputT): Promise<[OutputT, O2T, O3T, O4T, O5T, O6T]> => {
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

	zip6<O2T, O3T, O4T, O5T, O6T, O7T>(
		c2: AsyncSafeComputation<InputT, O2T>,
		c3: AsyncSafeComputation<InputT, O3T>,
		c4: AsyncSafeComputation<InputT, O4T>,
		c5: AsyncSafeComputation<InputT, O5T>,
		c6: AsyncSafeComputation<InputT, O6T>,
		c7: AsyncSafeComputation<InputT, O7T>,
	): AsyncSafeComputation<InputT, [OutputT, O2T, O3T, O4T, O5T, O6T, O7T]> {
		const evaluate = async (input: InputT): Promise<[OutputT, O2T, O3T, O4T, O5T, O6T, O7T]> => {
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

	zipN<Output2T>(...cs: Array<AsyncSafeComputation<InputT, Output2T>>): AsyncSafeComputation<InputT, [OutputT, ...Output2T[]]> {
		const evaluate = async (input: InputT): Promise<[OutputT, ...Output2T[]]> => {
			const output = await this.evaluate(input);
			const otherOutputs = await Promise.all(cs.map(async c => c.evaluate(input)));

			return [output, ...otherOutputs];
		};

		return new AsyncSafeComputation(evaluate);
	}

	bindInput(input: InputT): AsyncIO<OutputT> {
		return new AsyncIO(async () => this.evaluate(input));
	}

	bindAsyncInput(inputFn: () => Promise<InputT>): AsyncIO<OutputT> {
		return new AsyncIO(async () => this.evaluate(await inputFn()));
	}

	toAsync(): this {
		return this;
	}

	toSafeComputation(): this {
		return this;
	}

	toComputation(): AsyncComputation<InputT, never, OutputT> {
		return new AsyncComputation(async (input: InputT) => new Right<never, OutputT>(await this.evaluate(input)));
	}
}
