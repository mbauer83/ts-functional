/* eslint-disable max-params */
/* eslint-disable max-nested-callbacks */
/* eslint-disable unicorn/prevent-abbreviations */
import {type Applicative} from './Applicative.js';
import {AsyncComputation} from './AsyncComputation.js';
import {AsyncIO} from './AsyncIO.js';
import {AsyncSafeComputation} from './AsyncSafeComputation.js';
import {AsyncTask} from './AsyncTask.js';
import {Computation} from './Computation.js';
import {type Either, Left, Right} from './Either.js';
import {IO} from './IO.js';
import {type AsyncMonad, type Monad} from './Monad.js';
import {None, type Optional} from './Optional.js';
import {SafeComputation} from './SafeComputation.js';
import {Task} from './Task.js';

/**
 * The type of any synchronous effect
 *
 * @remarks
 * This is a union of all the synchronous effect-types, i.e. {@link IO}, {@link Task}, {@link SafeComputation}, and {@link Computation}.
 */
export type AnySyncEffect<InputT, ErrorT, OutputT> = IO<OutputT> | Task<ErrorT, OutputT> | SafeComputation<InputT, OutputT> | Computation<InputT, ErrorT, OutputT>;

/**
 * The type of any asynchronous effect
 *
 * @remarks
 * This is a union of all the asynchronous effect-types, i.e. {@link AsyncIO}, {@link AsyncTask}, {@link AsyncSafeComputation}, and {@link AsyncComputation}.
 */
export type AnyAsyncEffect<InputT, ErrorT, OutputT> = AsyncIO<OutputT> | AsyncTask<ErrorT, OutputT> | AsyncSafeComputation<InputT, OutputT> | AsyncComputation<InputT, ErrorT, OutputT>;

/**
 * The type of any effect
 *
 * @remarks
 * This is a union of all the effect-types, i.e. {@link AnySyncEffect} and {@link AnyAsyncEffect}.
 */
export type AnyEffect<InputT, ErrorT, OutputT> = AnySyncEffect<InputT, ErrorT, OutputT> | AnyAsyncEffect<InputT, ErrorT, OutputT>;

/**
 * The type of a synchronous effect that can be used with {@link Effect.bindKey}.
 */
export type BindEffectType<Output2T> = IO<Output2T> | Task<never, Output2T> | SafeComputation<any, Output2T> | Computation<any, never, Output2T>;

type EffectWithoutInput<EffectT extends Effect<any, any, any>> =
	EffectT extends IO<infer T>
		? IO<T>
		: EffectT extends Task<infer ErrorT, infer OutputT>
			? Task<ErrorT, OutputT>
			: EffectT extends SafeComputation<any, infer OutputT>
				? IO<OutputT>
				: EffectT extends Computation<any, infer ErrorT, infer OutputT>
					? Task<ErrorT, OutputT>
					: never;

type AsyncEffectWithoutInput<EffectT extends Effect<any, any, any>> =
	EffectT extends AsyncIO<infer T>
		? AsyncIO<T>
		: EffectT extends AsyncTask<infer ErrorT, infer OutputT>
			? AsyncTask<ErrorT, OutputT>
			: EffectT extends AsyncSafeComputation<any, infer OutputT>
				? AsyncIO<OutputT>
				: EffectT extends Computation<any, infer ErrorT, infer OutputT>
					? AsyncTask<ErrorT, OutputT>
					: never;

/**
 * The interface for a synchronous effect.
 */
export interface Effect<in InputT, out ErrorT, out OutputT> extends Monad<OutputT> {
	toComputation(): Computation<InputT, ErrorT, OutputT>;
	toAsync(): AnyAsyncEffect<InputT, ErrorT, OutputT>;
	bindKey<KeyT extends (string | symbol | number), Output2T>(key: KeyT, f: (input: OutputT) => BindEffectType<Output2T>): Effect<InputT, ErrorT, OutputT & Record<KeyT, Output2T>>;
	tap<EffectT extends BindEffectType<any>>(f: (input: OutputT) => EffectT): this;
	bindInput(input: InputT): IO<OutputT> | Task<ErrorT, OutputT>;
}

/**
 * The interface for an asynchronous effect.
 */
export interface AsyncEffect<in InputT, out ErrorT, out OutputT> extends AsyncMonad<OutputT> {
	toComputation(): AsyncComputation<InputT, ErrorT, OutputT>;
	toAsync(): this;
	bindKey<KeyT extends (string | symbol | number), Output2T>(key: KeyT, f: (input: OutputT) => (BindEffectType<Output2T> | AsyncBindEffectType<Output2T>)): AsyncEffect<InputT, ErrorT, OutputT & Record<KeyT, Output2T>>;
	tap<EffectT extends (BindEffectType<any> | AsyncBindEffectType<any>)>(f: (input: OutputT) => EffectT): this;
	bindInput(input: InputT): AsyncIO<OutputT> | AsyncTask<ErrorT, OutputT>;
}

/**
 * Converts a synchronous effect with `any` as input-type and `never` as error-type to an {@link IO} of its output-type.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export function boundEffectToIO<Output2T, E extends BindEffectType<Output2T>>(effect: E): IO<Output2T> {
	if (effect instanceof Task) {
		return new IO(() => effect.evaluate().get());
	}

	if (effect instanceof SafeComputation) {
		return new IO(() => effect.evaluate({}));
	}

	if (effect instanceof Computation) {
		return new IO(() => effect.evaluate({}).get());
	}

	return effect;
}

/**
 * The type of an asynchronous effect that can be used with {@link AsyncEffect.bindKey}.
 */
export type AsyncBindEffectType<Output2T> = AsyncIO<Output2T> | AsyncTask<never, Output2T> | AsyncSafeComputation<any, Output2T> | AsyncComputation<any, never, Output2T>;

/**
 * Converts an asynchronous effect with `any` as input-type and `never` as error-type to an {@link AsyncIO} of its output-type.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export function asyncBindEffectToIO<Output2T, E extends AsyncBindEffectType<Output2T>>(effect: E): AsyncIO<Output2T> {
	if (effect instanceof AsyncTask) {
		return new AsyncIO(async () => {
			const awaited = await effect.evaluate();
			return awaited.get();
		});
	}

	if (effect instanceof AsyncSafeComputation) {
		return new AsyncIO(async () => effect.evaluate({}));
	}

	if (effect instanceof AsyncComputation) {
		return new AsyncIO(async () => {
			const awaited = await effect.evaluate({});
			return awaited.get();
		});
	}

	return effect;
}

/**
 * The type of an unspecified function.
 */
export type UnspecifiedFunction = (..._: any[]) => any;

/**
 * The generic type of a function.
 */
export type GenericFunction<I extends any[], O> = (..._: I[]) => O;

/**
 * The type of anything that can be converted to an error via {@link throwableToError}.
 * @see throwableToError
 */
export type Throwable = Error | string | ((...args: any[]) => Error) | ((...args: any[]) => string);
/**
 * Converts a {@link Throwable} to an {@link Error}.
 */
export function throwableToError(throwable: Throwable): Error {
	if (throwable instanceof Error) {
		return throwable;
	}

	if (typeof throwable === 'string') {
		return new Error(throwable);
	}

	const result = throwable();
	if (result instanceof Error) {
		return result;
	}

	return new Error(result);
}

/**
 * Any type that can appear in an array for use with the spread operator (since the compiler does not like spreading `any[]`)
 */
export type SpreadableElement = boolean | number | string | symbol | undefined | Record<string, any> | SpreadableElement[];

/**
 * The type of an error indicating that a value which was queried could not be found.
 */
export class QueriedValueNotPresent extends Error {
	constructor(queryDescription: string) {
		super('Queried value not present: ' + queryDescription);
	}
}

/**
 * Assigns the properties of `source` to `target` and returns the result.
 */
export function assign<T extends Record<string, any>, U extends Record<string, any>>(target: T, source: U): T & U {
	return Object.assign(target, source);
}

/**
 * Lifts a function from `A` to (a function from `B` to `C`) to the level of applicatives.
 */
export function liftA2<A, B, C, P extends Applicative<A>, Q extends Applicative<B>, R extends Applicative<C>>(f: ((a: A) => (b: B) => C)): (a: P) => (b: Q) => R {
	const mappedP = (p: P) => p.map(element => f(element));
	const a = (p: P) => (q: Q) => q.apply(mappedP(p));
	return a as ((p: P) => (q: Q) => R);
}

/**
 * Lifts a function from `A` to (a function from `B` to (a function from `C` to `D`)) to the level of applicatives.
 */
export function liftA3<A, B, C, D, P extends Applicative<A>, Q extends Applicative<B>, R extends Applicative<C>, S extends Applicative<D>>(f: ((a: A) => (b: B) => (c: C) => D)): (a: P) => (b: Q) => (c: R) => S {
	const mappedP = (p: P) => p.map(element => f(element));
	const a = (p: P) => (q: Q) => (r: R) => r.apply(q.apply(mappedP(p)));
	return a as ((p: P) => (q: Q) => (r: R) => S);
}

/**
 * Maps properties of an object with a given dictionary of functions.
 */
export function mapProps<T extends Record<string, any>, M extends Partial<{[K in keyof T]: (value: T[K]) => any}>>(object: T, mapper: M): {[K in keyof T]: K extends keyof M ? ReturnType<NonNullable<M[K]>> : T[K]} {
	const newObject: any = {};
	const objectKeys = Object.keys(object) as Array<keyof T>;
	for (const key of objectKeys) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		newObject[key] = (key in mapper) ? (mapper[key] as (value: any) => any)(object[key]) : object[key];
	}

	return newObject as {[K in keyof T]: K extends keyof M ? ReturnType<NonNullable<M[K]>> : T[K]};
}

/**
 * Maps all properties of an object with a given dictionary of functions.
 */
export function mapAllProps<T extends Record<string, unknown>, M extends {[K in keyof T]: (value: T[K]) => any}>(object: T, mapper: M): {[K in keyof T]: ReturnType<M[K]>} {
	const newObject: any = {};
	const objectKeys = Object.keys(object) as Array<keyof T>;
	for (const objectKey of objectKeys) {
		const objectValue = object[objectKey];
		type MapperFnType = (typeof mapper[typeof objectKey]);
		const mapperFn = mapper[objectKey] as ((a: (typeof objectValue)) => ReturnType<MapperFnType>);
		newObject[objectKey] = mapperFn(objectValue);
	}

	return newObject as {[K in keyof T]: ReturnType<(typeof mapper[K])>};
}

/**
 * The type of a cancelled computation, to be used for the left side of an {@link Either}.
 */
export type ComputationCancelled = {readonly _tag: 'ComputationCancelled'; readonly reason: Optional<string>};
/**
 * A value to place into a {@link Left} for a computation that was cancelled without a specific reason
 */
export const computationCancelledWithoutReason: ComputationCancelled = {_tag: 'ComputationCancelled', reason: None.for<string>()};

/**
 * The type of a computation with unspecified output, to be used in an {@link AsyncForeverEffect}.
 * @see AsyncForeverEffect
 */
export type UnparameterizedAsyncEffect<InputT, ErrorT> = AsyncIO<any> | AsyncTask<ErrorT, any> | AsyncSafeComputation<InputT, any> | AsyncComputation<InputT, ErrorT, any>;

/**
 * The type of an asynchronous computation which takes an InputT and either returns a Left of an ErrorT or runs forever.
 */
export type AsyncForeverEffect<InputT, ErrorT, E extends UnparameterizedAsyncEffect<InputT, ErrorT>> =
	E extends AsyncIO<any>
		? AsyncIO<Either<ComputationCancelled, never>>
		: E extends AsyncTask<ErrorT, any>
			? AsyncTask<ErrorT | ComputationCancelled, never>
			: E extends AsyncSafeComputation<InputT, any>
				? AsyncComputation<InputT, ComputationCancelled, never>
				: E extends AsyncComputation<InputT, ErrorT, any>
					? AsyncComputation<InputT, ErrorT | ComputationCancelled, never>
					: never;

/**
 * The type of a stop-signal for a forever-running asynchronous computation.
 */
export type StopSignal = {stop: boolean};
/**
 * The type of a stop-signal for a forever-running asynchronous computation which contains a reason for stopping.
 */
export type StopSignalWithReason = StopSignal & {reason: Optional<string>};
/**
 * Modifies a stop-signal to indicate that the computation should stop with a given reason.
 */
export function setStopWithReason(stopSignal: StopSignal, reason: Optional<string>): void {
	(stopSignal as StopSignalWithReason).reason = reason;
	(stopSignal as StopSignalWithReason).stop = true;
}

/**
 * Evaluates an asynchronous effect of any output type until the `stop` property of the returned {@link StopSignalWithReason} is set to `true`.
 */
export function runAsyncEffectForever<InputT, ErrorT, E extends UnparameterizedAsyncEffect<InputT, ErrorT>>(effect: E): [StopSignalWithReason, AsyncForeverEffect<InputT, ErrorT, E>] {
	const stopSignal = {stop: false, reason: None.for<string>()};
	const forever = async (input: InputT): Promise<Either<ComputationCancelled | ErrorT, never>> => {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const evaluated: any = await effect.evaluate(input);
		if (evaluated instanceof Left) {
			return evaluated as any as Either<ComputationCancelled | ErrorT, never>;
		}

		if (!stopSignal.stop) {
			return forever(input);
		}

		return new Left<ComputationCancelled, never>({_tag: 'ComputationCancelled', reason: stopSignal.reason});
	};

	if (effect instanceof AsyncIO || effect instanceof AsyncTask) {
		return [stopSignal, new AsyncTask<ErrorT | ComputationCancelled, never>(forever) as AsyncForeverEffect<InputT, ErrorT, E>];
	}

	return [stopSignal, new AsyncComputation<InputT, ErrorT | ComputationCancelled, never>(forever) as AsyncForeverEffect<InputT, ErrorT, E>];
}

/**
 * The union of effect-types which take an `A` and return a `B` (where `A` may be `never`)
 */
export type EffectFromTo<A, B> = A extends never ? EffectTo<B> : SafeComputation<A, B> | Computation<A, any, B>;
/**
 * The union of effect-types which take an `A`.
 */
export type EffectFrom<A> = SafeComputation<A, any> | Computation<A, any, any>;
/**
 * The union of effect-types which produce a `B`.
 */
export type EffectTo<B> = IO<B> | Task<any, B> | SafeComputation<any, B> | Computation<any, any, B>;

/**
 * The union of asynchronous effect-types which take an `A` and return a `B` (where `A` may be `never`).
 */
export type AsyncEffectFromTo<A, B> = A extends never ? AsyncEffectTo<B> : AsyncSafeComputation<A, B> | AsyncComputation<A, any, B>;
/**
 * The union of asynchronous effect-types which take an `A`.
 */
export type AsyncEffectFrom<A> = AsyncSafeComputation<A, any> | AsyncComputation<A, any, any>;
/**
 * The union of asynchronous effect-types which produce a `B`.
 */
export type AsyncEffectTo<B> = AsyncIO<B> | AsyncTask<any, B> | AsyncSafeComputation<any, B> | AsyncComputation<any, any, B>;

/**
 * The first non-`never` type of `A` and `B`.
 */
export type Coalesce2<A, B> = A extends never ? B : A;
/**
 * The first non-`never` type of `A`-`C`.
 */
export type Coalesce3<A, B, C> = A extends never ? Coalesce2<B, C> : A;
/**
 * The first non-`never` type of `A`-`D`.
 */
export type Coalesce4<A, B, C, D> = A extends never ? Coalesce3<B, C, D> : A;
/**
 * The first non-`never` type of `A`-`E`.
 */
export type Coalesce5<A, B, C, D, E> = A extends never ? Coalesce4<B, C, D, E> : A;
/**
 * The first non-`never` type of `A`-`F`.
 */
export type Coalesce6<A, B, C, D, E, F> = A extends never ? Coalesce5<B, C, D, E, F> : A;
/**
 * The first non-`never` type of `A`-`G`.
 */
export type Coalesce7<A, B, C, D, E, F, G> = A extends never ? Coalesce6<B, C, D, E, F, G> : A;
/**
 * The first non-`never` type of `A`-`H`.
 */
export type Coalesce8<A, B, C, D, E, F, G, H> = A extends never ? Coalesce7<B, C, D, E, F, G, H> : A;
/**
 * The first non-`never` type of `A`-`I`.
 */
export type Coalesce9<A, B, C, D, E, F, G, H, I> = A extends never ? Coalesce8<B, C, D, E, F, G, H, I> : A;
/**
 * The first non-`never` type of `A`-`J`.
 */
export type Coalesce10<A, B, C, D, E, F, G, H, I, J> = A extends never ? Coalesce9<B, C, D, E, F, G, H, I, J> : A;
/**
 * The first non-`never` type of `A`-`K`.
 */
export type Coalesce11<A, B, C, D, E, F, G, H, I, J, K> = A extends never ? Coalesce10<B, C, D, E, F, G, H, I, J, K> : A;
/**
 * The first non-`never` type of `A`-`L`.
 */
export type Coalesce12<A, B, C, D, E, F, G, H, I, J, K, L> = A extends never ? Coalesce11<B, C, D, E, F, G, H, I, J, K, L> : A;
/**
 * The first non-`never` type of `A`-`M`.
 */
export type Coalesce13<A, B, C, D, E, F, G, H, I, J, K, L, M> = A extends never ? Coalesce12<B, C, D, E, F, G, H, I, J, K, L, M> : A;
/**
 * The first non-`never` type of `A`-`N`.
 */
export type Coalesce14<A, B, C, D, E, F, G, H, I, J, K, L, M, N> = A extends never ? Coalesce13<B, C, D, E, F, G, H, I, J, K, L, M, N> : A;
/**
 * The first non-`never` type of `A`-`O`.
 */
export type Coalesce15<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O> = A extends never ? Coalesce14<B, C, D, E, F, G, H, I, J, K, L, M, N, O> : A;
/**
 * The first non-`never` type of `A`-`P`.
 */
export type Coalesce16<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P> = A extends never ? Coalesce15<B, C, D, E, F, G, H, I, J, K, L, M, N, O, P> : A;
/**
 * The first non-`never` type of `A`-`Q`.
 */
export type Coalesce17<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q> = A extends never ? Coalesce16<B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q> : A;
/**
 * The first non-`never` type of `A`-`R`.
 */
export type Coalesce18<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R> = A extends never ? Coalesce17<B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R> : A;
/**
 * The first non-`never` type of `A`-`S`.
 */
export type Coalesce19<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S> = A extends never ? Coalesce18<B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S> : A;
/**
 * The first non-`never` type of `A`-`T`.
 */
export type Coalesce20<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T> = A extends never ? Coalesce19<B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T> : A;

/**
 * The inner type of the first value to {@link pipeEffects}, i.e. `T` if the type of the value extends `IO<T>`, else the type of the value.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export type PipeAValue<A> = A extends IO<infer B> ? B : A;
/**
 * The inner type of the first value to {@link pipeAsyncEffects}, i.e. `T` if the type of the value extends `AsyncIO<T>`, else the type of the value.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export type AsyncPipeAValue<A> = A extends (AsyncIO<infer B> | IO<infer B>) ? B : A;

/**
 * Pipes a pure value or the value from an {@link IO} through a series of composable effects to compose a new effect.
 */
export function pipeEffects<A, B>(a: A, e1: EffectFromTo<PipeAValue<A>, B>): EffectTo<B>;
export function pipeEffects<A, B, C>(a: A, e1: EffectFromTo<PipeAValue<A>, B>, e2: EffectFromTo<B, C>): EffectTo<C>;
export function pipeEffects<A, B, C, D>(a: A, e1: EffectFromTo<PipeAValue<A>, B>, e2: EffectFromTo<B, C>, e3: EffectFromTo<C, D>): EffectTo<D>;
export function pipeEffects<A, B, C, D, E>(a: A, e1: EffectFromTo<PipeAValue<A>, B>, e2: EffectFromTo<B, C>, e3: EffectFromTo<C, D>, e4: EffectFromTo<D, E>): EffectTo<E>;
export function pipeEffects<
	A,
	B,
	C,
	D,
	E,
	F>(
	a: A,
	e1: EffectFromTo<PipeAValue<A>, B>,
	e2: EffectFromTo<B, C>,
	e3: EffectFromTo<C, D>,
	e4: EffectFromTo<D, E>,
	e5: EffectFromTo<E, F>): EffectTo<F>;
export function pipeEffects<
	A,
	B,
	C,
	D,
	E,
	F,
	G>(
	a: A,
	e1: EffectFromTo<PipeAValue<A>, B>,
	e2: EffectFromTo<B, C>,
	e3: EffectFromTo<C, D>,
	e4: EffectFromTo<D, E>,
	e5: EffectFromTo<E, F>,
	e6: EffectFromTo<F, G>): EffectTo<G>;
export function pipeEffects<
	A,
	B,
	C,
	D,
	E,
	F,
	G,
	H>(
	a: A,
	e1: EffectFromTo<PipeAValue<A>, B>,
	e2: EffectFromTo<B, C>,
	e3: EffectFromTo<C, D>,
	e4: EffectFromTo<D, E>,
	e5: EffectFromTo<E, F>,
	e6: EffectFromTo<F, G>,
	e7: EffectFromTo<G, H>): EffectTo<H>;
export function pipeEffects<
	A,
	B,
	C,
	D,
	E,
	F,
	G,
	H,
	I>(
	a: A,
	e1: EffectFromTo<PipeAValue<A>, B>,
	e2: EffectFromTo<B, C>,
	e3: EffectFromTo<C, D>,
	e4: EffectFromTo<D, E>,
	e5: EffectFromTo<E, F>,
	e6: EffectFromTo<F, G>,
	e7: EffectFromTo<G, H>,
	e8: EffectFromTo<H, I>): EffectTo<I>;
export function pipeEffects<
	A,
	B,
	C,
	D,
	E,
	F,
	G,
	H,
	I,
	J>(
	a: A,
	e1: EffectFromTo<PipeAValue<A>, B>,
	e2: EffectFromTo<B, C>,
	e3: EffectFromTo<C, D>,
	e4: EffectFromTo<D, E>,
	e5: EffectFromTo<E, F>,
	e6: EffectFromTo<F, G>,
	e7: EffectFromTo<G, H>,
	e8: EffectFromTo<H, I>,
	e9: EffectFromTo<I, J>): EffectTo<J>;
export function pipeEffects<
	A,
	B,
	C,
	D,
	E,
	F,
	G,
	H,
	I,
	J,
	K>(
	a: A,
	e1: EffectFromTo<PipeAValue<A>, B>,
	e2: EffectFromTo<B, C>,
	e3: EffectFromTo<C, D>,
	e4: EffectFromTo<D, E>,
	e5: EffectFromTo<E, F>,
	e6: EffectFromTo<F, G>,
	e7: EffectFromTo<G, H>,
	e8: EffectFromTo<H, I>,
	e9: EffectFromTo<I, J>,
	e10: EffectFromTo<J, K>): EffectTo<K>;
export function pipeEffects<
	A,
	B,
	C,
	D,
	E,
	F,
	G,
	H,
	I,
	J,
	K,
	L>(
	a: A,
	e1: EffectFromTo<PipeAValue<A>, B>,
	e2: EffectFromTo<B, C>,
	e3: EffectFromTo<C, D>,
	e4: EffectFromTo<D, E>,
	e5: EffectFromTo<E, F>,
	e6: EffectFromTo<F, G>,
	e7: EffectFromTo<G, H>,
	e8: EffectFromTo<H, I>,
	e9: EffectFromTo<I, J>,
	e10: EffectFromTo<J, K>,
	e11: EffectFromTo<K, L>): EffectTo<L>;
export function pipeEffects<
	A,
	B,
	C,
	D,
	E,
	F,
	G,
	H,
	I,
	J,
	K,
	L,
	M>(
	a: A,
	e1: EffectFromTo<PipeAValue<A>, B>,
	e2: EffectFromTo<B, C>,
	e3: EffectFromTo<C, D>,
	e4: EffectFromTo<D, E>,
	e5: EffectFromTo<E, F>,
	e6: EffectFromTo<F, G>,
	e7: EffectFromTo<G, H>,
	e8: EffectFromTo<H, I>,
	e9: EffectFromTo<I, J>,
	e10: EffectFromTo<J, K>,
	e11: EffectFromTo<K, L>,
	e12: EffectFromTo<L, M>): EffectTo<M>;
export function pipeEffects<
	A,
	B,
	C,
	D,
	E,
	F,
	G,
	H,
	I,
	J,
	K,
	L,
	M,
	N>(
	a: A,
	e1: EffectFromTo<PipeAValue<A>, B>,
	e2: EffectFromTo<B, C>,
	e3: EffectFromTo<C, D>,
	e4: EffectFromTo<D, E>,
	e5: EffectFromTo<E, F>,
	e6: EffectFromTo<F, G>,
	e7: EffectFromTo<G, H>,
	e8: EffectFromTo<H, I>,
	e9: EffectFromTo<I, J>,
	e10: EffectFromTo<J, K>,
	e11: EffectFromTo<K, L>,
	e12: EffectFromTo<L, M>,
	e13: EffectFromTo<M, N>): EffectTo<N>;
export function pipeEffects<
	A,
	B,
	C,
	D,
	E,
	F,
	G,
	H,
	I,
	J,
	K,
	L,
	M,
	N,
	O>(
	a: A,
	e1: EffectFromTo<PipeAValue<A>, B>,
	e2: EffectFromTo<B, C>,
	e3: EffectFromTo<C, D>,
	e4: EffectFromTo<D, E>,
	e5: EffectFromTo<E, F>,
	e6: EffectFromTo<F, G>,
	e7: EffectFromTo<G, H>,
	e8: EffectFromTo<H, I>,
	e9: EffectFromTo<I, J>,
	e10: EffectFromTo<J, K>,
	e11: EffectFromTo<K, L>,
	e12: EffectFromTo<L, M>,
	e13: EffectFromTo<M, N>,
	e14: EffectFromTo<N, O>): EffectTo<O>;
export function pipeEffects<
	A,
	B,
	C,
	D,
	E,
	F,
	G,
	H,
	I,
	J,
	K,
	L,
	M,
	N,
	O,
	P>(
	a: A,
	e1: EffectFromTo<PipeAValue<A>, B>,
	e2: EffectFromTo<B, C>,
	e3: EffectFromTo<C, D>,
	e4: EffectFromTo<D, E>,
	e5: EffectFromTo<E, F>,
	e6: EffectFromTo<F, G>,
	e7: EffectFromTo<G, H>,
	e8: EffectFromTo<H, I>,
	e9: EffectFromTo<I, J>,
	e10: EffectFromTo<J, K>,
	e11: EffectFromTo<K, L>,
	e12: EffectFromTo<L, M>,
	e13: EffectFromTo<M, N>,
	e14: EffectFromTo<N, O>,
	e15: EffectFromTo<O, P>): EffectTo<P>;
export function pipeEffects<
	A,
	B,
	C,
	D,
	E,
	F,
	G,
	H,
	I,
	J,
	K,
	L,
	M,
	N,
	O,
	P,
	Q>(
	a: A,
	e1: EffectFromTo<PipeAValue<A>, B>,
	e2: EffectFromTo<B, C>,
	e3: EffectFromTo<C, D>,
	e4: EffectFromTo<D, E>,
	e5: EffectFromTo<E, F>,
	e6: EffectFromTo<F, G>,
	e7: EffectFromTo<G, H>,
	e8: EffectFromTo<H, I>,
	e9: EffectFromTo<I, J>,
	e10: EffectFromTo<J, K>,
	e11: EffectFromTo<K, L>,
	e12: EffectFromTo<L, M>,
	e13: EffectFromTo<M, N>,
	e14: EffectFromTo<N, O>,
	e15: EffectFromTo<O, P>,
	e16: EffectFromTo<P, Q>): EffectTo<Q>;
export function pipeEffects<
	A,
	B,
	C,
	D,
	E,
	F,
	G,
	H,
	I,
	J,
	K,
	L,
	M,
	N,
	O,
	P,
	Q,
	R>(
	a: A,
	e1: EffectFromTo<PipeAValue<A>, B>,
	e2: EffectFromTo<B, C>,
	e3: EffectFromTo<C, D>,
	e4: EffectFromTo<D, E>,
	e5: EffectFromTo<E, F>,
	e6: EffectFromTo<F, G>,
	e7: EffectFromTo<G, H>,
	e8: EffectFromTo<H, I>,
	e9: EffectFromTo<I, J>,
	e10: EffectFromTo<J, K>,
	e11: EffectFromTo<K, L>,
	e12: EffectFromTo<L, M>,
	e13: EffectFromTo<M, N>,
	e14: EffectFromTo<N, O>,
	e15: EffectFromTo<O, P>,
	e16: EffectFromTo<P, Q>,
	e17: EffectFromTo<Q, R>): EffectTo<R>;
export function pipeEffects<
	A,
	B,
	C,
	D,
	E,
	F,
	G,
	H,
	I,
	J,
	K,
	L,
	M,
	N,
	O,
	P,
	Q,
	R,
	S>(
	a: A,
	e1: EffectFromTo<PipeAValue<A>, B>,
	e2: EffectFromTo<B, C>,
	e3: EffectFromTo<C, D>,
	e4: EffectFromTo<D, E>,
	e5: EffectFromTo<E, F>,
	e6: EffectFromTo<F, G>,
	e7: EffectFromTo<G, H>,
	e8: EffectFromTo<H, I>,
	e9: EffectFromTo<I, J>,
	e10: EffectFromTo<J, K>,
	e11: EffectFromTo<K, L>,
	e12: EffectFromTo<L, M>,
	e13: EffectFromTo<M, N>,
	e14: EffectFromTo<N, O>,
	e15: EffectFromTo<O, P>,
	e16: EffectFromTo<P, Q>,
	e17: EffectFromTo<Q, R>,
	e18: EffectFromTo<R, S>): EffectTo<S>;
export function pipeEffects<
	A,
	B,
	C,
	D,
	E,
	F,
	G,
	H,
	I,
	J,
	K,
	L,
	M,
	N,
	O,
	P,
	Q,
	R,
	S,
	T>(
	a: A,
	e1: EffectFromTo<PipeAValue<A>, B>,
	e2: EffectFromTo<B, C>,
	e3: EffectFromTo<C, D>,
	e4: EffectFromTo<D, E>,
	e5: EffectFromTo<E, F>,
	e6: EffectFromTo<F, G>,
	e7: EffectFromTo<G, H>,
	e8: EffectFromTo<H, I>,
	e9: EffectFromTo<I, J>,
	e10: EffectFromTo<J, K>,
	e11: EffectFromTo<K, L>,
	e12: EffectFromTo<L, M>,
	e13: EffectFromTo<M, N>,
	e14: EffectFromTo<N, O>,
	e15: EffectFromTo<O, P>,
	e16: EffectFromTo<P, Q>,
	e17: EffectFromTo<Q, R>,
	e18: EffectFromTo<R, S>,
	e19: EffectFromTo<S, T>): EffectTo<T>;
export function pipeEffects<
	A,
	B,
	C,
	D,
	E,
	F,
	G,
	H,
	I,
	J,
	K,
	L,
	M,
	N,
	O,
	P,
	Q,
	R,
	S,
	T>(
	a: A,
	e1?: EffectFromTo<PipeAValue<A>, B>,
	e2?: EffectFromTo<B, C>,
	e3?: EffectFromTo<C, D>,
	e4?: EffectFromTo<D, E>,
	e5?: EffectFromTo<E, F>,
	e6?: EffectFromTo<F, G>,
	e7?: EffectFromTo<G, H>,
	e8?: EffectFromTo<H, I>,
	e9?: EffectFromTo<I, J>,
	e10?: EffectFromTo<J, K>,
	e11?: EffectFromTo<K, L>,
	e12?: EffectFromTo<L, M>,
	e13?: EffectFromTo<M, N>,
	e14?: EffectFromTo<N, O>,
	e15?: EffectFromTo<O, P>,
	e16?: EffectFromTo<P, Q>,
	e17?: EffectFromTo<Q, R>,
	e18?: EffectFromTo<R, S>,
	e19?: EffectFromTo<S, T>): EffectTo<
	  Coalesce20<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T>
	> {
		type Result = EffectTo<Coalesce20<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T>>;
		const aValue: PipeAValue<A> = (a instanceof IO ? a.evaluate() : a) as PipeAValue<A>;
		switch (arguments.length) {
			case 2: {
				return new Task<any, B>(() => e1!.evaluate(aValue) as Either<any, B>) as Result;
			}

			case 3: {
				// Use map
				return e1!.toComputation().map((b: B) => e2!.toComputation().evaluate(b)).bindInput(aValue) as Result;
			}

			case 4: {
				return e1!.toComputation().map(
					(b: B) => e2!.toComputation().map(
						(c: C) => e3!.toComputation().evaluate(c),
					).evaluate(b),
				).bindInput(aValue) as Result;
			}

			case 5: {
				return e1!.toComputation().map(
					(b: B) => e2!.toComputation().map(
						(c: C) => e3!.toComputation().map(
							(d: D) => e4!.toComputation().evaluate(d),
						).evaluate(c),
					).evaluate(b),
				).bindInput(aValue) as Result;
			}

			case 6: {
				return e1!.toComputation().map(
					(b: B) => e2!.toComputation().map(
						(c: C) => e3!.toComputation().map(
							(d: D) => e4!.toComputation().map(
								(e: E) => e5!.toComputation().evaluate(e),
							).evaluate(d),
						).evaluate(c),
					).evaluate(b),
				).bindInput(aValue) as Result;
			}

			case 7: {
				return e1!.toComputation().map(
					(b: B) => e2!.toComputation().map(
						(c: C) => e3!.toComputation().map(
							(d: D) => e4!.toComputation().map(
								(e: E) => e5!.toComputation().map(
									(f: F) => e6!.toComputation().evaluate(f),
								).evaluate(e),
							).evaluate(d),
						).evaluate(c),
					).evaluate(b),
				).bindInput(aValue) as Result;
			}

			case 8: {
				return e1!.toComputation().map(
					(b: B) => e2!.toComputation().map(
						(c: C) => e3!.toComputation().map(
							(d: D) => e4!.toComputation().map(
								(e: E) => e5!.toComputation().map(
									(f: F) => e6!.toComputation().map(
										(g: G) => e7!.toComputation().evaluate(g),
									).evaluate(f),
								).evaluate(e),
							).evaluate(d),
						).evaluate(c),
					).evaluate(b),
				).bindInput(aValue) as Result;
			}

			case 9: {
				return e1!.toComputation().map(
					(b: B) => e2!.toComputation().map(
						(c: C) => e3!.toComputation().map(
							(d: D) => e4!.toComputation().map(
								(e: E) => e5!.toComputation().map(
									(f: F) => e6!.toComputation().map(
										(g: G) => e7!.toComputation().map(
											(h: H) => e8!.toComputation().evaluate(h),
										).evaluate(g),
									).evaluate(f),
								).evaluate(e),
							).evaluate(d),
						).evaluate(c),
					).evaluate(b),
				).bindInput(aValue) as Result;
			}

			case 10: {
				return e1!.toComputation().map(
					(b: B) => e2!.toComputation().map(
						(c: C) => e3!.toComputation().map(
							(d: D) => e4!.toComputation().map(
								(e: E) => e5!.toComputation().map(
									(f: F) => e6!.toComputation().map(
										(g: G) => e7!.toComputation().map(
											(h: H) => e8!.toComputation().map(
												(i: I) => e9!.toComputation().evaluate(i),
											).evaluate(h),
										).evaluate(g),
									).evaluate(f),
								).evaluate(e),
							).evaluate(d),
						).evaluate(c),
					).evaluate(b),
				).bindInput(aValue) as Result;
			}

			case 11: {
				return e1!.toComputation().map(
					(b: B) => e2!.toComputation().map(
						(c: C) => e3!.toComputation().map(
							(d: D) => e4!.toComputation().map(
								(e: E) => e5!.toComputation().map(
									(f: F) => e6!.toComputation().map(
										(g: G) => e7!.toComputation().map(
											(h: H) => e8!.toComputation().map(
												(i: I) => e9!.toComputation().map(
													(j: J) => e10!.toComputation().evaluate(j),
												).evaluate(i),
											).evaluate(h),
										).evaluate(g),
									).evaluate(f),
								).evaluate(e),
							).evaluate(d),
						).evaluate(c),
					).evaluate(b),
				).bindInput(aValue) as Result;
			}

			case 12: {
				return e1!.toComputation().map(
					(b: B) => e2!.toComputation().map(
						(c: C) => e3!.toComputation().map(
							(d: D) => e4!.toComputation().map(
								(e: E) => e5!.toComputation().map(
									(f: F) => e6!.toComputation().map(
										(g: G) => e7!.toComputation().map(
											(h: H) => e8!.toComputation().map(
												(i: I) => e9!.toComputation().map(
													(j: J) => e10!.toComputation().map(
														(k: K) => e11!.toComputation().evaluate(k),
													).evaluate(j),
												).evaluate(i),
											).evaluate(h),
										).evaluate(g),
									).evaluate(f),
								).evaluate(e),
							).evaluate(d),
						).evaluate(c),
					).evaluate(b),
				).bindInput(aValue) as Result;
			}

			case 13: {
				return e1!.toComputation().map(
					(b: B) => e2!.toComputation().map(
						(c: C) => e3!.toComputation().map(
							(d: D) => e4!.toComputation().map(
								(e: E) => e5!.toComputation().map(
									(f: F) => e6!.toComputation().map(
										(g: G) => e7!.toComputation().map(
											(h: H) => e8!.toComputation().map(
												(i: I) => e9!.toComputation().map(
													(j: J) => e10!.toComputation().map(
														(k: K) => e11!.toComputation().map(
															(l: L) => e12!.toComputation().evaluate(l),
														).evaluate(k),
													).evaluate(j),
												).evaluate(i),
											).evaluate(h),
										).evaluate(g),
									).evaluate(f),
								).evaluate(e),
							).evaluate(d),
						).evaluate(c),
					).evaluate(b),
				).bindInput(aValue) as Result;
			}

			case 14: {
				return e1!.toComputation().map(
					(b: B) => e2!.toComputation().map(
						(c: C) => e3!.toComputation().map(
							(d: D) => e4!.toComputation().map(
								(e: E) => e5!.toComputation().map(
									(f: F) => e6!.toComputation().map(
										(g: G) => e7!.toComputation().map(
											(h: H) => e8!.toComputation().map(
												(i: I) => e9!.toComputation().map(
													(j: J) => e10!.toComputation().map(
														(k: K) => e11!.toComputation().map(
															(l: L) => e12!.toComputation().map(
																(m: M) => e13!.toComputation().evaluate(m),
															).evaluate(l),
														).evaluate(k),
													).evaluate(j),
												).evaluate(i),
											).evaluate(h),
										).evaluate(g),
									).evaluate(f),
								).evaluate(e),
							).evaluate(d),
						).evaluate(c),
					).evaluate(b),
				).bindInput(aValue) as Result;
			}

			case 15: {
				return e1!.toComputation().map(
					(b: B) => e2!.toComputation().map(
						(c: C) => e3!.toComputation().map(
							(d: D) => e4!.toComputation().map(
								(e: E) => e5!.toComputation().map(
									(f: F) => e6!.toComputation().map(
										(g: G) => e7!.toComputation().map(
											(h: H) => e8!.toComputation().map(
												(i: I) => e9!.toComputation().map(
													(j: J) => e10!.toComputation().map(
														(k: K) => e11!.toComputation().map(
															(l: L) => e12!.toComputation().map(
																(m: M) => e13!.toComputation().map(
																	(n: N) => e14!.toComputation().evaluate(n),
																).evaluate(m),
															).evaluate(l),
														).evaluate(k),
													).evaluate(j),
												).evaluate(i),
											).evaluate(h),
										).evaluate(g),
									).evaluate(f),
								).evaluate(e),
							).evaluate(d),
						).evaluate(c),
					).evaluate(b),
				).bindInput(aValue) as Result;
			}

			default: {
				let currResult: any = e1!;
				for (let i = 1; i < arguments.length; i++) {
					if (arguments[i] === undefined) {
						break;
					}

					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
					currResult = currResult.toComputation().map(
						// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
						(arg: any) => arguments[i].toComputation().evaluate(arg),
					);
				}

				return (currResult as Computation<any, any, any>).bindInput(aValue) as Result;
			}
		}
}

/**
 * EXAMPLE
 */

/**
const computationPlus2 = new Computation<number, any, number>(
	(a: number) => new Right<any, number>(a + 2),
);

const safeComputationTimes3 = new SafeComputation<number, number>(
	(a: number) => a * 3,
);

const computationNumberToString = new Computation<number, any, string>(
	(a: number) => new Right<any, string>(a.toString()),
);

const computationPrintString = new Computation<string, any, void>(
	(a: string) => {
		console.log(a);
		return new Right<any, void>(undefined);
	},
);

// Will work, since effects are composable
const pipedComputations = pipeEffects(42, computationPlus2, safeComputationTimes3, computationNumberToString, computationPrintString);

// @ts-expect-error - Will not work, since effects are not composable
const invalidPipedComputation = pipeEffects(42, computationPlus2, computationNumberToString, safeComputationTimes3, computationPrintString);
**/

/**
 * Pipes a pure value or the value of an {@link AsyncIO} or {@link IO}
 */
export function pipeAsyncEffects<A, B>(a: A, e1: AsyncEffectFromTo<AsyncPipeAValue<A>, B>): AsyncEffectTo<B>;
export function pipeAsyncEffects<A, B, C>(a: A, e1: AsyncEffectFromTo<AsyncPipeAValue<A>, B>, e2: AsyncEffectFromTo<B, C>): AsyncEffectTo<C>;
export function pipeAsyncEffects<A, B, C, D>(a: A, e1: AsyncEffectFromTo<AsyncPipeAValue<A>, B>, e2: AsyncEffectFromTo<B, C>, e3: AsyncEffectFromTo<C, D>): AsyncEffectTo<D>;
export function pipeAsyncEffects<A, B, C, D, E>(a: A, e1: AsyncEffectFromTo<AsyncPipeAValue<A>, B>, e2: AsyncEffectFromTo<B, C>, e3: AsyncEffectFromTo<C, D>, e4: AsyncEffectFromTo<D, E>): AsyncEffectTo<E>;
export function pipeAsyncEffects<
	A,
	B,
	C,
	D,
	E,
	F>(
	a: A,
	e1: AsyncEffectFromTo<AsyncPipeAValue<A>, B>,
	e2: AsyncEffectFromTo<B, C>,
	e3: AsyncEffectFromTo<C, D>,
	e4: AsyncEffectFromTo<D, E>,
	e5: AsyncEffectFromTo<E, F>): AsyncEffectTo<F>;
export function pipeAsyncEffects<
	A,
	B,
	C,
	D,
	E,
	F,
	G>(
	a: A,
	e1: AsyncEffectFromTo<AsyncPipeAValue<A>, B>,
	e2: AsyncEffectFromTo<B, C>,
	e3: AsyncEffectFromTo<C, D>,
	e4: AsyncEffectFromTo<D, E>,
	e5: AsyncEffectFromTo<E, F>,
	e6: AsyncEffectFromTo<F, G>): AsyncEffectTo<G>;
export function pipeAsyncEffects<
	A,
	B,
	C,
	D,
	E,
	F,
	G,
	H>(
	a: A,
	e1: AsyncEffectFromTo<AsyncPipeAValue<A>, B>,
	e2: AsyncEffectFromTo<B, C>,
	e3: AsyncEffectFromTo<C, D>,
	e4: AsyncEffectFromTo<D, E>,
	e5: AsyncEffectFromTo<E, F>,
	e6: AsyncEffectFromTo<F, G>,
	e7: AsyncEffectFromTo<G, H>): AsyncEffectTo<H>;
export function pipeAsyncEffects<
	A,
	B,
	C,
	D,
	E,
	F,
	G,
	H,
	I>(
	a: A,
	e1: AsyncEffectFromTo<AsyncPipeAValue<A>, B>,
	e2: AsyncEffectFromTo<B, C>,
	e3: AsyncEffectFromTo<C, D>,
	e4: AsyncEffectFromTo<D, E>,
	e5: AsyncEffectFromTo<E, F>,
	e6: AsyncEffectFromTo<F, G>,
	e7: AsyncEffectFromTo<G, H>,
	e8: AsyncEffectFromTo<H, I>): AsyncEffectTo<I>;
export function pipeAsyncEffects<
	A,
	B,
	C,
	D,
	E,
	F,
	G,
	H,
	I,
	J>(
	a: A,
	e1: AsyncEffectFromTo<AsyncPipeAValue<A>, B>,
	e2: AsyncEffectFromTo<B, C>,
	e3: AsyncEffectFromTo<C, D>,
	e4: AsyncEffectFromTo<D, E>,
	e5: AsyncEffectFromTo<E, F>,
	e6: AsyncEffectFromTo<F, G>,
	e7: AsyncEffectFromTo<G, H>,
	e8: AsyncEffectFromTo<H, I>,
	e9: AsyncEffectFromTo<I, J>): AsyncEffectTo<J>;
export function pipeAsyncEffects<
	A,
	B,
	C,
	D,
	E,
	F,
	G,
	H,
	I,
	J,
	K>(
	a: A,
	e1: AsyncEffectFromTo<AsyncPipeAValue<A>, B>,
	e2: AsyncEffectFromTo<B, C>,
	e3: AsyncEffectFromTo<C, D>,
	e4: AsyncEffectFromTo<D, E>,
	e5: AsyncEffectFromTo<E, F>,
	e6: AsyncEffectFromTo<F, G>,
	e7: AsyncEffectFromTo<G, H>,
	e8: AsyncEffectFromTo<H, I>,
	e9: AsyncEffectFromTo<I, J>,
	e10: AsyncEffectFromTo<J, K>): AsyncEffectTo<K>;
export function pipeAsyncEffects<
	A,
	B,
	C,
	D,
	E,
	F,
	G,
	H,
	I,
	J,
	K,
	L>(
	a: A,
	e1: AsyncEffectFromTo<AsyncPipeAValue<A>, B>,
	e2: AsyncEffectFromTo<B, C>,
	e3: AsyncEffectFromTo<C, D>,
	e4: AsyncEffectFromTo<D, E>,
	e5: AsyncEffectFromTo<E, F>,
	e6: AsyncEffectFromTo<F, G>,
	e7: AsyncEffectFromTo<G, H>,
	e8: AsyncEffectFromTo<H, I>,
	e9: AsyncEffectFromTo<I, J>,
	e10: AsyncEffectFromTo<J, K>,
	e11: AsyncEffectFromTo<K, L>): AsyncEffectTo<L>;
export function pipeAsyncEffects<
	A,
	B,
	C,
	D,
	E,
	F,
	G,
	H,
	I,
	J,
	K,
	L,
	M>(
	a: A,
	e1: AsyncEffectFromTo<AsyncPipeAValue<A>, B>,
	e2: AsyncEffectFromTo<B, C>,
	e3: AsyncEffectFromTo<C, D>,
	e4: AsyncEffectFromTo<D, E>,
	e5: AsyncEffectFromTo<E, F>,
	e6: AsyncEffectFromTo<F, G>,
	e7: AsyncEffectFromTo<G, H>,
	e8: AsyncEffectFromTo<H, I>,
	e9: AsyncEffectFromTo<I, J>,
	e10: AsyncEffectFromTo<J, K>,
	e11: AsyncEffectFromTo<K, L>,
	e12: AsyncEffectFromTo<L, M>): AsyncEffectTo<M>;
export function pipeAsyncEffects<
	A,
	B,
	C,
	D,
	E,
	F,
	G,
	H,
	I,
	J,
	K,
	L,
	M,
	N>(
	a: A,
	e1: AsyncEffectFromTo<AsyncPipeAValue<A>, B>,
	e2: AsyncEffectFromTo<B, C>,
	e3: AsyncEffectFromTo<C, D>,
	e4: AsyncEffectFromTo<D, E>,
	e5: AsyncEffectFromTo<E, F>,
	e6: AsyncEffectFromTo<F, G>,
	e7: AsyncEffectFromTo<G, H>,
	e8: AsyncEffectFromTo<H, I>,
	e9: AsyncEffectFromTo<I, J>,
	e10: AsyncEffectFromTo<J, K>,
	e11: AsyncEffectFromTo<K, L>,
	e12: AsyncEffectFromTo<L, M>,
	e13: AsyncEffectFromTo<M, N>): AsyncEffectTo<N>;
export function pipeAsyncEffects<
	A,
	B,
	C,
	D,
	E,
	F,
	G,
	H,
	I,
	J,
	K,
	L,
	M,
	N,
	O>(
	a: A,
	e1: AsyncEffectFromTo<AsyncPipeAValue<A>, B>,
	e2: AsyncEffectFromTo<B, C>,
	e3: AsyncEffectFromTo<C, D>,
	e4: AsyncEffectFromTo<D, E>,
	e5: AsyncEffectFromTo<E, F>,
	e6: AsyncEffectFromTo<F, G>,
	e7: AsyncEffectFromTo<G, H>,
	e8: AsyncEffectFromTo<H, I>,
	e9: AsyncEffectFromTo<I, J>,
	e10: AsyncEffectFromTo<J, K>,
	e11: AsyncEffectFromTo<K, L>,
	e12: AsyncEffectFromTo<L, M>,
	e13: AsyncEffectFromTo<M, N>,
	e14: AsyncEffectFromTo<N, O>): AsyncEffectTo<O>;
export function pipeAsyncEffects<
	A,
	B,
	C,
	D,
	E,
	F,
	G,
	H,
	I,
	J,
	K,
	L,
	M,
	N,
	O,
	P>(
	a: A,
	e1: AsyncEffectFromTo<AsyncPipeAValue<A>, B>,
	e2: AsyncEffectFromTo<B, C>,
	e3: AsyncEffectFromTo<C, D>,
	e4: AsyncEffectFromTo<D, E>,
	e5: AsyncEffectFromTo<E, F>,
	e6: AsyncEffectFromTo<F, G>,
	e7: AsyncEffectFromTo<G, H>,
	e8: AsyncEffectFromTo<H, I>,
	e9: AsyncEffectFromTo<I, J>,
	e10: AsyncEffectFromTo<J, K>,
	e11: AsyncEffectFromTo<K, L>,
	e12: AsyncEffectFromTo<L, M>,
	e13: AsyncEffectFromTo<M, N>,
	e14: AsyncEffectFromTo<N, O>,
	e15: AsyncEffectFromTo<O, P>): AsyncEffectTo<P>;
export function pipeAsyncEffects<
	A,
	B,
	C,
	D,
	E,
	F,
	G,
	H,
	I,
	J,
	K,
	L,
	M,
	N,
	O,
	P,
	Q>(
	a: A,
	e1: AsyncEffectFromTo<AsyncPipeAValue<A>, B>,
	e2: AsyncEffectFromTo<B, C>,
	e3: AsyncEffectFromTo<C, D>,
	e4: AsyncEffectFromTo<D, E>,
	e5: AsyncEffectFromTo<E, F>,
	e6: AsyncEffectFromTo<F, G>,
	e7: AsyncEffectFromTo<G, H>,
	e8: AsyncEffectFromTo<H, I>,
	e9: AsyncEffectFromTo<I, J>,
	e10: AsyncEffectFromTo<J, K>,
	e11: AsyncEffectFromTo<K, L>,
	e12: AsyncEffectFromTo<L, M>,
	e13: AsyncEffectFromTo<M, N>,
	e14: AsyncEffectFromTo<N, O>,
	e15: AsyncEffectFromTo<O, P>,
	e16: AsyncEffectFromTo<P, Q>): AsyncEffectTo<Q>;
export function pipeAsyncEffects<
	A,
	B,
	C,
	D,
	E,
	F,
	G,
	H,
	I,
	J,
	K,
	L,
	M,
	N,
	O,
	P,
	Q,
	R>(
	a: A,
	e1: AsyncEffectFromTo<AsyncPipeAValue<A>, B>,
	e2: AsyncEffectFromTo<B, C>,
	e3: AsyncEffectFromTo<C, D>,
	e4: AsyncEffectFromTo<D, E>,
	e5: AsyncEffectFromTo<E, F>,
	e6: AsyncEffectFromTo<F, G>,
	e7: AsyncEffectFromTo<G, H>,
	e8: AsyncEffectFromTo<H, I>,
	e9: AsyncEffectFromTo<I, J>,
	e10: AsyncEffectFromTo<J, K>,
	e11: AsyncEffectFromTo<K, L>,
	e12: AsyncEffectFromTo<L, M>,
	e13: AsyncEffectFromTo<M, N>,
	e14: AsyncEffectFromTo<N, O>,
	e15: AsyncEffectFromTo<O, P>,
	e16: AsyncEffectFromTo<P, Q>,
	e17: AsyncEffectFromTo<Q, R>): AsyncEffectTo<R>;
export function pipeAsyncEffects<
	A,
	B,
	C,
	D,
	E,
	F,
	G,
	H,
	I,
	J,
	K,
	L,
	M,
	N,
	O,
	P,
	Q,
	R,
	S>(
	a: A,
	e1: AsyncEffectFromTo<AsyncPipeAValue<A>, B>,
	e2: AsyncEffectFromTo<B, C>,
	e3: AsyncEffectFromTo<C, D>,
	e4: AsyncEffectFromTo<D, E>,
	e5: AsyncEffectFromTo<E, F>,
	e6: AsyncEffectFromTo<F, G>,
	e7: AsyncEffectFromTo<G, H>,
	e8: AsyncEffectFromTo<H, I>,
	e9: AsyncEffectFromTo<I, J>,
	e10: AsyncEffectFromTo<J, K>,
	e11: AsyncEffectFromTo<K, L>,
	e12: AsyncEffectFromTo<L, M>,
	e13: AsyncEffectFromTo<M, N>,
	e14: AsyncEffectFromTo<N, O>,
	e15: AsyncEffectFromTo<O, P>,
	e16: AsyncEffectFromTo<P, Q>,
	e17: AsyncEffectFromTo<Q, R>,
	e18: AsyncEffectFromTo<R, S>): AsyncEffectTo<S>;
export function pipeAsyncEffects<
	A,
	B,
	C,
	D,
	E,
	F,
	G,
	H,
	I,
	J,
	K,
	L,
	M,
	N,
	O,
	P,
	Q,
	R,
	S,
	T>(
	a: A,
	e1: AsyncEffectFromTo<AsyncPipeAValue<A>, B>,
	e2: AsyncEffectFromTo<B, C>,
	e3: AsyncEffectFromTo<C, D>,
	e4: AsyncEffectFromTo<D, E>,
	e5: AsyncEffectFromTo<E, F>,
	e6: AsyncEffectFromTo<F, G>,
	e7: AsyncEffectFromTo<G, H>,
	e8: AsyncEffectFromTo<H, I>,
	e9: AsyncEffectFromTo<I, J>,
	e10: AsyncEffectFromTo<J, K>,
	e11: AsyncEffectFromTo<K, L>,
	e12: AsyncEffectFromTo<L, M>,
	e13: AsyncEffectFromTo<M, N>,
	e14: AsyncEffectFromTo<N, O>,
	e15: AsyncEffectFromTo<O, P>,
	e16: AsyncEffectFromTo<P, Q>,
	e17: AsyncEffectFromTo<Q, R>,
	e18: AsyncEffectFromTo<R, S>,
	e19: AsyncEffectFromTo<S, T>): AsyncEffectTo<T>;
export function pipeAsyncEffects<
	A,
	B,
	C,
	D,
	E,
	F,
	G,
	H,
	I,
	J,
	K,
	L,
	M,
	N,
	O,
	P,
	Q,
	R,
	S,
	T>(
	a: A,
	e1?: AsyncEffectFromTo<AsyncPipeAValue<A>, B>,
	e2?: AsyncEffectFromTo<B, C>,
	e3?: AsyncEffectFromTo<C, D>,
	e4?: AsyncEffectFromTo<D, E>,
	e5?: AsyncEffectFromTo<E, F>,
	e6?: AsyncEffectFromTo<F, G>,
	e7?: AsyncEffectFromTo<G, H>,
	e8?: AsyncEffectFromTo<H, I>,
	e9?: AsyncEffectFromTo<I, J>,
	e10?: AsyncEffectFromTo<J, K>,
	e11?: AsyncEffectFromTo<K, L>,
	e12?: AsyncEffectFromTo<L, M>,
	e13?: AsyncEffectFromTo<M, N>,
	e14?: AsyncEffectFromTo<N, O>,
	e15?: AsyncEffectFromTo<O, P>,
	e16?: AsyncEffectFromTo<P, Q>,
	e17?: AsyncEffectFromTo<Q, R>,
	e18?: AsyncEffectFromTo<R, S>,
	e19?: AsyncEffectFromTo<S, T>): AsyncEffectTo<
	  Coalesce20<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T>
	> {
		type Result = AsyncEffectTo<Coalesce20<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T>>;
		const aAsyncIo: AsyncIO<AsyncPipeAValue<A>> = (a instanceof AsyncIO ? a : (a instanceof IO ? new AsyncIO(async () => a.evaluate() as AsyncPipeAValue<A>) : new AsyncIO(async () => a))) as AsyncIO<AsyncPipeAValue<A>>;
		switch (arguments.length) {
			case 2: {
				return new AsyncTask<any, B>(async () => (e1!.evaluate(await aAsyncIo.evaluate()) as Promise<Either<any, B>>)) as Result;
			}

			case 3: {
				// Use map
				return new AsyncTask(async () => {
					const e1Result = await e1!.evaluate(await aAsyncIo.evaluate()) as Either<any, B>;
					if (e1Result.isLeft()) {
						return e1Result as any as Left<any, C>;
					}

					return e2!.evaluate(e1Result.get() as B) as Promise<Either<any, C>>;
				}) as Result;
			}

			case 4: {
				return aAsyncIo.toComputation().bindInput([]).flatMapWithNewError(
					(aValue: AsyncPipeAValue<A>) =>
						e1!.toComputation().bindInput(aValue).flatMapWithNewError(
							(bValue: B) =>
								e2!.toComputation().bindInput(bValue).flatMapWithNewError(
									(cValue: C) =>
										e3!.toComputation().bindInput(cValue).flatMapWithNewError(
											(dValue: D) => e4!.toComputation().bindInput(dValue),
										),
								),
						),
				) as Result;
			}

			case 5: {
				return aAsyncIo.toComputation().bindInput([]).flatMapWithNewError(
					(aValue: AsyncPipeAValue<A>) =>
						e1!.toComputation().bindInput(aValue).flatMapWithNewError(
							(bValue: B) =>
								e2!.toComputation().bindInput(bValue).flatMapWithNewError(
									(cValue: C) =>
										e3!.toComputation().bindInput(cValue).flatMapWithNewError(
											(dValue: D) =>
												e4!.toComputation().bindInput(dValue).flatMapWithNewError(
													(eValue: E) => e5!.toComputation().bindInput(eValue),
												),
										),
								),
						),
				) as Result;
			}

			case 6: {
				return aAsyncIo.toComputation().bindInput([]).flatMapWithNewError(
					(aValue: AsyncPipeAValue<A>) =>
						e1!.toComputation().bindInput(aValue).flatMapWithNewError(
							(bValue: B) =>
								e2!.toComputation().bindInput(bValue).flatMapWithNewError(
									(cValue: C) =>
										e3!.toComputation().bindInput(cValue).flatMapWithNewError(
											(dValue: D) =>
												e4!.toComputation().bindInput(dValue).flatMapWithNewError(
													(eValue: E) =>
														e5!.toComputation().bindInput(eValue).flatMapWithNewError(
															(fValue: F) => e6!.toComputation().bindInput(fValue),
														),
												),
										),
								),
						),
				) as Result;
			}

			case 7: {
				return aAsyncIo.toComputation().bindInput([]).flatMapWithNewError(
					(aValue: AsyncPipeAValue<A>) =>
						e1!.toComputation().bindInput(aValue).flatMapWithNewError(
							(bValue: B) =>
								e2!.toComputation().bindInput(bValue).flatMapWithNewError(
									(cValue: C) =>
										e3!.toComputation().bindInput(cValue).flatMapWithNewError(
											(dValue: D) =>
												e4!.toComputation().bindInput(dValue).flatMapWithNewError(
													(eValue: E) =>
														e5!.toComputation().bindInput(eValue).flatMapWithNewError(
															(fValue: F) =>
																e6!.toComputation().bindInput(fValue).flatMapWithNewError(
																	(gValue: G) => e7!.toComputation().bindInput(gValue),
																),
														),
												),
										),
								),
						),
				) as Result;
			}

			case 8: {
				return aAsyncIo.toComputation().bindInput([]).flatMapWithNewError(
					(aValue: AsyncPipeAValue<A>) =>
						e1!.toComputation().bindInput(aValue).flatMapWithNewError(
							(bValue: B) =>
								e2!.toComputation().bindInput(bValue).flatMapWithNewError(
									(cValue: C) =>
										e3!.toComputation().bindInput(cValue).flatMapWithNewError(
											(dValue: D) =>
												e4!.toComputation().bindInput(dValue).flatMapWithNewError(
													(eValue: E) =>
														e5!.toComputation().bindInput(eValue).flatMapWithNewError(
															(fValue: F) =>
																e6!.toComputation().bindInput(fValue).flatMapWithNewError(
																	(gValue: G) =>
																		e7!.toComputation().bindInput(gValue).flatMapWithNewError(
																			(hValue: H) => e8!.toComputation().bindInput(hValue),
																		),
																),
														),
												),
										),
								),
						),
				) as Result;
			}

			case 9: {
				return aAsyncIo.toComputation().bindInput([]).flatMapWithNewError(
					(aValue: AsyncPipeAValue<A>) =>
						e1!.toComputation().bindInput(aValue).flatMapWithNewError(
							(bValue: B) =>
								e2!.toComputation().bindInput(bValue).flatMapWithNewError(
									(cValue: C) =>
										e3!.toComputation().bindInput(cValue).flatMapWithNewError(
											(dValue: D) =>
												e4!.toComputation().bindInput(dValue).flatMapWithNewError(
													(eValue: E) =>
														e5!.toComputation().bindInput(eValue).flatMapWithNewError(
															(fValue: F) =>
																e6!.toComputation().bindInput(fValue).flatMapWithNewError(
																	(gValue: G) =>
																		e7!.toComputation().bindInput(gValue).flatMapWithNewError(
																			(hValue: H) =>
																				e8!.toComputation().bindInput(hValue).flatMapWithNewError(
																					(iValue: I) => e9!.toComputation().bindInput(iValue),
																				),
																		),
																),
														),
												),
										),
								),
						),
				) as Result;
			}

			case 10: {
				return aAsyncIo.toComputation().bindInput([]).flatMapWithNewError(
					(aValue: AsyncPipeAValue<A>) =>
						e1!.toComputation().bindInput(aValue).flatMapWithNewError(
							(bValue: B) =>
								e2!.toComputation().bindInput(bValue).flatMapWithNewError(
									(cValue: C) =>
										e3!.toComputation().bindInput(cValue).flatMapWithNewError(
											(dValue: D) =>
												e4!.toComputation().bindInput(dValue).flatMapWithNewError(
													(eValue: E) =>
														e5!.toComputation().bindInput(eValue).flatMapWithNewError(
															(fValue: F) =>
																e6!.toComputation().bindInput(fValue).flatMapWithNewError(
																	(gValue: G) =>
																		e7!.toComputation().bindInput(gValue).flatMapWithNewError(
																			(hValue: H) =>
																				e8!.toComputation().bindInput(hValue).flatMapWithNewError(
																					(iValue: I) =>
																						e9!.toComputation().bindInput(iValue).flatMapWithNewError(
																							(jValue: J) =>
																								e10!.toComputation().bindInput(jValue),
																						),
																				),
																		),
																),
														),
												),
										),
								),
						),
				) as Result;
			}

			default: {
				const resolver = async () => {
					let currValue: any = await aAsyncIo.evaluate();
					let currComputation: AsyncComputation<any, any, any> | undefined;

					for (let i = 1; i < arguments.length; i++) {
						currComputation = (arguments[i] as AsyncEffectFromTo<any, any>).toComputation();
						// eslint-disable-next-line no-await-in-loop
						currValue = await currComputation.bindInput(currValue).evaluate();
					}

					return currValue as Either<any, Coalesce20<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T>>;
				};

				return new AsyncTask(resolver) as Result;
			}
		}
}

/**
 * @example
* // eslint-disable-next-line @typescript-eslint/naming-convention
* const numberAsyncIO = new AsyncIO<number>(
* 	async () => 42,
* );
*
* const computationPlus2Async = new AsyncComputation(
* 	async (a: number) => new Right<any, number>(a + 2),
* );
*
* const safeComputationTimes3Async = new AsyncSafeComputation(
* 	async (a: number) => a * 3,
* );
*
* const computationNumberToStringAsync = new AsyncComputation(
* 	async (a: number) => new Right<any, string>(a.toString()),
* );
*
* const computationPrintStringAsync = new AsyncComputation(
* 	async (a: string) => {
* 		console.log(a);
* 		return new Right<any, void>(undefined);
* 	},
* );
*
* // Will work and report the correct type, since effects are composable
* const pipedComputationsAsync = pipeAsyncEffects(numberAsyncIO, computationPlus2Async, safeComputationTimes3Async, computationNumberToStringAsync, computationPrintStringAsync);
* const pipedComputationsAsync2 = pipeAsyncEffects(numberAsyncIO, computationPlus2Async, safeComputationTimes3Async, computationNumberToStringAsync);
*
* // @ts-expect-error - Will not work, since effects are not composable
* const invalidPipedComputationAsync = pipeAsyncEffects(numberAsyncIO, computationPlus2Async, computationNumberToStringAsync, safeComputationTimes3Async, computationPrintStringAsync);
*
* // eslint-disable-next-line @typescript-eslint/naming-convention
* const numberAsyncIO2 = new AsyncIO<number>(
* 	async () => 42,
* );
*
* // eslint-disable-next-line @typescript-eslint/naming-convention
* const numberIO3 = new IO<number>(
* 	() => 47,
* );
*
* const safeNumberComputationAsync = new AsyncSafeComputation<{x: number; y: number}, {x: number; y: number}>(
* 	async ({x, y}) => ({x: x + 42, y: y + 47}),
* );
*
* const numberPrintAsync = new AsyncSafeComputation<number, void>(
* 	async (a: number) => {
* 		console.log(a);
* 		return undefined;
* 	},
* );
*
* const printTwoNumberTupleAsync = new AsyncSafeComputation<{x: number; y: number}, void>(
* 	async ({x, y}) => {
* 		console.log(`a is ${x} and b is ${y}`);
* 		return undefined;
* 	},
* );
*
* const newPipe = AsyncSafeComputation.do()
* 	.bindKey('x', () => numberAsyncIO2)
* 	.bindKey('y', () => numberIO3)
*		.tap(({x, y}) => printTwoNumberTupleAsync.bindInput({x, y}))
*		.flatMap(({x, y}) => safeNumberComputationAsync.bindInput({x, y}).toSafeComputation())
*		.tap(({x, y}) => printTwoNumberTupleAsync.bindInput({x, y}));
*
* await newPipe.evaluate({});
*/
