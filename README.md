# ts-functional
`ts-functional` is a lightweight, feature-rich library to facilitate basic functional and mixed-paradigm programming in TypeScript.
It provides usable components with a focus on conceptual clarity - its intended use is both as a tool for productive programming and as a resource for learning about, demonstrating and experimenting with basic functional and mixed-paradigm programming in TypeScript.

This library is a work-in-progress - bugfixes and improvements are made frequently.

## Design Decisions
For increased simplicity and conceptual clarity, this library does not venture into higher-kinded-types or their implementation in TypeScript via [Lightweight higher-kinded polymorphism](https://www.cl.cam.ac.uk/~jdy22/papers/lightweight-higher-kinded-polymorphism.pdf) as the wonderful [`fp-ts`](https://gcanti.github.io/fp-ts/) does.
This does limit usability for more complex applications - but allows for far simpler and more immediately intelligible code.

This library also does not implement a wider part of category-theoretical concepts. Natural transformations are not explicitly modeled - neither are all functions/methods curried from the outset (though the `curry` helper-function and the `Curried<F>` helper-type provide the affordance of currying where desired).  Monad-transformers are also not implemented, nor is a point-free style followed. 

The latter is certainly closest to the "categorical" way of thinking - i.e. defining things exclusively in terms of the morphisms to and from them, but this library follows and promotes a mixed-paradigm style, as fully embracing a category-theoretical approach would raise the barrier to understanding.

To facilitate a less theory- and jargon-dependent usage, this library also implements some effect-types similar in style to Scala's [ZIO](https://zio.dev/) in the form of `IO<T>`, `Task<E, O>`, `SafeComputation<I, O>` and `Computation<I, E, O>` (and their `async` counterparts) , which conceptualize monadic effects simply in terms of composable descriptions of computations which potentially take certain inputs, and can potentially fail with a specific error-type or succeed with a specific result-type. Naturally, as opposed to a framework like `ZIO`, the implementations in this library are much simplified and not at all optimized for production usage.

## Naming Conventions
The main interfaces provided and implemented are `Functor`, `Applicative` and `Monad`, with the following declared method-signatures:

### Functor
* `Functor<T>::map<U>(f: (t:T) => U): Functor<U>`
* `Functor<T>::zip<U>(other: Functor<U>): Functor<[T, U]>`
* (`zip<U>(other: Functor<U>): Functor<[T, U]>`)

### Applicative
* `Applicative<T>::pure<U>(t: T): Applicative<T>`
* `Applicative<T>::apply<U>(a: Applicative<(t:T) => U>): Applicative<U>`

### Monad
* `Monad<T>::flatMap<U>(f: (t:T) => Monad<U>): Monad<U>`


Note that the `zip` method is not an essential part of the definition of a functor, but it is very useful. In fact, all the functors, applicatives and monads in this library define not just `zip`, but also `zip2` through `zip6` methods for convenience to avoid having to work with and transform nested 2-tuples.
