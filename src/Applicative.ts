import {type Functor} from './Functor';

export interface Applicative<T> extends Functor<T> {
	map<U>(f: (x: T) => U): Applicative<U>;
	apply<U>(f: Applicative<(x: T) => U>): Applicative<U>;
	pure<U>(x: U): Applicative<U>;
	zip<U>(other: Applicative<U>): Applicative<[T, U]>;
}
