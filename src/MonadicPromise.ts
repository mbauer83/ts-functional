import {type Monad} from './Monad.js';

export class MonadicPromise<out T> implements Monad<T> {
	constructor(public readonly promise: Promise<T>) {}

	map<U>(f: (x: T) => U): MonadicPromise<U> {
		return new MonadicPromise(this.promise.then(t => f(t)));
	}

	apply<U>(f: MonadicPromise<(x: T) => U>): MonadicPromise<U> {
		return new MonadicPromise(this.flatMap(t => f.map(g => g(t))).promise);
	}

	pure<U>(x: U): MonadicPromise<U> {
		return new MonadicPromise(Promise.resolve(x));
	}

	flatMap<U>(f: (x: T) => MonadicPromise<U>): MonadicPromise<U> {
		return new MonadicPromise(this.promise.then(async t => f(t).promise));
	}

	zip<U>(other: MonadicPromise<U>): MonadicPromise<[T, U]> {
		return new MonadicPromise(Promise.all([this.promise, other.promise]));
	}

	zip2<U, V>(other: MonadicPromise<U>, other2: MonadicPromise<V>): MonadicPromise<[T, U, V]> {
		return new MonadicPromise(Promise.all([this.promise, other.promise, other2.promise]));
	}

	zip3<U, V, W>(
		p2: MonadicPromise<U>,
		p3: MonadicPromise<V>,
		p4: MonadicPromise<W>,
	): MonadicPromise<[T, U, V, W]> {
		return new MonadicPromise(Promise.all([this.promise, p2.promise, p3.promise, p4.promise]));
	}

	zip4<U, V, W, X>(
		p2: MonadicPromise<U>,
		p3: MonadicPromise<V>,
		p4: MonadicPromise<W>,
		p5: MonadicPromise<X>,
	): MonadicPromise<[T, U, V, W, X]> {
		return new MonadicPromise(Promise.all([this.promise, p2.promise, p3.promise, p4.promise, p5.promise]));
	}

	zip5<U, V, W, X, Y>(
		p2: MonadicPromise<U>,
		p3: MonadicPromise<V>,
		p4: MonadicPromise<W>,
		p5: MonadicPromise<X>,
		p6: MonadicPromise<Y>,
	): MonadicPromise<[T, U, V, W, X, Y]> {
		return new MonadicPromise(Promise.all([this.promise, p2.promise, p3.promise, p4.promise, p5.promise, p6.promise]));
	}

	zip6<U, V, W, X, Y, Z>(
		p2: MonadicPromise<U>,
		p3: MonadicPromise<V>,
		p4: MonadicPromise<W>,
		p5: MonadicPromise<X>,
		p6: MonadicPromise<Y>,
		p7: MonadicPromise<Z>,
	): MonadicPromise<[T, U, V, W, X, Y, Z]> {
		return new MonadicPromise(Promise.all([this.promise, p2.promise, p3.promise, p4.promise, p5.promise, p6.promise, p7.promise]));
	}

	zipN<U>(...promises: Array<MonadicPromise<U>>): MonadicPromise<[T, ...U[]]> {
		return new MonadicPromise(Promise.all([this.promise, ...promises.map(async p => p.promise)]));
	}
}
