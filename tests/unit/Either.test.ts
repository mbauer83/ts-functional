// Tests for the Left and Right

import { Left, Right, Either, eitherFromFnOrErrorFn, eitherFromFnOrError } from '../../src/Either';
import {describe, expect, test} from '@jest/globals';
import { QueriedValueNotPresent } from '../../src/definitions';

describe('Either monad', () => {
    // test every method in Left

    test('Left.map', () => {
        const left = new Left<number, string>(1);
        const result = left.map(x => x + "!");
        expect(result).toBeInstanceOf(Left);
        expect(result).toEqual(new Left(1));
    });

    test('Left.flatMap', () => {
        const left = new Left<number, string>(1);
        const result = left.flatMap(x => new Right(x + "!"));
        expect(result).toBeInstanceOf(Left);
        expect(result).toEqual(new Left(1));
    });

    test('Left.apply', () => {
        const left = new Left<number, string>(1);
        const result = left.apply(new Right(x => x + "!"));
        expect(result).toBeInstanceOf(Left);
        expect(result).toEqual(new Left(1));
    });

    test('Left.pure', () => {
        const left = new Left<number, string>(1);
        const result = left.pure("Hello");
        expect(result).toBeInstanceOf(Right);
        expect(result).toEqual(new Right("Hello"));
    });

    test('Left.zip', () => {
        const left = new Left<number, string>(1);
        const result = left.zip(new Right("Hello"));
        expect(result).toBeInstanceOf(Left);
        expect(result).toEqual(new Left(1));
    });

    test('Left.equals', () => {
        const left = new Left<number, string>(1);
        const result = left.equals(new Left(1));
        expect(result).toBe(true);

        const result2 = left.equals(new Left(2));
        expect(result2).toBe(false);
    });

    test('Left.mapWithNewLeft', () => {
        const left = new Left<number, string>(1);
        const result = left.mapWithNewLeft(x => x + '!', x => x.toString());
        expect(result).toBeInstanceOf(Left);
        expect(result).toEqual(new Left("1"));
    });

    test('Left.fold' , () => {
        const left = new Left<number, Date>(1);
        const result = left.fold(x => x + '!', x => x.toString());
        expect(result).toBe("1!");
    });

    test('Left.getOrElse', () => {
        const left = new Left<number, string>(1);
        const result = left.getOrElse("Hello");
        expect(result).toBe("Hello");
    });

    test('Left.getOrThrow', () => {
        const left = new Left<number, string>(1);
        expect(() => left.getOrThrow('throws')).toThrow();
        expect(() => left.getOrThrow(() => 'throws')).toThrow();
        expect(() => left.getOrThrow(new Error('throws'))).toThrow();
        expect(() => left.getOrThrow(() => new Error('throws'))).toThrow();
    });

    test('Left.getOrQueriedValueNotPresent', () => {
        const left = new Left<number, string>(1);
        const result = left.getOrQueriedValueNotPresent('throws');
        expect(result).toBeInstanceOf(Left);
        expect(result.get()).toEqual(new QueriedValueNotPresent('throws'));

        const result2 = left.getOrQueriedValueNotPresent();
        expect(result2).toBeInstanceOf(Left);
        expect(result2.get()).toBeInstanceOf(QueriedValueNotPresent);
    });

    test('Left.withNewLeft', () => {
        const left = new Left<number, string>(1);
        const result = left.withNewLeft(x => x + '!');
        expect(result).toBeInstanceOf(Left);
        expect(result).toEqual(new Left("1!"));

        const result2 = left.withNewLeft("?");
        expect(result2).toBeInstanceOf(Left);
        expect(result2).toEqual(new Left("?"));
    });

    test('Left.isRight', () => {
        const left = new Left<number, string>(1);
        expect(left.isRight()).toBe(false);
    });

    test('Left.isLeft', () => {
        const left = new Left<number, string>(1);
        expect(left.isLeft()).toBe(true);
    });

    test('Left.zip2', () => {
        const left = new Left<number, string>(1);
        const result = left.zip2(new Right("Hello"), new Right("World"));
        expect(result).toBeInstanceOf(Left);
        expect(result).toEqual(new Left(1));
    });

    test('Left.zip3', () => {
        const left = new Left<number, string>(1);
        const result = left.zip3(new Right("Hello"), new Right("World"), new Right("!"));
        expect(result).toBeInstanceOf(Left);
        expect(result).toEqual(new Left(1));
    });

    test('Left.zip4', () => {
        const left = new Left<number, string>(1);
        const result = left.zip4(
            new Right("Hello"), 
            new Right("oh"), 
            new Right("you"), 
            new Right("wonderful World!")
        );
        expect(result).toBeInstanceOf(Left);
        expect(result).toEqual(new Left(1));
    });

    test('Left.zip5', () => {
        const left = new Left<number, string>(1);
        const result = left.zip5(
            new Right("Hello"), 
            new Right("oh"), 
            new Right("you"), 
            new Right("wonderful"), 
            new Right("World!")
        );
        expect(result).toBeInstanceOf(Left);
        expect(result).toEqual(new Left(1));
    });

    test('Left.zip6', () => {
        const left = new Left<number, string>(1);
        const result = left.zip6(
            new Right("Hello"), 
            new Right("oh"), 
            new Right("you"), 
            new Right("wonderful"), 
            new Right("World"), 
            new Right("!")
        );
        expect(result).toBeInstanceOf(Left);
        expect(result).toEqual(new Left(1));
    });

    test('Left.zipN', () => {
        const left = new Left<number, string>(1);
        const result = left.zipN(
            new Right("Hello"), 
            new Right("oh"), 
            new Right("you"), 
            new Right("beautiful"),
            new Right("wonderful"), 
            new Right("World"), 
            new Right("!")
        );
        expect(result).toBeInstanceOf(Left);
        expect(result).toEqual(new Left(1));
    });

    test('Left.get', () => {
        const left = new Left<number, string>(1);
        expect(left.get()).toBe(1);
    });

    // Test every method in Right

    test('Right.map', () => {
        const right = new Right<number, string>("Hello");
        const result = right.map(x => x.length);
        expect(result).toBeInstanceOf(Right);
        expect(result).toEqual(new Right(5));
    });

    test('Right.pure', () => {
        const right = new Right<number, string>("Hello");
        const result = right.pure("World");
        expect(result).toBeInstanceOf(Right);
        expect(result).toEqual(new Right("World"));
    });

    test('Right.apply', () => {
        const right = new Right<number, string>("Hello");
        const result = right.apply(new Right(x => x.length));
        expect(result).toBeInstanceOf(Right);
        expect(result).toEqual(new Right(5));
    });

    test('Right.flatMap', () => {
        const right = new Right<number, string>("Hello");
        const result = right.flatMap(x => new Right(x.length));
        expect(result).toBeInstanceOf(Right);
        expect(result).toEqual(new Right(5));
    });

    test('Right.zip', () => {
        const right = new Right<number, string>("Hello");
        const result = right.zip(new Right("World"));
        expect(result).toBeInstanceOf(Right);
        expect(result).toEqual(new Right(["Hello", "World"]));

        const result2 = right.zip(new Left("Error"));
        expect(result2).toBeInstanceOf(Left);
        expect(result2).toEqual(new Left("Error"));
    });

    test('Right.equals', () => {
        const right = new Right<string, string>("Hello");
        expect(right.equals(new Right("Hello"))).toBe(true);
        expect(right.equals(new Right("World"))).toBe(false);
        expect(right.equals(new Left("Hello"))).toBe(false);
    });

    test('Right.mapWithNewLeft', () => {
        const right = new Right<number, string>("Hello");
        const result = right.mapWithNewLeft(x => x.length, x => x + "!");
        expect(result).toBeInstanceOf(Right);
        expect(result).toEqual(new Right(5));
    });

    test('Right.fold', () => {
        const right = new Right<number, string>("Hello");
        const result = right.fold(x => x + "!", x => x.length);
        expect(result).toBe(5);
    });

    test('Right.getOrElse', () => {
        const right = new Right<number, string>("Hello");
        const result = right.getOrElse("World");
        expect(result).toBe("Hello");
    });

    test('Right.getOrThrow', () => {
        const right = new Right<number, string>("Hello");
        const result = right.getOrThrow('');
        expect(result).toBe("Hello");
    });

    test('Right.getOrQueriedValueNotPresent', () => {
        const right = new Right<number, string>("Hello");
        const result = right.getOrQueriedValueNotPresent();
        expect(result).toEqual(new Right<number, string>("Hello"));
    });

    test('Right.isLeft', () => {
        const right = new Right<number, string>("Hello");
        expect(right.isLeft()).toBe(false);
    });

    test('Right.isRight', () => {
        const right = new Right<number, string>("Hello");
        expect(right.isRight()).toBe(true);
    });

    test('Right.get', () => {
        const right = new Right<number, string>("Hello");
        expect(right.get()).toBe("Hello");
    });

    test('Right.zip2', () => {
        const origin = new Right<number, string>("Hello");
        const result = origin.zip2(new Right("World"), new Right(1));
        expect(result).toBeInstanceOf(Right);
        expect(result).toEqual(new Right(["Hello", "World", 1]));

        const result2 = origin.zip2(new Right("World"), new Left(1));
        expect(result2).toBeInstanceOf(Left);
        expect(result2).toEqual(new Left(1));

        const result3 = origin.zip2(new Left(1), new Right("World"));
        expect(result3).toBeInstanceOf(Left);
        expect(result3).toEqual(new Left(1));
    });

    test('Right.zip3', () => {
        const origin = new Right<number, string>("Hello");
        const result = origin.zip3(new Right("there,"), new Right("World"), new Right(1));
        expect(result).toBeInstanceOf(Right);
        expect(result).toEqual(new Right(["Hello", "there,", "World", 1]));

        // Left in third place
        const result2 = origin.zip3(new Right("there,"), new Right("World"), new Left(1));
        expect(result2).toBeInstanceOf(Left);
        expect(result2).toEqual(new Left(1));

        // Left in second place
        const result3 = origin.zip3(new Right("there,"), new Left(1), new Right("World"));
        expect(result3).toBeInstanceOf(Left);
        expect(result3).toEqual(new Left(1));

        // Left in first place
        const result4 = origin.zip3(new Left(1), new Right("there,"), new Right("World"));
        expect(result4).toBeInstanceOf(Left);
        expect(result4).toEqual(new Left(1));
    });

    test('Right.zip4', () => {
        const origin = new Right<number, string>("Hello");
        const result = origin.zip4(
            new Right("there"), 
            new Right("World"), 
            new Right("!"),
            new Right(1));
        expect(result).toBeInstanceOf(Right);
        expect(result).toEqual(new Right(["Hello", "there", "World", "!", 1]));

        // Left in first place
        const resul2 = origin.zip4(
            new Left(2),
            new Right("there"), 
            new Right("World"), 
            new Right(1)
        );
        expect(resul2).toBeInstanceOf(Left);
        expect(resul2).toEqual(new Left(2));

        // Left in second place
        const resul3 = origin.zip4(
            new Right("there"),
            new Left(2),
            new Right("World"),
            new Right(1)
        );
        expect(resul3).toBeInstanceOf(Left);
        expect(resul3).toEqual(new Left(2));

        // Left in third place
        const resul4 = origin.zip4(
            new Right("there"),
            new Right("World"),
            new Left(2),
            new Right(1)
        );
        expect(resul4).toBeInstanceOf(Left);
        expect(resul4).toEqual(new Left(2));

        // Left in fourth place
        const resul5 = origin.zip4(
            new Right("there"),
            new Right("World"),
            new Right(1),
            new Left(2)
        );
        expect(resul5).toBeInstanceOf(Left);
        expect(resul5).toEqual(new Left(2));
    });

    test('Right.zip5', () => {
        const origin = new Right<number, string>("Hello");
        const result = origin.zip5(
            new Right("there"), 
            new Right("beautiful"), 
            new Right("World"), 
            new Right(1),
            new Right("!")
        );
        expect(result).toBeInstanceOf(Right);
        expect(result).toEqual(new Right(["Hello", "there", "beautiful", "World", 1, "!"]));

        const result2 = origin.zip5(
            new Left(2),
            new Right("there"),
            new Right("beautiful"),
            new Right("World"),
            new Right("!")
        );
        expect(result2).toBeInstanceOf(Left);
        expect(result2).toEqual(new Left(2));

        const result3 = origin.zip5(
            new Right("there"),
            new Left(2),
            new Right("beautiful"),
            new Right("World"),
            new Right("!")
        );
        expect(result3).toBeInstanceOf(Left);
        expect(result3).toEqual(new Left(2));

        const result4 = origin.zip5(
            new Right("there"),
            new Right("beautiful"),
            new Left(2),
            new Right("World"),
            new Right("!")
        );
        expect(result4).toBeInstanceOf(Left);
        expect(result4).toEqual(new Left(2));

        const result5 = origin.zip5(
            new Right("there"),
            new Right("beautiful"),
            new Right("World"),
            new Left(2),
            new Right("!")
        );
        expect(result5).toBeInstanceOf(Left);
        expect(result5).toEqual(new Left(2));

        const result6 = origin.zip5(
            new Right("there"),
            new Right("beautiful"),
            new Right("World"),
            new Right("!"),
            new Left(2)
        );
        expect(result6).toBeInstanceOf(Left);
        expect(result6).toEqual(new Left(2));
    });

    test('Right.zip6', () => {
        const origin = new Right<number, string>("Hello");
        const result = origin.zip6(
            new Right("there"), 
            new Right("beautiful"), 
            new Right("wonderful"), 
            new Right("World"), 
            new Right("!"),
            new Right(1));
        expect(result).toBeInstanceOf(Right);
        expect(result).toEqual(new Right(["Hello", "there", "beautiful", "wonderful", "World", "!", 1]));

        const result2 = origin.zip6(
            new Left(2),
            new Right("there"),
            new Right("beautiful"),
            new Right("wonderful"),
            new Right("World"),
            new Right(1)
        );
        expect(result2).toBeInstanceOf(Left);
        expect(result2).toEqual(new Left(2));

        const result3 = origin.zip6(
            new Right("there"),
            new Left(2),
            new Right("beautiful"),
            new Right("wonderful"),
            new Right("World"),
            new Right(1)
        );
        expect(result3).toBeInstanceOf(Left);
        expect(result3).toEqual(new Left(2));

        const result4 = origin.zip6(
            new Right("there"),
            new Right("beautiful"),
            new Left(2),
            new Right("wonderful"),
            new Right("World"),
            new Right(1)
        );
        expect(result4).toBeInstanceOf(Left);
        expect(result4).toEqual(new Left(2));

        const result5 = origin.zip6(
            new Right("there"),
            new Right("beautiful"),
            new Right("wonderful"),
            new Left(2),
            new Right("World"),
            new Right(1)
        );
        expect(result5).toBeInstanceOf(Left);
        expect(result5).toEqual(new Left(2));

        const result6 = origin.zip6(
            new Right("there"),
            new Right("beautiful"),
            new Right("wonderful"),
            new Right("World"),
            new Left(2),
            new Right(1)
        );
        expect(result6).toBeInstanceOf(Left);
        expect(result6).toEqual(new Left(2));

        const result7 = origin.zip6(
            new Right("there"),
            new Right("beautiful"),
            new Right("wonderful"),
            new Right("World"),
            new Right(1),
            new Left(2)
        );
        expect(result7).toBeInstanceOf(Left);
        expect(result7).toEqual(new Left(2));
    });

    test('Right.zipN', () => {
        const origin = new Right<number, string>("Hello");
        const result = origin.zipN(
            new Right("there"), 
            new Right("beautiful"), 
            new Right("wonderful"), 
            new Right("World"),
            new Right("1"),
            new Right("2"),
            new Right("3")
        );
        expect(result).toBeInstanceOf(Right);
        expect(result).toEqual(new Right(["Hello", "there", "beautiful", "wonderful", "World", "1", "2", "3"]));

        const result2 = origin.zipN(
            new Right("there"),
            new Right("beautiful"),
            new Right("wonderful"),
            new Right("World"),
            new Left("1"),
            new Left("2"),
            new Right("3")
        );
        expect(result2).toBeInstanceOf(Left);
        expect(result2).toEqual(new Left("1"));
    });

    test('Right.withNewLeft', () => {
        const origin = new Right<string, string>("Hello");
        const result = origin.withNewLeft(1);
        expect(result).toBeInstanceOf(Right);
        expect(result).toEqual(new Right("Hello"));
    });

    test('Right.isLeft', () => {
        const origin = new Right<string, string>("Hello");
        expect(origin.isLeft()).toBe(false);
    });

    test('Right.isRight', () => {
        const origin = new Right<string, string>("Hello");
        expect(origin.isRight()).toBe(true);
    });

    test('Right.get', () => {
        const origin = new Right<string, string>("Hello");
        expect(origin.get()).toBe("Hello");
    });

    test('eitherFromFnOrErrorFn', () => {
        const result = eitherFromFnOrErrorFn(() => "ERROR", () => 1);
        expect(result).toBeInstanceOf(Right);
        expect(result).toEqual(new Right(1));

        const result2 = eitherFromFnOrErrorFn(() => "An error happened.", () => { throw new Error("ERROR") });
        expect(result2).toBeInstanceOf(Left);
        expect(result2).toEqual(new Left("An error happened."));

        const result3 = eitherFromFnOrErrorFn((e: Error) => "An error happened: " + e.message, () => { throw new Error("ERROR") });
        expect(result3).toBeInstanceOf(Left);
        expect(result3).toEqual(new Left("An error happened: ERROR"));
    });

    test('eitherFromFnOrError' , () => {
        const result = eitherFromFnOrError(new Error("ERROR"), () => 1);
        expect(result).toBeInstanceOf(Right);
        expect(result).toEqual(new Right(1));

        const result2 = eitherFromFnOrError(new Error("ERROR"), () => { throw new Error("thrown") });
        expect(result2).toBeInstanceOf(Left);
        expect(result2).toEqual(new Left(new Error("ERROR")));
    });

});