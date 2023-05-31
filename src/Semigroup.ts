export interface Semigroup<out T> {
	op: SemigroupOperation<T>;
	concat(other: T): Semigroup<T>;
}
export type SemigroupOperation<out T> = (a: T, b: T) => T;
export class SemigroupElement<out T> implements Semigroup<T> {
	constructor(protected readonly value: T, public readonly op: SemigroupOperation<T>) {}
	concat(other: T): SemigroupElement<T> {
		return new SemigroupElement(this.op(this.value, other), this.op);
	}

	get(): T {
		return this.value;
	}
}
export class AdditiveNumberSemigroup implements Semigroup<number> {
	constructor(protected readonly value: number) {}
	readonly op = (a: number, b: number) => a + b;
	concat(other: number): AdditiveNumberSemigroup {
		return new AdditiveNumberSemigroup(this.op(this.value, other));
	}
}
export class MultiplicativeNumberSemigroup implements Semigroup<number> {
	constructor(protected readonly value: number) {}
	readonly op = (a: number, b: number) => a * b;
	concat(other: number): MultiplicativeNumberSemigroup {
		return new MultiplicativeNumberSemigroup(this.op(this.value, other));
	}
}
export class StringSemigroup implements Semigroup<string> {
	constructor(protected readonly value: string) {}
	readonly op = (a: string, b: string) => a + b;
	concat(other: string): StringSemigroup {
		return new StringSemigroup(this.op(this.value, other));
	}
}
export class ArraySemigroup<T> implements Semigroup<T[]> {
	constructor(protected readonly value: T[]) {}
	readonly op = (a: T[], b: T[]) => a.concat(b);
	concat(other: T[]): ArraySemigroup<T> {
		return new ArraySemigroup(this.op(this.value, other));
	}
}
export class AdditiveNumberSemigroupElement extends SemigroupElement<number> {
	constructor(protected readonly value: number) {
		super(value, (a, b) => a + b);
	}
}
export class MultiplicativeNumberSemigroupElement extends SemigroupElement<number> {
	constructor(protected readonly value: number) {
		super(value, (a, b) => a * b);
	}
}
export class StringSemigroupElement extends SemigroupElement<string> {
	constructor(protected readonly value: string) {
		super(value, (a, b) => a + b);
	}
}
export class ArraySemigroupElement<T> extends SemigroupElement<T[]> {
	constructor(protected readonly value: T[]) {
		super(value, (a, b) => a.concat(b));
	}
}
