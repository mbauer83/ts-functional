import {QueriedValueNotPresent, type Throwable} from './definitions.js';
import {type Either, Left, Right} from './Either.js';
import {HashMap} from './HashMap.js';
import {type Optional} from './Optional.js';
import {type PredicateOrFn} from './Predicate.js';

export class LazyHashMap<S extends string | number | symbol, T> extends HashMap<S, T> {
	protected static readonly defaultErrorMessage = (key: string) => `LazyHashMap::getOrThrow - Unknown key [${key}].`;
	protected readonly lazyEmpty: LazyHashMap<S, T> = new LazyHashMap<S, T>(() => new Map<S, T>());
	private resolved: undefined | HashMap<S, T> = undefined;

	constructor(private readonly f: () => Map<S, T>) {
		super();
	}

	readonly op: (l: HashMap<S, T>, r: HashMap<S, T>) => HashMap<S, T> = (l, r) => l.concat(r);

	id(): LazyHashMap<S, T> {
		return this.lazyEmpty;
	}

	filter(p: PredicateOrFn<[S, T]>): LazyHashMap<S, T> {
		// `p` is a predicate, and this custom method takes only predicates
		// eslint-disable-next-line unicorn/no-array-callback-reference
		return new LazyHashMap<S, T>(() => this.getResolved().filter(p).getAsMap());
	}

	every(p: PredicateOrFn<[S, T]>): boolean {
		// `p` is a predicate, and this custom method takes only predicates
		// eslint-disable-next-line unicorn/no-array-callback-reference
		return this.getResolved().every(p);
	}

	some(p: PredicateOrFn<[S, T]>): boolean {
		// `p` is a predicate, and this custom method takes only predicates
		// eslint-disable-next-line unicorn/no-array-callback-reference
		return this.getResolved().some(p);
	}

	none(p: PredicateOrFn<[S, T]>): boolean {
		return this.getResolved().none(p);
	}

	[Symbol.iterator](): Iterator<[S, T]> {
		return this.getResolved()[Symbol.iterator]();
	}

	getAsMap(): Map<S, T> {
		return this.getResolved().getAsMap();
	}

	getSize(): number {
		return this.getResolved().getSize();
	}

	has(key: S): boolean {
		return this.getResolved().has(key);
	}

	getOrElse(key: S, defaultValue: T): T {
		return this.getResolved().getOrElse(key, defaultValue);
	}

	getOrThrow(key: S, t: Throwable = LazyHashMap.defaultErrorMessage): T {
		return this.getResolved().getOrThrow(key, t);
	}

	getOrQueriedValueNotPresent(key: S, message?: string): Either<QueriedValueNotPresent, T> {
		const resolved = this.getResolved();
		const value = resolved.getAsMap().get(key);
		return value
			? new Right<QueriedValueNotPresent, T>(value)
			: new Left<QueriedValueNotPresent, T>(new QueriedValueNotPresent(message ?? `LazyHashMap::getOrQueriedValueNotPresent(${key as string})`));
	}

	get(key: S): Optional<T> {
		return this.getResolved().get(key);
	}

	withEntry(key: S, value: T): LazyHashMap<S, T> {
		return new LazyHashMap<S, T>(() => this.getResolved().withEntry(key, value).getAsMap());
	}

	withoutEntry(key: S): LazyHashMap<S, T> {
		return new LazyHashMap<S, T>(() => this.getResolved().withoutEntry(key).getAsMap());
	}

	withEntries(...pairs: Array<[S, T]>): LazyHashMap<S, T> {
		return new LazyHashMap<S, T>(() => this.getResolved().withEntries(...pairs).getAsMap());
	}

	withoutEntries(...keys: S[]): LazyHashMap<S, T> {
		return new LazyHashMap<S, T>(() => this.getResolved().withoutEntries(...keys).getAsMap());
	}

	map<U>(f: (x: T) => U): LazyHashMap<S, U> {
		return new LazyHashMap<S, U>(() => this.getResolved().map(t => f(t)).getAsMap());
	}

	apply<U>(f: HashMap<S, (x: T) => U>): LazyHashMap<S, U> {
		// Linting doesn't work unless we do this with a for loop
		const resolver = () => {
			const resolved = this.getResolved();
			const resolvedF = f.getAsMap();
			const result = new Map<S, U>();
			for (const [key, value] of resolved.entries()) {
				const f = resolvedF.get(key);
				if (f !== undefined) {
					result.set(key, f(value));
				}
			}

			return result;
		};

		return new LazyHashMap<S, U>(resolver);
	}

	pure<U>(x: U): LazyHashMap<number, U> {
		return new LazyHashMap<number, U>(() => new Map<number, U>([[0, x] as [number, U]]));
	}

	flatMap<U>(f: (x: T) => HashMap<S, U>): LazyHashMap<S, U[]> {
		const resolver = () => {
			const resolved = this.getResolved();
			return resolved.flatMap<U>(t => f(t)).getAsMap();
		};

		return new LazyHashMap<S, U[]>(resolver);
	}

	concat(other: HashMap<S, T>): LazyHashMap<S, T> {
		return new LazyHashMap<S, T>(() => this.getResolved().concat(other).getAsMap());
	}

	zip<U>(other: HashMap<S, U>): LazyHashMap<S, [T, U]> {
		const resolver = () => {
			const resolved = this.getResolved();
			const zipped = resolved.zip<U>(other).getAsMap();
			return zipped;
		};

		return new LazyHashMap<S, [T, U]>(resolver);
	}

	zipWithAllValues<U>(other: HashMap<S, U>): LazyHashMap<S, Map<string, T | U>> {
		const resolver = () => {
			const resolved = this.getResolved();
			const zipped = resolved.zipWithAllValues<U>(other).getAsMap();
			return zipped;
		};

		return new LazyHashMap<S, Map<string, T | U>>(resolver);
	}

	zip2<U, V>(o1: HashMap<S, U>, o2: HashMap<S, V>): LazyHashMap<S, [T, U, V]> {
		return new LazyHashMap<S, [T, U, V]>(() => this.getResolved().zip2<U, V>(o1, o2).getAsMap());
	}

	zip2WithAllValues<U, V>(o1: HashMap<S, U>, o2: HashMap<S, V>): LazyHashMap<S, Map<string, T | U | V>> {
		return new LazyHashMap<S, Map<string, T | U | V>>(() => this.getResolved().zip2WithAllValues<U, V>(o1, o2).getAsMap());
	}

	zip3<U, V, W>(o1: HashMap<S, U>, o2: HashMap<S, V>, o3: HashMap<S, W>): LazyHashMap<S, [T, U, V, W]> {
		return new LazyHashMap<S, [T, U, V, W]>(() => this.getResolved().zip3<U, V, W>(o1, o2, o3).getAsMap());
	}

	zip3WithAllValues<U, V, W>(
		o1: HashMap<S, U>,
		o2: HashMap<S, V>,
		o3: HashMap<S, W>,
	): LazyHashMap<S, Map<string, T | U | V | W>> {
		return new LazyHashMap<S, Map<string, T | U | V | W>>(() => this.getResolved().zip3WithAllValues<U, V, W>(o1, o2, o3).getAsMap());
	}

	zip4<U, V, W, X>(
		o1: HashMap<S, U>,
		o2: HashMap<S, V>,
		o3: HashMap<S, W>,
		o4: HashMap<S, X>,
	): LazyHashMap<S, [T, U, V, W, X]> {
		return new LazyHashMap<S, [T, U, V, W, X]>(() => this.getResolved().zip4<U, V, W, X>(o1, o2, o3, o4).getAsMap());
	}

	zip4WithAllValues<U, V, W, X>(
		o1: HashMap<S, U>,
		o2: HashMap<S, V>,
		o3: HashMap<S, W>,
		o4: HashMap<S, X>,
	): LazyHashMap<S, Map<string, T | U | V | W | X>> {
		return new LazyHashMap<S, Map<string, T | U | V | W | X>>(() => this.getResolved().zip4WithAllValues<U, V, W, X>(o1, o2, o3, o4).getAsMap());
	}

	zip5<U, V, W, X, Y>(
		o1: HashMap<S, U>,
		o2: HashMap<S, V>,
		o3: HashMap<S, W>,
		o4: HashMap<S, X>,
		o5: HashMap<S, Y>,
	): LazyHashMap<S, [T, U, V, W, X, Y]> {
		return new LazyHashMap<S, [T, U, V, W, X, Y]>(() => this.getResolved().zip5<U, V, W, X, Y>(o1, o2, o3, o4, o5).getAsMap());
	}

	zip5WithAllValues<U, V, W, X, Y>(
		o1: HashMap<S, U>,
		o2: HashMap<S, V>,
		o3: HashMap<S, W>,
		o4: HashMap<S, X>,
		o5: HashMap<S, Y>,
	): LazyHashMap<S, Map<string, T | U | V | W | X | Y>> {
		return new LazyHashMap<S, Map<string, T | U | V | W | X | Y>>(() => this.getResolved().zip5WithAllValues<U, V, W, X, Y>(o1, o2, o3, o4, o5).getAsMap());
	}

	zip6<U, V, W, X, Y, Z>(
		o1: HashMap<S, U>,
		o2: HashMap<S, V>,
		o3: HashMap<S, W>,
		o4: HashMap<S, X>,
		o5: HashMap<S, Y>,
		o6: HashMap<S, Z>,
	): LazyHashMap<S, [T, U, V, W, X, Y, Z]> {
		return new LazyHashMap<S, [T, U, V, W, X, Y, Z]>(() => this.getResolved().zip6<U, V, W, X, Y, Z>(o1, o2, o3, o4, o5, o6).getAsMap());
	}

	zip6WithAllValues<U, V, W, X, Y, Z>(
		o1: HashMap<S, U>,
		o2: HashMap<S, V>,
		o3: HashMap<S, W>,
		o4: HashMap<S, X>,
		o5: HashMap<S, Y>,
		o6: HashMap<S, Z>,
	): LazyHashMap<S, Map<string, T | U | V | W | X | Y | Z>> {
		return new LazyHashMap<S, Map<string, T | U | V | W | X | Y | Z>>(() => this.getResolved().zip6WithAllValues<U, V, W, X, Y, Z>(o1, o2, o3, o4, o5, o6).getAsMap());
	}

	forEach(callbackfn: (value: T, key: S, map: Map<S, T>) => void, thisArg?: any): void {
		// `forEach` here is a custom method
		// eslint-disable-next-line unicorn/no-array-for-each, unicorn/no-array-callback-reference, unicorn/no-array-method-this-argument
		this.getResolved().forEach(callbackfn, thisArg);
	}

	entries(): IterableIterator<[S, T]> {
		return this.getResolved().entries();
	}

	keys(): IterableIterator<S> {
		return this.getResolved().keys();
	}

	values(): IterableIterator<T> {
		return this.getResolved().values();
	}

	protected getResolved(): HashMap<S, T> {
		if (this.resolved === undefined) {
			this.resolved = new HashMap<S, T>(...this.f().entries());
		}

		return this.resolved;
	}
}
