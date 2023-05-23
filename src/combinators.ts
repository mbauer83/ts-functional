import {type GenericFunction, type UnspecifiedFunction} from './definitions';

export type CanBeComposed<F extends UnspecifiedFunction, G extends UnspecifiedFunction> = ReturnType<G> extends Parameters<F> ? true : false;
export type CanBePreComposed<F extends (..._: any[]) => any, G extends (..._: any[]) => any> = ReturnType<F> extends Parameters<G> ? true : false;

export type ComposedOrNever<G extends ComposableFor<F>, F extends UnspecifiedFunction> = CanBeComposed<G, F> extends true ? ((..._: Parameters<F>) => ReturnType<G>) : never;

export type PreComposableFor<G extends UnspecifiedFunction> = (..._: any[]) => Parameters<G>;
export type ComposableFor<F extends UnspecifiedFunction> = (..._: ReturnType<F>) => any;

export type ComposableForWithOutputOf<F extends UnspecifiedFunction, O> = (..._: ReturnType<F>) => O;
export type PreComposableForWithInputOf<G extends UnspecifiedFunction, I extends any[]> = (..._: I) => Parameters<G>;

export type Composed<G extends ComposableFor<F>, F extends UnspecifiedFunction> = (_: Parameters<F>) => ReturnType<G>;
export type PreComposed<G extends UnspecifiedFunction, F extends PreComposableFor<G>> = (_: Parameters<F>) => ReturnType<G>;

export function compose<F extends UnspecifiedFunction, G extends ComposableFor<F>>(g: G, f: F): Composed<G, F> {
	return ((args: Parameters<F>) => {
		const fResult = (f as GenericFunction<(typeof args), Parameters<G>>)(...args);
		const gResult = (g as unknown as GenericFunction<(typeof fResult), ReturnType<G>>)(fResult);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return gResult;
	}) as Composed<G, F>;
}

export function applyTo<T, O>(t: T): ((f: ((t: T) => O)) => O) {
	return (f: (t: T) => O) => f(t);
}

export function compose2<A, B, C, D, E>(
	f: ((c: C, d: D) => E),
	g: ((a: A) => C),
	h: ((b: B) => D),
): ((a: A, b: B) => E) {
	return (a: A, b: B) => f(g(a), h(b));
}

export function constant<T>(t: T): (() => T) {
	return () => t;
}

export function flip<A, B, C>(f: ((a: A, b: B) => C)): ((b: B, a: A) => C) {
	return (b: B, a: A) => f(a, b);
}

export function identity<T>(t: T): T {
	return t;
}
