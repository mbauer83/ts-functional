/* eslint-disable unicorn/no-array-callback-reference */
import {compareSize, sizesAreEqual} from '@mbauer83/ts-utils/src/size/size.js';
import {type HasSize} from '@mbauer83/ts-utils/src/size/HasSize.js';
import {type PredicateOrFn} from './Predicate.js';

export type Filterable<T> = {
	filter: (p: PredicateOrFn<T>) => Filterable<T>;
	every: (p: PredicateOrFn<T>) => boolean;
	some: (p: PredicateOrFn<T>) => boolean;
	none: (p: PredicateOrFn<T>) => boolean;
} & HasSize;

export function everyFilterable<T, F extends Filterable<T>>(f: F, p: PredicateOrFn<T>): boolean {
	const originalSize = f.getSize();
	const filteredSize = f.filter(p).getSize();
	return sizesAreEqual(originalSize, filteredSize);
}

export function someFilterable<T, F extends Filterable<T>>(f: F, p: PredicateOrFn<T>): boolean {
	return compareSize(f.filter(p).getSize(), 0) > 0;
}

export function noneFilterable<T, F extends Filterable<T>>(f: F, p: PredicateOrFn<T>): boolean {
	return compareSize(f.filter(p).getSize(), 0) === 0;
}
