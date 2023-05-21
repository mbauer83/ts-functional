import {type Either} from './Either';
import {None, type Optional, Some} from './Optional';

export function eitherToOptional<L, R>(either: Either<L, R>): Optional<R> {
	return either.match(
		l => new None<R>() as Optional<R>,
		r => new Some<R>(r) as Optional<R>,
	);
}
