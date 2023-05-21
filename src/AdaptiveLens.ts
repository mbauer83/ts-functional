export class AdaptiveLens<I, P, R, O> {
	static forProperty<I2 extends Record<string, unknown>, R2>() {
		return function <K extends keyof I2, O2 extends Omit<I2, K> & Record<K, R2>>(name: K): AdaptiveLens<I2, I2[K], R2, O2> {
			return new AdaptiveLens<I2, I2[K], R2, O2>(
				(i: I2) => i[name],
				(i: I2, pr: R2) => {
					const iCopy = Object.create(i) as O2;
					Object.assign(iCopy, i);
					// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
					delete iCopy[name];
					const newProp: Partial<Record<K, R2>> = {};
					newProp[name] = pr;
					Object.assign(iCopy, newProp);
					return iCopy;
				},
			);
		};
	}

	// Here it gets more complicated because we need the compiler to infer `K` and `O`.
	static forProperties<I2 extends Record<string, unknown>, P2>() {
		return function <K extends Array<keyof I2>, O2 extends Omit<I2, K[number]> & {[PK in keyof P2]: P2[PK]}>(
			names: [...K],
		): AdaptiveLens<I2, {[N in keyof K]: I2[K[N]]}, P2, O2> {
			const projector = (i: I2) => {
				const tuple = [] as unknown as {[N in keyof K]: I2[K[N]]};
				for (const name of names) {
					tuple.push(i[name]);
				}

				return tuple;
			};

			const updater = (i: I2, newData: P2): O2 => {
				const iCopy = Object.create(i) as O2;
				Object.assign(iCopy, i);
				for (const name of names) {
					// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
					delete iCopy[name as keyof O2];
				}

				Object.assign(iCopy, newData);
				return iCopy;
			};

			return new AdaptiveLens(projector, updater);
		};
	}

	constructor(protected readonly get: (i: I) => P, protected readonly update: (i: I, p: R) => O) {}

	compose<P2 extends P[keyof P], P2R>(l2: AdaptiveLens<P, P2, P2R, R>): AdaptiveLens<I, P2, P2R, O> {
		return new AdaptiveLens(
			(i: I) => l2.get(this.get(i)),
			(i: I, p2r: P2R) => this.update(i, l2.update(this.get(i), p2r)),
		);
	}
}
