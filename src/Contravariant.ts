export type Contravariant<F, in A> = {
	contramap: <B>(f: (b: B) => A) => (b: B) => Contravariant<F, B>;
};

export interface ContravariantFunctor<in T> {
	contramap<U>(f: (x: U) => T): ContravariantFunctor<U>;
}

export interface AsyncContravariantFunctor<in T> {
	contramap<U>(f: (x: U) => Promise<T>): AsyncContravariantFunctor<U>;
}
