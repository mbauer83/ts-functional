/* eslint-disable unicorn/no-array-callback-reference */
import {compareSize, sizesAreEqual} from '@mbauer83/ts-utils/src/size/size.js';
import {type HasSize} from '@mbauer83/ts-utils/src/size/HasSize.js';
import {type Predicate} from './Predicate.js';

export type Filterable<T> = {
	filter: (p: Predicate<T>) => Filterable<T>;
	every: (p: Predicate<T>) => boolean;
	some: (p: Predicate<T>) => boolean;
	none: (p: Predicate<T>) => boolean;
} & HasSize;

export function everyFilterable<T, F extends Filterable<T>>(f: F, p: Predicate<T>): boolean {
	const originalSize = f.getSize();
	const filteredSize = f.filter(p).getSize();
	return sizesAreEqual(originalSize, filteredSize);
}

export function someFilterable<T, F extends Filterable<T>>(f: F, p: Predicate<T>): boolean {
	return compareSize(f.filter(p).getSize(), 0) > 0;
}

export function noneFilterable<T, F extends Filterable<T>>(f: F, p: Predicate<T>): boolean {
	return compareSize(f.filter(p).getSize(), 0) === 0;
}
