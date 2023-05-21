import {AdditiveNumberSemigroup, type Semigroup, SemigroupElement, type SemigroupOperation} from './Semigroup.js';

export interface Monoid<T> extends Semigroup<T> {
	id(): T;
}
export class MonoidElement<T> extends SemigroupElement<T> {
	constructor(protected readonly value: T, public op: SemigroupOperation<T>, protected readonly idValue: T) {
		super(value, op);
	}

	id(): T {
		return this.idValue;
	}
}
export class AdditiveNumberMonoid extends AdditiveNumberSemigroup implements Monoid<number> {
	constructor(protected readonly value: number) {
		super(value);
	}

	id(): number {
		return 0;
	}

	concat(other: number): AdditiveNumberMonoid {
		return new AdditiveNumberMonoid(this.value + other);
	}
}
export class AdditiveNumberMonoidElement extends MonoidElement<number> {
	constructor(protected readonly value: number) {
		super(value, (a, b) => a + b, 0);
	}

	concat(other: number): AdditiveNumberMonoidElement {
		return new AdditiveNumberMonoidElement(this.value + other);
	}
}
export class MultiplicativeNumberMonoid implements Monoid<number> {
	constructor(protected readonly value: number) {}
	id(): number {
		return 1;
	}

	op = (a: number, b: number) => a * b;
	concat(other: number): MultiplicativeNumberMonoid {
		return new MultiplicativeNumberMonoid(this.op(this.value, other));
	}
}
export class MultiplicativeNumberMonoidElement extends MonoidElement<number> {
	constructor(protected readonly value: number) {
		super(value, (a, b) => a * b, 1);
	}

	concat(other: number): MultiplicativeNumberMonoidElement {
		return new MultiplicativeNumberMonoidElement(this.value * other);
	}
}
export class StringMonoid implements Monoid<string> {
	constructor(protected readonly value: string) {}
	id(): string {
		return '';
	}

	op = (a: string, b: string) => a + b;
	concat(other: string): StringMonoid {
		return new StringMonoid(this.op(this.value, other));
	}
}
export class StringMonoidElement extends MonoidElement<string> {
	constructor(protected readonly value: string) {
		super(value, (a, b) => a + b, '');
	}

	concat(other: string): StringMonoidElement {
		return new StringMonoidElement(this.value + other);
	}
}
export class ArrayMonoid<T> implements Monoid<T[]> {
	constructor(protected readonly value: T[]) {}
	id(): T[] {
		return [];
	}

	op = (a: T[], b: T[]) => a.concat(b);
	concat(other: T[]): ArrayMonoid<T> {
		return new ArrayMonoid(this.op(this.value, other));
	}
}
export class ArrayMonoidElement<T> extends MonoidElement<T[]> {
	constructor(protected readonly value: T[]) {
		super(value, (a, b) => a.concat(b), []);
	}

	concat(other: T[]): ArrayMonoidElement<T> {
		return new ArrayMonoidElement(this.value.concat(other));
	}
}
