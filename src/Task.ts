/* eslint-disable max-nested-callbacks */
import {Computation} from './Computation.js';
import {type Either, Right, Left} from './Either.js';
import {type Monad} from './Monad.js';
import {IO} from './IO.js';
import {type SafeComputation} from './SafeComputation.js';
import {AsyncTask} from './AsyncTask.js';
import {type BindEffectType, boundEffectToIO, type Effect} from './definitions.js';

export class Task<out ErrorT, out OutputT> implements Effect<any, ErrorT, OutputT> {
	static of<Output2T>(x: Output2T): Task<never, Output2T> {
		return new Task<never, Output2T>(() => new Right<never, Output2T>(x));
	}

	static do(): Task<any, Record<any, any>> {
		return Task.of({});
	}

	constructor(public readonly evaluate: (..._: any[]) => Either<ErrorT, OutputT>) {}

	bindKey<KeyT extends (string | symbol | number), Output2T, EffectT extends BindEffectType<Output2T>>(key: KeyT, f: (input: OutputT) => EffectT): Task<ErrorT, OutputT & Record<KeyT, Output2T>> {
		return this.flatMap((output: OutputT) => {
			const resolver = () => {
				const effectTask = boundEffectToIO<Output2T, EffectT>(f(output));
				const effectResult = effectTask.evaluate();
				return new Right<ErrorT, OutputT & Record<KeyT, Output2T>>({...output, [key]: effectResult} as OutputT & Record<KeyT, Output2T>);
			};

			return new Task<ErrorT, OutputT & Record<KeyT, Output2T>>(resolver);
		});
	}

	tap<EffectT extends BindEffectType<any>>(f: (input: OutputT) => EffectT): this {
		return this.flatMap((input: OutputT) => boundEffectToIO<EffectT, EffectT>(f(input)).toTask().map(() => input)) as this;
	}

	thenDo<Output2T>(f: (..._: any[]) => Output2T): Task<ErrorT, Output2T> {
		const resolver = (..._: any[]) => {
			const ownResult = this.evaluate();
			if (ownResult.isLeft()) {
				return new Left<ErrorT, Output2T>(ownResult.get());
			}

			return new Right<ErrorT, Output2T>(f());
		};

		return new Task(resolver);
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	thenDoIO<Output2T>(io: IO<Output2T>): Task<ErrorT, Output2T> {
		return this.thenDo(() => io.evaluate());
	}

	thenDoWithInput<InputT, Output2T>(f: (input: InputT) => Output2T): Computation<InputT, ErrorT, Output2T> {
		const resolver = (input: InputT): Either<ErrorT, Output2T> => {
			const ownResult = this.evaluate();
			if (ownResult.isLeft()) {
				return new Left<ErrorT, Output2T>(ownResult.get());
			}

			return new Right<ErrorT, Output2T>(f(input));
		};

		return new Computation<InputT, ErrorT, Output2T>(resolver);
	}

	thenDoSafeComputation<InputT, Output2T>(computation: SafeComputation<InputT, Output2T>): Computation<InputT, ErrorT, Output2T> {
		return this.thenDoWithInput((input: InputT) => computation.evaluate(input));
	}

	thenDoWithNewError<Error2T, Output2T>(f: (..._: any[]) => Either<Error2T, Output2T>): Task<ErrorT | Error2T, Output2T> {
		const resolver = (..._: any[]) => {
			const ownResult = this.evaluate();
			if (ownResult.isLeft()) {
				return new Left<ErrorT | Error2T, Output2T>(ownResult.get());
			}

			return f();
		};

		return new Task(resolver);
	}

	thenDoTask<Error2T, Output2T>(task: Task<Error2T, Output2T>): Task<ErrorT | Error2T, Output2T> {
		return this.thenDoWithNewError(() => task.evaluate());
	}

	thenDoWithInputAndNewError<InputT, Error2T, Output2T>(
		f: (input: InputT) => Either<Error2T, Output2T>,
	): Computation<InputT, ErrorT | Error2T, Output2T> {
		const resolver = (input: InputT) => {
			const ownResult = this.evaluate();
			if (ownResult.isLeft()) {
				return new Left<ErrorT | Error2T, Output2T>(ownResult.get());
			}

			return f(input);
		};

		return new Computation(resolver);
	}

	thenDoComputation<InputT, Error2T, Output2T>(
		computation: Computation<InputT, Error2T, Output2T>,
	): Computation<InputT, ErrorT | Error2T, Output2T> {
		return this.thenDoWithInputAndNewError((input: InputT) => computation.evaluate(input));
	}

	mapToComputation<InputT, Error2T, Output2T>(f: (x: OutputT) => (i: InputT) => Either<ErrorT | Error2T, Output2T>): Computation<InputT, ErrorT | Error2T, Output2T> {
		const evaluate = (i: InputT) => {
			const thisValue = this.evaluate();
			if (thisValue.isLeft()) {
				return thisValue as any as Either<ErrorT | Error2T, Output2T>;
			}

			return f(thisValue.get() as OutputT)(i);
		};

		return new Computation<InputT, ErrorT | Error2T, Output2T>(evaluate);
	}

	orElseDo<Output2T>(f: (..._: any[]) => Output2T): IO<Either<OutputT, Output2T>> {
		const resolver = (..._: any[]) => {
			const ownResult = this.evaluate();
			if (ownResult.isLeft()) {
				const otherResult = f();
				return new Right<OutputT, Output2T>(otherResult);
			}

			return new Left<OutputT, Output2T>(ownResult.get() as OutputT);
		};

		return new IO(resolver);
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	orElseDoIO<Output2T>(io: IO<Output2T>): IO<Either<OutputT, Output2T>> {
		return this.orElseDo(() => io.evaluate());
	}

	orElseDoWithNewError<Error2T, Output2T>(f: (..._: any[]) => Either<Error2T, Output2T>): Task<Error2T, Either<OutputT, Output2T>> {
		const resolver = (..._: any[]) => {
			const ownResult = this.evaluate();
			if (ownResult.isLeft()) {
				const otherEvaluated = f();
				if (otherEvaluated.isLeft()) {
					return new Left<Error2T, Either<OutputT, Output2T>>(otherEvaluated.get());
				}

				return new Right<Error2T, Either<OutputT, Output2T>>(new Right<OutputT, Output2T>(otherEvaluated.get() as Output2T));
			}

			return new Right<Error2T, Either<OutputT, Output2T>>(new Left<OutputT, Output2T>(ownResult.get() as OutputT));
		};

		return new Task(resolver);
	}

	orElseDoTask<Error2T, Output2T>(task: Task<Error2T, Output2T>): Task<ErrorT | Error2T, Either<OutputT, Output2T>> {
		return this.orElseDoWithNewError(() => task.evaluate());
	}

	orElseDoWithInput<InputT, Output2T>(f: (input: InputT) => Output2T): Computation<InputT, ErrorT, Either<OutputT, Output2T>> {
		const resolver = (input: InputT) => {
			const ownResult = this.evaluate();
			if (ownResult.isLeft()) {
				return new Right<ErrorT, Either<OutputT, Output2T>>(new Right<OutputT, Output2T>(f(input)));
			}

			return new Right<ErrorT, Either<OutputT, Output2T>>(new Left<OutputT, Output2T>(ownResult.get() as OutputT));
		};

		return new Computation(resolver);
	}

	orElseDoSafeComputation<InputT, Output2T>(computation: SafeComputation<InputT, Output2T>): Computation<InputT, ErrorT, Either<OutputT, Output2T>> {
		return this.orElseDoWithInput(input => computation.evaluate(input));
	}

	orElseDoWithInputAndNewError<InputT, Error2T, Output2T>(
		f: (input: InputT) => Either<Error2T, Output2T>,
	): Computation<InputT, ErrorT | Error2T, Either<OutputT, Output2T>> {
		const resolver = (input: InputT) => {
			const ownResult = this.evaluate();
			if (ownResult.isLeft()) {
				const otherEvaluated = f(input);
				if (otherEvaluated.isLeft()) {
					return new Left<Error2T, Either<OutputT, Output2T>>(otherEvaluated.get());
				}

				return new Right<Error2T, Either<OutputT, Output2T>>(new Right<OutputT, Output2T>(otherEvaluated.get() as Output2T));
			}

			return new Right<Error2T, Either<OutputT, Output2T>>(new Left<OutputT, Output2T>(ownResult.get() as OutputT));
		};

		return new Computation(resolver);
	}

	orElseDoComputation<InputT, Error2T, Output2T>(
		computation: Computation<InputT, Error2T, Output2T>,
	): Computation<InputT, ErrorT | Error2T, Either<OutputT, Output2T>> {
		return this.orElseDoWithInputAndNewError((input: InputT) => computation.evaluate(input));
	}

	map<Output2T>(f: (output: OutputT) => Output2T): Task<ErrorT, Output2T> {
		return new Task<ErrorT, Output2T>(input => this.evaluate(input).map(o => f(o)));
	}

	apply<Output2T>(f: Task<ErrorT, (x: OutputT) => Output2T>): Task<ErrorT, Output2T> {
		return f.flatMap(g => this.map(g));
	}

	pure<Output2T>(x: Output2T): Task<ErrorT, Output2T> {
		return new Task<ErrorT, Output2T>(() => new Right<ErrorT, Output2T>(x));
	}

	flatMap<Output2T>(f: (x: OutputT) => Task<ErrorT, Output2T>): Task<ErrorT, Output2T> {
		return new Task<ErrorT, Output2T>(input => this.evaluate(input).flatMap(o => f(o).evaluate(input)));
	}

	flatMapWithInput<InputT, Output2T>(f: (x: OutputT) => SafeComputation<InputT, Output2T>): Computation<InputT, ErrorT, Output2T> {
		const resolver = (input: InputT) => {
			const output = this.evaluate();
			if (output.isLeft()) {
				output.get() as any as Left<ErrorT, Output2T>;
			}

			return new Right<ErrorT, Output2T>(f(output.get() as OutputT).evaluate(input));
		};

		return new Computation(resolver);
	}

	flatMapWithNewError<Error2T, Output2T>(f: (x: OutputT) => Task<Error2T, Output2T>): Task<ErrorT | Error2T, Output2T> {
		return new Task<ErrorT | Error2T, Output2T>(input => {
			const output = this.evaluate(input);
			if (output.isLeft()) {
				return new Left<ErrorT | Error2T, Output2T>(output.get());
			}

			return f(output.get() as OutputT).evaluate(input);
		});
	}

	flatMapWithInputAndNewError<InputT, Error2T, Output2T>(
		f: (x: OutputT) => Computation<InputT, Error2T, Output2T>,
	): Computation<InputT, ErrorT | Error2T, Output2T> {
		const resolver = (input: InputT) => {
			const output = this.evaluate();
			if (output.isLeft()) {
				output.get() as any as Left<ErrorT, Output2T>;
			}

			return f(output.get() as OutputT).evaluate(input);
		};

		return new Computation(resolver);
	}

	zip<Output2T>(other: Task<ErrorT, Output2T>): Task<ErrorT, [OutputT, Output2T]> {
		const evaluate = (input: any): Either<ErrorT, [OutputT, Output2T]> => {
			const output = this.evaluate(input);
			const output2 = other.evaluate(input);

			return output.flatMap(o => output2.map(o2 => [o, o2]));
		};

		return new Task<ErrorT, [OutputT, Output2T]>(evaluate);
	}

	zipWithNewError<Error2T, Output2T>(
		other: Task<Error2T, Output2T>,
	): Task<ErrorT | Error2T, [OutputT, Output2T]> {
		const evaluate = (input: any): Either<ErrorT | Error2T, [OutputT, Output2T]> => {
			const output = this.evaluate(input);
			const output2 = other.evaluate(input);

			return output.flatMap(o => output2.map(o2 => [o, o2]));
		};

		return new Task<ErrorT | Error2T, [OutputT, Output2T]>(evaluate);
	}

	zip2<Output2T, Output3>(
		o2: Task<ErrorT, Output2T>,
		o3: Task<ErrorT, Output3>,
	): Task<ErrorT, [OutputT, Output2T, Output3]> {
		const evaluate = (input: any): Either<ErrorT, [OutputT, Output2T, Output3]> => {
			const output = this.evaluate(input);
			const output2 = o2.evaluate(input);
			const output3 = o3.evaluate(input);

			return output.flatMap(o => output2.flatMap(o2 => output3.map(o3 => [o, o2, o3])));
		};

		return new Task<ErrorT, [OutputT, Output2T, Output3]>(evaluate);
	}

	zip2WithNewErrors<
		Error2T,
		Error3,
		Output2T,
		Output3>(
		o2: Task<Error2T, Output2T>,
		o3: Task<Error3, Output3>,
	): Task<ErrorT | Error2T | Error3, [OutputT, Output2T, Output3]> {
		const evaluate = (input: any): Either<ErrorT | Error2T | Error3, [OutputT, Output2T, Output3]> => {
			const output = this.evaluate(input);
			const output2 = o2.evaluate(input);
			const output3 = o3.evaluate(input);

			return output.flatMap(o => output2.flatMap(o2 => output3.map(o3 => [o, o2, o3])));
		};

		return new Task<ErrorT | Error2T | Error3, [OutputT, Output2T, Output3]>(evaluate);
	}

	zip3<Output2T, Output3, Output4>(
		o2: Task<ErrorT, Output2T>,
		o3: Task<ErrorT, Output3>,
		o4: Task<ErrorT, Output4>,
	): Task<ErrorT, [OutputT, Output2T, Output3, Output4]> {
		const evaluate = (input: any): Either<ErrorT, [OutputT, Output2T, Output3, Output4]> => {
			const output = this.evaluate(input);
			const output2 = o2.evaluate(input);
			const output3 = o3.evaluate(input);
			const output4 = o4.evaluate(input);

			return output.flatMap(o => output2.flatMap(o2 => output3.flatMap(o3 => output4.map(o4 => [o, o2, o3, o4]))));
		};

		return new Task<ErrorT, [OutputT, Output2T, Output3, Output4]>(evaluate);
	}

	zip3WithNewErrors<
		Error2T,
		Error3,
		Error4,
		Output2T,
		Output3,
		Output4>(
		o2: Task<Error2T, Output2T>,
		o3: Task<Error3, Output3>,
		o4: Task<Error4, Output4>,
	): Task<ErrorT | Error2T | Error3 | Error4, [OutputT, Output2T, Output3, Output4]> {
		const evaluate = (input: any): Either<ErrorT | Error2T | Error3 | Error4, [OutputT, Output2T, Output3, Output4]> => {
			const output = this.evaluate(input);
			const output2 = o2.evaluate(input);
			const output3 = o3.evaluate(input);
			const output4 = o4.evaluate(input);

			return output.flatMap(o => output2.flatMap(o2 => output3.flatMap(o3 => output4.map(o4 => [o, o2, o3, o4]))));
		};

		return new Task<ErrorT | Error2T | Error3 | Error4, [OutputT, Output2T, Output3, Output4]>(evaluate);
	}

	zip4<Output2T, Output3, Output4, Output5>(
		o2: Task<ErrorT, Output2T>,
		o3: Task<ErrorT, Output3>,
		o4: Task<ErrorT, Output4>,
		o5: Task<ErrorT, Output5>,
	): Task<ErrorT, [OutputT, Output2T, Output3, Output4, Output5]> {
		const evaluate = (input: any): Either<ErrorT, [OutputT, Output2T, Output3, Output4, Output5]> => {
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

		return new Task<ErrorT, [OutputT, Output2T, Output3, Output4, Output5]>(evaluate);
	}

	zip4WithNewErrors<
		Error2T,
		Error3,
		Error4,
		Error5,
		Output2T,
		Output3,
		Output4,
		Output5>(
		o2: Task<Error2T, Output2T>,
		o3: Task<Error3, Output3>,
		o4: Task<Error4, Output4>,
		o5: Task<Error5, Output5>,
	): Task<ErrorT | Error2T | Error3 | Error4 | Error5, [OutputT, Output2T, Output3, Output4, Output5]> {
		const evaluate = (input: any): Either<ErrorT | Error2T | Error3 | Error4 | Error5, [OutputT, Output2T, Output3, Output4, Output5]> => {
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

		return new Task<ErrorT | Error2T | Error3 | Error4 | Error5, [OutputT, Output2T, Output3, Output4, Output5]>(evaluate);
	}

	zip5<Output2T, Output3, Output4, Output5, Output6>(
		o2: Task<ErrorT, Output2T>,
		o3: Task<ErrorT, Output3>,
		o4: Task<ErrorT, Output4>,
		o5: Task<ErrorT, Output5>,
		o6: Task<ErrorT, Output6>,
	): Task<ErrorT, [OutputT, Output2T, Output3, Output4, Output5, Output6]> {
		const evaluate = (input: any): Either<ErrorT, [OutputT, Output2T, Output3, Output4, Output5, Output6]> => {
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

		return new Task<ErrorT, [OutputT, Output2T, Output3, Output4, Output5, Output6]>(evaluate);
	}

	zip5WithNewErrors<
		Error2T,
		Error3,
		Error4,
		Error5,
		Error6,
		Output2T,
		Output3,
		Output4,
		Output5,
		Output6>(
		o2: Task<Error2T, Output2T>,
		o3: Task<Error3, Output3>,
		o4: Task<Error4, Output4>,
		o5: Task<Error5, Output5>,
		o6: Task<Error6, Output6>,
	): Task<ErrorT | Error2T | Error3 | Error4 | Error5 | Error6, [OutputT, Output2T, Output3, Output4, Output5, Output6]> {
		const evaluate = (input: any): Either<ErrorT | Error2T | Error3 | Error4 | Error5 | Error6, [OutputT, Output2T, Output3, Output4, Output5, Output6]> => {
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

		return new Task<ErrorT | Error2T | Error3 | Error4 | Error5 | Error6, [OutputT, Output2T, Output3, Output4, Output5, Output6]>(evaluate);
	}

	zip6<Output2T, Output3, Output4, Output5, Output6, Output7>(
		o2: Task<ErrorT, Output2T>,
		o3: Task<ErrorT, Output3>,
		o4: Task<ErrorT, Output4>,
		o5: Task<ErrorT, Output5>,
		o6: Task<ErrorT, Output6>,
		o7: Task<ErrorT, Output7>,
	): Task<ErrorT, [OutputT, Output2T, Output3, Output4, Output5, Output6, Output7]> {
		const evaluate = (input: any): Either<ErrorT, [OutputT, Output2T, Output3, Output4, Output5, Output6, Output7]> => {
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

		return new Task<ErrorT, [OutputT, Output2T, Output3, Output4, Output5, Output6, Output7]>(evaluate);
	}

	zip6WithNewErrors<
		Error2T,
		Error3,
		Error4,
		Error5,
		Error6,
		Error7,
		Output2T,
		Output3,
		Output4,
		Output5,
		Output6,
		Output7>(
		o2: Task<Error2T, Output2T>,
		o3: Task<Error3, Output3>,
		o4: Task<Error4, Output4>,
		o5: Task<Error5, Output5>,
		o6: Task<Error6, Output6>,
		o7: Task<Error7, Output7>,
	): Task<ErrorT | Error2T | Error3 | Error4 | Error5 | Error6 | Error7, [OutputT, Output2T, Output3, Output4, Output5, Output6, Output7]> {
		const evaluate = (input: any): Either<ErrorT | Error2T | Error3 | Error4 | Error5 | Error6 | Error7, [OutputT, Output2T, Output3, Output4, Output5, Output6, Output7]> => {
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

		return new Task<ErrorT | Error2T | Error3 | Error4 | Error5 | Error6 | Error7, [OutputT, Output2T, Output3, Output4, Output5, Output6, Output7]>(evaluate);
	}

	// eslint-disable-next-line @typescript-eslint/prefer-return-this-type
	bindInput<InputT>(input: InputT): Task<ErrorT, OutputT> {
		return this;
	}

	toAsync(): AsyncTask<ErrorT, OutputT> {
		return new AsyncTask<ErrorT, OutputT>(async (input: any) => this.evaluate(input));
	}

	toTask(): this {
		return this;
	}

	toComputation(): Computation<any, ErrorT, OutputT> {
		return new Computation<any, ErrorT, OutputT>((input: any) => this.evaluate(input));
	}
}
