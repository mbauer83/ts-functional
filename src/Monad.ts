import {type AsyncApplicative, type Applicative} from './Applicative.js';

export interface Monad<out T> extends Applicative<T> {
	map<U>(f: (x: T) => U): Monad<U>;
	apply<U>(f: Monad<(x: T) => U>): Monad<U>;
	pure<U>(x: U): Monad<U>;
	flatMap<U>(f: (x: T) => Monad<U>): Monad<U>;
	zip<U>(other: Monad<U>): Monad<[T, U]>;
}

export interface AsyncMonad<out T> extends AsyncApplicative<T> {
	map<U>(f: (x: T) => Promise<U>): AsyncMonad<U>;
	apply<U>(f: AsyncMonad<(x: T) => Promise<U>>): AsyncMonad<U>;
	pure<U>(x: Promise<U>): AsyncMonad<U>;
	flatMap<U>(f: (x: T) => AsyncMonad<U>): AsyncMonad<U>;
	zip<U>(other: AsyncMonad<U>): AsyncMonad<[T, U]>;
}
