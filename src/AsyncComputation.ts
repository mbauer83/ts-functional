/* eslint-disable max-nested-callbacks */
import {type AsyncIO} from './AsyncIO.js';
import {AsyncSafeComputation} from './AsyncSafeComputation.js';
import {AsyncTask} from './AsyncTask.js';
import {type AsyncContravariantFunctor} from './Contravariant.js';
import {type Either, Left, Right} from './Either.js';
import {MonadicPromise} from './MonadicPromise.js';
import {type AsyncBindEffectType, type BindEffectType, type AsyncEffect} from './definitions.js';

export class AsyncComputation<in InputT, out ErrorT, out OutputT> implements AsyncEffect<InputT, ErrorT, OutputT>, AsyncContravariantFunctor<InputT> {
	/**
	 * Creates an AsyncComputation from a pure value.
	 */
	static of<Output2T>(value: Output2T): AsyncComputation<any, never, Output2T> {
		return new AsyncComputation(async () => new Right<never, Output2T>(value));
	}

	/**
	 * Returns an AsyncComputation that always resolves to an empty record - for use with {@link AsyncComputation.bindKey} and {@link AsyncComputation.tap}.
	 */
	static do(): AsyncComputation<any, never, Record<any, any>> {
		return AsyncComputation.of({});
	}

	constructor(public readonly evaluate: (input: InputT) => Promise<Either<ErrorT, OutputT>>) {}

	/**
	 * Returns an `AsyncComputation` which resolves to the output of this `AsyncComputation`
	 * in intersection with a record containing the value of the effect resulting from
	 * applying `f` to the output of this `AsyncComputation` under the key `key`.
	 */
	bindKey<KeyT extends string | number | symbol, Output2T>(key: KeyT, f: (input: OutputT) => BindEffectType<Output2T> | AsyncBindEffectType<Output2T>): AsyncComputation<InputT, ErrorT, OutputT & Record<KeyT, Output2T>> {
		const resolver = async (input: InputT) => {
			const thisResolved = await this.evaluate(input);
			if (thisResolved.isLeft()) {
				return new Left<ErrorT, OutputT & Record<KeyT, Output2T>>(thisResolved.get());
			}

			const output2 = await (f(thisResolved.get() as OutputT).toAsync().evaluate(input) as Promise<Right<never, Output2T>>);
			return new Right<ErrorT, OutputT & Record<KeyT, Output2T>>(Object.assign({}, thisResolved.get(), {[key]: output2.get()} as (OutputT & Record<KeyT, Output2T>)));
		};

		return new AsyncComputation<InputT, ErrorT, OutputT & Record<KeyT, Output2T>>(resolver);
	}

	/**
	 * Returns an `AsyncComputation` which when successfully resolved will run the effect resulting from applying `f` to the output of this `AsyncComputation` and return the output of this `AsyncComputation`.
	 */
	tap<EffectT extends BindEffectType<any> | AsyncBindEffectType<any>>(f: (input: OutputT) => EffectT): this {
		const resolver = async (input: InputT) => {
			const output = await this.evaluate(input);
			if (output.isLeft()) {
				return output;
			}

			const effect = f(output.get() as OutputT);
			await effect.evaluate(input);
			return output;
		};

		return new AsyncComputation<InputT, ErrorT, OutputT>(resolver) as this;
	}

	/**
	 * Returns an `AsyncComputation` which will first run this `AsyncComputation` and then run `f`.
	 */
	thenDo<Output2T>(f: (..._: any[]) => Promise<Output2T>): AsyncComputation<InputT, ErrorT, Output2T> {
		const evaluate = async (input: InputT): Promise<Either<ErrorT, Output2T>> => {
			const thisOutput = await this.evaluate(input);
			if (thisOutput.isLeft()) {
				return new Left<ErrorT, Output2T>(thisOutput.get());
			}

			const ioOutput = await f();
			return new Right<ErrorT, Output2T>(ioOutput);
		};

		return new AsyncComputation<InputT, ErrorT, Output2T>(evaluate);
	}

	/**
	 * Returns an `AsyncComputation` which will first run this `AsyncComputation` and then run the given {@link AsyncIO}.
	 */
	// eslint-disable-next-line @typescript-eslint/naming-convention
	thenDoIO<Output2T>(io: AsyncIO<Output2T>): AsyncComputation<InputT, ErrorT, Output2T> {
		const evaluate = async (input: InputT): Promise<Either<ErrorT, Output2T>> => {
			const thisOutput = await this.evaluate(input);
			if (thisOutput.isLeft()) {
				return new Left<ErrorT, Output2T>(thisOutput.get());
			}

			const ioOutput = await io.evaluate();
			return new Right<ErrorT, Output2T>(ioOutput);
		};

		return new AsyncComputation<InputT, ErrorT, Output2T>(evaluate);
	}

	/**
	 * Returns an `AsyncComputation` which will first run this `AsyncComputation` and then run `f` on the same input.
	 */
	thenDoWithSameInput<Input2T extends InputT, Output2T>(f: (input: Input2T) => Promise<Output2T>): AsyncComputation<Input2T, ErrorT, Output2T> {
		const evaluate = async (input: Input2T): Promise<Either<ErrorT, Output2T>> => {
			const thisOutput = await this.evaluate(input);
			if (thisOutput.isLeft()) {
				return new Left<ErrorT, Output2T>(thisOutput.get());
			}

			const ioOutput = await f(input);
			return new Right<ErrorT, Output2T>(ioOutput);
		};

		return new AsyncComputation<Input2T, ErrorT, Output2T>(evaluate);
	}

	/**
	 * Returns an `AsyncComputation` which will first run this `AsyncComputation` and then run the given {@link AsyncSafeComputation}.
	 */
	thenDoSafeComputationWithSameInput<Input2T extends InputT, Output2T>(
		computation: AsyncSafeComputation<Input2T, Output2T>,
	): AsyncComputation<Input2T, ErrorT, Output2T> {
		return this.thenDoWithSameInput(async (input: Input2T) => computation.evaluate(input));
	}

	/**
	 * Returns an `AsyncComputation` which will take a tuple containing the input of this `AsyncComputation` and the input of `f` and return the result of running both this `AsyncComputation` and `f` on their respective inputs.
	 */
	thenDoWithNewInput<Input2T, Output2T>(f: (input: Input2T) => Promise<Output2T>): AsyncComputation<[InputT, Input2T], ErrorT, Output2T> {
		const evaluate = async ([input1, input2]: [InputT, Input2T]): Promise<Either<ErrorT, Output2T>> => {
			const thisOutput = await this.evaluate(input1);
			if (thisOutput.isLeft()) {
				return new Left<ErrorT, Output2T>(thisOutput.get());
			}

			const ioOutput = await f(input2);
			return new Right<ErrorT, Output2T>(ioOutput);
		};

		return new AsyncComputation<[InputT, Input2T], ErrorT, Output2T>(evaluate);
	}

	/**
	 * Returns an `AsyncComputation` which will take a tuple containing the input of this `AsyncComputation` and the input of the given {@link AsyncSafeComputation} and return the result of running both on their respective inputs.
	 */
	thenDoSafeComputation<Input2T, Output2T>(
		computation: AsyncSafeComputation<Input2T, Output2T>,
	): AsyncComputation<[InputT, Input2T], ErrorT, Output2T> {
		return this.thenDoWithNewInput(async (input: Input2T) => computation.evaluate(input));
	}

	/**
	 * Returns an `AsyncComputation` which will first run this `AsyncComputation` and then run `f` on the same input, unifying the error-type of both effects.
	 */
	thenDoWithNewError<Error2T, Output2T>(f: (..._: any[]) => Promise<Either<Error2T, Output2T>>): AsyncComputation<InputT, ErrorT | Error2T, Output2T> {
		const evaluate = async (input: InputT): Promise<Either<ErrorT | Error2T, Output2T>> => {
			const thisOutput = await this.evaluate(input);
			if (thisOutput.isLeft()) {
				return new Left<ErrorT | Error2T, Output2T>(thisOutput.get());
			}

			const ioOutput = await f();
			return ioOutput;
		};

		return new AsyncComputation<InputT, ErrorT | Error2T, Output2T>(evaluate);
	}

	thenDoTask<Error2T, Output2T>(task: AsyncTask<Error2T, Output2T>): AsyncComputation<InputT, ErrorT | Error2T, Output2T> {
		const evaluate = async (input: InputT): Promise<Either<ErrorT | Error2T, Output2T>> => {
			const thisOutput = await this.evaluate(input);
			if (thisOutput.isLeft()) {
				return new Left<ErrorT | Error2T, Output2T>(thisOutput.get());
			}

			const ioOutput = await task.evaluate();
			return ioOutput;
		};

		return new AsyncComputation<InputT, ErrorT | Error2T, Output2T>(evaluate);
	}

	thenDoWithNewInputAndError<Input2T, Error2T, Output2T>(f: (input: Input2T) => Promise<Either<Error2T, Output2T>>): AsyncComputation<{i1: InputT; i2: Input2T}, ErrorT | Error2T, Output2T> {
		const evaluate = async ({i1, i2}: {i1: InputT; i2: Input2T}): Promise<Either<ErrorT | Error2T, Output2T>> => {
			const thisOutput = await this.evaluate(i1);
			if (thisOutput.isLeft()) {
				return new Left<ErrorT | Error2T, Output2T>(thisOutput.get());
			}

			const ioOutput = await f(i2);
			return ioOutput;
		};

		return new AsyncComputation<{i1: InputT; i2: Input2T}, ErrorT | Error2T, Output2T>(evaluate);
	}

	thenDoComputation<Input2T, Error2T, Output2T>(computation: AsyncComputation<Input2T, Error2T, Output2T>): AsyncComputation<{i1: InputT; i2: Input2T}, ErrorT | Error2T, Output2T> {
		const evaluate = async ({i1, i2}: {i1: InputT; i2: Input2T}): Promise<Either<ErrorT | Error2T, Output2T>> => {
			const thisOutput = await this.evaluate(i1);
			if (thisOutput.isLeft()) {
				return new Left<ErrorT | Error2T, Output2T>(thisOutput.get());
			}

			const ioOutput = await computation.evaluate(i2);
			return ioOutput;
		};

		return new AsyncComputation<{i1: InputT; i2: Input2T}, ErrorT | Error2T, Output2T>(evaluate);
	}

	orElseDo<Output2T>(f: (..._: any[]) => Promise<Output2T>): AsyncSafeComputation<InputT, Either<OutputT, Output2T>> {
		const evaluate = async (input: InputT): Promise<Either<OutputT, Output2T>> => {
			const thisOutput = await this.evaluate(input);
			if (thisOutput.isLeft()) {
				return new Right<OutputT, Output2T>(await f());
			}

			return new Left<OutputT, Output2T>(thisOutput.get() as OutputT);
		};

		return new AsyncSafeComputation<InputT, Either<OutputT, Output2T>>(evaluate);
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	orElseDoIO<Output2T>(io: AsyncIO<Output2T>): AsyncSafeComputation<InputT, Either<OutputT, Output2T>> {
		return this.orElseDo(async () => io.evaluate());
	}

	orElseDoWithSameInput<Input2T extends InputT, Output2T>(f: (i: Input2T) => Promise<Output2T>): AsyncSafeComputation<Input2T, Either<OutputT, Output2T>> {
		const evaluate = async (input: Input2T): Promise<Either<OutputT, Output2T>> => {
			const thisOutput = await this.evaluate(input);
			if (thisOutput.isLeft()) {
				return new Right<OutputT, Output2T>(await f(input));
			}

			return new Left<OutputT, Output2T>(thisOutput.get() as OutputT);
		};

		return new AsyncSafeComputation<Input2T, Either<OutputT, Output2T>>(evaluate);
	}

	orElseDoSafeComputationWithSameInput<Input2T extends InputT, Output2T>(
		computation: AsyncSafeComputation<Input2T, Output2T>,
	): AsyncSafeComputation<Input2T, Either<OutputT, Output2T>> {
		return this.orElseDoWithSameInput(async (input: Input2T) => computation.evaluate(input));
	}

	orElseDoWithNewInput<Input2T, Output2T>(f: (i: Input2T) => Promise<Output2T>): AsyncSafeComputation<[InputT, Input2T], Either<OutputT, Output2T>> {
		const evaluate = async ([input1, input2]: [InputT, Input2T]): Promise<Either<OutputT, Output2T>> => {
			const thisOutput = await this.evaluate(input1);
			if (thisOutput.isLeft()) {
				return new Right<OutputT, Output2T>(await f(input2));
			}

			return new Left<OutputT, Output2T>(thisOutput.get() as OutputT);
		};

		return new AsyncSafeComputation<[InputT, Input2T], Either<OutputT, Output2T>>(evaluate);
	}

	orElseDoSafeComputation<Input2, Output2T>(
		computation: AsyncSafeComputation<Input2, Output2T>,
	): AsyncSafeComputation<[InputT, Input2], Either<OutputT, Output2T>> {
		return this.orElseDoWithNewInput(async (input2: Input2) => computation.evaluate(input2));
	}

	orElseDoWithNewError<Error2T, Output2T>(f: (..._: any[]) => Promise<Either<Error2T, Output2T>>): AsyncComputation<InputT, ErrorT | Error2T, Either<OutputT, Output2T>> {
		const resolver = async (input: InputT): Promise<Either<ErrorT | Error2T, Either<OutputT, Output2T>>> => {
			const thisOutput = await this.evaluate(input);
			if (thisOutput.isLeft()) {
				const otherEvaluated = await f();
				if (otherEvaluated.isLeft()) {
					return otherEvaluated as Left<ErrorT | Error2T, Either<OutputT, Output2T>>;
				}

				return new Right<ErrorT | Error2T, Either<OutputT, Output2T>>(new Right<OutputT, Output2T>(otherEvaluated.get() as Output2T));
			}

			return new Right<ErrorT | Error2T, Either<OutputT, Output2T>>(new Left<OutputT, Output2T>(thisOutput.get() as OutputT));
		};

		return new AsyncComputation<InputT, ErrorT | Error2T, Either<OutputT, Output2T>>(resolver);
	}

	orElseDoTask<Error2T, Output2T>(task: AsyncTask<Error2T, Output2T>): AsyncComputation<InputT, ErrorT | Error2T, Either<OutputT, Output2T>> {
		return this.orElseDoWithNewError(async () => task.evaluate());
	}

	orElseDoWithSameInputAndNewError<Input2T extends InputT, Error2T, Output2T>(
		f: (i: Input2T) => Promise<Either<Error2T, Output2T>>,
	): AsyncComputation<Input2T, ErrorT | Error2T, Either<OutputT, Output2T>> {
		const resolver = async (input: Input2T): Promise<Either<ErrorT | Error2T, Either<OutputT, Output2T>>> => {
			const thisOutput = await this.evaluate(input);
			if (thisOutput.isLeft()) {
				const otherEvaluated = await f(input);
				if (otherEvaluated.isLeft()) {
					return otherEvaluated as Left<ErrorT | Error2T, Either<OutputT, Output2T>>;
				}

				return new Right<ErrorT | Error2T, Either<OutputT, Output2T>>(new Right<OutputT, Output2T>(otherEvaluated.get() as Output2T));
			}

			return new Right<ErrorT | Error2T, Either<OutputT, Output2T>>(new Left<OutputT, Output2T>(thisOutput.get() as OutputT));
		};

		return new AsyncComputation<Input2T, ErrorT | Error2T, Either<OutputT, Output2T>>(resolver);
	}

	orElseDoComputationWithSameInput<Input2T extends InputT, Error2T, Output2T>(
		computation: AsyncComputation<Input2T, Error2T, Output2T>,
	): AsyncComputation<Input2T, ErrorT | Error2T, Either<OutputT, Output2T>> {
		return this.orElseDoWithSameInputAndNewError(async (input: Input2T) => computation.evaluate(input));
	}

	orElseDoWithNewInputAndNewError<Input2T, Error2T, Output2T>(
		f: (i: Input2T) => Promise<Either<Error2T, Output2T>>,
	): AsyncComputation<[InputT, Input2T], ErrorT | Error2T, Either<OutputT, Output2T>> {
		const resolver = async ([input1, input2]: [InputT, Input2T]): Promise<Either<ErrorT | Error2T, Either<OutputT, Output2T>>> => {
			const thisOutput = await this.evaluate(input1);
			if (thisOutput.isLeft()) {
				const otherEvaluated = await f(input2);
				if (otherEvaluated.isLeft()) {
					return otherEvaluated as Left<ErrorT | Error2T, Either<OutputT, Output2T>>;
				}

				return new Right<ErrorT | Error2T, Either<OutputT, Output2T>>(new Right<OutputT, Output2T>(otherEvaluated.get() as Output2T));
			}

			return new Right<ErrorT | Error2T, Either<OutputT, Output2T>>(new Left<OutputT, Output2T>(thisOutput.get() as OutputT));
		};

		return new AsyncComputation<[InputT, Input2T], ErrorT | Error2T, Either<OutputT, Output2T>>(resolver);
	}

	orElseDoComputation<Input2T, Error2, Output2T>(
		computation: AsyncComputation<Input2T, Error2, Output2T>,
	): AsyncComputation<[InputT, Input2T], ErrorT | Error2, Either<OutputT, Output2T>> {
		return this.orElseDoWithNewInputAndNewError(async (input2: Input2T) => computation.evaluate(input2));
	}

	contramap<Input2T>(f: (input: Input2T) => Promise<InputT>): AsyncComputation<Input2T, ErrorT, OutputT> {
		const evaluate = async (input: Input2T): Promise<Either<ErrorT, OutputT>> => {
			const i = await f(input);
			return this.evaluate(i);
		};

		return new AsyncComputation<Input2T, ErrorT, OutputT>(evaluate);
	}

	map<Output2T>(f: (output: OutputT) => Promise<Output2T>): AsyncComputation<InputT, ErrorT, Output2T> {
		const evaluate = async (input: InputT): Promise<Either<ErrorT, Output2T>> => {
			const monadicOutputPromise = new MonadicPromise<Either<ErrorT, OutputT>>(this.evaluate(input));
			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<ErrorT, OutputT>): MonadicPromise<Either<ErrorT, Output2T>> => x.match(
					(error: ErrorT) => new MonadicPromise(Promise.resolve(new Left<ErrorT, Output2T>(error) as Either<ErrorT, Output2T>)),
					(output: OutputT) => {
						const mappedOutput = new MonadicPromise<Output2T>(f(output));
						return mappedOutput.map((o: Output2T): Either<ErrorT, Output2T> => new Right<ErrorT, Output2T>(o));
					},
				),
			);
			return mappedPromise.promise;
		};

		return new AsyncComputation<InputT, ErrorT, Output2T>(evaluate);
	}

	apply<Output2T>(f: AsyncComputation<InputT, ErrorT, (output: OutputT) => Promise<Output2T>>): AsyncComputation<InputT, ErrorT, Output2T> {
		const evaluate = async (input: InputT): Promise<Either<ErrorT, Output2T>> => {
			const monadicOutputPromise = new MonadicPromise<Either<ErrorT, OutputT>>(this.evaluate(input));
			const monadicF = new MonadicPromise<Either<ErrorT, (output: OutputT) => Promise<Output2T>>>(f.evaluate(input));
			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<ErrorT, OutputT>): MonadicPromise<Either<ErrorT, Output2T>> => x.match(
					(error: ErrorT) => new MonadicPromise(Promise.resolve(new Left<ErrorT, Output2T>(error) as Either<ErrorT, Output2T>)),
					(output: OutputT) => {
						const mappedF = monadicF.flatMap(
							either => either.match(
								(error: ErrorT) => new MonadicPromise(Promise.resolve(new Left<ErrorT, Output2T>(error) as Either<ErrorT, Output2T>)),
								(f: (output: OutputT) => Promise<Output2T>) => {
									const fMappedOutput = new MonadicPromise<Output2T>(f(output));
									const mappedOutput = fMappedOutput.map((o: Output2T): Either<ErrorT, Output2T> => new Right<ErrorT, Output2T>(o));
									return mappedOutput;
								},
							),
						);
						return mappedF;
					},
				),
			);
			return mappedPromise.promise;
		};

		return new AsyncComputation<InputT, ErrorT, Output2T>(evaluate);
	}

	pure<Output2T>(x: Promise<Output2T>): AsyncComputation<any, undefined, Output2T> {
		const evaluate = async (_: any): Promise<Either<undefined, Output2T>> => {
			const mappedOutput = new MonadicPromise<Output2T>(x);
			return mappedOutput.map((o: Output2T): Either<undefined, Output2T> => new Right<undefined, Output2T>(o)).promise;
		};

		return new AsyncComputation<any, undefined, Output2T>(evaluate);
	}

	flatMap<Output2T>(f: (output: OutputT) => AsyncComputation<InputT, ErrorT, Output2T>): AsyncComputation<InputT, ErrorT, Output2T> {
		const evaluate = async (input: InputT): Promise<Either<ErrorT, Output2T>> => {
			const monadicOutputPromise = new MonadicPromise<Either<ErrorT, OutputT>>(this.evaluate(input));
			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<ErrorT, OutputT>): MonadicPromise<Either<ErrorT, Output2T>> => x.match(
					(error: ErrorT) => new MonadicPromise(Promise.resolve(new Left<ErrorT, Output2T>(error) as Either<ErrorT, Output2T>)),
					(output: OutputT) => new MonadicPromise(f(output).evaluate(input)),
				),
			);
			return mappedPromise.promise;
		};

		return new AsyncComputation<InputT, ErrorT, Output2T>(evaluate);
	}

	flatMapWithNewInput<Input2T, Output2T>(f: (output: OutputT) => AsyncComputation<Input2T, ErrorT, Output2T>): AsyncComputation<[InputT, Input2T], ErrorT, Output2T> {
		const evaluate = async (input: [InputT, Input2T]): Promise<Either<ErrorT, Output2T>> => {
			const monadicOutputPromise = new MonadicPromise<Either<ErrorT, OutputT>>(this.evaluate(input[0]));
			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<ErrorT, OutputT>): MonadicPromise<Either<ErrorT, Output2T>> => x.match(
					(error: ErrorT) => new MonadicPromise(Promise.resolve(new Left<ErrorT, Output2T>(error) as Either<ErrorT, Output2T>)),
					(output: OutputT) => new MonadicPromise(f(output).evaluate(input[1])),
				),
			);

			return mappedPromise.promise;
		};

		return new AsyncComputation<[InputT, Input2T], ErrorT, Output2T>(evaluate);
	}

	flatMapWithNewError<Error2T, Output2T>(f: (output: OutputT) => AsyncComputation<InputT, Error2T, Output2T>): AsyncComputation<InputT, ErrorT | Error2T, Output2T> {
		const evaluate = async (input: InputT): Promise<Either<ErrorT | Error2T, Output2T>> => {
			const monadicOutputPromise = new MonadicPromise<Either<ErrorT, OutputT>>(this.evaluate(input));
			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<ErrorT, OutputT>): MonadicPromise<Either<ErrorT | Error2T, Output2T>> => x.match(
					(error: ErrorT) => new MonadicPromise(Promise.resolve(new Left<ErrorT | Error2T, Output2T>(error) as Either<ErrorT | Error2T, Output2T>)),
					(output: OutputT) => new MonadicPromise(f(output).evaluate(input)),
				),
			);
			return mappedPromise.promise;
		};

		return new AsyncComputation<InputT, ErrorT | Error2T, Output2T>(evaluate);
	}

	flatMapWithNewInputAndNewError<Input2T, Error2T, Output2T>(f: (output: OutputT) => AsyncComputation<Input2T, Error2T, Output2T>): AsyncComputation<[InputT, Input2T], ErrorT | Error2T, Output2T> {
		const evaluate = async (input: [InputT, Input2T]): Promise<Either<ErrorT | Error2T, Output2T>> => {
			const monadicOutputPromise = new MonadicPromise<Either<ErrorT, OutputT>>(this.evaluate(input[0]));
			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<ErrorT, OutputT>): MonadicPromise<Either<ErrorT | Error2T, Output2T>> => x.match(
					(error: ErrorT) => new MonadicPromise(Promise.resolve(new Left<ErrorT | Error2T, Output2T>(error) as Either<ErrorT | Error2T, Output2T>)),
					(output: OutputT) => new MonadicPromise(f(output).evaluate(input[1])),
				),
			);

			return mappedPromise.promise;
		};

		return new AsyncComputation<[InputT, Input2T], ErrorT | Error2T, Output2T>(evaluate);
	}

	zip<Output2T>(c2: AsyncComputation<InputT, ErrorT, Output2T>): AsyncComputation<InputT, ErrorT, [OutputT, Output2T]> {
		const evaluate = async (input: InputT): Promise<Either<ErrorT, [OutputT, Output2T]>> => {
			const monadicOutputPromise = new MonadicPromise<Either<ErrorT, OutputT>>(this.evaluate(input));
			const monadicOutputPromise2 = new MonadicPromise<Either<ErrorT, Output2T>>(c2.evaluate(input));
			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<ErrorT, OutputT>): MonadicPromise<Either<ErrorT, [OutputT, Output2T]>> => x.match(
					(error: ErrorT) => new MonadicPromise(Promise.resolve(new Left<ErrorT, [OutputT, Output2T]>(error) as Either<ErrorT, [OutputT, Output2T]>)),
					(output: OutputT) => {
						const mappedOutput = monadicOutputPromise2.map(
							(either: Either<ErrorT, Output2T>): Either<ErrorT, [OutputT, Output2T]> => either.match<Either<ErrorT, [OutputT, Output2T]>>(
								(error: ErrorT) => new Left<ErrorT, [OutputT, Output2T]>(error),
								(output2: Output2T) => new Right<ErrorT, [OutputT, Output2T]>([output, output2]),
							),
						);
						return mappedOutput;
					},
				),
			);
			return mappedPromise.promise;
		};

		return new AsyncComputation<InputT, ErrorT, [OutputT, Output2T]>(evaluate);
	}

	zipWithNewError<Error2T, Output2T>(c2: AsyncComputation<InputT, Error2T, Output2T>): AsyncComputation<InputT, ErrorT | Error2T, [OutputT, Output2T]> {
		const evaluate = async (input: InputT): Promise<Either<ErrorT | Error2T, [OutputT, Output2T]>> => {
			const monadicOutputPromise = new MonadicPromise<Either<ErrorT, OutputT>>(this.evaluate(input));
			const monadicOutputPromise2 = new MonadicPromise<Either<Error2T, Output2T>>(c2.evaluate(input));
			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<ErrorT, OutputT>): MonadicPromise<Either<ErrorT | Error2T, [OutputT, Output2T]>> => x.match(
					(error: ErrorT) => new MonadicPromise(Promise.resolve(new Left<ErrorT | Error2T, [OutputT, Output2T]>(error) as Either<ErrorT | Error2T, [OutputT, Output2T]>)),
					(output: OutputT) => {
						const mappedOutput = monadicOutputPromise2.map(
							(either: Either<Error2T, Output2T>): Either<ErrorT | Error2T, [OutputT, Output2T]> => either.match<Either<ErrorT | Error2T, [OutputT, Output2T]>>(
								(error: Error2T) => new Left<ErrorT | Error2T, [OutputT, Output2T]>(error),
								(output2: Output2T) => new Right<ErrorT | Error2T, [OutputT, Output2T]>([output, output2]),
							),
						);
						return mappedOutput;
					},
				),
			);
			return mappedPromise.promise;
		};

		return new AsyncComputation<InputT, ErrorT | Error2T, [OutputT, Output2T]>(evaluate);
	}

	zip2<O2, O3>(
		c2: AsyncComputation<InputT, ErrorT, O2>,
		c3: AsyncComputation<InputT, ErrorT, O3>,
	): AsyncComputation<InputT, ErrorT, [OutputT, O2, O3]> {
		const evaluate = async (input: InputT): Promise<Either<ErrorT, [OutputT, O2, O3]>> => {
			const monadicOutputPromise = new MonadicPromise<Either<ErrorT, OutputT>>(this.evaluate(input));
			const monadicOutputPromise2 = new MonadicPromise<Either<ErrorT, O2>>(c2.evaluate(input));
			const monadicOutputPromise3 = new MonadicPromise<Either<ErrorT, O3>>(c3.evaluate(input));
			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<ErrorT, OutputT>): MonadicPromise<Either<ErrorT, [OutputT, O2, O3]>> => x.match(
					(error: ErrorT) => new MonadicPromise(Promise.resolve(new Left<ErrorT, [OutputT, O2, O3]>(error) as Either<ErrorT, [OutputT, O2, O3]>)),
					(output: OutputT) => {
						const mappedOutput = monadicOutputPromise2.flatMap(
							(x2: Either<ErrorT, O2>): MonadicPromise<Either<ErrorT, [OutputT, O2, O3]>> => x2.match(
								(error: ErrorT) => new MonadicPromise(Promise.resolve(new Left<ErrorT, [OutputT, O2, O3]>(error) as Either<ErrorT, [OutputT, O2, O3]>)),
								(output2: O2) => {
									const mappedOutput2 = monadicOutputPromise3.map(
										(x3: Either<ErrorT, O3>): Either<ErrorT, [OutputT, O2, O3]> => x3.match<Either<ErrorT, [OutputT, O2, O3]>>(
											(error: ErrorT) => new Left<ErrorT, [OutputT, O2, O3]>(error),
											(output3: O3) => new Right<ErrorT, [OutputT, O2, O3]>([output, output2, output3]),
										),
									);
									return mappedOutput2;
								},
							),
						);
						return mappedOutput;
					},
				),
			);

			return mappedPromise.promise;
		};

		return new AsyncComputation<InputT, ErrorT, [OutputT, O2, O3]>(evaluate);
	}

	zip2WithNewErrors<E2, E3, O2, O3>(
		c2: AsyncComputation<InputT, E2, O2>,
		c3: AsyncComputation<InputT, E3, O3>,
	): AsyncComputation<InputT, ErrorT | E2 | E3, [OutputT, O2, O3]> {
		const evaluate = async (input: InputT): Promise<Either<ErrorT | E2 | E3, [OutputT, O2, O3]>> => {
			const monadicOutputPromise = new MonadicPromise<Either<ErrorT, OutputT>>(this.evaluate(input));
			const monadicOutputPromise2 = new MonadicPromise<Either<E2, O2>>(c2.evaluate(input));
			const monadicOutputPromise3 = new MonadicPromise<Either<E3, O3>>(c3.evaluate(input));
			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<ErrorT, OutputT>): MonadicPromise<Either<ErrorT | E2 | E3, [OutputT, O2, O3]>> => x.match(
					(error: ErrorT) => new MonadicPromise(Promise.resolve(new Left<ErrorT | E2 | E3, [OutputT, O2, O3]>(error) as Either<ErrorT | E2 | E3, [OutputT, O2, O3]>)),
					(output: OutputT) => {
						const mappedOutput = monadicOutputPromise2.flatMap(
							(x2: Either<E2, O2>): MonadicPromise<Either<ErrorT | E2 | E3, [OutputT, O2, O3]>> => x2.match(
								(error: E2) => new MonadicPromise(Promise.resolve(new Left<ErrorT | E2 | E3, [OutputT, O2, O3]>(error) as Either<ErrorT | E2 | E3, [OutputT, O2, O3]>)),
								(output2: O2) => {
									const mappedOutput2 = monadicOutputPromise3.map(
										(x3: Either<E3, O3>): Either<ErrorT | E2 | E3, [OutputT, O2, O3]> => x3.match<Either<ErrorT | E2 | E3, [OutputT, O2, O3]>>(
											(error: E3) => new Left<ErrorT | E2 | E3, [OutputT, O2, O3]>(error),
											(output3: O3) => new Right<ErrorT | E2 | E3, [OutputT, O2, O3]>([output, output2, output3]),
										),
									);
									return mappedOutput2;
								},
							),
						);
						return mappedOutput;
					},
				),
			);

			return mappedPromise.promise;
		};

		return new AsyncComputation<InputT, ErrorT | E2 | E3, [OutputT, O2, O3]>(evaluate);
	}

	zip3<O2, O3, O4>(
		c2: AsyncComputation<InputT, ErrorT, O2>,
		c3: AsyncComputation<InputT, ErrorT, O3>,
		c4: AsyncComputation<InputT, ErrorT, O4>,
	): AsyncComputation<InputT, ErrorT, [OutputT, O2, O3, O4]> {
		const evaluate = async (input: InputT): Promise<Either<ErrorT, [OutputT, O2, O3, O4]>> => {
			const monadicOutputPromise = new MonadicPromise<Either<ErrorT, OutputT>>(this.evaluate(input));
			const monadicOutputPromise2 = new MonadicPromise<Either<ErrorT, O2>>(c2.evaluate(input));
			const monadicOutputPromise3 = new MonadicPromise<Either<ErrorT, O3>>(c3.evaluate(input));
			const monadicOutputPromise4 = new MonadicPromise<Either<ErrorT, O4>>(c4.evaluate(input));
			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<ErrorT, OutputT>): MonadicPromise<Either<ErrorT, [OutputT, O2, O3, O4]>> => x.match(
					(error: ErrorT) => new MonadicPromise(Promise.resolve(new Left<ErrorT, [OutputT, O2, O3, O4]>(error) as Either<ErrorT, [OutputT, O2, O3, O4]>)),
					(output: OutputT) => {
						const mappedOutput = monadicOutputPromise2.flatMap(
							(x2: Either<ErrorT, O2>): MonadicPromise<Either<ErrorT, [OutputT, O2, O3, O4]>> => x2.match(
								(error: ErrorT) => new MonadicPromise(Promise.resolve(new Left<ErrorT, [OutputT, O2, O3, O4]>(error) as Either<ErrorT, [OutputT, O2, O3, O4]>)),
								(output2: O2) => {
									const mappedOutput2 = monadicOutputPromise3.flatMap(
										(x3: Either<ErrorT, O3>): MonadicPromise<Either<ErrorT, [OutputT, O2, O3, O4]>> => x3.match(
											(error: ErrorT) => new MonadicPromise(Promise.resolve(new Left<ErrorT, [OutputT, O2, O3, O4]>(error) as Either<ErrorT, [OutputT, O2, O3, O4]>)),
											(output3: O3) => {
												const mappedOutput3 = monadicOutputPromise4.map(
													(x4: Either<ErrorT, O4>): Either<ErrorT, [OutputT, O2, O3, O4]> => x4.match<Either<ErrorT, [OutputT, O2, O3, O4]>>(
														(error: ErrorT) => new Left<ErrorT, [OutputT, O2, O3, O4]>(error),
														(output4: O4) => new Right<ErrorT, [OutputT, O2, O3, O4]>([output, output2, output3, output4]),
													),
												);

												return mappedOutput3;
											},
										),
									);

									return mappedOutput2;
								},
							),
						);

						return mappedOutput;
					},
				));

			return mappedPromise.promise;
		};

		return new AsyncComputation<InputT, ErrorT, [OutputT, O2, O3, O4]>(evaluate);
	}

	zip3WithNewErrors<E2, E3, E4, O2, O3, O4>(
		c2: AsyncComputation<InputT, E2, O2>,
		c3: AsyncComputation<InputT, E3, O3>,
		c4: AsyncComputation<InputT, E4, O4>,
	): AsyncComputation<InputT, ErrorT | E2 | E3 | E4, [OutputT, O2, O3, O4]> {
		const evaluate = async (input: InputT): Promise<Either<ErrorT | E2 | E3 | E4, [OutputT, O2, O3, O4]>> => {
			const monadicOutputPromise = new MonadicPromise<Either<ErrorT, OutputT>>(this.evaluate(input));
			const monadicOutputPromise2 = new MonadicPromise<Either<E2, O2>>(c2.evaluate(input));
			const monadicOutputPromise3 = new MonadicPromise<Either<E3, O3>>(c3.evaluate(input));
			const monadicOutputPromise4 = new MonadicPromise<Either<E4, O4>>(c4.evaluate(input));
			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<ErrorT, OutputT>): MonadicPromise<Either<ErrorT | E2 | E3 | E4, [OutputT, O2, O3, O4]>> => x.match(
					(error: ErrorT) => new MonadicPromise(Promise.resolve(new Left<ErrorT | E2 | E3 | E4, [OutputT, O2, O3, O4]>(error) as Either<ErrorT | E2 | E3 | E4, [OutputT, O2, O3, O4]>)),
					(output: OutputT) => {
						const mappedOutput = monadicOutputPromise2.flatMap(
							(x2: Either<E2, O2>): MonadicPromise<Either<ErrorT | E2 | E3 | E4, [OutputT, O2, O3, O4]>> => x2.match(
								(error: E2) => new MonadicPromise(Promise.resolve(new Left<ErrorT | E2 | E3 | E4, [OutputT, O2, O3, O4]>(error) as Either<ErrorT | E2 | E3 | E4, [OutputT, O2, O3, O4]>)),
								(output2: O2) => {
									const mappedOutput2 = monadicOutputPromise3.flatMap(
										(x3: Either<E3, O3>): MonadicPromise<Either<ErrorT | E2 | E3 | E4, [OutputT, O2, O3, O4]>> => x3.match(
											(error: E3) => new MonadicPromise(Promise.resolve(new Left<ErrorT | E2 | E3 | E4, [OutputT, O2, O3, O4]>(error) as Either<ErrorT | E2 | E3 | E4, [OutputT, O2, O3, O4]>)),
											(output3: O3) => {
												const mappedOutput3 = monadicOutputPromise4.map(
													(x4: Either<E4, O4>): Either<ErrorT | E2 | E3 | E4, [OutputT, O2, O3, O4]> => x4.match<Either<ErrorT | E2 | E3 | E4, [OutputT, O2, O3, O4]>>(
														(error: E4) => new Left<ErrorT | E2 | E3 | E4, [OutputT, O2, O3, O4]>(error),
														(output4: O4) => new Right<ErrorT | E2 | E3 | E4, [OutputT, O2, O3, O4]>([output, output2, output3, output4]),
													),
												);

												return mappedOutput3;
											},
										),
									);

									return mappedOutput2;
								},
							),
						);

						return mappedOutput;
					},
				));

			return mappedPromise.promise;
		};

		return new AsyncComputation<InputT, ErrorT | E2 | E3 | E4, [OutputT, O2, O3, O4]>(evaluate);
	}

	zip4<O2, O3, O4, O5>(
		c2: AsyncComputation<InputT, ErrorT, O2>,
		c3: AsyncComputation<InputT, ErrorT, O3>,
		c4: AsyncComputation<InputT, ErrorT, O4>,
		c5: AsyncComputation<InputT, ErrorT, O5>,
	): AsyncComputation<InputT, ErrorT, [OutputT, O2, O3, O4, O5]> {
		const evaluate = async (input: InputT): Promise<Either<ErrorT, [OutputT, O2, O3, O4, O5]>> => {
			const monadicOutputPromise = new MonadicPromise<Either<ErrorT, OutputT>>(this.evaluate(input));
			const monadicOutputPromise2 = new MonadicPromise<Either<ErrorT, O2>>(c2.evaluate(input));
			const monadicOutputPromise3 = new MonadicPromise<Either<ErrorT, O3>>(c3.evaluate(input));
			const monadicOutputPromise4 = new MonadicPromise<Either<ErrorT, O4>>(c4.evaluate(input));
			const monadicOutputPromise5 = new MonadicPromise<Either<ErrorT, O5>>(c5.evaluate(input));
			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<ErrorT, OutputT>): MonadicPromise<Either<ErrorT, [OutputT, O2, O3, O4, O5]>> => x.match(
					(error: ErrorT) => new MonadicPromise(Promise.resolve(new Left<ErrorT, [OutputT, O2, O3, O4, O5]>(error) as Either<ErrorT, [OutputT, O2, O3, O4, O5]>)),
					(output: OutputT) => {
						const mappedOutput = monadicOutputPromise2.flatMap(
							(x2: Either<ErrorT, O2>): MonadicPromise<Either<ErrorT, [OutputT, O2, O3, O4, O5]>> => x2.match(
								(error: ErrorT) => new MonadicPromise(Promise.resolve(new Left<ErrorT, [OutputT, O2, O3, O4, O5]>(error) as Either<ErrorT, [OutputT, O2, O3, O4, O5]>)),
								(output2: O2) => {
									const mappedOutput2 = monadicOutputPromise3.flatMap(
										(x3: Either<ErrorT, O3>): MonadicPromise<Either<ErrorT, [OutputT, O2, O3, O4, O5]>> => x3.match(
											(error: ErrorT) => new MonadicPromise(Promise.resolve(new Left<ErrorT, [OutputT, O2, O3, O4, O5]>(error) as Either<ErrorT, [OutputT, O2, O3, O4, O5]>)),
											(output3: O3) => {
												const mapped = monadicOutputPromise4.flatMap(
													(x4: Either<ErrorT, O4>): MonadicPromise<Either<ErrorT, [OutputT, O2, O3, O4, O5]>> => x4.match(
														(error: ErrorT) => new MonadicPromise(Promise.resolve(new Left<ErrorT, [OutputT, O2, O3, O4, O5]>(error) as Either<ErrorT, [OutputT, O2, O3, O4, O5]>)),
														(output4: O4) => {
															const mappedOutput4 = monadicOutputPromise5.map(
																(x5: Either<ErrorT, O5>): Either<ErrorT, [OutputT, O2, O3, O4, O5]> => x5.match<Either<ErrorT, [OutputT, O2, O3, O4, O5]>>(
																	(error: ErrorT) => new Left<ErrorT, [OutputT, O2, O3, O4, O5]>(error),
																	(output5: O5) => new Right<ErrorT, [OutputT, O2, O3, O4, O5]>([output, output2, output3, output4, output5]),
																),
															);

															return mappedOutput4;
														},
													),
												);

												return mapped;
											},
										),
									);

									return mappedOutput2;
								},
							),
						);

						return mappedOutput;
					},
				));

			return mappedPromise.promise;
		};

		return new AsyncComputation<InputT, ErrorT, [OutputT, O2, O3, O4, O5]>(evaluate);
	}

	zip4WithNewErrors<E2, E3, E4, E5, O2, O3, O4, O5>(
		c2: AsyncComputation<InputT, E2, O2>,
		c3: AsyncComputation<InputT, E3, O3>,
		c4: AsyncComputation<InputT, E4, O4>,
		c5: AsyncComputation<InputT, E5, O5>,
	): AsyncComputation<InputT, ErrorT | E2 | E3 | E4 | E5, [OutputT, O2, O3, O4, O5]> {
		const evaluate = async (input: InputT): Promise<Either<ErrorT | E2 | E3 | E4 | E5, [OutputT, O2, O3, O4, O5]>> => {
			const monadicOutputPromise = new MonadicPromise<Either<ErrorT, OutputT>>(this.evaluate(input));
			const monadicOutputPromise2 = new MonadicPromise<Either<E2, O2>>(c2.evaluate(input));
			const monadicOutputPromise3 = new MonadicPromise<Either<E3, O3>>(c3.evaluate(input));
			const monadicOutputPromise4 = new MonadicPromise<Either<E4, O4>>(c4.evaluate(input));
			const monadicOutputPromise5 = new MonadicPromise<Either<E5, O5>>(c5.evaluate(input));
			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<ErrorT, OutputT>): MonadicPromise<Either<ErrorT | E2 | E3 | E4 | E5, [OutputT, O2, O3, O4, O5]>> => x.match(
					(error: ErrorT) => new MonadicPromise(Promise.resolve(new Left<ErrorT | E2 | E3 | E4 | E5, [OutputT, O2, O3, O4, O5]>(error) as Either<ErrorT | E2 | E3 | E4 | E5, [OutputT, O2, O3, O4, O5]>)),
					(output: OutputT) => {
						const mappedOutput = monadicOutputPromise2.flatMap(
							(x2: Either<E2, O2>): MonadicPromise<Either<ErrorT | E2 | E3 | E4 | E5, [OutputT, O2, O3, O4, O5]>> => x2.match(
								(error: E2) => new MonadicPromise(Promise.resolve(new Left<ErrorT | E2 | E3 | E4 | E5, [OutputT, O2, O3, O4, O5]>(error) as Either<ErrorT | E2 | E3 | E4 | E5, [OutputT, O2, O3, O4, O5]>)),
								(output2: O2) => {
									const mappedOutput2 = monadicOutputPromise3.flatMap(
										(x3: Either<E3, O3>): MonadicPromise<Either<ErrorT | E2 | E3 | E4 | E5, [OutputT, O2, O3, O4, O5]>> => x3.match(
											(error: E3) => new MonadicPromise(Promise.resolve(new Left<ErrorT | E2 | E3 | E4 | E5, [OutputT, O2, O3, O4, O5]>(error) as Either<ErrorT | E2 | E3 | E4 | E5, [OutputT, O2, O3, O4, O5]>)),
											(output3: O3) => {
												const mapped = monadicOutputPromise4.flatMap(
													(x4: Either<E4, O4>): MonadicPromise<Either<ErrorT | E2 | E3 | E4 | E5, [OutputT, O2, O3, O4, O5]>> => x4.match(
														(error: E4) => new MonadicPromise(Promise.resolve(new Left<ErrorT | E2 | E3 | E4 | E5, [OutputT, O2, O3, O4, O5]>(error) as Either<ErrorT | E2 | E3 | E4 | E5, [OutputT, O2, O3, O4, O5]>)),
														(output4: O4) => {
															const mappedOutput4 = monadicOutputPromise5.map(
																(x5: Either<E5, O5>): Either<ErrorT | E2 | E3 | E4 | E5, [OutputT, O2, O3, O4, O5]> => x5.match<Either<ErrorT | E2 | E3 | E4 | E5, [OutputT, O2, O3, O4, O5]>>(
																	(error: E5) => new Left<ErrorT | E2 | E3 | E4 | E5, [OutputT, O2, O3, O4, O5]>(error),
																	(output5: O5) => new Right<ErrorT | E2 | E3 | E4 | E5, [OutputT, O2, O3, O4, O5]>([output, output2, output3, output4, output5]),
																),
															);

															return mappedOutput4;
														},
													),
												);

												return mapped;
											},
										),
									);

									return mappedOutput2;
								},
							),
						);

						return mappedOutput;
					},
				));

			return mappedPromise.promise;
		};

		return new AsyncComputation<InputT, ErrorT | E2 | E3 | E4 | E5, [OutputT, O2, O3, O4, O5]>(evaluate);
	}

	zip5<O2, O3, O4, O5, O6>(
		c2: AsyncComputation<InputT, ErrorT, O2>,
		c3: AsyncComputation<InputT, ErrorT, O3>,
		c4: AsyncComputation<InputT, ErrorT, O4>,
		c5: AsyncComputation<InputT, ErrorT, O5>,
		c6: AsyncComputation<InputT, ErrorT, O6>,
	): AsyncComputation<InputT, ErrorT, [OutputT, O2, O3, O4, O5, O6]> {
		const evaluate = async (input: InputT): Promise<Either<ErrorT, [OutputT, O2, O3, O4, O5, O6]>> => {
			const monadicOutputPromise = new MonadicPromise<Either<ErrorT, OutputT>>(this.evaluate(input));
			const monadicOutputPromise2 = new MonadicPromise<Either<ErrorT, O2>>(c2.evaluate(input));
			const monadicOutputPromise3 = new MonadicPromise<Either<ErrorT, O3>>(c3.evaluate(input));
			const monadicOutputPromise4 = new MonadicPromise<Either<ErrorT, O4>>(c4.evaluate(input));
			const monadicOutputPromise5 = new MonadicPromise<Either<ErrorT, O5>>(c5.evaluate(input));
			const monadicOutputPromise6 = new MonadicPromise<Either<ErrorT, O6>>(c6.evaluate(input));
			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<ErrorT, OutputT>): MonadicPromise<Either<ErrorT, [OutputT, O2, O3, O4, O5, O6]>> => x.match(
					(error: ErrorT) => new MonadicPromise(Promise.resolve(new Left<ErrorT, [OutputT, O2, O3, O4, O5, O6]>(error) as Either<ErrorT, [OutputT, O2, O3, O4, O5, O6]>)),
					(output: OutputT) => {
						const mappedOutput = monadicOutputPromise2.flatMap(
							(x2: Either<ErrorT, O2>): MonadicPromise<Either<ErrorT, [OutputT, O2, O3, O4, O5, O6]>> => x2.match(
								(error: ErrorT) => new MonadicPromise(Promise.resolve(new Left<ErrorT, [OutputT, O2, O3, O4, O5, O6]>(error) as Either<ErrorT, [OutputT, O2, O3, O4, O5, O6]>)),
								(output2: O2) => {
									const mappedOutput2 = monadicOutputPromise3.flatMap(
										(x3: Either<ErrorT, O3>): MonadicPromise<Either<ErrorT, [OutputT, O2, O3, O4, O5, O6]>> => x3.match(
											(error: ErrorT) => new MonadicPromise(Promise.resolve(new Left<ErrorT, [OutputT, O2, O3, O4, O5, O6]>(error) as Either<ErrorT, [OutputT, O2, O3, O4, O5, O6]>)),
											(output3: O3) => {
												const mapped = monadicOutputPromise4.flatMap(
													(x4: Either<ErrorT, O4>): MonadicPromise<Either<ErrorT, [OutputT, O2, O3, O4, O5, O6]>> => x4.match(
														(error: ErrorT) => new MonadicPromise(Promise.resolve(new Left<ErrorT, [OutputT, O2, O3, O4, O5, O6]>(error) as Either<ErrorT, [OutputT, O2, O3, O4, O5, O6]>)),
														(output4: O4) => {
															const mapped = monadicOutputPromise5.flatMap(
																(x5: Either<ErrorT, O5>): MonadicPromise<Either<ErrorT, [OutputT, O2, O3, O4, O5, O6]>> => x5.match(
																	(error: ErrorT) => new MonadicPromise(Promise.resolve(new Left<ErrorT, [OutputT, O2, O3, O4, O5, O6]>(error) as Either<ErrorT, [OutputT, O2, O3, O4, O5, O6]>)),
																	(output5: O5) => {
																		const mappedOutput5 = monadicOutputPromise6.map(
																			(x6: Either<ErrorT, O6>): Either<ErrorT, [OutputT, O2, O3, O4, O5, O6]> => x6.match<Either<ErrorT, [OutputT, O2, O3, O4, O5, O6]>>(
																				(error: ErrorT) => new Left<ErrorT, [OutputT, O2, O3, O4, O5, O6]>(error),
																				(output6: O6) => new Right<ErrorT, [OutputT, O2, O3, O4, O5, O6]>([output, output2, output3, output4, output5, output6]),
																			),
																		);

																		return mappedOutput5;
																	},
																),
															);

															return mapped;
														},
													),
												);

												return mapped;
											},
										),
									);

									return mappedOutput2;
								},
							),
						);

						return mappedOutput;
					},
				));

			return mappedPromise.promise;
		};

		return new AsyncComputation<InputT, ErrorT, [OutputT, O2, O3, O4, O5, O6]>(evaluate);
	}

	zip5WithNewErrors<E2, E3, E4, E5, E6, O2, O3, O4, O5, O6>(
		c2: AsyncComputation<InputT, E2, O2>,
		c3: AsyncComputation<InputT, E3, O3>,
		c4: AsyncComputation<InputT, E4, O4>,
		c5: AsyncComputation<InputT, E5, O5>,
		c6: AsyncComputation<InputT, E6, O6>,
	): AsyncComputation<InputT, ErrorT | E2 | E3 | E4 | E5 | E6, [OutputT, O2, O3, O4, O5, O6]> {
		const evaluate = async (input: InputT): Promise<Either<ErrorT | E2 | E3 | E4 | E5 | E6, [OutputT, O2, O3, O4, O5, O6]>> => {
			const monadicOutputPromise = new MonadicPromise<Either<ErrorT, OutputT>>(this.evaluate(input));
			const monadicOutputPromise2 = new MonadicPromise<Either<E2, O2>>(c2.evaluate(input));
			const monadicOutputPromise3 = new MonadicPromise<Either<E3, O3>>(c3.evaluate(input));
			const monadicOutputPromise4 = new MonadicPromise<Either<E4, O4>>(c4.evaluate(input));
			const monadicOutputPromise5 = new MonadicPromise<Either<E5, O5>>(c5.evaluate(input));
			const monadicOutputPromise6 = new MonadicPromise<Either<E6, O6>>(c6.evaluate(input));
			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<ErrorT, OutputT>): MonadicPromise<Either<ErrorT | E2 | E3 | E4 | E5 | E6, [OutputT, O2, O3, O4, O5, O6]>> => x.match(
					(error: ErrorT) => new MonadicPromise(Promise.resolve(new Left<ErrorT | E2 | E3 | E4 | E5 | E6, [OutputT, O2, O3, O4, O5, O6]>(error) as Either<ErrorT | E2 | E3 | E4 | E5 | E6, [OutputT, O2, O3, O4, O5, O6]>)),
					(output: OutputT) => {
						const mappedOutput = monadicOutputPromise2.flatMap(
							(x2: Either<E2, O2>): MonadicPromise<Either<ErrorT | E2 | E3 | E4 | E5 | E6, [OutputT, O2, O3, O4, O5, O6]>> => x2.match(
								(error: E2) => new MonadicPromise(Promise.resolve(new Left<ErrorT | E2 | E3 | E4 | E5 | E6, [OutputT, O2, O3, O4, O5, O6]>(error) as Either<ErrorT | E2 | E3 | E4 | E5 | E6, [OutputT, O2, O3, O4, O5, O6]>)),
								(output2: O2) => {
									const mappedOutput2 = monadicOutputPromise3.flatMap(
										(x3: Either<E3, O3>): MonadicPromise<Either<ErrorT | E2 | E3 | E4 | E5 | E6, [OutputT, O2, O3, O4, O5, O6]>> => x3.match(
											(error: E3) => new MonadicPromise(Promise.resolve(new Left<ErrorT | E2 | E3 | E4 | E5 | E6, [OutputT, O2, O3, O4, O5, O6]>(error) as Either<ErrorT | E2 | E3 | E4 | E5 | E6, [OutputT, O2, O3, O4, O5, O6]>)),
											(output3: O3) => {
												const mapped = monadicOutputPromise4.flatMap(
													(x4: Either<E4, O4>): MonadicPromise<Either<ErrorT | E2 | E3 | E4 | E5 | E6, [OutputT, O2, O3, O4, O5, O6]>> => x4.match(
														(error: E4) => new MonadicPromise(Promise.resolve(new Left<ErrorT | E2 | E3 | E4 | E5 | E6, [OutputT, O2, O3, O4, O5, O6]>(error) as Either<ErrorT | E2 | E3 | E4 | E5 | E6, [OutputT, O2, O3, O4, O5, O6]>)),
														(output4: O4) => {
															const mapped = monadicOutputPromise5.flatMap(
																(x5: Either<E5, O5>): MonadicPromise<Either<ErrorT | E2 | E3 | E4 | E5 | E6, [OutputT, O2, O3, O4, O5, O6]>> => x5.match(
																	(error: E5) => new MonadicPromise(Promise.resolve(new Left<ErrorT | E2 | E3 | E4 | E5 | E6, [OutputT, O2, O3, O4, O5, O6]>(error) as Either<ErrorT | E2 | E3 | E4 | E5 | E6, [OutputT, O2, O3, O4, O5, O6]>)),
																	(output5: O5) => {
																		const mapped = monadicOutputPromise6.flatMap(
																			(x6: Either<E6, O6>): MonadicPromise<Either<ErrorT | E2 | E3 | E4 | E5 | E6, [OutputT, O2, O3, O4, O5, O6]>> => x6.match(
																				(error: E6) => new MonadicPromise(Promise.resolve(new Left<ErrorT | E2 | E3 | E4 | E5 | E6, [OutputT, O2, O3, O4, O5, O6]>(error) as Either<ErrorT | E2 | E3 | E4 | E5 | E6, [OutputT, O2, O3, O4, O5, O6]>)),
																				(output6: O6) => new MonadicPromise(Promise.resolve(new Right<ErrorT | E2 | E3 | E4 | E5 | E6, [OutputT, O2, O3, O4, O5, O6]>([output, output2, output3, output4, output5, output6]))),
																			),
																		);

																		return mapped;
																	},
																),
															);

															return mapped;
														},
													),
												);

												return mapped;
											},
										),
									);

									return mappedOutput2;
								},
							),
						);

						return mappedOutput;
					},
				));

			return mappedPromise.promise;
		};

		return new AsyncComputation<InputT, ErrorT | E2 | E3 | E4 | E5 | E6, [OutputT, O2, O3, O4, O5, O6]>(evaluate);
	}

	zip6<O2, O3, O4, O5, O6, O7>(
		c2: AsyncComputation<InputT, ErrorT, O2>,
		c3: AsyncComputation<InputT, ErrorT, O3>,
		c4: AsyncComputation<InputT, ErrorT, O4>,
		c5: AsyncComputation<InputT, ErrorT, O5>,
		c6: AsyncComputation<InputT, ErrorT, O6>,
		c7: AsyncComputation<InputT, ErrorT, O7>,
	): AsyncComputation<InputT, ErrorT, [OutputT, O2, O3, O4, O5, O6, O7]> {
		const evaluate = async (input: InputT): Promise<Either<ErrorT, [OutputT, O2, O3, O4, O5, O6, O7]>> => {
			const monadicOutputPromise = new MonadicPromise<Either<ErrorT, OutputT>>(this.evaluate(input));
			const monadicOutputPromise2 = new MonadicPromise<Either<ErrorT, O2>>(c2.evaluate(input));
			const monadicOutputPromise3 = new MonadicPromise<Either<ErrorT, O3>>(c3.evaluate(input));
			const monadicOutputPromise4 = new MonadicPromise<Either<ErrorT, O4>>(c4.evaluate(input));
			const monadicOutputPromise5 = new MonadicPromise<Either<ErrorT, O5>>(c5.evaluate(input));
			const monadicOutputPromise6 = new MonadicPromise<Either<ErrorT, O6>>(c6.evaluate(input));
			const monadicOutputPromise7 = new MonadicPromise<Either<ErrorT, O7>>(c7.evaluate(input));
			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<ErrorT, OutputT>): MonadicPromise<Either<ErrorT, [OutputT, O2, O3, O4, O5, O6, O7]>> => x.match(
					(error: ErrorT) => new MonadicPromise(Promise.resolve(new Left<ErrorT, [OutputT, O2, O3, O4, O5, O6, O7]>(error) as Either<ErrorT, [OutputT, O2, O3, O4, O5, O6, O7]>)),
					(output: OutputT) => {
						const mappedOutputPromise2 = monadicOutputPromise2.flatMap(
							(x2: Either<ErrorT, O2>): MonadicPromise<Either<ErrorT, [OutputT, O2, O3, O4, O5, O6, O7]>> => x2.match(
								(error: ErrorT) => new MonadicPromise(Promise.resolve(new Left<ErrorT, [OutputT, O2, O3, O4, O5, O6, O7]>(error) as Either<ErrorT, [OutputT, O2, O3, O4, O5, O6, O7]>)),
								(output2: O2) => {
									const mappedOutputPromise3 = monadicOutputPromise3.flatMap(
										(x3: Either<ErrorT, O3>): MonadicPromise<Either<ErrorT, [OutputT, O2, O3, O4, O5, O6, O7]>> => x3.match(
											(error: ErrorT) => new MonadicPromise(Promise.resolve(new Left<ErrorT, [OutputT, O2, O3, O4, O5, O6, O7]>(error) as Either<ErrorT, [OutputT, O2, O3, O4, O5, O6, O7]>)),
											(output3: O3) => {
												const mappedOutputPromise4 = monadicOutputPromise4.flatMap(
													(x4: Either<ErrorT, O4>): MonadicPromise<Either<ErrorT, [OutputT, O2, O3, O4, O5, O6, O7]>> => x4.match(
														(error: ErrorT) => new MonadicPromise(Promise.resolve(new Left<ErrorT, [OutputT, O2, O3, O4, O5, O6, O7]>(error) as Either<ErrorT, [OutputT, O2, O3, O4, O5, O6, O7]>)),
														(output4: O4) => {
															const mappedOutputPromise5 = monadicOutputPromise5.flatMap(
																(x5: Either<ErrorT, O5>): MonadicPromise<Either<ErrorT, [OutputT, O2, O3, O4, O5, O6, O7]>> => x5.match(
																	(error: ErrorT) => new MonadicPromise(Promise.resolve(new Left<ErrorT, [OutputT, O2, O3, O4, O5, O6, O7]>(error) as Either<ErrorT, [OutputT, O2, O3, O4, O5, O6, O7]>)),
																	(output5: O5) => {
																		const mappedOutputPromise6 = monadicOutputPromise6.flatMap(
																			(x6: Either<ErrorT, O6>): MonadicPromise<Either<ErrorT, [OutputT, O2, O3, O4, O5, O6, O7]>> => x6.match(
																				(error: ErrorT) => new MonadicPromise(Promise.resolve(new Left<ErrorT, [OutputT, O2, O3, O4, O5, O6, O7]>(error) as Either<ErrorT, [OutputT, O2, O3, O4, O5, O6, O7]>)),
																				(output6: O6) => {
																					const mappedOutputPromise7 = monadicOutputPromise7.flatMap(
																						(x7: Either<ErrorT, O7>): MonadicPromise<Either<ErrorT, [OutputT, O2, O3, O4, O5, O6, O7]>> => x7.match(
																							(error: ErrorT) => new MonadicPromise(Promise.resolve(new Left<ErrorT, [OutputT, O2, O3, O4, O5, O6, O7]>(error) as Either<ErrorT, [OutputT, O2, O3, O4, O5, O6, O7]>)),
																							(output7: O7) => new MonadicPromise(Promise.resolve(new Right<ErrorT, [OutputT, O2, O3, O4, O5, O6, O7]>([output, output2, output3, output4, output5, output6, output7]))),
																						),
																					);

																					return mappedOutputPromise7;
																				},
																			),
																		);

																		return mappedOutputPromise6;
																	},
																),
															);

															return mappedOutputPromise5;
														},
													),
												);

												return mappedOutputPromise4;
											},
										),
									);

									return mappedOutputPromise3;
								},
							),
						);

						return mappedOutputPromise2;
					},
				),
			);

			return mappedPromise.promise;
		};

		return new AsyncComputation<InputT, ErrorT, [OutputT, O2, O3, O4, O5, O6, O7]>(evaluate);
	}

	zip6WithNewErrors<E2, E3, E4, E5, E6, E7, O2, O3, O4, O5, O6, O7>(
		c2: AsyncComputation<InputT, E2, O2>,
		c3: AsyncComputation<InputT, E3, O3>,
		c4: AsyncComputation<InputT, E4, O4>,
		c5: AsyncComputation<InputT, E5, O5>,
		c6: AsyncComputation<InputT, E6, O6>,
		c7: AsyncComputation<InputT, E7, O7>,
	): AsyncComputation<InputT, ErrorT | E2 | E3 | E4 | E5 | E6 | E7, [OutputT, O2, O3, O4, O5, O6, O7]> {
		const evaluate = async (input: InputT): Promise<Either<ErrorT | E2 | E3 | E4 | E5 | E6 | E7, [OutputT, O2, O3, O4, O5, O6, O7]>> => {
			const monadicOutputPromise = new MonadicPromise<Either<ErrorT, OutputT>>(this.evaluate(input));
			const monadicOutputPromise2 = new MonadicPromise<Either<E2, O2>>(c2.evaluate(input));
			const monadicOutputPromise3 = new MonadicPromise<Either<E3, O3>>(c3.evaluate(input));
			const monadicOutputPromise4 = new MonadicPromise<Either<E4, O4>>(c4.evaluate(input));
			const monadicOutputPromise5 = new MonadicPromise<Either<E5, O5>>(c5.evaluate(input));
			const monadicOutputPromise6 = new MonadicPromise<Either<E6, O6>>(c6.evaluate(input));
			const monadicOutputPromise7 = new MonadicPromise<Either<E7, O7>>(c7.evaluate(input));

			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<ErrorT, OutputT>): MonadicPromise<Either<ErrorT | E2 | E3 | E4 | E5 | E6 | E7, [OutputT, O2, O3, O4, O5, O6, O7]>> => x.match(
					(error: ErrorT) => new MonadicPromise(Promise.resolve(new Left<ErrorT | E2 | E3 | E4 | E5 | E6 | E7, [OutputT, O2, O3, O4, O5, O6, O7]>(error) as Either<ErrorT | E2 | E3 | E4 | E5 | E6 | E7, [OutputT, O2, O3, O4, O5, O6, O7]>)),
					(output: OutputT) => {
						const mappedOutputPromise2 = monadicOutputPromise2.flatMap(
							(x2: Either<E2, O2>): MonadicPromise<Either<ErrorT | E2 | E3 | E4 | E5 | E6 | E7, [OutputT, O2, O3, O4, O5, O6, O7]>> => x2.match(
								(error: E2) => new MonadicPromise(Promise.resolve(new Left<ErrorT | E2 | E3 | E4 | E5 | E6 | E7, [OutputT, O2, O3, O4, O5, O6, O7]>(error) as Either<ErrorT | E2 | E3 | E4 | E5 | E6 | E7, [OutputT, O2, O3, O4, O5, O6, O7]>)),
								(output2: O2) => {
									const mappedOutputPromise3 = monadicOutputPromise3.flatMap(
										(x3: Either<E3, O3>): MonadicPromise<Either<ErrorT | E2 | E3 | E4 | E5 | E6 | E7, [OutputT, O2, O3, O4, O5, O6, O7]>> => x3.match(
											(error: E3) => new MonadicPromise(Promise.resolve(new Left<ErrorT | E2 | E3 | E4 | E5 | E6 | E7, [OutputT, O2, O3, O4, O5, O6, O7]>(error) as Either<ErrorT | E2 | E3 | E4 | E5 | E6 | E7, [OutputT, O2, O3, O4, O5, O6, O7]>)),
											(output3: O3) => {
												const mappedOutputPromise4 = monadicOutputPromise4.flatMap(
													(x4: Either<E4, O4>): MonadicPromise<Either<ErrorT | E2 | E3 | E4 | E5 | E6 | E7, [OutputT, O2, O3, O4, O5, O6, O7]>> => x4.match(
														(error: E4) => new MonadicPromise(Promise.resolve(new Left<ErrorT | E2 | E3 | E4 | E5 | E6 | E7, [OutputT, O2, O3, O4, O5, O6, O7]>(error) as Either<ErrorT | E2 | E3 | E4 | E5 | E6 | E7, [OutputT, O2, O3, O4, O5, O6, O7]>)),
														(output4: O4) => {
															const mappedOutputPromise5 = monadicOutputPromise5.flatMap(
																(x5: Either<E5, O5>): MonadicPromise<Either<ErrorT | E2 | E3 | E4 | E5 | E6 | E7, [OutputT, O2, O3, O4, O5, O6, O7]>> => x5.match(
																	(error: E5) => new MonadicPromise(Promise.resolve(new Left<ErrorT | E2 | E3 | E4 | E5 | E6 | E7, [OutputT, O2, O3, O4, O5, O6, O7]>(error) as Either<ErrorT | E2 | E3 | E4 | E5 | E6 | E7, [OutputT, O2, O3, O4, O5, O6, O7]>)),
																	(output5: O5) => {
																		const mappedOutputPromise6 = monadicOutputPromise6.flatMap(
																			(x6: Either<E6, O6>): MonadicPromise<Either<ErrorT | E2 | E3 | E4 | E5 | E6 | E7, [OutputT, O2, O3, O4, O5, O6, O7]>> => x6.match(
																				(error: E6) => new MonadicPromise(Promise.resolve(new Left<ErrorT | E2 | E3 | E4 | E5 | E6 | E7, [OutputT, O2, O3, O4, O5, O6, O7]>(error) as Either<ErrorT | E2 | E3 | E4 | E5 | E6 | E7, [OutputT, O2, O3, O4, O5, O6, O7]>)),
																				(output6: O6) => {
																					const mappedOutputPromise7 = monadicOutputPromise7.flatMap(
																						(x7: Either<E7, O7>): MonadicPromise<Either<ErrorT | E2 | E3 | E4 | E5 | E6 | E7, [OutputT, O2, O3, O4, O5, O6, O7]>> => x7.match(
																							(error: E7) => new MonadicPromise(Promise.resolve(new Left<ErrorT | E2 | E3 | E4 | E5 | E6 | E7, [OutputT, O2, O3, O4, O5, O6, O7]>(error) as Either<ErrorT | E2 | E3 | E4 | E5 | E6 | E7, [OutputT, O2, O3, O4, O5, O6, O7]>)),
																							(output7: O7) => new MonadicPromise(Promise.resolve(new Right<ErrorT | E2 | E3 | E4 | E5 | E6 | E7, [OutputT, O2, O3, O4, O5, O6, O7]>([output, output2, output3, output4, output5, output6, output7]))),
																						),
																					);

																					return mappedOutputPromise7;
																				},
																			),
																		);

																		return mappedOutputPromise6;
																	},
																),
															);

															return mappedOutputPromise5;
														},
													),
												);

												return mappedOutputPromise4;
											},
										),
									);

									return mappedOutputPromise3;
								},
							),
						);

						return mappedOutputPromise2;
					},
				),
			);

			return mappedPromise.promise;
		};

		return new AsyncComputation<InputT, ErrorT | E2 | E3 | E4 | E5 | E6 | E7, [OutputT, O2, O3, O4, O5, O6, O7]>(evaluate);
	}

	zipN<Output2T>(...others: Array<AsyncComputation<InputT, ErrorT, Output2T>>): AsyncComputation<InputT, ErrorT, [OutputT, ...Output2T[]]> {
		const evaluate = async (input: InputT): Promise<Either<ErrorT, [OutputT, ...Output2T[]]>> => {
			const thisPromise = this.evaluate(input);
			const promises = others.map(async (other: AsyncComputation<InputT, ErrorT, Output2T>) => other.evaluate(input));
			const all = await Promise.all([thisPromise, ...promises]);
			const errors = all.filter((x: Either<ErrorT, OutputT | Output2T>) => x.isLeft());
			if (errors.length > 0) {
				return new Left(errors[0].get() as ErrorT);
			}

			return new Right(all.map((x: Either<ErrorT, OutputT | Output2T>) => x.get() as OutputT | Output2T) as [OutputT, ...Output2T[]]);
		};

		return new AsyncComputation<InputT, ErrorT, [OutputT, ...Output2T[]]>(evaluate);
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	zipNWithNewErrors<Error2T, Output2T>(...others: Array<AsyncComputation<InputT, Error2T, Output2T>>): AsyncComputation<InputT, ErrorT | Error2T, [OutputT, ...Output2T[]]> {
		const evaluate = async (input: InputT): Promise<Either<ErrorT | Error2T, [OutputT, ...Output2T[]]>> => {
			const thisPromise = this.evaluate(input);
			const promises = others.map(async (other: AsyncComputation<InputT, Error2T, Output2T>) => other.evaluate(input));
			const all = await Promise.all([thisPromise, ...promises]);
			const errors = all.filter((x: Either<ErrorT | Error2T, OutputT | Output2T>) => x.isLeft());
			if (errors.length > 0) {
				return new Left(errors[0].get() as ErrorT | Error2T);
			}

			return new Right(all.map((x: Either<ErrorT | Error2T, OutputT | Output2T>) => x.get() as OutputT | Output2T) as [OutputT, ...Output2T[]]);
		};

		return new AsyncComputation<InputT, ErrorT | Error2T, [OutputT, ...Output2T[]]>(evaluate);
	}

	toAsync(): this {
		return this;
	}

	toComputation(): this {
		return this;
	}

	bindInput(input: InputT): AsyncTask<ErrorT, OutputT> {
		return new AsyncTask<ErrorT, OutputT>(async () => this.evaluate(input));
	}

	bindAsyncInput(inputFn: () => Promise<InputT>): AsyncComputation<InputT, ErrorT, OutputT> {
		return new AsyncComputation<InputT, ErrorT, OutputT>(async () => this.evaluate(await inputFn()));
	}
}
