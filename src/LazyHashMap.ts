import { QueriedValueNotPresent, Throwable } from "./definitions";
import { Either } from "./Either";
import { HashMap, MonadicHashMap } from "./HashMap";
import { Optional } from "./Optional";
import { Predicate } from "./Predicate";

export interface LazyMonadicHashMap<S, T> extends MonadicHashMap<S, T> {
    filter(p: Predicate<[S, T]>): LazyHashMap<S, T>;
    withEntry(key: S, value: T): LazyHashMap<S, T>;
    withoutEntry(key: S): LazyHashMap<S, T>;
    withEntries(...pairs: [S, T][]): LazyHashMap<S, T>;
    withoutEntries(...keys: S[]): LazyHashMap<S, T>;
    map<U>(f: (x: T) => U): LazyHashMap<S, U>;
    apply<U>(f: HashMap<S, (x: T) => U>): LazyHashMap<S, U>;
    pure<U>(x: U): LazyHashMap<number, U>;
    flatMap<U>(f: (x: T) => HashMap<S, U>): LazyHashMap<S, U[]>;
    concat(other: Map<S, T>): LazyHashMap<S, T>;
    zip<U>(other: HashMap<S, U>): LazyHashMap<S, [T, U]>;
    zipWithAllValues<U>(other: HashMap<S, U>): LazyHashMap<S, Map<string, T|U>>;
    zip2<U, V>(o1: HashMap<S, U>, o2: HashMap<S, V>): LazyHashMap<S, [T, U, V]>;
    zip2WithAllValues<U, V>(o1: HashMap<S, U>, o2: HashMap<S, V>): LazyHashMap<S, Map<string, T|U|V>>;
    zip3<U, V, W>(o1: HashMap<S, U>, o2: HashMap<S, V>, o3: HashMap<S, W>): LazyHashMap<S, [T, U, V, W]>;
    zip3WithAllValues<U, V, W>(
        o1: HashMap<S, U>, 
        o2: HashMap<S, V>, 
        o3: HashMap<S, W>
    ): LazyHashMap<S, Map<string, T|U|V|W>>;
    zip4<U, V, W, X>(
        o1: HashMap<S, U>,
        o2: HashMap<S, V>,
        o3: HashMap<S, W>,
        o4: HashMap<S, X>
    ): LazyHashMap<S, [T, U, V, W, X]>;
    zip4WithAllValues<U, V, W, X>(
        o1: HashMap<S, U>,
        o2: HashMap<S, V>,
        o3: HashMap<S, W>,
        o4: HashMap<S, X>
    ): LazyHashMap<S, Map<string, T|U|V|W|X>>;
    zip5<U, V, W, X, Y>(
        o1: HashMap<S, U>,
        o2: HashMap<S, V>,
        o3: HashMap<S, W>,
        o4: HashMap<S, X>,
        o5: HashMap<S, Y>
    ): LazyHashMap<S, [T, U, V, W, X, Y]>;
    zip5WithAllValues<U, V, W, X, Y>(
        o1: HashMap<S, U>,
        o2: HashMap<S, V>,
        o3: HashMap<S, W>,
        o4: HashMap<S, X>,
        o5: HashMap<S, Y>
    ): LazyHashMap<S, Map<string, T|U|V|W|X|Y>>;
    zip6<U, V, W, X, Y, Z>(
        o1: HashMap<S, U>,
        o2: HashMap<S, V>,
        o3: HashMap<S, W>,
        o4: HashMap<S, X>,
        o5: HashMap<S, Y>,
        o6: HashMap<S, Z>
    ): LazyHashMap<S, [T, U, V, W, X, Y, Z]>;
    zip6WithAllValues<U, V, W, X, Y, Z>(
        o1: HashMap<S, U>,
        o2: HashMap<S, V>,
        o3: HashMap<S, W>,
        o4: HashMap<S, X>,
        o5: HashMap<S, Y>,
        o6: HashMap<S, Z>
    ): LazyHashMap<S, Map<string, T|U|V|W|X|Y|Z>>;
}

export class LazyHashMap<S, T> extends HashMap<S, T> {
    private resolved: null|HashMap<S, T> = null;
    constructor(private readonly f: () => Map<S, T>) {
        super();
    }

    protected getResolved(): HashMap<S, T> {
        if (this.resolved === null) {
            this.resolved = new HashMap<S, T>(...this.f().entries());
        }
        return this.resolved!;
    }

    
    filter(p: Predicate<[S, T]>): LazyHashMap<S, T> {
        return new LazyHashMap<S, T>(() => this.getResolved().filter(p).getAsMap());
    }

    every(p: Predicate<[S, T]>): boolean {
        return this.getResolved().every(p);
    }

    some(p: Predicate<[S, T]>): boolean {
        return this.getResolved().some(p);
    }

    none(p: Predicate<[S, T]>): boolean {
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

    getOrThrow(key: S, t: Throwable = HashMap.DEFAULT_ERROR_MESSAGE): T {
        return this.getResolved().getOrThrow(key, t);
    }

    getOrQueriedValueNotPresent(key: S, msg?: string): Either<QueriedValueNotPresent, T> {
        return this.getResolved().getOrQueriedValueNotPresent(key, msg);
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

    withEntries(...pairs: [S, T][]): LazyHashMap<S, T> {
        return new LazyHashMap<S, T>(() => this.getResolved().withEntries(...pairs).getAsMap());
    }

    withoutEntries(...keys: S[]): LazyHashMap<S, T> {
        return new LazyHashMap<S, T>(() => this.getResolved().withoutEntries(...keys).getAsMap());
    }

    map<U>(f: (x: T) => U): LazyHashMap<S, U> {
        return new LazyHashMap<S, U>(() => this.getResolved().map(f).getAsMap());
    }

    apply<U>(f: HashMap<S, (x: T) => U>): LazyHashMap<S, U> {
        return new LazyHashMap<S, U>(() => this.getResolved().apply(f).getAsMap());
    }

    pure<U>(x: U): LazyHashMap<number, U> {
        return new LazyHashMap<number, U>(() => new Map<number, U>([[0, x] as [number, U]]));
    }

    flatMap<U>(f: (x: T) => HashMap<S, U>): LazyHashMap<S, U[]> {
        return new LazyHashMap<S, U[]>(() => this.getResolved().flatMap(f).getAsMap());
    }

    concat(other: Map<S, T>): LazyHashMap<S, T> {
        return new LazyHashMap<S, T>(() => this.getResolved().concat(other).getAsMap());
    }

    zip<U>(other: HashMap<S, U>): LazyHashMap<S, [T, U]> {
        return new LazyHashMap<S, [T, U]>(() => this.getResolved().zip(other).getAsMap());
    }

    zipWithAllValues<U>(other: HashMap<S, U>): LazyHashMap<S, Map<string, T|U>> {
        return new LazyHashMap<S, Map<string, T|U>>(() => this.getResolved().zipWithAllValues(other).getAsMap());
    }

    zip2<U, V>(o1: HashMap<S, U>, o2: HashMap<S, V>): LazyHashMap<S, [T, U, V]> {
        return new LazyHashMap<S, [T, U, V]>(() => this.getResolved().zip2(o1, o2).getAsMap());
    }

    zip2WithAllValues<U, V>(o1: HashMap<S, U>, o2: HashMap<S, V>): LazyHashMap<S, Map<string, T|U|V>> {
        return new LazyHashMap<S, Map<string, T|U|V>>(() => this.getResolved().zip2WithAllValues(o1, o2).getAsMap());
    }

    zip3<U, V, W>(o1: HashMap<S, U>, o2: HashMap<S, V>, o3: HashMap<S, W>): LazyHashMap<S, [T, U, V, W]> {
        return new LazyHashMap<S, [T, U, V, W]>(() => this.getResolved().zip3(o1, o2, o3).getAsMap());
    }

    zip3WithAllValues<U, V, W>(
        o1: HashMap<S, U>, 
        o2: HashMap<S, V>, 
        o3: HashMap<S, W>
    ): LazyHashMap<S, Map<string, T|U|V|W>> {
        return new LazyHashMap<S, Map<string, T|U|V|W>>(() => this.getResolved().zip3WithAllValues(o1, o2, o3).getAsMap());
    }

    zip4<U, V, W, X>(
        o1: HashMap<S, U>,
        o2: HashMap<S, V>,
        o3: HashMap<S, W>,
        o4: HashMap<S, X>
    ): LazyHashMap<S, [T, U, V, W, X]> {
        return new LazyHashMap<S, [T, U, V, W, X]>(() => this.getResolved().zip4(o1, o2, o3, o4).getAsMap());
    }

    zip4WithAllValues<U, V, W, X>(
        o1: HashMap<S, U>,
        o2: HashMap<S, V>,
        o3: HashMap<S, W>,
        o4: HashMap<S, X>
    ): LazyHashMap<S, Map<string, T|U|V|W|X>> {
        return new LazyHashMap<S, Map<string, T|U|V|W|X>>(() => this.getResolved().zip4WithAllValues(o1, o2, o3, o4).getAsMap());
    }

    zip5<U, V, W, X, Y>(
        o1: HashMap<S, U>,
        o2: HashMap<S, V>,
        o3: HashMap<S, W>,
        o4: HashMap<S, X>,
        o5: HashMap<S, Y>
    ): LazyHashMap<S, [T, U, V, W, X, Y]> {
        return new LazyHashMap<S, [T, U, V, W, X, Y]>(() => this.getResolved().zip5(o1, o2, o3, o4, o5).getAsMap());
    }

    zip5WithAllValues<U, V, W, X, Y>(
        o1: HashMap<S, U>,
        o2: HashMap<S, V>,
        o3: HashMap<S, W>,
        o4: HashMap<S, X>,
        o5: HashMap<S, Y>
    ): LazyHashMap<S, Map<string, T|U|V|W|X|Y>> {
        return new LazyHashMap<S, Map<string, T|U|V|W|X|Y>>(() => this.getResolved().zip5WithAllValues(o1, o2, o3, o4, o5).getAsMap());
    }

    zip6<U, V, W, X, Y, Z>(
        o1: HashMap<S, U>,
        o2: HashMap<S, V>,
        o3: HashMap<S, W>,
        o4: HashMap<S, X>,
        o5: HashMap<S, Y>,
        o6: HashMap<S, Z>
    ): LazyHashMap<S, [T, U, V, W, X, Y, Z]> {
        return new LazyHashMap<S, [T, U, V, W, X, Y, Z]>(() => this.getResolved().zip6(o1, o2, o3, o4, o5, o6).getAsMap());
    }

    zip6WithAllValues<U, V, W, X, Y, Z>(
        o1: HashMap<S, U>,
        o2: HashMap<S, V>,
        o3: HashMap<S, W>,
        o4: HashMap<S, X>,
        o5: HashMap<S, Y>,
        o6: HashMap<S, Z>
    ): LazyHashMap<S, Map<string, T|U|V|W|X|Y|Z>> {
        return new LazyHashMap<S, Map<string, T|U|V|W|X|Y|Z>>(() => this.getResolved().zip6WithAllValues(o1, o2, o3, o4, o5, o6).getAsMap());
    }

    forEach(callbackfn: (value: T, key: S, map: Map<S, T>) => void, thisArg?: any): void {
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

}
