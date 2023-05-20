import { EqualityComparable } from '@mbauer83/ts-utils/src/comparison/equality';
import { everyFilterable, Filterable, noneFilterable, someFilterable } from './Filterable';
import { Monad } from './Monad';  
import { Predicate } from './Predicate';

export class MonadicSet<T> implements Monad<T>, EqualityComparable<MonadicSet<T>>, Filterable<T> {

    protected readonly innerSet: Set<T>;
    protected readonly size: number;

    filter(p: Predicate<T>): MonadicSet<T> {
        const newElements = Array.from(this.innerSet.values()).filter(p.evaluate);
        return new MonadicSet(newElements);
    }

    every(p: Predicate<T>): boolean {
        return everyFilterable(this, p);
    }

    some(p: Predicate<T>): boolean {
        return someFilterable(this, p);
    }

    none(p: Predicate<T>): boolean {
        return noneFilterable(this, p);
    }

    getSize(): number {
        return this.size;
    }

    [Symbol.iterator](): IterableIterator<T> {
        return this.innerSet[Symbol.iterator]();
    }

    protected values(): IterableIterator<T> {
        return this.innerSet.values();
    }

    constructor(elements: T[] = []) {
        this.innerSet = new Set(elements);
        this.size = this.innerSet.size;
    }

    forEach(callbackfn: (value: T, value2: T, set: Set<T>) => void, thisArg?: any): void {
        this.innerSet.forEach(callbackfn, thisArg);
    }

    has(value: T): boolean {
        return this.innerSet.has(value);
    }

    equals(other: MonadicSet<T>): boolean {
        if (this.size !== other.getSize()) {
            return false;
        }
        let equal = true;
        for (const thisVal of this) {
            if (!other.has(thisVal)) {
                equal = false;
                break;
            }
        }
        return equal;
    }

    add(value: T): MonadicSet<T> {
        const ctor: (ts: T[]) => this = (ts: T[]) => Object.getPrototypeOf(this).constructor(ts);
        return ctor(this.getElementsAsArray().concat(value));
    }

    delete(value: T): MonadicSet<T> {
        const ctor: (ts: T[]) => this = (ts: T[]) => Object.getPrototypeOf(this).constructor(ts);
        const newArr: T[] = [];
        for (const thisVal of this) {
            if (thisVal === value) {
                continue;
            }
            newArr.push(thisVal);
        }
        return ctor(newArr);
    }

    getElementsAsArray(): T[] {
        return Array.from(this.values());
    }

    pure<U>(e: U): MonadicSet<U> {
        return new MonadicSet([e]);
    }

    map<U>(f: (x: T) => U): MonadicSet<U> {
        const mapped: MonadicSet<U> = new MonadicSet();
        this.forEach((value: T) => {
            const mappedValue = f(value);
            if (mapped.has(mappedValue)) {
                return;
            }
            mapped.add(mappedValue);
        });        
        return mapped;
    }

    apply<U>(f: MonadicSet<(x: T) => U>): MonadicSet<U> {
        const all: MonadicSet<U> = new MonadicSet();
        this.forEach((value: T) => {
            const mappedValues = f.map(fn => fn(value));
            mappedValues.getElementsAsArray().forEach(mappedValue => {
                if (all.has(mappedValue)) {
                    return;
                }
                all.add(mappedValue);
            });
        });
        return all;
    }

    flatMap<U>(f: (x: T) => MonadicSet<U>): MonadicSet<U> {
        const allValues: MonadicSet<U> = new MonadicSet();
        this.forEach((value: T) => {
            const mappedValues = f(value);
            mappedValues.getElementsAsArray().forEach(mappedValue => {
                if (allValues.has(mappedValue)) {
                    return;
                }
                allValues.add(mappedValue);
            });
        });
        return allValues;
    }

    zip<U>(other: MonadicSet<U>): MonadicSet<[T, U]> {
        const shorterLength = this.size < other.getSize() ? this.size : other.getSize();
        const thisArray = this.getElementsAsArray();
        const otherArray = other.getElementsAsArray();
        const zipped: MonadicSet<[T, U]> = new MonadicSet();
        for (let i = 0; i < shorterLength; i++) {
            const pair: [T, U] = [thisArray[i], otherArray[i]];
            zipped.add(pair);
        }
        return zipped;
    }

    zip2<U, V>(o1: MonadicSet<U>, o2: MonadicSet<V>): MonadicSet<[T, U, V]> {
        const shortestLength = Math.min(this.size, o1.getSize(), o2.getSize());
        const thisArray = this.getElementsAsArray();
        const other1Array = o1.getElementsAsArray();
        const other2Array = o2.getElementsAsArray();
        const zipped: MonadicSet<[T, U, V]> = new MonadicSet();
        for (let i = 0; i < shortestLength; i++) {
            const pair: [T, U, V] = [thisArray[i], other1Array[i], other2Array[i]];
            zipped.add(pair);
        }
        return zipped;
    }

    zip3<U, V, W>(o1: MonadicSet<U>, o2: MonadicSet<V>, o3: MonadicSet<W>): MonadicSet<[T, U, V, W]> {
        const shortestLength = Math.min(this.size, o1.getSize(), o2.getSize(), o3.getSize());
        const thisArray = this.getElementsAsArray();
        const other1Array = o1.getElementsAsArray();
        const other2Array = o2.getElementsAsArray();
        const other3Array = o3.getElementsAsArray();
        const zipped: MonadicSet<[T, U, V, W]> = new MonadicSet();
        for (let i = 0; i < shortestLength; i++) {
            const pair: [T, U, V, W] = [thisArray[i], other1Array[i], other2Array[i], other3Array[i]];
            zipped.add(pair);
        }
        return zipped;
    }

    zip4<U, V, W, X>(o1: MonadicSet<U>, o2: MonadicSet<V>, o3: MonadicSet<W>, o4: MonadicSet<X>): MonadicSet<[T, U, V, W, X]> {
        const shortestLength = Math.min(this.size, o1.getSize(), o2.getSize(), o3.getSize(), o4.getSize());
        const thisArray = this.getElementsAsArray();
        const other1Array = o1.getElementsAsArray();
        const other2Array = o2.getElementsAsArray();
        const other3Array = o3.getElementsAsArray();
        const other4Array = o4.getElementsAsArray();
        const zipped: MonadicSet<[T, U, V, W, X]> = new MonadicSet();
        for (let i = 0; i < shortestLength; i++) {
            const pair: [T, U, V, W, X] = [thisArray[i], other1Array[i], other2Array[i], other3Array[i], other4Array[i]];
            zipped.add(pair);
        }
        return zipped;
    }

    zip5<U, V, W, X, Y>(
        o1:MonadicSet<U>, 
        o2: MonadicSet<V>, 
        o3: MonadicSet<W>, 
        o4: MonadicSet<X>, 
        o5: MonadicSet<Y>
    ): MonadicSet<[T, U, V, W, X, Y]> {
        const shortestLength = Math.min(this.size, o1.getSize(), o2.getSize(), o3.getSize(), o4.getSize(), o5.getSize());
        const thisArray = this.getElementsAsArray();
        const other1Array = o1.getElementsAsArray();
        const other2Array = o2.getElementsAsArray();
        const other3Array = o3.getElementsAsArray();
        const other4Array = o4.getElementsAsArray();
        const other5Array = o5.getElementsAsArray();
        const zipped: MonadicSet<[T, U, V, W, X, Y]> = new MonadicSet();
        for (let i = 0; i < shortestLength; i++) {
            const pair: [T, U, V, W, X, Y] = [
                thisArray[i], 
                other1Array[i], 
                other2Array[i], 
                other3Array[i], 
                other4Array[i], 
                other5Array[i]
            ];
            zipped.add(pair);
        }
        return zipped;
    }

    zip6<U, V, W, X, Y, Z>(
        o1:MonadicSet<U>,
        o2: MonadicSet<V>,
        o3: MonadicSet<W>,
        o4: MonadicSet<X>,
        o5: MonadicSet<Y>,
        o6: MonadicSet<Z>
    ): MonadicSet<[T, U, V, W, X, Y, Z]> {
        const shortestLength = Math.min(this.size, o1.getSize(), o2.getSize(), o3.getSize(), o4.getSize(), o5.getSize(), o6.getSize());
        const thisArray = this.getElementsAsArray();
        const other1Array = o1.getElementsAsArray();
        const other2Array = o2.getElementsAsArray();
        const other3Array = o3.getElementsAsArray();
        const other4Array = o4.getElementsAsArray();
        const other5Array = o5.getElementsAsArray();
        const other6Array = o6.getElementsAsArray();
        const zipped: MonadicSet<[T, U, V, W, X, Y, Z]> = new MonadicSet();
        for (let i = 0; i < shortestLength; i++) {
            const pair: [T, U, V, W, X, Y, Z] = [
                thisArray[i],
                other1Array[i],
                other2Array[i],
                other3Array[i],
                other4Array[i],
                other5Array[i],
                other6Array[i]
            ];
            zipped.add(pair);
        }
        return zipped;
    }

    zipN<U>(...others: MonadicSet<U>[]): MonadicSet<[T, ...U[]]> {
        const shortestLength = Math.min(...others.map(o => o.getSize()));
        const thisArray = this.getElementsAsArray();
        const otherArrays = others.map(o => o.getElementsAsArray());
        const zipped: MonadicSet<[T, ...U[]]> = new MonadicSet();
        for (let i = 0; i < shortestLength; i++) {
            const pair: [T, ...U[]] = [thisArray[i], ...otherArrays.map(a => a[i])];
            zipped.add(pair);
        }
        return zipped;
    }

    intersect(...others: MonadicSet<T>[]): MonadicSet<T> {
        const intersection = new MonadicSet<T>();
        for (const element of this) {
            if (others.every(other => other.has(element))) {
                intersection.add(element);
            }
        }
        return intersection;
    }

    union<U>(...others: MonadicSet<U>[]): MonadicSet<T|U> {
        const union = new MonadicSet<T|U>(this.getElementsAsArray());
        for (const other of others) {
            for (const element of other) {
                if (!union.has(element)) {
                    union.add(element);
                }
            }
        }
        return union;
    }

    difference(...others: MonadicSet<T>[]): MonadicSet<T> {
        const difference = new MonadicSet<T>(this.getElementsAsArray());
        for (const other of others) {
            for (const element of other) {
                if (difference.has(element)) {
                    difference.delete(element);
                }
            }
        }
        return difference;
    }

    symmetricDifference(other: MonadicSet<T>): MonadicSet<T> {
        return this.union<T>(other).difference(this.intersect(other));
    }

    clone(): MonadicSet<T> {
        return new MonadicSet<T>(this.getElementsAsArray());
    }

}
