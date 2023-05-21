export interface Functor<T> {
	map<U>(f: (x: T) => U): Functor<U>;
	zip<U>(other: Functor<U>): Functor<[T, U]>;
}
