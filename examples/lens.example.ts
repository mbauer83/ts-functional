import {Lens} from '../src/Lens';

class A {
	constructor(
		public readonly a: number,
		public readonly b: string,
		public readonly c: {d: Date; e: RegExp},
	) {}
}

class B {
	constructor(
		public readonly f: number,
		public readonly g: string,
		public readonly h: A,
	) {}
}

/* eslint-disable @typescript-eslint/naming-convention */
// Build for properties, then compose
const lensFromBtoH = Lens.forProperty<B>()('h');
const lensFromAToC = Lens.forProperty<A>()('c');

// @ts-expect-error `name` is type-checked, so this will produce a compiler error
const invalidLens1 = Lens.forProperty<B>()('i');

const lensFromCToE = Lens.forProperty<{d: Date; e: RegExp}>()('e');
const composedLens = lensFromBtoH.compose(lensFromAToC).compose(lensFromCToE);

const someA = new A(1, '2', {d: new Date(), e: /3/});
const someB = new B(4, '5', someA);

const regExpFromA = composedLens.get(someB);
const someBWithNewRegExp = composedLens.update(someB, /6/);

// We can build the same lens in one step, no matter the nesting-depth of the property
// we want to access - with the magic of a path-type.
// Arguments to `build` (or rather the function it returns) are fully type-safe
// and permit auto-completion
const lensFromBtoAThenCThenE = Lens.build<B>()('h.c.e');

// @ts-expect-error `path` is type-checked, so this will produce a compiler error
const invalidLens3 = Lens.build<B>()('h.g');

// @ts-expect-error And so will this
const invalidLens4 = Lens.build<B>()('h.c.e.p');

/* eslint-enable @typescript-eslint/naming-convention */
