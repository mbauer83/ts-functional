import { QueriedValueNotPresent, Throwable } from "./definitions";
import { Either, Right } from "./Either";

export class LazyEither<L, R> implements Either<L, R> {
    private resolved: null|Either<L, R> = null;
    constructor(private readonly getter: (...args: any[]) => Either<L, R>, private readonly getterArgsProvider: () => any[]) {}

    private resolve(): void {
        this.resolved = this.getter(...this.getterArgsProvider());
    }

    getResolved(): Either<L, R> {
        if (this.resolved === null) {
            this.resolve();
        }
        return this.resolved!;
    }
    
    isLeft(): boolean {
        return this.getResolved().isLeft();
    }

    isRight(): boolean {
        return this.getResolved().isRight();
    }

    map<U>(f: (x: R) => U): LazyEither<L, U> {
        return new LazyEither<L, U>(() => this.getResolved().map(f), () => []);
    }

    mapWithNewLeft<U, L2>(f: (x: R) => U, g: (x: any) => L2): LazyEither<L2, U> {
        return new LazyEither<L2, U>(() => this.getResolved().mapWithNewLeft(f, g), () => []);
    }

    withNewLeft<L2>(x: L2 | ((...args: any[]) => L2)): LazyEither<L2, R> {
        return new LazyEither<L2, R>(() => this.getResolved().withNewLeft(x), () => []);
    }

    apply<U>(f: Either<L, (x: R) => U>): LazyEither<L, U> {
        return new LazyEither<L, U>(() => this.getResolved().apply(f), () => []);
    }

    pure<U>(x: U): LazyEither<L, U> {
        return new LazyEither<L, U>(() => new Right<L, U>(x) , () => []);        
    }

    flatMap<U, L2>(f: (x: R) => Either<L2, U>): LazyEither<L | L2, U> {
        return new LazyEither<L | L2, U>(() => this.getResolved().flatMap(f), () => []);
    }

    fold<L2, R2>(lf: (l: L) => L2, rf: (r: R) => R2): L2 | R2 {
        return this.getResolved().fold(lf, rf);
    }

    zip<L2, R2>(other: Either<L2, R2>): LazyEither<L | L2, [R, R2]> {
        return new LazyEither<L | L2, [R, R2]>(() => this.getResolved().zip(other), () => []);        
    }

    zip2<L2, L3, R2, R3>(o1: Either<L2, R2>, o2: Either<L3, R3>): LazyEither<L | L2 | L3, [R, R2, R3]> {
        const fn = () => this.getResolved().zip2(o1, o2);
        return new LazyEither<L | L2 | L3, [R, R2, R3]>(fn, () => []);
    }

    zip3<L2, L3, L4, R2, R3, R4>(
        o1: Either<L2, R2>, 
        o2: Either<L3, R3>, 
        o3: Either<L4, R4>
    ): LazyEither<L | L2 | L3 | L4, [R, R2, R3, R4]> {
        const fn = () => this.getResolved().zip3(o1, o2, o3);
        return new LazyEither<L | L2 | L3 | L4, [R, R2, R3, R4]>(fn, () => []);
    }

    zip4<L2, L3, L4, L5, R2, R3, R4, R5>(
        o1: Either<L2, R2>, 
        o2: Either<L3, R3>, 
        o3: Either<L4, R4>, 
        o4: Either<L5, R5>
    ): LazyEither<L | L2 | L3 | L4 | L5, [R, R2, R3, R4, R5]> {
        const fn = () => this.getResolved().zip4(o1, o2, o3, o4);
        return new LazyEither<L | L2 | L3 | L4 | L5, [R, R2, R3, R4, R5]>(fn, () => []);
    }

    zip5<L2, L3, L4, L5, L6, R2, R3, R4, R5, R6>(
        o1: Either<L2, R2>,
        o2: Either<L3, R3>,
        o3: Either<L4, R4>,
        o4: Either<L5, R5>,
        o5: Either<L6, R6>
    ): LazyEither<L | L2 | L3 | L4 | L5 | L6, [R, R2, R3, R4, R5, R6]> {
        const fn = () => this.getResolved().zip5(o1, o2, o3, o4, o5);
        return new LazyEither<L | L2 | L3 | L4 | L5 | L6, [R, R2, R3, R4, R5, R6]>(fn, () => []);
    }

    zip6<L2, L3, L4, L5, L6, L7, R2, R3, R4, R5, R6, R7>(
        o1: Either<L2, R2>,
        o2: Either<L3, R3>,
        o3: Either<L4, R4>,
        o4: Either<L5, R5>,
        o5: Either<L6, R6>,
        o6: Either<L7, R7>
    ): LazyEither<L | L2 | L3 | L4 | L5 | L6 | L7, [R, R2, R3, R4, R5, R6, R7]> {
        const fn = () => this.getResolved().zip6(o1, o2, o3, o4, o5, o6);
        return new LazyEither<L | L2 | L3 | L4 | L5 | L6 | L7, [R, R2, R3, R4, R5, R6, R7]>(fn, () => []);
    }

    zipN<L2, R2>(...others: Either<L2, R2>[]): LazyEither<L | L2, [R, ...R2[]]> {
        const fn = () => this.getResolved().zipN(...others);
        return new LazyEither<L | L2, [R, ...R2[]]>(fn, () => []);        
    }

    get(): L | R {
        return this.getResolved().get();
    }

    getOrElse(x: R): R {
        return this.getResolved().getOrElse(x);
    }

    getOrThrow(t: Throwable): R {
        const resolved = this.getResolved();
        const val: L|R = resolved.get();
        if (resolved.isRight()) {
            return val as R;
        }

        if (typeof t === 'function') {
            t = t(val);
        }
        if (typeof t === 'string') {
            throw new Error(t);
        }
        throw t;
    }

    getOrQueriedValueNotPresent(msg?: string): LazyEither<QueriedValueNotPresent, R> {
        return new LazyEither(() => this.getResolved().getOrQueriedValueNotPresent(msg), () => []);;        
    }

    equals(other: Either<L, R>): boolean {
        return this.getResolved().equals(other);
    }

}