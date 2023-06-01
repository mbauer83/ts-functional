import {AsyncSafeComputation} from './AsyncSafeComputation.js';
import {Computation} from './Computation.js';
import {type ContravariantFunctor} from './Contravariant.js';
import {type Either} from './Either.js';
import {type IO} from './IO.js';
import {type Monad} from './Monad.js';
import {type Task} from './Task.js';

export class SafeComputation<Input, out Output> implements Monad<Output>, ContravariantFunctor<Input> {
	constructor(public readonly evaluate: (input: Input) => Output) {}

	thenDo<Output2>(f: (..._: any[]) => Output2): SafeComputation<Input, Output2> {
		return new SafeComputation<Input, Output2>(input => f(this.evaluate(input)));
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	thenDoIO<Output2>(io: IO<Output2>): SafeComputation<Input, Output2> {
		return this.thenDo(() => io.evaluate());
	}

	thenDoWithError<Error, Output2>(f: (..._: any[]) => Either<Error, Output2>): Computation<Input, Error, Output2> {
		return new Computation<Input, Error, Output2>(input => f(this.evaluate(input)));
	}

	thenDoTask<Error, Output2>(task: Task<Error, Output2>): Computation<Input, Error, Output2> {
		return this.thenDoWithError(() => task.evaluate());
	}

	thenDoWithSameInput<Output2>(f: (input: Input) => Output2): SafeComputation<Input, Output2> {
		return new SafeComputation<Input, Output2>((input: Input) => {
			this.evaluate(input);
			return f(input);
		});
	}

	thenDoSafeComputation<Output2>(computation: SafeComputation<Input, Output2>): SafeComputation<Input, Output2> {
		return this.thenDoWithSameInput((input: Input) => computation.evaluate(input));
	}

	thenDoWithSameInputAndError<Error, Output2>(
		f: (input: Input) => Either<Error, Output2>,
	): Computation<Input, Error, Output2> {
		return new Computation<Input, Error, Output2>(input => {
			this.evaluate(input);
			return f(input);
		});
	}

	thenDoComputationWithSameInput<Error, Output2>(
		computation: Computation<Input, Error, Output2>,
	): Computation<Input, Error, Output2> {
		return this.thenDoWithSameInputAndError(input => computation.evaluate(input));
	}

	thenDoWithNewInputAndError<Input2, Error, Output2>(
		f: (input: Input2) => Either<Error, Output2>,
	): Computation<[Input, Input2], Error, Output2> {
		const resolver = ([input, input2]: [Input, Input2]) => {
			this.evaluate(input);
			return f(input2);
		};

		return new Computation<[Input, Input2], Error, Output2>(resolver);
	}

	thenDoComputationWithNewInput<Input2, Error2, Output2>(
		computation: Computation<Input2, Error2, Output2>,
	): Computation<[Input, Input2], Error2, Output2> {
		return this.thenDoWithNewInputAndError(input2 => computation.evaluate(input2));
	}

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

	toAsync(): AsyncSafeComputation<Input, Output> {
		return new AsyncSafeComputation<Input, Output>(async input => this.evaluate(input));
	}
}
