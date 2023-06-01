/* eslint-disable max-nested-callbacks */
import {type AsyncIO} from './AsyncIO.js';
import {AsyncSafeComputation} from './AsyncSafeComputation.js';
import {type AsyncTask} from './AsyncTask.js';
import {type AsyncContravariantFunctor} from './Contravariant.js';
import {type Either, Left, Right} from './Either.js';
import {type AsyncMonad} from './Monad.js';
import {MonadicPromise} from './MonadicPromise.js';

export class AsyncComputation<Input, out Error, out Output> implements AsyncMonad<Output>, AsyncContravariantFunctor<Input> {
	constructor(public readonly evaluate: (input: Input) => Promise<Either<Error, Output>>) {}

	thenDo<O2>(f: (..._: any[]) => Promise<O2>): AsyncComputation<Input, Error, O2> {
		const evaluate = async (input: Input): Promise<Either<Error, O2>> => {
			const thisOutput = await this.evaluate(input);
			if (thisOutput.isLeft()) {
				return new Left<Error, O2>(thisOutput.get());
			}

			const ioOutput = await f();
			return new Right<Error, O2>(ioOutput);
		};

		return new AsyncComputation<Input, Error, O2>(evaluate);
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	thenDoIO<O2>(io: AsyncIO<O2>): AsyncComputation<Input, Error, O2> {
		const evaluate = async (input: Input): Promise<Either<Error, O2>> => {
			const thisOutput = await this.evaluate(input);
			if (thisOutput.isLeft()) {
				return new Left<Error, O2>(thisOutput.get());
			}

			const ioOutput = await io.evaluate();
			return new Right<Error, O2>(ioOutput);
		};

		return new AsyncComputation<Input, Error, O2>(evaluate);
	}

	thenDoWithSameInput<Output2>(f: (input: Input) => Promise<Output2>): AsyncComputation<Input, Error, Output2> {
		const evaluate = async (input: Input): Promise<Either<Error, Output2>> => {
			const thisOutput = await this.evaluate(input);
			if (thisOutput.isLeft()) {
				return new Left<Error, Output2>(thisOutput.get());
			}

			const ioOutput = await f(input);
			return new Right<Error, Output2>(ioOutput);
		};

		return new AsyncComputation<Input, Error, Output2>(evaluate);
	}

	thenDoSafeComputationWithSameInput<Output2>(
		computation: AsyncSafeComputation<Input, Output2>,
	): AsyncComputation<Input, Error, Output2> {
		return this.thenDoWithSameInput(async (input: Input) => computation.evaluate(input));
	}

	thenDoWithNewInput<Input2, Output2>(f: (input: Input2) => Promise<Output2>): AsyncComputation<[Input, Input2], Error, Output2> {
		const evaluate = async ([input1, input2]: [Input, Input2]): Promise<Either<Error, Output2>> => {
			const thisOutput = await this.evaluate(input1);
			if (thisOutput.isLeft()) {
				return new Left<Error, Output2>(thisOutput.get());
			}

			const ioOutput = await f(input2);
			return new Right<Error, Output2>(ioOutput);
		};

		return new AsyncComputation<[Input, Input2], Error, Output2>(evaluate);
	}

	thenDoSafeComputation<Input2, Output2>(
		computation: AsyncSafeComputation<Input2, Output2>,
	): AsyncComputation<[Input, Input2], Error, Output2> {
		return this.thenDoWithNewInput(async (input: Input2) => computation.evaluate(input));
	}

	thenDoWithNewError<E2, O2>(f: (..._: any[]) => Promise<Either<E2, O2>>): AsyncComputation<Input, Error | E2, O2> {
		const evaluate = async (input: Input): Promise<Either<Error | E2, O2>> => {
			const thisOutput = await this.evaluate(input);
			if (thisOutput.isLeft()) {
				return new Left<Error | E2, O2>(thisOutput.get());
			}

			const ioOutput = await f();
			return ioOutput;
		};

		return new AsyncComputation<Input, Error | E2, O2>(evaluate);
	}

	thenDoTask<E2, O2>(task: AsyncTask<E2, O2>): AsyncComputation<Input, Error | E2, O2> {
		const evaluate = async (input: Input): Promise<Either<Error | E2, O2>> => {
			const thisOutput = await this.evaluate(input);
			if (thisOutput.isLeft()) {
				return new Left<Error | E2, O2>(thisOutput.get());
			}

			const ioOutput = await task.evaluate();
			return ioOutput;
		};

		return new AsyncComputation<Input, Error | E2, O2>(evaluate);
	}

	thenDoWithNewInputAndError<I2, E2, O2>(f: (input: I2) => Promise<Either<E2, O2>>): AsyncComputation<{i1: Input; i2: I2}, Error | E2, O2> {
		const evaluate = async ({i1, i2}: {i1: Input; i2: I2}): Promise<Either<Error | E2, O2>> => {
			const thisOutput = await this.evaluate(i1);
			if (thisOutput.isLeft()) {
				return new Left<Error | E2, O2>(thisOutput.get());
			}

			const ioOutput = await f(i2);
			return ioOutput;
		};

		return new AsyncComputation<{i1: Input; i2: I2}, Error | E2, O2>(evaluate);
	}

	thenDoComputation<I2, E2, O2>(computation: AsyncComputation<I2, E2, O2>): AsyncComputation<{i1: Input; i2: I2}, Error | E2, O2> {
		const evaluate = async ({i1, i2}: {i1: Input; i2: I2}): Promise<Either<Error | E2, O2>> => {
			const thisOutput = await this.evaluate(i1);
			if (thisOutput.isLeft()) {
				return new Left<Error | E2, O2>(thisOutput.get());
			}

			const ioOutput = await computation.evaluate(i2);
			return ioOutput;
		};

		return new AsyncComputation<{i1: Input; i2: I2}, Error | E2, O2>(evaluate);
	}

	orElseDo<Output2>(f: (..._: any[]) => Promise<Output2>): AsyncSafeComputation<Input, Either<Output, Output2>> {
		const evaluate = async (input: Input): Promise<Either<Output, Output2>> => {
			const thisOutput = await this.evaluate(input);
			if (thisOutput.isLeft()) {
				return new Right<Output, Output2>(await f());
			}

			return new Left<Output, Output2>(thisOutput.get() as Output);
		};

		return new AsyncSafeComputation<Input, Either<Output, Output2>>(evaluate);
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	orElseDoIO<Output2>(io: AsyncIO<Output2>): AsyncSafeComputation<Input, Either<Output, Output2>> {
		return this.orElseDo(async () => io.evaluate());
	}

	orElseDoWithSameInput<Output2>(f: (i: Input) => Promise<Output2>): AsyncSafeComputation<Input, Either<Output, Output2>> {
		const evaluate = async (input: Input): Promise<Either<Output, Output2>> => {
			const thisOutput = await this.evaluate(input);
			if (thisOutput.isLeft()) {
				return new Right<Output, Output2>(await f(input));
			}

			return new Left<Output, Output2>(thisOutput.get() as Output);
		};

		return new AsyncSafeComputation<Input, Either<Output, Output2>>(evaluate);
	}

	orElseDoSafeComputationWithSameInput<Output2>(
		computation: AsyncSafeComputation<Input, Output2>,
	): AsyncSafeComputation<Input, Either<Output, Output2>> {
		return this.orElseDoWithSameInput(async (input: Input) => computation.evaluate(input));
	}

	orElseDoWithNewInput<Input2, Output2>(f: (i: Input2) => Promise<Output2>): AsyncSafeComputation<[Input, Input2], Either<Output, Output2>> {
		const evaluate = async ([input1, input2]: [Input, Input2]): Promise<Either<Output, Output2>> => {
			const thisOutput = await this.evaluate(input1);
			if (thisOutput.isLeft()) {
				return new Right<Output, Output2>(await f(input2));
			}

			return new Left<Output, Output2>(thisOutput.get() as Output);
		};

		return new AsyncSafeComputation<[Input, Input2], Either<Output, Output2>>(evaluate);
	}

	orElseDoSafeComputation<Input2, Output2>(
		computation: AsyncSafeComputation<Input2, Output2>,
	): AsyncSafeComputation<[Input, Input2], Either<Output, Output2>> {
		return this.orElseDoWithNewInput(async (input2: Input2) => computation.evaluate(input2));
	}

	orElseDoWithNewError<Error2, Output2>(f: (..._: any[]) => Promise<Either<Error2, Output2>>): AsyncComputation<Input, Error | Error2, Either<Output, Output2>> {
		const resolver = async (input: Input): Promise<Either<Error | Error2, Either<Output, Output2>>> => {
			const thisOutput = await this.evaluate(input);
			if (thisOutput.isLeft()) {
				const otherEvaluated = await f();
				if (otherEvaluated.isLeft()) {
					return otherEvaluated as Left<Error | Error2, Either<Output, Output2>>;
				}

				return new Right<Error | Error2, Either<Output, Output2>>(new Right<Output, Output2>(otherEvaluated.get() as Output2));
			}

			return new Right<Error | Error2, Either<Output, Output2>>(new Left<Output, Output2>(thisOutput.get() as Output));
		};

		return new AsyncComputation<Input, Error | Error2, Either<Output, Output2>>(resolver);
	}

	orElseDoTask<Error2, Output2>(task: AsyncTask<Error2, Output2>): AsyncComputation<Input, Error | Error2, Either<Output, Output2>> {
		return this.orElseDoWithNewError(async () => task.evaluate());
	}

	orElseDoWithSameInputAndNewError<Error2, Output2>(
		f: (i: Input) => Promise<Either<Error2, Output2>>,
	): AsyncComputation<Input, Error | Error2, Either<Output, Output2>> {
		const resolver = async (input: Input): Promise<Either<Error | Error2, Either<Output, Output2>>> => {
			const thisOutput = await this.evaluate(input);
			if (thisOutput.isLeft()) {
				const otherEvaluated = await f(input);
				if (otherEvaluated.isLeft()) {
					return otherEvaluated as Left<Error | Error2, Either<Output, Output2>>;
				}

				return new Right<Error | Error2, Either<Output, Output2>>(new Right<Output, Output2>(otherEvaluated.get() as Output2));
			}

			return new Right<Error | Error2, Either<Output, Output2>>(new Left<Output, Output2>(thisOutput.get() as Output));
		};

		return new AsyncComputation<Input, Error | Error2, Either<Output, Output2>>(resolver);
	}

	orElseDoComputationWithSameInput<Error2, Output2>(
		computation: AsyncComputation<Input, Error2, Output2>,
	): AsyncComputation<Input, Error | Error2, Either<Output, Output2>> {
		return this.orElseDoWithSameInputAndNewError(async (input: Input) => computation.evaluate(input));
	}

	orElseDoWithNewInputAndNewError<Input2, Error2, Output2>(
		f: (i: Input2) => Promise<Either<Error2, Output2>>,
	): AsyncComputation<[Input, Input2], Error | Error2, Either<Output, Output2>> {
		const resolver = async ([input1, input2]: [Input, Input2]): Promise<Either<Error | Error2, Either<Output, Output2>>> => {
			const thisOutput = await this.evaluate(input1);
			if (thisOutput.isLeft()) {
				const otherEvaluated = await f(input2);
				if (otherEvaluated.isLeft()) {
					return otherEvaluated as Left<Error | Error2, Either<Output, Output2>>;
				}

				return new Right<Error | Error2, Either<Output, Output2>>(new Right<Output, Output2>(otherEvaluated.get() as Output2));
			}

			return new Right<Error | Error2, Either<Output, Output2>>(new Left<Output, Output2>(thisOutput.get() as Output));
		};

		return new AsyncComputation<[Input, Input2], Error | Error2, Either<Output, Output2>>(resolver);
	}

	orElseDoComputation<Input2, Error2, Output2>(
		computation: AsyncComputation<Input2, Error2, Output2>,
	): AsyncComputation<[Input, Input2], Error | Error2, Either<Output, Output2>> {
		return this.orElseDoWithNewInputAndNewError(async (input2: Input2) => computation.evaluate(input2));
	}

	contramap<I2>(f: (input: I2) => Promise<Input>): AsyncComputation<I2, Error, Output> {
		const evaluate = async (input: I2): Promise<Either<Error, Output>> => {
			const i = await f(input);
			return this.evaluate(i);
		};

		return new AsyncComputation<I2, Error, Output>(evaluate);
	}

	map<O2>(f: (output: Output) => Promise<O2>): AsyncComputation<Input, Error, O2> {
		const evaluate = async (input: Input): Promise<Either<Error, O2>> => {
			const monadicOutputPromise = new MonadicPromise<Either<Error, Output>>(this.evaluate(input));
			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<Error, Output>): MonadicPromise<Either<Error, O2>> => x.match(
					(error: Error) => new MonadicPromise(Promise.resolve(new Left<Error, O2>(error) as Either<Error, O2>)),
					(output: Output) => {
						const mappedOutput = new MonadicPromise<O2>(f(output));
						return mappedOutput.map((o: O2): Either<Error, O2> => new Right<Error, O2>(o));
					},
				),
			);
			return mappedPromise.promise;
		};

		return new AsyncComputation<Input, Error, O2>(evaluate);
	}

	apply<U>(f: AsyncComputation<Input, Error, (output: Output) => Promise<U>>): AsyncComputation<Input, Error, U> {
		const evaluate = async (input: Input): Promise<Either<Error, U>> => {
			const monadicOutputPromise = new MonadicPromise<Either<Error, Output>>(this.evaluate(input));
			const monadicF = new MonadicPromise<Either<Error, (output: Output) => Promise<U>>>(f.evaluate(input));
			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<Error, Output>): MonadicPromise<Either<Error, U>> => x.match(
					(error: Error) => new MonadicPromise(Promise.resolve(new Left<Error, U>(error) as Either<Error, U>)),
					(output: Output) => {
						const mappedF = monadicF.flatMap(
							either => either.match(
								(error: Error) => new MonadicPromise(Promise.resolve(new Left<Error, U>(error) as Either<Error, U>)),
								(f: (output: Output) => Promise<U>) => {
									const fMappedOutput = new MonadicPromise<U>(f(output));
									const mappedOutput = fMappedOutput.map((o: U): Either<Error, U> => new Right<Error, U>(o));
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

		return new AsyncComputation<Input, Error, U>(evaluate);
	}

	pure<U>(x: Promise<U>): AsyncComputation<any, undefined, U> {
		const evaluate = async (_: any): Promise<Either<undefined, U>> => {
			const mappedOutput = new MonadicPromise<U>(x);
			return mappedOutput.map((o: U): Either<undefined, U> => new Right<undefined, U>(o)).promise;
		};

		return new AsyncComputation<any, undefined, U>(evaluate);
	}

	flatMap<U>(f: (output: Output) => AsyncComputation<Input, Error, U>): AsyncComputation<Input, Error, U> {
		const evaluate = async (input: Input): Promise<Either<Error, U>> => {
			const monadicOutputPromise = new MonadicPromise<Either<Error, Output>>(this.evaluate(input));
			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<Error, Output>): MonadicPromise<Either<Error, U>> => x.match(
					(error: Error) => new MonadicPromise(Promise.resolve(new Left<Error, U>(error) as Either<Error, U>)),
					(output: Output) => new MonadicPromise(f(output).evaluate(input)),
				),
			);
			return mappedPromise.promise;
		};

		return new AsyncComputation<Input, Error, U>(evaluate);
	}

	zip<U>(c2: AsyncComputation<Input, Error, U>): AsyncComputation<Input, Error, [Output, U]> {
		const evaluate = async (input: Input): Promise<Either<Error, [Output, U]>> => {
			const monadicOutputPromise = new MonadicPromise<Either<Error, Output>>(this.evaluate(input));
			const monadicOutputPromise2 = new MonadicPromise<Either<Error, U>>(c2.evaluate(input));
			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<Error, Output>): MonadicPromise<Either<Error, [Output, U]>> => x.match(
					(error: Error) => new MonadicPromise(Promise.resolve(new Left<Error, [Output, U]>(error) as Either<Error, [Output, U]>)),
					(output: Output) => {
						const mappedOutput = monadicOutputPromise2.map(
							(either: Either<Error, U>): Either<Error, [Output, U]> => either.match<Either<Error, [Output, U]>>(
								(error: Error) => new Left<Error, [Output, U]>(error),
								(output2: U) => new Right<Error, [Output, U]>([output, output2]),
							),
						);
						return mappedOutput;
					},
				),
			);
			return mappedPromise.promise;
		};

		return new AsyncComputation<Input, Error, [Output, U]>(evaluate);
	}

	zipWithNewError<E2, O2>(c2: AsyncComputation<Input, E2, O2>): AsyncComputation<Input, Error | E2, [Output, O2]> {
		const evaluate = async (input: Input): Promise<Either<Error | E2, [Output, O2]>> => {
			const monadicOutputPromise = new MonadicPromise<Either<Error, Output>>(this.evaluate(input));
			const monadicOutputPromise2 = new MonadicPromise<Either<E2, O2>>(c2.evaluate(input));
			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<Error, Output>): MonadicPromise<Either<Error | E2, [Output, O2]>> => x.match(
					(error: Error) => new MonadicPromise(Promise.resolve(new Left<Error | E2, [Output, O2]>(error) as Either<Error | E2, [Output, O2]>)),
					(output: Output) => {
						const mappedOutput = monadicOutputPromise2.map(
							(either: Either<E2, O2>): Either<Error | E2, [Output, O2]> => either.match<Either<Error | E2, [Output, O2]>>(
								(error: E2) => new Left<Error | E2, [Output, O2]>(error),
								(output2: O2) => new Right<Error | E2, [Output, O2]>([output, output2]),
							),
						);
						return mappedOutput;
					},
				),
			);
			return mappedPromise.promise;
		};

		return new AsyncComputation<Input, Error | E2, [Output, O2]>(evaluate);
	}

	zip2<O2, O3>(
		c2: AsyncComputation<Input, Error, O2>,
		c3: AsyncComputation<Input, Error, O3>,
	): AsyncComputation<Input, Error, [Output, O2, O3]> {
		const evaluate = async (input: Input): Promise<Either<Error, [Output, O2, O3]>> => {
			const monadicOutputPromise = new MonadicPromise<Either<Error, Output>>(this.evaluate(input));
			const monadicOutputPromise2 = new MonadicPromise<Either<Error, O2>>(c2.evaluate(input));
			const monadicOutputPromise3 = new MonadicPromise<Either<Error, O3>>(c3.evaluate(input));
			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<Error, Output>): MonadicPromise<Either<Error, [Output, O2, O3]>> => x.match(
					(error: Error) => new MonadicPromise(Promise.resolve(new Left<Error, [Output, O2, O3]>(error) as Either<Error, [Output, O2, O3]>)),
					(output: Output) => {
						const mappedOutput = monadicOutputPromise2.flatMap(
							(x2: Either<Error, O2>): MonadicPromise<Either<Error, [Output, O2, O3]>> => x2.match(
								(error: Error) => new MonadicPromise(Promise.resolve(new Left<Error, [Output, O2, O3]>(error) as Either<Error, [Output, O2, O3]>)),
								(output2: O2) => {
									const mappedOutput2 = monadicOutputPromise3.map(
										(x3: Either<Error, O3>): Either<Error, [Output, O2, O3]> => x3.match<Either<Error, [Output, O2, O3]>>(
											(error: Error) => new Left<Error, [Output, O2, O3]>(error),
											(output3: O3) => new Right<Error, [Output, O2, O3]>([output, output2, output3]),
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

		return new AsyncComputation<Input, Error, [Output, O2, O3]>(evaluate);
	}

	zip2WithNewErrors<E2, E3, O2, O3>(
		c2: AsyncComputation<Input, E2, O2>,
		c3: AsyncComputation<Input, E3, O3>,
	): AsyncComputation<Input, Error | E2 | E3, [Output, O2, O3]> {
		const evaluate = async (input: Input): Promise<Either<Error | E2 | E3, [Output, O2, O3]>> => {
			const monadicOutputPromise = new MonadicPromise<Either<Error, Output>>(this.evaluate(input));
			const monadicOutputPromise2 = new MonadicPromise<Either<E2, O2>>(c2.evaluate(input));
			const monadicOutputPromise3 = new MonadicPromise<Either<E3, O3>>(c3.evaluate(input));
			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<Error, Output>): MonadicPromise<Either<Error | E2 | E3, [Output, O2, O3]>> => x.match(
					(error: Error) => new MonadicPromise(Promise.resolve(new Left<Error | E2 | E3, [Output, O2, O3]>(error) as Either<Error | E2 | E3, [Output, O2, O3]>)),
					(output: Output) => {
						const mappedOutput = monadicOutputPromise2.flatMap(
							(x2: Either<E2, O2>): MonadicPromise<Either<Error | E2 | E3, [Output, O2, O3]>> => x2.match(
								(error: E2) => new MonadicPromise(Promise.resolve(new Left<Error | E2 | E3, [Output, O2, O3]>(error) as Either<Error | E2 | E3, [Output, O2, O3]>)),
								(output2: O2) => {
									const mappedOutput2 = monadicOutputPromise3.map(
										(x3: Either<E3, O3>): Either<Error | E2 | E3, [Output, O2, O3]> => x3.match<Either<Error | E2 | E3, [Output, O2, O3]>>(
											(error: E3) => new Left<Error | E2 | E3, [Output, O2, O3]>(error),
											(output3: O3) => new Right<Error | E2 | E3, [Output, O2, O3]>([output, output2, output3]),
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

		return new AsyncComputation<Input, Error | E2 | E3, [Output, O2, O3]>(evaluate);
	}

	zip3<O2, O3, O4>(
		c2: AsyncComputation<Input, Error, O2>,
		c3: AsyncComputation<Input, Error, O3>,
		c4: AsyncComputation<Input, Error, O4>,
	): AsyncComputation<Input, Error, [Output, O2, O3, O4]> {
		const evaluate = async (input: Input): Promise<Either<Error, [Output, O2, O3, O4]>> => {
			const monadicOutputPromise = new MonadicPromise<Either<Error, Output>>(this.evaluate(input));
			const monadicOutputPromise2 = new MonadicPromise<Either<Error, O2>>(c2.evaluate(input));
			const monadicOutputPromise3 = new MonadicPromise<Either<Error, O3>>(c3.evaluate(input));
			const monadicOutputPromise4 = new MonadicPromise<Either<Error, O4>>(c4.evaluate(input));
			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<Error, Output>): MonadicPromise<Either<Error, [Output, O2, O3, O4]>> => x.match(
					(error: Error) => new MonadicPromise(Promise.resolve(new Left<Error, [Output, O2, O3, O4]>(error) as Either<Error, [Output, O2, O3, O4]>)),
					(output: Output) => {
						const mappedOutput = monadicOutputPromise2.flatMap(
							(x2: Either<Error, O2>): MonadicPromise<Either<Error, [Output, O2, O3, O4]>> => x2.match(
								(error: Error) => new MonadicPromise(Promise.resolve(new Left<Error, [Output, O2, O3, O4]>(error) as Either<Error, [Output, O2, O3, O4]>)),
								(output2: O2) => {
									const mappedOutput2 = monadicOutputPromise3.flatMap(
										(x3: Either<Error, O3>): MonadicPromise<Either<Error, [Output, O2, O3, O4]>> => x3.match(
											(error: Error) => new MonadicPromise(Promise.resolve(new Left<Error, [Output, O2, O3, O4]>(error) as Either<Error, [Output, O2, O3, O4]>)),
											(output3: O3) => {
												const mappedOutput3 = monadicOutputPromise4.map(
													(x4: Either<Error, O4>): Either<Error, [Output, O2, O3, O4]> => x4.match<Either<Error, [Output, O2, O3, O4]>>(
														(error: Error) => new Left<Error, [Output, O2, O3, O4]>(error),
														(output4: O4) => new Right<Error, [Output, O2, O3, O4]>([output, output2, output3, output4]),
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

		return new AsyncComputation<Input, Error, [Output, O2, O3, O4]>(evaluate);
	}

	zip3WithNewErrors<E2, E3, E4, O2, O3, O4>(
		c2: AsyncComputation<Input, E2, O2>,
		c3: AsyncComputation<Input, E3, O3>,
		c4: AsyncComputation<Input, E4, O4>,
	): AsyncComputation<Input, Error | E2 | E3 | E4, [Output, O2, O3, O4]> {
		const evaluate = async (input: Input): Promise<Either<Error | E2 | E3 | E4, [Output, O2, O3, O4]>> => {
			const monadicOutputPromise = new MonadicPromise<Either<Error, Output>>(this.evaluate(input));
			const monadicOutputPromise2 = new MonadicPromise<Either<E2, O2>>(c2.evaluate(input));
			const monadicOutputPromise3 = new MonadicPromise<Either<E3, O3>>(c3.evaluate(input));
			const monadicOutputPromise4 = new MonadicPromise<Either<E4, O4>>(c4.evaluate(input));
			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<Error, Output>): MonadicPromise<Either<Error | E2 | E3 | E4, [Output, O2, O3, O4]>> => x.match(
					(error: Error) => new MonadicPromise(Promise.resolve(new Left<Error | E2 | E3 | E4, [Output, O2, O3, O4]>(error) as Either<Error | E2 | E3 | E4, [Output, O2, O3, O4]>)),
					(output: Output) => {
						const mappedOutput = monadicOutputPromise2.flatMap(
							(x2: Either<E2, O2>): MonadicPromise<Either<Error | E2 | E3 | E4, [Output, O2, O3, O4]>> => x2.match(
								(error: E2) => new MonadicPromise(Promise.resolve(new Left<Error | E2 | E3 | E4, [Output, O2, O3, O4]>(error) as Either<Error | E2 | E3 | E4, [Output, O2, O3, O4]>)),
								(output2: O2) => {
									const mappedOutput2 = monadicOutputPromise3.flatMap(
										(x3: Either<E3, O3>): MonadicPromise<Either<Error | E2 | E3 | E4, [Output, O2, O3, O4]>> => x3.match(
											(error: E3) => new MonadicPromise(Promise.resolve(new Left<Error | E2 | E3 | E4, [Output, O2, O3, O4]>(error) as Either<Error | E2 | E3 | E4, [Output, O2, O3, O4]>)),
											(output3: O3) => {
												const mappedOutput3 = monadicOutputPromise4.map(
													(x4: Either<E4, O4>): Either<Error | E2 | E3 | E4, [Output, O2, O3, O4]> => x4.match<Either<Error | E2 | E3 | E4, [Output, O2, O3, O4]>>(
														(error: E4) => new Left<Error | E2 | E3 | E4, [Output, O2, O3, O4]>(error),
														(output4: O4) => new Right<Error | E2 | E3 | E4, [Output, O2, O3, O4]>([output, output2, output3, output4]),
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

		return new AsyncComputation<Input, Error | E2 | E3 | E4, [Output, O2, O3, O4]>(evaluate);
	}

	zip4<O2, O3, O4, O5>(
		c2: AsyncComputation<Input, Error, O2>,
		c3: AsyncComputation<Input, Error, O3>,
		c4: AsyncComputation<Input, Error, O4>,
		c5: AsyncComputation<Input, Error, O5>,
	): AsyncComputation<Input, Error, [Output, O2, O3, O4, O5]> {
		const evaluate = async (input: Input): Promise<Either<Error, [Output, O2, O3, O4, O5]>> => {
			const monadicOutputPromise = new MonadicPromise<Either<Error, Output>>(this.evaluate(input));
			const monadicOutputPromise2 = new MonadicPromise<Either<Error, O2>>(c2.evaluate(input));
			const monadicOutputPromise3 = new MonadicPromise<Either<Error, O3>>(c3.evaluate(input));
			const monadicOutputPromise4 = new MonadicPromise<Either<Error, O4>>(c4.evaluate(input));
			const monadicOutputPromise5 = new MonadicPromise<Either<Error, O5>>(c5.evaluate(input));
			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<Error, Output>): MonadicPromise<Either<Error, [Output, O2, O3, O4, O5]>> => x.match(
					(error: Error) => new MonadicPromise(Promise.resolve(new Left<Error, [Output, O2, O3, O4, O5]>(error) as Either<Error, [Output, O2, O3, O4, O5]>)),
					(output: Output) => {
						const mappedOutput = monadicOutputPromise2.flatMap(
							(x2: Either<Error, O2>): MonadicPromise<Either<Error, [Output, O2, O3, O4, O5]>> => x2.match(
								(error: Error) => new MonadicPromise(Promise.resolve(new Left<Error, [Output, O2, O3, O4, O5]>(error) as Either<Error, [Output, O2, O3, O4, O5]>)),
								(output2: O2) => {
									const mappedOutput2 = monadicOutputPromise3.flatMap(
										(x3: Either<Error, O3>): MonadicPromise<Either<Error, [Output, O2, O3, O4, O5]>> => x3.match(
											(error: Error) => new MonadicPromise(Promise.resolve(new Left<Error, [Output, O2, O3, O4, O5]>(error) as Either<Error, [Output, O2, O3, O4, O5]>)),
											(output3: O3) => {
												const mapped = monadicOutputPromise4.flatMap(
													(x4: Either<Error, O4>): MonadicPromise<Either<Error, [Output, O2, O3, O4, O5]>> => x4.match(
														(error: Error) => new MonadicPromise(Promise.resolve(new Left<Error, [Output, O2, O3, O4, O5]>(error) as Either<Error, [Output, O2, O3, O4, O5]>)),
														(output4: O4) => {
															const mappedOutput4 = monadicOutputPromise5.map(
																(x5: Either<Error, O5>): Either<Error, [Output, O2, O3, O4, O5]> => x5.match<Either<Error, [Output, O2, O3, O4, O5]>>(
																	(error: Error) => new Left<Error, [Output, O2, O3, O4, O5]>(error),
																	(output5: O5) => new Right<Error, [Output, O2, O3, O4, O5]>([output, output2, output3, output4, output5]),
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

		return new AsyncComputation<Input, Error, [Output, O2, O3, O4, O5]>(evaluate);
	}

	zip4WithNewErrors<E2, E3, E4, E5, O2, O3, O4, O5>(
		c2: AsyncComputation<Input, E2, O2>,
		c3: AsyncComputation<Input, E3, O3>,
		c4: AsyncComputation<Input, E4, O4>,
		c5: AsyncComputation<Input, E5, O5>,
	): AsyncComputation<Input, Error | E2 | E3 | E4 | E5, [Output, O2, O3, O4, O5]> {
		const evaluate = async (input: Input): Promise<Either<Error | E2 | E3 | E4 | E5, [Output, O2, O3, O4, O5]>> => {
			const monadicOutputPromise = new MonadicPromise<Either<Error, Output>>(this.evaluate(input));
			const monadicOutputPromise2 = new MonadicPromise<Either<E2, O2>>(c2.evaluate(input));
			const monadicOutputPromise3 = new MonadicPromise<Either<E3, O3>>(c3.evaluate(input));
			const monadicOutputPromise4 = new MonadicPromise<Either<E4, O4>>(c4.evaluate(input));
			const monadicOutputPromise5 = new MonadicPromise<Either<E5, O5>>(c5.evaluate(input));
			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<Error, Output>): MonadicPromise<Either<Error | E2 | E3 | E4 | E5, [Output, O2, O3, O4, O5]>> => x.match(
					(error: Error) => new MonadicPromise(Promise.resolve(new Left<Error | E2 | E3 | E4 | E5, [Output, O2, O3, O4, O5]>(error) as Either<Error | E2 | E3 | E4 | E5, [Output, O2, O3, O4, O5]>)),
					(output: Output) => {
						const mappedOutput = monadicOutputPromise2.flatMap(
							(x2: Either<E2, O2>): MonadicPromise<Either<Error | E2 | E3 | E4 | E5, [Output, O2, O3, O4, O5]>> => x2.match(
								(error: E2) => new MonadicPromise(Promise.resolve(new Left<Error | E2 | E3 | E4 | E5, [Output, O2, O3, O4, O5]>(error) as Either<Error | E2 | E3 | E4 | E5, [Output, O2, O3, O4, O5]>)),
								(output2: O2) => {
									const mappedOutput2 = monadicOutputPromise3.flatMap(
										(x3: Either<E3, O3>): MonadicPromise<Either<Error | E2 | E3 | E4 | E5, [Output, O2, O3, O4, O5]>> => x3.match(
											(error: E3) => new MonadicPromise(Promise.resolve(new Left<Error | E2 | E3 | E4 | E5, [Output, O2, O3, O4, O5]>(error) as Either<Error | E2 | E3 | E4 | E5, [Output, O2, O3, O4, O5]>)),
											(output3: O3) => {
												const mapped = monadicOutputPromise4.flatMap(
													(x4: Either<E4, O4>): MonadicPromise<Either<Error | E2 | E3 | E4 | E5, [Output, O2, O3, O4, O5]>> => x4.match(
														(error: E4) => new MonadicPromise(Promise.resolve(new Left<Error | E2 | E3 | E4 | E5, [Output, O2, O3, O4, O5]>(error) as Either<Error | E2 | E3 | E4 | E5, [Output, O2, O3, O4, O5]>)),
														(output4: O4) => {
															const mappedOutput4 = monadicOutputPromise5.map(
																(x5: Either<E5, O5>): Either<Error | E2 | E3 | E4 | E5, [Output, O2, O3, O4, O5]> => x5.match<Either<Error | E2 | E3 | E4 | E5, [Output, O2, O3, O4, O5]>>(
																	(error: E5) => new Left<Error | E2 | E3 | E4 | E5, [Output, O2, O3, O4, O5]>(error),
																	(output5: O5) => new Right<Error | E2 | E3 | E4 | E5, [Output, O2, O3, O4, O5]>([output, output2, output3, output4, output5]),
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

		return new AsyncComputation<Input, Error | E2 | E3 | E4 | E5, [Output, O2, O3, O4, O5]>(evaluate);
	}

	zip5<O2, O3, O4, O5, O6>(
		c2: AsyncComputation<Input, Error, O2>,
		c3: AsyncComputation<Input, Error, O3>,
		c4: AsyncComputation<Input, Error, O4>,
		c5: AsyncComputation<Input, Error, O5>,
		c6: AsyncComputation<Input, Error, O6>,
	): AsyncComputation<Input, Error, [Output, O2, O3, O4, O5, O6]> {
		const evaluate = async (input: Input): Promise<Either<Error, [Output, O2, O3, O4, O5, O6]>> => {
			const monadicOutputPromise = new MonadicPromise<Either<Error, Output>>(this.evaluate(input));
			const monadicOutputPromise2 = new MonadicPromise<Either<Error, O2>>(c2.evaluate(input));
			const monadicOutputPromise3 = new MonadicPromise<Either<Error, O3>>(c3.evaluate(input));
			const monadicOutputPromise4 = new MonadicPromise<Either<Error, O4>>(c4.evaluate(input));
			const monadicOutputPromise5 = new MonadicPromise<Either<Error, O5>>(c5.evaluate(input));
			const monadicOutputPromise6 = new MonadicPromise<Either<Error, O6>>(c6.evaluate(input));
			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<Error, Output>): MonadicPromise<Either<Error, [Output, O2, O3, O4, O5, O6]>> => x.match(
					(error: Error) => new MonadicPromise(Promise.resolve(new Left<Error, [Output, O2, O3, O4, O5, O6]>(error) as Either<Error, [Output, O2, O3, O4, O5, O6]>)),
					(output: Output) => {
						const mappedOutput = monadicOutputPromise2.flatMap(
							(x2: Either<Error, O2>): MonadicPromise<Either<Error, [Output, O2, O3, O4, O5, O6]>> => x2.match(
								(error: Error) => new MonadicPromise(Promise.resolve(new Left<Error, [Output, O2, O3, O4, O5, O6]>(error) as Either<Error, [Output, O2, O3, O4, O5, O6]>)),
								(output2: O2) => {
									const mappedOutput2 = monadicOutputPromise3.flatMap(
										(x3: Either<Error, O3>): MonadicPromise<Either<Error, [Output, O2, O3, O4, O5, O6]>> => x3.match(
											(error: Error) => new MonadicPromise(Promise.resolve(new Left<Error, [Output, O2, O3, O4, O5, O6]>(error) as Either<Error, [Output, O2, O3, O4, O5, O6]>)),
											(output3: O3) => {
												const mapped = monadicOutputPromise4.flatMap(
													(x4: Either<Error, O4>): MonadicPromise<Either<Error, [Output, O2, O3, O4, O5, O6]>> => x4.match(
														(error: Error) => new MonadicPromise(Promise.resolve(new Left<Error, [Output, O2, O3, O4, O5, O6]>(error) as Either<Error, [Output, O2, O3, O4, O5, O6]>)),
														(output4: O4) => {
															const mapped = monadicOutputPromise5.flatMap(
																(x5: Either<Error, O5>): MonadicPromise<Either<Error, [Output, O2, O3, O4, O5, O6]>> => x5.match(
																	(error: Error) => new MonadicPromise(Promise.resolve(new Left<Error, [Output, O2, O3, O4, O5, O6]>(error) as Either<Error, [Output, O2, O3, O4, O5, O6]>)),
																	(output5: O5) => {
																		const mappedOutput5 = monadicOutputPromise6.map(
																			(x6: Either<Error, O6>): Either<Error, [Output, O2, O3, O4, O5, O6]> => x6.match<Either<Error, [Output, O2, O3, O4, O5, O6]>>(
																				(error: Error) => new Left<Error, [Output, O2, O3, O4, O5, O6]>(error),
																				(output6: O6) => new Right<Error, [Output, O2, O3, O4, O5, O6]>([output, output2, output3, output4, output5, output6]),
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

		return new AsyncComputation<Input, Error, [Output, O2, O3, O4, O5, O6]>(evaluate);
	}

	zip5WithNewErrors<E2, E3, E4, E5, E6, O2, O3, O4, O5, O6>(
		c2: AsyncComputation<Input, E2, O2>,
		c3: AsyncComputation<Input, E3, O3>,
		c4: AsyncComputation<Input, E4, O4>,
		c5: AsyncComputation<Input, E5, O5>,
		c6: AsyncComputation<Input, E6, O6>,
	): AsyncComputation<Input, Error | E2 | E3 | E4 | E5 | E6, [Output, O2, O3, O4, O5, O6]> {
		const evaluate = async (input: Input): Promise<Either<Error | E2 | E3 | E4 | E5 | E6, [Output, O2, O3, O4, O5, O6]>> => {
			const monadicOutputPromise = new MonadicPromise<Either<Error, Output>>(this.evaluate(input));
			const monadicOutputPromise2 = new MonadicPromise<Either<E2, O2>>(c2.evaluate(input));
			const monadicOutputPromise3 = new MonadicPromise<Either<E3, O3>>(c3.evaluate(input));
			const monadicOutputPromise4 = new MonadicPromise<Either<E4, O4>>(c4.evaluate(input));
			const monadicOutputPromise5 = new MonadicPromise<Either<E5, O5>>(c5.evaluate(input));
			const monadicOutputPromise6 = new MonadicPromise<Either<E6, O6>>(c6.evaluate(input));
			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<Error, Output>): MonadicPromise<Either<Error | E2 | E3 | E4 | E5 | E6, [Output, O2, O3, O4, O5, O6]>> => x.match(
					(error: Error) => new MonadicPromise(Promise.resolve(new Left<Error | E2 | E3 | E4 | E5 | E6, [Output, O2, O3, O4, O5, O6]>(error) as Either<Error | E2 | E3 | E4 | E5 | E6, [Output, O2, O3, O4, O5, O6]>)),
					(output: Output) => {
						const mappedOutput = monadicOutputPromise2.flatMap(
							(x2: Either<E2, O2>): MonadicPromise<Either<Error | E2 | E3 | E4 | E5 | E6, [Output, O2, O3, O4, O5, O6]>> => x2.match(
								(error: E2) => new MonadicPromise(Promise.resolve(new Left<Error | E2 | E3 | E4 | E5 | E6, [Output, O2, O3, O4, O5, O6]>(error) as Either<Error | E2 | E3 | E4 | E5 | E6, [Output, O2, O3, O4, O5, O6]>)),
								(output2: O2) => {
									const mappedOutput2 = monadicOutputPromise3.flatMap(
										(x3: Either<E3, O3>): MonadicPromise<Either<Error | E2 | E3 | E4 | E5 | E6, [Output, O2, O3, O4, O5, O6]>> => x3.match(
											(error: E3) => new MonadicPromise(Promise.resolve(new Left<Error | E2 | E3 | E4 | E5 | E6, [Output, O2, O3, O4, O5, O6]>(error) as Either<Error | E2 | E3 | E4 | E5 | E6, [Output, O2, O3, O4, O5, O6]>)),
											(output3: O3) => {
												const mapped = monadicOutputPromise4.flatMap(
													(x4: Either<E4, O4>): MonadicPromise<Either<Error | E2 | E3 | E4 | E5 | E6, [Output, O2, O3, O4, O5, O6]>> => x4.match(
														(error: E4) => new MonadicPromise(Promise.resolve(new Left<Error | E2 | E3 | E4 | E5 | E6, [Output, O2, O3, O4, O5, O6]>(error) as Either<Error | E2 | E3 | E4 | E5 | E6, [Output, O2, O3, O4, O5, O6]>)),
														(output4: O4) => {
															const mapped = monadicOutputPromise5.flatMap(
																(x5: Either<E5, O5>): MonadicPromise<Either<Error | E2 | E3 | E4 | E5 | E6, [Output, O2, O3, O4, O5, O6]>> => x5.match(
																	(error: E5) => new MonadicPromise(Promise.resolve(new Left<Error | E2 | E3 | E4 | E5 | E6, [Output, O2, O3, O4, O5, O6]>(error) as Either<Error | E2 | E3 | E4 | E5 | E6, [Output, O2, O3, O4, O5, O6]>)),
																	(output5: O5) => {
																		const mapped = monadicOutputPromise6.flatMap(
																			(x6: Either<E6, O6>): MonadicPromise<Either<Error | E2 | E3 | E4 | E5 | E6, [Output, O2, O3, O4, O5, O6]>> => x6.match(
																				(error: E6) => new MonadicPromise(Promise.resolve(new Left<Error | E2 | E3 | E4 | E5 | E6, [Output, O2, O3, O4, O5, O6]>(error) as Either<Error | E2 | E3 | E4 | E5 | E6, [Output, O2, O3, O4, O5, O6]>)),
																				(output6: O6) => new MonadicPromise(Promise.resolve(new Right<Error | E2 | E3 | E4 | E5 | E6, [Output, O2, O3, O4, O5, O6]>([output, output2, output3, output4, output5, output6]))),
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

		return new AsyncComputation<Input, Error | E2 | E3 | E4 | E5 | E6, [Output, O2, O3, O4, O5, O6]>(evaluate);
	}

	zip6<O2, O3, O4, O5, O6, O7>(
		c2: AsyncComputation<Input, Error, O2>,
		c3: AsyncComputation<Input, Error, O3>,
		c4: AsyncComputation<Input, Error, O4>,
		c5: AsyncComputation<Input, Error, O5>,
		c6: AsyncComputation<Input, Error, O6>,
		c7: AsyncComputation<Input, Error, O7>,
	): AsyncComputation<Input, Error, [Output, O2, O3, O4, O5, O6, O7]> {
		const evaluate = async (input: Input): Promise<Either<Error, [Output, O2, O3, O4, O5, O6, O7]>> => {
			const monadicOutputPromise = new MonadicPromise<Either<Error, Output>>(this.evaluate(input));
			const monadicOutputPromise2 = new MonadicPromise<Either<Error, O2>>(c2.evaluate(input));
			const monadicOutputPromise3 = new MonadicPromise<Either<Error, O3>>(c3.evaluate(input));
			const monadicOutputPromise4 = new MonadicPromise<Either<Error, O4>>(c4.evaluate(input));
			const monadicOutputPromise5 = new MonadicPromise<Either<Error, O5>>(c5.evaluate(input));
			const monadicOutputPromise6 = new MonadicPromise<Either<Error, O6>>(c6.evaluate(input));
			const monadicOutputPromise7 = new MonadicPromise<Either<Error, O7>>(c7.evaluate(input));
			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<Error, Output>): MonadicPromise<Either<Error, [Output, O2, O3, O4, O5, O6, O7]>> => x.match(
					(error: Error) => new MonadicPromise(Promise.resolve(new Left<Error, [Output, O2, O3, O4, O5, O6, O7]>(error) as Either<Error, [Output, O2, O3, O4, O5, O6, O7]>)),
					(output: Output) => {
						const mappedOutputPromise2 = monadicOutputPromise2.flatMap(
							(x2: Either<Error, O2>): MonadicPromise<Either<Error, [Output, O2, O3, O4, O5, O6, O7]>> => x2.match(
								(error: Error) => new MonadicPromise(Promise.resolve(new Left<Error, [Output, O2, O3, O4, O5, O6, O7]>(error) as Either<Error, [Output, O2, O3, O4, O5, O6, O7]>)),
								(output2: O2) => {
									const mappedOutputPromise3 = monadicOutputPromise3.flatMap(
										(x3: Either<Error, O3>): MonadicPromise<Either<Error, [Output, O2, O3, O4, O5, O6, O7]>> => x3.match(
											(error: Error) => new MonadicPromise(Promise.resolve(new Left<Error, [Output, O2, O3, O4, O5, O6, O7]>(error) as Either<Error, [Output, O2, O3, O4, O5, O6, O7]>)),
											(output3: O3) => {
												const mappedOutputPromise4 = monadicOutputPromise4.flatMap(
													(x4: Either<Error, O4>): MonadicPromise<Either<Error, [Output, O2, O3, O4, O5, O6, O7]>> => x4.match(
														(error: Error) => new MonadicPromise(Promise.resolve(new Left<Error, [Output, O2, O3, O4, O5, O6, O7]>(error) as Either<Error, [Output, O2, O3, O4, O5, O6, O7]>)),
														(output4: O4) => {
															const mappedOutputPromise5 = monadicOutputPromise5.flatMap(
																(x5: Either<Error, O5>): MonadicPromise<Either<Error, [Output, O2, O3, O4, O5, O6, O7]>> => x5.match(
																	(error: Error) => new MonadicPromise(Promise.resolve(new Left<Error, [Output, O2, O3, O4, O5, O6, O7]>(error) as Either<Error, [Output, O2, O3, O4, O5, O6, O7]>)),
																	(output5: O5) => {
																		const mappedOutputPromise6 = monadicOutputPromise6.flatMap(
																			(x6: Either<Error, O6>): MonadicPromise<Either<Error, [Output, O2, O3, O4, O5, O6, O7]>> => x6.match(
																				(error: Error) => new MonadicPromise(Promise.resolve(new Left<Error, [Output, O2, O3, O4, O5, O6, O7]>(error) as Either<Error, [Output, O2, O3, O4, O5, O6, O7]>)),
																				(output6: O6) => {
																					const mappedOutputPromise7 = monadicOutputPromise7.flatMap(
																						(x7: Either<Error, O7>): MonadicPromise<Either<Error, [Output, O2, O3, O4, O5, O6, O7]>> => x7.match(
																							(error: Error) => new MonadicPromise(Promise.resolve(new Left<Error, [Output, O2, O3, O4, O5, O6, O7]>(error) as Either<Error, [Output, O2, O3, O4, O5, O6, O7]>)),
																							(output7: O7) => new MonadicPromise(Promise.resolve(new Right<Error, [Output, O2, O3, O4, O5, O6, O7]>([output, output2, output3, output4, output5, output6, output7]))),
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

		return new AsyncComputation<Input, Error, [Output, O2, O3, O4, O5, O6, O7]>(evaluate);
	}

	zip6WithNewErrors<E2, E3, E4, E5, E6, E7, O2, O3, O4, O5, O6, O7>(
		c2: AsyncComputation<Input, E2, O2>,
		c3: AsyncComputation<Input, E3, O3>,
		c4: AsyncComputation<Input, E4, O4>,
		c5: AsyncComputation<Input, E5, O5>,
		c6: AsyncComputation<Input, E6, O6>,
		c7: AsyncComputation<Input, E7, O7>,
	): AsyncComputation<Input, Error | E2 | E3 | E4 | E5 | E6 | E7, [Output, O2, O3, O4, O5, O6, O7]> {
		const evaluate = async (input: Input): Promise<Either<Error | E2 | E3 | E4 | E5 | E6 | E7, [Output, O2, O3, O4, O5, O6, O7]>> => {
			const monadicOutputPromise = new MonadicPromise<Either<Error, Output>>(this.evaluate(input));
			const monadicOutputPromise2 = new MonadicPromise<Either<E2, O2>>(c2.evaluate(input));
			const monadicOutputPromise3 = new MonadicPromise<Either<E3, O3>>(c3.evaluate(input));
			const monadicOutputPromise4 = new MonadicPromise<Either<E4, O4>>(c4.evaluate(input));
			const monadicOutputPromise5 = new MonadicPromise<Either<E5, O5>>(c5.evaluate(input));
			const monadicOutputPromise6 = new MonadicPromise<Either<E6, O6>>(c6.evaluate(input));
			const monadicOutputPromise7 = new MonadicPromise<Either<E7, O7>>(c7.evaluate(input));

			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<Error, Output>): MonadicPromise<Either<Error | E2 | E3 | E4 | E5 | E6 | E7, [Output, O2, O3, O4, O5, O6, O7]>> => x.match(
					(error: Error) => new MonadicPromise(Promise.resolve(new Left<Error | E2 | E3 | E4 | E5 | E6 | E7, [Output, O2, O3, O4, O5, O6, O7]>(error) as Either<Error | E2 | E3 | E4 | E5 | E6 | E7, [Output, O2, O3, O4, O5, O6, O7]>)),
					(output: Output) => {
						const mappedOutputPromise2 = monadicOutputPromise2.flatMap(
							(x2: Either<E2, O2>): MonadicPromise<Either<Error | E2 | E3 | E4 | E5 | E6 | E7, [Output, O2, O3, O4, O5, O6, O7]>> => x2.match(
								(error: E2) => new MonadicPromise(Promise.resolve(new Left<Error | E2 | E3 | E4 | E5 | E6 | E7, [Output, O2, O3, O4, O5, O6, O7]>(error) as Either<Error | E2 | E3 | E4 | E5 | E6 | E7, [Output, O2, O3, O4, O5, O6, O7]>)),
								(output2: O2) => {
									const mappedOutputPromise3 = monadicOutputPromise3.flatMap(
										(x3: Either<E3, O3>): MonadicPromise<Either<Error | E2 | E3 | E4 | E5 | E6 | E7, [Output, O2, O3, O4, O5, O6, O7]>> => x3.match(
											(error: E3) => new MonadicPromise(Promise.resolve(new Left<Error | E2 | E3 | E4 | E5 | E6 | E7, [Output, O2, O3, O4, O5, O6, O7]>(error) as Either<Error | E2 | E3 | E4 | E5 | E6 | E7, [Output, O2, O3, O4, O5, O6, O7]>)),
											(output3: O3) => {
												const mappedOutputPromise4 = monadicOutputPromise4.flatMap(
													(x4: Either<E4, O4>): MonadicPromise<Either<Error | E2 | E3 | E4 | E5 | E6 | E7, [Output, O2, O3, O4, O5, O6, O7]>> => x4.match(
														(error: E4) => new MonadicPromise(Promise.resolve(new Left<Error | E2 | E3 | E4 | E5 | E6 | E7, [Output, O2, O3, O4, O5, O6, O7]>(error) as Either<Error | E2 | E3 | E4 | E5 | E6 | E7, [Output, O2, O3, O4, O5, O6, O7]>)),
														(output4: O4) => {
															const mappedOutputPromise5 = monadicOutputPromise5.flatMap(
																(x5: Either<E5, O5>): MonadicPromise<Either<Error | E2 | E3 | E4 | E5 | E6 | E7, [Output, O2, O3, O4, O5, O6, O7]>> => x5.match(
																	(error: E5) => new MonadicPromise(Promise.resolve(new Left<Error | E2 | E3 | E4 | E5 | E6 | E7, [Output, O2, O3, O4, O5, O6, O7]>(error) as Either<Error | E2 | E3 | E4 | E5 | E6 | E7, [Output, O2, O3, O4, O5, O6, O7]>)),
																	(output5: O5) => {
																		const mappedOutputPromise6 = monadicOutputPromise6.flatMap(
																			(x6: Either<E6, O6>): MonadicPromise<Either<Error | E2 | E3 | E4 | E5 | E6 | E7, [Output, O2, O3, O4, O5, O6, O7]>> => x6.match(
																				(error: E6) => new MonadicPromise(Promise.resolve(new Left<Error | E2 | E3 | E4 | E5 | E6 | E7, [Output, O2, O3, O4, O5, O6, O7]>(error) as Either<Error | E2 | E3 | E4 | E5 | E6 | E7, [Output, O2, O3, O4, O5, O6, O7]>)),
																				(output6: O6) => {
																					const mappedOutputPromise7 = monadicOutputPromise7.flatMap(
																						(x7: Either<E7, O7>): MonadicPromise<Either<Error | E2 | E3 | E4 | E5 | E6 | E7, [Output, O2, O3, O4, O5, O6, O7]>> => x7.match(
																							(error: E7) => new MonadicPromise(Promise.resolve(new Left<Error | E2 | E3 | E4 | E5 | E6 | E7, [Output, O2, O3, O4, O5, O6, O7]>(error) as Either<Error | E2 | E3 | E4 | E5 | E6 | E7, [Output, O2, O3, O4, O5, O6, O7]>)),
																							(output7: O7) => new MonadicPromise(Promise.resolve(new Right<Error | E2 | E3 | E4 | E5 | E6 | E7, [Output, O2, O3, O4, O5, O6, O7]>([output, output2, output3, output4, output5, output6, output7]))),
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

		return new AsyncComputation<Input, Error | E2 | E3 | E4 | E5 | E6 | E7, [Output, O2, O3, O4, O5, O6, O7]>(evaluate);
	}

	zipN<O2>(...others: Array<AsyncComputation<Input, Error, O2>>): AsyncComputation<Input, Error, [Output, ...O2[]]> {
		const evaluate = async (input: Input): Promise<Either<Error, [Output, ...O2[]]>> => {
			const thisPromise = this.evaluate(input);
			const promises = others.map(async (other: AsyncComputation<Input, Error, O2>) => other.evaluate(input));
			const all = await Promise.all([thisPromise, ...promises]);
			const errors = all.filter((x: Either<Error, Output | O2>) => x.isLeft());
			if (errors.length > 0) {
				return new Left(errors[0].get() as Error);
			}

			return new Right(all.map((x: Either<Error, Output | O2>) => x.get() as Output | O2) as [Output, ...O2[]]);
		};

		return new AsyncComputation<Input, Error, [Output, ...O2[]]>(evaluate);
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	zipNWithNewErrors<E2, O2>(...others: Array<AsyncComputation<Input, E2, O2>>): AsyncComputation<Input, Error | E2, [Output, ...O2[]]> {
		const evaluate = async (input: Input): Promise<Either<Error | E2, [Output, ...O2[]]>> => {
			const thisPromise = this.evaluate(input);
			const promises = others.map(async (other: AsyncComputation<Input, E2, O2>) => other.evaluate(input));
			const all = await Promise.all([thisPromise, ...promises]);
			const errors = all.filter((x: Either<Error | E2, Output | O2>) => x.isLeft());
			if (errors.length > 0) {
				return new Left(errors[0].get() as Error | E2);
			}

			return new Right(all.map((x: Either<Error | E2, Output | O2>) => x.get() as Output | O2) as [Output, ...O2[]]);
		};

		return new AsyncComputation<Input, Error | E2, [Output, ...O2[]]>(evaluate);
	}
}
