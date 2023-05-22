/* eslint-disable max-nested-callbacks */
import {type AsyncIO} from './AsyncIO';
import {type AsyncTask} from './AsyncTask';
import {type AsyncContravariantFunctor} from './Contravariant';
import {type Either, Left, Right} from './Either';
import {type AsyncMonad} from './Monad';
import {MonadicPromise} from './MonadicPromise';

export class AsyncComputation<I, E, O> implements AsyncMonad<O>, AsyncContravariantFunctor<I> {
	constructor(public readonly evaluate: (input: I) => Promise<Either<E, O>>) {}

	thenDo<O2>(f: (..._: any[]) => Promise<O2>): AsyncComputation<I, E, O2> {
		const evaluate = async (input: I): Promise<Either<E, O2>> => {
			const thisOutput = await this.evaluate(input);
			if (thisOutput.isLeft()) {
				return new Left<E, O2>(thisOutput.get());
			}

			const ioOutput = await f();
			return new Right<E, O2>(ioOutput);
		};

		return new AsyncComputation<I, E, O2>(evaluate);
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	thenDoIO<O2>(io: AsyncIO<O2>): AsyncComputation<I, E, O2> {
		const evaluate = async (input: I): Promise<Either<E, O2>> => {
			const thisOutput = await this.evaluate(input);
			if (thisOutput.isLeft()) {
				return new Left<E, O2>(thisOutput.get());
			}

			const ioOutput = await io.evaluate();
			return new Right<E, O2>(ioOutput);
		};

		return new AsyncComputation<I, E, O2>(evaluate);
	}

	thenDoWithNewError<E2, O2>(f: (..._: any[]) => Promise<Either<E2, O2>>): AsyncComputation<I, E | E2, O2> {
		const evaluate = async (input: I): Promise<Either<E | E2, O2>> => {
			const thisOutput = await this.evaluate(input);
			if (thisOutput.isLeft()) {
				return new Left<E | E2, O2>(thisOutput.get());
			}

			const ioOutput = await f();
			return ioOutput;
		};

		return new AsyncComputation<I, E | E2, O2>(evaluate);
	}

	thenDoTask<E2, O2>(task: AsyncTask<E2, O2>): AsyncComputation<I, E | E2, O2> {
		const evaluate = async (input: I): Promise<Either<E | E2, O2>> => {
			const thisOutput = await this.evaluate(input);
			if (thisOutput.isLeft()) {
				return new Left<E | E2, O2>(thisOutput.get());
			}

			const ioOutput = await task.evaluate();
			return ioOutput;
		};

		return new AsyncComputation<I, E | E2, O2>(evaluate);
	}

	thenDoWithNewInputAndError<I2, E2, O2>(f: (input: I2) => Promise<Either<E2, O2>>): AsyncComputation<{i1: I; i2: I2}, E | E2, O2> {
		const evaluate = async ({i1, i2}: {i1: I; i2: I2}): Promise<Either<E | E2, O2>> => {
			const thisOutput = await this.evaluate(i1);
			if (thisOutput.isLeft()) {
				return new Left<E | E2, O2>(thisOutput.get());
			}

			const ioOutput = await f(i2);
			return ioOutput;
		};

		return new AsyncComputation<{i1: I; i2: I2}, E | E2, O2>(evaluate);
	}

	thenDoComputation<I2, E2, O2>(computation: AsyncComputation<I2, E2, O2>): AsyncComputation<{i1: I; i2: I2}, E | E2, O2> {
		const evaluate = async ({i1, i2}: {i1: I; i2: I2}): Promise<Either<E | E2, O2>> => {
			const thisOutput = await this.evaluate(i1);
			if (thisOutput.isLeft()) {
				return new Left<E | E2, O2>(thisOutput.get());
			}

			const ioOutput = await computation.evaluate(i2);
			return ioOutput;
		};

		return new AsyncComputation<{i1: I; i2: I2}, E | E2, O2>(evaluate);
	}

	contramap<I2>(f: (input: I2) => Promise<I>): AsyncComputation<I2, E, O> {
		const evaluate = async (input: I2): Promise<Either<E, O>> => {
			const i = await f(input);
			return this.evaluate(i);
		};

		return new AsyncComputation<I2, E, O>(evaluate);
	}

	map<O2>(f: (output: O) => Promise<O2>): AsyncComputation<I, E, O2> {
		const evaluate = async (input: I): Promise<Either<E, O2>> => {
			const monadicOutputPromise = new MonadicPromise<Either<E, O>>(this.evaluate(input));
			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<E, O>): MonadicPromise<Either<E, O2>> => x.match(
					(error: E) => new MonadicPromise(Promise.resolve(new Left<E, O2>(error) as Either<E, O2>)),
					(output: O) => {
						const mappedOutput = new MonadicPromise<O2>(f(output));
						return mappedOutput.map((o: O2): Either<E, O2> => new Right<E, O2>(o));
					},
				),
			);
			return mappedPromise.promise;
		};

		return new AsyncComputation<I, E, O2>(evaluate);
	}

	apply<U>(f: AsyncComputation<I, E, (output: O) => Promise<U>>): AsyncComputation<I, E, U> {
		const evaluate = async (input: I): Promise<Either<E, U>> => {
			const monadicOutputPromise = new MonadicPromise<Either<E, O>>(this.evaluate(input));
			const monadicF = new MonadicPromise<Either<E, (output: O) => Promise<U>>>(f.evaluate(input));
			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<E, O>): MonadicPromise<Either<E, U>> => x.match(
					(error: E) => new MonadicPromise(Promise.resolve(new Left<E, U>(error) as Either<E, U>)),
					(output: O) => {
						const mappedF = monadicF.flatMap(
							either => either.match(
								(error: E) => new MonadicPromise(Promise.resolve(new Left<E, U>(error) as Either<E, U>)),
								(f: (output: O) => Promise<U>) => {
									const fMappedOutput = new MonadicPromise<U>(f(output));
									const mappedOutput = fMappedOutput.map((o: U): Either<E, U> => new Right<E, U>(o));
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

		return new AsyncComputation<I, E, U>(evaluate);
	}

	pure<U>(x: Promise<U>): AsyncComputation<any, undefined, U> {
		const evaluate = async (_: any): Promise<Either<undefined, U>> => {
			const mappedOutput = new MonadicPromise<U>(x);
			return mappedOutput.map((o: U): Either<undefined, U> => new Right<undefined, U>(o)).promise;
		};

		return new AsyncComputation<any, undefined, U>(evaluate);
	}

	flatMap<U>(f: (output: O) => AsyncComputation<I, E, U>): AsyncComputation<I, E, U> {
		const evaluate = async (input: I): Promise<Either<E, U>> => {
			const monadicOutputPromise = new MonadicPromise<Either<E, O>>(this.evaluate(input));
			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<E, O>): MonadicPromise<Either<E, U>> => x.match(
					(error: E) => new MonadicPromise(Promise.resolve(new Left<E, U>(error) as Either<E, U>)),
					(output: O) => new MonadicPromise(f(output).evaluate(input)),
				),
			);
			return mappedPromise.promise;
		};

		return new AsyncComputation<I, E, U>(evaluate);
	}

	zip<U>(c2: AsyncComputation<I, E, U>): AsyncComputation<I, E, [O, U]> {
		const evaluate = async (input: I): Promise<Either<E, [O, U]>> => {
			const monadicOutputPromise = new MonadicPromise<Either<E, O>>(this.evaluate(input));
			const monadicOutputPromise2 = new MonadicPromise<Either<E, U>>(c2.evaluate(input));
			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<E, O>): MonadicPromise<Either<E, [O, U]>> => x.match(
					(error: E) => new MonadicPromise(Promise.resolve(new Left<E, [O, U]>(error) as Either<E, [O, U]>)),
					(output: O) => {
						const mappedOutput = monadicOutputPromise2.map(
							(either: Either<E, U>): Either<E, [O, U]> => either.match<Either<E, [O, U]>>(
								(error: E) => new Left<E, [O, U]>(error),
								(output2: U) => new Right<E, [O, U]>([output, output2]),
							),
						);
						return mappedOutput;
					},
				),
			);
			return mappedPromise.promise;
		};

		return new AsyncComputation<I, E, [O, U]>(evaluate);
	}

	zipWithNewError<E2, O2>(c2: AsyncComputation<I, E2, O2>): AsyncComputation<I, E | E2, [O, O2]> {
		const evaluate = async (input: I): Promise<Either<E | E2, [O, O2]>> => {
			const monadicOutputPromise = new MonadicPromise<Either<E, O>>(this.evaluate(input));
			const monadicOutputPromise2 = new MonadicPromise<Either<E2, O2>>(c2.evaluate(input));
			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<E, O>): MonadicPromise<Either<E | E2, [O, O2]>> => x.match(
					(error: E) => new MonadicPromise(Promise.resolve(new Left<E | E2, [O, O2]>(error) as Either<E | E2, [O, O2]>)),
					(output: O) => {
						const mappedOutput = monadicOutputPromise2.map(
							(either: Either<E2, O2>): Either<E | E2, [O, O2]> => either.match<Either<E | E2, [O, O2]>>(
								(error: E2) => new Left<E | E2, [O, O2]>(error),
								(output2: O2) => new Right<E | E2, [O, O2]>([output, output2]),
							),
						);
						return mappedOutput;
					},
				),
			);
			return mappedPromise.promise;
		};

		return new AsyncComputation<I, E | E2, [O, O2]>(evaluate);
	}

	zip2<O2, O3>(
		c2: AsyncComputation<I, E, O2>,
		c3: AsyncComputation<I, E, O3>,
	): AsyncComputation<I, E, [O, O2, O3]> {
		const evaluate = async (input: I): Promise<Either<E, [O, O2, O3]>> => {
			const monadicOutputPromise = new MonadicPromise<Either<E, O>>(this.evaluate(input));
			const monadicOutputPromise2 = new MonadicPromise<Either<E, O2>>(c2.evaluate(input));
			const monadicOutputPromise3 = new MonadicPromise<Either<E, O3>>(c3.evaluate(input));
			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<E, O>): MonadicPromise<Either<E, [O, O2, O3]>> => x.match(
					(error: E) => new MonadicPromise(Promise.resolve(new Left<E, [O, O2, O3]>(error) as Either<E, [O, O2, O3]>)),
					(output: O) => {
						const mappedOutput = monadicOutputPromise2.flatMap(
							(x2: Either<E, O2>): MonadicPromise<Either<E, [O, O2, O3]>> => x2.match(
								(error: E) => new MonadicPromise(Promise.resolve(new Left<E, [O, O2, O3]>(error) as Either<E, [O, O2, O3]>)),
								(output2: O2) => {
									const mappedOutput2 = monadicOutputPromise3.map(
										(x3: Either<E, O3>): Either<E, [O, O2, O3]> => x3.match<Either<E, [O, O2, O3]>>(
											(error: E) => new Left<E, [O, O2, O3]>(error),
											(output3: O3) => new Right<E, [O, O2, O3]>([output, output2, output3]),
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

		return new AsyncComputation<I, E, [O, O2, O3]>(evaluate);
	}

	zip2WithNewErrors<E2, E3, O2, O3>(
		c2: AsyncComputation<I, E2, O2>,
		c3: AsyncComputation<I, E3, O3>,
	): AsyncComputation<I, E | E2 | E3, [O, O2, O3]> {
		const evaluate = async (input: I): Promise<Either<E | E2 | E3, [O, O2, O3]>> => {
			const monadicOutputPromise = new MonadicPromise<Either<E, O>>(this.evaluate(input));
			const monadicOutputPromise2 = new MonadicPromise<Either<E2, O2>>(c2.evaluate(input));
			const monadicOutputPromise3 = new MonadicPromise<Either<E3, O3>>(c3.evaluate(input));
			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<E, O>): MonadicPromise<Either<E | E2 | E3, [O, O2, O3]>> => x.match(
					(error: E) => new MonadicPromise(Promise.resolve(new Left<E | E2 | E3, [O, O2, O3]>(error) as Either<E | E2 | E3, [O, O2, O3]>)),
					(output: O) => {
						const mappedOutput = monadicOutputPromise2.flatMap(
							(x2: Either<E2, O2>): MonadicPromise<Either<E | E2 | E3, [O, O2, O3]>> => x2.match(
								(error: E2) => new MonadicPromise(Promise.resolve(new Left<E | E2 | E3, [O, O2, O3]>(error) as Either<E | E2 | E3, [O, O2, O3]>)),
								(output2: O2) => {
									const mappedOutput2 = monadicOutputPromise3.map(
										(x3: Either<E3, O3>): Either<E | E2 | E3, [O, O2, O3]> => x3.match<Either<E | E2 | E3, [O, O2, O3]>>(
											(error: E3) => new Left<E | E2 | E3, [O, O2, O3]>(error),
											(output3: O3) => new Right<E | E2 | E3, [O, O2, O3]>([output, output2, output3]),
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

		return new AsyncComputation<I, E | E2 | E3, [O, O2, O3]>(evaluate);
	}

	zip3<O2, O3, O4>(
		c2: AsyncComputation<I, E, O2>,
		c3: AsyncComputation<I, E, O3>,
		c4: AsyncComputation<I, E, O4>,
	): AsyncComputation<I, E, [O, O2, O3, O4]> {
		const evaluate = async (input: I): Promise<Either<E, [O, O2, O3, O4]>> => {
			const monadicOutputPromise = new MonadicPromise<Either<E, O>>(this.evaluate(input));
			const monadicOutputPromise2 = new MonadicPromise<Either<E, O2>>(c2.evaluate(input));
			const monadicOutputPromise3 = new MonadicPromise<Either<E, O3>>(c3.evaluate(input));
			const monadicOutputPromise4 = new MonadicPromise<Either<E, O4>>(c4.evaluate(input));
			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<E, O>): MonadicPromise<Either<E, [O, O2, O3, O4]>> => x.match(
					(error: E) => new MonadicPromise(Promise.resolve(new Left<E, [O, O2, O3, O4]>(error) as Either<E, [O, O2, O3, O4]>)),
					(output: O) => {
						const mappedOutput = monadicOutputPromise2.flatMap(
							(x2: Either<E, O2>): MonadicPromise<Either<E, [O, O2, O3, O4]>> => x2.match(
								(error: E) => new MonadicPromise(Promise.resolve(new Left<E, [O, O2, O3, O4]>(error) as Either<E, [O, O2, O3, O4]>)),
								(output2: O2) => {
									const mappedOutput2 = monadicOutputPromise3.flatMap(
										(x3: Either<E, O3>): MonadicPromise<Either<E, [O, O2, O3, O4]>> => x3.match(
											(error: E) => new MonadicPromise(Promise.resolve(new Left<E, [O, O2, O3, O4]>(error) as Either<E, [O, O2, O3, O4]>)),
											(output3: O3) => {
												const mappedOutput3 = monadicOutputPromise4.map(
													(x4: Either<E, O4>): Either<E, [O, O2, O3, O4]> => x4.match<Either<E, [O, O2, O3, O4]>>(
														(error: E) => new Left<E, [O, O2, O3, O4]>(error),
														(output4: O4) => new Right<E, [O, O2, O3, O4]>([output, output2, output3, output4]),
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

		return new AsyncComputation<I, E, [O, O2, O3, O4]>(evaluate);
	}

	zip3WithNewErrors<E2, E3, E4, O2, O3, O4>(
		c2: AsyncComputation<I, E2, O2>,
		c3: AsyncComputation<I, E3, O3>,
		c4: AsyncComputation<I, E4, O4>,
	): AsyncComputation<I, E | E2 | E3 | E4, [O, O2, O3, O4]> {
		const evaluate = async (input: I): Promise<Either<E | E2 | E3 | E4, [O, O2, O3, O4]>> => {
			const monadicOutputPromise = new MonadicPromise<Either<E, O>>(this.evaluate(input));
			const monadicOutputPromise2 = new MonadicPromise<Either<E2, O2>>(c2.evaluate(input));
			const monadicOutputPromise3 = new MonadicPromise<Either<E3, O3>>(c3.evaluate(input));
			const monadicOutputPromise4 = new MonadicPromise<Either<E4, O4>>(c4.evaluate(input));
			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<E, O>): MonadicPromise<Either<E | E2 | E3 | E4, [O, O2, O3, O4]>> => x.match(
					(error: E) => new MonadicPromise(Promise.resolve(new Left<E | E2 | E3 | E4, [O, O2, O3, O4]>(error) as Either<E | E2 | E3 | E4, [O, O2, O3, O4]>)),
					(output: O) => {
						const mappedOutput = monadicOutputPromise2.flatMap(
							(x2: Either<E2, O2>): MonadicPromise<Either<E | E2 | E3 | E4, [O, O2, O3, O4]>> => x2.match(
								(error: E2) => new MonadicPromise(Promise.resolve(new Left<E | E2 | E3 | E4, [O, O2, O3, O4]>(error) as Either<E | E2 | E3 | E4, [O, O2, O3, O4]>)),
								(output2: O2) => {
									const mappedOutput2 = monadicOutputPromise3.flatMap(
										(x3: Either<E3, O3>): MonadicPromise<Either<E | E2 | E3 | E4, [O, O2, O3, O4]>> => x3.match(
											(error: E3) => new MonadicPromise(Promise.resolve(new Left<E | E2 | E3 | E4, [O, O2, O3, O4]>(error) as Either<E | E2 | E3 | E4, [O, O2, O3, O4]>)),
											(output3: O3) => {
												const mappedOutput3 = monadicOutputPromise4.map(
													(x4: Either<E4, O4>): Either<E | E2 | E3 | E4, [O, O2, O3, O4]> => x4.match<Either<E | E2 | E3 | E4, [O, O2, O3, O4]>>(
														(error: E4) => new Left<E | E2 | E3 | E4, [O, O2, O3, O4]>(error),
														(output4: O4) => new Right<E | E2 | E3 | E4, [O, O2, O3, O4]>([output, output2, output3, output4]),
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

		return new AsyncComputation<I, E | E2 | E3 | E4, [O, O2, O3, O4]>(evaluate);
	}

	zip4<O2, O3, O4, O5>(
		c2: AsyncComputation<I, E, O2>,
		c3: AsyncComputation<I, E, O3>,
		c4: AsyncComputation<I, E, O4>,
		c5: AsyncComputation<I, E, O5>,
	): AsyncComputation<I, E, [O, O2, O3, O4, O5]> {
		const evaluate = async (input: I): Promise<Either<E, [O, O2, O3, O4, O5]>> => {
			const monadicOutputPromise = new MonadicPromise<Either<E, O>>(this.evaluate(input));
			const monadicOutputPromise2 = new MonadicPromise<Either<E, O2>>(c2.evaluate(input));
			const monadicOutputPromise3 = new MonadicPromise<Either<E, O3>>(c3.evaluate(input));
			const monadicOutputPromise4 = new MonadicPromise<Either<E, O4>>(c4.evaluate(input));
			const monadicOutputPromise5 = new MonadicPromise<Either<E, O5>>(c5.evaluate(input));
			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<E, O>): MonadicPromise<Either<E, [O, O2, O3, O4, O5]>> => x.match(
					(error: E) => new MonadicPromise(Promise.resolve(new Left<E, [O, O2, O3, O4, O5]>(error) as Either<E, [O, O2, O3, O4, O5]>)),
					(output: O) => {
						const mappedOutput = monadicOutputPromise2.flatMap(
							(x2: Either<E, O2>): MonadicPromise<Either<E, [O, O2, O3, O4, O5]>> => x2.match(
								(error: E) => new MonadicPromise(Promise.resolve(new Left<E, [O, O2, O3, O4, O5]>(error) as Either<E, [O, O2, O3, O4, O5]>)),
								(output2: O2) => {
									const mappedOutput2 = monadicOutputPromise3.flatMap(
										(x3: Either<E, O3>): MonadicPromise<Either<E, [O, O2, O3, O4, O5]>> => x3.match(
											(error: E) => new MonadicPromise(Promise.resolve(new Left<E, [O, O2, O3, O4, O5]>(error) as Either<E, [O, O2, O3, O4, O5]>)),
											(output3: O3) => {
												const mapped = monadicOutputPromise4.flatMap(
													(x4: Either<E, O4>): MonadicPromise<Either<E, [O, O2, O3, O4, O5]>> => x4.match(
														(error: E) => new MonadicPromise(Promise.resolve(new Left<E, [O, O2, O3, O4, O5]>(error) as Either<E, [O, O2, O3, O4, O5]>)),
														(output4: O4) => {
															const mappedOutput4 = monadicOutputPromise5.map(
																(x5: Either<E, O5>): Either<E, [O, O2, O3, O4, O5]> => x5.match<Either<E, [O, O2, O3, O4, O5]>>(
																	(error: E) => new Left<E, [O, O2, O3, O4, O5]>(error),
																	(output5: O5) => new Right<E, [O, O2, O3, O4, O5]>([output, output2, output3, output4, output5]),
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

		return new AsyncComputation<I, E, [O, O2, O3, O4, O5]>(evaluate);
	}

	zip4WithNewErrors<E2, E3, E4, E5, O2, O3, O4, O5>(
		c2: AsyncComputation<I, E2, O2>,
		c3: AsyncComputation<I, E3, O3>,
		c4: AsyncComputation<I, E4, O4>,
		c5: AsyncComputation<I, E5, O5>,
	): AsyncComputation<I, E | E2 | E3 | E4 | E5, [O, O2, O3, O4, O5]> {
		const evaluate = async (input: I): Promise<Either<E | E2 | E3 | E4 | E5, [O, O2, O3, O4, O5]>> => {
			const monadicOutputPromise = new MonadicPromise<Either<E, O>>(this.evaluate(input));
			const monadicOutputPromise2 = new MonadicPromise<Either<E2, O2>>(c2.evaluate(input));
			const monadicOutputPromise3 = new MonadicPromise<Either<E3, O3>>(c3.evaluate(input));
			const monadicOutputPromise4 = new MonadicPromise<Either<E4, O4>>(c4.evaluate(input));
			const monadicOutputPromise5 = new MonadicPromise<Either<E5, O5>>(c5.evaluate(input));
			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<E, O>): MonadicPromise<Either<E | E2 | E3 | E4 | E5, [O, O2, O3, O4, O5]>> => x.match(
					(error: E) => new MonadicPromise(Promise.resolve(new Left<E | E2 | E3 | E4 | E5, [O, O2, O3, O4, O5]>(error) as Either<E | E2 | E3 | E4 | E5, [O, O2, O3, O4, O5]>)),
					(output: O) => {
						const mappedOutput = monadicOutputPromise2.flatMap(
							(x2: Either<E2, O2>): MonadicPromise<Either<E | E2 | E3 | E4 | E5, [O, O2, O3, O4, O5]>> => x2.match(
								(error: E2) => new MonadicPromise(Promise.resolve(new Left<E | E2 | E3 | E4 | E5, [O, O2, O3, O4, O5]>(error) as Either<E | E2 | E3 | E4 | E5, [O, O2, O3, O4, O5]>)),
								(output2: O2) => {
									const mappedOutput2 = monadicOutputPromise3.flatMap(
										(x3: Either<E3, O3>): MonadicPromise<Either<E | E2 | E3 | E4 | E5, [O, O2, O3, O4, O5]>> => x3.match(
											(error: E3) => new MonadicPromise(Promise.resolve(new Left<E | E2 | E3 | E4 | E5, [O, O2, O3, O4, O5]>(error) as Either<E | E2 | E3 | E4 | E5, [O, O2, O3, O4, O5]>)),
											(output3: O3) => {
												const mapped = monadicOutputPromise4.flatMap(
													(x4: Either<E4, O4>): MonadicPromise<Either<E | E2 | E3 | E4 | E5, [O, O2, O3, O4, O5]>> => x4.match(
														(error: E4) => new MonadicPromise(Promise.resolve(new Left<E | E2 | E3 | E4 | E5, [O, O2, O3, O4, O5]>(error) as Either<E | E2 | E3 | E4 | E5, [O, O2, O3, O4, O5]>)),
														(output4: O4) => {
															const mappedOutput4 = monadicOutputPromise5.map(
																(x5: Either<E5, O5>): Either<E | E2 | E3 | E4 | E5, [O, O2, O3, O4, O5]> => x5.match<Either<E | E2 | E3 | E4 | E5, [O, O2, O3, O4, O5]>>(
																	(error: E5) => new Left<E | E2 | E3 | E4 | E5, [O, O2, O3, O4, O5]>(error),
																	(output5: O5) => new Right<E | E2 | E3 | E4 | E5, [O, O2, O3, O4, O5]>([output, output2, output3, output4, output5]),
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

		return new AsyncComputation<I, E | E2 | E3 | E4 | E5, [O, O2, O3, O4, O5]>(evaluate);
	}

	zip5<O2, O3, O4, O5, O6>(
		c2: AsyncComputation<I, E, O2>,
		c3: AsyncComputation<I, E, O3>,
		c4: AsyncComputation<I, E, O4>,
		c5: AsyncComputation<I, E, O5>,
		c6: AsyncComputation<I, E, O6>,
	): AsyncComputation<I, E, [O, O2, O3, O4, O5, O6]> {
		const evaluate = async (input: I): Promise<Either<E, [O, O2, O3, O4, O5, O6]>> => {
			const monadicOutputPromise = new MonadicPromise<Either<E, O>>(this.evaluate(input));
			const monadicOutputPromise2 = new MonadicPromise<Either<E, O2>>(c2.evaluate(input));
			const monadicOutputPromise3 = new MonadicPromise<Either<E, O3>>(c3.evaluate(input));
			const monadicOutputPromise4 = new MonadicPromise<Either<E, O4>>(c4.evaluate(input));
			const monadicOutputPromise5 = new MonadicPromise<Either<E, O5>>(c5.evaluate(input));
			const monadicOutputPromise6 = new MonadicPromise<Either<E, O6>>(c6.evaluate(input));
			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<E, O>): MonadicPromise<Either<E, [O, O2, O3, O4, O5, O6]>> => x.match(
					(error: E) => new MonadicPromise(Promise.resolve(new Left<E, [O, O2, O3, O4, O5, O6]>(error) as Either<E, [O, O2, O3, O4, O5, O6]>)),
					(output: O) => {
						const mappedOutput = monadicOutputPromise2.flatMap(
							(x2: Either<E, O2>): MonadicPromise<Either<E, [O, O2, O3, O4, O5, O6]>> => x2.match(
								(error: E) => new MonadicPromise(Promise.resolve(new Left<E, [O, O2, O3, O4, O5, O6]>(error) as Either<E, [O, O2, O3, O4, O5, O6]>)),
								(output2: O2) => {
									const mappedOutput2 = monadicOutputPromise3.flatMap(
										(x3: Either<E, O3>): MonadicPromise<Either<E, [O, O2, O3, O4, O5, O6]>> => x3.match(
											(error: E) => new MonadicPromise(Promise.resolve(new Left<E, [O, O2, O3, O4, O5, O6]>(error) as Either<E, [O, O2, O3, O4, O5, O6]>)),
											(output3: O3) => {
												const mapped = monadicOutputPromise4.flatMap(
													(x4: Either<E, O4>): MonadicPromise<Either<E, [O, O2, O3, O4, O5, O6]>> => x4.match(
														(error: E) => new MonadicPromise(Promise.resolve(new Left<E, [O, O2, O3, O4, O5, O6]>(error) as Either<E, [O, O2, O3, O4, O5, O6]>)),
														(output4: O4) => {
															const mapped = monadicOutputPromise5.flatMap(
																(x5: Either<E, O5>): MonadicPromise<Either<E, [O, O2, O3, O4, O5, O6]>> => x5.match(
																	(error: E) => new MonadicPromise(Promise.resolve(new Left<E, [O, O2, O3, O4, O5, O6]>(error) as Either<E, [O, O2, O3, O4, O5, O6]>)),
																	(output5: O5) => {
																		const mappedOutput5 = monadicOutputPromise6.map(
																			(x6: Either<E, O6>): Either<E, [O, O2, O3, O4, O5, O6]> => x6.match<Either<E, [O, O2, O3, O4, O5, O6]>>(
																				(error: E) => new Left<E, [O, O2, O3, O4, O5, O6]>(error),
																				(output6: O6) => new Right<E, [O, O2, O3, O4, O5, O6]>([output, output2, output3, output4, output5, output6]),
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

		return new AsyncComputation<I, E, [O, O2, O3, O4, O5, O6]>(evaluate);
	}

	zip5WithNewErrors<E2, E3, E4, E5, E6, O2, O3, O4, O5, O6>(
		c2: AsyncComputation<I, E2, O2>,
		c3: AsyncComputation<I, E3, O3>,
		c4: AsyncComputation<I, E4, O4>,
		c5: AsyncComputation<I, E5, O5>,
		c6: AsyncComputation<I, E6, O6>,
	): AsyncComputation<I, E | E2 | E3 | E4 | E5 | E6, [O, O2, O3, O4, O5, O6]> {
		const evaluate = async (input: I): Promise<Either<E | E2 | E3 | E4 | E5 | E6, [O, O2, O3, O4, O5, O6]>> => {
			const monadicOutputPromise = new MonadicPromise<Either<E, O>>(this.evaluate(input));
			const monadicOutputPromise2 = new MonadicPromise<Either<E2, O2>>(c2.evaluate(input));
			const monadicOutputPromise3 = new MonadicPromise<Either<E3, O3>>(c3.evaluate(input));
			const monadicOutputPromise4 = new MonadicPromise<Either<E4, O4>>(c4.evaluate(input));
			const monadicOutputPromise5 = new MonadicPromise<Either<E5, O5>>(c5.evaluate(input));
			const monadicOutputPromise6 = new MonadicPromise<Either<E6, O6>>(c6.evaluate(input));
			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<E, O>): MonadicPromise<Either<E | E2 | E3 | E4 | E5 | E6, [O, O2, O3, O4, O5, O6]>> => x.match(
					(error: E) => new MonadicPromise(Promise.resolve(new Left<E | E2 | E3 | E4 | E5 | E6, [O, O2, O3, O4, O5, O6]>(error) as Either<E | E2 | E3 | E4 | E5 | E6, [O, O2, O3, O4, O5, O6]>)),
					(output: O) => {
						const mappedOutput = monadicOutputPromise2.flatMap(
							(x2: Either<E2, O2>): MonadicPromise<Either<E | E2 | E3 | E4 | E5 | E6, [O, O2, O3, O4, O5, O6]>> => x2.match(
								(error: E2) => new MonadicPromise(Promise.resolve(new Left<E | E2 | E3 | E4 | E5 | E6, [O, O2, O3, O4, O5, O6]>(error) as Either<E | E2 | E3 | E4 | E5 | E6, [O, O2, O3, O4, O5, O6]>)),
								(output2: O2) => {
									const mappedOutput2 = monadicOutputPromise3.flatMap(
										(x3: Either<E3, O3>): MonadicPromise<Either<E | E2 | E3 | E4 | E5 | E6, [O, O2, O3, O4, O5, O6]>> => x3.match(
											(error: E3) => new MonadicPromise(Promise.resolve(new Left<E | E2 | E3 | E4 | E5 | E6, [O, O2, O3, O4, O5, O6]>(error) as Either<E | E2 | E3 | E4 | E5 | E6, [O, O2, O3, O4, O5, O6]>)),
											(output3: O3) => {
												const mapped = monadicOutputPromise4.flatMap(
													(x4: Either<E4, O4>): MonadicPromise<Either<E | E2 | E3 | E4 | E5 | E6, [O, O2, O3, O4, O5, O6]>> => x4.match(
														(error: E4) => new MonadicPromise(Promise.resolve(new Left<E | E2 | E3 | E4 | E5 | E6, [O, O2, O3, O4, O5, O6]>(error) as Either<E | E2 | E3 | E4 | E5 | E6, [O, O2, O3, O4, O5, O6]>)),
														(output4: O4) => {
															const mapped = monadicOutputPromise5.flatMap(
																(x5: Either<E5, O5>): MonadicPromise<Either<E | E2 | E3 | E4 | E5 | E6, [O, O2, O3, O4, O5, O6]>> => x5.match(
																	(error: E5) => new MonadicPromise(Promise.resolve(new Left<E | E2 | E3 | E4 | E5 | E6, [O, O2, O3, O4, O5, O6]>(error) as Either<E | E2 | E3 | E4 | E5 | E6, [O, O2, O3, O4, O5, O6]>)),
																	(output5: O5) => {
																		const mapped = monadicOutputPromise6.flatMap(
																			(x6: Either<E6, O6>): MonadicPromise<Either<E | E2 | E3 | E4 | E5 | E6, [O, O2, O3, O4, O5, O6]>> => x6.match(
																				(error: E6) => new MonadicPromise(Promise.resolve(new Left<E | E2 | E3 | E4 | E5 | E6, [O, O2, O3, O4, O5, O6]>(error) as Either<E | E2 | E3 | E4 | E5 | E6, [O, O2, O3, O4, O5, O6]>)),
																				(output6: O6) => new MonadicPromise(Promise.resolve(new Right<E | E2 | E3 | E4 | E5 | E6, [O, O2, O3, O4, O5, O6]>([output, output2, output3, output4, output5, output6]))),
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

		return new AsyncComputation<I, E | E2 | E3 | E4 | E5 | E6, [O, O2, O3, O4, O5, O6]>(evaluate);
	}

	zip6<O2, O3, O4, O5, O6, O7>(
		c2: AsyncComputation<I, E, O2>,
		c3: AsyncComputation<I, E, O3>,
		c4: AsyncComputation<I, E, O4>,
		c5: AsyncComputation<I, E, O5>,
		c6: AsyncComputation<I, E, O6>,
		c7: AsyncComputation<I, E, O7>,
	): AsyncComputation<I, E, [O, O2, O3, O4, O5, O6, O7]> {
		const evaluate = async (input: I): Promise<Either<E, [O, O2, O3, O4, O5, O6, O7]>> => {
			const monadicOutputPromise = new MonadicPromise<Either<E, O>>(this.evaluate(input));
			const monadicOutputPromise2 = new MonadicPromise<Either<E, O2>>(c2.evaluate(input));
			const monadicOutputPromise3 = new MonadicPromise<Either<E, O3>>(c3.evaluate(input));
			const monadicOutputPromise4 = new MonadicPromise<Either<E, O4>>(c4.evaluate(input));
			const monadicOutputPromise5 = new MonadicPromise<Either<E, O5>>(c5.evaluate(input));
			const monadicOutputPromise6 = new MonadicPromise<Either<E, O6>>(c6.evaluate(input));
			const monadicOutputPromise7 = new MonadicPromise<Either<E, O7>>(c7.evaluate(input));
			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<E, O>): MonadicPromise<Either<E, [O, O2, O3, O4, O5, O6, O7]>> => x.match(
					(error: E) => new MonadicPromise(Promise.resolve(new Left<E, [O, O2, O3, O4, O5, O6, O7]>(error) as Either<E, [O, O2, O3, O4, O5, O6, O7]>)),
					(output: O) => {
						const mappedOutputPromise2 = monadicOutputPromise2.flatMap(
							(x2: Either<E, O2>): MonadicPromise<Either<E, [O, O2, O3, O4, O5, O6, O7]>> => x2.match(
								(error: E) => new MonadicPromise(Promise.resolve(new Left<E, [O, O2, O3, O4, O5, O6, O7]>(error) as Either<E, [O, O2, O3, O4, O5, O6, O7]>)),
								(output2: O2) => {
									const mappedOutputPromise3 = monadicOutputPromise3.flatMap(
										(x3: Either<E, O3>): MonadicPromise<Either<E, [O, O2, O3, O4, O5, O6, O7]>> => x3.match(
											(error: E) => new MonadicPromise(Promise.resolve(new Left<E, [O, O2, O3, O4, O5, O6, O7]>(error) as Either<E, [O, O2, O3, O4, O5, O6, O7]>)),
											(output3: O3) => {
												const mappedOutputPromise4 = monadicOutputPromise4.flatMap(
													(x4: Either<E, O4>): MonadicPromise<Either<E, [O, O2, O3, O4, O5, O6, O7]>> => x4.match(
														(error: E) => new MonadicPromise(Promise.resolve(new Left<E, [O, O2, O3, O4, O5, O6, O7]>(error) as Either<E, [O, O2, O3, O4, O5, O6, O7]>)),
														(output4: O4) => {
															const mappedOutputPromise5 = monadicOutputPromise5.flatMap(
																(x5: Either<E, O5>): MonadicPromise<Either<E, [O, O2, O3, O4, O5, O6, O7]>> => x5.match(
																	(error: E) => new MonadicPromise(Promise.resolve(new Left<E, [O, O2, O3, O4, O5, O6, O7]>(error) as Either<E, [O, O2, O3, O4, O5, O6, O7]>)),
																	(output5: O5) => {
																		const mappedOutputPromise6 = monadicOutputPromise6.flatMap(
																			(x6: Either<E, O6>): MonadicPromise<Either<E, [O, O2, O3, O4, O5, O6, O7]>> => x6.match(
																				(error: E) => new MonadicPromise(Promise.resolve(new Left<E, [O, O2, O3, O4, O5, O6, O7]>(error) as Either<E, [O, O2, O3, O4, O5, O6, O7]>)),
																				(output6: O6) => {
																					const mappedOutputPromise7 = monadicOutputPromise7.flatMap(
																						(x7: Either<E, O7>): MonadicPromise<Either<E, [O, O2, O3, O4, O5, O6, O7]>> => x7.match(
																							(error: E) => new MonadicPromise(Promise.resolve(new Left<E, [O, O2, O3, O4, O5, O6, O7]>(error) as Either<E, [O, O2, O3, O4, O5, O6, O7]>)),
																							(output7: O7) => new MonadicPromise(Promise.resolve(new Right<E, [O, O2, O3, O4, O5, O6, O7]>([output, output2, output3, output4, output5, output6, output7]))),
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

		return new AsyncComputation<I, E, [O, O2, O3, O4, O5, O6, O7]>(evaluate);
	}

	zip6WithNewErrors<E2, E3, E4, E5, E6, E7, O2, O3, O4, O5, O6, O7>(
		c2: AsyncComputation<I, E2, O2>,
		c3: AsyncComputation<I, E3, O3>,
		c4: AsyncComputation<I, E4, O4>,
		c5: AsyncComputation<I, E5, O5>,
		c6: AsyncComputation<I, E6, O6>,
		c7: AsyncComputation<I, E7, O7>,
	): AsyncComputation<I, E | E2 | E3 | E4 | E5 | E6 | E7, [O, O2, O3, O4, O5, O6, O7]> {
		const evaluate = async (input: I): Promise<Either<E | E2 | E3 | E4 | E5 | E6 | E7, [O, O2, O3, O4, O5, O6, O7]>> => {
			const monadicOutputPromise = new MonadicPromise<Either<E, O>>(this.evaluate(input));
			const monadicOutputPromise2 = new MonadicPromise<Either<E2, O2>>(c2.evaluate(input));
			const monadicOutputPromise3 = new MonadicPromise<Either<E3, O3>>(c3.evaluate(input));
			const monadicOutputPromise4 = new MonadicPromise<Either<E4, O4>>(c4.evaluate(input));
			const monadicOutputPromise5 = new MonadicPromise<Either<E5, O5>>(c5.evaluate(input));
			const monadicOutputPromise6 = new MonadicPromise<Either<E6, O6>>(c6.evaluate(input));
			const monadicOutputPromise7 = new MonadicPromise<Either<E7, O7>>(c7.evaluate(input));

			const mappedPromise = monadicOutputPromise.flatMap(
				(x: Either<E, O>): MonadicPromise<Either<E | E2 | E3 | E4 | E5 | E6 | E7, [O, O2, O3, O4, O5, O6, O7]>> => x.match(
					(error: E) => new MonadicPromise(Promise.resolve(new Left<E | E2 | E3 | E4 | E5 | E6 | E7, [O, O2, O3, O4, O5, O6, O7]>(error) as Either<E | E2 | E3 | E4 | E5 | E6 | E7, [O, O2, O3, O4, O5, O6, O7]>)),
					(output: O) => {
						const mappedOutputPromise2 = monadicOutputPromise2.flatMap(
							(x2: Either<E2, O2>): MonadicPromise<Either<E | E2 | E3 | E4 | E5 | E6 | E7, [O, O2, O3, O4, O5, O6, O7]>> => x2.match(
								(error: E2) => new MonadicPromise(Promise.resolve(new Left<E | E2 | E3 | E4 | E5 | E6 | E7, [O, O2, O3, O4, O5, O6, O7]>(error) as Either<E | E2 | E3 | E4 | E5 | E6 | E7, [O, O2, O3, O4, O5, O6, O7]>)),
								(output2: O2) => {
									const mappedOutputPromise3 = monadicOutputPromise3.flatMap(
										(x3: Either<E3, O3>): MonadicPromise<Either<E | E2 | E3 | E4 | E5 | E6 | E7, [O, O2, O3, O4, O5, O6, O7]>> => x3.match(
											(error: E3) => new MonadicPromise(Promise.resolve(new Left<E | E2 | E3 | E4 | E5 | E6 | E7, [O, O2, O3, O4, O5, O6, O7]>(error) as Either<E | E2 | E3 | E4 | E5 | E6 | E7, [O, O2, O3, O4, O5, O6, O7]>)),
											(output3: O3) => {
												const mappedOutputPromise4 = monadicOutputPromise4.flatMap(
													(x4: Either<E4, O4>): MonadicPromise<Either<E | E2 | E3 | E4 | E5 | E6 | E7, [O, O2, O3, O4, O5, O6, O7]>> => x4.match(
														(error: E4) => new MonadicPromise(Promise.resolve(new Left<E | E2 | E3 | E4 | E5 | E6 | E7, [O, O2, O3, O4, O5, O6, O7]>(error) as Either<E | E2 | E3 | E4 | E5 | E6 | E7, [O, O2, O3, O4, O5, O6, O7]>)),
														(output4: O4) => {
															const mappedOutputPromise5 = monadicOutputPromise5.flatMap(
																(x5: Either<E5, O5>): MonadicPromise<Either<E | E2 | E3 | E4 | E5 | E6 | E7, [O, O2, O3, O4, O5, O6, O7]>> => x5.match(
																	(error: E5) => new MonadicPromise(Promise.resolve(new Left<E | E2 | E3 | E4 | E5 | E6 | E7, [O, O2, O3, O4, O5, O6, O7]>(error) as Either<E | E2 | E3 | E4 | E5 | E6 | E7, [O, O2, O3, O4, O5, O6, O7]>)),
																	(output5: O5) => {
																		const mappedOutputPromise6 = monadicOutputPromise6.flatMap(
																			(x6: Either<E6, O6>): MonadicPromise<Either<E | E2 | E3 | E4 | E5 | E6 | E7, [O, O2, O3, O4, O5, O6, O7]>> => x6.match(
																				(error: E6) => new MonadicPromise(Promise.resolve(new Left<E | E2 | E3 | E4 | E5 | E6 | E7, [O, O2, O3, O4, O5, O6, O7]>(error) as Either<E | E2 | E3 | E4 | E5 | E6 | E7, [O, O2, O3, O4, O5, O6, O7]>)),
																				(output6: O6) => {
																					const mappedOutputPromise7 = monadicOutputPromise7.flatMap(
																						(x7: Either<E7, O7>): MonadicPromise<Either<E | E2 | E3 | E4 | E5 | E6 | E7, [O, O2, O3, O4, O5, O6, O7]>> => x7.match(
																							(error: E7) => new MonadicPromise(Promise.resolve(new Left<E | E2 | E3 | E4 | E5 | E6 | E7, [O, O2, O3, O4, O5, O6, O7]>(error) as Either<E | E2 | E3 | E4 | E5 | E6 | E7, [O, O2, O3, O4, O5, O6, O7]>)),
																							(output7: O7) => new MonadicPromise(Promise.resolve(new Right<E | E2 | E3 | E4 | E5 | E6 | E7, [O, O2, O3, O4, O5, O6, O7]>([output, output2, output3, output4, output5, output6, output7]))),
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

		return new AsyncComputation<I, E | E2 | E3 | E4 | E5 | E6 | E7, [O, O2, O3, O4, O5, O6, O7]>(evaluate);
	}

	zipN<O2>(...others: Array<AsyncComputation<I, E, O2>>): AsyncComputation<I, E, [O, ...O2[]]> {
		const evaluate = async (input: I): Promise<Either<E, [O, ...O2[]]>> => {
			const thisPromise = this.evaluate(input);
			const promises = others.map(async (other: AsyncComputation<I, E, O2>) => other.evaluate(input));
			const all = await Promise.all([thisPromise, ...promises]);
			const errors = all.filter((x: Either<E, O | O2>) => x.isLeft());
			if (errors.length > 0) {
				return new Left(errors[0].get() as E);
			}

			return new Right(all.map((x: Either<E, O | O2>) => x.get() as O | O2) as [O, ...O2[]]);
		};

		return new AsyncComputation<I, E, [O, ...O2[]]>(evaluate);
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	zipNWithNewErrors<E2, O2>(...others: Array<AsyncComputation<I, E2, O2>>): AsyncComputation<I, E | E2, [O, ...O2[]]> {
		const evaluate = async (input: I): Promise<Either<E | E2, [O, ...O2[]]>> => {
			const thisPromise = this.evaluate(input);
			const promises = others.map(async (other: AsyncComputation<I, E2, O2>) => other.evaluate(input));
			const all = await Promise.all([thisPromise, ...promises]);
			const errors = all.filter((x: Either<E | E2, O | O2>) => x.isLeft());
			if (errors.length > 0) {
				return new Left(errors[0].get() as E | E2);
			}

			return new Right(all.map((x: Either<E | E2, O | O2>) => x.get() as O | O2) as [O, ...O2[]]);
		};

		return new AsyncComputation<I, E | E2, [O, ...O2[]]>(evaluate);
	}
}
