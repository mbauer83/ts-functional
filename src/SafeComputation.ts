import {AsyncSafeComputation} from './AsyncSafeComputation.js';
import {Computation} from './Computation.js';
import {type ContravariantFunctor} from './Contravariant.js';
import {Right, type Either} from './Either.js';
import {IO} from './IO.js';
import {type Task} from './Task.js';
import {type BindEffectType, boundEffectToIO, type Effect} from './definitions.js';

export class SafeComputation<in InputT, out OutputT> implements Effect<InputT, never, OutputT>, ContravariantFunctor<InputT> {
	static of<OutputT>(x: OutputT): SafeComputation<any, OutputT> {
		return new SafeComputation<any, OutputT>(() => x);
	}

	static do(): SafeComputation<any, Record<any, any>> {
		return SafeComputation.of({});
	}

	constructor(public readonly evaluate: (input: InputT) => OutputT) {}

	bindKey<KeyT extends string | number | symbol, Output2T, EffectT extends BindEffectType<Output2T>>(key: KeyT, f: (input: OutputT) => EffectT): SafeComputation<InputT, OutputT & Record<KeyT, Output2T>> {
		return this.flatMap(x => {
			const resolver = (input: InputT) => {
				const thisResolved = this.evaluate(input);
				const effectSafeComputation = boundEffectToIO<Output2T, EffectT>(f(thisResolved)).toSafeComputation();
				const effectResult = effectSafeComputation.evaluate(input);
				return Object.assign({}, thisResolved, {[key]: effectResult} as Record<KeyT, Output2T>);
			};

			return new SafeComputation<InputT, OutputT & Record<KeyT, Output2T>>(resolver);
		});
	}

	tap<EffectT extends BindEffectType<any>>(f: (input: OutputT) => EffectT): this {
		return this.flatMap((x: OutputT) => {
			const resolver = (input: InputT) => {
				this.evaluate(input);
				const effectSafeComputation = boundEffectToIO<EffectT, EffectT>(f(x)).toSafeComputation();
				effectSafeComputation.evaluate(input);
				return x;
			};

			return new SafeComputation<InputT, OutputT>(resolver);
		}) as this;
	}

	thenDo<OutputT2>(f: (..._: any[]) => OutputT2): SafeComputation<InputT, OutputT2> {
		return new SafeComputation<InputT, OutputT2>(input => f(this.evaluate(input)));
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	thenDoIO<OutputT2>(io: IO<OutputT2>): SafeComputation<InputT, OutputT2> {
		return this.thenDo(() => io.evaluate());
	}

	thenDoWithError<ErrorT, OutputT2>(f: (..._: any[]) => Either<ErrorT, OutputT2>): Computation<InputT, ErrorT, OutputT2> {
		return new Computation<InputT, ErrorT, OutputT2>(input => f(this.evaluate(input)));
	}

	thenDoTask<ErrorT, OutputT2>(task: Task<ErrorT, OutputT2>): Computation<InputT, ErrorT, OutputT2> {
		return this.thenDoWithError(() => task.evaluate());
	}

	thenDoWithSameInput<Input2T extends InputT, OutputT2>(f: (input: Input2T) => OutputT2): SafeComputation<Input2T, OutputT2> {
		return new SafeComputation<Input2T, OutputT2>((input: Input2T) => {
			this.evaluate(input);
			return f(input);
		});
	}

	thenDoSafeComputation<OutputT2>(computation: SafeComputation<InputT, OutputT2>): SafeComputation<InputT, OutputT2> {
		return this.thenDoWithSameInput((input: InputT) => computation.evaluate(input));
	}

	thenDoWithSameInputAndError<Input2T extends InputT, ErrorT, OutputT2>(
		f: (input: Input2T) => Either<ErrorT, OutputT2>,
	): Computation<Input2T, ErrorT, OutputT2> {
		return new Computation<Input2T, ErrorT, OutputT2>(input => {
			this.evaluate(input);
			return f(input);
		});
	}

	thenDoComputationWithSameInput<Input2T extends InputT, ErrorT, OutputT2>(
		computation: Computation<Input2T, ErrorT, OutputT2>,
	): Computation<Input2T, ErrorT, OutputT2> {
		return this.thenDoWithSameInputAndError(input => computation.evaluate(input));
	}

	thenDoWithNewInputAndError<InputT2, ErrorT, OutputT2>(
		f: (input: InputT2) => Either<ErrorT, OutputT2>,
	): Computation<[InputT, InputT2], ErrorT, OutputT2> {
		const resolver = ([input, input2]: [InputT, InputT2]) => {
			this.evaluate(input);
			return f(input2);
		};

		return new Computation<[InputT, InputT2], ErrorT, OutputT2>(resolver);
	}

	thenDoComputationWithNewInput<InputT2, ErrorT2, OutputT2>(
		computation: Computation<InputT2, ErrorT2, OutputT2>,
	): Computation<[InputT, InputT2], ErrorT2, OutputT2> {
		return this.thenDoWithNewInputAndError(input2 => computation.evaluate(input2));
	}

	contramap<PreInput>(f: (input: PreInput) => InputT): SafeComputation<PreInput, OutputT> {
		return new SafeComputation<PreInput, OutputT>(input => this.evaluate(f(input)));
	}

	map<OutputT2>(f: (output: OutputT) => OutputT2): SafeComputation<InputT, OutputT2> {
		return new SafeComputation<InputT, OutputT2>(input => f(this.evaluate(input)));
	}

	apply<OutputT2>(f: SafeComputation<InputT, (x: OutputT) => OutputT2>): SafeComputation<InputT, OutputT2> {
		return f.flatMap(g => this.map(g));
	}

	pure<OutputT2>(x: OutputT2): SafeComputation<any, OutputT2> {
		return new SafeComputation<any, OutputT2>(() => x);
	}

	flatMap<OutputT2>(f: (x: OutputT) => SafeComputation<InputT, OutputT2>): SafeComputation<InputT, OutputT2> {
		return new SafeComputation<InputT, OutputT2>(input => f(this.evaluate(input)).evaluate(input));
	}

	flatMapWithNewInput<Input2T, OutputT2>(
		f: (x: OutputT) => SafeComputation<Input2T, OutputT2>,
	): SafeComputation<[InputT, Input2T], OutputT2> {
		const evaluate = ([input, input2]: [InputT, Input2T]) => f(this.evaluate(input)).evaluate(input2);

		return new SafeComputation<[InputT, Input2T], OutputT2>(evaluate);
	}

	flatMapWithError<ErrorT, Output2T>(
		f: (x: OutputT) => Task<ErrorT, Output2T>,
	): Computation<InputT, ErrorT, Output2T> {
		return new Computation<InputT, ErrorT, Output2T>(input => f(this.evaluate(input)).evaluate());
	}

	flatMapWithNewInputAndError<Input2T, ErrorT, Output2T>(
		f: (x: OutputT) => Computation<Input2T, ErrorT, Output2T>,
	): Computation<[InputT, Input2T], ErrorT, Output2T> {
		const evaluate = ([input, input2]: [InputT, Input2T]) => f(this.evaluate(input)).evaluate(input2);

		return new Computation<[InputT, Input2T], ErrorT, Output2T>(evaluate);
	}

	zip<OutputT2>(other: SafeComputation<InputT, OutputT2>): SafeComputation<InputT, [OutputT, OutputT2]> {
		const evaluate = (input: InputT): [OutputT, OutputT2] => [this.evaluate(input), other.evaluate(input)];

		return new SafeComputation<InputT, [OutputT, OutputT2]>(evaluate);
	}

	zip2<OutputT2, OutputT3>(
		o2: SafeComputation<InputT, OutputT2>,
		o3: SafeComputation<InputT, OutputT3>,
	): SafeComputation<InputT, [OutputT, OutputT2, OutputT3]> {
		const evaluate = (input: InputT): [OutputT, OutputT2, OutputT3] => [
			this.evaluate(input),
			o2.evaluate(input),
			o3.evaluate(input),
		];

		return new SafeComputation<InputT, [OutputT, OutputT2, OutputT3]>(evaluate);
	}

	zip3<OutputT2, OutputT3, OutputT4>(
		o2: SafeComputation<InputT, OutputT2>,
		o3: SafeComputation<InputT, OutputT3>,
		o4: SafeComputation<InputT, OutputT4>,
	): SafeComputation<InputT, [OutputT, OutputT2, OutputT3, OutputT4]> {
		const evaluate = (input: InputT): [OutputT, OutputT2, OutputT3, OutputT4] => [
			this.evaluate(input),
			o2.evaluate(input),
			o3.evaluate(input),
			o4.evaluate(input),
		];

		return new SafeComputation<InputT, [OutputT, OutputT2, OutputT3, OutputT4]>(evaluate);
	}

	zip4<OutputT2, OutputT3, OutputT4, OutputT5>(
		o2: SafeComputation<InputT, OutputT2>,
		o3: SafeComputation<InputT, OutputT3>,
		o4: SafeComputation<InputT, OutputT4>,
		o5: SafeComputation<InputT, OutputT5>,
	): SafeComputation<InputT, [OutputT, OutputT2, OutputT3, OutputT4, OutputT5]> {
		const evaluate = (input: InputT): [OutputT, OutputT2, OutputT3, OutputT4, OutputT5] => [
			this.evaluate(input),
			o2.evaluate(input),
			o3.evaluate(input),
			o4.evaluate(input),
			o5.evaluate(input),
		];

		return new SafeComputation<InputT, [OutputT, OutputT2, OutputT3, OutputT4, OutputT5]>(evaluate);
	}

	zip5<OutputT2, OutputT3, OutputT4, OutputT5, OutputT6>(
		o2: SafeComputation<InputT, OutputT2>,
		o3: SafeComputation<InputT, OutputT3>,
		o4: SafeComputation<InputT, OutputT4>,
		o5: SafeComputation<InputT, OutputT5>,
		o6: SafeComputation<InputT, OutputT6>,
	): SafeComputation<InputT, [OutputT, OutputT2, OutputT3, OutputT4, OutputT5, OutputT6]> {
		const evaluate = (input: InputT): [OutputT, OutputT2, OutputT3, OutputT4, OutputT5, OutputT6] => [
			this.evaluate(input),
			o2.evaluate(input),
			o3.evaluate(input),
			o4.evaluate(input),
			o5.evaluate(input),
			o6.evaluate(input),
		];

		return new SafeComputation<InputT, [OutputT, OutputT2, OutputT3, OutputT4, OutputT5, OutputT6]>(evaluate);
	}

	zip6<OutputT2, OutputT3, OutputT4, OutputT5, OutputT6, OutputT7>(
		o2: SafeComputation<InputT, OutputT2>,
		o3: SafeComputation<InputT, OutputT3>,
		o4: SafeComputation<InputT, OutputT4>,
		o5: SafeComputation<InputT, OutputT5>,
		o6: SafeComputation<InputT, OutputT6>,
		o7: SafeComputation<InputT, OutputT7>,
	): SafeComputation<InputT, [OutputT, OutputT2, OutputT3, OutputT4, OutputT5, OutputT6, OutputT7]> {
		const evaluate = (input: InputT): [OutputT, OutputT2, OutputT3, OutputT4, OutputT5, OutputT6, OutputT7] => [
			this.evaluate(input),
			o2.evaluate(input),
			o3.evaluate(input),
			o4.evaluate(input),
			o5.evaluate(input),
			o6.evaluate(input),
			o7.evaluate(input),
		];

		return new SafeComputation<InputT, [OutputT, OutputT2, OutputT3, OutputT4, OutputT5, OutputT6, OutputT7]>(evaluate);
	}

	zipN<OutputT2>(...others: Array<SafeComputation<InputT, OutputT2>>): SafeComputation<InputT, [OutputT, ...OutputT2[]]> {
		const evaluate = (input: InputT): [OutputT, ...OutputT2[]] => [
			this.evaluate(input),
			...others.map(o => o.evaluate(input)),
		];

		return new SafeComputation<InputT, [OutputT, ...OutputT2[]]>(evaluate);
	}

	toAsync(): AsyncSafeComputation<InputT, OutputT> {
		return new AsyncSafeComputation<InputT, OutputT>(async input => this.evaluate(input));
	}

	bindInput(input: InputT): IO<OutputT> {
		return new IO(() => this.evaluate(input));
	}

	toSafeComputation(): this {
		return this;
	}

	toComputation(): Computation<InputT, never, OutputT> {
		return new Computation<InputT, never, OutputT>((input: InputT) =>
			new Right<never, OutputT>(this.evaluate(input)));
	}
}
