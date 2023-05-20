import { Applicative } from "./Applicative";
import { Contravariant } from "./Contravariant";
import { Functor } from "./Functor";
import { Monad } from "./Monad";

export interface NaturalTransformationFunctorFunctor<A, F extends Functor<A>, G extends Functor<A>> {
    (fa: F): G;
}

export interface NaturalTransformationApplicativeApplicative<A, F extends Applicative<A>, G extends Applicative<A>> {
    (fa: F): G;
}

export interface NaturalTransformationMonadMonad<out A, F extends Monad<A>, out G extends Monad<A>> {
    (fa: F): G;
}

export interface NaturalTransformationFunctorApplicative<A, F extends Functor<A>, G extends Applicative<A>> {
    (fa: F): G;
}

export interface NaturalTransformationFunctorMonad<A, F extends Functor<A>, G extends Monad<A>> {
    (fa: F): G;
}

export interface NaturalTransformationApplicativeMonad<A, F extends Applicative<A>, G extends Monad<A>> {
    (fa: F): G;
}

export interface NaturalTransformationMonadApplicative<A, F extends Monad<A>, G extends Applicative<A>> {
    (fa: F): G;
}

export interface NaturalTransformationMonadFunctor<A, F extends Monad<A>, G extends Functor<A>> {
    (fa: F): G;
}

export interface NaturalTransformationApplicativeFunctor<A, F extends Applicative<A>, G extends Functor<A>> {
    (fa: F): G;
}

export interface NaturalTransformationContravariantContravariant<A, F extends Contravariant<F, A>, G extends Contravariant<G, A>> {
    (ga: G): F;
}

export type NaturalTransformation<A> = 
    NaturalTransformationFunctorFunctor<A, Functor<A>, Functor<A>> | 
    NaturalTransformationApplicativeApplicative<A, Applicative<A>, Applicative<A>> | 
    NaturalTransformationMonadMonad<A, Monad<A>, Monad<A>> | 
    NaturalTransformationFunctorApplicative<A, Functor<A>, Applicative<A>> | 
    NaturalTransformationFunctorMonad<A, Functor<A>, Monad<A>> | 
    NaturalTransformationApplicativeMonad<A, Applicative<A>, Monad<A>> | 
    NaturalTransformationMonadApplicative<A, Monad<A>, Applicative<A>> | 
    NaturalTransformationMonadFunctor<A, Monad<A>, Functor<A>> | 
    NaturalTransformationApplicativeFunctor<A, Applicative<A>, Functor<A>> | 
    NaturalTransformationContravariantContravariant<A, Contravariant<any, A>, Contravariant<any, A>>;
