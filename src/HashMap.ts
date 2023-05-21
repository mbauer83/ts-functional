import {conditionalDo} from '@mbauer83/ts-utils/src/controlFlow/conditionalDo.js';
import {type HasCount} from '@mbauer83/ts-utils/src/size/HasCount.js';
import {QueriedValueNotPresent, type Throwable} from './definitions.js';
import {type Either, Left, Right} from './Either.js';
import {everyFilterable, type Filterable, noneFilterable, someFilterable} from './Filterable.js';
import {type Monad} from './Monad.js';
import {type Monoid} from './Monoid.js';
import {None, type Optional, type Some, optionalFromValue} from './Optional.js';
import {type Predicate} from './Predicate.js';

export interface MonadicHashMap<S extends string | number | symbol, T> extends Monad<T>, Monoid<MonadicHashMap<S, T>>, Filterable<[S, T]>, HasCount {
	op: (l: MonadicHashMap<S, T>, r: MonadicHashMap<S, T>) => MonadicHashMap<S, T>;
	[Symbol.iterator](): Iterator<[S, T]>;
	map<U>(f: (t: T) => U): MonadicHashMap<S, U>;
	pure<U>(x: U): MonadicHashMap<number, U>;
	apply<U>(f: MonadicHashMap<S, (t: T) => U>): MonadicHashMap<S, U>;
	zip<U>(other: MonadicHashMap<S, U>): MonadicHashMap<S, [T, U]>;
	zipWithAllValues<U>(other: MonadicHashMap<S, U>): MonadicHashMap<S, Map<string, T | U>>;
	zip2<U, V>(o1: MonadicHashMap<S, U>, o2: MonadicHashMap<S, V>): MonadicHashMap<S, [T, U, V]>;
	zip2WithAllValues<U, V>(o1: MonadicHashMap<S, U>, o2: MonadicHashMap<S, V>): MonadicHashMap<S, Map<string, T | U | V>>;
	zip3<U, V, W>(o1: MonadicHashMap<S, U>, o2: MonadicHashMap<S, V>, o3: MonadicHashMap<S, W>): MonadicHashMap<S, [T, U, V, W]>;
	zip3WithAllValues<U, V, W>(o1: MonadicHashMap<S, U>, o2: MonadicHashMap<S, V>, o3: MonadicHashMap<S, W>): MonadicHashMap<S, Map<string, T | U | V | W>>;
	zip4<U, V, W, X>(o1: MonadicHashMap<S, U>, o2: MonadicHashMap<S, V>, o3: MonadicHashMap<S, W>, o4: MonadicHashMap<S, X>): MonadicHashMap<S, [T, U, V, W, X]>;
	zip4WithAllValues<U, V, W, X>(o1: MonadicHashMap<S, U>, o2: MonadicHashMap<S, V>, o3: MonadicHashMap<S, W>, o4: MonadicHashMap<S, X>): MonadicHashMap<S, Map<string, T | U | V | W | X>>;
	zip5<U, V, W, X, Y>(o1: MonadicHashMap<S, U>, o2: MonadicHashMap<S, V>, o3: MonadicHashMap<S, W>, o4: MonadicHashMap<S, X>, o5: MonadicHashMap<S, Y>): MonadicHashMap<S, [T, U, V, W, X, Y]>;
	zip5WithAllValues<U, V, W, X, Y>(o1: MonadicHashMap<S, U>, o2: MonadicHashMap<S, V>, o3: MonadicHashMap<S, W>, o4: MonadicHashMap<S, X>, o5: MonadicHashMap<S, Y>): MonadicHashMap<S, Map<string, T | U | V | W | X | Y>>;
	zip6<U, V, W, X, Y, Z>(o1: MonadicHashMap<S, U>, o2: MonadicHashMap<S, V>, o3: MonadicHashMap<S, W>, o4: MonadicHashMap<S, X>, o5: MonadicHashMap<S, Y>, o6: MonadicHashMap<S, Z>): MonadicHashMap<S, [T, U, V, W, X, Y, Z]>;
	zip6WithAllValues<U, V, W, X, Y, Z>(o1: MonadicHashMap<S, U>, o2: MonadicHashMap<S, V>, o3: MonadicHashMap<S, W>, o4: MonadicHashMap<S, X>, o5: MonadicHashMap<S, Y>, o6: MonadicHashMap<S, Z>): MonadicHashMap<S, Map<string, T | U | V | W | X | Y | Z>>;
	flatMap<U>(f: (t: T) => MonadicHashMap<S, U>): MonadicHashMap<S, U[]>;
	filter(p: Predicate<[S, T]>): MonadicHashMap<S, T>;
	every(p: Predicate<[S, T]>): boolean;
	some(p: Predicate<[S, T]>): boolean;
	none(p: Predicate<[S, T]>): boolean;
	getAsMap(): Map<S, T>;
	getSize(): number;
	has(key: S): boolean;
	get(key: S): Optional<T>;
	getOrThrow(key: S, error?: Throwable): T;
	getOrElse(key: S, defaultValue: T): T;
	getOrQueriedValueNotPresent(key: S): Either<QueriedValueNotPresent, T>;
	withEntry(key: S, value: T): MonadicHashMap<S, T>;
	withEntries(...pairs: Array<[S, T]>): MonadicHashMap<S, T>;
	withoutEntry(key: S): MonadicHashMap<S, T>;
	withoutEntries(...keys: S[]): MonadicHashMap<S, T>;
	entries(): IterableIterator<[S, T]>;
	keys(): IterableIterator<S>;
	values(): IterableIterator<T>;
	forEach(callbackFn: (value: T, key: S, map: Map<S, T>) => void, thisArg?: any): void;
	concat(other: MonadicHashMap<S, T>): MonadicHashMap<S, T>;
	id(): MonadicHashMap<S, T>;
}

export class HashMap<S extends string | number | symbol, T> implements MonadicHashMap<S, T> {
	protected static readonly defaultErrorMessage = (key: string) => `MonadicHashMap::getOrThrow - Unknown key [${key}].`;
	private static readonly emptyFunction = () => { /* do nothing */ };
	protected readonly _map: Map<S, T> = new Map<S, T>();
	protected readonly empty: HashMap<S, T> = new HashMap<S, T>();

	constructor(...pairs: Array<[S, T]>) {
		for (const [k, v] of pairs) {
			this._map.set(k, v);
		}
	}

	public readonly op: (l: MonadicHashMap<S, T>, r: MonadicHashMap<S, T>) => MonadicHashMap<S, T> = (l, r) => l.concat(r);

	id(): HashMap<S, T> {
		return this.empty;
	}

	filter(p: Predicate<[S, T]>): HashMap<S, T> {
		let filtered = new HashMap<S, T>();
		for (const [k, v] of this._map.entries()) {
			if (p.evaluate([k, v])) {
				filtered = filtered.withEntry(k, v);
			}
		}

		return filtered;
	}

	every(p: Predicate<[S, T]>): boolean {
		return everyFilterable(this, p);
	}

	some(p: Predicate<[S, T]>): boolean {
		return someFilterable(this, p);
	}

	none(p: Predicate<[S, T]>): boolean {
		return noneFilterable(this, p);
	}

	[Symbol.iterator](): Iterator<[S, T]> {
		return this._map.entries();
	}

	getAsMap(): Map<S, T> {
		return new Map(this._map.entries());
	}

	getSize(): number {
		return this._map.size;
	}

	has(key: S): boolean {
		return this._map.has(key);
	}

	getOrElse(key: S, defaultValue: T): T {
		return this._map.get(key) ?? defaultValue;
	}

	getOrThrow(key: S, t: Throwable = HashMap.defaultErrorMessage): T {
		const value = this._map.get(key);
		if (value) {
			return value;
		}

		if (typeof t === 'function') {
			t = t(key);
		}

		if (typeof t === 'string') {
			throw new TypeError(t);
		}

		throw t;
	}

	getOrQueriedValueNotPresent(key: S, message?: string): Either<QueriedValueNotPresent, T> {
		const value = this._map.get(key);
		return value
			? new Right<QueriedValueNotPresent, T>(value)
			: new Left<QueriedValueNotPresent, T>(new QueriedValueNotPresent(message ?? `MonadicHashMap::getOrQueriedValueNotPresent(${key as string})`));
	}

	get(key: S): Optional<T> {
		return optionalFromValue(this._map.get(key));
	}

	withEntry(key: S, value: T): HashMap<S, T> {
		return new HashMap<S, T>(...this._map.entries(), [key, value]);
	}

	withoutEntry(key: S): HashMap<S, T> {
		const map = new Map<S, T>(this._map.entries());
		map.delete(key);
		return new HashMap<S, T>(...map.entries());
	}

	withEntries(...pairs: Array<[S, T]>): HashMap<S, T> {
		return new HashMap<S, T>(...this._map.entries(), ...pairs);
	}

	withoutEntries(...keys: S[]): HashMap<S, T> {
		const map = new Map<S, T>(this._map.entries());
		for (const k of keys) {
			map.delete(k);
		}

		return new HashMap<S, T>(...map.entries());
	}

	map<U>(f: (x: T) => U): HashMap<S, U> {
		const newPairs: Array<[S, U]> = [];
		for (const [k, v] of this._map.entries()) {
			newPairs.push([k, f(v)]);
		}

		return new HashMap<S, U>(...newPairs);
	}

	apply<U>(f: MonadicHashMap<S, (x: T) => U>): MonadicHashMap<S, U> {
		const newPairs: Array<[S, U]> = [];
		for (const [k, v] of this._map.entries()) {
			const func = f.get(k);
			func.match(
				f => newPairs.push([k, f(v)]),
				HashMap.emptyFunction,
			);
		}

		return new HashMap<S, U>(...newPairs);
	}

	pure<U>(x: U): HashMap<number, U> {
		return new HashMap<number, U>([0, x]);
	}

	flatMap<U>(f: (x: T) => HashMap<S, U>): HashMap<S, U[]> {
		const newPairs: Array<[S, U[]]> = [];
		for (const [k, v] of this._map.entries()) {
			const map = f(v);
			const allMapValues = map.getAsMap().values();
			newPairs.push([k, Array.from(allMapValues)]);
		}

		return new HashMap<S, U[]>(...newPairs);
	}

	concat(other: MonadicHashMap<S, T>): HashMap<S, T> {
		const newMap = new Map<S, T>(this._map.entries());
		for (const [k, v] of other.entries()) {
			newMap.set(k, v);
		}

		return new HashMap<S, T>(...newMap.entries());
	}

	zip<U>(other: MonadicHashMap<S, U>): HashMap<S, [T, U]> {
		const newPairs: Array<[S, [T, U]]> = [];
		for (const [k, v] of this._map.entries()) {
			const otherOpt = other.get(k);
			otherOpt.match(
				otherValue => newPairs.push([k, [v, otherValue]]),
				HashMap.emptyFunction,
			);
		}

		return new HashMap<S, [T, U]>(...newPairs);
	}

	zipWithAllValues<U>(other: MonadicHashMap<S, U>): HashMap<S, Map<string, T | U>> {
		const newPairs: Array<[S, Map<string, T | U>]> = [];
		const allKeys = new Set([...this._map.keys(), ...other.getAsMap().keys()]);
		for (const k of allKeys) {
			const thisOpt = this.get(k);
			const otherOpt = other.get(k);
			const newMap = new Map<string, T | U>();
			thisOpt.match(
				thisValue => newMap.set('this', thisValue),
				() => { /* do nothing */ },
			);
			otherOpt.match(
				otherValue => newMap.set('other', otherValue),
				() => { /* do nothing */ },
			);

			newPairs.push([k, newMap]);
		}

		return new HashMap<S, Map<string, T | U>>(...newPairs);
	}

	zip2<U, V>(o1: MonadicHashMap<S, U>, o2: MonadicHashMap<S, V>): HashMap<S, [T, U, V]> {
		const newPairs: Array<[S, [T, U, V]]> = [];
		for (const [k, v] of this._map.entries()) {
			const otherOpt = o1.get(k);
			const otherOpt2 = o2.get(k);
			otherOpt.match(
				otherValue => {
					otherOpt2.match(
						otherValue2 => newPairs.push([k, [v, otherValue, otherValue2]]),
						HashMap.emptyFunction,
					);
				},
				HashMap.emptyFunction,
			);
		}

		return new HashMap<S, [T, U, V]>(...newPairs);
	}

	zip2WithAllValues<U, V>(o1: MonadicHashMap<S, U>, o2: MonadicHashMap<S, V>): HashMap<S, Map<string, T | U | V>> {
		const newPairs: Array<[S, Map<string, T | U | V>]> = [];
		const allKeys = [...this._map.keys(), ...o1.keys(), ...o2.keys()];

		for (const key of allKeys) {
			const thisValue = this.get(key);
			const o1Value = o1.get(key);
			const o2Value = o2.get(key);

			const entryToAdd = new Map<string, T | U | V>();

			thisValue.match(
				thisValue => entryToAdd.set('V', thisValue),
				HashMap.emptyFunction,
			);

			o1Value.match(
				o1Value => entryToAdd.set('U', o1Value),
				HashMap.emptyFunction,
			);

			o2Value.match(
				o2Value => entryToAdd.set('W', o2Value),
				HashMap.emptyFunction,
			);
			newPairs.push([key, entryToAdd]);
		}

		return new HashMap<S, Map<string, T | U | V>>(...newPairs);
	}

	zip3<U, V, W>(o1: MonadicHashMap<S, U>, o2: MonadicHashMap<S, V>, o3: MonadicHashMap<S, W>): HashMap<S, [T, U, V, W]> {
		const newPairs: Array<[S, [T, U, V, W]]> = [];
		for (const [k, v] of this._map.entries()) {
			const otherOpt = o1.get(k);
			const otherOpt2 = o2.get(k);
			const otherOpt3 = o3.get(k);
			otherOpt.match(
				otherValue => {
					otherOpt2.match(
						otherValue2 => {
							otherOpt3.match(
								otherValue3 => newPairs.push([k, [v, otherValue, otherValue2, otherValue3]]),
								HashMap.emptyFunction,
							);
						},
						HashMap.emptyFunction,
					);
				},
				HashMap.emptyFunction,
			);
		}

		return new HashMap<S, [T, U, V, W]>(...newPairs);
	}

	zip3WithAllValues<U, V, W>(
		o1: MonadicHashMap<S, U>,
		o2: MonadicHashMap<S, V>,
		o3: MonadicHashMap<S, W>,
	): HashMap<S, Map<string, T | U | V | W>> {
		const newPairs: Array<[S, Map<string, T | U | V | W>]> = [];
		const allKeys = [...this._map.keys(), ...o1.keys(), ...o2.keys(), ...o3.keys()];
		for (const key of allKeys) {
			const thisValue = this.get(key);
			const o1Value = o1.get(key);
			const o2Value = o2.get(key);
			const o3Value = o3.get(key);

			const entryToAdd = new Map<string, T | U | V | W>();
			thisValue.match(
				thisValue => entryToAdd.set('V', thisValue),
				HashMap.emptyFunction,
			);

			o1Value.match(
				o1Value => entryToAdd.set('U', o1Value),
				HashMap.emptyFunction,
			);

			o2Value.match(
				o2Value => entryToAdd.set('W', o2Value),
				HashMap.emptyFunction,
			);

			o3Value.match(
				o3Value => entryToAdd.set('X', o3Value),
				HashMap.emptyFunction,
			);

			newPairs.push([key, entryToAdd]);
		}

		return new HashMap<S, Map<string, T | U | V | W>>(...newPairs);
	}

	zip4<U, V, W, X>(
		o1: MonadicHashMap<S, U>,
		o2: MonadicHashMap<S, V>,
		o3: MonadicHashMap<S, W>,
		o4: MonadicHashMap<S, X>,
	): HashMap<S, [T, U, V, W, X]> {
		const newPairs: Array<[S, [T, U, V, W, X]]> = [];
		for (const [k, v] of this._map.entries()) {
			const otherOpt = o1.get(k);
			const otherOpt2 = o2.get(k);
			const otherOpt3 = o3.get(k);
			const otherOpt4 = o4.get(k);

			otherOpt.match(
				otherValue => {
					otherOpt2.match(
						otherValue2 => {
							otherOpt3.match(
								otherValue3 => {
									otherOpt4.match(
										otherValue4 => newPairs.push([k, [v, otherValue, otherValue2, otherValue3, otherValue4]]),
										HashMap.emptyFunction,
									);
								},
								HashMap.emptyFunction,
							);
						},
						HashMap.emptyFunction,
					);
				},
				HashMap.emptyFunction,
			);
		}

		return new HashMap<S, [T, U, V, W, X]>(...newPairs);
	}

	zip4WithAllValues<U, V, W, X>(
		o1: MonadicHashMap<S, U>,
		o2: MonadicHashMap<S, V>,
		o3: MonadicHashMap<S, W>,
		o4: MonadicHashMap<S, X>,
	): HashMap<S, Map<string, T | U | V | W | X>> {
		const newPairs: Array<[S, Map<string, T | U | V | W | X>]> = [];
		const allKeys = [...this._map.keys(), ...o1.keys(), ...o2.keys(), ...o3.keys(), ...o4.keys()];
		for (const key of allKeys) {
			const thisValue = this.get(key);
			const o1Value = o1.get(key);
			const o2Value = o2.get(key);
			const o3Value = o3.get(key);
			const o4Value = o4.get(key);

			const entryToAdd = new Map<string, T | U | V | W | X>();

			thisValue.match(
				thisValue => entryToAdd.set('V', thisValue),
				HashMap.emptyFunction,
			);

			o1Value.match(
				o1Value => entryToAdd.set('U', o1Value),
				HashMap.emptyFunction,
			);

			o2Value.match(
				o2Value => entryToAdd.set('W', o2Value),
				HashMap.emptyFunction,
			);

			o3Value.match(
				o3Value => entryToAdd.set('X', o3Value),
				HashMap.emptyFunction,
			);

			o4Value.match(
				o4Value => entryToAdd.set('Y', o4Value),
				HashMap.emptyFunction,
			);

			newPairs.push([key, entryToAdd]);
		}

		return new HashMap<S, Map<string, T | U | V | W | X>>(...newPairs);
	}

	zip5<U, V, W, X, Y>(
		o1: MonadicHashMap<S, U>,
		o2: MonadicHashMap<S, V>,
		o3: MonadicHashMap<S, W>,
		o4: MonadicHashMap<S, X>,
		o5: MonadicHashMap<S, Y>,
	): HashMap<S, [T, U, V, W, X, Y]> {
		const newPairs: Array<[S, [T, U, V, W, X, Y]]> = [];
		for (const [k, v] of this._map.entries()) {
			const otherOpt = o1.get(k);
			const otherOpt2 = o2.get(k);
			const otherOpt3 = o3.get(k);
			const otherOpt4 = o4.get(k);
			const otherOpt5 = o5.get(k);

			otherOpt.match(
				otherValue => {
					otherOpt2.match(
						otherValue2 => {
							otherOpt3.match(
								otherValue3 => {
									otherOpt4.match(
										otherValue4 => {
											otherOpt5.match(
												otherValue5 => newPairs.push([k, [v, otherValue, otherValue2, otherValue3, otherValue4, otherValue5]]),
												HashMap.emptyFunction,
											);
										},
										HashMap.emptyFunction,
									);
								},
								HashMap.emptyFunction,
							);
						},
						HashMap.emptyFunction,
					);
				},
				HashMap.emptyFunction,
			);
		}

		return new HashMap<S, [T, U, V, W, X, Y]>(...newPairs);
	}

	zip5WithAllValues<U, V, W, X, Y>(
		o1: MonadicHashMap<S, U>,
		o2: MonadicHashMap<S, V>,
		o3: MonadicHashMap<S, W>,
		o4: MonadicHashMap<S, X>,
		o5: MonadicHashMap<S, Y>,
	): HashMap<S, Map<string, T | U | V | W | X | Y>> {
		const newPairs: Array<[S, Map<string, T | U | V | W | X | Y>]> = [];
		const allKeys = [...this._map.keys(), ...o1.keys(), ...o2.keys(), ...o3.keys(), ...o4.keys(), ...o5.keys()];
		for (const key of allKeys) {
			const thisValue = this.get(key);
			const o1Value = o1.get(key);
			const o2Value = o2.get(key);
			const o3Value = o3.get(key);
			const o4Value = o4.get(key);
			const o5Value = o5.get(key);

			const entryToAdd = new Map<string, T | U | V | W | X | Y>();

			const entrySetter = (key: string, value: Some<T> | Some<U> | Some<V> | Some<W> | Some<X> | Some<Y>) => {
				entryToAdd.set(key, value.getOrThrow(''));
			};

			conditionalDo(thisValue.isSome(), () => {
				entrySetter('T', thisValue as Some<T>);
			});
			conditionalDo(o1Value.isSome(), () => {
				entrySetter('U', o1Value as Some<U>);
			});
			conditionalDo(o2Value.isSome(), () => {
				entrySetter('V', o2Value as Some<V>);
			});
			conditionalDo(o3Value.isSome(), () => {
				entrySetter('W', o3Value as Some<W>);
			});
			conditionalDo(o4Value.isSome(), () => {
				entrySetter('X', o4Value as Some<X>);
			});
			conditionalDo(o5Value.isSome(), () => {
				entrySetter('Y', o5Value as Some<Y>);
			});

			newPairs.push([key, entryToAdd]);
		}

		return new HashMap<S, Map<string, T | U | V | W | X | Y>>(...newPairs);
	}

	zip6<U, V, W, X, Y, Z>(
		o1: MonadicHashMap<S, U>,
		o2: MonadicHashMap<S, V>,
		o3: MonadicHashMap<S, W>,
		o4: MonadicHashMap<S, X>,
		o5: MonadicHashMap<S, Y>,
		o6: MonadicHashMap<S, Z>,
	): HashMap<S, [T, U, V, W, X, Y, Z]> {
		const newPairs: Array<[S, [T, U, V, W, X, Y, Z]]> = [];
		for (const [k, v] of this._map.entries()) {
			const otherOpt = o1.get(k);
			const otherOpt2 = o2.get(k);
			const otherOpt3 = o3.get(k);
			const otherOpt4 = o4.get(k);
			const otherOpt5 = o5.get(k);
			const otherOpt6 = o6.get(k);

			otherOpt.match(
				otherValue => {
					otherOpt2.match(
						otherValue2 => {
							otherOpt3.match(
								otherValue3 => {
									otherOpt4.match(
										otherValue4 => {
											otherOpt5.match(
												otherValue5 => {
													otherOpt6.match(
														otherValue6 => newPairs.push([k, [v, otherValue, otherValue2, otherValue3, otherValue4, otherValue5, otherValue6]]),
														HashMap.emptyFunction,
													);
												},
												HashMap.emptyFunction,
											);
										},
										HashMap.emptyFunction,
									);
								},
								HashMap.emptyFunction,
							);
						},
						HashMap.emptyFunction,
					);
				},
				HashMap.emptyFunction,
			);
		}

		return new HashMap<S, [T, U, V, W, X, Y, Z]>(...newPairs);
	}

	zip6WithAllValues<U, V, W, X, Y, Z>(
		o1: MonadicHashMap<S, U>,
		o2: MonadicHashMap<S, V>,
		o3: MonadicHashMap<S, W>,
		o4: MonadicHashMap<S, X>,
		o5: MonadicHashMap<S, Y>,
		o6: MonadicHashMap<S, Z>,
	): HashMap<S, Map<string, T | U | V | W | X | Y | Z>> {
		const newPairs: Array<[S, Map<string, T | U | V | W | X | Y | Z>]> = [];
		const allKeys = [...this._map.keys(), ...o1.keys(), ...o2.keys(), ...o3.keys(), ...o4.keys(), ...o5.keys(), ...o6.keys()];
		for (const key of allKeys) {
			const thisValue = this.get(key);
			const o1Value = o1.get(key);
			const o2Value = o2.get(key);
			const o3Value = o3.get(key);
			const o4Value = o4.get(key);
			const o5Value = o5.get(key);
			const o6Value = o6.get(key);

			const entryToAdd = new Map<string, T | U | V | W | X | Y | Z>();
			const entrySetter = (key: string, value: Some<T> | Some<U> | Some<V> | Some<W> | Some<X> | Some<Y> | Some<Z>) => {
				entryToAdd.set(key, value.getOrThrow(''));
			};

			conditionalDo(thisValue.isSome(), () => {
				entrySetter('T', thisValue as Some<T>);
			});
			conditionalDo(o1Value.isSome(), () => {
				entrySetter('U', o1Value as Some<U>);
			});
			conditionalDo(o2Value.isSome(), () => {
				entrySetter('V', o2Value as Some<V>);
			});
			conditionalDo(o3Value.isSome(), () => {
				entrySetter('W', o3Value as Some<W>);
			});
			conditionalDo(o4Value.isSome(), () => {
				entrySetter('X', o4Value as Some<X>);
			});
			conditionalDo(o5Value.isSome(), () => {
				entrySetter('Y', o5Value as Some<Y>);
			});
			conditionalDo(o6Value.isSome(), () => {
				entrySetter('Z', o6Value as Some<Z>);
			});

			newPairs.push([key, entryToAdd]);
		}

		return new HashMap<S, Map<string, T | U | V | W | X | Y | Z>>(...newPairs);
	}

	forEach(callbackfn: (value: T, key: S, map: Map<S, T>) => void, thisArg?: any): void {
		for (const entry of this._map) {
			callbackfn(entry[1], entry[0], this._map);
		}
	}

	entries(): IterableIterator<[S, T]> {
		return this._map.entries();
	}

	keys(): IterableIterator<S> {
		return this._map.keys();
	}

	values(): IterableIterator<T> {
		return this._map.values();
	}
}
