import {type EqualityComparable} from '@mbauer83/ts-utils/src/comparison/equality.js';
import {type Semigroup, StringSemigroup} from './Semigroup.js';
import {type Monoid, ArrayMonoid} from './Monoid.js';
import {type Monad} from './Monad.js';

export function resetWriter<T, L>(w: Writer<T, L, Monoid<L>>): Writer<T, L, Monoid<L>> {
	return new Writer(w.value, w.logSemiGroup, w.logSemiGroup.id());
}

export class Writer<T, L, M extends Semigroup<L> = Semigroup<L>> implements Monad<T>, EqualityComparable<Writer<T, L, M>> {
	constructor(public readonly value: T, public readonly logSemiGroup: M, private readonly log: L) {}
	logEquals(otherLog: L): boolean {
		return this.log === otherLog;
	}

	equals(other: Writer<T, L, M>): boolean {
		return this.value === other.value && this.logEquals(other.log);
	}

	tell(l: L): Writer<T, L> {
		const concatenated = this.logSemiGroup.op(this.log, l);
		return new Writer(this.value, this.logSemiGroup, concatenated);
	}

	swap(tsg: Semigroup<T>): Writer<L, T> {
		return new Writer(this.log, tsg, this.value);
	}

	map<U>(f: (t: T) => U): Writer<U, L> {
		return new Writer(f(this.value), this.logSemiGroup, this.log);
	}

	listen(): [T, L] {
		return [this.value, this.log];
	}

	pure<U>(x: U): Writer<U, string> {
		return new Writer(x, new StringSemigroup(''), '');
	}

	apply<U>(ftu: Writer<(t: T) => U, L>): Writer<U, L> {
		const [ftuValue, ftuLog] = ftu.listen();
		return this.map(ftuValue).tell(ftuLog);
	}

	flatMap<U>(f: (x: T) => Writer<U, L>): Writer<U, L> {
		const w = f(this.value);
		return new Writer(w.value, this.logSemiGroup, this.logSemiGroup.op(this.log, w.log));
	}

	zip<U>(other: Writer<U, L>): Writer<[T, U], L> {
		return new Writer([this.value, other.value], this.logSemiGroup, this.logSemiGroup.op(this.log, other.log));
	}

	zip2<U, V>(
		u: Writer<U, L>,
		v: Writer<V, L>,
	): Writer<[T, U, V], L> {
		return new Writer(
			[this.value, u.value, v.value],
			this.logSemiGroup,
			this.logSemiGroup.op(
				this.logSemiGroup.op(this.log, u.log),
				v.log,
			),
		);
	}

	zip3<U, V, W>(
		u: Writer<U, L>,
		v: Writer<V, L>,
		w: Writer<W, L>,
	): Writer<[T, U, V, W], L> {
		return new Writer(
			[this.value, u.value, v.value, w.value],
			this.logSemiGroup,
			this.logSemiGroup.op(
				this.logSemiGroup.op(
					this.logSemiGroup.op(this.log, u.log),
					v.log,
				),
				w.log,
			),
		);
	}

	zip4<U, V, W, X>(
		u: Writer<U, L>,
		v: Writer<V, L>,
		w: Writer<W, L>,
		x: Writer<X, L>,
	): Writer<[T, U, V, W, X], L> {
		return new Writer(
			[this.value, u.value, v.value, w.value, x.value],
			this.logSemiGroup,
			this.logSemiGroup.op(
				this.logSemiGroup.op(
					this.logSemiGroup.op(
						this.logSemiGroup.op(this.log, u.log),
						v.log,
					),
					w.log,
				),
				x.log,
			),
		);
	}

	zip5<U, V, W, X, Y>(
		u: Writer<U, L>,
		v: Writer<V, L>,
		w: Writer<W, L>,
		x: Writer<X, L>,
		y: Writer<Y, L>,
	): Writer<[T, U, V, W, X, Y], L> {
		return new Writer(
			[this.value, u.value, v.value, w.value, x.value, y.value],
			this.logSemiGroup,
			this.logSemiGroup.op(
				this.logSemiGroup.op(
					this.logSemiGroup.op(
						this.logSemiGroup.op(
							this.logSemiGroup.op(this.log, u.log),
							v.log,
						),
						w.log,
					),
					x.log,
				),
				y.log,
			),
		);
	}

	zip6<U, V, W, X, Y, Z>(
		u: Writer<U, L>,
		v: Writer<V, L>,
		w: Writer<W, L>,
		x: Writer<X, L>,
		y: Writer<Y, L>,
		z: Writer<Z, L>,
	): Writer<[T, U, V, W, X, Y, Z], L> {
		return new Writer(
			[this.value, u.value, v.value, w.value, x.value, y.value, z.value],
			this.logSemiGroup,
			this.logSemiGroup.op(
				this.logSemiGroup.op(
					this.logSemiGroup.op(
						this.logSemiGroup.op(
							this.logSemiGroup.op(
								this.logSemiGroup.op(this.log, u.log),
								v.log,
							),
							w.log,
						),
						x.log,
					),
					y.log,
				),
				z.log,
			),
		);
	}

	zipN<U>(...us: Array<Writer<U, L>>): Writer<[T, ...U[]], L> {
		return new Writer(
			[this.value, ...us.map(u => u.value)],
			this.logSemiGroup,
			us.reduce((acc, u) => this.logSemiGroup.op(acc, u.log), this.log),
		);
	}
}
export class StringArrayLoggingWriter<T> extends Writer<T, string[], ArrayMonoid<string>> {
	constructor(value: T, log: string[] = []) {
		super(value, new ArrayMonoid<string>(['']), log);
	}
}
export class ConsoleSemigroup implements Semigroup<string> {
	constructor(private readonly value: string) {}
	op(a: string, b: string): string {
		return a + b;
	}

	concat(other: string): ConsoleSemigroup {
		const newValue = this.op(this.value, other);
		return new ConsoleSemigroup(newValue);
	}
}
export class ConsoleLoggingWriter<T> extends Writer<T, string, ConsoleSemigroup> {
	constructor(value: T, log = '') {
		console.log(log);
		super(value, new ConsoleSemigroup(log), log);
	}
}
