import {AsyncComputation} from './AsyncComputation';
import {type AsyncIO} from './AsyncIO';
import {type Either, Right, Left} from './Either';
import {type AsyncMonad} from './Monad';

export class AsyncTask<E, O> implements AsyncMonad<O> {
	constructor(public readonly evaluate: (..._: any[]) => Promise<Either<E, O>>) {}

	thenDo<U>(f: (_: any) => Promise<U>): AsyncTask<E, U> {
		const evaluate = async (input: any): Promise<Either<E, U>> => {
			const output = await this.evaluate(input);
			if (output.isLeft()) {
				return new Left(output.get()) as Either<E, U>;
			}

			return f(output.get() as O).then(x => new Right(x) as Either<E, U>);
		};

		return new AsyncTask(evaluate);
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	thenDoIO<O2>(io: AsyncIO<O2>): AsyncTask<E, O2> {
		const evaluate = async (input: any): Promise<Either<E, O2>> => {
			const output = await this.evaluate(input);
			if (output.isLeft()) {
				return new Left(output.get()) as Either<E, O2>;
			}

			return new Right(await io.evaluate());
		};

		return new AsyncTask(evaluate);
	}

	thenDoWithNewError<E2, O2>(f: (_: any) => Promise<Either<E2, O2>>): AsyncTask<E | E2, O2> {
		const evaluate = async (input: any): Promise<Either<E | E2, O2>> => {
			const output = await this.evaluate(input);
			if (output.isLeft()) {
				return new Left(output.get()) as Either<E | E2, O2>;
			}

			return f(output.get() as O2);
		};

		return new AsyncTask(evaluate);
	}

	thenDoTask<E2, O2>(task: AsyncTask<E2, O2>): AsyncTask<E | E2, O2> {
		const evaluate = async (input: any): Promise<Either<E | E2, O2>> => {
			const output = await this.evaluate(input);
			if (output.isLeft()) {
				return new Left(output.get()) as Either<E | E2, O2>;
			}

			return task.evaluate(input);
		};

		return new AsyncTask(evaluate);
	}

	thenDoWithNewInputAndError<I, E2, O2>(
		f: (input: I) => Promise<Either<E2, O2>>,
	): AsyncComputation<I, E | E2, O2> {
		const evaluate = async (input: I): Promise<Either<E | E2, O2>> => {
			const output = await this.evaluate(input);
			if (output.isLeft()) {
				return new Left(output.get()) as Either<E | E2, O2>;
			}

			return f(input);
		};

		return new AsyncComputation(evaluate);
	}

	thenDoComputation<I, E2, O2>(
		computation: AsyncComputation<I, E2, O2>,
	): AsyncComputation<I, E | E2, O2> {
		const evaluate = async (input: I): Promise<Either<E | E2, O2>> => {
			const output = await this.evaluate(input);
			if (output.isLeft()) {
				return new Left(output.get()) as Either<E | E2, O2>;
			}

			return computation.evaluate(input);
		};

		return new AsyncComputation(evaluate);
	}

	map<O2>(f: (x: O) => Promise<O2>): AsyncTask<E, O2> {
		const evaluate = async (input: any): Promise<Either<E, O2>> => {
			const output = await this.evaluate(input);
			if (output.isLeft()) {
				// eslint-disable-next-line unicorn/no-useless-promise-resolve-reject
				return Promise.resolve(new Left(output.get()) as Either<E, O2>);
			}

			return f(output.get() as O).then(x => new Right(x) as Either<E, O2>);
		};

		return new AsyncTask(evaluate);
	}

	apply<O2>(f: AsyncTask<E, (x: O) => Promise<O2>>): AsyncTask<E, O2> {
		const evaluate = async (input: any): Promise<Either<E, O2>> => {
			const output = await this.evaluate(input);
			if (output.isLeft()) {
				return new Left(output.get()) as Either<E, O2>;
			}

			const fOutput = await f.evaluate(input);
			if (fOutput.isLeft()) {
				return new Left(fOutput.get()) as Either<E, O2>;
			}

			return new Right<E, O2>(await (fOutput.get() as (x: O) => Promise<O2>)(output.get() as O));
		};

		return new AsyncTask(evaluate);
	}

	pure<O2>(x: Promise<O2>): AsyncTask<any, O2> {
		return new AsyncTask<any, O2>(async () => {
			try {
				const result = await x;
				return new Right(result);
			} catch (error) {
				return new Left(error);
			}
		});
	}

	flatMap<O2>(f: (x: O) => AsyncTask<E, O2>): AsyncTask<E, O2> {
		const evaluate = async (input: any): Promise<Either<E, O2>> => {
			const output = await this.evaluate(input);
			if (output.isLeft()) {
				return new Left(output.get()) as Either<E, O2>;
			}

			return f(output.get() as O).evaluate(input);
		};

		return new AsyncTask(evaluate);
	}

	zip<O2>(other: AsyncTask<E, O2>): AsyncTask<E, [O, O2]> {
		const evaluate = async (input: any): Promise<Either<E, [O, O2]>> => {
			const output = await this.evaluate(input);
			const otherOutput = await other.evaluate(input);

			return output.zip(otherOutput);
		};

		return new AsyncTask(evaluate);
	}

	zipWithNewError<E2, O2>(other: AsyncTask<E2, O2>): AsyncTask<E | E2, [O, O2]> {
		const evaluate = async (input: any): Promise<Either<E | E2, [O, O2]>> => {
			const output = await this.evaluate(input);
			const otherOutput = await other.evaluate(input);

			if (output.isLeft()) {
				return new Left(output.get()) as Either<E | E2, [O, O2]>;
			}

			if (otherOutput.isLeft()) {
				return new Left(otherOutput.get()) as Either<E | E2, [O, O2]>;
			}

			return new Right([output.get() as O, otherOutput.get() as O2]) as Either<E | E2, [O, O2]>;
		};

		return new AsyncTask(evaluate);
	}

	zip2<O2, O3>(
		c2: AsyncTask<E, O2>,
		c3: AsyncTask<E, O3>,
	): AsyncTask<E, [O, O2, O3]> {
		const evaluate = async (input: any): Promise<Either<E, [O, O2, O3]>> => {
			const output = await this.evaluate(input);
			const output2 = await c2.evaluate(input);
			const output3 = await c3.evaluate(input);

			return output.zip2(output2, output3);
		};

		return new AsyncTask(evaluate);
	}

	zip2WithNewErrors<E2, E3, O2, O3>(
		c2: AsyncTask<E2, O2>,
		c3: AsyncTask<E3, O3>,
	): AsyncTask<E | E2 | E3, [O, O2, O3]> {
		const evaluate = async (input: any): Promise<Either<E | E2 | E3, [O, O2, O3]>> => {
			const output = await this.evaluate(input);
			const output2 = await c2.evaluate(input);
			const output3 = await c3.evaluate(input);

			if (output.isLeft()) {
				return new Left(output.get()) as Either<E | E2 | E3, [O, O2, O3]>;
			}

			if (output2.isLeft()) {
				return new Left(output2.get()) as Either<E | E2 | E3, [O, O2, O3]>;
			}

			if (output3.isLeft()) {
				return new Left(output3.get()) as Either<E | E2 | E3, [O, O2, O3]>;
			}

			return new Right([output.get() as O, output2.get() as O2, output3.get() as O3]) as Either<E | E2 | E3, [O, O2, O3]>;
		};

		return new AsyncTask(evaluate);
	}

	zip3<O2, O3, O4>(
		c2: AsyncTask<E, O2>,
		c3: AsyncTask<E, O3>,
		c4: AsyncTask<E, O4>,
	): AsyncTask<E, [O, O2, O3, O4]> {
		const evaluate = async (input: any): Promise<Either<E, [O, O2, O3, O4]>> => {
			const output = await this.evaluate(input);
			const output2 = await c2.evaluate(input);
			const output3 = await c3.evaluate(input);
			const output4 = await c4.evaluate(input);

			return output.zip3(output2, output3, output4);
		};

		return new AsyncTask(evaluate);
	}

	zip3WithNewErrors<E2, E3, E4, O2, O3, O4>(
		c2: AsyncTask<E2, O2>,
		c3: AsyncTask<E3, O3>,
		c4: AsyncTask<E4, O4>,
	): AsyncTask<E | E2 | E3 | E4, [O, O2, O3, O4]> {
		const evaluate = async (input: any): Promise<Either<E | E2 | E3 | E4, [O, O2, O3, O4]>> => {
			const output = await this.evaluate(input);
			const output2 = await c2.evaluate(input);
			const output3 = await c3.evaluate(input);
			const output4 = await c4.evaluate(input);

			if (output.isLeft()) {
				return new Left(output.get()) as Either<E | E2 | E3 | E4, [O, O2, O3, O4]>;
			}

			if (output2.isLeft()) {
				return new Left(output2.get()) as Either<E | E2 | E3 | E4, [O, O2, O3, O4]>;
			}

			if (output3.isLeft()) {
				return new Left(output3.get()) as Either<E | E2 | E3 | E4, [O, O2, O3, O4]>;
			}

			if (output4.isLeft()) {
				return new Left(output4.get()) as Either<E | E2 | E3 | E4, [O, O2, O3, O4]>;
			}

			return new Right([output.get() as O, output2.get() as O2, output3.get() as O3, output4.get() as O4]) as Either<E | E2 | E3 | E4, [O, O2, O3, O4]>;
		};

		return new AsyncTask(evaluate);
	}

	zip4<O2, O3, O4, O5>(
		c2: AsyncTask<E, O2>,
		c3: AsyncTask<E, O3>,
		c4: AsyncTask<E, O4>,
		c5: AsyncTask<E, O5>,
	): AsyncTask<E, [O, O2, O3, O4, O5]> {
		const evaluate = async (input: any): Promise<Either<E, [O, O2, O3, O4, O5]>> => {
			const output = await this.evaluate(input);
			const output2 = await c2.evaluate(input);
			const output3 = await c3.evaluate(input);
			const output4 = await c4.evaluate(input);
			const output5 = await c5.evaluate(input);

			return output.zip4(output2, output3, output4, output5);
		};

		return new AsyncTask(evaluate);
	}

	zip4WithNewErrors<E2, E3, E4, E5, O2, O3, O4, O5>(
		c2: AsyncTask<E2, O2>,
		c3: AsyncTask<E3, O3>,
		c4: AsyncTask<E4, O4>,
		c5: AsyncTask<E5, O5>,
	): AsyncTask<E | E2 | E3 | E4 | E5, [O, O2, O3, O4, O5]> {
		const evaluate = async (input: any): Promise<Either<E | E2 | E3 | E4 | E5, [O, O2, O3, O4, O5]>> => {
			const output = await this.evaluate(input);
			const output2 = await c2.evaluate(input);
			const output3 = await c3.evaluate(input);
			const output4 = await c4.evaluate(input);
			const output5 = await c5.evaluate(input);

			if (output.isLeft()) {
				return new Left(output.get()) as Either<E | E2 | E3 | E4 | E5, [O, O2, O3, O4, O5]>;
			}

			if (output2.isLeft()) {
				return new Left(output2.get()) as Either<E | E2 | E3 | E4 | E5, [O, O2, O3, O4, O5]>;
			}

			if (output3.isLeft()) {
				return new Left(output3.get()) as Either<E | E2 | E3 | E4 | E5, [O, O2, O3, O4, O5]>;
			}

			if (output4.isLeft()) {
				return new Left(output4.get()) as Either<E | E2 | E3 | E4 | E5, [O, O2, O3, O4, O5]>;
			}

			if (output5.isLeft()) {
				return new Left(output5.get()) as Either<E | E2 | E3 | E4 | E5, [O, O2, O3, O4, O5]>;
			}

			return new Right([output.get() as O, output2.get() as O2, output3.get() as O3, output4.get() as O4, output5.get() as O5]) as Either<E | E2 | E3 | E4 | E5, [O, O2, O3, O4, O5]>;
		};

		return new AsyncTask(evaluate);
	}

	zip5<O2, O3, O4, O5, O6>(
		c2: AsyncTask<E, O2>,
		c3: AsyncTask<E, O3>,
		c4: AsyncTask<E, O4>,
		c5: AsyncTask<E, O5>,
		c6: AsyncTask<E, O6>,
	): AsyncTask<E, [O, O2, O3, O4, O5, O6]> {
		const evaluate = async (input: any): Promise<Either<E, [O, O2, O3, O4, O5, O6]>> => {
			const output = await this.evaluate(input);
			const output2 = await c2.evaluate(input);
			const output3 = await c3.evaluate(input);
			const output4 = await c4.evaluate(input);
			const output5 = await c5.evaluate(input);
			const output6 = await c6.evaluate(input);

			return output.zip5(output2, output3, output4, output5, output6);
		};

		return new AsyncTask(evaluate);
	}

	zip5WithNewErrors<E2, E3, E4, E5, E6, O2, O3, O4, O5, O6>(
		c2: AsyncTask<E2, O2>,
		c3: AsyncTask<E3, O3>,
		c4: AsyncTask<E4, O4>,
		c5: AsyncTask<E5, O5>,
		c6: AsyncTask<E6, O6>,
	): AsyncTask<E | E2 | E3 | E4 | E5 | E6, [O, O2, O3, O4, O5, O6]> {
		const evaluate = async (input: any): Promise<Either<E | E2 | E3 | E4 | E5 | E6, [O, O2, O3, O4, O5, O6]>> => {
			const output = await this.evaluate(input);
			const output2 = await c2.evaluate(input);
			const output3 = await c3.evaluate(input);
			const output4 = await c4.evaluate(input);
			const output5 = await c5.evaluate(input);
			const output6 = await c6.evaluate(input);

			if (output.isLeft()) {
				return new Left(output.get()) as Either<E | E2 | E3 | E4 | E5 | E6, [O, O2, O3, O4, O5, O6]>;
			}

			if (output2.isLeft()) {
				return new Left(output2.get()) as Either<E | E2 | E3 | E4 | E5 | E6, [O, O2, O3, O4, O5, O6]>;
			}

			if (output3.isLeft()) {
				return new Left(output3.get()) as Either<E | E2 | E3 | E4 | E5 | E6, [O, O2, O3, O4, O5, O6]>;
			}

			if (output4.isLeft()) {
				return new Left(output4.get()) as Either<E | E2 | E3 | E4 | E5 | E6, [O, O2, O3, O4, O5, O6]>;
			}

			if (output5.isLeft()) {
				return new Left(output5.get()) as Either<E | E2 | E3 | E4 | E5 | E6, [O, O2, O3, O4, O5, O6]>;
			}

			if (output6.isLeft()) {
				return new Left(output6.get()) as Either<E | E2 | E3 | E4 | E5 | E6, [O, O2, O3, O4, O5, O6]>;
			}

			return new Right([output.get() as O, output2.get() as O2, output3.get() as O3, output4.get() as O4, output5.get() as O5, output.get() as O6]) as Either<E | E2 | E3 | E4 | E5 | E6, [O, O2, O3, O4, O5, O6]>;
		};

		return new AsyncTask(evaluate);
	}

	zip6<O2, O3, O4, O5, O6, O7>(
		c2: AsyncTask<E, O2>,
		c3: AsyncTask<E, O3>,
		c4: AsyncTask<E, O4>,
		c5: AsyncTask<E, O5>,
		c6: AsyncTask<E, O6>,
		c7: AsyncTask<E, O7>,
	): AsyncTask<E, [O, O2, O3, O4, O5, O6, O7]> {
		const evaluate = async (input: any): Promise<Either<E, [O, O2, O3, O4, O5, O6, O7]>> => {
			const output = await this.evaluate(input);
			const output2 = await c2.evaluate(input);
			const output3 = await c3.evaluate(input);
			const output4 = await c4.evaluate(input);
			const output5 = await c5.evaluate(input);
			const output6 = await c6.evaluate(input);
			const output7 = await c7.evaluate(input);

			return output.zip6(output2, output3, output4, output5, output6, output7);
		};

		return new AsyncTask(evaluate);
	}

	zip6WithNewErrors<E2, E3, E4, E5, E6, E7, O2, O3, O4, O5, O6, O7>(
		c2: AsyncTask<E2, O2>,
		c3: AsyncTask<E3, O3>,
		c4: AsyncTask<E4, O4>,
		c5: AsyncTask<E5, O5>,
		c6: AsyncTask<E6, O6>,
		c7: AsyncTask<E7, O7>,
	): AsyncTask<E | E2 | E3 | E4 | E5 | E6 | E7, [O, O2, O3, O4, O5, O6, O7]> {
		const evaluate = async (input: any): Promise<Either<E | E2 | E3 | E4 | E5 | E6 | E7, [O, O2, O3, O4, O5, O6, O7]>> => {
			const output = await this.evaluate(input);
			const output2 = await c2.evaluate(input);
			const output3 = await c3.evaluate(input);
			const output4 = await c4.evaluate(input);
			const output5 = await c5.evaluate(input);
			const output6 = await c6.evaluate(input);
			const output7 = await c7.evaluate(input);

			if (output.isLeft()) {
				return new Left(output.get()) as Either<E | E2 | E3 | E4 | E5 | E6 | E7, [O, O2, O3, O4, O5, O6, O7]>;
			}

			if (output2.isLeft()) {
				return new Left(output2.get()) as Either<E | E2 | E3 | E4 | E5 | E6 | E7, [O, O2, O3, O4, O5, O6, O7]>;
			}

			if (output3.isLeft()) {
				return new Left(output3.get()) as Either<E | E2 | E3 | E4 | E5 | E6 | E7, [O, O2, O3, O4, O5, O6, O7]>;
			}

			if (output4.isLeft()) {
				return new Left(output4.get()) as Either<E | E2 | E3 | E4 | E5 | E6 | E7, [O, O2, O3, O4, O5, O6, O7]>;
			}

			if (output5.isLeft()) {
				return new Left(output5.get()) as Either<E | E2 | E3 | E4 | E5 | E6 | E7, [O, O2, O3, O4, O5, O6, O7]>;
			}

			if (output6.isLeft()) {
				return new Left(output6.get()) as Either<E | E2 | E3 | E4 | E5 | E6 | E7, [O, O2, O3, O4, O5, O6, O7]>;
			}

			if (output7.isLeft()) {
				return new Left(output7.get()) as Either<E | E2 | E3 | E4 | E5 | E6 | E7, [O, O2, O3, O4, O5, O6, O7]>;
			}

			return new Right([output.get() as O, output2.get() as O2, output3.get() as O3, output4.get() as O4, output5.get() as O5, output.get() as O6, output.get() as O7]) as Either<E | E2 | E3 | E4 | E5 | E6 | E7, [O, O2, O3, O4, O5, O6, O7]>;
		};

		return new AsyncTask(evaluate);
	}
}
