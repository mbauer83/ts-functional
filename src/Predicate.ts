import { EqualityComparable } from '@mbauer83/ts-utils/src/comparison/equality';
import { Contravariant } from "./Contravariant";

export class Predicate<in T> implements Contravariant<Predicate<T>, T>, EqualityComparable<Predicate<T>> {
    constructor(public readonly evaluate: (value: T) => boolean) { }
    equals(other: Predicate<T>): boolean {
        return this.evaluate.toString() === other.evaluate.toString();
    }
    
    contramap<U>(f: (x: U) => T): (u:U) => Predicate<U> {
        const evaluate = (u: U) => this.evaluate(f(u));
        return (u: U) => new Predicate(evaluate);
    }
}
