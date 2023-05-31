import {type AsyncFunctor, type Functor} from './Functor.js';

export interface Applicative<out T> extends Functor<T> {
	map<U>(f: (x: T) => U): Applicative<U>;
	apply<U>(f: Applicative<(x: T) => U>): Applicative<U>;
	pure<U>(x: U): Applicative<U>;
	zip<U>(other: Applicative<U>): Applicative<[T, U]>;
}

export interface AsyncApplicative<out T> extends AsyncFunctor<T> {
	map<U>(f: (x: T) => Promise<U>): AsyncApplicative<U>;
	apply<U>(f: AsyncApplicative<(x: T) => Promise<U>>): AsyncApplicative<U>;
	pure<U>(x: Promise<U>): AsyncApplicative<U>;
	zip<U>(other: AsyncApplicative<U>): AsyncApplicative<[T, U]>;
}
