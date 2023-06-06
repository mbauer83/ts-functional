import {AsyncComputation} from './AsyncComputation.js';
import {AsyncIO} from './AsyncIO.js';
import {AsyncSafeComputation} from './AsyncSafeComputation.js';
import {type Either, Right, Left} from './Either.js';
import {type BindEffectType, type AsyncEffect, type AsyncBindEffectType, asyncBindEffectToIO} from './definitions.js';

export class AsyncTask<out ErrorT, out OutputT> implements AsyncEffect<any, ErrorT, OutputT> {
	static of<Output2T>(x: Output2T): AsyncTask<never, Output2T> {
		return new AsyncTask<never, Output2T>(async () => new Right<never, Output2T>(x));
	}

	static do(): AsyncTask<never, Record<any, any>> {
		return AsyncTask.of({});
	}

	constructor(public readonly evaluate: (..._: any[]) => Promise<Either<ErrorT, OutputT>>) {}

	bindKey<KeyT extends (string | symbol | number), Output2T, EffectT extends (BindEffectType<Output2T> | AsyncBindEffectType<Output2T>)>(key: KeyT, f: (input: OutputT) => EffectT): AsyncTask<ErrorT, OutputT & Record<KeyT, Output2T>> {
		return this.flatMap((output: OutputT) => {
			const asyncEffect = f(output).toAsync();
			const asyncTaskEffect = asyncBindEffectToIO<Output2T, typeof asyncEffect>(asyncEffect).toTask();
			return asyncTaskEffect.map(async (output2: Output2T) => Object.assign({}, output, {[key]: output2} as Record<KeyT, Output2T>));
		});
	}

	tap<EffectT extends BindEffectType<any> | AsyncBindEffectType<any>>(f: (input: OutputT) => EffectT): this {
		return this.flatMap((input: OutputT) => {
			const asyncEffect = f(input).toAsync();
			const asyncTaskEffect = asyncBindEffectToIO<OutputT, typeof asyncEffect>(asyncEffect).toTask();
			return asyncTaskEffect.map(async () => input);
		}) as this;
	}

	thenDo<Output2T>(f: (_: any) => Promise<Output2T>): AsyncTask<ErrorT, Output2T> {
		const evaluate = async (input: any): Promise<Either<ErrorT, Output2T>> => {
			const output = await this.evaluate(input);
			if (output.isLeft()) {
				return new Left(output.get()) as Either<ErrorT, Output2T>;
			}

			return f(output.get() as OutputT).then(x => new Right(x) as Either<ErrorT, Output2T>);
		};

		return new AsyncTask(evaluate);
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	thenDoIO<Output2T>(io: AsyncIO<Output2T>): AsyncTask<ErrorT, Output2T> {
		const evaluate = async (input: any): Promise<Either<ErrorT, Output2T>> => {
			const output = await this.evaluate(input);
			if (output.isLeft()) {
				return new Left(output.get()) as Either<ErrorT, Output2T>;
			}

			return new Right(await io.evaluate());
		};

		return new AsyncTask(evaluate);
	}

	thenDoWithInput<InputT, Output2T>(f: (input: InputT) => Promise<Output2T>): AsyncComputation<InputT, ErrorT, Output2T> {
		const resolver = async (input: InputT): Promise<Either<ErrorT, Output2T>> => {
			const output = await this.evaluate(input);
			if (output.isLeft()) {
				return new Left(output.get()) as Either<ErrorT, Output2T>;
			}

			return new Right(await f(input));
		};

		return new AsyncComputation(resolver);
	}

	thenDoSafeComputation<InputT, Output2T>(
		computation: AsyncSafeComputation<InputT, Output2T>,
	): AsyncComputation<InputT, ErrorT, Output2T> {
		return this.thenDoWithInput(async (input: InputT) => computation.evaluate(input));
	}

	thenDoWithNewError<Error2T, Output2T>(f: (_: any) => Promise<Either<Error2T, Output2T>>): AsyncTask<ErrorT | Error2T, Output2T> {
		const evaluate = async (input: any): Promise<Either<ErrorT | Error2T, Output2T>> => {
			const output = await this.evaluate(input);
			if (output.isLeft()) {
				return new Left(output.get()) as Either<ErrorT | Error2T, Output2T>;
			}

			return f(output.get() as Output2T);
		};

		return new AsyncTask(evaluate);
	}

	thenDoTask<Error2T, Output2T>(task: AsyncTask<Error2T, Output2T>): AsyncTask<ErrorT | Error2T, Output2T> {
		const evaluate = async (input: any): Promise<Either<ErrorT | Error2T, Output2T>> => {
			const output = await this.evaluate(input);
			if (output.isLeft()) {
				return new Left(output.get()) as Either<ErrorT | Error2T, Output2T>;
			}

			return task.evaluate(input);
		};

		return new AsyncTask(evaluate);
	}

	thenDoWithNewInputAndError<InputT, Error2T, Output2T>(
		f: (input: InputT) => Promise<Either<Error2T, Output2T>>,
	): AsyncComputation<InputT, ErrorT | Error2T, Output2T> {
		const evaluate = async (input: InputT): Promise<Either<ErrorT | Error2T, Output2T>> => {
			const output = await this.evaluate(input);
			if (output.isLeft()) {
				return new Left(output.get()) as Either<ErrorT | Error2T, Output2T>;
			}

			return f(input);
		};

		return new AsyncComputation(evaluate);
	}

	thenDoComputation<InputT, Error2T, Output2T>(
		computation: AsyncComputation<InputT, Error2T, Output2T>,
	): AsyncComputation<InputT, ErrorT | Error2T, Output2T> {
		const evaluate = async (input: InputT): Promise<Either<ErrorT | Error2T, Output2T>> => {
			const output = await this.evaluate(input);
			if (output.isLeft()) {
				return new Left(output.get()) as Either<ErrorT | Error2T, Output2T>;
			}

			return computation.evaluate(input);
		};

		return new AsyncComputation(evaluate);
	}

	mapToComputation<InputT, Error2T, Output2T>(f: (x: OutputT) => (i: InputT) => Promise<Either<ErrorT | Error2T, Output2T>>): AsyncComputation<InputT, ErrorT | Error2T, Output2T> {
		const evaluate = async (i: InputT) => {
			const thisValue = await this.evaluate();
			if (thisValue.isLeft()) {
				return thisValue as any as Either<ErrorT | Error2T, Output2T>;
			}

			return f(thisValue.get() as OutputT)(i);
		};

		return new AsyncComputation<InputT, ErrorT | Error2T, Output2T>(evaluate);
	}

	orElseDo<Output2T>(f: (..._: any[]) => Promise<Output2T>): AsyncIO<Output2T> {
		const evaluate = async (input: any): Promise<Output2T> => {
			const output = await this.evaluate(input);
			if (output.isLeft()) {
				return f(input);
			}

			return output.get() as Output2T;
		};

		return new AsyncIO(evaluate);
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	orElseDoIO<Output2T>(io: AsyncIO<Output2T>): AsyncIO<Output2T> {
		const evaluate = async (input: any): Promise<Output2T> => {
			const output = await this.evaluate(input);
			if (output.isLeft()) {
				return io.evaluate();
			}

			return output.get() as Output2T;
		};

		return new AsyncIO(evaluate);
	}

	orElseDoWithInput<InputT, Output2T>(
		f: (input: InputT) => Promise<Output2T>,
	): AsyncSafeComputation<InputT, Either<OutputT, Output2T>> {
		const resolver = async (input: InputT): Promise<Either<OutputT, Output2T>> => {
			const output = await this.evaluate(input);
			if (output.isLeft()) {
				return new Right(await f(input));
			}

			return new Right(output.get() as Output2T);
		};

		return new AsyncSafeComputation(resolver);
	}

	orElseDoSafeComputation<InputT, Output2T>(
		computation: AsyncSafeComputation<InputT, Output2T>,
	): AsyncSafeComputation<InputT, Either<OutputT, Output2T>> {
		return this.orElseDoWithInput(async (input: InputT) => computation.evaluate(input));
	}

	orElseDoWithNewError<Error2T, Output2T>(f: (..._: any[]) => Promise<Either<Error2T, Output2T>>): AsyncTask<Error2T, Output2T> {
		const evaluate = async (input: any): Promise<Either<Error2T, Output2T>> => {
			const output = await this.evaluate(input);
			if (output.isLeft()) {
				return f(input);
			}

			return new Right(output.get() as Output2T) as Either<Error2T, Output2T>;
		};

		return new AsyncTask(evaluate);
	}

	orElseDoTask<Error2T, Output2T>(task: AsyncTask<Error2T, Output2T>): AsyncTask<Error2T, Output2T> {
		const evaluate = async (input: any): Promise<Either<Error2T, Output2T>> => {
			const output = await this.evaluate(input);
			if (output.isLeft()) {
				return task.evaluate(input);
			}

			return new Right(output.get() as Output2T) as Either<Error2T, Output2T>;
		};

		return new AsyncTask(evaluate);
	}

	orElseDoWithInputAndNewError<InputT, Error2T, Output2T>(
		f: (input: InputT) => Promise<Either<Error2T, Output2T>>,
	): AsyncComputation<InputT, Error2T, Output2T> {
		const evaluate = async (input: InputT): Promise<Either<Error2T, Output2T>> => {
			const output = await this.evaluate(input);
			if (output.isLeft()) {
				return f(input);
			}

			return new Right(output.get() as Output2T) as Either<Error2T, Output2T>;
		};

		return new AsyncComputation(evaluate);
	}

	orElseDoComputation<InputT, Error2T, Output2T>(
		computation: AsyncComputation<InputT, Error2T, Output2T>,
	): AsyncComputation<InputT, Error2T, Output2T> {
		const evaluate = async (input: InputT): Promise<Either<Error2T, Output2T>> => {
			const output = await this.evaluate(input);
			if (output.isLeft()) {
				return computation.evaluate(input);
			}

			return new Right(output.get() as Output2T) as Either<Error2T, Output2T>;
		};

		return new AsyncComputation(evaluate);
	}

	map<Output2T>(f: (x: OutputT) => Promise<Output2T>): AsyncTask<ErrorT, Output2T> {
		const evaluate = async (input: any): Promise<Either<ErrorT, Output2T>> => {
			const output = await this.evaluate(input);
			if (output.isLeft()) {
				// eslint-disable-next-line unicorn/no-useless-promise-resolve-reject
				return Promise.resolve(new Left(output.get()) as Either<ErrorT, Output2T>);
			}

			return f(output.get() as OutputT).then(x => new Right(x) as Either<ErrorT, Output2T>);
		};

		return new AsyncTask(evaluate);
	}

	apply<Output2T>(f: AsyncTask<ErrorT, (x: OutputT) => Promise<Output2T>>): AsyncTask<ErrorT, Output2T> {
		const evaluate = async (input: any): Promise<Either<ErrorT, Output2T>> => {
			const output = await this.evaluate(input);
			if (output.isLeft()) {
				return new Left(output.get()) as Either<ErrorT, Output2T>;
			}

			const fOutput = await f.evaluate(input);
			if (fOutput.isLeft()) {
				return new Left(fOutput.get()) as Either<ErrorT, Output2T>;
			}

			return new Right<ErrorT, Output2T>(await (fOutput.get() as (x: OutputT) => Promise<Output2T>)(output.get() as OutputT));
		};

		return new AsyncTask(evaluate);
	}

	pure<Output2T>(x: Promise<Output2T>): AsyncTask<any, Output2T> {
		return new AsyncTask<any, Output2T>(async () => {
			try {
				const result = await x;
				return new Right(result);
			} catch (error) {
				return new Left(error);
			}
		});
	}

	flatMap<Output2T>(f: (x: OutputT) => AsyncTask<ErrorT, Output2T>): AsyncTask<ErrorT, Output2T> {
		const evaluate = async (input: any): Promise<Either<ErrorT, Output2T>> => {
			const output = await this.evaluate(input);
			if (output.isLeft()) {
				return new Left(output.get()) as Either<ErrorT, Output2T>;
			}

			return f(output.get() as OutputT).evaluate(input);
		};

		return new AsyncTask(evaluate);
	}

	flatMapWithInput<InputT, Output2T>(f: (x: OutputT) => AsyncSafeComputation<InputT, Output2T>): AsyncComputation<InputT, ErrorT, Output2T> {
		const evaluate = async (input: InputT): Promise<Either<ErrorT, Output2T>> => {
			const output = await this.evaluate(input);
			if (output.isLeft()) {
				return new Left(output.get()) as Either<ErrorT, Output2T>;
			}

			return new Right<ErrorT, Output2T>(await f(output.get() as OutputT).evaluate(input));
		};

		return new AsyncComputation(evaluate);
	}

	flatMapWithNewError<Error2T, Output2T>(f: (x: OutputT) => AsyncTask<Error2T, Output2T>): AsyncTask<ErrorT | Error2T, Output2T> {
		const evaluate = async (input: any): Promise<Either<ErrorT | Error2T, Output2T>> => {
			const output = await this.evaluate(input);
			if (output.isLeft()) {
				return new Left(output.get()) as Either<ErrorT | Error2T, Output2T>;
			}

			return f(output.get() as OutputT).evaluate(input);
		};

		return new AsyncTask(evaluate);
	}

	flatMapWithInputAndNewError<InputT, Error2T, Output2T>(
		f: (x: OutputT) => AsyncComputation<InputT, Error2T, Output2T>,
	): AsyncComputation<InputT, ErrorT | Error2T, Output2T> {
		const evaluate = async (input: InputT): Promise<Either<ErrorT | Error2T, Output2T>> => {
			const output = await this.evaluate(input);
			if (output.isLeft()) {
				return new Left(output.get()) as Either<ErrorT | Error2T, Output2T>;
			}

			return f(output.get() as OutputT).evaluate(input);
		};

		return new AsyncComputation(evaluate);
	}

	zip<Output2T>(other: AsyncTask<ErrorT, Output2T>): AsyncTask<ErrorT, [OutputT, Output2T]> {
		const evaluate = async (input: any): Promise<Either<ErrorT, [OutputT, Output2T]>> => {
			const output = await this.evaluate(input);
			const otherOutput = await other.evaluate(input);

			return output.zip(otherOutput);
		};

		return new AsyncTask(evaluate);
	}

	zipWithNewError<Error2T, Output2T>(other: AsyncTask<Error2T, Output2T>): AsyncTask<ErrorT | Error2T, [OutputT, Output2T]> {
		const evaluate = async (input: any): Promise<Either<ErrorT | Error2T, [OutputT, Output2T]>> => {
			const output = await this.evaluate(input);
			const otherOutput = await other.evaluate(input);

			if (output.isLeft()) {
				return new Left(output.get()) as Either<ErrorT | Error2T, [OutputT, Output2T]>;
			}

			if (otherOutput.isLeft()) {
				return new Left(otherOutput.get()) as Either<ErrorT | Error2T, [OutputT, Output2T]>;
			}

			return new Right([output.get() as OutputT, otherOutput.get() as Output2T]) as Either<ErrorT | Error2T, [OutputT, Output2T]>;
		};

		return new AsyncTask(evaluate);
	}

	zip2<O2T, O3T>(
		c2: AsyncTask<ErrorT, O2T>,
		c3: AsyncTask<ErrorT, O3T>,
	): AsyncTask<ErrorT, [OutputT, O2T, O3T]> {
		const evaluate = async (input: any): Promise<Either<ErrorT, [OutputT, O2T, O3T]>> => {
			const output = await this.evaluate(input);
			const output2 = await c2.evaluate(input);
			const output3 = await c3.evaluate(input);

			return output.zip2(output2, output3);
		};

		return new AsyncTask(evaluate);
	}

	zip2WithNewErrors<E2T, E3T, O2T, O3T>(
		c2: AsyncTask<E2T, O2T>,
		c3: AsyncTask<E3T, O3T>,
	): AsyncTask<ErrorT | E2T | E3T, [OutputT, O2T, O3T]> {
		const evaluate = async (input: any): Promise<Either<ErrorT | E2T | E3T, [OutputT, O2T, O3T]>> => {
			const output = await this.evaluate(input);
			const output2 = await c2.evaluate(input);
			const output3 = await c3.evaluate(input);

			if (output.isLeft()) {
				return new Left(output.get()) as Either<ErrorT | E2T | E3T, [OutputT, O2T, O3T]>;
			}

			if (output2.isLeft()) {
				return new Left(output2.get()) as Either<ErrorT | E2T | E3T, [OutputT, O2T, O3T]>;
			}

			if (output3.isLeft()) {
				return new Left(output3.get()) as Either<ErrorT | E2T | E3T, [OutputT, O2T, O3T]>;
			}

			return new Right([output.get() as OutputT, output2.get() as O2T, output3.get() as O3T]) as Either<ErrorT | E2T | E3T, [OutputT, O2T, O3T]>;
		};

		return new AsyncTask(evaluate);
	}

	zip3<O2T, O3T, O4T>(
		c2: AsyncTask<ErrorT, O2T>,
		c3: AsyncTask<ErrorT, O3T>,
		c4: AsyncTask<ErrorT, O4T>,
	): AsyncTask<ErrorT, [OutputT, O2T, O3T, O4T]> {
		const evaluate = async (input: any): Promise<Either<ErrorT, [OutputT, O2T, O3T, O4T]>> => {
			const output = await this.evaluate(input);
			const output2 = await c2.evaluate(input);
			const output3 = await c3.evaluate(input);
			const output4 = await c4.evaluate(input);

			return output.zip3(output2, output3, output4);
		};

		return new AsyncTask(evaluate);
	}

	zip3WithNewErrors<E2T, E3T, E4T, O2T, O3T, O4T>(
		c2: AsyncTask<E2T, O2T>,
		c3: AsyncTask<E3T, O3T>,
		c4: AsyncTask<E4T, O4T>,
	): AsyncTask<ErrorT | E2T | E3T | E4T, [OutputT, O2T, O3T, O4T]> {
		const evaluate = async (input: any): Promise<Either<ErrorT | E2T | E3T | E4T, [OutputT, O2T, O3T, O4T]>> => {
			const output = await this.evaluate(input);
			const output2 = await c2.evaluate(input);
			const output3 = await c3.evaluate(input);
			const output4 = await c4.evaluate(input);

			if (output.isLeft()) {
				return new Left(output.get()) as Either<ErrorT | E2T | E3T | E4T, [OutputT, O2T, O3T, O4T]>;
			}

			if (output2.isLeft()) {
				return new Left(output2.get()) as Either<ErrorT | E2T | E3T | E4T, [OutputT, O2T, O3T, O4T]>;
			}

			if (output3.isLeft()) {
				return new Left(output3.get()) as Either<ErrorT | E2T | E3T | E4T, [OutputT, O2T, O3T, O4T]>;
			}

			if (output4.isLeft()) {
				return new Left(output4.get()) as Either<ErrorT | E2T | E3T | E4T, [OutputT, O2T, O3T, O4T]>;
			}

			return new Right([output.get() as OutputT, output2.get() as O2T, output3.get() as O3T, output4.get() as O4T]) as Either<ErrorT | E2T | E3T | E4T, [OutputT, O2T, O3T, O4T]>;
		};

		return new AsyncTask(evaluate);
	}

	zip4<O2T, O3T, O4T, O5T>(
		c2: AsyncTask<ErrorT, O2T>,
		c3: AsyncTask<ErrorT, O3T>,
		c4: AsyncTask<ErrorT, O4T>,
		c5: AsyncTask<ErrorT, O5T>,
	): AsyncTask<ErrorT, [OutputT, O2T, O3T, O4T, O5T]> {
		const evaluate = async (input: any): Promise<Either<ErrorT, [OutputT, O2T, O3T, O4T, O5T]>> => {
			const output = await this.evaluate(input);
			const output2 = await c2.evaluate(input);
			const output3 = await c3.evaluate(input);
			const output4 = await c4.evaluate(input);
			const output5 = await c5.evaluate(input);

			return output.zip4(output2, output3, output4, output5);
		};

		return new AsyncTask(evaluate);
	}

	zip4WithNewErrors<E2T, E3T, E4T, E5T, O2T, O3T, O4T, O5T>(
		c2: AsyncTask<E2T, O2T>,
		c3: AsyncTask<E3T, O3T>,
		c4: AsyncTask<E4T, O4T>,
		c5: AsyncTask<E5T, O5T>,
	): AsyncTask<ErrorT | E2T | E3T | E4T | E5T, [OutputT, O2T, O3T, O4T, O5T]> {
		const evaluate = async (input: any): Promise<Either<ErrorT | E2T | E3T | E4T | E5T, [OutputT, O2T, O3T, O4T, O5T]>> => {
			const output = await this.evaluate(input);
			const output2 = await c2.evaluate(input);
			const output3 = await c3.evaluate(input);
			const output4 = await c4.evaluate(input);
			const output5 = await c5.evaluate(input);

			if (output.isLeft()) {
				return new Left(output.get()) as Either<ErrorT | E2T | E3T | E4T | E5T, [OutputT, O2T, O3T, O4T, O5T]>;
			}

			if (output2.isLeft()) {
				return new Left(output2.get()) as Either<ErrorT | E2T | E3T | E4T | E5T, [OutputT, O2T, O3T, O4T, O5T]>;
			}

			if (output3.isLeft()) {
				return new Left(output3.get()) as Either<ErrorT | E2T | E3T | E4T | E5T, [OutputT, O2T, O3T, O4T, O5T]>;
			}

			if (output4.isLeft()) {
				return new Left(output4.get()) as Either<ErrorT | E2T | E3T | E4T | E5T, [OutputT, O2T, O3T, O4T, O5T]>;
			}

			if (output5.isLeft()) {
				return new Left(output5.get()) as Either<ErrorT | E2T | E3T | E4T | E5T, [OutputT, O2T, O3T, O4T, O5T]>;
			}

			return new Right([output.get() as OutputT, output2.get() as O2T, output3.get() as O3T, output4.get() as O4T, output5.get() as O5T]) as Either<ErrorT | E2T | E3T | E4T | E5T, [OutputT, O2T, O3T, O4T, O5T]>;
		};

		return new AsyncTask(evaluate);
	}

	zip5<O2T, O3T, O4T, O5T, O6T>(
		c2: AsyncTask<ErrorT, O2T>,
		c3: AsyncTask<ErrorT, O3T>,
		c4: AsyncTask<ErrorT, O4T>,
		c5: AsyncTask<ErrorT, O5T>,
		c6: AsyncTask<ErrorT, O6T>,
	): AsyncTask<ErrorT, [OutputT, O2T, O3T, O4T, O5T, O6T]> {
		const evaluate = async (input: any): Promise<Either<ErrorT, [OutputT, O2T, O3T, O4T, O5T, O6T]>> => {
			const output = await this.evaluate(input);
			const output2 = await c2.evaluate(input);
			const output3 = await c3.evaluate(input);
			const output4 = await c4.evaluate(input);
			const output5 = await c5.evaluate(input);
			const output6 = await c6.evaluate(input);

			return output.zip5(output2, output3, output4, output5, output6);
		};

		return new AsyncTask(evaluate);
	}

	zip5WithNewErrors<E2T, E3T, E4T, E5T, E6T, O2T, O3T, O4T, O5T, O6T>(
		c2: AsyncTask<E2T, O2T>,
		c3: AsyncTask<E3T, O3T>,
		c4: AsyncTask<E4T, O4T>,
		c5: AsyncTask<E5T, O5T>,
		c6: AsyncTask<E6T, O6T>,
	): AsyncTask<ErrorT | E2T | E3T | E4T | E5T | E6T, [OutputT, O2T, O3T, O4T, O5T, O6T]> {
		const evaluate = async (input: any): Promise<Either<ErrorT | E2T | E3T | E4T | E5T | E6T, [OutputT, O2T, O3T, O4T, O5T, O6T]>> => {
			const output = await this.evaluate(input);
			const output2 = await c2.evaluate(input);
			const output3 = await c3.evaluate(input);
			const output4 = await c4.evaluate(input);
			const output5 = await c5.evaluate(input);
			const output6 = await c6.evaluate(input);

			if (output.isLeft()) {
				return new Left(output.get()) as Either<ErrorT | E2T | E3T | E4T | E5T | E6T, [OutputT, O2T, O3T, O4T, O5T, O6T]>;
			}

			if (output2.isLeft()) {
				return new Left(output2.get()) as Either<ErrorT | E2T | E3T | E4T | E5T | E6T, [OutputT, O2T, O3T, O4T, O5T, O6T]>;
			}

			if (output3.isLeft()) {
				return new Left(output3.get()) as Either<ErrorT | E2T | E3T | E4T | E5T | E6T, [OutputT, O2T, O3T, O4T, O5T, O6T]>;
			}

			if (output4.isLeft()) {
				return new Left(output4.get()) as Either<ErrorT | E2T | E3T | E4T | E5T | E6T, [OutputT, O2T, O3T, O4T, O5T, O6T]>;
			}

			if (output5.isLeft()) {
				return new Left(output5.get()) as Either<ErrorT | E2T | E3T | E4T | E5T | E6T, [OutputT, O2T, O3T, O4T, O5T, O6T]>;
			}

			if (output6.isLeft()) {
				return new Left(output6.get()) as Either<ErrorT | E2T | E3T | E4T | E5T | E6T, [OutputT, O2T, O3T, O4T, O5T, O6T]>;
			}

			return new Right([output.get() as OutputT, output2.get() as O2T, output3.get() as O3T, output4.get() as O4T, output5.get() as O5T, output.get() as O6T]) as Either<ErrorT | E2T | E3T | E4T | E5T | E6T, [OutputT, O2T, O3T, O4T, O5T, O6T]>;
		};

		return new AsyncTask(evaluate);
	}

	zip6<O2T, O3T, O4T, O5T, O6T, O7T>(
		c2: AsyncTask<ErrorT, O2T>,
		c3: AsyncTask<ErrorT, O3T>,
		c4: AsyncTask<ErrorT, O4T>,
		c5: AsyncTask<ErrorT, O5T>,
		c6: AsyncTask<ErrorT, O6T>,
		c7: AsyncTask<ErrorT, O7T>,
	): AsyncTask<ErrorT, [OutputT, O2T, O3T, O4T, O5T, O6T, O7T]> {
		const evaluate = async (input: any): Promise<Either<ErrorT, [OutputT, O2T, O3T, O4T, O5T, O6T, O7T]>> => {
			const output = await this.evaluate(input);
			const output2 = await c2.evaluate(input);
			const output3 = await c3.evaluate(input);
			const output4 = await c4.evaluate(input);
			const output5 = await c5.evaluate(input);
			const output6 = await c6.evaluate(input);
			const output7 = await c7.evaluate(input);

			return output.zip6(output2, output3, output4, output5, output6, output7);
		};

		return new AsyncTask(evaluate);
	}

	zip6WithNewErrors<E2T, E3T, E4T, E5T, E6T, E7T, O2T, O3T, O4T, O5T, O6T, O7T>(
		c2: AsyncTask<E2T, O2T>,
		c3: AsyncTask<E3T, O3T>,
		c4: AsyncTask<E4T, O4T>,
		c5: AsyncTask<E5T, O5T>,
		c6: AsyncTask<E6T, O6T>,
		c7: AsyncTask<E7T, O7T>,
	): AsyncTask<ErrorT | E2T | E3T | E4T | E5T | E6T | E7T, [OutputT, O2T, O3T, O4T, O5T, O6T, O7T]> {
		const evaluate = async (input: any): Promise<Either<ErrorT | E2T | E3T | E4T | E5T | E6T | E7T, [OutputT, O2T, O3T, O4T, O5T, O6T, O7T]>> => {
			const output = await this.evaluate(input);
			const output2 = await c2.evaluate(input);
			const output3 = await c3.evaluate(input);
			const output4 = await c4.evaluate(input);
			const output5 = await c5.evaluate(input);
			const output6 = await c6.evaluate(input);
			const output7 = await c7.evaluate(input);

			if (output.isLeft()) {
				return new Left(output.get()) as Either<ErrorT | E2T | E3T | E4T | E5T | E6T | E7T, [OutputT, O2T, O3T, O4T, O5T, O6T, O7T]>;
			}

			if (output2.isLeft()) {
				return new Left(output2.get()) as Either<ErrorT | E2T | E3T | E4T | E5T | E6T | E7T, [OutputT, O2T, O3T, O4T, O5T, O6T, O7T]>;
			}

			if (output3.isLeft()) {
				return new Left(output3.get()) as Either<ErrorT | E2T | E3T | E4T | E5T | E6T | E7T, [OutputT, O2T, O3T, O4T, O5T, O6T, O7T]>;
			}

			if (output4.isLeft()) {
				return new Left(output4.get()) as Either<ErrorT | E2T | E3T | E4T | E5T | E6T | E7T, [OutputT, O2T, O3T, O4T, O5T, O6T, O7T]>;
			}

			if (output5.isLeft()) {
				return new Left(output5.get()) as Either<ErrorT | E2T | E3T | E4T | E5T | E6T | E7T, [OutputT, O2T, O3T, O4T, O5T, O6T, O7T]>;
			}

			if (output6.isLeft()) {
				return new Left(output6.get()) as Either<ErrorT | E2T | E3T | E4T | E5T | E6T | E7T, [OutputT, O2T, O3T, O4T, O5T, O6T, O7T]>;
			}

			if (output7.isLeft()) {
				return new Left(output7.get()) as Either<ErrorT | E2T | E3T | E4T | E5T | E6T | E7T, [OutputT, O2T, O3T, O4T, O5T, O6T, O7T]>;
			}

			return new Right([output.get() as OutputT, output2.get() as O2T, output3.get() as O3T, output4.get() as O4T, output5.get() as O5T, output.get() as O6T, output.get() as O7T]) as Either<ErrorT | E2T | E3T | E4T | E5T | E6T | E7T, [OutputT, O2T, O3T, O4T, O5T, O6T, O7T]>;
		};

		return new AsyncTask(evaluate);
	}

	// eslint-disable-next-line @typescript-eslint/prefer-return-this-type
	bindInput<InputT>(input: InputT): AsyncTask<ErrorT, OutputT> {
		return this;
	}

	toAsync(): this {
		return this;
	}

	toTask(): this {
		return this;
	}

	toComputation(): AsyncComputation<any, ErrorT, OutputT> {
		return new AsyncComputation(this.evaluate);
	}
}
