import { EqualityComparable } from '@mbauer83/ts-utils/src/comparison/equality';
import { Monad } from "./Monad";

export class Reader<E, T> implements Monad<T>, EqualityComparable<Reader<E, T>> {
    constructor(public readonly f: (x: E) => T) { }
    
    equals(other: Reader<E, T>): boolean {
        return this.f.toString() === other.f.toString();
    }

    map<U>(f: (x: T) => U): Reader<E, U> {
        return new Reader((x: E) => f(this.read(x)));
    }
    apply<U>(f: Reader<E, (x: T) => U>): Reader<E, U> {
        return new Reader((x: E) => f.read(x)(this.read(x)));
    }
    pure<U>(x: U): Reader<E, U> {
        return new Reader((_: E) => x);
    }
    flatMap<U>(f: (x: T) => Reader<E, U>): Reader<E, U> {
        return new Reader((x: E) => f(this.read(x)).read(x));
    }
    fold<U>(f: (t: T) => U): Reader<E, U> {
        return new Reader((e: E) => f(this.read(e)));
    }

    zip<U>(other: Reader<E, U>): Reader<E, [T, U]> {
        return new Reader((e: E) => [this.read(e), other.read(e)]);
    }

    zip2<U, V>(o1: Reader<E, U>, o2: Reader<E, V>): Reader<E, [T, U, V]> {
        return new Reader((e: E) => [this.read(e), o1.read(e), o2.read(e)]);
    }

    zip3<U, V, W>(
        o1: Reader<E, U>,
        o2: Reader<E, V>,
        o3: Reader<E, W>
    ): Reader<E, [T, U, V, W]> {
        return new Reader((e: E) => [
            this.read(e),
            o1.read(e),
            o2.read(e),
            o3.read(e),
        ]);
    }

    zip4<U, V, W, X>(
        o1: Reader<E, U>,
        o2: Reader<E, V>,
        o3: Reader<E, W>,
        o4: Reader<E, X>
    ): Reader<E, [T, U, V, W, X]> {
        return new Reader((e: E) => [
            this.read(e),
            o1.read(e),
            o2.read(e),
            o3.read(e),
            o4.read(e),
        ]);
    }

    zip5<U, V, W, X, Y>(
        o1: Reader<E, U>,
        o2: Reader<E, V>,
        o3: Reader<E, W>,
        o4: Reader<E, X>,
        o5: Reader<E, Y>
    ): Reader<E, [T, U, V, W, X, Y]> {
        return new Reader((e: E) => [
            this.read(e),
            o1.read(e),
            o2.read(e),
            o3.read(e),
            o4.read(e),
            o5.read(e),
        ]);
    }

    zip6<U, V, W, X, Y, Z>(
        o1: Reader<E, U>,
        o2: Reader<E, V>,
        o3: Reader<E, W>,
        o4: Reader<E, X>,
        o5: Reader<E, Y>,
        o6: Reader<E, Z>
    ): Reader<E, [T, U, V, W, X, Y, Z]> {
        return new Reader((e: E) => [
            this.read(e),
            o1.read(e),
            o2.read(e),
            o3.read(e),
            o4.read(e),
            o5.read(e),
            o6.read(e),
        ]);
    }

    zipN<U>(...others: Reader<E, U>[]): Reader<E, [T, ...U[]]> {
        return new Reader((e: E) => [
            this.read(e),
            ...others.map((o) => o.read(e)),
        ]);
    }
    read(x: E): T {
        return this.f(x);
    }
    runWithGetter(f: () => E): T {
        return this.read(f());
    }
    combine<E2, T2>(other: Reader<E2, T2>): Reader<E & E2, [T, T2]> {
        return new Reader((e: E & E2) => [this.read(e), other.read(e)]);
    }
}
