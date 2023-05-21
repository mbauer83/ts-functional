import {type EqualityComparable} from '@mbauer83/ts-utils/src/comparison/equality';
import {type Monad} from './Monad';

export function state<T, S>(f: (s: S) => [T, S]): State<T, S> {
	return new State(f);
}

export class State<T, S> implements Monad<T>, EqualityComparable<State<T, S>> {
	static get<S>(): State<S, S> {
		const stateRunner = (s: S): [S, S] => [s, s];
		return new State(stateRunner);
	}

	static put<S>(s: S): State<void, S> {
		const stateRunner = (_: S): [void, S] => [undefined, s];
		return new State(stateRunner);
	}

	static return<T, S>(t: T) {
		const stateRunner = (s: S): [T, S] => [t, s];
		return new State(stateRunner);
	}

	constructor(public readonly stateRunner: (s: S) => [T, S]) {}
	equals(other: State<T, S>): boolean {
		return this.stateRunner.toString() === other.stateRunner.toString();
	}

	run(s: S): [T, S] {
		return this.stateRunner(s);
	}

	eval(s: S): T {
		return this.stateRunner(s)[0];
	}

	exec(s: S): S {
		return this.stateRunner(s)[1];
	}

	map<U>(f: (x: T) => U): State<U, S> {
		const stateRunner = (s: S): [U, S] => {
			const [t, s1] = this.stateRunner(s);
			return [f(t), s1];
		};

		return new State(stateRunner);
	}

	apply<U>(f: State<(x: T) => U, S>): State<U, S> {
		const stateRunner = (s: S): [U, S] => {
			const [g, s1] = f.stateRunner(s);
			const [t, s2] = this.stateRunner(s1);
			return [g(t), s2];
		};

		return new State(stateRunner);
	}

	pure<U>(x: U): State<U, S> {
		const stateRunner = (s: S): [U, S] => [x, s];
		return new State(stateRunner);
	}

	flatMap<U>(f: (x: T) => State<U, S>): State<U, S> {
		const stateRunner = (s: S): [U, S] => {
			const [t, s1] = this.stateRunner(s);
			return f(t).stateRunner(s1);
		};

		return new State(stateRunner);
	}

	zip<U>(other: State<U, S>): State<[T, U], S> {
		const stateRunner = (s: S): [[T, U], S] => {
			const [t, s1] = this.stateRunner(s);
			const [u, s2] = other.stateRunner(s1);
			return [[t, u], s2];
		};

		return new State(stateRunner);
	}

	modify(f: (s: S) => S): State<void, S> {
		const stateRunner = (s: S): [void, S] => [undefined, f(s)];
		return new State(stateRunner);
	}
}
export function stateFrom<U, S>(u: U) {
	return state<U, S>(s => [u, s]);
}
