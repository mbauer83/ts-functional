import {type Either, Left, Right} from './Either.js';
import {LazyEither} from './LazyEither.js';
import {type Optional} from './Optional.js';

export function optionalToEither<T, L>(optional: Optional<T>, left: L): Either<L, T> {
	return optional.match(
		t => new Right<L, T>(t) as Either<L, T>,
		() => new Left<L, T>(left) as Either<L, T>,
	);
}

export function optionalToLazyEither<T, L>(optional: Optional<T>, left: () => L): Either<L, T> {
	const getter = () => optionalToEither(optional, left());
	return new LazyEither<L, T>(getter, () => []);
}
