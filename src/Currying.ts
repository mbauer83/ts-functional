import {type SpreadableElement} from './definitions';

export type Curried<F extends ((..._: any) => any)> =
    F extends ((a: any) => any) ? F :
    	F extends ((a: infer A, ...b: infer B) => infer O) ?
    		B extends never ?
    			(a: A) => O :
    			(a: A) => Curried<(...b: B) => O> :
    		F extends ((a: infer A, b: infer B) => infer O) ?
    			B extends never ?
    				(a: A) => O :
    				(a: A) => Curried<(b: B) => O> :
    			never;

function curry1<A, O>(f: (a: A, ..._: any[]) => O): ((a: A) => (...rest: SpreadableElement[]) => O) {
	return (a: A) => (...rest: SpreadableElement[]) => f(a, ...rest);
}

export function curry<F extends ((..._: any) => any)>(f: F): Curried<F> {
	let hasMoreArgs = Reflect.has(f, 'length') && f.length > 1;
	let currFn: (..._: any[]) => any = f;
	while (hasMoreArgs) {
		currFn = curry1(currFn);
		hasMoreArgs = Reflect.has(currFn, 'length') && currFn.length > 1;
	}

	return currFn as unknown as Curried<F>;
}
