export type Contravariant<F, A> = {
	contramap: <B>(f: (b: B) => A) => (b: B) => Contravariant<F, B>;
};
