/* eslint-disable max-nested-callbacks */
import {Computation} from './Computation.js';
import {type Either, Right, Left} from './Either.js';
import {type Monad} from './Monad.js';
import {IO} from './IO.js';
import {type SafeComputation} from './SafeComputation.js';
import {AsyncTask} from './AsyncTask.js';

export class Task<out Error, out Output> implements Monad<Output> {
	constructor(public readonly evaluate: (..._: any[]) => Either<Error, Output>) {}

	thenDo<Output2>(f: (..._: any[]) => Output2): Task<Error, Output2> {
		const resolver = (..._: any[]) => {
			const ownResult = this.evaluate();
			if (ownResult.isLeft()) {
				return new Left<Error, Output2>(ownResult.get());
			}

			return new Right<Error, Output2>(f());
		};

		return new Task(resolver);
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	thenDoIO<Output2>(io: IO<Output2>): Task<Error, Output2> {
		return this.thenDo(() => io.evaluate());
	}

	thenDoWithInput<Input, Output2>(f: (input: Input) => Output2): Computation<Input, Error, Output2> {
		const resolver = (input: Input) => {
			const ownResult = this.evaluate();
			if (ownResult.isLeft()) {
				return new Left<Error, Output2>(ownResult.get());
			}

			return new Right<Error, Output2>(f(input));
		};

		return new Computation<Input, Error, Output2>(resolver);
	}

	thenDoSafeComputation<Input, Output2>(computation: SafeComputation<Input, Output2>): Computation<Input, Error, Output2> {
		return this.thenDoWithInput(input => computation.evaluate(input));
	}

	thenDoWithNewError<Error2, Output2>(f: (..._: any[]) => Either<Error2, Output2>): Task<Error | Error2, Output2> {
		const resolver = (..._: any[]) => {
			const ownResult = this.evaluate();
			if (ownResult.isLeft()) {
				return new Left<Error | Error2, Output2>(ownResult.get());
			}

			return f();
		};

		return new Task(resolver);
	}

	thenDoTask<Error2, Output2>(task: Task<Error2, Output2>): Task<Error | Error2, Output2> {
		return this.thenDoWithNewError(() => task.evaluate());
	}

	thenDoWithInputAndNewError<Input, Error2, Output2>(
		f: (input: Input) => Either<Error2, Output2>,
	): Computation<Input, Error | Error2, Output2> {
		const resolver = (input: Input) => {
			const ownResult = this.evaluate();
			if (ownResult.isLeft()) {
				return new Left<Error | Error2, Output2>(ownResult.get());
			}

			return f(input);
		};

		return new Computation(resolver);
	}

	thenDoComputation<Input, Error2, Output2>(
		computation: Computation<Input, Error2, Output2>,
	): Computation<Input, Error | Error2, Output2> {
		return this.thenDoWithInputAndNewError((input: Input) => computation.evaluate(input));
	}

	mapToComputation<I, E2, U>(f: (x: Output) => (i: I) => Either<Error | E2, U>): Computation<I, Error | E2, U> {
		const evaluate = (i: I) => {
			const thisValue = this.evaluate();
			if (thisValue.isLeft()) {
				return thisValue as any as Either<Error | E2, U>;
			}

			return f(thisValue.get() as Output)(i);
		};

		return new Computation<I, Error | E2, U>(evaluate);
	}

	orElseDo<Output2>(f: (..._: any[]) => Output2): IO<Either<Output, Output2>> {
		const resolver = (..._: any[]) => {
			const ownResult = this.evaluate();
			if (ownResult.isLeft()) {
				const otherResult = f();
				return new Right<Output, Output2>(otherResult);
			}

			return new Left<Output, Output2>(ownResult.get() as Output);
		};

		return new IO(resolver);
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	orElseDoIO<Output2>(io: IO<Output2>): IO<Either<Output, Output2>> {
		return this.orElseDo(() => io.evaluate());
	}

	orElseDoWithNewError<Error2, Output2>(f: (..._: any[]) => Either<Error2, Output2>): Task<Error2, Either<Output, Output2>> {
		const resolver = (..._: any[]) => {
			const ownResult = this.evaluate();
			if (ownResult.isLeft()) {
				const otherEvaluated = f();
				if (otherEvaluated.isLeft()) {
					return new Left<Error2, Either<Output, Output2>>(otherEvaluated.get());
				}

				return new Right<Error2, Either<Output, Output2>>(new Right<Output, Output2>(otherEvaluated.get() as Output2));
			}

			return new Right<Error2, Either<Output, Output2>>(new Left<Output, Output2>(ownResult.get() as Output));
		};

		return new Task(resolver);
	}

	orElseDoTask<Error2, Output2>(task: Task<Error2, Output2>): Task<Error | Error2, Either<Output, Output2>> {
		return this.orElseDoWithNewError(() => task.evaluate());
	}

	orElseDoWithInput<Input, Output2>(f: (input: Input) => Output2): Computation<Input, Error, Either<Output, Output2>> {
		const resolver = (input: Input) => {
			const ownResult = this.evaluate();
			if (ownResult.isLeft()) {
				return new Right<Error, Either<Output, Output2>>(new Right<Output, Output2>(f(input)));
			}

			return new Right<Error, Either<Output, Output2>>(new Left<Output, Output2>(ownResult.get() as Output));
		};

		return new Computation(resolver);
	}

	orElseDoSafeComputation<Input, Output2>(computation: SafeComputation<Input, Output2>): Computation<Input, Error, Either<Output, Output2>> {
		return this.orElseDoWithInput(input => computation.evaluate(input));
	}

	orElseDoWithInputAndNewError<Input, Error2, Output2>(
		f: (input: Input) => Either<Error2, Output2>,
	): Computation<Input, Error | Error2, Either<Output, Output2>> {
		const resolver = (input: Input) => {
			const ownResult = this.evaluate();
			if (ownResult.isLeft()) {
				const otherEvaluated = f(input);
				if (otherEvaluated.isLeft()) {
					return new Left<Error2, Either<Output, Output2>>(otherEvaluated.get());
				}

				return new Right<Error2, Either<Output, Output2>>(new Right<Output, Output2>(otherEvaluated.get() as Output2));
			}

			return new Right<Error2, Either<Output, Output2>>(new Left<Output, Output2>(ownResult.get() as Output));
		};

		return new Computation(resolver);
	}

	orElseDoComputation<Input, Error2, Output2>(
		computation: Computation<Input, Error2, Output2>,
	): Computation<Input, Error | Error2, Either<Output, Output2>> {
		return this.orElseDoWithInputAndNewError((input: Input) => computation.evaluate(input));
	}

	map<Output2>(f: (output: Output) => Output2): Task<Error, Output2> {
		return new Task<Error, Output2>(input => this.evaluate(input).map(o => f(o)));
	}

	apply<Output2>(f: Task<Error, (x: Output) => Output2>): Task<Error, Output2> {
		return f.flatMap(g => this.map(g));
	}

	pure<Output2>(x: Output2): Task<Error, Output2> {
		return new Task<Error, Output2>(() => new Right<Error, Output2>(x));
	}

	flatMap<Output2>(f: (x: Output) => Task<Error, Output2>): Task<Error, Output2> {
		return new Task<Error, Output2>(input => this.evaluate(input).flatMap(o => f(o).evaluate(input)));
	}

	zip<Output2>(other: Task<Error, Output2>): Task<Error, [Output, Output2]> {
		const evaluate = (input: any): Either<Error, [Output, Output2]> => {
			const output = this.evaluate(input);
			const output2 = other.evaluate(input);

			return output.flatMap(o => output2.map(o2 => [o, o2]));
		};

		return new Task<Error, [Output, Output2]>(evaluate);
	}

	zipWithNewError<Error2, Output2>(
		other: Task<Error2, Output2>,
	): Task<Error | Error2, [Output, Output2]> {
		const evaluate = (input: any): Either<Error | Error2, [Output, Output2]> => {
			const output = this.evaluate(input);
			const output2 = other.evaluate(input);

			return output.flatMap(o => output2.map(o2 => [o, o2]));
		};

		return new Task<Error | Error2, [Output, Output2]>(evaluate);
	}

	zip2<Output2, Output3>(
		o2: Task<Error, Output2>,
		o3: Task<Error, Output3>,
	): Task<Error, [Output, Output2, Output3]> {
		const evaluate = (input: any): Either<Error, [Output, Output2, Output3]> => {
			const output = this.evaluate(input);
			const output2 = o2.evaluate(input);
			const output3 = o3.evaluate(input);

			return output.flatMap(o => output2.flatMap(o2 => output3.map(o3 => [o, o2, o3])));
		};

		return new Task<Error, [Output, Output2, Output3]>(evaluate);
	}

	zip2WithNewErrors<
		Error2,
		Error3,
		Output2,
		Output3>(
		o2: Task<Error2, Output2>,
		o3: Task<Error3, Output3>,
	): Task<Error | Error2 | Error3, [Output, Output2, Output3]> {
		const evaluate = (input: any): Either<Error | Error2 | Error3, [Output, Output2, Output3]> => {
			const output = this.evaluate(input);
			const output2 = o2.evaluate(input);
			const output3 = o3.evaluate(input);

			return output.flatMap(o => output2.flatMap(o2 => output3.map(o3 => [o, o2, o3])));
		};

		return new Task<Error | Error2 | Error3, [Output, Output2, Output3]>(evaluate);
	}

	zip3<Output2, Output3, Output4>(
		o2: Task<Error, Output2>,
		o3: Task<Error, Output3>,
		o4: Task<Error, Output4>,
	): Task<Error, [Output, Output2, Output3, Output4]> {
		const evaluate = (input: any): Either<Error, [Output, Output2, Output3, Output4]> => {
			const output = this.evaluate(input);
			const output2 = o2.evaluate(input);
			const output3 = o3.evaluate(input);
			const output4 = o4.evaluate(input);

			return output.flatMap(o => output2.flatMap(o2 => output3.flatMap(o3 => output4.map(o4 => [o, o2, o3, o4]))));
		};

		return new Task<Error, [Output, Output2, Output3, Output4]>(evaluate);
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
	): Task<Error | Error2 | Error3 | Error4, [Output, Output2, Output3, Output4]> {
		const evaluate = (input: any): Either<Error | Error2 | Error3 | Error4, [Output, Output2, Output3, Output4]> => {
			const output = this.evaluate(input);
			const output2 = o2.evaluate(input);
			const output3 = o3.evaluate(input);
			const output4 = o4.evaluate(input);

			return output.flatMap(o => output2.flatMap(o2 => output3.flatMap(o3 => output4.map(o4 => [o, o2, o3, o4]))));
		};

		return new Task<Error | Error2 | Error3 | Error4, [Output, Output2, Output3, Output4]>(evaluate);
	}

	zip4<Output2, Output3, Output4, Output5>(
		o2: Task<Error, Output2>,
		o3: Task<Error, Output3>,
		o4: Task<Error, Output4>,
		o5: Task<Error, Output5>,
	): Task<Error, [Output, Output2, Output3, Output4, Output5]> {
		const evaluate = (input: any): Either<Error, [Output, Output2, Output3, Output4, Output5]> => {
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

		return new Task<Error, [Output, Output2, Output3, Output4, Output5]>(evaluate);
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
	): Task<Error | Error2 | Error3 | Error4 | Error5, [Output, Output2, Output3, Output4, Output5]> {
		const evaluate = (input: any): Either<Error | Error2 | Error3 | Error4 | Error5, [Output, Output2, Output3, Output4, Output5]> => {
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

		return new Task<Error | Error2 | Error3 | Error4 | Error5, [Output, Output2, Output3, Output4, Output5]>(evaluate);
	}

	zip5<Output2, Output3, Output4, Output5, Output6>(
		o2: Task<Error, Output2>,
		o3: Task<Error, Output3>,
		o4: Task<Error, Output4>,
		o5: Task<Error, Output5>,
		o6: Task<Error, Output6>,
	): Task<Error, [Output, Output2, Output3, Output4, Output5, Output6]> {
		const evaluate = (input: any): Either<Error, [Output, Output2, Output3, Output4, Output5, Output6]> => {
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

		return new Task<Error, [Output, Output2, Output3, Output4, Output5, Output6]>(evaluate);
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
	): Task<Error | Error2 | Error3 | Error4 | Error5 | Error6, [Output, Output2, Output3, Output4, Output5, Output6]> {
		const evaluate = (input: any): Either<Error | Error2 | Error3 | Error4 | Error5 | Error6, [Output, Output2, Output3, Output4, Output5, Output6]> => {
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

		return new Task<Error | Error2 | Error3 | Error4 | Error5 | Error6, [Output, Output2, Output3, Output4, Output5, Output6]>(evaluate);
	}

	zip6<Output2, Output3, Output4, Output5, Output6, Output7>(
		o2: Task<Error, Output2>,
		o3: Task<Error, Output3>,
		o4: Task<Error, Output4>,
		o5: Task<Error, Output5>,
		o6: Task<Error, Output6>,
		o7: Task<Error, Output7>,
	): Task<Error, [Output, Output2, Output3, Output4, Output5, Output6, Output7]> {
		const evaluate = (input: any): Either<Error, [Output, Output2, Output3, Output4, Output5, Output6, Output7]> => {
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

		return new Task<Error, [Output, Output2, Output3, Output4, Output5, Output6, Output7]>(evaluate);
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
	): Task<Error | Error2 | Error3 | Error4 | Error5 | Error6 | Error7, [Output, Output2, Output3, Output4, Output5, Output6, Output7]> {
		const evaluate = (input: any): Either<Error | Error2 | Error3 | Error4 | Error5 | Error6 | Error7, [Output, Output2, Output3, Output4, Output5, Output6, Output7]> => {
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

		return new Task<Error | Error2 | Error3 | Error4 | Error5 | Error6 | Error7, [Output, Output2, Output3, Output4, Output5, Output6, Output7]>(evaluate);
	}

	toAsync(): AsyncTask<Error, Output> {
		return new AsyncTask<Error, Output>(async (input: any) => this.evaluate(input));
	}
}
