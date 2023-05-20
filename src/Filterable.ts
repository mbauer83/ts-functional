import { Predicate } from './Predicate';    
import { HasSize } from '@mbauer83/ts-utils/src/size/HasSize';
import { compareSize, sizesAreEqual } from '@mbauer83/ts-utils/src/size/size';

export interface Filterable<T> extends HasSize {
    filter: (p: Predicate<T>) => Filterable<T>;
    every: (p: Predicate<T>) => boolean;
    some: (p: Predicate<T>) => boolean;
    none: (p: Predicate<T>) => boolean;
}

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
