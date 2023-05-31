
import {type AsyncContravariantFunctor} from './Contravariant.js';
import {type AsyncMonad} from './Monad.js';
import {MonadicPromise} from './MonadicPromise.js';

export class AsyncSafeComputation<in I, out O> implements AsyncMonad<O>, AsyncContravariantFunctor<I> {
	constructor(public readonly evaluate: (input: I) => Promise<O>) {}

	contramap<U>(f: (x: U) => Promise<I>): AsyncSafeComputation<U, O> {
		const evaluate = async (input: U): Promise<O> => {
			const output = await f(input);
			return this.evaluate(output);
		};

		return new AsyncSafeComputation(evaluate);
	}

	map<O2>(f: (output: O) => Promise<O2>): AsyncSafeComputation<I, O2> {
		const evaluate = async (input: I): Promise<O2> => {
			const output = await this.evaluate(input);

			return f(output);
		};

		return new AsyncSafeComputation(evaluate);
	}

	apply<O2>(f: AsyncSafeComputation<I, (x: O) => Promise<O2>>): AsyncSafeComputation<I, O2> {
		return f.flatMap(g => this.map(g));
	}

	pure<U>(x: Promise<U>): AsyncSafeComputation<any, U> {
		return new AsyncSafeComputation<any, U>(async () => x);
	}

	flatMap<O2>(f: (x: O) => AsyncSafeComputation<I, O2>): AsyncSafeComputation<I, O2> {
		const evaluate = async (input: I): Promise<O2> => {
			const output = await this.evaluate(input);

			return f(output).evaluate(input);
		};

		return new AsyncSafeComputation(evaluate);
	}

	zip<U>(other: AsyncSafeComputation<I, U>): AsyncSafeComputation<I, [O, U]> {
		const evaluate = async (input: I): Promise<[O, U]> => {
			const output = await this.evaluate(input);
			const otherOutput = await other.evaluate(input);

			return [output, otherOutput];
		};

		return new AsyncSafeComputation(evaluate);
	}

	zip2<U, V>(
		c2: AsyncSafeComputation<I, U>,
		c3: AsyncSafeComputation<I, V>,
	): AsyncSafeComputation<I, [O, U, V]> {
		const evaluate = async (input: I): Promise<[O, U, V]> => {
			const output = await this.evaluate(input);
			const o2 = await c2.evaluate(input);
			const o3 = await c3.evaluate(input);

			return [output, o2, o3];
		};

		return new AsyncSafeComputation(evaluate);
	}

	zip3<U, V, W>(
		c2: AsyncSafeComputation<I, U>,
		c3: AsyncSafeComputation<I, V>,
		c4: AsyncSafeComputation<I, W>,
	): AsyncSafeComputation<I, [O, U, V, W]> {
		const evaluate = async (input: I): Promise<[O, U, V, W]> => {
			const output = await this.evaluate(input);
			const o2 = await c2.evaluate(input);
			const o3 = await c3.evaluate(input);
			const o4 = await c4.evaluate(input);

			return [output, o2, o3, o4];
		};

		return new AsyncSafeComputation(evaluate);
	}

	zip4<U, V, W, X>(
		c2: AsyncSafeComputation<I, U>,
		c3: AsyncSafeComputation<I, V>,
		c4: AsyncSafeComputation<I, W>,
		c5: AsyncSafeComputation<I, X>,
	): AsyncSafeComputation<I, [O, U, V, W, X]> {
		const evaluate = async (input: I): Promise<[O, U, V, W, X]> => {
			const output = await this.evaluate(input);
			const o2 = await c2.evaluate(input);
			const o3 = await c3.evaluate(input);
			const o4 = await c4.evaluate(input);
			const o5 = await c5.evaluate(input);

			return [output, o2, o3, o4, o5];
		};

		return new AsyncSafeComputation(evaluate);
	}

	zip5<U, V, W, X, Y>(
		c2: AsyncSafeComputation<I, U>,
		c3: AsyncSafeComputation<I, V>,
		c4: AsyncSafeComputation<I, W>,
		c5: AsyncSafeComputation<I, X>,
		c6: AsyncSafeComputation<I, Y>,
	): AsyncSafeComputation<I, [O, U, V, W, X, Y]> {
		const evaluate = async (input: I): Promise<[O, U, V, W, X, Y]> => {
			const output = await this.evaluate(input);
			const o2 = await c2.evaluate(input);
			const o3 = await c3.evaluate(input);
			const o4 = await c4.evaluate(input);
			const o5 = await c5.evaluate(input);
			const o6 = await c6.evaluate(input);

			return [output, o2, o3, o4, o5, o6];
		};

		return new AsyncSafeComputation(evaluate);
	}

	zip6<U, V, W, X, Y, Z>(
		c2: AsyncSafeComputation<I, U>,
		c3: AsyncSafeComputation<I, V>,
		c4: AsyncSafeComputation<I, W>,
		c5: AsyncSafeComputation<I, X>,
		c6: AsyncSafeComputation<I, Y>,
		c7: AsyncSafeComputation<I, Z>,
	): AsyncSafeComputation<I, [O, U, V, W, X, Y, Z]> {
		const evaluate = async (input: I): Promise<[O, U, V, W, X, Y, Z]> => {
			const output = await this.evaluate(input);
			const o2 = await c2.evaluate(input);
			const o3 = await c3.evaluate(input);
			const o4 = await c4.evaluate(input);
			const o5 = await c5.evaluate(input);
			const o6 = await c6.evaluate(input);
			const o7 = await c7.evaluate(input);

			return [output, o2, o3, o4, o5, o6, o7];
		};

		return new AsyncSafeComputation(evaluate);
	}

	zipN<U>(...cs: Array<AsyncSafeComputation<I, U>>): AsyncSafeComputation<I, [O, ...U[]]> {
		const evaluate = async (input: I): Promise<[O, ...U[]]> => {
			const output = await this.evaluate(input);
			const otherOutputs = await Promise.all(cs.map(async c => c.evaluate(input)));

			return [output, ...otherOutputs];
		};

		return new AsyncSafeComputation(evaluate);
	}
}
