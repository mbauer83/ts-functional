import {type EqualityComparable} from '@mbauer83/ts-utils/src/comparison/equality.js';
import {type Contravariant} from './Contravariant.js';

export class Predicate<in T> implements Contravariant<Predicate<T>, T>, EqualityComparable<Predicate<T>> {
	constructor(public readonly evaluate: (value: T) => boolean) {}
	equals(other: Predicate<T>): boolean {
		return this.evaluate.toString() === other.evaluate.toString();
	}

	contramap<U>(f: (x: U) => T): (u: U) => Predicate<U> {
		const evaluate = (u: U) => this.evaluate(f(u));
		return (u: U) => new Predicate(evaluate);
	}
}
