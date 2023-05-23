import {type SpreadableElement} from './definitions';

export function compose<T, O>(f: ((..._: any[]) => T), g: ((t: T) => O)): ((..._: any[]) => O) {
	return (...args: SpreadableElement[]) => g(f(...args));
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
