import {type ContravariantFunctor} from './Contravariant.js';

export class Predicate<in T> implements ContravariantFunctor<T> {
	constructor(public readonly evaluate: (value: T) => boolean) {}
	equals(other: Predicate<T>): boolean {
		return this.evaluate.toString() === other.evaluate.toString();
	}

	contramap<U>(f: (x: U) => T): Predicate<U> {
		const evaluate = (u: U) => this.evaluate(f(u));
		return new Predicate(evaluate);
	}

	and(other: Predicate<T>): Predicate<T> {
		const evaluate = (x: T) => this.evaluate(x) && other.evaluate(x);
		return new Predicate(evaluate);
	}

	or(other: Predicate<T>): Predicate<T> {
		const evaluate = (x: T) => this.evaluate(x) || other.evaluate(x);
		return new Predicate(evaluate);
	}

	not(): Predicate<T> {
		const evaluate = (x: T) => !this.evaluate(x);
		return new Predicate(evaluate);
	}

	xor(other: Predicate<T>): Predicate<T> {
		const evaluate = (x: T) => this.evaluate(x) !== other.evaluate(x);
		return new Predicate(evaluate);
	}

	nand(other: Predicate<T>): Predicate<T> {
		const evaluate = (x: T) => !(this.evaluate(x) && other.evaluate(x));
		return new Predicate(evaluate);
	}

	nor(other: Predicate<T>): Predicate<T> {
		const evaluate = (x: T) => !(this.evaluate(x) || other.evaluate(x));
		return new Predicate(evaluate);
	}

	implies(other: Predicate<T>): Predicate<T> {
		const evaluate = (x: T) => !this.evaluate(x) || other.evaluate(x);
		return new Predicate(evaluate);
	}
}

export type PredicateOrFn<T> = Predicate<T> | ((t: T) => boolean);

export function evaluatePredicate<T>(predicate: PredicateOrFn<T>, t: T): boolean {
	return typeof predicate === 'function' ? predicate(t) : predicate.evaluate(t);
}

export function andFn<T>(p1: PredicateOrFn<T>, p2: PredicateOrFn<T>): Predicate<T> {
	const evaluate = (x: T) => evaluatePredicate(p1, x) && evaluatePredicate(p2, x);
	return new Predicate(evaluate);
}

export function orFn<T>(p1: PredicateOrFn<T>, p2: PredicateOrFn<T>): Predicate<T> {
	const evaluate = (x: T) => evaluatePredicate(p1, x) || evaluatePredicate(p2, x);
	return new Predicate(evaluate);
}

export function nandFn<T>(p1: PredicateOrFn<T>, p2: PredicateOrFn<T>): Predicate<T> {
	const evaluate = (x: T) => !(evaluatePredicate(p1, x) && evaluatePredicate(p2, x));
	return new Predicate(evaluate);
}

export function norFn<T>(p1: PredicateOrFn<T>, p2: PredicateOrFn<T>): Predicate<T> {
	const evaluate = (x: T) => !(evaluatePredicate(p1, x) || evaluatePredicate(p2, x));
	return new Predicate(evaluate);
}

export function xorFn<T>(p1: PredicateOrFn<T>, p2: PredicateOrFn<T>): Predicate<T> {
	const evaluate = (x: T) => evaluatePredicate(p1, x) !== evaluatePredicate(p2, x);
	return new Predicate(evaluate);
}

export class IsTrue<T> extends Predicate<T> {
	constructor() {
		super((x: T) => x === true);
	}
}

export class IsFalse<T> extends Predicate<T> {
	constructor() {
		super((x: T) => x === false);
	}
}

export class IsFalsy<T> extends Predicate<T> {
	constructor() {
		super((x: T) => !x);
	}
}

export class IsBoolean<T> extends Predicate<T> {
	constructor() {
		super((x: T) => typeof x === 'boolean');
	}
}

export class IsNumber<T> extends Predicate<T> {
	constructor() {
		super((x: T) => typeof x === 'number');
	}
}

export class IsString<T> extends Predicate<T> {
	constructor() {
		super((x: T) => typeof x === 'string');
	}
}

export class IsSymbol<T> extends Predicate<T> {
	constructor() {
		super((x: T) => typeof x === 'symbol');
	}
}

export class IsObject<T> extends Predicate<T> {
	constructor() {
		super((x: T) => typeof x === 'object');
	}
}

export class IsFunction<T> extends Predicate<T> {
	constructor() {
		super((x: T) => typeof x === 'function');
	}
}

export class IsUndefined<T> extends Predicate<T> {
	constructor() {
		super((x: T) => x === undefined);
	}
}

export class IsNull<T> extends Predicate<T> {
	constructor() {
		super((x: T) => x === null);
	}
}

export class IsNullish<T> extends Predicate<T> {
	constructor() {
		// eslint-disable-next-line no-eq-null, eqeqeq
		super((x: T) => x == null);
	}
}

export class IsNaN<T> extends Predicate<T> {
	constructor() {
		super((x: T) => Number.isNaN(x as unknown as number));
	}
}

export class IsFinite<T> extends Predicate<T> {
	constructor() {
		super((x: T) => Number.isFinite(x as unknown as number));
	}
}

export class IsInteger<T> extends Predicate<T> {
	constructor() {
		super((x: T) => Number.isInteger(x as unknown as number));
	}
}

export class IsSafeInteger<T> extends Predicate<T> {
	constructor() {
		super((x: T) => Number.isSafeInteger(x as unknown as number));
	}
}

export class IsInfinite<T> extends Predicate<T> {
	constructor() {
		super((x: T) => x === Number.POSITIVE_INFINITY || x === Number.NEGATIVE_INFINITY);
	}
}

export class IsPositive<T> extends Predicate<T> {
	constructor() {
		super((x: T) => typeof x === 'number' && x > 0);
	}
}

export class IsNegative<T> extends Predicate<T> {
	constructor() {
		super((x: T) => typeof x === 'number' && x < 0);
	}
}

export class IsZero<T> extends Predicate<T> {
	constructor() {
		super((x: T) => typeof x === 'number' && (x === 0));
	}
}

export class IsPositiveInfinity<T> extends Predicate<T> {
	constructor() {
		super((x: T) => x === Number.POSITIVE_INFINITY);
	}
}

export class IsNegativeInfinity<T> extends Predicate<T> {
	constructor() {
		super((x: T) => x === Number.NEGATIVE_INFINITY);
	}
}

export class IsArray<T> extends Predicate<T> {
	constructor() {
		super(Array.isArray);
	}
}

export class IsArrayBuffer<T> extends Predicate<T> {
	constructor() {
		super((x: T) => x instanceof ArrayBuffer);
	}
}

export class IsSharedArrayBuffer<T> extends Predicate<T> {
	constructor() {
		super((x: T) => x instanceof SharedArrayBuffer);
	}
}

export class IsDataView<T> extends Predicate<T> {
	constructor() {
		super((x: T) => x instanceof DataView);
	}
}

export class IsMap<T> extends Predicate<T> {
	constructor() {
		super((x: T) => x instanceof Map);
	}
}

export class IsSet<T> extends Predicate<T> {
	constructor() {
		super((x: T) => x instanceof Set);
	}
}

export class IsWeakMap<T> extends Predicate<T> {
	constructor() {
		super((x: T) => x instanceof WeakMap);
	}
}

export class IsWeakSet<T> extends Predicate<T> {
	constructor() {
		super((x: T) => x instanceof WeakSet);
	}
}

export class IsDate<T> extends Predicate<T> {
	constructor() {
		super((x: T) => x instanceof Date);
	}
}

export class IsRegExp<T> extends Predicate<T> {
	constructor() {
		super((x: T) => x instanceof RegExp);
	}
}

export class IsPromise<T> extends Predicate<T> {
	constructor() {
		super((x: T) => x instanceof Promise);
	}
}

export class HasProp<T> extends Predicate<T> {
	constructor(prop: string | symbol) {
		super((x: T) => typeof x === 'object' && x !== null && prop in x);
	}
}

export class HasProps<T> extends Predicate<T> {
	constructor(props: Array<string | symbol>) {
		super((x: T) => {
			const isNonNullObject = typeof x === 'object' && x !== null;
			return isNonNullObject && props.every(prop => prop in x);
		});
	}
}

export class IsIterable<T> extends Predicate<T> {
	constructor() {
		super((x: T) => typeof x === 'object' && x !== null && Symbol.iterator in x);
	}
}

export class IsAsyncIterable<T> extends Predicate<T> {
	constructor() {
		super((x: T) => typeof x === 'object' && x !== null && Symbol.asyncIterator in x);
	}
}

export class IsEqualTo<T> extends Predicate<T> {
	constructor(value: any) {
		super((x: T) => x === value);
	}
}

export class IsUnsafeEqualTo<T> extends Predicate<T> {
	constructor(value: any) {
		// eslint-disable-next-line eqeqeq
		super((x: T) => x == value);
	}
}

export class IsSameAs<T> extends Predicate<T> {
	constructor(value: any) {
		super((x: T) => Object.is(x, value));
	}
}

export class IsTypeOf<T> extends Predicate<T> {
	constructor(type: string) {
		super((x: T) => typeof x === type);
	}
}

export class IsInstanceOf<T> extends Predicate<T> {
	constructor(type: any) {
		super((x: T) => x instanceof type);
	}
}

export class IsOneOf<T> extends Predicate<T> {
	constructor(values: any[]) {
		super((x: T) => values.includes(x));
	}
}

export class IsNoneOf<T> extends Predicate<T> {
	constructor(values: any[]) {
		super((x: T) => !values.includes(x));
	}
}

export class IsGreaterThan<T> extends Predicate<T> {
	constructor(value: any) {
		super((x: T) => x > value);
	}
}

export class IsGreaterThanOrEqualTo<T> extends Predicate<T> {
	constructor(value: any) {
		super((x: T) => x >= value);
	}
}

export class IsLessThan<T> extends Predicate<T> {
	constructor(value: any) {
		super((x: T) => x < value);
	}
}

export class IsLessThanOrEqualTo<T> extends Predicate<T> {
	constructor(value: any) {
		super((x: T) => x <= value);
	}
}

export class IsBetween<T> extends Predicate<T> {
	constructor(min: number, max: number) {
		super((x: T) => typeof x === 'number' && x >= min && x <= max);
	}
}

export class IsBetweenExclusive<T> extends Predicate<T> {
	constructor(min: number, max: number) {
		super((x: T) => typeof x === 'number' && x > min && x < max);
	}
}

export class IsBefore<T> extends Predicate<T> {
	constructor(date: Date) {
		super((x: T) => x instanceof Date && x < date);
	}
}

export class IsBeforeOrSameDate<T> extends Predicate<T> {
	constructor(date: Date) {
		super((x: T) => x instanceof Date && x <= date);
	}
}

export class IsAfter<T> extends Predicate<T> {
	constructor(date: Date) {
		super((x: T) => x instanceof Date && x > date);
	}
}

export class IsAfterOrSameDate<T> extends Predicate<T> {
	constructor(date: Date) {
		super((x: T) => x instanceof Date && x >= date);
	}
}

export class PropEquals<T> extends Predicate<T> {
	constructor(prop: string | symbol, value: any) {
		const hasProp = new HasProp(prop);

		super((x: T) => hasProp.evaluate(x) && (x as Record<string | symbol, any>)[prop] === value);
	}
}

export class PropIsOneOf<T> extends Predicate<T> {
	constructor(prop: string | symbol, values: any[]) {
		const hasProp = new HasProp(prop);
		const isOneOf = new IsOneOf(values);

		super((x: T) => hasProp.evaluate(x) && isOneOf.evaluate((x as Record<string | symbol, any>)[prop]));
	}
}

export class PropIsNoneOf<T> extends Predicate<T> {
	constructor(prop: string | symbol, values: any[]) {
		const hasProp = new HasProp(prop);
		const isNoneOf = new IsNoneOf(values);

		super((x: T) => hasProp.evaluate(x) && isNoneOf.evaluate((x as Record<string | symbol, any>)[prop]));
	}
}
