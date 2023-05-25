import {type ContravariantFunctor} from './Contravariant.js';
import {type Monad} from './Monad.js';

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
