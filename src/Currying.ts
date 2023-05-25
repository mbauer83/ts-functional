import {type SpreadableElement} from './definitions.js';

type Curried<F extends ((..._: any) => any)> =
  F extends ((a: any) => any)
  	? F
  	: F extends ((a: infer A, ...b: infer B) => infer O)
  		? B extends never
  			? (parameter: A) => O
  			: B extends [c: infer C, ...d: infer D]
  				// eslint-disable-next-line @typescript-eslint/ban-types
  				? D extends []
  					? (parameter: A) => (parameter: C) => O
  					: Curried<(a: A) => (c: C) => Curried<(...d: D) => O>>
  				: Curried<(a: A) => (...b: B) => O>
  		: never;

function curry1<A, O>(f: (a: A, ..._: any[]) => O): ((a: A) => (...rest: SpreadableElement[]) => O) {
	return (a: A) => (...rest: SpreadableElement[]) => f(a, ...rest);
}

export function curry<F extends ((..._: any) => any)>(f: F): Curried<F> {
	let hasMoreArgs = f.length > 1;
	let currFn: (..._: any[]) => any = f;
	while (hasMoreArgs) {
		currFn = curry1(currFn);
		hasMoreArgs = currFn.length > 1;
	}

	return currFn as any as Curried<F>;
}
