/* eslint-disable max-nested-callbacks */
import {Computation} from './Computation.js';
import {type Either, Right, Left} from './Either.js';
import {type Monad} from './Monad.js';

export class Task<E, O> implements Monad<O> {
	constructor(public readonly evaluate: (..._: any[]) => Either<E, O>) {}

	thenDo<O2>(f: (..._: any[]) => O2): Task<E, O2> {
		const resolver = (..._: any[]) => {
			const ownResult = this.evaluate();
			if (ownResult.isLeft()) {
				return new Left<E, O2>(ownResult.get());
			}

			return new Right<E, O2>(f());
		};

		return new Task(resolver);
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	thenDoIO<O2>(io: Task<E, O2>): Task<E, O2> {
		const resolver = (..._: any[]) => {
			this.evaluate();
			return io.evaluate();
		};

		return new Task(resolver);
	}

	thenDoWithNewError<E2, O2>(f: (..._: any[]) => Either<E2, O2>): Task<E | E2, O2> {
		const resolver = (..._: any[]) => {
			const ownResult = this.evaluate();
			if (ownResult.isLeft()) {
				return new Left<E | E2, O2>(ownResult.get());
			}

			return f();
		};

		return new Task(resolver);
	}

	thenDoTask<E2, O2>(task: Task<E2, O2>): Task<E | E2, O2> {
		const resolver = (..._: any[]) => {
			const ownResult = this.evaluate();
			if (ownResult.isLeft()) {
				return new Left<E | E2, O2>(ownResult.get());
			}

			return task.evaluate();
		};

		return new Task(resolver);
	}

	thenDoWithNewInputAndError<I, E2, O2>(
		f: (input: I) => Either<E2, O2>,
	): Computation<I, E | E2, O2> {
		const resolver = (input: I) => {
			const ownResult = this.evaluate();
			if (ownResult.isLeft()) {
				return new Left<E | E2, O2>(ownResult.get());
			}

			return f(input);
		};

		return new Computation(resolver);
	}

	thenDoComputation<I, E2, O2>(
		computation: Computation<I, E2, O2>,
	): Computation<I, E | E2, O2> {
		const resolver = (input: I) => {
			const ownResult = this.evaluate();
			if (ownResult.isLeft()) {
				return new Left<E | E2, O2>(ownResult.get());
			}

			return computation.evaluate(input);
		};

		return new Computation(resolver);
	}

	mapToComputation<I, E2, U>(f: (x: O) => (i: I) => Either<E | E2, U>): Computation<I, E | E2, U> {
		const evaluate = (i: I) => {
			const thisValue = this.evaluate();
			if (thisValue.isLeft()) {
				return thisValue as any as Either<E | E2, U>;
			}

			return f(thisValue.get() as O)(i);
		};

		return new Computation<I, E | E2, U>(evaluate);
	}

	map<Output2>(f: (output: O) => Output2): Task<E, Output2> {
		return new Task<E, Output2>(input => this.evaluate(input).map(o => f(o)));
	}

	apply<Output2>(f: Task<E, (x: O) => Output2>): Task<E, Output2> {
		return f.flatMap(g => this.map(g));
	}

	pure<Output2>(x: Output2): Task<E, Output2> {
		return new Task<E, Output2>(() => new Right<E, Output2>(x));
	}

	flatMap<Output2>(f: (x: O) => Task<E, Output2>): Task<E, Output2> {
		return new Task<E, Output2>(input => this.evaluate(input).flatMap(o => f(o).evaluate(input)));
	}

	zip<Output2>(other: Task<E, Output2>): Task<E, [O, Output2]> {
		const evaluate = (input: any): Either<E, [O, Output2]> => {
			const output = this.evaluate(input);
			const output2 = other.evaluate(input);

			return output.flatMap(o => output2.map(o2 => [o, o2]));
		};

		return new Task<E, [O, Output2]>(evaluate);
	}

	zipWithNewError<Error2, Output2>(
		other: Task<Error2, Output2>,
	): Task<E | Error2, [O, Output2]> {
		const evaluate = (input: any): Either<E | Error2, [O, Output2]> => {
			const output = this.evaluate(input);
			const output2 = other.evaluate(input);

			return output.flatMap(o => output2.map(o2 => [o, o2]));
		};

		return new Task<E | Error2, [O, Output2]>(evaluate);
	}

	zip2<Output2, Output3>(
		o2: Task<E, Output2>,
		o3: Task<E, Output3>,
	): Task<E, [O, Output2, Output3]> {
		const evaluate = (input: any): Either<E, [O, Output2, Output3]> => {
			const output = this.evaluate(input);
			const output2 = o2.evaluate(input);
			const output3 = o3.evaluate(input);

			return output.flatMap(o => output2.flatMap(o2 => output3.map(o3 => [o, o2, o3])));
		};

		return new Task<E, [O, Output2, Output3]>(evaluate);
	}

	zip2WithNewErrors<
		Error2,
		Error3,
		Output2,
		Output3>(
		o2: Task<Error2, Output2>,
		o3: Task<Error3, Output3>,
	): Task<E | Error2 | Error3, [O, Output2, Output3]> {
		const evaluate = (input: any): Either<E | Error2 | Error3, [O, Output2, Output3]> => {
			const output = this.evaluate(input);
			const output2 = o2.evaluate(input);
			const output3 = o3.evaluate(input);

			return output.flatMap(o => output2.flatMap(o2 => output3.map(o3 => [o, o2, o3])));
		};

		return new Task<E | Error2 | Error3, [O, Output2, Output3]>(evaluate);
	}

	zip3<Output2, Output3, Output4>(
		o2: Task<E, Output2>,
		o3: Task<E, Output3>,
		o4: Task<E, Output4>,
	): Task<E, [O, Output2, Output3, Output4]> {
		const evaluate = (input: any): Either<E, [O, Output2, Output3, Output4]> => {
			const output = this.evaluate(input);
			const output2 = o2.evaluate(input);
			const output3 = o3.evaluate(input);
			const output4 = o4.evaluate(input);

			return output.flatMap(o => output2.flatMap(o2 => output3.flatMap(o3 => output4.map(o4 => [o, o2, o3, o4]))));
		};

		return new Task<E, [O, Output2, Output3, Output4]>(evaluate);
	}

	zip3WithNewErrors<
		Error2,
		Error3,
		Error4,
		Output2,
		Output3,
		Output4>(
		o2: Task<Error2, Output2>,
		o3: Task<Error3, Output3>,
		o4: Task<Error4, Output4>,
	): Task<E | Error2 | Error3 | Error4, [O, Output2, Output3, Output4]> {
		const evaluate = (input: any): Either<E | Error2 | Error3 | Error4, [O, Output2, Output3, Output4]> => {
			const output = this.evaluate(input);
			const output2 = o2.evaluate(input);
			const output3 = o3.evaluate(input);
			const output4 = o4.evaluate(input);

			return output.flatMap(o => output2.flatMap(o2 => output3.flatMap(o3 => output4.map(o4 => [o, o2, o3, o4]))));
		};

		return new Task<E | Error2 | Error3 | Error4, [O, Output2, Output3, Output4]>(evaluate);
	}

	zip4<Output2, Output3, Output4, Output5>(
		o2: Task<E, Output2>,
		o3: Task<E, Output3>,
		o4: Task<E, Output4>,
		o5: Task<E, Output5>,
	): Task<E, [O, Output2, Output3, Output4, Output5]> {
		const evaluate = (input: any): Either<E, [O, Output2, Output3, Output4, Output5]> => {
			const output = this.evaluate(input);
			const output2 = o2.evaluate(input);
			const output3 = o3.evaluate(input);
			const output4 = o4.evaluate(input);
			const output5 = o5.evaluate(input);

			return output.flatMap(
				o => output2.flatMap(
					o2 => output3.flatMap(
						o3 => output4.flatMap(
							o4 => output5.map(
								o5 => [o, o2, o3, o4, o5],
							),
						),
					),
				),
			);
		};

		return new Task<E, [O, Output2, Output3, Output4, Output5]>(evaluate);
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
		o2: Task<Error2, Output2>,
		o3: Task<Error3, Output3>,
		o4: Task<Error4, Output4>,
		o5: Task<Error5, Output5>,
	): Task<E | Error2 | Error3 | Error4 | Error5, [O, Output2, Output3, Output4, Output5]> {
		const evaluate = (input: any): Either<E | Error2 | Error3 | Error4 | Error5, [O, Output2, Output3, Output4, Output5]> => {
			const output = this.evaluate(input);
			const output2 = o2.evaluate(input);
			const output3 = o3.evaluate(input);
			const output4 = o4.evaluate(input);
			const output5 = o5.evaluate(input);

			return output.flatMap(
				o => output2.flatMap(
					o2 => output3.flatMap(
						o3 => output4.flatMap(
							o4 => output5.map(
								o5 => [o, o2, o3, o4, o5],
							),
						),
					),
				),
			);
		};

		return new Task<E | Error2 | Error3 | Error4 | Error5, [O, Output2, Output3, Output4, Output5]>(evaluate);
	}

	zip5<Output2, Output3, Output4, Output5, Output6>(
		o2: Task<E, Output2>,
		o3: Task<E, Output3>,
		o4: Task<E, Output4>,
		o5: Task<E, Output5>,
		o6: Task<E, Output6>,
	): Task<E, [O, Output2, Output3, Output4, Output5, Output6]> {
		const evaluate = (input: any): Either<E, [O, Output2, Output3, Output4, Output5, Output6]> => {
			const output = this.evaluate(input);
			const output2 = o2.evaluate(input);
			const output3 = o3.evaluate(input);
			const output4 = o4.evaluate(input);
			const output5 = o5.evaluate(input);
			const output6 = o6.evaluate(input);

			return output.flatMap(
				o => output2.flatMap(
					o2 => output3.flatMap(
						o3 => output4.flatMap(
							o4 => output5.flatMap(
								o5 => output6.map(
									o6 => [o, o2, o3, o4, o5, o6],
								),
							),
						),
					),
				),
			);
		};

		return new Task<E, [O, Output2, Output3, Output4, Output5, Output6]>(evaluate);
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
		o2: Task<Error2, Output2>,
		o3: Task<Error3, Output3>,
		o4: Task<Error4, Output4>,
		o5: Task<Error5, Output5>,
		o6: Task<Error6, Output6>,
	): Task<E | Error2 | Error3 | Error4 | Error5 | Error6, [O, Output2, Output3, Output4, Output5, Output6]> {
		const evaluate = (input: any): Either<E | Error2 | Error3 | Error4 | Error5 | Error6, [O, Output2, Output3, Output4, Output5, Output6]> => {
			const output = this.evaluate(input);
			const output2 = o2.evaluate(input);
			const output3 = o3.evaluate(input);
			const output4 = o4.evaluate(input);
			const output5 = o5.evaluate(input);
			const output6 = o6.evaluate(input);

			return output.flatMap(
				o => output2.flatMap(
					o2 => output3.flatMap(
						o3 => output4.flatMap(
							o4 => output5.flatMap(
								o5 => output6.map(
									o6 => [o, o2, o3, o4, o5, o6],
								),
							),
						),
					),
				),
			);
		};

		return new Task<E | Error2 | Error3 | Error4 | Error5 | Error6, [O, Output2, Output3, Output4, Output5, Output6]>(evaluate);
	}

	zip6<Output2, Output3, Output4, Output5, Output6, Output7>(
		o2: Task<E, Output2>,
		o3: Task<E, Output3>,
		o4: Task<E, Output4>,
		o5: Task<E, Output5>,
		o6: Task<E, Output6>,
		o7: Task<E, Output7>,
	): Task<E, [O, Output2, Output3, Output4, Output5, Output6, Output7]> {
		const evaluate = (input: any): Either<E, [O, Output2, Output3, Output4, Output5, Output6, Output7]> => {
			const output = this.evaluate(input);
			const output2 = o2.evaluate(input);
			const output3 = o3.evaluate(input);
			const output4 = o4.evaluate(input);
			const output5 = o5.evaluate(input);
			const output6 = o6.evaluate(input);
			const output7 = o7.evaluate(input);

			return output.flatMap(
				o => output2.flatMap(
					o2 => output3.flatMap(
						o3 => output4.flatMap(
							o4 => output5.flatMap(
								o5 => output6.flatMap(
									o6 => output7.map(
										o7 => [o, o2, o3, o4, o5, o6, o7],
									),
								),
							),
						),
					),
				),
			);
		};

		return new Task<E, [O, Output2, Output3, Output4, Output5, Output6, Output7]>(evaluate);
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
		o2: Task<Error2, Output2>,
		o3: Task<Error3, Output3>,
		o4: Task<Error4, Output4>,
		o5: Task<Error5, Output5>,
		o6: Task<Error6, Output6>,
		o7: Task<Error7, Output7>,
	): Task<E | Error2 | Error3 | Error4 | Error5 | Error6 | Error7, [O, Output2, Output3, Output4, Output5, Output6, Output7]> {
		const evaluate = (input: any): Either<E | Error2 | Error3 | Error4 | Error5 | Error6 | Error7, [O, Output2, Output3, Output4, Output5, Output6, Output7]> => {
			const output = this.evaluate(input);
			const output2 = o2.evaluate(input);
			const output3 = o3.evaluate(input);
			const output4 = o4.evaluate(input);
			const output5 = o5.evaluate(input);
			const output6 = o6.evaluate(input);
			const output7 = o7.evaluate(input);

			return output.flatMap(
				o => output2.flatMap(
					o2 => output3.flatMap(
						o3 => output4.flatMap(
							o4 => output5.flatMap(
								o5 => output6.flatMap(
									o6 => output7.map(
										o7 => [o, o2, o3, o4, o5, o6, o7],
									),
								),
							),
						),
					),
				),
			);
		};

		return new Task<E | Error2 | Error3 | Error4 | Error5 | Error6 | Error7, [O, Output2, Output3, Output4, Output5, Output6, Output7]>(evaluate);
	}
}
