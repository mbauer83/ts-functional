import {describe, expect, test} from '@jest/globals';
import { State, state, stateFrom } from '../../src/State';

describe('test State monad', () => {
    test('test functorial map', () => {
        const state = new State<string, number>((s:number) => ['value is: ' + (s*2), s*2]);
        const mapped = state.map((x:string) => '[' + x + ']');
        expect(mapped.run(2)).toEqual(['[value is: 4]', 4]);
    });

    test('test applicative pure', () => {
        const state = new State<string, number>((s:number) => ['value is: ' + (s*2), s*2]);
        const pure = state.pure<number[]>([2, 4]);
        expect(pure.run(2)).toEqual([[2, 4], 2]);
    });

    test('test applicative apply', () => {
        const state = new State<string, number>((s:number) => ['value is: ' + (s*2), s*2]);
        const applicative = new State<(x:string) => string[], number>((s:number) => [(x:string) => [x, 'value is: ' + (s*2)], s*2]);
        expect(state.apply(applicative).run(2)).toEqual([['value is: 8', 'value is: 4'], 8]);
    });

    test('test monadic flatMap', () => {
        const state = new State<string, number>((s:number) => ['value is: ' + (s*2), s*2]);
        const flatMapped = state.flatMap((x:string) => new State<string, number>((s:number) => ['value is: ' + (s*2), s*2]));
        expect(flatMapped.run(2)).toEqual(['value is: 8', 8]);
    });

    test('test get', () => {
        const state = State.get<number>();
        expect(state.run(2)).toEqual([2, 2]);
    });

    test('test put', () => {
        const state = State.put<number>(4);
        expect(state.run(2)).toEqual([undefined, 4]);
    });

    test('test modify', () => {
        const state = new State<string, number>((s:number) => ['value is: ' + (s*2), s*2]);
        const modified = state.modify((x:number) => x*2);
        expect(modified.run(2)).toEqual([undefined, 4]);
    });

    test('test return', () => {
        const state = State.return<string, number>('Hello world!');
        expect(state.run(2)).toEqual(['Hello world!', 2]);
    });

    test('test run', () => {
        const state = new State<string, number>((s:number) => ['value is: ' + (s*2), s*2]);
        expect(state.run(2)).toEqual(['value is: 4', 4]);
    });

    test('test eval', () => {
        const state = new State<string, number>((s:number) => ['value is: ' + (s*2), s*2]);
        const result = state.eval(2);
        expect(result).toEqual('value is: 4');
    });

    test('test exec', () => {
        const state = new State<string, number>((s:number) => ['value is: ' + (s*2), s*2]);
        const result = state.exec(2);
        expect(result).toEqual(4);
    });

    test('test zip', () => {
        const state = new State<string, number>((s:number) => ['value is: ' + (s*2), s*2]);
        const zipped = state.zip(new State<string, number>((s:number) => ['value is: ' + (s*3), s*3]));
        expect(zipped.run(2)).toEqual([['value is: 4', 'value is: 12'], 12]);
    });

    test('test state', () => {
        const currState = state((s:number) => ['value is: ' + (s*2), s*2]);
        expect(currState.run(2)).toEqual(['value is: 4', 4]);
    });

    test('test equals', () => {
        const state1 = new State<string, number>((s:number) => ['value is: ' + (s*2), s*2]);
        const state2 = new State<string, number>((s:number) => ['value is: ' + (s*2), s*2]);
        expect(state1.equals(state2)).toEqual(true);
    });

    test('test stateFrom', () => {
        const currState = stateFrom('Hello world!');
        expect(currState.run(2)).toEqual(['Hello world!', 2]);
    });
});