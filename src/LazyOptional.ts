import { QueriedValueNotPresent, Throwable } from "./definitions";
import { Either } from "./Either";
import { None, Optional, Some } from "./Optional";

export class LazyOptional<T> implements Optional<T> {
    private resolved: null|Optional<T> = null;
    constructor(private readonly fn: (...args: any[]) => Optional<T>, private readonly argsProvider: () => any[]) {}

    private resolve(): void {
        this.resolved = this.fn(...this.argsProvider());
    }

    getResolved(): Optional<T> {
        if (this.resolved === null) {
            this.resolve();
        }
        return this.resolved!;
    }

    map<U>(f: (x: T) => U): LazyOptional<U> {
        return new LazyOptional<U>(() => this.getResolved().map(f), () => []);
    }

    pure<U>(x: U): LazyOptional<U> {
        return new LazyOptional<U>(() => new Some(x), () => []);
    }

    apply<U>(f: Optional<(x: T) => U>): LazyOptional<U> {
        return new LazyOptional<U>(() => this.getResolved().apply(f), () => []);
    }

    flatMap<U>(f: (x: T) => Optional<U>): LazyOptional<U> {
        return new LazyOptional<U>(() => this.getResolved().flatMap(f), () => []);
    }

    fold<U>(f: () => U, g: (x: T) => U): U {
        return this.getResolved().fold(f, g);
    }

    zip<U>(other: Optional<U>): LazyOptional<[T, U]> {
        return new LazyOptional<[T, U]>(() => this.getResolved().zip(other), () => []);
    }

    zip2<U, V>(o1: Optional<U>, o2: Optional<V>): LazyOptional<[T, U, V]> {
        return new LazyOptional<[T, U, V]>(() => this.getResolved().zip2(o1, o2), () => []);
    }

    zip3<U, V, W>(o1: Optional<U>, o2: Optional<V>, o3: Optional<W>): LazyOptional<[T, U, V, W]> {
        return new LazyOptional<[T, U, V, W]>(() => this.getResolved().zip3(o1, o2, o3), () => []);
    }

    zip4<U, V, W, X>(
        o1: Optional<U>, 
        o2: Optional<V>, 
        o3: Optional<W>, 
        o4: Optional<X>
    ): LazyOptional<[T, U, V, W, X]> {
        return new LazyOptional<[T, U, V, W, X]>(() => this.getResolved().zip4(o1, o2, o3, o4), () => []);
    }

    zip5<U, V, W, X, Y>(
        o1: Optional<U>,
        o2: Optional<V>,
        o3: Optional<W>,
        o4: Optional<X>,
        o5: Optional<Y>
    ): LazyOptional<[T, U, V, W, X, Y]> {
        return new LazyOptional<[T, U, V, W, X, Y]>(() => this.getResolved().zip5(o1, o2, o3, o4, o5), () => []);
    }

    zip6<U, V, W, X, Y, Z>(
        o1: Optional<U>,
        o2: Optional<V>,
        o3: Optional<W>,
        o4: Optional<X>,
        o5: Optional<Y>,
        o6: Optional<Z>
    ): LazyOptional<[T, U, V, W, X, Y, Z]> {
        return new LazyOptional<[T, U, V, W, X, Y, Z]>(() => this.getResolved().zip6(o1, o2, o3, o4, o5, o6), () => []);
    }

    zipN<U>(os: Optional<U>[]): LazyOptional<[T, ...U[]]> {
        return new LazyOptional<[T, ...U[]]>(() => this.getResolved().zipN(os), () => []);
    }

    getOrElse(x: T): T {
        return this.getResolved().getOrElse(x);
    }

    getOrThrow(t: Throwable): T {
        return this.getResolved().getOrThrow(t);
    }

    getOrQueriedValueNotPresent(msg?: string): Either<QueriedValueNotPresent, T> {
        return this.getResolved().getOrQueriedValueNotPresent(msg);
    }

    isSome(): this is Some<T> {
        return this.getResolved().isSome();
    }

    isNone(): this is None<T> {
        return this.getResolved().isNone();
    }

    equals(other: Optional<T>): boolean {
        return this.getResolved().equals(other);
    }

    match<U>(some: (t: T) => U, none: () => U): U {
        return this.getResolved().match(some, none);
    }

    toEither<L>(left: L): Either<L, T> {
        return this.getResolved().toEither(left);
    }

    toEitherLazy<L>(left: () => L): Either<L, T> {
        return this.getResolved().toEitherLazy(left);
    }

}
