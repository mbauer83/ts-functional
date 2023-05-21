import {type Applicative} from './Applicative';

export interface Monad<T> extends Applicative<T> {
	map<U>(f: (x: T) => U): Monad<U>;
	apply<U>(f: Monad<(x: T) => U>): Monad<U>;
	pure<U>(x: U): Monad<U>;
	flatMap<U>(f: (x: T) => Monad<U>): Monad<U>;
	zip<U>(other: Monad<U>): Monad<[T, U]>;
}
