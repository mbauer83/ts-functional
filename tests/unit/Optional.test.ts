import {describe, expect, test} from '@jest/globals';
import { Left, Right } from '../../src/Either';
import { None, optionalFromValue, Some } from '../../src/Optional';

describe('test Optional monad', () => {
    const numberOptSome = new Some<number>(2);
    const numberOptNone = new None<number>();

    test('test functorial map', () => {
        const mappedSome = numberOptSome.map((x) => x * 2);
        const mappedNone = numberOptNone.map((x) => x * 2);
        expect(mappedSome.getOrThrow('')).toBe(4);
        expect(mappedNone).toBeInstanceOf(None);
    });

    test('test applicative pure', () => {
        const pureSome = numberOptSome.pure(3);
        const pureFromNone = numberOptNone.pure(3);
        expect(pureSome).toBeInstanceOf(Some);
        expect(pureSome.getOrThrow('')).toBe(3);
        expect(pureFromNone).toBeInstanceOf(Some);
    });

    test('test applicative apply', () => {
        const someTimes4Multiplier = new Some<(n: number) => number>((x) => x * 4);
        const noneTimes4Multiplier = new None<(n: number) => number>();
        const applySomeFnToSome = numberOptSome.apply(someTimes4Multiplier);
        const applySomeFnToNone = numberOptNone.apply(someTimes4Multiplier);
        const applyNoneFnToSome = numberOptSome.apply(noneTimes4Multiplier);
        const applyNoneFnToNone = numberOptNone.apply(noneTimes4Multiplier);

        expect(applySomeFnToSome.getOrThrow('')).toBe(8);
        expect(applySomeFnToNone).toBeInstanceOf(None);
        expect(applyNoneFnToSome).toBeInstanceOf(None);
        expect(applyNoneFnToNone).toBeInstanceOf(None);
    });

    test('test monadic flatMap', () => {
        const flatMapper = (x: number) => new Some<string>((x * 2).toString());
        const flatMappedSome = numberOptSome.flatMap(flatMapper);
        const flatMappedNone = numberOptNone.flatMap(flatMapper);

        expect(flatMappedSome.getOrThrow('')).toBe('4');
        expect(flatMappedNone).toBeInstanceOf(None);
    });

    test('test functorial zip', () => {
        const otherSome = new Some<number>(3);
        const otherNone = new None<number>();
        const zippedSome = numberOptSome.zip(otherSome);
        const zippedNone = numberOptNone.zip(otherSome);
        const zippedSomeNone = numberOptSome.zip(otherNone);
        const zippedNoneNone = numberOptNone.zip(otherNone);

        expect(zippedSome.getOrThrow('')).toEqual([2, 3]);
        expect(zippedNone).toBeInstanceOf(None);
        expect(zippedSomeNone).toBeInstanceOf(None);
        expect(zippedNoneNone).toBeInstanceOf(None);
    });

    test('test fold', () => {
        const foldSome = numberOptSome.fold<string>(() => "", (x) => x.toString());
        const foldNone = numberOptNone.fold<string>(() => "", (x) => x.toString());

        expect(foldSome).toBe('2');
        expect(foldNone).toBe('');
    });

    test('test getOrElse', () => {
        const getOrElseSome = numberOptSome.getOrElse(3);
        const getOrElseNone = numberOptNone.getOrElse(3);

        expect(getOrElseSome).toBe(2);
        expect(getOrElseNone).toBe(3);
    });

    test('test getOrThrow', () => {
        const getOrThrowSome = numberOptSome.getOrThrow('error');

        expect(getOrThrowSome).toBe(2);
        expect(() => numberOptNone.getOrThrow('error')).toThrow('error');
        expect(() => numberOptNone.getOrThrow(() => 'error')).toThrow('error');
        expect(() => numberOptNone.getOrThrow(new Error('error'))).toThrow('error');
    });

    test('test isSome', () => {
        expect(numberOptSome.isSome()).toBe(true);
        expect(numberOptNone.isSome()).toBe(false);
    });

    test('test isNone', () => {
        expect(numberOptSome.isNone()).toBe(false);
        expect(numberOptNone.isNone()).toBe(true);
    });

    test('test zip2', () => {
        const baseSome = new Some<number>(42);
        const baseNone = new None<string>();

        const some2 = new Some<number>(3);
        const some3 = new Some<string>("a");

        const otherNone = new None<number>();

        const zippedSomeWithSomeSome = baseSome.zip2(some2, some3);
        const zippedSomeWithSomeNone = baseSome.zip2(some2, otherNone);
        const zippedSomeWithNoneSome = baseSome.zip2(otherNone, some3);
        const zippedSomeWithNoneNone = baseSome.zip2(otherNone, otherNone);
        
        const zippedNoneWithSomeSome = baseNone.zip2(some2, some3);
        const zippedNoneWithSomeNone = baseNone.zip2(some2, otherNone);
        const zippedNoneWithNoneSome = baseNone.zip2(otherNone, some3);
        const zippedNoneWithNoneNone = baseNone.zip2(otherNone, otherNone);

        expect(zippedSomeWithSomeSome.getOrThrow('')).toEqual([42, 3, "a"]);
        expect(zippedSomeWithSomeNone).toBeInstanceOf(None);
        expect(zippedSomeWithNoneSome).toBeInstanceOf(None);
        expect(zippedSomeWithNoneNone).toBeInstanceOf(None);

        expect(zippedNoneWithSomeSome).toBeInstanceOf(None);
        expect(zippedNoneWithSomeNone).toBeInstanceOf(None);
        expect(zippedNoneWithNoneSome).toBeInstanceOf(None);
        expect(zippedNoneWithNoneNone).toBeInstanceOf(None);
    });

    test('test zip3', () => {
        const some2 = new Some<number>(3);
        const some3 = new Some<string>("a");
        const some4 = new Some<boolean>(true);

        const zipped = numberOptSome.zip3(some2, some3, some4);
        expect(zipped.getOrThrow('')).toEqual([2, 3, "a", true]);

        expect(numberOptNone.zip3(some2, some3, some4)).toBeInstanceOf(None);
    });

    test('test zip4', () => {
        const some2 = new Some<number>(3);
        const some3 = new Some<string>("a");
        const some4 = new Some<boolean>(true);
        const date = new Date('1983-01-01');
        const some5 = new Some<Date>(date);

        const zipped = numberOptSome.zip4(some2, some3, some4, some5);
        expect(zipped.getOrThrow('')).toEqual([2, 3, "a", true, date]);

        expect(numberOptNone.zip4(some2, some3, some4, some5)).toBeInstanceOf(None);
    });

    test('test zip5', () => {
        const some2 = new Some<number>(3);
        const some3 = new Some<string>("a");
        const some4 = new Some<boolean>(true);
        const date = new Date('1983-01-01');
        const some5 = new Some<Date>(date);
        const some6 = new Some<number>(42);

        const zipped = numberOptSome.zip5(some2, some3, some4, some5, some6);
        expect(zipped.getOrThrow('')).toEqual([2, 3, "a", true, date, 42]);

        expect(numberOptNone.zip5(some2, some3, some4, some5, some6)).toBeInstanceOf(None);
    });

    test('test zip6', () => {
        const some2 = new Some<number>(3);
        const some3 = new Some<string>("a");
        const some4 = new Some<boolean>(true);
        const date = new Date('1983-01-01');
        const some5 = new Some<Date>(date);
        const some6 = new Some<number>(42);
        const some7 = new Some<string>("b");

        const zipped = numberOptSome.zip6(some2, some3, some4, some5, some6, some7);
        expect(zipped.getOrThrow('')).toEqual([2, 3, "a", true, date, 42, "b"]);

        expect(numberOptNone.zip6(some2, some3, some4, some5, some6, some7)).toBeInstanceOf(None);
    });

    test('test zipN', () => {
        const some2 = new Some<number>(2);
        const some3 = new Some<number>(3);
        const some4 = new Some<number>(4);
        const some5 = new Some<number>(5);
        const some6 = new Some<number>(6);
        const some7 = new Some<number>(7);
        const some8 = new Some<number>(8);

        const zipped = numberOptSome.zipN([some2, some3, some4, some5, some6, some7, some8]);
        expect(zipped.getOrThrow('')).toEqual([2, 2, 3, 4, 5, 6, 7, 8]);

        expect(numberOptNone.zipN([some2, some3, some4, some5, some6, some7, some8])).toBeInstanceOf(None);
    });

    test('test some equals some of same value', () => {
        const otherSome = new Some<number>(2);
        expect(numberOptSome.equals(otherSome)).toBe(true);
    });

    test('test some does not equal some of different value', () => {
        const otherSome = new Some<number>(3);
        expect(numberOptSome.equals(otherSome)).toBe(false);
    });

    test('test some does not equal none', () => {
        expect(numberOptSome.equals(numberOptNone)).toBe(false);
    });

    test('test none equals none', () => {
        expect(numberOptNone.equals(numberOptNone)).toBe(true);
    });

    test('test none does not equal some', () => {
        expect(numberOptNone.equals(numberOptSome)).toBe(false);
    });

    test('test getOrQueriedValueNotPresent', () => {
        expect(numberOptNone.getOrQueriedValueNotPresent()).toBeInstanceOf(Left);
        expect(numberOptSome.getOrQueriedValueNotPresent()).toBeInstanceOf(Right);
    });

    test('test match', () => {
        const someMatch = numberOptSome.match((x) => x.toString(), () => 'none');
        const noneMatch = numberOptNone.match((x) => x.toString(), () => 'none');
        expect (someMatch).toBe('2');
        expect (noneMatch).toBe('none');
    });

    test('test optionalFroMValue', () => {
        expect(optionalFromValue(2)).toBeInstanceOf(Some);
        expect(optionalFromValue('a').getOrThrow('')).toBe('a');
        expect(optionalFromValue(null)).toBeInstanceOf(None);
        expect(optionalFromValue(undefined)).toBeInstanceOf(None);
    });

});
