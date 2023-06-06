import {type GenericFunction, type UnspecifiedFunction} from './definitions.js';

/**
 * `true` if `G` can be composed with `F`, `false` otherwise.
 */
export type CanBeComposed<F extends UnspecifiedFunction, G extends UnspecifiedFunction> = ReturnType<G> extends Parameters<F> ? true : false;
/**
 * `true` if `F` can be composed with `G`, `false` otherwise.
 */
export type CanBePreComposed<F extends (..._: any[]) => any, G extends (..._: any[]) => any> = ReturnType<F> extends Parameters<G> ? true : false;

/**
 * The type of the composition of `G` with `F` if `G` can be composed with `F`, otherwise `never`.
 */
export type ComposedOrNever<G extends ComposableFor<F>, F extends UnspecifiedFunction> = CanBeComposed<G, F> extends true ? ((..._: Parameters<F>) => ReturnType<G>) : never;

/**
 * The type of a function with which `G` can be composed.
 */
export type PreComposableFor<G extends UnspecifiedFunction> = (..._: any[]) => Parameters<G>;
/**
 * The type of a function that can be composed with `F`.
 */
export type ComposableFor<F extends UnspecifiedFunction> = (..._: ReturnType<F>) => any;

/**
 * The type of a function that can be composed with `F` and whose return type is `O`.
 */
export type ComposableForWithOutputOf<F extends UnspecifiedFunction, O> = (..._: ReturnType<F>) => O;
/**
 * The type of a function with which `G` can be composed and whose input type is `I`.
 */
export type PreComposableForWithInputOf<G extends UnspecifiedFunction, I extends any[]> = (..._: I) => Parameters<G>;

/**
 * The type of the composition of composable `G` and `F`.
 */
export type Composed<G extends ComposableFor<F>, F extends UnspecifiedFunction> = (_: Parameters<F>) => ReturnType<G>;
/**
 * The type of the composition of composable `F` and `G`.
 */
export type PreComposed<G extends UnspecifiedFunction, F extends PreComposableFor<G>> = (_: Parameters<F>) => ReturnType<G>;

/**
 * Composes `G` with `F`.
 */
export function compose<F extends UnspecifiedFunction, G extends ComposableFor<F>>(g: G, f: F): Composed<G, F> {
	return ((args: Parameters<F>) => {
		const fResult = (f as GenericFunction<(typeof args), Parameters<G>>)(...args);
		const gResult = (g as unknown as GenericFunction<(typeof fResult), ReturnType<G>>)(fResult);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return gResult;
	}) as Composed<G, F>;
}

/**
 * Takes an argument and returns a function which takes a function from that argument to some output type `O` and returns the output of the function given the argument.
 */
export function applyTo<T, O>(t: T): ((f: ((t: T) => O)) => O) {
	return (f: (t: T) => O) => f(t);
}

/**
 * Composes `f` with `g` and `h`.
 */
export function compose2<A, B, C, D, E>(
	f: ((c: C, d: D) => E),
	g: ((a: A) => C),
	h: ((b: B) => D),
): ((a: A, b: B) => E) {
	return (a: A, b: B) => f(g(a), h(b));
}

/**
 * Returns a constant function at `t`.
 */
export function constant<T>(t: T): (() => T) {
	return () => t;
}

/**
 * Takes a function of two arguments and returns the same function with arguments flipped.
 */
export function flip<A, B, C>(f: ((a: A, b: B) => C)): ((b: B, a: A) => C) {
	return (b: B, a: A) => f(a, b);
}

/**
 * The generic identity function.
 */
export function identity<T>(t: T): T {
	return t;
}
