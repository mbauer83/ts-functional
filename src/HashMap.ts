import { conditionalDo } from '@mbauer83/ts-utils';
import { HasCount } from '@mbauer83/ts-utils/src/size/HasCount';
import { QueriedValueNotPresent, Throwable } from "./definitions";
import { Either, Left, Right } from "./Either";
import { everyFilterable, Filterable, noneFilterable, someFilterable } from "./Filterable";
import { Monad } from "./Monad";
import { Monoid } from "./Monoid";
import { None, Optional, Some } from "./Optional";
import { Predicate } from "./Predicate";

export interface MonadicHashMap<S, T> extends Monad<T>, Monoid<Map<S, T>>, Filterable<[S, T]>, HasCount {
    map<U>(f: (t: T) => U): MonadicHashMap<S, U>;
    pure<U>(x: U): MonadicHashMap<number, U>;
    apply<U>(f: MonadicHashMap<S, (t: T) => U>): MonadicHashMap<S, U>;
    zip<U>(other: MonadicHashMap<S, U>): MonadicHashMap<S, [T, U]>;
    flatMap<U>(f: (t: T) => MonadicHashMap<S, U>): MonadicHashMap<S, U>;
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
    withEntries(...pairs: [S, T][]): MonadicHashMap<S, T>;
    withoutEntry(key: S): MonadicHashMap<S, T>;
    withoutEntries(...keys: S[]): MonadicHashMap<S, T>;
    concat(other: Map<S, T>): MonadicHashMap<S, T>;
    entries(): IterableIterator<[S, T]>;
    keys(): IterableIterator<S>;
    values(): IterableIterator<T>;
    forEach(callbackFn: (value: T, key: S, map: Map<S, T>) => void, thisArg?: any): void;
}

export class HashMap<S, T> implements MonadicHashMap<S, T> {
    protected static readonly DEFAULT_ERROR_MESSAGE = (key: string) => `MonadicHashMap::getOrThrow - Unknown key [${key}].`;
    protected readonly _map: Map<S, T> = new Map<S, T>();
    constructor(...pairs: [S, T][]) {
        pairs.forEach(([k, v]) => this._map.set(k, v));
    }

    filter(p: Predicate<[S, T]>): HashMap<S, T> {
        let filtered = new HashMap<S, T>();
        this._map.forEach((v, k) => {
            if (p.evaluate([k, v])) {
                filtered = filtered.withEntry(k, v);
            }
        });
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
        return this._map.get(key) || defaultValue;
    }

    getOrThrow(key: S, t: Throwable = HashMap.DEFAULT_ERROR_MESSAGE): T {
        const val = this._map.get(key);
        if (val) {
            return val;
        }

        if (typeof t === 'function') {
            t = t(key);
        }

        if (typeof t === 'string') {
            throw new Error(t);
        }

        throw t; 
    }

    getOrQueriedValueNotPresent(key: S, msg?: string): Either<QueriedValueNotPresent, T> {
        const val = this._map.get(key);
        return val ? 
            new Right<QueriedValueNotPresent, T>(val) : 
            new Left<QueriedValueNotPresent, T>(new QueriedValueNotPresent(msg ?? `MonadicHashMap::getOrQueriedValueNotPresent(${key})`));
    }

    get(key: S): Optional<T> {
        const val = this._map.get(key);
        return val ? new Some<T>(val) : new None<T>();
    }

    withEntry(key: S, value: T): HashMap<S, T> {
        return new HashMap<S, T>(...this._map.entries(), [key, value]);
    }

    withoutEntry(key: S): HashMap<S, T> {
        const map = new Map<S, T>(this._map.entries());
        map.delete(key);
        return new HashMap<S, T>(...map.entries());
    }

    withEntries(...pairs: [S, T][]): HashMap<S, T> {
        return new HashMap<S, T>(...this._map.entries(), ...pairs);
    }

    withoutEntries(...keys: S[]): HashMap<S, T> {
        const map = new Map<S, T>(this._map.entries());
        keys.forEach(k => map.delete(k));
        return new HashMap<S, T>(...map.entries());
    }

    id(): Map<S, T> {
        return new Map();
    }

    map<U>(f: (x: T) => U): HashMap<S, U> {
        const newPairs: [S, U][] = [];
        this._map.forEach((v, k) => newPairs.push([k, f(v)]));
        return new HashMap<S, U>(...newPairs);
    }

    apply<U>(f: MonadicHashMap<S, (x: T) => U>): MonadicHashMap<S, U> {
        const newPairs: [S, U][] = [];
        this._map.forEach((v, k) => {
            const func = f.get(k);
            if (func.isSome()) {
                newPairs.push([k, func.getOrThrow('')(v)]);
            }
        });
        return new HashMap<S, U>(...newPairs);
    }

    pure<U>(x: U): HashMap<number, U> {
        return new HashMap<number, U>([0, x]);
    }

    flatMap<U>(f: (x: T) => HashMap<S, U>): HashMap<S, U[]> {
        const newPairs: [S, U[]][] = [];
        this._map.forEach((v, k) => {
            const map = f(v);
            const allMapValues = map.getAsMap().values();
            newPairs.push([k, Array.from(allMapValues)]);
        });
        return new HashMap<S, U[]>(...newPairs);
    }

    concat(other: Map<S, T>): HashMap<S, T> {
        const newMap = new Map<S, T>(this._map.entries());
        other.forEach((v, k) => newMap.set(k, v));
        return new HashMap<S, T>(...newMap.entries());
    }

    op: (l: Map<S, T>, r: Map<S, T>) => Map<S, T> = (l, r) => new Map([...l, ...r]);

    zip<U>(other: HashMap<S, U>): HashMap<S, [T, U]> {
        const newPairs: [S, [T, U]][] = [];
        this._map.forEach((v, k) => {
            const otherOpt = other.get(k);
            if (otherOpt.isSome()) {
                newPairs.push([k, [v, otherOpt.getOrThrow('')]]);
            }
        });
        return new HashMap<S, [T, U]>(...newPairs);
    }

    zipWithAllValues<U>(other: HashMap<S, U>): HashMap<S, Map<string, T|U>> {
        const newPairs: [S, Map<string, T|U>][] = [];
        const allKeys = new Set([...this._map.keys(), ...other._map.keys()]);
        allKeys.forEach(k => {
            const thisOpt = this.get(k);
            const otherOpt = other.get(k);
            const newMap = new Map<string, T|U>();
            if (thisOpt.isSome()) {
                newMap.set('this', thisOpt.getOrThrow(''));
            }
            if (otherOpt.isSome()) {
                newMap.set('other', otherOpt.getOrThrow(''));
            }
            newPairs.push([k, newMap]);
        });
        return new HashMap<S, Map<string, T|U>>(...newPairs);
    }


    zip2<U, V>(o1: HashMap<S, U>, o2: HashMap<S, V>): HashMap<S, [T, U, V]> {
        const newPairs: [S, [T, U, V]][] = [];
        this._map.forEach((v, k) => {
            const otherOpt = o1.get(k);
            const otherOpt2 = o2.get(k);
            if (otherOpt.isSome() && otherOpt2.isSome()) {
                newPairs.push([k, [v, otherOpt.getOrThrow(''), otherOpt2.getOrThrow('')]]);
            }
        });
        return new HashMap<S, [T, U, V]>(...newPairs);
    }

    zip2WithAllValues<U, V>(o1: HashMap<S, U>, o2: HashMap<S, V>): HashMap<S, Map<string, T|U|V>> {
        const newPairs: [S,Map<string, T|U|V>][] = [];
        const allKeys = [...this._map.keys() ,...o1.keys(), ...o2.keys()]

        for (const key of allKeys) {
            const thisVal = this.get(key);
            const o1Val = o1.get(key);
            const o2Val = o2.get(key);

            const entryToAdd: Map<string, T|U|V> = new Map();
            if (thisVal.isSome()) {
                entryToAdd.set('V', thisVal.getOrThrow(''))
            }
            if (o1Val.isSome()) {
                entryToAdd.set('U', o1Val.getOrThrow(''))
            }
            if (o2Val.isSome()) {
                entryToAdd.set('W', o2Val.getOrThrow(''))
            }
            newPairs.push([key, entryToAdd]);
        }
        return new HashMap<S, Map<string, T|U|V>>(...newPairs);
    }

    zip3<U, V, W>(o1: HashMap<S, U>, o2: HashMap<S, V>, o3: HashMap<S, W>): HashMap<S, [T, U, V, W]> {
        const newPairs: [S, [T, U, V, W]][] = [];
        this._map.forEach((v, k) => {
            const otherOpt = o1.get(k);
            const otherOpt2 = o2.get(k);
            const otherOpt3 = o3.get(k);
            if (otherOpt.isSome() && otherOpt2.isSome() && otherOpt3.isSome()) {
                newPairs.push([k, [v, otherOpt.getOrThrow(''), otherOpt2.getOrThrow(''), otherOpt3.getOrThrow('')]]);
            }
        });
        return new HashMap<S, [T, U, V, W]>(...newPairs);
    }

    zip3WithAllValues<U, V, W>(
        o1: HashMap<S, U>, 
        o2: HashMap<S, V>, 
        o3: HashMap<S, W>
    ): HashMap<S, Map<string, T|U|V|W>> {
        const newPairs: [S,Map<string, T|U|V|W>][] = [];
        const allKeys = [...this._map.keys() ,...o1.keys(), ...o2.keys(), ...o3.keys()]
        for (const key of allKeys) {
            const thisVal = this.get(key);
            const o1Val = o1.get(key);
            const o2Val = o2.get(key);
            const o3Val = o3.get(key);
            
            const entryToAdd: Map<string, T|U|V|W> = new Map();
            if (thisVal.isSome()) {
                entryToAdd.set('V', thisVal.getOrThrow(''))
            }
            if (o1Val.isSome()) {
                entryToAdd.set('U', o1Val.getOrThrow(''))
            }
            if (o2Val.isSome()) {
                entryToAdd.set('W', o2Val.getOrThrow(''))
            }
            if (o3Val.isSome()) {
                entryToAdd.set('X', o3Val.getOrThrow(''))
            }
            newPairs.push([key, entryToAdd]);
        }
        return new HashMap<S, Map<string, T|U|V|W>>(...newPairs);
    }

    zip4<U, V, W, X>(
        o1: HashMap<S, U>,
        o2: HashMap<S, V>,
        o3: HashMap<S, W>,
        o4: HashMap<S, X>
    ): HashMap<S, [T, U, V, W, X]> {
        const newPairs: [S, [T, U, V, W, X]][] = [];
        this._map.forEach((v, k) => {
            const otherOpt = o1.get(k);
            const otherOpt2 = o2.get(k);
            const otherOpt3 = o3.get(k);
            const otherOpt4 = o4.get(k);
            if (
                otherOpt.isSome() && 
                otherOpt2.isSome() && 
                otherOpt3.isSome() && 
                otherOpt4.isSome()
            ) {
                newPairs.push(
                    [
                        k, 
                        [
                            v, 
                            otherOpt.getOrThrow(''), 
                            otherOpt2.getOrThrow(''), 
                            otherOpt3.getOrThrow(''), 
                            otherOpt4.getOrThrow('')
                        ]
                    ]
                );
            }
        });
        return new HashMap<S, [T, U, V, W, X]>(...newPairs);
    }

    zip4WithAllValues<U, V, W, X>(
        o1: HashMap<S, U>,
        o2: HashMap<S, V>,
        o3: HashMap<S, W>,
        o4: HashMap<S, X>
    ): HashMap<S, Map<string, T|U|V|W|X>> {
        const newPairs: [S,Map<string, T|U|V|W|X>][] = [];
        const allKeys = [...this._map.keys() ,...o1.keys(), ...o2.keys(), ...o3.keys(), ...o4.keys()]
        for (const key of allKeys) {
            const thisVal = this.get(key);
            const o1Val = o1.get(key);
            const o2Val = o2.get(key);
            const o3Val = o3.get(key);
            const o4Val = o4.get(key);

            const entryToAdd: Map<string, T|U|V|W|X> = new Map();
            if (thisVal.isSome()) {
                entryToAdd.set('V', thisVal.getOrThrow(''))
            }
            if (o1Val.isSome()) {
                entryToAdd.set('U', o1Val.getOrThrow(''))
            }
            if (o2Val.isSome()) {
                entryToAdd.set('W', o2Val.getOrThrow(''))
            }
            if (o3Val.isSome()) {
                entryToAdd.set('X', o3Val.getOrThrow(''))
            }
            if (o4Val.isSome()) {
                entryToAdd.set('Y', o4Val.getOrThrow(''))
            }
            newPairs.push([key, entryToAdd]);
        }
        return new HashMap<S, Map<string, T|U|V|W|X>>(...newPairs);
    }

    zip5<U, V, W, X, Y>(
        o1: HashMap<S, U>,
        o2: HashMap<S, V>,
        o3: HashMap<S, W>,
        o4: HashMap<S, X>,
        o5: HashMap<S, Y>
    ): HashMap<S, [T, U, V, W, X, Y]> {
        const newPairs: [S, [T, U, V, W, X, Y]][] = [];
        this._map.forEach((v, k) => {
            const otherOpt = o1.get(k);
            const otherOpt2 = o2.get(k);
            const otherOpt3 = o3.get(k);
            const otherOpt4 = o4.get(k);
            const otherOpt5 = o5.get(k);
            if (
                otherOpt.isSome() &&
                otherOpt2.isSome() &&
                otherOpt3.isSome() &&
                otherOpt4.isSome() &&
                otherOpt5.isSome()
            ) {
                newPairs.push(
                    [
                        k,
                        [
                            v,
                            otherOpt.getOrThrow(''),
                            otherOpt2.getOrThrow(''),
                            otherOpt3.getOrThrow(''),
                            otherOpt4.getOrThrow(''),
                            otherOpt5.getOrThrow('')
                        ]
                    ]
                );
            }
        });
        return new HashMap<S, [T, U, V, W, X, Y]>(...newPairs);
    }

    zip5WithAllValues<U, V, W, X, Y>(
        o1: HashMap<S, U>,
        o2: HashMap<S, V>,
        o3: HashMap<S, W>,
        o4: HashMap<S, X>,
        o5: HashMap<S, Y>
    ): HashMap<S, Map<string, T|U|V|W|X|Y>> {
        const newPairs: [S,Map<string, T|U|V|W|X|Y>][] = [];
        const allKeys = [...this._map.keys() ,...o1.keys(), ...o2.keys(), ...o3.keys(), ...o4.keys(), ...o5.keys()]
        for (const key of allKeys) {
            const thisVal = this.get(key);
            const o1Val = o1.get(key);
            const o2Val = o2.get(key);
            const o3Val = o3.get(key);
            const o4Val = o4.get(key);
            const o5Val = o5.get(key);

            const entryToAdd: Map<string, T|U|V|W|X|Y> = new Map();

            const entrySetter = (key: string, val: Some<T>|Some<U>|Some<V>|Some<W>|Some<X>|Some<Y>) => { 
                entryToAdd.set(key, val.getOrThrow(''));
            }
            conditionalDo(thisVal.isSome(), () => entrySetter('T', thisVal as Some<T>));
            conditionalDo(o1Val.isSome(),   () => entrySetter('U', o1Val   as Some<U>));
            conditionalDo(o2Val.isSome(),   () => entrySetter('V', o2Val   as Some<V>));
            conditionalDo(o3Val.isSome(),   () => entrySetter('W', o3Val   as Some<W>));
            conditionalDo(o4Val.isSome(),   () => entrySetter('X', o4Val   as Some<X>));
            conditionalDo(o5Val.isSome(),   () => entrySetter('Y', o5Val   as Some<Y>));

            newPairs.push([key, entryToAdd]);
        }
        return new HashMap<S, Map<string, T|U|V|W|X|Y>>(...newPairs);
    }

    zip6<U, V, W, X, Y, Z>(
        o1: HashMap<S, U>,
        o2: HashMap<S, V>,
        o3: HashMap<S, W>,
        o4: HashMap<S, X>,
        o5: HashMap<S, Y>,
        o6: HashMap<S, Z>
    ): HashMap<S, [T, U, V, W, X, Y, Z]> {
        const newPairs: [S, [T, U, V, W, X, Y, Z]][] = [];
        this._map.forEach((v, k) => {
            const otherOpt = o1.get(k);
            const otherOpt2 = o2.get(k);
            const otherOpt3 = o3.get(k);
            const otherOpt4 = o4.get(k);
            const otherOpt5 = o5.get(k);
            const otherOpt6 = o6.get(k);
            if (
                otherOpt.isSome() &&
                otherOpt2.isSome() &&
                otherOpt3.isSome() &&
                otherOpt4.isSome() &&
                otherOpt5.isSome() &&
                otherOpt6.isSome()
            ) {
                newPairs.push(
                    [
                        k,
                        [
                            v,
                            otherOpt.getOrThrow(''),
                            otherOpt2.getOrThrow(''),
                            otherOpt3.getOrThrow(''),
                            otherOpt4.getOrThrow(''),
                            otherOpt5.getOrThrow(''),
                            otherOpt6.getOrThrow('')
                        ]
                    ]
                );
            }
        });
        return new HashMap<S, [T, U, V, W, X, Y, Z]>(...newPairs);
    }

    zip6WithAllValues<U, V, W, X, Y, Z>(
        o1: HashMap<S, U>,
        o2: HashMap<S, V>,
        o3: HashMap<S, W>,
        o4: HashMap<S, X>,
        o5: HashMap<S, Y>,
        o6: HashMap<S, Z>
    ): HashMap<S, Map<string, T|U|V|W|X|Y|Z>> {
        const newPairs: [S,Map<string, T|U|V|W|X|Y|Z>][] = [];
        const allKeys = [...this._map.keys() ,...o1.keys(), ...o2.keys(), ...o3.keys(), ...o4.keys(), ...o5.keys(), ...o6.keys()]
        for (const key of allKeys) {
            const thisVal = this.get(key);
            const o1Val = o1.get(key);
            const o2Val = o2.get(key);
            const o3Val = o3.get(key);
            const o4Val = o4.get(key);
            const o5Val = o5.get(key);
            const o6Val = o6.get(key);

            const entryToAdd: Map<string, T|U|V|W|X|Y|Z> = new Map();
            const entrySetter = (key: string, val: Some<T>|Some<U>|Some<V>|Some<W>|Some<X>|Some<Y>|Some<Z>) => {
                entryToAdd.set(key, val.getOrThrow(''));
            }
            conditionalDo(thisVal.isSome(), () => entrySetter('T', thisVal as Some<T>));
            conditionalDo(o1Val.isSome(),   () => entrySetter('U', o1Val   as Some<U>));
            conditionalDo(o2Val.isSome(),   () => entrySetter('V', o2Val   as Some<V>));
            conditionalDo(o3Val.isSome(),   () => entrySetter('W', o3Val   as Some<W>));
            conditionalDo(o4Val.isSome(),   () => entrySetter('X', o4Val   as Some<X>));
            conditionalDo(o5Val.isSome(),   () => entrySetter('Y', o5Val   as Some<Y>));
            conditionalDo(o6Val.isSome(),   () => entrySetter('Z', o6Val   as Some<Z>));

            newPairs.push([key, entryToAdd]);
        }
        return new HashMap<S, Map<string, T|U|V|W|X|Y|Z>>(...newPairs);
    }

    forEach(callbackfn: (value: T, key: S, map: Map<S, T>) => void, thisArg?: any): void {
        this._map.forEach(callbackfn, thisArg);
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
