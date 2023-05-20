# ts-functional
`ts-functional` is a lightweight, feature-rich library to facilitate basic functional and mixed-paradigm programming in TypeScript.
It provides usable components with a focus on conceptual clarity - its intended use is both as a tool for productive programming and as a resource for learning about basic functional and mixed-paradigm programming in TypeScript.

## Design Decisions
For increased simplicity and conceptual clarity, this library does not venture into Higher-Kinded-Types or their implementation in TypeScript via [Lightweight higher-kinded polymorphism](https://www.cl.cam.ac.uk/~jdy22/papers/lightweight-higher-kinded-polymorphism.pdf) as the wonderful [`fp-ts`](https://gcanti.github.io/fp-ts/) does.
This does limit usability for more complex applications - but allows for far simpler and more immediately intelligible code.

## Naming Conventions
The main interfaces provided and implemented are `Functor`, `Applicative` and `Monad`, with the following default methods:

### Functor
* `Functor<T>::map<U>(f: (t:T) => U): Functor<U>`
* `Functor<T>::zip<U>(other: Functor<U>): Functor<[T, U]>`

### Applicative
* `Applicative<T>::pure<U>(t: T): Applicative<T>`
* `Applicative<T>::apply<U>(a: Applicative<(t:T) => U>): Applicative<U>`

### Monad
* `Monad<T>::flatMap<U>(f: (t:T) => Monad<U>): Monad<U>`
