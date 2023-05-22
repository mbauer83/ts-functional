import {type ContravariantFunctor} from './Contravariant.js';
import {type Either, Right} from './Either.js';
import {type Monad} from './Monad.js';

// eslint-disable-next-line @typescript-eslint/naming-convention
export class IO<T> implements Monad<T> {
	constructor(public readonly evaluate: () => T) {}

	map<U>(f: (x: T) => U): IO<U> {
		const evaluate = () => f(this.evaluate());
		return new IO(evaluate);
	}

	apply<U>(f: IO<(x: T) => U>): IO<U> {
		const evaluate = () => f.evaluate()(this.evaluate());
		return new IO(evaluate);
	}

	pure<U>(x: U): IO<U> {
		const evaluate = () => x;
		return new IO(evaluate);
	}

	flatMap<U>(f: (x: T) => IO<U>): IO<U> {
		const evaluate = () => f(this.evaluate()).evaluate();
		return new IO(evaluate);
	}

	zip<U>(other: IO<U>): IO<[T, U]> {
		const evaluate: () => [T, U] = () => [this.evaluate(), other.evaluate()];
		return new IO(evaluate);
	}

	zip2<U, V>(
		u: IO<U>,
		v: IO<V>,
	): IO<[T, U, V]> {
		const evaluate: () => [T, U, V]
            = () => [this.evaluate(), u.evaluate(), v.evaluate()];
		return new IO(evaluate);
	}

	zip3<U, V, W>(
		u: IO<U>,
		v: IO<V>,
		w: IO<W>,
	): IO<[T, U, V, W]> {
		const evaluate: () => [T, U, V, W]
            = () => [this.evaluate(), u.evaluate(), v.evaluate(), w.evaluate()];
		return new IO(evaluate);
	}

	zip4<U, V, W, X>(
		u: IO<U>,
		v: IO<V>,
		w: IO<W>,
		x: IO<X>,
	): IO<[T, U, V, W, X]> {
		const evaluate: () => [T, U, V, W, X]
            = () => [this.evaluate(), u.evaluate(), v.evaluate(), w.evaluate(), x.evaluate()];
		return new IO(evaluate);
	}

	zip5<U, V, W, X, Y>(
		u: IO<U>,
		v: IO<V>,
		w: IO<W>,
		x: IO<X>,
		y: IO<Y>,
	): IO<[T, U, V, W, X, Y]> {
		const evaluate: () => [T, U, V, W, X, Y]
            = () => [this.evaluate(), u.evaluate(), v.evaluate(), w.evaluate(), x.evaluate(), y.evaluate()];
		return new IO(evaluate);
	}

	zip6<U, V, W, X, Y, Z>(
		u: IO<U>,
		v: IO<V>,
		w: IO<W>,
		x: IO<X>,
		y: IO<Y>,
		z: IO<Z>,
	): IO<[T, U, V, W, X, Y, Z]> {
		const evaluate: () => [T, U, V, W, X, Y, Z]
            = () => [this.evaluate(), u.evaluate(), v.evaluate(), w.evaluate(), x.evaluate(), y.evaluate(), z.evaluate()];
		return new IO(evaluate);
	}

	zipN<U>(...us: Array<IO<U>>): IO<[T, ...U[]]> {
		const evaluate: () => [T, ...U[]]
            = () => [this.evaluate(), ...us.map(u => u.evaluate())];
		return new IO(evaluate);
	}
}

export class Computation<Input, Error, Output> implements Monad<Output>, ContravariantFunctor<Input> {
	constructor(public readonly evaluate: (input: Input) => Either<Error, Output>) {}

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
										// eslint-disable-next-line max-nested-callbacks
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
										// eslint-disable-next-line max-nested-callbacks
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

export class SafeComputation<Input, Output> implements Monad<Output>, ContravariantFunctor<Input> {
	constructor(public readonly evaluate: (input: Input) => Output) {}

	contramap<PreInput>(f: (input: PreInput) => Input): SafeComputation<PreInput, Output> {
		return new SafeComputation<PreInput, Output>(input => this.evaluate(f(input)));
	}

	map<Output2>(f: (output: Output) => Output2): SafeComputation<Input, Output2> {
		return new SafeComputation<Input, Output2>(input => f(this.evaluate(input)));
	}

	apply<Output2>(f: SafeComputation<Input, (x: Output) => Output2>): SafeComputation<Input, Output2> {
		return f.flatMap(g => this.map(g));
	}

	pure<Output2>(x: Output2): SafeComputation<any, Output2> {
		return new SafeComputation<any, Output2>(() => x);
	}

	flatMap<Output2>(f: (x: Output) => SafeComputation<Input, Output2>): SafeComputation<Input, Output2> {
		return new SafeComputation<Input, Output2>(input => f(this.evaluate(input)).evaluate(input));
	}

	zip<Output2>(other: SafeComputation<Input, Output2>): SafeComputation<Input, [Output, Output2]> {
		const evaluate = (input: Input): [Output, Output2] => [this.evaluate(input), other.evaluate(input)];

		return new SafeComputation<Input, [Output, Output2]>(evaluate);
	}

	zip2<Output2, Output3>(
		o2: SafeComputation<Input, Output2>,
		o3: SafeComputation<Input, Output3>,
	): SafeComputation<Input, [Output, Output2, Output3]> {
		const evaluate = (input: Input): [Output, Output2, Output3] => [
			this.evaluate(input),
			o2.evaluate(input),
			o3.evaluate(input),
		];

		return new SafeComputation<Input, [Output, Output2, Output3]>(evaluate);
	}

	zip3<Output2, Output3, Output4>(
		o2: SafeComputation<Input, Output2>,
		o3: SafeComputation<Input, Output3>,
		o4: SafeComputation<Input, Output4>,
	): SafeComputation<Input, [Output, Output2, Output3, Output4]> {
		const evaluate = (input: Input): [Output, Output2, Output3, Output4] => [
			this.evaluate(input),
			o2.evaluate(input),
			o3.evaluate(input),
			o4.evaluate(input),
		];

		return new SafeComputation<Input, [Output, Output2, Output3, Output4]>(evaluate);
	}

	zip4<Output2, Output3, Output4, Output5>(
		o2: SafeComputation<Input, Output2>,
		o3: SafeComputation<Input, Output3>,
		o4: SafeComputation<Input, Output4>,
		o5: SafeComputation<Input, Output5>,
	): SafeComputation<Input, [Output, Output2, Output3, Output4, Output5]> {
		const evaluate = (input: Input): [Output, Output2, Output3, Output4, Output5] => [
			this.evaluate(input),
			o2.evaluate(input),
			o3.evaluate(input),
			o4.evaluate(input),
			o5.evaluate(input),
		];

		return new SafeComputation<Input, [Output, Output2, Output3, Output4, Output5]>(evaluate);
	}

	zip5<Output2, Output3, Output4, Output5, Output6>(
		o2: SafeComputation<Input, Output2>,
		o3: SafeComputation<Input, Output3>,
		o4: SafeComputation<Input, Output4>,
		o5: SafeComputation<Input, Output5>,
		o6: SafeComputation<Input, Output6>,
	): SafeComputation<Input, [Output, Output2, Output3, Output4, Output5, Output6]> {
		const evaluate = (input: Input): [Output, Output2, Output3, Output4, Output5, Output6] => [
			this.evaluate(input),
			o2.evaluate(input),
			o3.evaluate(input),
			o4.evaluate(input),
			o5.evaluate(input),
			o6.evaluate(input),
		];

		return new SafeComputation<Input, [Output, Output2, Output3, Output4, Output5, Output6]>(evaluate);
	}

	zip6<Output2, Output3, Output4, Output5, Output6, Output7>(
		o2: SafeComputation<Input, Output2>,
		o3: SafeComputation<Input, Output3>,
		o4: SafeComputation<Input, Output4>,
		o5: SafeComputation<Input, Output5>,
		o6: SafeComputation<Input, Output6>,
		o7: SafeComputation<Input, Output7>,
	): SafeComputation<Input, [Output, Output2, Output3, Output4, Output5, Output6, Output7]> {
		const evaluate = (input: Input): [Output, Output2, Output3, Output4, Output5, Output6, Output7] => [
			this.evaluate(input),
			o2.evaluate(input),
			o3.evaluate(input),
			o4.evaluate(input),
			o5.evaluate(input),
			o6.evaluate(input),
			o7.evaluate(input),
		];

		return new SafeComputation<Input, [Output, Output2, Output3, Output4, Output5, Output6, Output7]>(evaluate);
	}

	zipN<Output2>(...others: Array<SafeComputation<Input, Output2>>): SafeComputation<Input, [Output, ...Output2[]]> {
		const evaluate = (input: Input): [Output, ...Output2[]] => [
			this.evaluate(input),
			...others.map(o => o.evaluate(input)),
		];

		return new SafeComputation<Input, [Output, ...Output2[]]>(evaluate);
	}
}

export class Task<Error, Output> implements Monad<Output> {
	constructor(public readonly evaluate: (_: any) => Either<Error, Output>) {}

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
										// eslint-disable-next-line max-nested-callbacks
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
										// eslint-disable-next-line max-nested-callbacks
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
}
