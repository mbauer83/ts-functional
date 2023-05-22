export type Contravariant<F, A> = {
	contramap: <B>(f: (b: B) => A) => (b: B) => Contravariant<F, B>;
};

export interface ContravariantFunctor<T> {
	contramap: <U>(f: (x: U) => T) => ContravariantFunctor<U>;
}
