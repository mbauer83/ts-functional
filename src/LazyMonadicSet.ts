import { MonadicSet } from "./MonadicSet";
import { Predicate } from "./Predicate";

export class LazyMonadicSet<T> extends MonadicSet<T> {
    constructor(protected readonly f: () => T[]) {
        super();
    }
    protected resolved: null|MonadicSet<T> = null;
    protected getResolved(): MonadicSet<T> {
        if (this.resolved === null) {
            this.resolved = new MonadicSet(this.f());
        }
        return this.resolved!;
    }

    filter(p: Predicate<T>): LazyMonadicSet<T> {
        return new LazyMonadicSet(() => this.getResolved().filter(p).getElementsAsArray());
    }

    every(p: Predicate<T>): boolean {
        return this.getResolved().every(p);
    }

    some(p: Predicate<T>): boolean {
        return this.getResolved().some(p);
    }

    none(p: Predicate<T>): boolean {
        return this.getResolved().none(p);
    }

    getSize(): number {
        return this.getResolved().getSize();
    }

    [Symbol.iterator](): IterableIterator<T> {
        return this.innerSet[Symbol.iterator]();
    }

    protected values(): IterableIterator<T> {
        return this.getResolved()[Symbol.iterator]();
    }

    forEach(callbackfn: (value: T, value2: T, set: Set<T>) => void, thisArg?: any): void {
        this.getResolved().forEach(callbackfn, thisArg);
    }

    has(value: T): boolean {
        return this.getResolved().has(value);
    }

    equals(other: MonadicSet<T>): boolean {
        return this.getResolved().equals(other);
    }

    add(value: T): LazyMonadicSet<T> {
        return new LazyMonadicSet(() => this.getResolved().add(value).getElementsAsArray());
    }

    delete(value: T): LazyMonadicSet<T> {
        return new LazyMonadicSet(() => this.getResolved().delete(value).getElementsAsArray());
    }

    getElementsAsArray(): T[] {
        return this.getResolved().getElementsAsArray();
    }

    pure<U>(e: U): LazyMonadicSet<U> {
        return new LazyMonadicSet(() => [e]);
    }

    map<U>(f: (x: T) => U): LazyMonadicSet<U> {
        return new LazyMonadicSet(() => this.getResolved().map(f).getElementsAsArray());
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

    flatMap<U>(f: (x: T) => MonadicSet<U>): LazyMonadicSet<U> {
        return new LazyMonadicSet(() => this.getResolved().flatMap(f).getElementsAsArray());
    }

    zip<U>(other: MonadicSet<U>): LazyMonadicSet<[T, U]> {
        return new LazyMonadicSet(() => this.getResolved().zip(other).getElementsAsArray());
    }

    zip2<U, V>(o1: MonadicSet<U>, o2: MonadicSet<V>): LazyMonadicSet<[T, U, V]> {
        return new LazyMonadicSet(() => this.getResolved().zip2(o1, o2).getElementsAsArray());
    }

    zip3<U, V, W>(o1: MonadicSet<U>, o2: MonadicSet<V>, o3: MonadicSet<W>): LazyMonadicSet<[T, U, V, W]> {
        return new LazyMonadicSet(() => this.getResolved().zip3(o1, o2, o3).getElementsAsArray());
    }

    zip4<U, V, W, X>(o1: MonadicSet<U>, o2: MonadicSet<V>, o3: MonadicSet<W>, o4: MonadicSet<X>): LazyMonadicSet<[T, U, V, W, X]> {
        return new LazyMonadicSet(() => this.getResolved().zip4(o1, o2, o3, o4).getElementsAsArray());
    }

    zip5<U, V, W, X, Y>(
        o1:MonadicSet<U>, 
        o2: MonadicSet<V>, 
        o3: MonadicSet<W>, 
        o4: MonadicSet<X>, 
        o5: MonadicSet<Y>
    ): LazyMonadicSet<[T, U, V, W, X, Y]> {
        return new LazyMonadicSet(() => this.getResolved().zip5(o1, o2, o3, o4, o5).getElementsAsArray());
    }

    zip6<U, V, W, X, Y, Z>(
        o1:MonadicSet<U>,
        o2: MonadicSet<V>,
        o3: MonadicSet<W>,
        o4: MonadicSet<X>,
        o5: MonadicSet<Y>,
        o6: MonadicSet<Z>
    ): LazyMonadicSet<[T, U, V, W, X, Y, Z]> {
        return new LazyMonadicSet(() => this.getResolved().zip6(o1, o2, o3, o4, o5, o6).getElementsAsArray());
    }

    zipN<U>(...others: MonadicSet<U>[]): LazyMonadicSet<[T, ...U[]]> {
        return new LazyMonadicSet(() => this.getResolved().zipN(...others).getElementsAsArray());
    }

    intersect(...others: MonadicSet<T>[]): LazyMonadicSet<T> {
        return new LazyMonadicSet(() => this.getResolved().intersect(...others).getElementsAsArray());
    }

    union<U>(...others: MonadicSet<U>[]): LazyMonadicSet<T|U> {
        return new LazyMonadicSet(() => this.getResolved().union(...others).getElementsAsArray());
    }

    difference(...others: MonadicSet<T>[]): LazyMonadicSet<T> {
        return new LazyMonadicSet(() => this.getResolved().difference(...others).getElementsAsArray());
    }

    symmetricDifference(other: MonadicSet<T>): LazyMonadicSet<T> {
        return new LazyMonadicSet(() => this.getResolved().symmetricDifference(other).getElementsAsArray());
    }

}
