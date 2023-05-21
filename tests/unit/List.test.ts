import {describe, expect, test} from '@jest/globals';
import { List } from '../../src/List.js';
import { Predicate } from '../../src/Predicate.js';

// test all methods of the List monad

describe('test List monad', () => {
    const list = new List([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    test('test functorial map', () => {
        const mapped = list.map((x) => x * 2);
        expect(mapped).toBeInstanceOf(List);
        expect(mapped.getAsArray()).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18, 20]);
    });

    test('test applicative pure', () => {
        const pure = list.pure(3);
        expect(pure).toBeInstanceOf(List);
        expect(pure.getAsArray()).toEqual([3]);
    });

    test('test applicative apply', () => {
        const multiplier = new List([(x: number) => x * 2, (x: number) => x * 3]);
        const apply = list.apply(multiplier);
        expect(apply).toBeInstanceOf(List);
        expect(apply.getAsArray()).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30]);
    });

    test('test monadic flatMap', () => {
        const flatMapper = (x: number) => new List([x, x * 2]);
        const flatMapped = list.flatMap(flatMapper);
        expect(flatMapped).toBeInstanceOf(List);
        expect(flatMapped.getAsArray()).toEqual([1, 2, 2, 4, 3, 6, 4, 8, 5, 10, 6, 12, 7, 14, 8, 16, 9, 18, 10, 20]);
    });

    test('test functorial zip', () => {
        const other = new List([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        const zipped = list.zip(other);
        expect(zipped).toBeInstanceOf(List);
        expect(zipped.getAsArray()).toEqual([[1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [7, 7], [8, 8], [9, 9], [10, 10]]);
    });

    test('test filter', () => {
        const filtered = list.filter(new Predicate((x) => x % 2 === 0));
        expect(filtered).toBeInstanceOf(List);
        expect(filtered.getAsArray()).toEqual([2, 4, 6, 8, 10]);
    });

    test('test every', () => {
        const every = list.every(new Predicate((x) => x % 2 === 0));
        expect(every).toBe(false);
    });

    test('test some', () => {
        const some = list.some(new Predicate((x) => x % 2 === 0));
        expect(some).toBe(true);
    });

    test('test none', () => {
        const none = list.none(new Predicate((x) => x % 2 === 0));
        expect(none).toBe(false);
    });

    test('test getSize', () => {
        const size = list.getSize();
        expect(size).toBe(10);
    });

    test('test equals', () => {
        const other = new List([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        const equals = list.equals(other);
        expect(equals).toBe(true);

        const other2 = new List([1, 2, 3]);
        const equals2 = list.equals(other2);
        expect(equals2).toBe(false);

        const other3 = new List([1, 42, 3, 4, 5, 6, 7, 8, 9, 10]);
        const equals3 = list.equals(other3);
        expect(equals3).toBe(false);
    });

    test('test empty', () => {
        const empty = List.empty();
        expect(empty).toBeInstanceOf(List);
        expect(empty.getAsArray()).toEqual([]);
    });

    test('test forEach', () => {
        const newArr: number[] = [];
        list.forEach((x) => newArr.push(x));
        expect(newArr).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });

    test('test hasElementForPredicate', () => {
        const hasElement = list.hasElementForPredicate(new Predicate((x) => x % 2 === 0));
        expect(hasElement).toBe(true);

        const hasElement2 = list.hasElementForPredicate(new Predicate((x) => x % 11 === 0));
        expect(hasElement2).toBe(false);
    });

    test('test identity', () => {
        const identity = list.id();
        expect(identity).toBeInstanceOf(List);
        expect(identity.getAsArray()).toEqual([]);
    });

    test('test getAsArray', () => {
        const arr = list.getAsArray();
        expect(arr).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });

    test('test append', () => {
        const appended = list.append(new List<number>([11, 12]));
        expect(appended).toBeInstanceOf(List);
        expect(appended.getAsArray()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });

    test('test push', () => {
        const pushed = list.push(11);
        expect(pushed).toBeInstanceOf(List);
        expect(pushed.getAsArray()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    });

    test('test prepend', () => {
        const prepended = list.prepend(new List<number>([-1, 0]));
        expect(prepended).toBeInstanceOf(List);
        expect(prepended.getAsArray()).toEqual([-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });

    test('test unshift', () => {
        const unshifted = list.unshift(0);
        expect(unshifted).toBeInstanceOf(List);
        expect(unshifted.getAsArray()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });

    test('test slice', () => {
        const sliced = list.slice(2, 5);
        expect(sliced).toBeInstanceOf(List);
        expect(sliced.getAsArray()).toEqual([3, 4, 5]);
    });

    test('test splice', () => {
        // without insertion
        const spliced = list.splice(2, 5);
        expect(spliced).toBeInstanceOf(List);
        expect(spliced.getAsArray()).toEqual([1, 2, 8, 9, 10]);
        // with insertion
        const spliced2 = list.splice(2, 5, 11, 12);
        expect(spliced2).toBeInstanceOf(List);
        expect(spliced2.getAsArray()).toEqual([1, 2, 11, 12, 8, 9, 10]);
    });

    test('test orderBy', () => {
        const ordered = list.orderBy((a, b) => a - b === 0 ? 0 : a - b < 0 ? 1 : -1);
        expect(ordered).toBeInstanceOf(List);
        expect(ordered.getAsArray()).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
    });

    test('test orderByInverse', () => {
        const ordered = list.orderByInverse((a, b) => a === 2 ? -1 : a - b === 0 ? 0 : a - b < 0 ? -1 : 1);
        expect(ordered).toBeInstanceOf(List);
        expect(ordered.getAsArray()).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 1, 2]);
    });

    test('test reduce', () => {
        const reduced = list.reduce((acc, x) => acc + x, 0);
        expect(reduced).toBe(55);
    });

    test('test filter', () => {
        const filtered = list.filter(new Predicate((x) => x % 2 === 0));
        expect(filtered).toBeInstanceOf(List);
        expect(filtered.getAsArray()).toEqual([2, 4, 6, 8, 10]);
    });

    test('test op', () => {
        const newList = new List<string>([]);
        const concatenated = newList.op(new List(['a', 'b', 'c']), new List(['z', 'y', 'x']));
        expect(concatenated).toBeInstanceOf(List);
        expect(concatenated.getAsArray()).toEqual(['a', 'b', 'c', 'z', 'y', 'x']);
    });

    test('test concat', () => {
        const concatenated = list.concat(new List([11, 12]));
        expect(concatenated).toBeInstanceOf(List);
        expect(concatenated.getAsArray()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });

    test('test combine', () => {
        const left = new List<string|number>(["a", "b", "c"]);
        const right = new List<string|number>([1, 2, 3]);
        const combined = List.combine(left, right);
        expect(combined).toBeInstanceOf(List);
        expect(combined.getAsArray()).toEqual(["a", "b", "c", 1, 2, 3]);
    });

    test('test interleave', () => {
        const left = new List<string|number>(["a", "b", "c", "d"]);
        const right = new List<string|number>([1, 2, 3]);
        const interleaved = left.interleave(right);
        expect(interleaved).toBeInstanceOf(List);
        expect(interleaved.getAsArray()).toEqual(["a", 1, "b", 2, "c", 3, "d"]);

        const right2 = new List<string|number>([1, 2, 3, 4, 5]);
        const interleaved2 = left.interleave(right2);
        expect(interleaved2).toBeInstanceOf(List);
        expect(interleaved2.getAsArray()).toEqual(["a", 1, "b", 2, "c", 3, "d", 4, 5]);
    });

    test('test reverse', () => {
        const reversed = list.reverse();
        expect(reversed).toBeInstanceOf(List);
        expect(reversed.getAsArray()).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
    });

    test('test valueAt', () => {
        const list = new List<number>([1, 2, 3, 4, 5]);
        const value = list.valueAt(3);
        expect(value).toBe(4);

        const undefinedValue = list.valueAt(10);
        expect(undefinedValue).toBeUndefined();
    });

    test('test zip2', () => {
        const source = new List<string|number>(["A", "B", "C", "D"]);
        const o1 = new List<string|number>(["a", "b", "c"]);
        const o2 = new List<string|number>([1, 2, 3, 4, 5]);
        const zipped = source.zip2(o1, o2);
        expect(zipped).toBeInstanceOf(List);
        expect(zipped.getAsArray()).toEqual([["A", "a", 1], ["B", "b", 2], ["C", "c", 3]]);
    });

    test('test zip3', () => {
        const source = new List<string|number>(["A", "B", "C", "D"]);
        const o1 = new List<string|number>(["a", "b", "c"]);
        const o2 = new List<string|number>([1, 2, 3, 4, 5]);
        const o3 = new List<string|number>(["x", "y", "z", "w"]);
        const zipped = source.zip3(o1, o2, o3);
        expect(zipped).toBeInstanceOf(List);
        expect(zipped.getAsArray()).toEqual([["A", "a", 1, "x"], ["B", "b", 2, "y"], ["C", "c", 3, "z"]]);
    });

    test('test zip4', () => {
        const source = new List<string|number>(["A", "B", "C", "D"]);
        const o1 = new List<string|number>(["a", "b", "c"]);
        const o2 = new List<string|number>([1, 2, 3, 4, 5]);
        const o3 = new List<string|number>(["x", "y", "z", "w"]);
        const o4 = new List<string|number>(["!", "@", "#", "$", "%", "^"]);
        const zipped = source.zip4(o1, o2, o3, o4);
        expect(zipped).toBeInstanceOf(List);
        expect(zipped.getAsArray()).toEqual([["A", "a", 1, "x", "!"], ["B", "b", 2, "y", "@"], ["C", "c", 3, "z", "#"]]);
    });

    test('test zip5', () => {
        const source = new List<string|number>(["A", "B", "C", "D"]);
        const o1 = new List<string|number>(["a", "b", "c"]);
        const o2 = new List<string|number>([1, 2, 3, 4, 5]);
        const o3 = new List<string|number>(["x", "y", "z", "w"]);
        const o4 = new List<string|number>(["!", "@", "#", "$", "%", "^"]);
        const o5 = new List<string|number>(["Z", "Y", "X", "W", "V", "U", "T"]);
        const zipped = source.zip5(o1, o2, o3, o4, o5);
        expect(zipped).toBeInstanceOf(List);
        expect(zipped.getAsArray()).toEqual([["A", "a", 1, "x", "!", "Z"], ["B", "b", 2, "y", "@", "Y"], ["C", "c", 3, "z", "#", "X"]]);
    });

    test('test zip6', () => {
        const source = new List<string|number>(["A", "B", "C", "D"]);
        const o1 = new List<string|number>(["a", "b", "c"]);
        const o2 = new List<string|number>([1, 2, 3, 4, 5]);
        const o3 = new List<string|number>(["x", "y", "z", "w"]);
        const o4 = new List<string|number>(["!", "@", "#", "$", "%", "^"]);
        const o5 = new List<string|number>(["Z", "Y", "X", "W", "V", "U", "T"]);
        const o6 = new List<string|number>(["100", "99", "98", "97", "96", "95", "94", "93"]);
        const zipped = source.zip6(o1, o2, o3, o4, o5, o6);
        expect(zipped).toBeInstanceOf(List);
        expect(zipped.getAsArray()).toEqual([["A", "a", 1, "x", "!", "Z", "100"], ["B", "b", 2, "y", "@", "Y", "99"], ["C", "c", 3, "z", "#", "X", "98"]]);
    });

    test('test zipN', () => {
        const source = new List<string|number>(["A", "B", "C", "D"]);
        const o1 = new List<string|number>(["a", "b", "c"]);
        const o2 = new List<string|number>([1, 2, 3, 4, 5]);
        const o3 = new List<string|number>(["x", "y", "z", "w"]);
        const o4 = new List<string|number>(["!", "@", "#", "$", "%", "^"]);
        const o5 = new List<string|number>(["Z", "Y", "X", "W", "V", "U", "T"]);
        const o6 = new List<string|number>(["100", "99", "98", "97", "96", "95", "94", "93"]);
        const o7 = new List<string|number>(["?", ">", "<", ":", ";", ")", "(", "&"]);
        const zipped = source.zipN(o1, o2, o3, o4, o5, o6, o7);
        expect(zipped).toBeInstanceOf(List);
        expect(zipped.getAsArray()).toEqual([["A", "a", 1, "x", "!", "Z", "100", "?"], ["B", "b", 2, "y", "@", "Y", "99", ">"], ["C", "c", 3, "z", "#", "X", "98", "<"]]);
    });
});
