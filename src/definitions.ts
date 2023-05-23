import {type Applicative} from './Applicative';

export type UnspecifiedFunction = (..._: any[]) => any;

export type GenericFunction<I extends any[], O> = (..._: I[]) => O;

export type Throwable = Error | string | ((...args: any[]) => Error) | ((...args: any[]) => string);

export type SpreadableElement = boolean | number | string | symbol | undefined | Record<string, any> | SpreadableElement[];

export class QueriedValueNotPresent extends Error {
	constructor(queryDescription: string) {
		super('Queried value not present: ' + queryDescription);
	}
}

export function assign<T extends Record<string, any>, U extends Record<string, any>>(target: T, source: U): T & U {
	return Object.assign(target, source);
}

export function liftA2<A, B, C, P extends Applicative<A>, Q extends Applicative<B>, R extends Applicative<C>>(f: ((a: A) => (b: B) => C)): (a: P) => (b: Q) => R {
	const mappedP = (p: P) => p.map(element => f(element));
	const a = (p: P) => (q: Q) => q.apply(mappedP(p));
	return a as ((p: P) => (q: Q) => R);
}

export function liftA3<A, B, C, D, P extends Applicative<A>, Q extends Applicative<B>, R extends Applicative<C>, S extends Applicative<D>>(f: ((a: A) => (b: B) => (c: C) => D)): (a: P) => (b: Q) => (c: R) => S {
	const mappedP = (p: P) => p.map(element => f(element));
	const a = (p: P) => (q: Q) => (r: R) => r.apply(q.apply(mappedP(p)));
	return a as ((p: P) => (q: Q) => (r: R) => S);
}

export function mapProps<T extends Record<string, any>, M extends Partial<{[K in keyof T]: (value: T[K]) => any}>>(object: T, mapper: M): {[K in keyof T]: K extends keyof M ? ReturnType<NonNullable<M[K]>> : T[K]} {
	const newObject: any = {};
	const objectKeys = Object.keys(object) as Array<keyof T>;
	for (const key of objectKeys) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		newObject[key] = (key in mapper) ? (mapper[key] as (value: any) => any)(object[key]) : object[key];
	}

	return newObject as {[K in keyof T]: K extends keyof M ? ReturnType<NonNullable<M[K]>> : T[K]};
}

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
