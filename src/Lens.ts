import {type Path} from '@mbauer83/ts-utils/src/objectPath/Path.js';
import {type PropertyType} from '@mbauer83/ts-utils/src/objectPath/PropertyType.js';

export class Lens<I, P> {
	// We need to work around TypeScript's inability to do partial type argument inference here,
	// which is why we need to employ currying to split up the generic types and allow the compiler
	// to perform the correct inference for `K` (meaning we do not have to specify it explicitly).
	// eslint-disable-next-line @typescript-eslint/ban-types
	static forProperty<I extends object>() {
		return function <K extends keyof I>(name: K): Lens<I, I[K]> {
			const projector = (i: I): I[K] => i[name];
			const updater = (i: I, newValue: I[K]): I => {
				const iCopy = Object.create(i) as Partial<I>;
				Object.assign(iCopy, i);
				const newProp: Partial<I> = {};
				newProp[name] = newValue;
				Object.assign(iCopy, newProp);
				return iCopy as I;
			};

			return new Lens(projector, updater);
		};
	}

	// See comment for `forProperty`-constructor - currying is employed for the same reason.
	// `K` is a tuple containing keys (names of properties) of `I` as literal types. `K` is inferred by the compiler (see examples).
	// `N in keyof K` is the type of numeric indices into K
	// `{ [N in keyof K]: I[K[N]] }` is then the type of an object containing a partial representation of I
	// with the exact properties named by the `names` with their corresponding types given by (inferred as) `K`.
	// eslint-disable-next-line @typescript-eslint/ban-types
	static forProperties<I extends object>() {
		return function <K extends Array<keyof I>>(names: [...K]): Lens<I, {[N in keyof K]: I[K[N]]}> {
			const projector = (i: I) => {
				const tuple = [] as unknown as {[N in keyof K]: I[K[N]]};
				for (const name of names) {
					tuple.push(i[name]);
				}

				return tuple;
			};

			const updater = (i: I, newData: {[N in keyof K]: I[K[N]]}): I => {
				const iCopy = Object.create(i) as Partial<I>;
				Object.assign(iCopy, i);
				let it = 0;
				for (const name of names) {
					const newProp: Partial<I> = {};
					newProp[name] = newData[it];
					Object.assign(iCopy, newProp);
					it++;
				}

				return iCopy as I;
			};

			return new Lens(projector, updater);
		};
	}

	// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
	static build<S extends {[key: string | number | symbol]: any}>() {
		return function<P extends Path<S>>(path: P): Lens<S, PropertyType<S, P>> {
			const segments = path.split('.') as [keyof S, ...any];
			const firstSegment = segments.shift() as keyof S;
			let currSegment = firstSegment.toString() as Path<S>;
			let currLens: Lens<any, any> = Lens.forProperty<S>()(currSegment as keyof S);
			while (segments.length > 0) {
				currSegment = segments.shift() as Path<S>;
				currLens = currLens.compose(
					Lens.forProperty<PropertyType<S, typeof currSegment>>()(currSegment)) as Lens<any, any>;
			}

			return currLens as Lens<S, PropertyType<S, P>>;
		};
	}

	// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
	static buildZipped<S extends {[key: string | number | symbol]: any}>() {
		return function<Q extends Array<Path<S>>>(paths: Q): Lens<S, {[N in keyof Q]: PropertyType<S, Q[N]>}> {
			const individualLenses = paths.map(path => Lens.build<S>()(path));
			const firstLens = individualLenses.shift() as Lens<S, PropertyType<S, Q[0]>>;
			const zipped = firstLens.zipN(individualLenses);
			return zipped as unknown as Lens<S, {[N in keyof Q]: PropertyType<S, Q[N]>}>;
		};
	}

	constructor(public readonly get: (i: I) => P, public readonly update: (i: I, p: P) => I) {}

	map<P2>(f: (p: P) => P2, g: (p: P, p2: P2) => P): Lens<I, P2> {
		return new Lens(
			(i: I): P2 => f(this.get(i)),
			(i: I, p2r: P2): I => this.update(i, g(this.get(i), p2r)),
		);
	}

	pure<P2>(p2: P2): Lens<P2, P2> {
		return new Lens(
			(p2: P2): P2 => p2,
			(p2: P2, p2r: P2): P2 => p2r,
		);
	}

	apply<P2>(l2: Lens<I, [(p: P) => P2, (i: I, p2: P2) => I]>): Lens<I, P2> {
		return new Lens(
			(i: I): P2 => l2.get(i)[0](this.get(i)),
			(i: I, p2r: P2): I => l2.get(i)[1](i, p2r),
		);
	}

	flatMap<P2>(f: (p: P) => Lens<P, P2>): Lens<I, P2> {
		return new Lens(
			(i: I): P2 => f(this.get(i)).get(this.get(i)),
			(i: I, p2r: P2): I =>
				this.update(
					i,
					f(this.get(i)).update(this.get(i), p2r),
				),
		);
	}

	compose<P2>(l2: Lens<P, P2>): Lens<I, P2> {
		return new Lens(
			(i: I): P2 => l2.get(this.get(i)),
			(i: I, p2r: P2): I =>
				this.update(
					i,
					l2.update(this.get(i), p2r),
				),
		);
	}

	zipWith<P2>(l2: Lens<I, P2>): Lens<I, [P, P2]> {
		return new Lens(
			(i: I): [P, P2] =>
				[this.get(i), l2.get(i)],
			(i: I, p: [P, P2]) => {
				const iWithReplacement1 = this.update(i, p[0]);
				const iWithReplacement2 = l2.update(iWithReplacement1, p[1]);
				return iWithReplacement2;
			},
		);
	}

	zip2<P2, P3>(l2: Lens<I, P2>, l3: Lens<I, P3>): Lens<I, [P, P2, P3]> {
		return new Lens(
			(i: I): [P, P2, P3] =>
				[this.get(i), l2.get(i), l3.get(i)],
			(i: I, p: [P, P2, P3]) => {
				const iWithReplacement1 = this.update(i, p[0]);
				const iWithReplacement2 = l2.update(iWithReplacement1, p[1]);
				const iWithReplacement3 = l3.update(iWithReplacement2, p[2]);
				return iWithReplacement3;
			},
		);
	}

	zip3<P2, P3, P4>(l2: Lens<I, P2>, l3: Lens<I, P3>, l4: Lens<I, P4>): Lens<I, [P, P2, P3, P4]> {
		return new Lens(
			(i: I): [P, P2, P3, P4] =>
				[this.get(i), l2.get(i), l3.get(i), l4.get(i)],
			(i: I, p: [P, P2, P3, P4]) => {
				const iWithReplacement1 = this.update(i, p[0]);
				const iWithReplacement2 = l2.update(iWithReplacement1, p[1]);
				const iWithReplacement3 = l3.update(iWithReplacement2, p[2]);
				const iWithReplacement4 = l4.update(iWithReplacement3, p[3]);
				return iWithReplacement4;
			},
		);
	}

	zip4<P2, P3, P4, P5>(
		l2: Lens<I, P2>,
		l3: Lens<I, P3>,
		l4: Lens<I, P4>,
		l5: Lens<I, P5>,
	): Lens<I, [P, P2, P3, P4, P5]> {
		return new Lens(
			(i: I): [P, P2, P3, P4, P5] =>
				[this.get(i), l2.get(i), l3.get(i), l4.get(i), l5.get(i)],
			(i: I, p: [P, P2, P3, P4, P5]) => {
				const iWithReplacement1 = this.update(i, p[0]);
				const iWithReplacement2 = l2.update(iWithReplacement1, p[1]);
				const iWithReplacement3 = l3.update(iWithReplacement2, p[2]);
				const iWithReplacement4 = l4.update(iWithReplacement3, p[3]);
				const iWithReplacement5 = l5.update(iWithReplacement4, p[4]);
				return iWithReplacement5;
			},
		);
	}

	zip5<P2, P3, P4, P5, P6>(
		l2: Lens<I, P2>,
		l3: Lens<I, P3>,
		l4: Lens<I, P4>,
		l5: Lens<I, P5>,
		l6: Lens<I, P6>,
	): Lens<I, [P, P2, P3, P4, P5, P6]> {
		return new Lens(
			(i: I): [P, P2, P3, P4, P5, P6] =>
				[this.get(i), l2.get(i), l3.get(i), l4.get(i), l5.get(i), l6.get(i)],
			(i: I, p: [P, P2, P3, P4, P5, P6]) => {
				const iWithReplacement1 = this.update(i, p[0]);
				const iWithReplacement2 = l2.update(iWithReplacement1, p[1]);
				const iWithReplacement3 = l3.update(iWithReplacement2, p[2]);
				const iWithReplacement4 = l4.update(iWithReplacement3, p[3]);
				const iWithReplacement5 = l5.update(iWithReplacement4, p[4]);
				const iWithReplacement6 = l6.update(iWithReplacement5, p[5]);
				return iWithReplacement6;
			},
		);
	}

	zip6<P2, P3, P4, P5, P6, P7>(
		l2: Lens<I, P2>,
		l3: Lens<I, P3>,
		l4: Lens<I, P4>,
		l5: Lens<I, P5>,
		l6: Lens<I, P6>,
		l7: Lens<I, P7>,
	): Lens<I, [P, P2, P3, P4, P5, P6, P7]> {
		return new Lens(
			(i: I): [P, P2, P3, P4, P5, P6, P7] =>
				[this.get(i), l2.get(i), l3.get(i), l4.get(i), l5.get(i), l6.get(i), l7.get(i)],
			(i: I, p: [P, P2, P3, P4, P5, P6, P7]) => {
				const iWithReplacement1 = this.update(i, p[0]);
				const iWithReplacement2 = l2.update(iWithReplacement1, p[1]);
				const iWithReplacement3 = l3.update(iWithReplacement2, p[2]);
				const iWithReplacement4 = l4.update(iWithReplacement3, p[3]);
				const iWithReplacement5 = l5.update(iWithReplacement4, p[4]);
				const iWithReplacement6 = l6.update(iWithReplacement5, p[5]);
				const iWithReplacement7 = l7.update(iWithReplacement6, p[6]);
				return iWithReplacement7;
			},
		);
	}

	zipN<Q extends any[]>(others: Array<Lens<I, Q[keyof Q]>>): Lens<I, [P, ...Q]> {
		return new Lens(
			(i: I): [P, ...Q] => {
				const result: any[] = [];
				result.push(this.get(i));
				for (const other of others) {
					result.push(other.get(i));
				}

				return result as [P, ...Q];
			},
			(i: I, p: [P, ...Q]) => {
				const all = [this, ...others];
				let result = i;
				for (const [j, element] of all.entries()) {
					result = (element as Lens<I, any>).update(result, p[j]);
				}

				return result;
			},
		);
	}
}
