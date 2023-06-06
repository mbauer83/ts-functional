import {type AsyncFunctor, type Functor} from './Functor.js';

/**
 * A Functor to which we can apply an function lifted into the Functor.
 */
export interface Applicative<out T> extends Functor<T> {
	/**
	 * The applicative version of the base-functor's `map` method.
	 */
	map<U>(f: (x: T) => U): Applicative<U>;
	/**
	 * Applies a lifted function to the value encapsulated by this `Applicative`.
	 */
	apply<U>(f: Applicative<(x: T) => U>): Applicative<U>;
	/**
	 * Lifts a value into the `Applicative`.
	 */
	pure<U>(x: U): Applicative<U>;
	/**
	 * The applicative version of the base-functor's `zip` method.
	 */
	zip<U>(other: Applicative<U>): Applicative<[T, U]>;
}

/**
 * An AsyncFunctor to which we can apply an async function lifted into the AsyncFunctor.
 */
export interface AsyncApplicative<out T> extends AsyncFunctor<T> {
	/**
	 * The applicative version of the base-functor's `map` method.
	 */
	map<U>(f: (x: T) => Promise<U>): AsyncApplicative<U>;
	/**
	 * Applies a lifted function to the value encapsulated by this `AsyncApplicative`.
	 */
	apply<U>(f: AsyncApplicative<(x: T) => Promise<U>>): AsyncApplicative<U>;
	/**
	 * Lifts a value into the `AsyncApplicative`.
	 */
	pure<U>(x: Promise<U>): AsyncApplicative<U>;
	/**
	 * The applicative version of the base-functor's `zip` method.
	 */
	zip<U>(other: AsyncApplicative<U>): AsyncApplicative<[T, U]>;
}
