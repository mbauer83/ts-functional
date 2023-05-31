/* eslint-disable max-nested-callbacks */
import {type ContravariantFunctor} from './Contravariant.js';
import {type Either, Right, Left} from './Either.js';
import {IO} from './IO.js';
import {type Monad} from './Monad.js';
import {type Task} from './Task.js';

export class Computation<in Input, out Error, out Output> implements Monad<Output>, ContravariantFunctor<Input> {
	constructor(public readonly evaluate: (input: Input) => Either<Error, Output>) {}

	thenDo<O2>(f: (x: Output) => O2): Computation<Input, Error, O2> {
		const evaluate = (input: Input) => {
			const either = this.evaluate(input);
			if (either.isLeft()) {
				return new Left<Error, O2>(either.get());
			}

			return new Right<Error, O2>(f(either.get() as Output));
		};

		return new Computation<Input, Error, O2>(evaluate);
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	thenDoIO<O2>(io: IO<O2>): IO<O2> {
		const resolver = (input: Input) => {
			this.evaluate(input);
			return io.evaluate();
		};

		return new IO(resolver);
	}

	thenDoWithNewError<E2, O2>(f: (x: Output) => Either<E2, O2>): Computation<Input, Error | E2, O2> {
		const evaluate = (input: Input) => {
			const either = this.evaluate(input);
			if (either.isLeft()) {
				return new Left<Error | E2, O2>(either.get());
			}

			return f(either.get() as Output);
		};

		return new Computation<Input, Error | E2, O2>(evaluate);
	}

	thenDoTask<E2, O2>(task: Task<E2, O2>): Computation<Input, Error | E2, O2> {
		const evaluate = (input: Input) => {
			const either = this.evaluate(input);
			if (either.isLeft()) {
				return new Left<Error | E2, O2>(either.get());
			}

			return task.evaluate();
		};

		return new Computation<Input, Error | E2, O2>(evaluate);
	}

	thenDoWithSameInputAndNewError<E2, O2>(f: (input: Input) => Either<E2, O2>): Computation<Input, Error | E2, O2> {
		const evaluate = (input: Input) => {
			const either = this.evaluate(input);
			if (either.isLeft()) {
				return new Left<Error | E2, O2>(either.get());
			}

			return f(input);
		};

		return new Computation<Input, Error | E2, O2>(evaluate);
	}

	thenDoComputationWithSameInput<E2, O2>(c: Computation<Input, E2, O2>): Computation<Input, Error | E2, O2> {
		const evaluate = (input: Input) => {
			const either = this.evaluate(input);
			if (either.isLeft()) {
				return new Left<Error | E2, O2>(either.get());
			}

			return c.evaluate(input);
		};

		return new Computation<Input, Error | E2, O2>(evaluate);
	}

	thenDoWithNewInputAndError<I2, E2, O2>(f: (input: I2) => Either<E2, O2>): Computation<{i1: Input; i2: I2}, Error | E2, O2> {
		const evaluate = ({i1, i2}: {i1: Input; i2: I2}) => {
			const either = this.evaluate(i1);
			if (either.isLeft()) {
				return new Left<Error | E2, O2>(either.get());
			}

			return f(i2);
		};

		return new Computation<{i1: Input; i2: I2}, Error | E2, O2>(evaluate);
	}

	thenDoComputation<I2, E2, O2>(c: Computation<I2, E2, O2>): Computation<{i1: Input; i2: I2}, Error | E2, O2> {
		const evaluate = ({i1, i2}: {i1: Input; i2: I2}) => {
			const either = this.evaluate(i1);
			if (either.isLeft()) {
				return new Left<Error | E2, O2>(either.get());
			}

			return c.evaluate(i2);
		};

		return new Computation<{i1: Input; i2: I2}, Error | E2, O2>(evaluate);
	}

	map<Output2>(f: (x: Output) => Output2): Computation<Input, Error, Output2> {
		const evaluate = (input: Input) => this.map(f).evaluate(input);
		return new Computation<Input, Error, Output2>(evaluate);
	}

	mapWithNewError<Error2, Output2>(f: (x: Output) => Either<Error2, Output2>): Computation<Input, Error | Error2, Output2> {
		const evaluate = (input: Input) => this.mapWithNewError(f).evaluate(input);
		return new Computation<Input, Error | Error2, Output2>(evaluate);
	}

	contramap<PreInput>(f: (x: PreInput) => Input): Computation<PreInput, Error, Output> {
		const evaluate = (input: PreInput) => this.evaluate(f(input));
		return new Computation<PreInput, Error, Output>(evaluate);
	}

	contramapWithNewError<PreInput, Error2>(f: (x: PreInput) => Either<Error2, Input>): Computation<PreInput, Error | Error2, Output> {
		const evaluate = (input: PreInput) => {
			const either = f(input);
			return either.flatMap(i => this.evaluate(i));
		};

		return new Computation<PreInput, Error | Error2, Output>(evaluate);
	}

	apply<Output2>(f: Computation<Input, Error, ((x: Output) => Output2)>): Computation<Input, Error, Output2> {
		const evaluate = (input: Input) => {
			const either = this.evaluate(input);
			return either.flatMap(output => f.map(g => g(output)).evaluate(input));
		};

		return new Computation<Input, Error, Output2>(evaluate);
	}

	pure<Output2>(x: Output2): Computation<any, undefined, Output2> {
		const evaluate = () => new Right<undefined, Output2>(x);
		return new Computation<any, undefined, Output2>(evaluate);
	}

	flatMap<Output2>(f: (x: Output) => Computation<Input, Error, Output2>): Computation<Input, Error, Output2> {
		const evaluate = (input: Input) => {
			const either = this.evaluate(input);
			return either.flatMap(output => f(output).evaluate(input));
		};

		return new Computation<Input, Error, Output2>(evaluate);
	}

	flatMapWithNewError<Error2, Output2>(f: (x: Output) => Computation<Input, Error2, Output2>): Computation<Input, Error | Error2, Output2> {
		const evaluate = (input: Input) => {
			const either = this.evaluate(input);
			return either.flatMap(output => f(output).evaluate(input));
		};

		return new Computation<Input, Error | Error2, Output2>(evaluate);
	}

	zip<Output2>(other: Computation<Input, Error, Output2>): Computation<Input, Error, [Output, Output2]> {
		const evaluate = (input: Input): Either<Error, [Output, Output2]> => {
			const either = this.evaluate(input);
			return either.flatMap(output => other.evaluate(input).map(output2 => [output, output2]));
		};

		return new Computation<Input, Error, [Output, Output2]>(evaluate);
	}

	zipWithNewError<Error2, Output2>(other: Computation<Input, Error2, Output2>): Computation<Input, Error | Error2, [Output, Output2]> {
		const evaluate = (input: Input): Either<Error | Error2, [Output, Output2]> => {
			const either = this.evaluate(input);
			return either.flatMap(output => other.evaluate(input).map(output2 => [output, output2]));
		};

		return new Computation<Input, Error | Error2, [Output, Output2]>(evaluate);
	}

	zip2<Output2, Output3>(
		other1: Computation<Input, Error, Output2>,
		other2: Computation<Input, Error, Output3>,
	): Computation<Input, Error, [Output, Output2, Output3]> {
		const evaluate = (input: Input): Either<Error, [Output, Output2, Output3]> => {
			const either = this.evaluate(input);
			return either.flatMap(output => other1.evaluate(input).flatMap(output2 => other2.evaluate(input).map(output3 => [output, output2, output3])));
		};

		return new Computation<Input, Error, [Output, Output2, Output3]>(evaluate);
	}

	zip2WithNewErrors<Error2, Error3, Output2, Output3>(
		other1: Computation<Input, Error2, Output2>,
		other2: Computation<Input, Error3, Output3>,
	): Computation<Input, Error | Error2 | Error3, [Output, Output2, Output3]> {
		const evaluate = (input: Input): Either<Error | Error2 | Error3, [Output, Output2, Output3]> => {
			const either = this.evaluate(input);
			return either.flatMap(output => other1.evaluate(input).flatMap(output2 => other2.evaluate(input).map(output3 => [output, output2, output3])));
		};

		return new Computation<Input, Error | Error2 | Error3, [Output, Output2, Output3]>(evaluate);
	}

	zip3<Output2, Output3, Output4>(
		other1: Computation<Input, Error, Output2>,
		other2: Computation<Input, Error, Output3>,
		other3: Computation<Input, Error, Output4>,
	): Computation<Input, Error, [Output, Output2, Output3, Output4]> {
		const evaluate = (input: Input): Either<Error, [Output, Output2, Output3, Output4]> => {
			const either = this.evaluate(input);
			return either.flatMap(
				output => other1.evaluate(input).flatMap(
					output2 => other2.evaluate(input).flatMap(
						output3 => other3.evaluate(input).map(
							output4 => [output, output2, output3, output4],
						),
					),
				),
			);
		};

		return new Computation<Input, Error, [Output, Output2, Output3, Output4]>(evaluate);
	}

	zip3WithNewErrors<
		Error2,
		Error3,
		Error4,
		Output2,
		Output3,
		Output4>(
		other1: Computation<Input, Error2, Output2>,
		other2: Computation<Input, Error3, Output3>,
		other3: Computation<Input, Error4, Output4>,
	): Computation<Input, Error | Error2 | Error3 | Error4, [Output, Output2, Output3, Output4]> {
		const evaluate = (input: Input): Either<Error | Error2 | Error3 | Error4, [Output, Output2, Output3, Output4]> => {
			const either = this.evaluate(input);
			return either.flatMap(
				output => other1.evaluate(input).flatMap(
					output2 => other2.evaluate(input).flatMap(
						output3 => other3.evaluate(input).map(
							output4 => [output, output2, output3, output4],
						),
					),
				),
			);
		};

		return new Computation<Input, Error | Error2 | Error3 | Error4, [Output, Output2, Output3, Output4]>(evaluate);
	}

	zip4<
		Output2,
		Output3,
		Output4,
		Output5>(
		other1: Computation<Input, Error, Output2>,
		other2: Computation<Input, Error, Output3>,
		other3: Computation<Input, Error, Output4>,
		other4: Computation<Input, Error, Output5>,
	): Computation<Input, Error, [Output, Output2, Output3, Output4, Output5]> {
		const evaluate = (input: Input): Either<Error, [Output, Output2, Output3, Output4, Output5]> => {
			const either = this.evaluate(input);
			return either.flatMap(
				output => other1.evaluate(input).flatMap(
					output2 => other2.evaluate(input).flatMap(
						output3 => other3.evaluate(input).flatMap(
							output4 => other4.evaluate(input).map(
								output5 => [output, output2, output3, output4, output5],
							),
						),
					),
				),
			);
		};

		return new Computation<Input, Error, [Output, Output2, Output3, Output4, Output5]>(evaluate);
	}

	zip4WithNewErrors<
		Error2,
		Error3,
		Error4,
		Error5,
		Output2,
		Output3,
		Output4,
		Output5>(
		other1: Computation<Input, Error2, Output2>,
		other2: Computation<Input, Error3, Output3>,
		other3: Computation<Input, Error4, Output4>,
		other4: Computation<Input, Error5, Output5>,
	): Computation<Input, Error | Error2 | Error3 | Error4 | Error5, [Output, Output2, Output3, Output4, Output5]> {
		const evaluate = (input: Input): Either<Error | Error2 | Error3 | Error4 | Error5, [Output, Output2, Output3, Output4, Output5]> => {
			const either = this.evaluate(input);
			return either.flatMap(
				output => other1.evaluate(input).flatMap(
					output2 => other2.evaluate(input).flatMap(
						output3 => other3.evaluate(input).flatMap(
							output4 => other4.evaluate(input).map(
								output5 => [output, output2, output3, output4, output5],
							),
						),
					),
				),
			);
		};

		return new Computation<Input, Error | Error2 | Error3 | Error4 | Error5, [Output, Output2, Output3, Output4, Output5]>(evaluate);
	}

	zip5<
		Output2,
		Output3,
		Output4,
		Output5,
		Output6>(
		other1: Computation<Input, Error, Output2>,
		other2: Computation<Input, Error, Output3>,
		other3: Computation<Input, Error, Output4>,
		other4: Computation<Input, Error, Output5>,
		other5: Computation<Input, Error, Output6>,
	): Computation<Input, Error, [Output, Output2, Output3, Output4, Output5, Output6]> {
		const evaluate = (input: Input): Either<Error, [Output, Output2, Output3, Output4, Output5, Output6]> => {
			const either = this.evaluate(input);
			return either.flatMap(
				output => other1.evaluate(input).flatMap(
					output2 => other2.evaluate(input).flatMap(
						output3 => other3.evaluate(input).flatMap(
							output4 => other4.evaluate(input).flatMap(
								output5 => other5.evaluate(input).map(
									output6 => [output, output2, output3, output4, output5, output6],
								),
							),
						),
					),
				),
			);
		};

		return new Computation<Input, Error, [Output, Output2, Output3, Output4, Output5, Output6]>(evaluate);
	}

	zip5WithNewErrors<
		Error2,
		Error3,
		Error4,
		Error5,
		Error6,
		Output2,
		Output3,
		Output4,
		Output5,
		Output6>(
		other1: Computation<Input, Error2, Output2>,
		other2: Computation<Input, Error3, Output3>,
		other3: Computation<Input, Error4, Output4>,
		other4: Computation<Input, Error5, Output5>,
		other5: Computation<Input, Error6, Output6>,
	): Computation<Input, Error | Error2 | Error3 | Error4 | Error5 | Error6, [Output, Output2, Output3, Output4, Output5, Output6]> {
		const evaluate = (input: Input): Either<Error | Error2 | Error3 | Error4 | Error5 | Error6, [Output, Output2, Output3, Output4, Output5, Output6]> => {
			const either = this.evaluate(input);
			return either.flatMap(
				output => other1.evaluate(input).flatMap(
					output2 => other2.evaluate(input).flatMap(
						output3 => other3.evaluate(input).flatMap(
							output4 => other4.evaluate(input).flatMap(
								output5 => other5.evaluate(input).map(
									output6 => [output, output2, output3, output4, output5, output6],
								),
							),
						),
					),
				),
			);
		};

		return new Computation<Input, Error | Error2 | Error3 | Error4 | Error5 | Error6, [Output, Output2, Output3, Output4, Output5, Output6]>(evaluate);
	}

	zip6<
		Output2,
		Output3,
		Output4,
		Output5,
		Output6,
		Output7>(
		other1: Computation<Input, Error, Output2>,
		other2: Computation<Input, Error, Output3>,
		other3: Computation<Input, Error, Output4>,
		other4: Computation<Input, Error, Output5>,
		other5: Computation<Input, Error, Output6>,
		other6: Computation<Input, Error, Output7>,
	): Computation<Input, Error, [Output, Output2, Output3, Output4, Output5, Output6, Output7]> {
		const evaluate = (input: Input): Either<Error, [Output, Output2, Output3, Output4, Output5, Output6, Output7]> => {
			const either = this.evaluate(input);
			return either.flatMap(
				output => other1.evaluate(input).flatMap(
					output2 => other2.evaluate(input).flatMap(
						output3 => other3.evaluate(input).flatMap(
							output4 => other4.evaluate(input).flatMap(
								output5 => other5.evaluate(input).flatMap(
									output6 => other6.evaluate(input).map(
										output7 => [output, output2, output3, output4, output5, output6, output7],
									),
								),
							),
						),
					),
				),
			);
		};

		return new Computation<Input, Error, [Output, Output2, Output3, Output4, Output5, Output6, Output7]>(evaluate);
	}

	zip6WithNewErrors<
		Error2,
		Error3,
		Error4,
		Error5,
		Error6,
		Error7,
		Output2,
		Output3,
		Output4,
		Output5,
		Output6,
		Output7>(
		other1: Computation<Input, Error2, Output2>,
		other2: Computation<Input, Error3, Output3>,
		other3: Computation<Input, Error4, Output4>,
		other4: Computation<Input, Error5, Output5>,
		other5: Computation<Input, Error6, Output6>,
		other6: Computation<Input, Error7, Output7>,
	): Computation<Input, Error | Error2 | Error3 | Error4 | Error5 | Error6 | Error7, [Output, Output2, Output3, Output4, Output5, Output6, Output7]> {
		const evaluate = (input: Input): Either<Error | Error2 | Error3 | Error4 | Error5 | Error6 | Error7, [Output, Output2, Output3, Output4, Output5, Output6, Output7]> => {
			const either = this.evaluate(input);
			return either.flatMap(
				output => other1.evaluate(input).flatMap(
					output2 => other2.evaluate(input).flatMap(
						output3 => other3.evaluate(input).flatMap(
							output4 => other4.evaluate(input).flatMap(
								output5 => other5.evaluate(input).flatMap(
									output6 => other6.evaluate(input).map(
										output7 => [output, output2, output3, output4, output5, output6, output7],
									),
								),
							),
						),
					),
				),
			);
		};

		return new Computation<Input, Error | Error2 | Error3 | Error4 | Error5 | Error6 | Error7, [Output, Output2, Output3, Output4, Output5, Output6, Output7]>(evaluate);
	}

	zipN<Output2>(...us: Array<Computation<Input, Error, Output2>>): Computation<Input, Error, [Output, ...Output2[]]> {
		const evaluate = (input: Input): Either<Error, [Output, ...Output2[]]> => {
			const ownOutput = this.evaluate(input);
			if (ownOutput.isLeft()) {
				return ownOutput.map(output => [output]) as Either<Error, [Output, ...Output2[]]>;
			}

			const otherOutputs = us.map(u => u.evaluate(input));
			const ownOutputValue = ownOutput.get() as Output;
			const allOutputValues: [Output, ...Output2[]] = [ownOutputValue];
			for (const otherOutput of otherOutputs) {
				if (otherOutput.isLeft()) {
					return otherOutput as Either<Error, [Output, ...Output2[]]>;
				}

				allOutputValues.push(otherOutput.get() as Output2);
			}

			return new Right(allOutputValues as [Output, ...Output2[]]);
		};

		return new Computation<Input, Error, [Output, ...Output2[]]>(evaluate);
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	zipNWithNewErrors<Error2, Output2>(...others: Array<Computation<Input, Error2, Output2>>): Computation<Input, Error | Error2, [Output, ...Output2[]]> {
		const evaluate = (input: Input): Either<Error | Error2, [Output, ...Output2[]]> => {
			const ownOutput = this.evaluate(input);
			if (ownOutput.isLeft()) {
				return ownOutput.map(output => [output]) as Either<Error | Error2, [Output, ...Output2[]]>;
			}

			const otherOutputs = others.map(u => u.evaluate(input));
			const ownOutputValue = ownOutput.get() as Output;
			const allOutputValues: [Output, ...Output2[]] = [ownOutputValue];
			for (const otherOutput of otherOutputs) {
				if (otherOutput.isLeft()) {
					return otherOutput as Either<Error | Error2, [Output, ...Output2[]]>;
				}

				allOutputValues.push(otherOutput.get() as Output2);
			}

			return new Right(allOutputValues as [Output, ...Output2[]]);
		};

		return new Computation<Input, Error | Error2, [Output, ...Output2[]]>(evaluate);
	}
}
