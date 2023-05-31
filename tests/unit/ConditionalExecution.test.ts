/* eslint-disable */
import { describe, expect, test, jest } from '@jest/globals';
import { Left, Right } from '../../src/Either.js';
import { ConditionalExecution } from '../../src/ConditionalExecution.js';

describe('test ConditionalExecution', () => {
    const thenFn = jest.fn();
    const otherwiseFn = jest.fn();
    const conditionalExecution = new ConditionalExecution(thenFn, otherwiseFn);

    test('test evaluate', () => {
        thenFn.mockReturnValue('then');
        otherwiseFn.mockReturnValue('otherwise');

        // Test case 1
        const bool1 = true;
        const result1 = conditionalExecution.evaluate(bool1);
        expect(result1).toBeInstanceOf(Right);
        expect(result1.get()).toBe('then');
        expect(thenFn).toHaveBeenCalled();
        expect(otherwiseFn).not.toHaveBeenCalled();

        // Test case 2
        const bool2 = false;
        const result2 = conditionalExecution.evaluate(bool2);
        expect(result2).toBeInstanceOf(Left);
        expect(result2.get()).toBe('otherwise');
        expect(thenFn).toHaveBeenCalledTimes(1);
        expect(otherwiseFn).toHaveBeenCalled();

        // Test case 3
        const bool3 = () => true;
        const result3 = conditionalExecution.evaluate(bool3);
        expect(result3).toBeInstanceOf(Right);
        expect(result3.get()).toBe('then');
        expect(thenFn).toHaveBeenCalledTimes(2);
        expect(otherwiseFn).toHaveBeenCalledTimes(1);
    });

    test('test map', () => {
        thenFn.mockReturnValue('mapped then');
        const mappedConditionalExecution = (conditionalExecution as ConditionalExecution<string, string>).map(x => x.toUpperCase());
        const result = mappedConditionalExecution.evaluate(true);
        expect(result).toBeInstanceOf(Right);
        expect(result.get()).toBe('MAPPED THEN');
        expect(thenFn).toHaveBeenCalledTimes(1);
        expect(otherwiseFn).not.toHaveBeenCalled();
    });

    test('test apply', () => {
        const thenStringFn: (() => string) = () => 'then';
        const otherwiseStringFn: (() => string) = () => 'otherwise';
        const condExec = new ConditionalExecution(thenStringFn, otherwiseStringFn);
        const thenNumberFn: ((_: any) => ((x: string) => number)) = (_:any) => (x => x.length);
        const condExecApplicative = new ConditionalExecution(thenNumberFn, otherwiseStringFn);
        const condExecApplied = condExec.apply(condExecApplicative);
        expect(condExecApplied.evaluate(true)).toBeInstanceOf(Right)
        expect(condExecApplied.evaluate(true)).toHaveProperty('value', 4);
        expect(condExecApplied.evaluate(false)).toBeInstanceOf(Left);
        expect(condExecApplied.evaluate(false)).toHaveProperty('value', 'otherwise');
    });

    test('test pure', () => {
        const value = 'pure value';
        const pureConditionalExecution = conditionalExecution.pure(value);
        const result = pureConditionalExecution.evaluate(true);
        expect(result).toBeInstanceOf(Right);
        expect(result.get()).toBe(value);
        expect(thenFn).not.toHaveBeenCalled();
        expect(otherwiseFn).not.toHaveBeenCalled();
    });

    test('test flatMap', () => {
        const thenFn2 = jest.fn().mockReturnValue('flatMapped then');
        const flatMappedConditionalExecution = conditionalExecution.flatMap(() => new ConditionalExecution(thenFn2, otherwiseFn));
        const result = flatMappedConditionalExecution.evaluate(true);
        expect(result).toBeInstanceOf(Right);
        expect(result.get()).toBe('flatMapped then');
        expect(thenFn).toHaveBeenCalled();
        expect(thenFn2).toHaveBeenCalled();
        expect(otherwiseFn).not.toHaveBeenCalled();
    });

    test('test zip', () => {
        thenFn.mockReturnValue('then');
        otherwiseFn.mockReturnValue('otherwise');
        const thenNumberFn: (() => number) = () => 10;
        const otherwiseStringFn: (() => string) = () => 'otherwise';
    
        const otherConditionalExecution = new ConditionalExecution(thenNumberFn, otherwiseStringFn);
    
        const zippedConditionalExecution = conditionalExecution.zip(otherConditionalExecution);
    
        // Test case 1
        const bool1 = true;
        const result1 = zippedConditionalExecution.evaluate(bool1);
        expect(result1).toEqual(new Right(['then', 10]));
        expect(thenFn).toHaveBeenCalledTimes(1);
        expect(otherwiseFn).not.toHaveBeenCalled();
    
        // Test case 2
        const bool2 = false;
        const result2 = zippedConditionalExecution.evaluate(bool2);
        expect(result2).toEqual(new Left('otherwise'));
        expect(thenFn).toHaveBeenCalledTimes(1);
        expect(otherwiseFn).toHaveBeenCalledTimes(1);
    });

    
    test('test zip2', () => {
        thenFn.mockReturnValue('then');
        otherwiseFn.mockReturnValue('otherwise');
        const thenNumberFn: (() => number) = () => 10;
        const otherwiseStringFn: (() => string) = () => 'otherwise';

        const otherConditionalExecution1 = new ConditionalExecution(thenNumberFn, otherwiseStringFn);
        const otherConditionalExecution2 = new ConditionalExecution(thenNumberFn, otherwiseStringFn);

        const zippedConditionalExecution = conditionalExecution.zip2(otherConditionalExecution1, otherConditionalExecution2);

        // Test case 1
        const bool1 = true;
        const result1 = zippedConditionalExecution.evaluate(bool1);
        expect(result1).toEqual(new Right(['then', 10, 10]));
        expect(thenFn).toHaveBeenCalledTimes(1);
        expect(otherwiseFn).not.toHaveBeenCalled();

        // Test case 2
        const bool2 = false;
        const result2 = zippedConditionalExecution.evaluate(bool2);
        expect(result2).toEqual(new Left('otherwise'));
        expect(thenFn).toHaveBeenCalledTimes(1);
        expect(otherwiseFn).toHaveBeenCalledTimes(1);
    });

    test('test zip3', () => {
        thenFn.mockReturnValue('then');
        otherwiseFn.mockReturnValue('otherwise');
        const thenNumberFn: (() => number) = () => 10;
        const otherwiseStringFn: (() => string) = () => 'otherwise';
    
        const otherConditionalExecution1 = new ConditionalExecution(thenNumberFn, otherwiseStringFn);
        const otherConditionalExecution2 = new ConditionalExecution(thenNumberFn, otherwiseStringFn);
        const otherConditionalExecution3 = new ConditionalExecution(thenNumberFn, otherwiseStringFn);
    
        const zippedConditionalExecution = conditionalExecution.zip3(
            otherConditionalExecution1,
            otherConditionalExecution2,
            otherConditionalExecution3
        );
    
        // Test case 1
        const bool1 = true;
        const result1 = zippedConditionalExecution.evaluate(bool1);
        expect(result1).toEqual(new Right(['then', 10, 10, 10]));
        expect(thenFn).toHaveBeenCalledTimes(1);
        expect(otherwiseFn).not.toHaveBeenCalled();
    
        // Test case 2
        const bool2 = false;
        const result2 = zippedConditionalExecution.evaluate(bool2);
        expect(result2).toEqual(new Left('otherwise'));
        expect(thenFn).toHaveBeenCalledTimes(1);
        expect(otherwiseFn).toHaveBeenCalledTimes(1);
    });

    test('test zip4', () => {
        thenFn.mockReturnValue('then');
        otherwiseFn.mockReturnValue('otherwise');
        const thenNumberFn: (() => number) = () => 10;
        const otherwiseStringFn: (() => string) = () => 'otherwise';
    
        const otherConditionalExecution1 = new ConditionalExecution(thenNumberFn, otherwiseStringFn);
        const otherConditionalExecution2 = new ConditionalExecution(thenNumberFn, otherwiseStringFn);
        const otherConditionalExecution3 = new ConditionalExecution(thenNumberFn, otherwiseStringFn);
        const otherConditionalExecution4 = new ConditionalExecution(thenNumberFn, otherwiseStringFn);
    
        const zippedConditionalExecution = conditionalExecution.zip4(
            otherConditionalExecution1,
            otherConditionalExecution2,
            otherConditionalExecution3,
            otherConditionalExecution4
        );
    
        // Test case 1
        const bool1 = true;
        const result1 = zippedConditionalExecution.evaluate(bool1);
        expect(result1).toEqual(new Right(['then', 10, 10, 10, 10]));
        expect(thenFn).toHaveBeenCalledTimes(1);
        expect(otherwiseFn).not.toHaveBeenCalled();
    
        // Test case 2
        const bool2 = false;
        const result2 = zippedConditionalExecution.evaluate(bool2);
        expect(result2).toEqual(new Left('otherwise'));
        expect(thenFn).toHaveBeenCalledTimes(1);
        expect(otherwiseFn).toHaveBeenCalledTimes(1);
    });

    test('test zip5', () => {
        thenFn.mockReturnValue('then');
        otherwiseFn.mockReturnValue('otherwise');
        const thenNumberFn: (() => number) = () => 10;
        const otherwiseStringFn: (() => string) = () => 'otherwise';
    
        const otherConditionalExecution1 = new ConditionalExecution(thenNumberFn, otherwiseStringFn);
        const otherConditionalExecution2 = new ConditionalExecution(thenNumberFn, otherwiseStringFn);
        const otherConditionalExecution3 = new ConditionalExecution(thenNumberFn, otherwiseStringFn);
        const otherConditionalExecution4 = new ConditionalExecution(thenNumberFn, otherwiseStringFn);
        const otherConditionalExecution5 = new ConditionalExecution(thenNumberFn, otherwiseStringFn);
    
        const zippedConditionalExecution = conditionalExecution.zip5(
            otherConditionalExecution1,
            otherConditionalExecution2,
            otherConditionalExecution3,
            otherConditionalExecution4,
            otherConditionalExecution5
        );
    
        // Test case 1
        const bool1 = true;
        const result1 = zippedConditionalExecution.evaluate(bool1);
        expect(result1).toEqual(new Right(['then', 10, 10, 10, 10, 10]));
        expect(thenFn).toHaveBeenCalledTimes(1);
        expect(otherwiseFn).not.toHaveBeenCalled();
    
        // Test case 2
        const bool2 = false;
        const result2 = zippedConditionalExecution.evaluate(bool2);
        expect(result2).toEqual(new Left('otherwise'));
        expect(thenFn).toHaveBeenCalledTimes(1);
        expect(otherwiseFn).toHaveBeenCalledTimes(1);
    });

    test('test zip6', () => {
        thenFn.mockReturnValue('then');
        otherwiseFn.mockReturnValue('otherwise');
        const thenNumberFn: (() => number) = () => 10;
        const otherwiseStringFn: (() => string) = () => 'otherwise';
    
        const otherConditionalExecution1 = new ConditionalExecution(thenNumberFn, otherwiseStringFn);
        const otherConditionalExecution2 = new ConditionalExecution(thenNumberFn, otherwiseStringFn);
        const otherConditionalExecution3 = new ConditionalExecution(thenNumberFn, otherwiseStringFn);
        const otherConditionalExecution4 = new ConditionalExecution(thenNumberFn, otherwiseStringFn);
        const otherConditionalExecution5 = new ConditionalExecution(thenNumberFn, otherwiseStringFn);
        const otherConditionalExecution6 = new ConditionalExecution(thenNumberFn, otherwiseStringFn);
    
        const zippedConditionalExecution = conditionalExecution.zip6(
            otherConditionalExecution1,
            otherConditionalExecution2,
            otherConditionalExecution3,
            otherConditionalExecution4,
            otherConditionalExecution5,
            otherConditionalExecution6
        );
    
        // Test case 1
        const bool1 = true;
        const result1 = zippedConditionalExecution.evaluate(bool1);
        expect(result1).toEqual(new Right(['then', 10, 10, 10, 10, 10, 10]));
        expect(thenFn).toHaveBeenCalledTimes(1);
        expect(otherwiseFn).not.toHaveBeenCalled();
    
        // Test case 2
        const bool2 = false;
        const result2 = zippedConditionalExecution.evaluate(bool2);
        expect(result2).toEqual(new Left('otherwise'));
        expect(thenFn).toHaveBeenCalledTimes(1);
        expect(otherwiseFn).toHaveBeenCalledTimes(1);
    });

    
    test('test zipWithElse', () => {

        const date = new Date();
        const symbolOtherwise = Symbol('otherwise');
        const thenDateFn = jest.fn();
        thenDateFn.mockReturnValue(date);
        const otherwiseSymbolFn= jest.fn();
        otherwiseSymbolFn.mockReturnValue(symbolOtherwise);

        const condExec = new ConditionalExecution(thenDateFn, otherwiseSymbolFn);

        const thenNumberFn = jest.fn();
        thenNumberFn.mockReturnValue(10);
        const otherwiseStringFn = jest.fn();
        otherwiseStringFn.mockReturnValue('otherwise');

        const otherConditionalExecution = new ConditionalExecution(thenNumberFn, otherwiseStringFn);

        const zippedConditionalExecution = condExec.zipWithElse(otherConditionalExecution);

        // Test case 1
        const bool1 = true;
        const result1 = zippedConditionalExecution.evaluate(bool1);
        expect(result1).toEqual(new Right([date, 10]));
        expect(thenDateFn).toHaveBeenCalledTimes(1);
        expect(thenNumberFn).toHaveBeenCalledTimes(1);
        expect(otherwiseSymbolFn).not.toHaveBeenCalled();
        expect(otherwiseStringFn).not.toHaveBeenCalled();

        // Test case 2
        const bool2 = false;
        const result2 = zippedConditionalExecution.evaluate(bool2);
        expect(result2).toEqual(new Left([symbolOtherwise, 'otherwise']));
        expect(thenDateFn).toHaveBeenCalledTimes(1);
        expect(thenNumberFn).toHaveBeenCalledTimes(1);
        expect(otherwiseSymbolFn).toHaveBeenCalledTimes(1);
        expect(otherwiseStringFn).toHaveBeenCalledTimes(1);
    });

    // Test zip2WithElse
    test('test zip2WithElse', () => {
            
            const date = new Date();
            const symbolOtherwise = Symbol('otherwise');
            const thenDateFn = jest.fn();
            thenDateFn.mockReturnValue(date);
            const otherwiseSymbolFn= jest.fn();
            otherwiseSymbolFn.mockReturnValue(symbolOtherwise);
    
            const condExec = new ConditionalExecution(thenDateFn, otherwiseSymbolFn);
    
            const thenNumberFn = jest.fn();
            thenNumberFn.mockReturnValue(10);
            const otherwiseStringFn = jest.fn();
            otherwiseStringFn.mockReturnValue('otherwise');
    
            const thenMapFn = jest.fn();
            thenMapFn.mockReturnValue(new Map());
            const otherwiseSetFn = jest.fn();
            otherwiseSetFn.mockReturnValue(new Set());

            const otherConditionalExecution1 = new ConditionalExecution(thenNumberFn, otherwiseStringFn);
            const otherConditionalExecution2 = new ConditionalExecution(thenMapFn, otherwiseSetFn);
            const zippedConditionalExecution = condExec.zip2WithElse(otherConditionalExecution1, otherConditionalExecution2);

            // Test case 1
            const bool1 = true;
            const result1 = zippedConditionalExecution.evaluate(bool1);
            expect(result1).toEqual(new Right([date, 10, new Map()]));
            expect(thenDateFn).toHaveBeenCalledTimes(1);
            expect(thenNumberFn).toHaveBeenCalledTimes(1);
            expect(thenMapFn).toHaveBeenCalledTimes(1);
            expect(otherwiseSymbolFn).not.toHaveBeenCalled();
            expect(otherwiseStringFn).not.toHaveBeenCalled();
            expect(otherwiseSetFn).not.toHaveBeenCalled();

            // Test case 2
            const bool2 = false;
            const result2 = zippedConditionalExecution.evaluate(bool2);
            expect(result2).toEqual(new Left([symbolOtherwise, 'otherwise', new Set()]));
            expect(thenDateFn).toHaveBeenCalledTimes(1);
            expect(thenNumberFn).toHaveBeenCalledTimes(1);
            expect(thenMapFn).toHaveBeenCalledTimes(1);
            expect(otherwiseSymbolFn).toHaveBeenCalledTimes(1);
            expect(otherwiseStringFn).toHaveBeenCalledTimes(1);
            expect(otherwiseSetFn).toHaveBeenCalledTimes(1);
        });

        // Test zip3WithElse
        test('test zip3WithElse', () => {
                
                const date = new Date();
                const symbolOtherwise = Symbol('otherwise');
                const thenDateFn = jest.fn();
                thenDateFn.mockReturnValue(date);
                const otherwiseSymbolFn= jest.fn();
                otherwiseSymbolFn.mockReturnValue(symbolOtherwise);
        
                const condExec = new ConditionalExecution(thenDateFn, otherwiseSymbolFn);
        
                const thenNumberFn = jest.fn();
                thenNumberFn.mockReturnValue(10);
                const otherwiseStringFn = jest.fn();
                otherwiseStringFn.mockReturnValue('otherwise');
        
                const thenMapFn = jest.fn();
                thenMapFn.mockReturnValue(new Map());
                const otherwiseSetFn = jest.fn();
                otherwiseSetFn.mockReturnValue(new Set());
    
                const thenArrayFn = jest.fn();
                thenArrayFn.mockReturnValue(new Array());
                const otherwiseObjectFn = jest.fn();
                otherwiseObjectFn.mockReturnValue(new Object());
    
                const otherConditionalExecution1 = new ConditionalExecution(thenNumberFn, otherwiseStringFn);
                const otherConditionalExecution2 = new ConditionalExecution(thenMapFn, otherwiseSetFn);
                const otherConditionalExecution3 = new ConditionalExecution(thenArrayFn, otherwiseObjectFn);
                const zippedConditionalExecution = condExec.zip3WithElse(otherConditionalExecution1, otherConditionalExecution2, otherConditionalExecution3);
    
                // Test case 1
                const bool1 = true;
                const result1 = zippedConditionalExecution.evaluate(bool1);
                expect(result1).toEqual(new Right([date, 10, new Map(), new Array()]));
                expect(thenDateFn).toHaveBeenCalledTimes(1);
                expect(thenNumberFn).toHaveBeenCalledTimes(1);
                expect(thenMapFn).toHaveBeenCalledTimes(1);
                expect(thenArrayFn).toHaveBeenCalledTimes(1);
                expect(otherwiseSymbolFn).not.toHaveBeenCalled();
                expect(otherwiseStringFn).not.toHaveBeenCalled();
                expect(otherwiseSetFn).not.toHaveBeenCalled();
                expect(otherwiseObjectFn).not.toHaveBeenCalled();
    
                // Test case 2
                const bool2 = false;
                const result2 = zippedConditionalExecution.evaluate(bool2);
                expect(result2).toEqual(new Left([symbolOtherwise, 'otherwise', new Set(), new Object()]));
                expect(thenDateFn).toHaveBeenCalledTimes(1);
                expect(thenNumberFn).toHaveBeenCalledTimes(1);
                expect(thenMapFn).toHaveBeenCalledTimes(1);
                expect(thenArrayFn).toHaveBeenCalledTimes(1);
                expect(otherwiseSymbolFn).toHaveBeenCalledTimes(1);
                expect(otherwiseStringFn).toHaveBeenCalledTimes(1);
                expect(otherwiseSetFn).toHaveBeenCalledTimes(1);
                expect(otherwiseObjectFn).toHaveBeenCalledTimes(1);
        });
});
