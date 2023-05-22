export interface Functor<T> {
	map<U>(f: (x: T) => U): Functor<U>;
	zip<U>(other: Functor<U>): Functor<[T, U]>;
}

export interface AsyncFunctor<T> {
	map<U>(f: (x: T) => Promise<U>): AsyncFunctor<U>;
	zip<U>(other: AsyncFunctor<U>): AsyncFunctor<[T, U]>;
}
