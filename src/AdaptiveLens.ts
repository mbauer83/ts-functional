export class AdaptiveLens<I, P, PR, O> {
    constructor(protected readonly get: (i: I) => P, protected readonly update: (i: I, p: PR) => O) {}

    compose<P2 extends P[keyof P], P2R extends any>(l2: AdaptiveLens<P, P2, P2R, PR>): AdaptiveLens<I, P2, P2R, O> {
        return new AdaptiveLens(
            (i: I) => l2.get(this.get(i)),
            (i:I, p2r: P2R) => this.update(i, l2.update(this.get(i), p2r))
        )
    }

    static forProperty<I2 extends object, PR2 extends any>() {
        return function <K extends keyof I2, O2 extends Omit<I2, K> & Record<K, PR2>>(name: K): AdaptiveLens<I2, I2[K], PR2, O2> {
            return new AdaptiveLens(
                (i:I2) => i[name],
                (i: I2, pr: PR2) => {
                    const iCopy = Object.create(i)
                    Object.assign(iCopy, i)
                    delete iCopy[name]
                    const newProp = {} as Record<K, PR2>
                    newProp[name] = pr
                    Object.assign(iCopy, newProp)
                    return iCopy
                }
            )
        }
    }

    // Here it gets more complicated because we need the compiler to infer `K` and `O`.
    static forProperties<I2 extends object, PR2 extends any>() {
        return function <K extends Array<keyof I2>, O2 extends Omit<I2, K[number]> & { [PK in keyof PR2]: PR2[PK]}>(
            names: [...K]
        ): AdaptiveLens<I2, { [N in keyof K]: I2[K[N]] }, PR2, O2> {
            const projector = (i: I2) => {
                const tuple = [] as unknown as { [N in keyof K]: I2[K[N]] };
                for (const name of names) {
                    tuple.push(i[name])
                }
                return tuple
            }
            const updater = (i: I2, newData: PR2 ): O2 => {
                const iCopy = Object.create(i)
                Object.assign(iCopy, i)
                for (const name of names) {
                    delete iCopy[name]
                }
                Object.assign(iCopy, newData)
                return iCopy
            }
            return new AdaptiveLens(projector, updater)
        }
            
    }

}
