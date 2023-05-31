import {Computation} from './Computation';
import {type Left, Right} from './Either';
import {SafeComputation} from './SafeComputation';

export type Acquisition<Input, Error, Resource> = (i: Input) => Resource | SafeComputation<Input, Resource> | Computation<Input, Error, Resource>;
export type Release<Resource> = ((resource: Resource) => any) | SafeComputation<Resource, any>;
export type ManagedResourceUsage<Resource, Output> = (resource: Resource) => Output | SafeComputation<Resource, Output> | Computation<Resource, any, Output>;

class ManagedResource<in Input, out Error, Resource> {
	private readonly acquire: Computation<Input, Error, Resource>;
	private readonly release: SafeComputation<Resource, any>;

	constructor(
		acquire: Acquisition<Input, Error, Resource>,
		release: Release<Resource>,
	) {
		if (acquire instanceof Computation) {
			this.acquire = acquire;
		} else if (acquire instanceof SafeComputation) {
			this.acquire = new Computation<Input, Error, Resource>((input: Input) => new Right<Error, Resource>((acquire as SafeComputation<Input, Resource>).evaluate(input)));
		} else {
			this.acquire = new Computation<Input, Error, Resource>((input: Input) => new Right<Error, Resource>((acquire as (input: Input) => Resource)(input)));
		}

		this.release
      = release instanceof SafeComputation
				? release
				// eslint-disable-next-line @typescript-eslint/no-unsafe-return
				: new SafeComputation<Resource, any>((resource: Resource) => (release as (resource: Resource) => any)(resource));
	}

	use<Output>(usage: ManagedResourceUsage<Resource, Output>): Computation<Input, Error, Output> {
		const usageAsComputation: Computation<Resource, any, Output> = usage instanceof Computation
			? usage
			: (usage instanceof SafeComputation
				? new Computation<Resource, any, Output>((resource: Resource) => new Right<Error, Output>((usage as SafeComputation<Resource, Output>).evaluate(resource)))
				: new Computation<Resource, any, Output>((resource: Resource) => new Right<Error, Output>((usage as (resource: Resource) => Output)(resource))));

		// Closes over `acquire` and `release`,
		// and uses the resource to evaluate `usage` and return either
		// Left of any error encountered or Right of the result of `usage`.
		const taskResolver = (i: Input) => {
			const acquired = this.acquire.evaluate(i);
			if (acquired.isLeft()) {
				return acquired as any as Left<Error, Output>; // No need to construct a new instance of Left.
			}

			const resource = acquired.get() as Resource;
			const used = usageAsComputation.evaluate(resource);
			this.release.evaluate(resource);
			return used;
		};

		return new Computation<Input, Error, Output>(taskResolver);
	}
}
