/* eslint-disable max-nested-callbacks */
import {AsyncComputation} from './AsyncComputation.js';
import {type ContravariantFunctor} from './Contravariant.js';
import {type Either, Right, Left} from './Either.js';
import {type IO} from './IO.js';
import {type Monad} from './Monad.js';
import {SafeComputation} from './SafeComputation.js';
import {Task} from './Task.js';
import {type Effect, type BindEffectType} from './definitions.js';

/**
 * Represents a computation which takes an input of type `InputT` and may fail with an error of type `ErrorT` or succeed with an output of type `OutputT`.
 */
export class Computation<in InputT, out ErrorT, out OutputT> implements Effect<InputT, ErrorT, OutputT>, ContravariantFunctor<InputT> {
	static of<OutputT>(x: OutputT): Computation<any, never, OutputT> {
		return new Computation<any, never, OutputT>(() => new Right<never, OutputT>(x));
	}

	static do(): Computation<any, never, Record<any, any>> {
		return Computation.of({});
	}

	constructor(public readonly evaluate: (input: InputT) => Either<ErrorT, OutputT>) {}

	bindKey<KeyT extends (string | symbol | number), Output2T>(key: KeyT, f: (input: OutputT) => BindEffectType<Output2T>): Computation<InputT, ErrorT, OutputT & Record<KeyT, Output2T>> {
		const resolver = (input: InputT) => {
			const thisResolved = this.evaluate(input);
			if (thisResolved.isLeft()) {
				return new Left<ErrorT, OutputT & Record<KeyT, Output2T>>(thisResolved.get());
			}

			const fResolvedComputation = f(thisResolved.get() as OutputT).toComputation();
			// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
			return fResolvedComputation.map((fResolved: Output2T) => ({...thisResolved.get() as OutputT, [key]: fResolved} as OutputT & Record<KeyT, Output2T>)).evaluate(input);
		};

		return new Computation<InputT, ErrorT, OutputT & Record<KeyT, Output2T>>(resolver);
	}

	tap<EffectT extends BindEffectType<any>>(f: (input: OutputT) => EffectT): this {
		const resolver = (input: InputT) => {
			const thisResolved = this.evaluate(input);
			if (thisResolved.isLeft()) {
				return new Left<ErrorT, OutputT>(thisResolved.get());
			}

			const fResolvedComputation = f(thisResolved.get() as OutputT).toComputation();
			return fResolvedComputation.map(() => thisResolved.get() as OutputT).evaluate(input);
		};

		return new Computation<InputT, ErrorT, OutputT>(resolver) as this;
	}

	thenDo<Output2T>(f: (x: OutputT) => Output2T): Computation<InputT, ErrorT, Output2T> {
		const evaluate = (input: InputT) => {
			const either = this.evaluate(input);
			if (either.isLeft()) {
				return new Left<ErrorT, Output2T>(either.get());
			}

			return new Right<ErrorT, Output2T>(f(either.get() as OutputT));
		};

		return new Computation<InputT, ErrorT, Output2T>(evaluate);
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	thenDoIO<Output2T>(io: IO<Output2T>): Computation<InputT, ErrorT, Output2T> {
		return this.thenDo(() => io.evaluate());
	}

	thenDoWithNewError<Error2T, Output2T>(f: (x: OutputT) => Either<Error2T, Output2T>): Computation<InputT, ErrorT | Error2T, Output2T> {
		const evaluate = (input: InputT) => {
			const either = this.evaluate(input);
			if (either.isLeft()) {
				return new Left<ErrorT | Error2T, Output2T>(either.get());
			}

			return f(either.get() as OutputT);
		};

		return new Computation<InputT, ErrorT | Error2T, Output2T>(evaluate);
	}

	thenDoTask<Error2T, Output2T>(task: Task<Error2T, Output2T>): Computation<InputT, ErrorT | Error2T, Output2T> {
		return this.thenDoWithNewError(() => task.evaluate());
	}

	thenDoWithSameInput<Input2T extends InputT, Output2T>(f: (input: Input2T) => Output2T): Computation<Input2T, ErrorT, Output2T> {
		const resolver = (input: Input2T) => {
			const either = this.evaluate(input);
			if (either.isLeft()) {
				return new Left<ErrorT, Output2T>(either.get());
			}

			return new Right<ErrorT, Output2T>(f(input));
		};

		return new Computation<Input2T, ErrorT, Output2T>(resolver);
	}

	thenDoSafeComputationWithSameInput<Input2T extends InputT, Output2T>(computation: SafeComputation<Input2T, Output2T>): Computation<Input2T, ErrorT, Output2T> {
		return this.thenDoWithSameInput((input: Input2T) => computation.evaluate(input));
	}

	thenDoWithNewInput<Input2T, Output2T>(f: (input: Input2T) => Output2T): Computation<[InputT, Input2T], ErrorT, Output2T> {
		const evaluate = ([input, input2]: [InputT, Input2T]) => {
			const either = this.evaluate(input);
			if (either.isLeft()) {
				return new Left<ErrorT, Output2T>(either.get());
			}

			return new Right<ErrorT, Output2T>(f(input2));
		};

		return new Computation<[InputT, Input2T], ErrorT, Output2T>(evaluate);
	}

	thenDoSafeComputation<Input2T, Output2T>(computation: SafeComputation<Input2T, Output2T>): Computation<[InputT, Input2T], ErrorT, Output2T> {
		return this.thenDoWithNewInput((input: Input2T) => computation.evaluate(input));
	}

	thenDoWithSameInputAndNewError<Input2T extends InputT, Error2T, Output2T>(f: (input: Input2T) => Either<Error2T, Output2T>): Computation<Input2T, ErrorT | Error2T, Output2T> {
		const evaluate = (input: Input2T) => {
			const either = this.evaluate(input);
			if (either.isLeft()) {
				return new Left<ErrorT | Error2T, Output2T>(either.get());
			}

			return f(input);
		};

		return new Computation<Input2T, ErrorT | Error2T, Output2T>(evaluate);
	}

	thenDoComputationWithSameInput<Error2T, Output2T>(c: Computation<InputT, Error2T, Output2T>): Computation<InputT, ErrorT | Error2T, Output2T> {
		return this.thenDoWithSameInputAndNewError((input: InputT) => c.evaluate(input));
	}

	thenDoWithNewInputAndError<Input2T, Error2T, Output2T>(f: (input: Input2T) => Either<Error2T, Output2T>): Computation<[InputT, Input2T], ErrorT | Error2T, Output2T> {
		const evaluate = ([input, input2]: [InputT, Input2T]) => {
			const either = this.evaluate(input);
			if (either.isLeft()) {
				return new Left<ErrorT | Error2T, Output2T>(either.get());
			}

			return f(input2);
		};

		return new Computation<[InputT, Input2T], ErrorT | Error2T, Output2T>(evaluate);
	}

	thenDoComputation<Input2T, Error2T, Output2T>(c: Computation<Input2T, Error2T, Output2T>): Computation<[InputT, Input2T], ErrorT | Error2T, Output2T> {
		return this.thenDoWithNewInputAndError((input: Input2T) => c.evaluate(input));
	}

	orElseDo<Output2T>(f: (..._: any[]) => Output2T): SafeComputation<InputT, Either<OutputT, Output2T>> {
		const resolver = (input: InputT) => {
			const either = this.evaluate(input);
			if (either.isLeft()) {
				return new Right<OutputT, Output2T>(f());
			}

			return new Left<OutputT, Output2T>(either.get() as OutputT);
		};

		return new SafeComputation<InputT, Either<OutputT, Output2T>>(resolver);
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	orElseDoIO<Output2T>(io: IO<Output2T>): SafeComputation<InputT, Either<OutputT, Output2T>> {
		return this.orElseDo(() => io.evaluate());
	}

	orElseDoWithSameInput<Input2T extends InputT, Output2T>(f: (input: Input2T) => Output2T): Computation<Input2T, ErrorT, Either<OutputT, Output2T>> {
		const resolver = (input: Input2T) => {
			const either = this.evaluate(input);
			if (either.isLeft()) {
				return new Right<ErrorT, Either<OutputT, Output2T>>(new Right<OutputT, Output2T>(f(input)));
			}

			return new Right<ErrorT, Either<OutputT, Output2T>>(new Left<OutputT, Output2T>(either.get() as OutputT));
		};

		return new Computation<Input2T, ErrorT, Either<OutputT, Output2T>>(resolver);
	}

	orElseDoSafeComputationWithSameInput<Input2T extends InputT, Output2T>(computation: SafeComputation<Input2T, Output2T>): Computation<Input2T, ErrorT, Either<OutputT, Output2T>> {
		return this.orElseDoWithSameInput((input: Input2T) => computation.evaluate(input));
	}

	orElseDoWithNewInput<Input2T, Output2T>(f: (input: Input2T) => Output2T): Computation<[InputT, Input2T], ErrorT, Either<OutputT, Output2T>> {
		const evaluate = ([input, input2]: [InputT, Input2T]) => {
			const either = this.evaluate(input);
			if (either.isLeft()) {
				return new Right<ErrorT, Either<OutputT, Output2T>>(new Right<OutputT, Output2T>(f(input2)));
			}

			return new Right<ErrorT, Either<OutputT, Output2T>>(new Left<OutputT, Output2T>(either.get() as OutputT));
		};

		return new Computation<[InputT, Input2T], ErrorT, Either<OutputT, Output2T>>(evaluate);
	}

	orElseDoSafeComputationWithNewInput<Input2T, Output2T>(computation: SafeComputation<Input2T, Output2T>): Computation<[InputT, Input2T], ErrorT, Either<OutputT, Output2T>> {
		return this.orElseDoWithNewInput((input: Input2T) => computation.evaluate(input));
	}

	orElseDoWithNewError<Error2T, Output2T>(f: (..._: any[]) => Either<Error2T, Output2T>): Computation<InputT, ErrorT | Error2T, Either<OutputT, Output2T>> {
		const evaluate = (input: InputT) => {
			const either = this.evaluate(input);
			if (either.isLeft()) {
				const otherEvaluated = f();
				if (otherEvaluated.isLeft()) {
					return otherEvaluated as Left<ErrorT | Error2T, Either<OutputT, Output2T>>;
				}

				return new Right<ErrorT | Error2T, Either<OutputT, Output2T>>(new Right<OutputT, Output2T>(otherEvaluated.get() as Output2T));
			}

			return new Right<ErrorT | Error2T, Either<OutputT, Output2T>>(new Left<OutputT, Output2T>(either.get() as OutputT));
		};

		return new Computation<InputT, ErrorT | Error2T, Either<OutputT, Output2T>>(evaluate);
	}

	orElseDoTask<Error2T, Output2T>(task: Task<Error2T, Output2T>): Computation<InputT, ErrorT | Error2T, Either<OutputT, Output2T>> {
		return this.orElseDoWithNewError(() => task.evaluate());
	}

	orElseDoWithSameInputAndNewError<Input2T extends InputT, Error2T, Output2T>(f: (input: Input2T) => Either<Error2T, Output2T>): Computation<Input2T, ErrorT | Error2T, Either<OutputT, Output2T>> {
		const evaluate = (input: Input2T) => {
			const either = this.evaluate(input);
			if (either.isLeft()) {
				const otherEvaluated = f(input);
				if (otherEvaluated.isLeft()) {
					return otherEvaluated as Left<ErrorT | Error2T, Either<OutputT, Output2T>>;
				}

				return new Right<ErrorT | Error2T, Either<OutputT, Output2T>>(new Right<OutputT, Output2T>(otherEvaluated.get() as Output2T));
			}

			return new Right<ErrorT | Error2T, Either<OutputT, Output2T>>(new Left<OutputT, Output2T>(either.get() as OutputT));
		};

		return new Computation<Input2T, ErrorT | Error2T, Either<OutputT, Output2T>>(evaluate);
	}

	orElseDoComputationWithSameInput<Input2T extends InputT, Error2T, Output2T>(c: Computation<Input2T, Error2T, Output2T>): Computation<Input2T, ErrorT | Error2T, Either<OutputT, Output2T>> {
		return this.orElseDoWithSameInputAndNewError((input: Input2T) => c.evaluate(input));
	}

	orElseDoWithNewInputAndError<Input2T, Error2T, Output2T>(f: (input: Input2T) => Either<Error2T, Output2T>): Computation<[InputT, Input2T], ErrorT | Error2T, Either<OutputT, Output2T>> {
		const evaluate = ([input1, input2]: [InputT, Input2T]) => {
			const either = this.evaluate(input1);
			if (either.isLeft()) {
				const otherEvaluated = f(input2);
				if (otherEvaluated.isLeft()) {
					return otherEvaluated as Left<ErrorT | Error2T, Either<OutputT, Output2T>>;
				}

				return new Right<ErrorT | Error2T, Either<OutputT, Output2T>>(new Right<OutputT, Output2T>(otherEvaluated.get() as Output2T));
			}

			return new Right<ErrorT | Error2T, Either<OutputT, Output2T>>(new Left<OutputT, Output2T>(either.get() as OutputT));
		};

		return new Computation<[InputT, Input2T], ErrorT | Error2T, Either<OutputT, Output2T>>(evaluate);
	}

	orElseDoComputation<Input2T, Error2T, Output2T>(c: Computation<Input2T, Error2T, Output2T>): Computation<[InputT, Input2T], ErrorT | Error2T, Either<OutputT, Output2T>> {
		return this.orElseDoWithNewInputAndError((input: Input2T) => c.evaluate(input));
	}

	map<Output2T>(f: (x: OutputT) => Output2T): Computation<InputT, ErrorT, Output2T> {
		const evaluate = (input: InputT) => this.map(f).evaluate(input);
		return new Computation<InputT, ErrorT, Output2T>(evaluate);
	}

	mapWithNewError<Error2T, Output2T>(f: (x: OutputT) => Either<Error2T, Output2T>): Computation<InputT, ErrorT | Error2T, Output2T> {
		const evaluate = (input: InputT) => this.mapWithNewError(f).evaluate(input);
		return new Computation<InputT, ErrorT | Error2T, Output2T>(evaluate);
	}

	contramap<Input2T>(f: (x: Input2T) => InputT): Computation<Input2T, ErrorT, OutputT> {
		const evaluate = (input: Input2T) => this.evaluate(f(input));
		return new Computation<Input2T, ErrorT, OutputT>(evaluate);
	}

	contramapWithNewError<Input2T, Error2T>(f: (x: Input2T) => Either<Error2T, InputT>): Computation<Input2T, ErrorT | Error2T, OutputT> {
		const evaluate = (input: Input2T) => {
			const either = f(input);
			return either.flatMap(i => this.evaluate(i));
		};

		return new Computation<Input2T, ErrorT | Error2T, OutputT>(evaluate);
	}

	apply<Output2T>(f: Computation<InputT, ErrorT, ((x: OutputT) => Output2T)>): Computation<InputT, ErrorT, Output2T> {
		const evaluate = (input: InputT) => {
			const either = this.evaluate(input);
			return either.flatMap(output => f.map(g => g(output)).evaluate(input));
		};

		return new Computation<InputT, ErrorT, Output2T>(evaluate);
	}

	pure<Output2T>(x: Output2T): Computation<any, undefined, Output2T> {
		const evaluate = () => new Right<undefined, Output2T>(x);
		return new Computation<any, undefined, Output2T>(evaluate);
	}

	flatMap<Output2T>(f: (x: OutputT) => Computation<InputT, ErrorT, Output2T>): Computation<InputT, ErrorT, Output2T> {
		const evaluate = (input: InputT) => {
			const either = this.evaluate(input);
			return either.flatMap(output => f(output).evaluate(input));
		};

		return new Computation<InputT, ErrorT, Output2T>(evaluate);
	}

	flatMapWithNewInput<Input2T, Output2T>(f: (x: OutputT) => SafeComputation<Input2T, Output2T>): Computation<[InputT, Input2T], ErrorT, Output2T> {
		const evaluate = ([input1, input2]: [InputT, Input2T]) => {
			const either = this.evaluate(input1);
			if (either.isLeft()) {
				either.get() as Left<ErrorT, Output2T>;
			}

			return new Right<ErrorT, Output2T>(f(either.get() as OutputT).evaluate(input2));
		};

		return new Computation<[InputT, Input2T], ErrorT, Output2T>(evaluate);
	}

	flatMapWithNewError<Error2T, Output2T>(f: (x: OutputT) => Computation<InputT, Error2T, Output2T>): Computation<InputT, ErrorT | Error2T, Output2T> {
		const evaluate = (input: InputT) => {
			const either = this.evaluate(input);
			return either.flatMap(output => f(output).evaluate(input));
		};

		return new Computation<InputT, ErrorT | Error2T, Output2T>(evaluate);
	}

	flatMapWithNewInputAndNewError<Input2T, Error2T, Output2T>(
		f: (x: OutputT) => Computation<Input2T, Error2T, Output2T>,
	): Computation<[InputT, Input2T], ErrorT | Error2T, Output2T> {
		const evaluate = ([input1, input2]: [InputT, Input2T]) => {
			const either = this.evaluate(input1);
			if (either.isLeft()) {
				either.get() as Left<ErrorT, Output2T>;
			}

			return f(either.get() as OutputT).evaluate(input2);
		};

		return new Computation<[InputT, Input2T], ErrorT | Error2T, Output2T>(evaluate);
	}

	zip<Output2T>(other: Computation<InputT, ErrorT, Output2T>): Computation<InputT, ErrorT, [OutputT, Output2T]> {
		const evaluate = (input: InputT): Either<ErrorT, [OutputT, Output2T]> => {
			const either = this.evaluate(input);
			return either.flatMap(output => other.evaluate(input).map(output2 => [output, output2]));
		};

		return new Computation<InputT, ErrorT, [OutputT, Output2T]>(evaluate);
	}

	zipWithNewError<Error2T, Output2T>(other: Computation<InputT, Error2T, Output2T>): Computation<InputT, ErrorT | Error2T, [OutputT, Output2T]> {
		const evaluate = (input: InputT): Either<ErrorT | Error2T, [OutputT, Output2T]> => {
			const either = this.evaluate(input);
			return either.flatMap(output => other.evaluate(input).map(output2 => [output, output2]));
		};

		return new Computation<InputT, ErrorT | Error2T, [OutputT, Output2T]>(evaluate);
	}

	zip2<O2T, O3T>(
		other1: Computation<InputT, ErrorT, O2T>,
		other2: Computation<InputT, ErrorT, O3T>,
	): Computation<InputT, ErrorT, [OutputT, O2T, O3T]> {
		const evaluate = (input: InputT): Either<ErrorT, [OutputT, O2T, O3T]> => {
			const either = this.evaluate(input);
			return either.flatMap(output => other1.evaluate(input).flatMap(output2 => other2.evaluate(input).map(output3 => [output, output2, output3])));
		};

		return new Computation<InputT, ErrorT, [OutputT, O2T, O3T]>(evaluate);
	}

	zip2WithNewErrors<E2T, E3T, O2T, O3T>(
		other1: Computation<InputT, E2T, O2T>,
		other2: Computation<InputT, E3T, O3T>,
	): Computation<InputT, ErrorT | E2T | E3T, [OutputT, O2T, O3T]> {
		const evaluate = (input: InputT): Either<ErrorT | E2T | E3T, [OutputT, O2T, O3T]> => {
			const either = this.evaluate(input);
			return either.flatMap(output => other1.evaluate(input).flatMap(output2 => other2.evaluate(input).map(output3 => [output, output2, output3])));
		};

		return new Computation<InputT, ErrorT | E2T | E3T, [OutputT, O2T, O3T]>(evaluate);
	}

	zip3<O2T, O3T, O4T>(
		other1: Computation<InputT, ErrorT, O2T>,
		other2: Computation<InputT, ErrorT, O3T>,
		other3: Computation<InputT, ErrorT, O4T>,
	): Computation<InputT, ErrorT, [OutputT, O2T, O3T, O4T]> {
		const evaluate = (input: InputT): Either<ErrorT, [OutputT, O2T, O3T, O4T]> => {
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

		return new Computation<InputT, ErrorT, [OutputT, O2T, O3T, O4T]>(evaluate);
	}

	zip3WithNewErrors<E2T, E3T, E4T, O2T, O3T, O4T>(
		other1: Computation<InputT, E2T, O2T>,
		other2: Computation<InputT, E3T, O3T>,
		other3: Computation<InputT, E4T, O4T>,
	): Computation<InputT, ErrorT | E2T | E3T | E4T, [OutputT, O2T, O3T, O4T]> {
		const evaluate = (input: InputT): Either<ErrorT | E2T | E3T | E4T, [OutputT, O2T, O3T, O4T]> => {
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

		return new Computation<InputT, ErrorT | E2T | E3T | E4T, [OutputT, O2T, O3T, O4T]>(evaluate);
	}

	zip4<O2T, O3T, O4T, O5T>(
		other1: Computation<InputT, ErrorT, O2T>,
		other2: Computation<InputT, ErrorT, O3T>,
		other3: Computation<InputT, ErrorT, O4T>,
		other4: Computation<InputT, ErrorT, O5T>,
	): Computation<InputT, ErrorT, [OutputT, O2T, O3T, O4T, O5T]> {
		const evaluate = (input: InputT): Either<ErrorT, [OutputT, O2T, O3T, O4T, O5T]> => {
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

		return new Computation<InputT, ErrorT, [OutputT, O2T, O3T, O4T, O5T]>(evaluate);
	}

	zip4WithNewErrors<E2T, E3T, E4T, E5T, O2T, O3T, O4T, O5T>(
		other1: Computation<InputT, E2T, O2T>,
		other2: Computation<InputT, E3T, O3T>,
		other3: Computation<InputT, E4T, O4T>,
		other4: Computation<InputT, E5T, O5T>,
	): Computation<InputT, ErrorT | E2T | E3T | E4T | E5T, [OutputT, O2T, O3T, O4T, O5T]> {
		const evaluate = (input: InputT): Either<ErrorT | E2T | E3T | E4T | E5T, [OutputT, O2T, O3T, O4T, O5T]> => {
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

		return new Computation<InputT, ErrorT | E2T | E3T | E4T | E5T, [OutputT, O2T, O3T, O4T, O5T]>(evaluate);
	}

	zip5<O2T, O3T, O4T, O5T, O6T>(
		other1: Computation<InputT, ErrorT, O2T>,
		other2: Computation<InputT, ErrorT, O3T>,
		other3: Computation<InputT, ErrorT, O4T>,
		other4: Computation<InputT, ErrorT, O5T>,
		other5: Computation<InputT, ErrorT, O6T>,
	): Computation<InputT, ErrorT, [OutputT, O2T, O3T, O4T, O5T, O6T]> {
		const evaluate = (input: InputT): Either<ErrorT, [OutputT, O2T, O3T, O4T, O5T, O6T]> => {
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

		return new Computation<InputT, ErrorT, [OutputT, O2T, O3T, O4T, O5T, O6T]>(evaluate);
	}

	zip5WithNewErrors<E2T, E3T, E4T, E5T, E6T, O2T, O3T, O4T, O5T, O6T>(
		other1: Computation<InputT, E2T, O2T>,
		other2: Computation<InputT, E3T, O3T>,
		other3: Computation<InputT, E4T, O4T>,
		other4: Computation<InputT, E5T, O5T>,
		other5: Computation<InputT, E6T, O6T>,
	): Computation<InputT, ErrorT | E2T | E3T | E4T | E5T | E6T, [OutputT, O2T, O3T, O4T, O5T, O6T]> {
		const evaluate = (input: InputT): Either<ErrorT | E2T | E3T | E4T | E5T | E6T, [OutputT, O2T, O3T, O4T, O5T, O6T]> => {
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

		return new Computation<InputT, ErrorT | E2T | E3T | E4T | E5T | E6T, [OutputT, O2T, O3T, O4T, O5T, O6T]>(evaluate);
	}

	zip6<O2T, O3T, O4T, O5T, O6T, O7T>(
		other1: Computation<InputT, ErrorT, O2T>,
		other2: Computation<InputT, ErrorT, O3T>,
		other3: Computation<InputT, ErrorT, O4T>,
		other4: Computation<InputT, ErrorT, O5T>,
		other5: Computation<InputT, ErrorT, O6T>,
		other6: Computation<InputT, ErrorT, O7T>,
	): Computation<InputT, ErrorT, [OutputT, O2T, O3T, O4T, O5T, O6T, O7T]> {
		const evaluate = (input: InputT): Either<ErrorT, [OutputT, O2T, O3T, O4T, O5T, O6T, O7T]> => {
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

		return new Computation<InputT, ErrorT, [OutputT, O2T, O3T, O4T, O5T, O6T, O7T]>(evaluate);
	}

	zip6WithNewErrors<E2T, E3T, E4T, E5T, E6T, E7T, O2T, O3T, O4T, O5T, O6T, O7T>(
		other1: Computation<InputT, E2T, O2T>,
		other2: Computation<InputT, E3T, O3T>,
		other3: Computation<InputT, E4T, O4T>,
		other4: Computation<InputT, E5T, O5T>,
		other5: Computation<InputT, E6T, O6T>,
		other6: Computation<InputT, E7T, O7T>,
	): Computation<InputT, ErrorT | E2T | E3T | E4T | E5T | E6T | E7T, [OutputT, O2T, O3T, O4T, O5T, O6T, O7T]> {
		const evaluate = (input: InputT): Either<ErrorT | E2T | E3T | E4T | E5T | E6T | E7T, [OutputT, O2T, O3T, O4T, O5T, O6T, O7T]> => {
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

		return new Computation<InputT, ErrorT | E2T | E3T | E4T | E5T | E6T | E7T, [OutputT, O2T, O3T, O4T, O5T, O6T, O7T]>(evaluate);
	}

	zipN<Output2T>(...us: Array<Computation<InputT, ErrorT, Output2T>>): Computation<InputT, ErrorT, [OutputT, ...Output2T[]]> {
		const evaluate = (input: InputT): Either<ErrorT, [OutputT, ...Output2T[]]> => {
			const ownOutput = this.evaluate(input);
			if (ownOutput.isLeft()) {
				return ownOutput.map(output => [output]) as Either<ErrorT, [OutputT, ...Output2T[]]>;
			}

			const otherOutputs = us.map(u => u.evaluate(input));
			const ownOutputValue = ownOutput.get() as OutputT;
			const allOutputValues: [OutputT, ...Output2T[]] = [ownOutputValue];
			for (const otherOutput of otherOutputs) {
				if (otherOutput.isLeft()) {
					return otherOutput as Either<ErrorT, [OutputT, ...Output2T[]]>;
				}

				allOutputValues.push(otherOutput.get() as Output2T);
			}

			return new Right(allOutputValues as [OutputT, ...Output2T[]]);
		};

		return new Computation<InputT, ErrorT, [OutputT, ...Output2T[]]>(evaluate);
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	zipNWithNewErrors<Error2T, Output2T>(...others: Array<Computation<InputT, Error2T, Output2T>>): Computation<InputT, ErrorT | Error2T, [OutputT, ...Output2T[]]> {
		const evaluate = (input: InputT): Either<ErrorT | Error2T, [OutputT, ...Output2T[]]> => {
			const ownOutput = this.evaluate(input);
			if (ownOutput.isLeft()) {
				return ownOutput.map(output => [output]) as Either<ErrorT | Error2T, [OutputT, ...Output2T[]]>;
			}

			const otherOutputs = others.map(u => u.evaluate(input));
			const ownOutputValue = ownOutput.get() as OutputT;
			const allOutputValues: [OutputT, ...Output2T[]] = [ownOutputValue];
			for (const otherOutput of otherOutputs) {
				if (otherOutput.isLeft()) {
					return otherOutput as Either<ErrorT | Error2T, [OutputT, ...Output2T[]]>;
				}

				allOutputValues.push(otherOutput.get() as Output2T);
			}

			return new Right(allOutputValues as [OutputT, ...Output2T[]]);
		};

		return new Computation<InputT, ErrorT | Error2T, [OutputT, ...Output2T[]]>(evaluate);
	}

	toAsync(): AsyncComputation<InputT, ErrorT, OutputT> {
		return new AsyncComputation(async (input: InputT) => this.evaluate(input));
	}

	toComputation(): this {
		return this;
	}

	bindInput(input: InputT): Task<ErrorT, OutputT> {
		return new Task(() => this.evaluate(input));
	}
}
