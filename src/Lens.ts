import { Path } from '@mbauer83/ts-utils/src/objectPath/Path';
import { PropertyType } from '@mbauer83/ts-utils/src/objectPath/PropertyType';

export class Lens<I, P> {

    constructor(protected readonly get: (i: I) => P, protected readonly update: (i: I, p: P) => I) { }

    map<P2>(f: (p: P) => P2, g: (p: P, p2: P2) => P): Lens<I, P2> {
        return new Lens(
            (i: I): P2 => f(this.get(i)),
            (i: I, p2r: P2): I => this.update(i, g(this.get(i), p2r))
        )
    }

    pure<P2>(p2: P2): Lens<P2, P2> {
        return new Lens(
            (p2: P2): P2 => p2,
            (p2: P2, p2r: P2): P2 => p2r
        )
    }

    apply<P2>(l2: Lens<I, [(p: P) => P2, (i: I, p2: P2) => I]>): Lens<I, P2> {
        return new Lens(
            (i: I): P2 => l2.get(i)[0](this.get(i)),
            (i: I, p2r: P2): I => l2.get(i)[1](i, p2r)
        )
    }

    flatMap<P2>(f: (p: P) => Lens<P, P2>): Lens<I, P2> {
        return new Lens(
            (i: I): P2 => f(this.get(i)).get(this.get(i)),
            (i: I, p2r: P2): I =>
                this.update(
                    i,
                    f(this.get(i)).update(this.get(i), p2r)
                )
        )
    }
    
    compose<P2>(l2: Lens<P, P2>): Lens<I, P2> {
        return new Lens(
            (i: I): P2 => l2.get(this.get(i)),
            (i: I, p2r: P2): I =>
                this.update(
                    i,
                    l2.update(this.get(i), p2r)
                )
        )
    }

    zipWith<P2>(l2: Lens<I, P2>): Lens<I, [P, P2]> {
        return new Lens(
            (i: I): [P, P2] =>
                [this.get(i), l2.get(i)],
            (i: I, p: [P, P2]) => {
                const iWithPReplaced = this.update(i, p[0])
                const iWithPAndP2Replaced = l2.update(iWithPReplaced, p[1])
                return iWithPAndP2Replaced
            }
        )
    }

    zip2<P2, P3>(l2: Lens<I, P2>, l3: Lens<I, P3>): Lens<I, [P, P2, P3]> {
        return new Lens(
            (i: I): [P, P2, P3] =>
                [this.get(i), l2.get(i), l3.get(i)],
            (i: I, p: [P, P2, P3]) => {
                const iWithPReplaced = this.update(i, p[0])
                const iWithPAndP2Replaced = l2.update(iWithPReplaced, p[1])
                const iWithPAndP2AndP3Replaced = l3.update(iWithPAndP2Replaced, p[2])
                return iWithPAndP2AndP3Replaced
            }
        )
    }

    zip3<P2, P3, P4>(l2: Lens<I, P2>, l3: Lens<I, P3>, l4: Lens<I, P4>): Lens<I, [P, P2, P3, P4]> {
        return new Lens(
            (i: I): [P, P2, P3, P4] =>
                [this.get(i), l2.get(i), l3.get(i), l4.get(i)],
            (i: I, p: [P, P2, P3, P4]) => {
                const iWithPReplaced = this.update(i, p[0])
                const iWithPAndP2Replaced = l2.update(iWithPReplaced, p[1])
                const iWithPAndP2AndP3Replaced = l3.update(iWithPAndP2Replaced, p[2])
                const iWithPAndP2AndP3AndP4Replaced = l4.update(iWithPAndP2AndP3Replaced, p[3])
                return iWithPAndP2AndP3AndP4Replaced
            }
        )
    }

    zip4<P2, P3, P4, P5>(
        l2: Lens<I, P2>, 
        l3: Lens<I, P3>, 
        l4: Lens<I, P4>, 
        l5: Lens<I, P5>
    ): Lens<I, [P, P2, P3, P4, P5]> {
        return new Lens(
            (i: I): [P, P2, P3, P4, P5] =>
                [this.get(i), l2.get(i), l3.get(i), l4.get(i), l5.get(i)],
            (i: I, p: [P, P2, P3, P4, P5]) => {
                const iWithPReplaced = this.update(i, p[0])
                const iWithPAndP2Replaced = l2.update(iWithPReplaced, p[1])
                const iWithPAndP2AndP3Replaced = l3.update(iWithPAndP2Replaced, p[2])
                const iWithPAndP2AndP3AndP4Replaced = l4.update(iWithPAndP2AndP3Replaced, p[3])
                const iWithPAndP2AndP3AndP4AndP5Replaced = l5.update(iWithPAndP2AndP3AndP4Replaced, p[4])
                return iWithPAndP2AndP3AndP4AndP5Replaced
            }
        )
    }

    zip5<P2, P3, P4, P5, P6>(
        l2: Lens<I, P2>,
        l3: Lens<I, P3>,
        l4: Lens<I, P4>,
        l5: Lens<I, P5>,
        l6: Lens<I, P6>
    ): Lens<I, [P, P2, P3, P4, P5, P6]> {
        return new Lens(
            (i: I): [P, P2, P3, P4, P5, P6] =>
                [this.get(i), l2.get(i), l3.get(i), l4.get(i), l5.get(i), l6.get(i)],
            (i: I, p: [P, P2, P3, P4, P5, P6]) => {
                const iWithPReplaced = this.update(i, p[0])
                const iWithPAndP2Replaced = l2.update(iWithPReplaced, p[1])
                const iWithPAndP2AndP3Replaced = l3.update(iWithPAndP2Replaced, p[2])
                const iWithPAndP2AndP3AndP4Replaced = l4.update(iWithPAndP2AndP3Replaced, p[3])
                const iWithPAndP2AndP3AndP4AndP5Replaced = l5.update(iWithPAndP2AndP3AndP4Replaced, p[4])
                const iWithPAndP2AndP3AndP4AndP5AndP6Replaced = l6.update(iWithPAndP2AndP3AndP4AndP5Replaced, p[5])
                return iWithPAndP2AndP3AndP4AndP5AndP6Replaced
            }
        )
    }

    zip6<P2, P3, P4, P5, P6, P7>(
        l2: Lens<I, P2>,
        l3: Lens<I, P3>,
        l4: Lens<I, P4>,
        l5: Lens<I, P5>,
        l6: Lens<I, P6>,
        l7: Lens<I, P7>
    ): Lens<I, [P, P2, P3, P4, P5, P6, P7]> {
        return new Lens(
            (i: I): [P, P2, P3, P4, P5, P6, P7] =>
                [this.get(i), l2.get(i), l3.get(i), l4.get(i), l5.get(i), l6.get(i), l7.get(i)],
            (i: I, p: [P, P2, P3, P4, P5, P6, P7]) => {
                const iWithPReplaced = this.update(i, p[0])
                const iWithPAndP2Replaced = l2.update(iWithPReplaced, p[1])
                const iWithPAndP2AndP3Replaced = l3.update(iWithPAndP2Replaced, p[2])
                const iWithPAndP2AndP3AndP4Replaced = l4.update(iWithPAndP2AndP3Replaced, p[3])
                const iWithPAndP2AndP3AndP4AndP5Replaced = l5.update(iWithPAndP2AndP3AndP4Replaced, p[4])
                const iWithPAndP2AndP3AndP4AndP5AndP6Replaced = l6.update(iWithPAndP2AndP3AndP4AndP5Replaced, p[5])
                const iWithPAndP2AndP3AndP4AndP5AndP6AndP7Replaced = l7.update(iWithPAndP2AndP3AndP4AndP5AndP6Replaced, p[6])
                return iWithPAndP2AndP3AndP4AndP5AndP6AndP7Replaced
            }
        )
    }

    zipN<PS extends any[]>(others: Lens<I, PS[keyof PS]>[]): Lens<I, [P, ...PS]> {
        return new Lens(
            (i: I): [P, ...PS] => {
                const result: any[] = []
                result.push(this.get(i))
                for (const other of others) {
                    result.push(other.get(i))
                }
                return result as [P, ...PS]
            },
            (i: I, p: [P, ...PS]) => {
                let all = [this, ...others];
                let result = i
                for (let j = 0; j < all.length; j++) {
                    result = (all[j] as Lens<I, any>).update(result, p[j])
                }
                return result
            }
        )
    }



    // We need to work around TypeScript's inability to do partial type argument inference here,
    // which is why we need to employ currying to split up the generic types and allow the compiler
    // to perform the correct inference for `K` (meaning we do not have to specify it explicitly).
    static forProperty<I extends object>() {
        return function <K extends keyof I>(name: K): Lens<I, I[K]> {
            const projector = (i: I): I[K] => i[name]
            const updater = (i: I, newVal: I[K]) => {
                const iCopy = Object.create(i)
                Object.assign(iCopy, i)
                const newProp = {} as Partial<I>
                newProp[name] = newVal
                Object.assign(iCopy, newProp)
                return iCopy
            }
            return new Lens(projector, updater)
        }
    }


    // See comment for `forProperty`-constructor - currying is employed for the same reason.
    // `K` is a tuple containing keys (names of properties) of `I` as literal types. `K` is inferred by the compiler (see examples).
    // `N in keyof K` is the type of numeric indices into K
    // `{ [N in keyof K]: I[K[N]] }` is then the type of an object containing a partial representation of I 
    // with the exact properties named by the `names` with their corresponding types given by (inferred as) `K`.
    static forProperties<I extends object>() {
        return function <K extends Array<keyof I>>(names: [...K]): Lens<I, { [N in keyof K]: I[K[N]] }> {
            const projector = (i: I) => {
                const tuple = [] as unknown as { [N in keyof K]: I[K[N]] };
                for (const name of names) {
                    tuple.push(i[name])
                }
                return tuple
            }
            const updater = (i: I, newData: { [N in keyof K]: I[K[N]] }) => {
                const iCopy = Object.create(i)
                Object.assign(iCopy, i)
                let it = 0
                for (const name of names) {
                    const newProp = {} as Partial<I>
                    newProp[name] = newData[it]
                    Object.assign(iCopy, newProp)
                    it++
                }
                return iCopy
            }
            return new Lens(projector, updater)
        }
    }

    static build<S extends {[key: string|number|symbol]: any}>() { 
        return function<P extends Path<S>>(path: P): Lens<S, PropertyType<S, P>> {
            const segments = path.split('.') as [keyof S, ...any];
            let currSegment = segments.shift().toString() as Path<S>;
            let currLens: Lens<any, any> = Lens.forProperty<S>()(currSegment as keyof S);
            while (segments.length > 0) {
                currSegment = segments.shift() as Path<S>;
                currLens = currLens.compose(
                    Lens.forProperty<PropertyType<S, typeof currSegment>>()(currSegment)) as Lens<any, any>;
            }
            return currLens;
        }
    }

    static buildZipped<S extends {[key: string|number|symbol]: any}>() { 
        return function<PS extends Array<Path<S>>>(paths: PS): Lens<S, { [N in keyof PS]: PropertyType<S, PS[N]> }> {
            let individualLenses = paths.map(path => Lens.build<S>()(path));
            const firstLens = individualLenses.shift() as Lens<S, PropertyType<S, PS[0]>>;
            const zipped = firstLens.zipN(individualLenses);
            return zipped as unknown as Lens<S, { [N in keyof PS]: PropertyType<S, PS[N]> }>;
        }
    }

}
