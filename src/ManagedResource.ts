import {AsyncComputation} from './AsyncComputation';
import {AsyncSafeComputation} from './AsyncSafeComputation';
import {Computation} from './Computation';
import {Left, Right} from './Either';
import {SafeComputation} from './SafeComputation';

export type Acquisition<InputT, ErrorT, ResourceT> = (i: InputT) => ResourceT | SafeComputation<InputT, ResourceT> | Computation<InputT, ErrorT, ResourceT>;
export type Release<Resource> = ((resource: Resource) => any) | SafeComputation<Resource, any>;
export type ManagedResourceUsage<Resource, Output> = (resource: Resource) => Output | SafeComputation<Resource, Output> | Computation<Resource, any, Output>;

class ManagedResource<InputT, out ErrorT, ResourceT> {
	private readonly acquire: Computation<InputT, ErrorT, ResourceT>;
	private readonly release: SafeComputation<ResourceT, any>;

	constructor(
		acquire: Acquisition<InputT, ErrorT, ResourceT>,
		release: Release<ResourceT>,
	) {
		if (acquire instanceof Computation) {
			this.acquire = acquire;
		} else if (acquire instanceof SafeComputation) {
			this.acquire = new Computation<InputT, ErrorT, ResourceT>((input: InputT) => new Right<ErrorT, ResourceT>((acquire as SafeComputation<InputT, ResourceT>).evaluate(input)));
		} else {
			this.acquire = new Computation<InputT, ErrorT, ResourceT>((input: InputT) => new Right<ErrorT, ResourceT>((acquire as (input: InputT) => ResourceT)(input)));
		}

		this.release
      = release instanceof SafeComputation
				? release
				// eslint-disable-next-line @typescript-eslint/no-unsafe-return
				: new SafeComputation<ResourceT, any>((resource: ResourceT) => (release as (resource: ResourceT) => any)(resource));
	}

	// Error-type is any because we execute the `usage` function in a try-catch block,
	// and will return any caught error as a Left in the Computation's resolver.
	// A Left containing an ErrorT will be returned from the Computation's resolver
	// if the initial acquisition fails.
	use<OutputT>(usage: ManagedResourceUsage<ResourceT, OutputT>): Computation<InputT, any, OutputT> {
		const usageAsComputation: Computation<ResourceT, any, OutputT> = usage instanceof Computation
			? usage
			: (usage instanceof SafeComputation
				? new Computation<ResourceT, any, OutputT>((resource: ResourceT) => new Right<ErrorT, OutputT>((usage as SafeComputation<ResourceT, OutputT>).evaluate(resource)))
				: new Computation<ResourceT, any, OutputT>((resource: ResourceT) => new Right<ErrorT, OutputT>((usage as (resource: ResourceT) => OutputT)(resource))));

		// Closes over `acquire` and `release`,
		// and uses the resource to evaluate `usage` and return either
		// Left of any error encountered or Right of the result of `usage`.
		const taskResolver = (i: InputT) => {
			const acquired = this.acquire.evaluate(i);
			if (acquired.isLeft()) {
				return acquired as any as Left<ErrorT, OutputT>; // No need to construct a new instance of Left.
			}

			const resource = acquired.get() as ResourceT;
			try {
				const used = usageAsComputation.evaluate(resource);
				this.release.evaluate(resource);
				return used;
			} catch (error) {
				this.release.evaluate(resource);
				return new Left<any, OutputT>(error);
			}
		};

		return new Computation<InputT, ErrorT, OutputT>(taskResolver);
	}
}

export type AsyncAcquisition<InputT, ErrorT, ResourceT> = ((i: InputT) => Promise<ResourceT>) | AsyncSafeComputation<InputT, ResourceT> | AsyncComputation<InputT, ErrorT, ResourceT>;
export type AsyncRelease<ResourceT> = ((resource: ResourceT) => Promise<any>) | AsyncSafeComputation<ResourceT, any>;
export type AsyncManagedResourceUsage<ResourceT, OutputT> = (resource: ResourceT) => Promise<OutputT> | AsyncSafeComputation<ResourceT, OutputT> | AsyncComputation<ResourceT, any, OutputT>;

class AsyncManagedResource<InputT, out ErrorT, ResourceT> {
	private readonly acquire: AsyncComputation<InputT, ErrorT, ResourceT>;
	private readonly release: AsyncSafeComputation<ResourceT, any>;

	constructor(
		acquire: AsyncAcquisition<InputT, ErrorT, ResourceT>,
		release: AsyncRelease<ResourceT>,
	) {
		if (acquire instanceof AsyncComputation) {
			this.acquire = acquire;
		} else if (acquire instanceof AsyncSafeComputation) {
			this.acquire = new AsyncComputation<InputT, ErrorT, ResourceT>(async (input: InputT) => new Right<ErrorT, ResourceT>((await acquire.evaluate(input))));
		} else {
			this.acquire = new AsyncComputation<InputT, ErrorT, ResourceT>(async (input: InputT) => new Right<ErrorT, ResourceT>((await (acquire as (input: InputT) => Promise<ResourceT>)(input))));
		}

		this.release
			= release instanceof AsyncSafeComputation
				? release
				: new AsyncSafeComputation<ResourceT, any>(async (resource: ResourceT) => (release as (resource: ResourceT) => Promise<any>)(resource));
	}

	// Error-type is any because we execute the `usage` function in a try-catch block,
	// and will return any caught error as a Left in the AsyncComputation's resolver.
	// A Left containing an ErrorT will be returned from the AsyncComputation's resolver
	// if the initial acquisition fails.
	use<OutputT>(usage: AsyncManagedResourceUsage<ResourceT, OutputT>): AsyncComputation<InputT, any, OutputT> {
		const usageAsComputation: AsyncComputation<ResourceT, any, OutputT> = usage instanceof AsyncComputation
			? usage
			: (usage instanceof AsyncSafeComputation
				? new AsyncComputation<ResourceT, any, OutputT>(async (resource: ResourceT) => new Right<ErrorT, OutputT>((await (usage as AsyncSafeComputation<ResourceT, OutputT>).evaluate(resource))))
				: new AsyncComputation<ResourceT, any, OutputT>(async (resource: ResourceT) => new Right<ErrorT, OutputT>((await (usage as (resource: ResourceT) => Promise<OutputT>)(resource)))));

		// Closes over `acquire` and `release`,
		// and uses the resource to evaluate `usage` and return either
		// Left of any error encountered or Right of the result of `usage`.
		const taskResolver = async (i: InputT) => {
			const acquired = await this.acquire.evaluate(i);
			if (acquired.isLeft()) {
				return acquired as any as Left<ErrorT, OutputT>; // No need to construct a new instance of Left.
			}

			const resource = acquired.get() as ResourceT;
			try {
				const used = await usageAsComputation.evaluate(resource);
				await this.release.evaluate(resource);
				return used;
			} catch (error) {
				await this.release.evaluate(resource);
				return new Left<any, OutputT>(error);
			}
		};

		return new AsyncComputation<InputT, ErrorT, OutputT>(taskResolver);
	}
}
