import {type Either, Left, Right} from './Either';
import {LazyEither} from './LazyEither';
import {type Optional} from './Optional';

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
