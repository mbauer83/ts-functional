import {AsyncComputation} from './AsyncComputation.js';
import {AsyncIO} from './AsyncIO.js';
import {AsyncSafeComputation} from './AsyncSafeComputation.js';
import {AsyncTask} from './AsyncTask.js';
import {Computation} from './Computation.js';
import {Left, Right} from './Either.js';
import {IO} from './IO.js';
import {SafeComputation} from './SafeComputation.js';
import {Task} from './Task.js';

export type Acquisition<InputT, ErrorT, ResourceT> = ((i: InputT) => ResourceT) | IO<ResourceT> | Task<ErrorT, ResourceT> | SafeComputation<InputT, ResourceT> | Computation<InputT, ErrorT, ResourceT>;
export type Release<Resource> = ((resource: Resource) => any) | SafeComputation<Resource, any>;
export type ManagedResourceUsage<ResourceT, ErrorT, OutputT> = (resource: ResourceT) => OutputT | SafeComputation<ResourceT, OutputT> | Computation<ResourceT, ErrorT, OutputT>;

export type ManagedResourceAsyncMappable<InputT, ErrorT, ResourceT>
	= AsyncIO<ResourceT> | AsyncTask<ErrorT, ResourceT> | AsyncSafeComputation<InputT, ResourceT> | AsyncComputation<InputT, ErrorT, ResourceT>;

export type ManagedResourceSyncMappable<InputT, ErrorT, ResourceT>
 = IO<ResourceT> | Task<ErrorT, ResourceT> | SafeComputation<InputT, ResourceT> | Computation<InputT, ErrorT, ResourceT>;

export type ManagedResourceMappable<InputT, ErrorT, ResourceT> = ManagedResourceAsyncMappable<InputT, ErrorT, ResourceT> | ManagedResourceSyncMappable<InputT, ErrorT, ResourceT>;

export class ManagedResource<in InputT, out ErrorT, ResourceT> {
	static fromEffect<Input2T, Error2T, Resource2T, M extends ManagedResourceSyncMappable<Input2T, Error2T, Resource2T>>(effect: M): ManagedResource<Input2T, Error2T, Resource2T> {
		return new ManagedResource<Input2T, Error2T, Resource2T>(effect, (r: Resource2T) => undefined);
	}

	public readonly release: SafeComputation<ResourceT, any>;
	private readonly acquire: Computation<InputT, ErrorT, ResourceT>;

	constructor(
		acquire: Acquisition<InputT, ErrorT, ResourceT>,
		release: Release<ResourceT>,
	) {
		if (acquire instanceof Computation) {
			this.acquire = acquire;
		} else if (acquire instanceof SafeComputation) {
			this.acquire = new Computation<InputT, ErrorT, ResourceT>((input: InputT) => new Right<ErrorT, ResourceT>((acquire).evaluate(input)));
		} else if (acquire instanceof Task) {
			this.acquire = new Computation<InputT, ErrorT, ResourceT>((input: InputT) => acquire.evaluate(input));
		} else if (acquire instanceof IO) {
			this.acquire = new Computation<InputT, ErrorT, ResourceT>((input: InputT) => new Right<ErrorT, ResourceT>(acquire.evaluate()));
		} else {
			this.acquire = new Computation<InputT, ErrorT, ResourceT>((input: InputT) => new Right<ErrorT, ResourceT>((acquire as (input: InputT) => ResourceT)(input)));
		}

		this.release
			= release instanceof SafeComputation
				? release
				// eslint-disable-next-line @typescript-eslint/no-unsafe-return
				: new SafeComputation<ResourceT, any>((resource: ResourceT) => (release as (resource: ResourceT) => any)(resource));
	}

	get unsafeAcquire(): Computation<InputT, ErrorT, ResourceT> {
		return this.acquire;
	}

	// Error-type is any because we execute the `usage` function in a try-catch block,
	// and will return any caught error as a Left in the Computation's resolver.
	// A Left containing an ErrorT will be returned from the Computation's resolver
	// if the initial acquisition fails.
	use<Error2T, OutputT>(usage: ManagedResourceUsage<ResourceT, Error2T, OutputT>): Computation<InputT, ErrorT | Error2T, OutputT> {
		const usageAsComputation: Computation<ResourceT, any, OutputT> = usage instanceof Computation
			? usage
			: (usage instanceof SafeComputation
				? new Computation<ResourceT, ErrorT | Error2T, OutputT>((resource: ResourceT) => new Right<ErrorT | Error2T, OutputT>((usage as SafeComputation<ResourceT, OutputT>).evaluate(resource)))
				: new Computation<ResourceT, any, OutputT>((resource: ResourceT) => new Right<ErrorT | Error2T, OutputT>((usage as (resource: ResourceT) => OutputT)(resource))));

		// Closes over `acquire` and `release`,
		// and uses the resource to evaluate `usage` and return either
		// Left of any error encountered or Right of the result of `usage`.
		const resolver = (i: InputT) => {
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

		return new Computation<InputT, ErrorT, OutputT>(resolver);
	}

	zip<Resource2T>(other: ManagedResource<InputT, ErrorT, Resource2T>): ManagedResource<InputT, ErrorT, [ResourceT, Resource2T]> {
		const acquire = new Computation<InputT, ErrorT, [ResourceT, Resource2T]>((input: InputT) => {
			const acquired = this.acquire.evaluate(input);
			if (acquired.isLeft()) {
				return acquired as Left<ErrorT, [ResourceT, Resource2T]>;
			}

			const acquired2 = other.acquire.evaluate(input);
			if (acquired2.isLeft()) {
				return acquired2 as Left<ErrorT, [ResourceT, Resource2T]>;
			}

			return new Right<ErrorT, [ResourceT, Resource2T]>([acquired.get() as ResourceT, acquired2.get() as Resource2T]);
		});

		const release = new SafeComputation<[ResourceT, Resource2T], void>((resources: [ResourceT, Resource2T]) => {
			try {
			  this.release.evaluate(resources[0]);
			} catch {
			  // Nothing to do
			}

			try {
			  other.release.evaluate(resources[1]);
			} catch {
			  // Nothing to do
			}
		});

		return new ManagedResource<InputT, ErrorT, [ResourceT, Resource2T]>(acquire, release);
	}

	zip2<Resource2T, Resource3T>(
		resource2: ManagedResource<InputT, ErrorT, Resource2T>,
		resource3: ManagedResource<InputT, ErrorT, Resource3T>,
	): ManagedResource<InputT, ErrorT, [ResourceT, Resource2T, Resource3T]> {
		const acquire = new Computation<InputT, ErrorT, [ResourceT, Resource2T, Resource3T]>((input: InputT) => {
			const acquired = this.acquire.evaluate(input);
			if (acquired.isLeft()) {
				return acquired as Left<ErrorT, [ResourceT, Resource2T, Resource3T]>;
			}

			const acquired2 = resource2.acquire.evaluate(input);
			if (acquired2.isLeft()) {
				return acquired2 as Left<ErrorT, [ResourceT, Resource2T, Resource3T]>;
			}

			const acquired3 = resource3.acquire.evaluate(input);
			if (acquired3.isLeft()) {
				return acquired3 as Left<ErrorT, [ResourceT, Resource2T, Resource3T]>;
			}

			return new Right<ErrorT, [ResourceT, Resource2T, Resource3T]>([
				acquired.get() as ResourceT,
				acquired2.get() as Resource2T,
				acquired3.get() as Resource3T,
			]);
		});

		const release = new SafeComputation<[ResourceT, Resource2T, Resource3T], void>((resources: [ResourceT, Resource2T, Resource3T]) => {
			try {
			  this.release.evaluate(resources[0]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource2.release.evaluate(resources[1]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource3.release.evaluate(resources[2]);
			} catch {
			  // Nothing to do
			}
		});

		return new ManagedResource<InputT, ErrorT, [ResourceT, Resource2T, Resource3T]>(acquire, release);
	}

	zip3<Resource2T, Resource3T, Resource4T>(
		resource2: ManagedResource<InputT, ErrorT, Resource2T>,
		resource3: ManagedResource<InputT, ErrorT, Resource3T>,
		resource4: ManagedResource<InputT, ErrorT, Resource4T>,
	): ManagedResource<InputT, ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T]> {
		const acquire = new Computation<InputT, ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T]>((input: InputT) => {
			const acquired = this.acquire.evaluate(input);
			if (acquired.isLeft()) {
				return acquired as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T]>;
			}

			const acquired2 = resource2.acquire.evaluate(input);
			if (acquired2.isLeft()) {
				return acquired2 as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T]>;
			}

			const acquired3 = resource3.acquire.evaluate(input);
			if (acquired3.isLeft()) {
				return acquired3 as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T]>;
			}

			const acquired4 = resource4.acquire.evaluate(input);
			if (acquired4.isLeft()) {
				return acquired4 as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T]>;
			}

			return new Right<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T]>([
				acquired.get() as ResourceT,
				acquired2.get() as Resource2T,
				acquired3.get() as Resource3T,
				acquired4.get() as Resource4T,
			]);
		});

		const release = new SafeComputation<[ResourceT, Resource2T, Resource3T, Resource4T], void>((resources: [ResourceT, Resource2T, Resource3T, Resource4T]) => {
			try {
			  this.release.evaluate(resources[0]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource2.release.evaluate(resources[1]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource3.release.evaluate(resources[2]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource4.release.evaluate(resources[3]);
			} catch {
			  // Nothing to do
			}
		});

		return new ManagedResource<InputT, ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T]>(acquire, release);
	}

	zip4<Resource2T, Resource3T, Resource4T, Resource5T>(
		resource2: ManagedResource<InputT, ErrorT, Resource2T>,
		resource3: ManagedResource<InputT, ErrorT, Resource3T>,
		resource4: ManagedResource<InputT, ErrorT, Resource4T>,
		resource5: ManagedResource<InputT, ErrorT, Resource5T>,
	): ManagedResource<InputT, ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]> {
		const acquire = new Computation<InputT, ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>((input: InputT) => {
			const acquired = this.acquire.evaluate(input);
			if (acquired.isLeft()) {
				return acquired as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>;
			}

			const acquired2 = resource2.acquire.evaluate(input);
			if (acquired2.isLeft()) {
				return acquired2 as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>;
			}

			const acquired3 = resource3.acquire.evaluate(input);
			if (acquired3.isLeft()) {
				return acquired3 as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>;
			}

			const acquired4 = resource4.acquire.evaluate(input);
			if (acquired4.isLeft()) {
				return acquired4 as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>;
			}

			const acquired5 = resource5.acquire.evaluate(input);
			if (acquired5.isLeft()) {
				return acquired5 as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>;
			}

			return new Right<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>([
				acquired.get() as ResourceT,
				acquired2.get() as Resource2T,
				acquired3.get() as Resource3T,
				acquired4.get() as Resource4T,
				acquired5.get() as Resource5T,
			]);
		});

		const release = new SafeComputation<[ResourceT, Resource2T, Resource3T, Resource4T, Resource5T], void>((resources: [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]) => {
			try {
			  this.release.evaluate(resources[0]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource2.release.evaluate(resources[1]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource3.release.evaluate(resources[2]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource4.release.evaluate(resources[3]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource5.release.evaluate(resources[4]);
			} catch {
			  // Nothing to do
			}
		});

		return new ManagedResource<InputT, ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>(acquire, release);
	}

	zip5<Resource2T, Resource3T, Resource4T, Resource5T, Resource6T>(
		resource2: ManagedResource<InputT, ErrorT, Resource2T>,
		resource3: ManagedResource<InputT, ErrorT, Resource3T>,
		resource4: ManagedResource<InputT, ErrorT, Resource4T>,
		resource5: ManagedResource<InputT, ErrorT, Resource5T>,
		resource6: ManagedResource<InputT, ErrorT, Resource6T>,
	): ManagedResource<InputT, ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]> {
		const acquire = new Computation<InputT, ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>((input: InputT) => {
			const acquired = this.acquire.evaluate(input);
			if (acquired.isLeft()) {
				return acquired as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			const acquired2 = resource2.acquire.evaluate(input);
			if (acquired2.isLeft()) {
				return acquired2 as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			const acquired3 = resource3.acquire.evaluate(input);
			if (acquired3.isLeft()) {
				return acquired3 as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			const acquired4 = resource4.acquire.evaluate(input);
			if (acquired4.isLeft()) {
				return acquired4 as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			const acquired5 = resource5.acquire.evaluate(input);
			if (acquired5.isLeft()) {
				return acquired5 as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			const acquired6 = resource6.acquire.evaluate(input);
			if (acquired6.isLeft()) {
				return acquired6 as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			return new Right<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>([
				acquired.get() as ResourceT,
				acquired2.get() as Resource2T,
				acquired3.get() as Resource3T,
				acquired4.get() as Resource4T,
				acquired5.get() as Resource5T,
				acquired6.get() as Resource6T,
			]);
		});

		const release = new SafeComputation<[ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T], void>((resources: [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]) => {
			try {
			  this.release.evaluate(resources[0]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource2.release.evaluate(resources[1]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource3.release.evaluate(resources[2]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource4.release.evaluate(resources[3]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource5.release.evaluate(resources[4]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource6.release.evaluate(resources[5]);
			} catch {
			  // Nothing to do
			}
		});

		return new ManagedResource<InputT, ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>(acquire, release);
	}

	zip6<Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T>(
		resource2: ManagedResource<InputT, ErrorT, Resource2T>,
		resource3: ManagedResource<InputT, ErrorT, Resource3T>,
		resource4: ManagedResource<InputT, ErrorT, Resource4T>,
		resource5: ManagedResource<InputT, ErrorT, Resource5T>,
		resource6: ManagedResource<InputT, ErrorT, Resource6T>,
		resource7: ManagedResource<InputT, ErrorT, Resource7T>,
	): ManagedResource<InputT, ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]> {
		const acquire = new Computation<InputT, ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>((input: InputT) => {
			const acquired = this.acquire.evaluate(input);
			if (acquired.isLeft()) {
				return acquired as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const acquired2 = resource2.acquire.evaluate(input);
			if (acquired2.isLeft()) {
				return acquired2 as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const acquired3 = resource3.acquire.evaluate(input);
			if (acquired3.isLeft()) {
				return acquired3 as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const acquired4 = resource4.acquire.evaluate(input);
			if (acquired4.isLeft()) {
				return acquired4 as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const acquired5 = resource5.acquire.evaluate(input);
			if (acquired5.isLeft()) {
				return acquired5 as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const acquired6 = resource6.acquire.evaluate(input);
			if (acquired6.isLeft()) {
				return acquired6 as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const acquired7 = resource7.acquire.evaluate(input);
			if (acquired7.isLeft()) {
				return acquired7 as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			return new Right<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>([
				acquired.get() as ResourceT,
				acquired2.get() as Resource2T,
				acquired3.get() as Resource3T,
				acquired4.get() as Resource4T,
				acquired5.get() as Resource5T,
				acquired6.get() as Resource6T,
				acquired7.get() as Resource7T,
			]);
		});

		const release = new SafeComputation<[ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T], void>((resources: [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]) => {
			try {
			  this.release.evaluate(resources[0]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource2.release.evaluate(resources[1]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource3.release.evaluate(resources[2]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource4.release.evaluate(resources[3]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource5.release.evaluate(resources[4]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource6.release.evaluate(resources[5]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource7.release.evaluate(resources[6]);
			} catch {
			  // Nothing to do
			}
		});

		return new ManagedResource<InputT, ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>(acquire, release);
	}

	zipWithNewInput<Input2T, Resource2T>(resource2: ManagedResource<Input2T, ErrorT, Resource2T>): ManagedResource<[InputT, Input2T], ErrorT, [ResourceT, Resource2T]> {
		const acquire = new Computation<[InputT, Input2T], ErrorT, [ResourceT, Resource2T]>(([input, input2]: [InputT, Input2T]) => {
			const acquired = this.acquire.evaluate(input);
			if (acquired.isLeft()) {
				return acquired as Left<ErrorT, [ResourceT, Resource2T]>;
			}

			const acquired2 = resource2.acquire.evaluate(input2);
			if (acquired2.isLeft()) {
				return acquired2 as Left<ErrorT, [ResourceT, Resource2T]>;
			}

			return new Right<ErrorT, [ResourceT, Resource2T]>([acquired.get() as ResourceT, acquired2.get() as Resource2T]);
		});

		const release = new SafeComputation<[ResourceT, Resource2T], void>((resources: [ResourceT, Resource2T]) => {
			try {
			  this.release.evaluate(resources[0]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource2.release.evaluate(resources[1]);
			} catch {
			  // Nothing to do
			}
		});

		return new ManagedResource<[InputT, Input2T], ErrorT, [ResourceT, Resource2T]>(acquire, release);
	}

	zip2WithNewInput<Input2T, Input3T, Resource2T, Resource3T>(resource2: ManagedResource<Input2T, ErrorT, Resource2T>, resource3: ManagedResource<Input3T, ErrorT, Resource3T>): ManagedResource<[InputT, Input2T, Input3T], ErrorT, [ResourceT, Resource2T, Resource3T]> {
		const acquire = new Computation<[InputT, Input2T, Input3T], ErrorT, [ResourceT, Resource2T, Resource3T]>(([input, input2, input3]: [InputT, Input2T, Input3T]) => {
			const acquired = this.acquire.evaluate(input);
			if (acquired.isLeft()) {
				return acquired as Left<ErrorT, [ResourceT, Resource2T, Resource3T]>;
			}

			const acquired2 = resource2.acquire.evaluate(input2);
			if (acquired2.isLeft()) {
				return acquired2 as Left<ErrorT, [ResourceT, Resource2T, Resource3T]>;
			}

			const acquired3 = resource3.acquire.evaluate(input3);
			if (acquired3.isLeft()) {
				return acquired3 as Left<ErrorT, [ResourceT, Resource2T, Resource3T]>;
			}

			return new Right<ErrorT, [ResourceT, Resource2T, Resource3T]>([acquired.get() as ResourceT, acquired2.get() as Resource2T, acquired3.get() as Resource3T]);
		});

		const release = new SafeComputation<[ResourceT, Resource2T, Resource3T], void>((resources: [ResourceT, Resource2T, Resource3T]) => {
			try {
			  this.release.evaluate(resources[0]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource2.release.evaluate(resources[1]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource3.release.evaluate(resources[2]);
			} catch {
			  // Nothing to do
			}
		});

		return new ManagedResource<[InputT, Input2T, Input3T], ErrorT, [ResourceT, Resource2T, Resource3T]>(acquire, release);
	}

	zip3WithNewInput<Input2T, Input3T, Input4T, Resource2T, Resource3T, Resource4T>(resource2: ManagedResource<Input2T, ErrorT, Resource2T>, resource3: ManagedResource<Input3T, ErrorT, Resource3T>, resource4: ManagedResource<Input4T, ErrorT, Resource4T>): ManagedResource<[InputT, Input2T, Input3T, Input4T], ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T]> {
		const acquire = new Computation<[InputT, Input2T, Input3T, Input4T], ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T]>(([input, input2, input3, input4]: [InputT, Input2T, Input3T, Input4T]) => {
			const acquired = this.acquire.evaluate(input);
			if (acquired.isLeft()) {
				return acquired as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T]>;
			}

			const acquired2 = resource2.acquire.evaluate(input2);
			if (acquired2.isLeft()) {
				return acquired2 as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T]>;
			}

			const acquired3 = resource3.acquire.evaluate(input3);
			if (acquired3.isLeft()) {
				return acquired3 as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T]>;
			}

			const acquired4 = resource4.acquire.evaluate(input4);
			if (acquired4.isLeft()) {
				return acquired4 as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T]>;
			}

			return new Right<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T]>([acquired.get() as ResourceT, acquired2.get() as Resource2T, acquired3.get() as Resource3T, acquired4.get() as Resource4T]);
		});

		const release = new SafeComputation<[ResourceT, Resource2T, Resource3T, Resource4T], void>((resources: [ResourceT, Resource2T, Resource3T, Resource4T]) => {
			try {
			  this.release.evaluate(resources[0]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource2.release.evaluate(resources[1]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource3.release.evaluate(resources[2]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource4.release.evaluate(resources[3]);
			} catch {
			  // Nothing to do
			}
		});

		return new ManagedResource<[InputT, Input2T, Input3T, Input4T], ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T]>(acquire, release);
	}

	zip4WithNewInput<Input2T, Input3T, Input4T, Input5T, Resource2T, Resource3T, Resource4T, Resource5T>(resource2: ManagedResource<Input2T, ErrorT, Resource2T>, resource3: ManagedResource<Input3T, ErrorT, Resource3T>, resource4: ManagedResource<Input4T, ErrorT, Resource4T>, resource5: ManagedResource<Input5T, ErrorT, Resource5T>): ManagedResource<[InputT, Input2T, Input3T, Input4T, Input5T], ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]> {
		const acquire = new Computation<[InputT, Input2T, Input3T, Input4T, Input5T], ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>(([input, input2, input3, input4, input5]: [InputT, Input2T, Input3T, Input4T, Input5T]) => {
			const acquired = this.acquire.evaluate(input);
			if (acquired.isLeft()) {
				return acquired as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>;
			}

			const acquired2 = resource2.acquire.evaluate(input2);
			if (acquired2.isLeft()) {
				return acquired2 as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>;
			}

			const acquired3 = resource3.acquire.evaluate(input3);
			if (acquired3.isLeft()) {
				return acquired3 as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>;
			}

			const acquired4 = resource4.acquire.evaluate(input4);
			if (acquired4.isLeft()) {
				return acquired4 as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>;
			}

			const acquired5 = resource5.acquire.evaluate(input5);
			if (acquired5.isLeft()) {
				return acquired5 as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>;
			}

			return new Right<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>([acquired.get() as ResourceT, acquired2.get() as Resource2T, acquired3.get() as Resource3T, acquired4.get() as Resource4T, acquired5.get() as Resource5T]);
		});

		const release = new SafeComputation<[ResourceT, Resource2T, Resource3T, Resource4T, Resource5T], void>((resources: [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]) => {
			try {
			  this.release.evaluate(resources[0]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource2.release.evaluate(resources[1]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource3.release.evaluate(resources[2]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource4.release.evaluate(resources[3]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource5.release.evaluate(resources[4]);
			} catch {
			  // Nothing to do
			}
		});

		return new ManagedResource<[InputT, Input2T, Input3T, Input4T, Input5T], ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>(acquire, release);
	}

	zip5WithNewInput<Input2T, Input3T, Input4T, Input5T, Input6T, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T>(
		resource2: ManagedResource<Input2T, ErrorT, Resource2T>,
		resource3: ManagedResource<Input3T, ErrorT, Resource3T>,
		resource4: ManagedResource<Input4T, ErrorT, Resource4T>,
		resource5: ManagedResource<Input5T, ErrorT, Resource5T>,
		resource6: ManagedResource<Input6T, ErrorT, Resource6T>,
	): ManagedResource<[InputT, Input2T, Input3T, Input4T, Input5T, Input6T], ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]> {
		const acquire = new Computation<[InputT, Input2T, Input3T, Input4T, Input5T, Input6T], ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>(([input, input2, input3, input4, input5, input6]: [InputT, Input2T, Input3T, Input4T, Input5T, Input6T]) => {
			const acquired = this.acquire.evaluate(input);
			if (acquired.isLeft()) {
				return acquired as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			const acquired2 = resource2.acquire.evaluate(input2);
			if (acquired2.isLeft()) {
				return acquired2 as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			const acquired3 = resource3.acquire.evaluate(input3);
			if (acquired3.isLeft()) {
				return acquired3 as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			const acquired4 = resource4.acquire.evaluate(input4);
			if (acquired4.isLeft()) {
				return acquired4 as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			const acquired5 = resource5.acquire.evaluate(input5);
			if (acquired5.isLeft()) {
				return acquired5 as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			const acquired6 = resource6.acquire.evaluate(input6);
			if (acquired6.isLeft()) {
				return acquired6 as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			return new Right<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>([
				acquired.get() as ResourceT,
				acquired2.get() as Resource2T,
				acquired3.get() as Resource3T,
				acquired4.get() as Resource4T,
				acquired5.get() as Resource5T,
				acquired6.get() as Resource6T,
			]);
		});

		const release = new SafeComputation<[ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T], void>((resources: [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]) => {
			try {
			  this.release.evaluate(resources[0]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource2.release.evaluate(resources[1]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource3.release.evaluate(resources[2]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource4.release.evaluate(resources[3]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource5.release.evaluate(resources[4]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource6.release.evaluate(resources[5]);
			} catch {
			  // Nothing to do
			}
		});

		return new ManagedResource<[InputT, Input2T, Input3T, Input4T, Input5T, Input6T], ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>(acquire, release);
	}

	zip6WithNewInput<Input2T, Input3T, Input4T, Input5T, Input6T, Input7T, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T>(
		resource2: ManagedResource<Input2T, ErrorT, Resource2T>,
		resource3: ManagedResource<Input3T, ErrorT, Resource3T>,
		resource4: ManagedResource<Input4T, ErrorT, Resource4T>,
		resource5: ManagedResource<Input5T, ErrorT, Resource5T>,
		resource6: ManagedResource<Input6T, ErrorT, Resource6T>,
		resource7: ManagedResource<Input7T, ErrorT, Resource7T>,
	): ManagedResource<[InputT, Input2T, Input3T, Input4T, Input5T, Input6T, Input7T], ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]> {
		const acquire = new Computation<[InputT, Input2T, Input3T, Input4T, Input5T, Input6T, Input7T], ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>(([input, input2, input3, input4, input5, input6, input7]: [InputT, Input2T, Input3T, Input4T, Input5T, Input6T, Input7T]) => {
			const acquired = this.acquire.evaluate(input);
			if (acquired.isLeft()) {
				return acquired as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const acquired2 = resource2.acquire.evaluate(input2);
			if (acquired2.isLeft()) {
				return acquired2 as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const acquired3 = resource3.acquire.evaluate(input3);
			if (acquired3.isLeft()) {
				return acquired3 as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const acquired4 = resource4.acquire.evaluate(input4);
			if (acquired4.isLeft()) {
				return acquired4 as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const acquired5 = resource5.acquire.evaluate(input5);
			if (acquired5.isLeft()) {
				return acquired5 as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const acquired6 = resource6.acquire.evaluate(input6);
			if (acquired6.isLeft()) {
				return acquired6 as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const acquired7 = resource7.acquire.evaluate(input7);
			if (acquired7.isLeft()) {
				return acquired7 as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			return new Right<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>([
				acquired.get() as ResourceT,
				acquired2.get() as Resource2T,
				acquired3.get() as Resource3T,
				acquired4.get() as Resource4T,
				acquired5.get() as Resource5T,
				acquired6.get() as Resource6T,
				acquired7.get() as Resource7T,
			]);
		});

		const release = new SafeComputation<[ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T], void>((resources: [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]) => {
			try {
			  this.release.evaluate(resources[0]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource2.release.evaluate(resources[1]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource3.release.evaluate(resources[2]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource4.release.evaluate(resources[3]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource5.release.evaluate(resources[4]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource6.release.evaluate(resources[5]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource7.release.evaluate(resources[6]);
			} catch {
			  // Nothing to do
			}
		});

		return new ManagedResource<[InputT, Input2T, Input3T, Input4T, Input5T, Input6T, Input7T], ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>(acquire, release);
	}

	zipWithNewError<Error2T, Resource2T>(resource2: ManagedResource<InputT, Error2T, Resource2T>): ManagedResource<InputT, ErrorT | Error2T, [ResourceT, Resource2T]> {
		const acquire = new Computation<InputT, ErrorT | Error2T, [ResourceT, Resource2T]>((input: InputT) => {
			const acquired = this.acquire.evaluate(input);
			if (acquired.isLeft()) {
				return acquired as Left<ErrorT | Error2T, [ResourceT, Resource2T]>;
			}

			const acquired2 = resource2.acquire.evaluate(input);
			if (acquired2.isLeft()) {
				return acquired2 as Left<ErrorT | Error2T, [ResourceT, Resource2T]>;
			}

			return new Right<ErrorT | Error2T, [ResourceT, Resource2T]>([
				acquired.get() as ResourceT,
				acquired2.get() as Resource2T,
			]);
		});

		const release = new SafeComputation<[ResourceT, Resource2T], void>((resources: [ResourceT, Resource2T]) => {
			try {
			  this.release.evaluate(resources[0]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource2.release.evaluate(resources[1]);
			} catch {
			  // Nothing to do
			}
		});

		return new ManagedResource<InputT, ErrorT | Error2T, [ResourceT, Resource2T]>(acquire, release);
	}

	zip2WithNewError<Error2T, Error3T, Resource2T, Resource3T>(
		resource2: ManagedResource<InputT, Error2T, Resource2T>,
		resource3: ManagedResource<InputT, Error3T, Resource3T>,
	): ManagedResource<InputT, ErrorT | Error2T | Error3T, [ResourceT, Resource2T, Resource3T]> {
		const acquire = new Computation<InputT, ErrorT | Error2T | Error3T, [ResourceT, Resource2T, Resource3T]>((input: InputT) => {
			const acquired = this.acquire.evaluate(input);
			if (acquired.isLeft()) {
				return acquired as Left<ErrorT | Error2T | Error3T, [ResourceT, Resource2T, Resource3T]>;
			}

			const acquired2 = resource2.acquire.evaluate(input);
			if (acquired2.isLeft()) {
				return acquired2 as Left<ErrorT | Error2T | Error3T, [ResourceT, Resource2T, Resource3T]>;
			}

			const acquired3 = resource3.acquire.evaluate(input);
			if (acquired3.isLeft()) {
				return acquired3 as Left<ErrorT | Error2T | Error3T, [ResourceT, Resource2T, Resource3T]>;
			}

			return new Right<ErrorT | Error2T | Error3T, [ResourceT, Resource2T, Resource3T]>([
				acquired.get() as ResourceT,
				acquired2.get() as Resource2T,
				acquired3.get() as Resource3T,
			]);
		});

		const release = new SafeComputation<[ResourceT, Resource2T, Resource3T], void>((resources: [ResourceT, Resource2T, Resource3T]) => {
			try {
			  this.release.evaluate(resources[0]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource2.release.evaluate(resources[1]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource3.release.evaluate(resources[2]);
			} catch {
			  // Nothing to do
			}
		});

		return new ManagedResource<InputT, ErrorT | Error2T | Error3T, [ResourceT, Resource2T, Resource3T]>(acquire, release);
	}

	zip3WithNewError<Error2T, Error3T, Error4T, Resource2T, Resource3T, Resource4T>(
		resource2: ManagedResource<InputT, Error2T, Resource2T>,
		resource3: ManagedResource<InputT, Error3T, Resource3T>,
		resource4: ManagedResource<InputT, Error4T, Resource4T>,
	): ManagedResource<InputT, ErrorT | Error2T | Error3T | Error4T, [ResourceT, Resource2T, Resource3T, Resource4T]> {
		const acquire = new Computation<InputT, ErrorT | Error2T | Error3T | Error4T, [ResourceT, Resource2T, Resource3T, Resource4T]>((input: InputT) => {
			const acquired = this.acquire.evaluate(input);
			if (acquired.isLeft()) {
				return acquired as Left<ErrorT | Error2T | Error3T | Error4T, [ResourceT, Resource2T, Resource3T, Resource4T]>;
			}

			const acquired2 = resource2.acquire.evaluate(input);
			if (acquired2.isLeft()) {
				return acquired2 as Left<ErrorT | Error2T | Error3T | Error4T, [ResourceT, Resource2T, Resource3T, Resource4T]>;
			}

			const acquired3 = resource3.acquire.evaluate(input);
			if (acquired3.isLeft()) {
				return acquired3 as Left<ErrorT | Error2T | Error3T | Error4T, [ResourceT, Resource2T, Resource3T, Resource4T]>;
			}

			const acquired4 = resource4.acquire.evaluate(input);
			if (acquired4.isLeft()) {
				return acquired4 as Left<ErrorT | Error2T | Error3T | Error4T, [ResourceT, Resource2T, Resource3T, Resource4T]>;
			}

			return new Right<ErrorT | Error2T | Error3T | Error4T, [ResourceT, Resource2T, Resource3T, Resource4T]>([
				acquired.get() as ResourceT,
				acquired2.get() as Resource2T,
				acquired3.get() as Resource3T,
				acquired4.get() as Resource4T,
			]);
		});

		const release = new SafeComputation<[ResourceT, Resource2T, Resource3T, Resource4T], void>((resources: [ResourceT, Resource2T, Resource3T, Resource4T]) => {
			try {
			  this.release.evaluate(resources[0]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource2.release.evaluate(resources[1]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource3.release.evaluate(resources[2]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource4.release.evaluate(resources[3]);
			} catch {
			  // Nothing to do
			}
		});

		return new ManagedResource<InputT, ErrorT | Error2T | Error3T | Error4T, [ResourceT, Resource2T, Resource3T, Resource4T]>(acquire, release);
	}

	zip4WithNewError<Error2T, Error3T, Error4T, Error5T, Resource2T, Resource3T, Resource4T, Resource5T>(
		resource2: ManagedResource<InputT, Error2T, Resource2T>,
		resource3: ManagedResource<InputT, Error3T, Resource3T>,
		resource4: ManagedResource<InputT, Error4T, Resource4T>,
		resource5: ManagedResource<InputT, Error5T, Resource5T>,
	): ManagedResource<InputT, ErrorT | Error2T | Error3T | Error4T | Error5T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]> {
		const acquire = new Computation<InputT, ErrorT | Error2T | Error3T | Error4T | Error5T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>((input: InputT) => {
			const acquired = this.acquire.evaluate(input);
			if (acquired.isLeft()) {
				return acquired as Left<ErrorT | Error2T | Error3T | Error4T | Error5T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>;
			}

			const acquired2 = resource2.acquire.evaluate(input);
			if (acquired2.isLeft()) {
				return acquired2 as Left<ErrorT | Error2T | Error3T | Error4T | Error5T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>;
			}

			const acquired3 = resource3.acquire.evaluate(input);
			if (acquired3.isLeft()) {
				return acquired3 as Left<ErrorT | Error2T | Error3T | Error4T | Error5T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>;
			}

			const acquired4 = resource4.acquire.evaluate(input);
			if (acquired4.isLeft()) {
				return acquired4 as Left<ErrorT | Error2T | Error3T | Error4T | Error5T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>;
			}

			const acquired5 = resource5.acquire.evaluate(input);
			if (acquired5.isLeft()) {
				return acquired5 as Left<ErrorT | Error2T | Error3T | Error4T | Error5T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>;
			}

			return new Right<ErrorT | Error2T | Error3T | Error4T | Error5T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>([
				acquired.get() as ResourceT,
				acquired2.get() as Resource2T,
				acquired3.get() as Resource3T,
				acquired4.get() as Resource4T,
				acquired5.get() as Resource5T,
			]);
		});

		const release = new SafeComputation<[ResourceT, Resource2T, Resource3T, Resource4T, Resource5T], void>((resources: [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]) => {
			try {
			  this.release.evaluate(resources[0]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource2.release.evaluate(resources[1]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource3.release.evaluate(resources[2]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource4.release.evaluate(resources[3]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource5.release.evaluate(resources[4]);
			} catch {
			  // Nothing to do
			}
		});

		return new ManagedResource<InputT, ErrorT | Error2T | Error3T | Error4T | Error5T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>(acquire, release);
	}

	zip5WithNewError<Error2T, Error3T, Error4T, Error5T, Error6T, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T>(
		resource2: ManagedResource<InputT, Error2T, Resource2T>,
		resource3: ManagedResource<InputT, Error3T, Resource3T>,
		resource4: ManagedResource<InputT, Error4T, Resource4T>,
		resource5: ManagedResource<InputT, Error5T, Resource5T>,
		resource6: ManagedResource<InputT, Error6T, Resource6T>,
	): ManagedResource<InputT, ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]> {
		const acquire = new Computation<InputT, ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>((input: InputT) => {
			const acquired = this.acquire.evaluate(input);
			if (acquired.isLeft()) {
				return acquired as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			const acquired2 = resource2.acquire.evaluate(input);
			if (acquired2.isLeft()) {
				return acquired2 as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			const acquired3 = resource3.acquire.evaluate(input);
			if (acquired3.isLeft()) {
				return acquired3 as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			const acquired4 = resource4.acquire.evaluate(input);
			if (acquired4.isLeft()) {
				return acquired4 as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			const acquired5 = resource5.acquire.evaluate(input);
			if (acquired5.isLeft()) {
				return acquired5 as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			const acquired6 = resource6.acquire.evaluate(input);
			if (acquired6.isLeft()) {
				return acquired6 as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			return new Right<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>([
				acquired.get() as ResourceT,
				acquired2.get() as Resource2T,
				acquired3.get() as Resource3T,
				acquired4.get() as Resource4T,
				acquired5.get() as Resource5T,
				acquired6.get() as Resource6T,
			]);
		});

		const release = new SafeComputation<[ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T], void>((resources: [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]) => {
			try {
			  this.release.evaluate(resources[0]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource2.release.evaluate(resources[1]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource3.release.evaluate(resources[2]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource4.release.evaluate(resources[3]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource5.release.evaluate(resources[4]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource6.release.evaluate(resources[5]);
			} catch {
			  // Nothing to do
			}
		});

		return new ManagedResource<InputT, ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>(acquire, release);
	}

	zip6WithNewError<Error2T, Error3T, Error4T, Error5T, Error6T, Error7T, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T>(
		resource2: ManagedResource<InputT, Error2T, Resource2T>,
		resource3: ManagedResource<InputT, Error3T, Resource3T>,
		resource4: ManagedResource<InputT, Error4T, Resource4T>,
		resource5: ManagedResource<InputT, Error5T, Resource5T>,
		resource6: ManagedResource<InputT, Error6T, Resource6T>,
		resource7: ManagedResource<InputT, Error7T, Resource7T>,
	): ManagedResource<InputT, ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T | Error7T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]> {
		const acquire = new Computation<InputT, ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T | Error7T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>((input: InputT) => {
			const acquired = this.acquire.evaluate(input);
			if (acquired.isLeft()) {
				return acquired as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T | Error7T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const acquired2 = resource2.acquire.evaluate(input);
			if (acquired2.isLeft()) {
				return acquired2 as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T | Error7T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const acquired3 = resource3.acquire.evaluate(input);
			if (acquired3.isLeft()) {
				return acquired3 as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T | Error7T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const acquired4 = resource4.acquire.evaluate(input);
			if (acquired4.isLeft()) {
				return acquired4 as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T | Error7T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const acquired5 = resource5.acquire.evaluate(input);
			if (acquired5.isLeft()) {
				return acquired5 as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T | Error7T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const acquired6 = resource6.acquire.evaluate(input);
			if (acquired6.isLeft()) {
				return acquired6 as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T | Error7T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const acquired7 = resource7.acquire.evaluate(input);
			if (acquired7.isLeft()) {
				return acquired7 as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T | Error7T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			return new Right([
				acquired.get() as ResourceT,
				acquired2.get() as Resource2T,
				acquired3.get() as Resource3T,
				acquired4.get() as Resource4T,
				acquired5.get() as Resource5T,
				acquired6.get() as Resource6T,
				acquired7.get() as Resource7T,
			]);
		});

		const release = new SafeComputation<[ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T], void>((resources: [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]) => {
			try {
			  this.release.evaluate(resources[0]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource2.release.evaluate(resources[1]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource3.release.evaluate(resources[2]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource4.release.evaluate(resources[3]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource5.release.evaluate(resources[4]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource6.release.evaluate(resources[5]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource7.release.evaluate(resources[6]);
			} catch {
			  // Nothing to do
			}
		});

		return new ManagedResource<InputT, ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T | Error7T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>(acquire, release);
	}

	zipWithNewInputAndError<Input2T, Error2T, Resource2T>(resource2: ManagedResource<Input2T, Error2T, Resource2T>): ManagedResource<[InputT, Input2T], ErrorT | Error2T, [ResourceT, Resource2T]> {
		const acquire = new Computation<[InputT, Input2T], ErrorT | Error2T, [ResourceT, Resource2T]>(([input, input2]: [InputT, Input2T]) => {
			const acquired = this.acquire.evaluate(input);
			if (acquired.isLeft()) {
				return acquired as Left<ErrorT | Error2T, [ResourceT, Resource2T]>;
			}

			const acquired2 = resource2.acquire.evaluate(input2);
			if (acquired2.isLeft()) {
				return acquired2 as Left<ErrorT | Error2T, [ResourceT, Resource2T]>;
			}

			return new Right([
				acquired.get() as ResourceT,
				acquired2.get() as Resource2T,
			]);
		});

		const release = new SafeComputation<[ResourceT, Resource2T], void>((resources: [ResourceT, Resource2T]) => {
			try {
			  this.release.evaluate(resources[0]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource2.release.evaluate(resources[1]);
			} catch {
			  // Nothing to do
			}
		});

		return new ManagedResource<[InputT, Input2T], ErrorT | Error2T, [ResourceT, Resource2T]>(acquire, release);
	}

	zip2WithNewInputAndError<Input2T, Input3T, Error2T, Error3T, Resource2T, Resource3T>(
		resource2: ManagedResource<Input2T, Error2T, Resource2T>,
		resource3: ManagedResource<Input3T, Error3T, Resource3T>,
	): ManagedResource<[InputT, Input2T, Input3T], ErrorT | Error2T | Error3T, [ResourceT, Resource2T, Resource3T]> {
		const acquire = new Computation<[InputT, Input2T, Input3T], ErrorT | Error2T | Error3T, [ResourceT, Resource2T, Resource3T]>(([input, input2, input3]: [InputT, Input2T, Input3T]) => {
			const acquired = this.acquire.evaluate(input);
			if (acquired.isLeft()) {
				return acquired as Left<ErrorT | Error2T | Error3T, [ResourceT, Resource2T, Resource3T]>;
			}

			const acquired2 = resource2.acquire.evaluate(input2);
			if (acquired2.isLeft()) {
				return acquired2 as Left<ErrorT | Error2T | Error3T, [ResourceT, Resource2T, Resource3T]>;
			}

			const acquired3 = resource3.acquire.evaluate(input3);
			if (acquired3.isLeft()) {
				return acquired3 as Left<ErrorT | Error2T | Error3T, [ResourceT, Resource2T, Resource3T]>;
			}

			return new Right([
				acquired.get() as ResourceT,
				acquired2.get() as Resource2T,
				acquired3.get() as Resource3T,
			]);
		});

		const release = new SafeComputation<[ResourceT, Resource2T, Resource3T], void>((resources: [ResourceT, Resource2T, Resource3T]) => {
			try {
			  this.release.evaluate(resources[0]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource2.release.evaluate(resources[1]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource3.release.evaluate(resources[2]);
			} catch {
			  // Nothing to do
			}
		});

		return new ManagedResource<[InputT, Input2T, Input3T], ErrorT | Error2T | Error3T, [ResourceT, Resource2T, Resource3T]>(acquire, release);
	}

	zip3WithNewInputAndError<Input2T, Input3T, Input4T, Error2T, Error3T, Error4T, Resource2T, Resource3T, Resource4T>(
		resource2: ManagedResource<Input2T, Error2T, Resource2T>,
		resource3: ManagedResource<Input3T, Error3T, Resource3T>,
		resource4: ManagedResource<Input4T, Error4T, Resource4T>,
	): ManagedResource<[InputT, Input2T, Input3T, Input4T], ErrorT | Error2T | Error3T | Error4T, [ResourceT, Resource2T, Resource3T, Resource4T]> {
		const acquire = new Computation<[InputT, Input2T, Input3T, Input4T], ErrorT | Error2T | Error3T | Error4T, [ResourceT, Resource2T, Resource3T, Resource4T]>(([input, input2, input3, input4]: [InputT, Input2T, Input3T, Input4T]) => {
			const acquired = this.acquire.evaluate(input);
			if (acquired.isLeft()) {
				return acquired as Left<ErrorT | Error2T | Error3T | Error4T, [ResourceT, Resource2T, Resource3T, Resource4T]>;
			}

			const acquired2 = resource2.acquire.evaluate(input2);
			if (acquired2.isLeft()) {
				return acquired2 as Left<ErrorT | Error2T | Error3T | Error4T, [ResourceT, Resource2T, Resource3T, Resource4T]>;
			}

			const acquired3 = resource3.acquire.evaluate(input3);
			if (acquired3.isLeft()) {
				return acquired3 as Left<ErrorT | Error2T | Error3T | Error4T, [ResourceT, Resource2T, Resource3T, Resource4T]>;
			}

			const acquired4 = resource4.acquire.evaluate(input4);
			if (acquired4.isLeft()) {
				return acquired4 as Left<ErrorT | Error2T | Error3T | Error4T, [ResourceT, Resource2T, Resource3T, Resource4T]>;
			}

			return new Right([
				acquired.get() as ResourceT,
				acquired2.get() as Resource2T,
				acquired3.get() as Resource3T,
				acquired4.get() as Resource4T,
			]);
		});

		const release = new SafeComputation<[ResourceT, Resource2T, Resource3T, Resource4T], void>((resources: [ResourceT, Resource2T, Resource3T, Resource4T]) => {
			try {
			  this.release.evaluate(resources[0]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource2.release.evaluate(resources[1]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource3.release.evaluate(resources[2]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource4.release.evaluate(resources[3]);
			} catch {
			  // Nothing to do
			}
		});

		return new ManagedResource<[InputT, Input2T, Input3T, Input4T], ErrorT | Error2T | Error3T | Error4T, [ResourceT, Resource2T, Resource3T, Resource4T]>(acquire, release);
	}

	zip4WithNewInputAndError<
		Input2T,
		Input3T,
		Input4T,
		Input5T,
		Error2T,
		Error3T,
		Error4T,
		Error5T,
		Resource2T,
		Resource3T,
		Resource4T,
		Resource5T,
	>(
		resource2: ManagedResource<Input2T, Error2T, Resource2T>,
		resource3: ManagedResource<Input3T, Error3T, Resource3T>,
		resource4: ManagedResource<Input4T, Error4T, Resource4T>,
		resource5: ManagedResource<Input5T, Error5T, Resource5T>,
	): ManagedResource<[InputT, Input2T, Input3T, Input4T, Input5T], ErrorT | Error2T | Error3T | Error4T | Error5T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]> {
		const acquire = new Computation<[InputT, Input2T, Input3T, Input4T, Input5T], ErrorT | Error2T | Error3T | Error4T | Error5T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>(([input, input2, input3, input4, input5]: [InputT, Input2T, Input3T, Input4T, Input5T]) => {
			const acquired = this.acquire.evaluate(input);
			if (acquired.isLeft()) {
				return acquired as Left<ErrorT | Error2T | Error3T | Error4T | Error5T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>;
			}

			const acquired2 = resource2.acquire.evaluate(input2);
			if (acquired2.isLeft()) {
				return acquired2 as Left<ErrorT | Error2T | Error3T | Error4T | Error5T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>;
			}

			const acquired3 = resource3.acquire.evaluate(input3);
			if (acquired3.isLeft()) {
				return acquired3 as Left<ErrorT | Error2T | Error3T | Error4T | Error5T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>;
			}

			const acquired4 = resource4.acquire.evaluate(input4);
			if (acquired4.isLeft()) {
				return acquired4 as Left<ErrorT | Error2T | Error3T | Error4T | Error5T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>;
			}

			const acquired5 = resource5.acquire.evaluate(input5);
			if (acquired5.isLeft()) {
				return acquired5 as Left<ErrorT | Error2T | Error3T | Error4T | Error5T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>;
			}

			return new Right([
				acquired.get() as ResourceT,
				acquired2.get() as Resource2T,
				acquired3.get() as Resource3T,
				acquired4.get() as Resource4T,
				acquired5.get() as Resource5T,
			]);
		});

		const release = new SafeComputation<[ResourceT, Resource2T, Resource3T, Resource4T, Resource5T], void>((resources: [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]) => {
			try {
			  this.release.evaluate(resources[0]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource2.release.evaluate(resources[1]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource3.release.evaluate(resources[2]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource4.release.evaluate(resources[3]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource5.release.evaluate(resources[4]);
			} catch {
			  // Nothing to do
			}
		});

		return new ManagedResource<[InputT, Input2T, Input3T, Input4T, Input5T], ErrorT | Error2T | Error3T | Error4T | Error5T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>(acquire, release);
	}

	zip5WithNewInputAndError<
		Input2T,
		Input3T,
		Input4T,
		Input5T,
		Input6T,
		Error2T,
		Error3T,
		Error4T,
		Error5T,
		Error6T,
		Resource2T,
		Resource3T,
		Resource4T,
		Resource5T,
		Resource6T,
	>(
		resource2: ManagedResource<Input2T, Error2T, Resource2T>,
		resource3: ManagedResource<Input3T, Error3T, Resource3T>,
		resource4: ManagedResource<Input4T, Error4T, Resource4T>,
		resource5: ManagedResource<Input5T, Error5T, Resource5T>,
		resource6: ManagedResource<Input6T, Error6T, Resource6T>,
	): ManagedResource<[InputT, Input2T, Input3T, Input4T, Input5T, Input6T], ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]> {
		const acquire = new Computation<[InputT, Input2T, Input3T, Input4T, Input5T, Input6T], ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>(([input, input2, input3, input4, input5, input6]: [InputT, Input2T, Input3T, Input4T, Input5T, Input6T]) => {
			const acquired = this.acquire.evaluate(input);
			if (acquired.isLeft()) {
				return acquired as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			const acquired2 = resource2.acquire.evaluate(input2);
			if (acquired2.isLeft()) {
				return acquired2 as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			const acquired3 = resource3.acquire.evaluate(input3);
			if (acquired3.isLeft()) {
				return acquired3 as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			const acquired4 = resource4.acquire.evaluate(input4);
			if (acquired4.isLeft()) {
				return acquired4 as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			const acquired5 = resource5.acquire.evaluate(input5);
			if (acquired5.isLeft()) {
				return acquired5 as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			const acquired6 = resource6.acquire.evaluate(input6);
			if (acquired6.isLeft()) {
				return acquired6 as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			return new Right([
				acquired.get() as ResourceT,
				acquired2.get() as Resource2T,
				acquired3.get() as Resource3T,
				acquired4.get() as Resource4T,
				acquired5.get() as Resource5T,
				acquired6.get() as Resource6T,
			]);
		});

		const release = new SafeComputation<[ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T], void>((resources: [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]) => {
			try {
			  this.release.evaluate(resources[0]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource2.release.evaluate(resources[1]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource3.release.evaluate(resources[2]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource4.release.evaluate(resources[3]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource5.release.evaluate(resources[4]);
			} catch {
			  // Nothing to do
			}

			try {
			  resource6.release.evaluate(resources[5]);
			} catch {
			  // Nothing to do
			}
		});

		return new ManagedResource<[InputT, Input2T, Input3T, Input4T, Input5T, Input6T], ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>(acquire, release);
	}

	zip6WithNewInputAndError<
		Input2T,
		Input3T,
		Input4T,
		Input5T,
		Input6T,
		Input7T,
		Error2T,
		Error3T,
		Error4T,
		Error5T,
		Error6T,
		Error7T,
		Resource2T,
		Resource3T,
		Resource4T,
		Resource5T,
		Resource6T,
		Resource7T,
	>(
		resource2: ManagedResource<Input2T, Error2T, Resource2T>,
		resource3: ManagedResource<Input3T, Error3T, Resource3T>,
		resource4: ManagedResource<Input4T, Error4T, Resource4T>,
		resource5: ManagedResource<Input5T, Error5T, Resource5T>,
		resource6: ManagedResource<Input6T, Error6T, Resource6T>,
		resource7: ManagedResource<Input7T, Error7T, Resource7T>,
	): ManagedResource<
		[InputT, Input2T, Input3T, Input4T, Input5T, Input6T, Input7T],
		ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T | Error7T,
		[ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]
		> {
		const acquire = new Computation<[InputT, Input2T, Input3T, Input4T, Input5T, Input6T, Input7T], ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T | Error7T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>((input: [InputT, Input2T, Input3T, Input4T, Input5T, Input6T, Input7T]) => {
			const acquired = this.acquire.evaluate(input[0]);
			if (acquired.isLeft()) {
				return acquired as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T | Error7T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const acquired2 = resource2.acquire.evaluate(input[1]);
			if (acquired2.isLeft()) {
				return acquired2 as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T | Error7T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const acquired3 = resource3.acquire.evaluate(input[2]);
			if (acquired3.isLeft()) {
				return acquired3 as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T | Error7T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const acquired4 = resource4.acquire.evaluate(input[3]);
			if (acquired4.isLeft()) {
				return acquired4 as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T | Error7T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const acquired5 = resource5.acquire.evaluate(input[4]);
			if (acquired5.isLeft()) {
				return acquired5 as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T | Error7T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const acquired6 = resource6.acquire.evaluate(input[5]);
			if (acquired6.isLeft()) {
				return acquired6 as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T | Error7T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const acquired7 = resource7.acquire.evaluate(input[6]);
			if (acquired7.isLeft()) {
				return acquired7 as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T | Error7T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			return new Right([
				acquired.get() as ResourceT,
				acquired2.get() as Resource2T,
				acquired3.get() as Resource3T,
				acquired4.get() as Resource4T,
				acquired5.get() as Resource5T,
				acquired6.get() as Resource6T,
				acquired7.get() as Resource7T,
			]);
		});

		const release
			= new SafeComputation<[ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T], void>(
				(resources: [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]) => {
					try {
					  this.release.evaluate(resources[0]);
					} catch {
					  // Nothing to do
					}

					try {
					  resource2.release.evaluate(resources[1]);
					} catch {
					  // Nothing to do
					}

					try {
					  resource3.release.evaluate(resources[2]);
					} catch {
					  // Nothing to do
					}

					try {
					  resource4.release.evaluate(resources[3]);
					} catch {
					  // Nothing to do
					}

					try {
					  resource5.release.evaluate(resources[4]);
					} catch {
					  // Nothing to do
					}

					try {
					  resource6.release.evaluate(resources[5]);
					} catch {
					  // Nothing to do
					}

					try {
					  resource7.release.evaluate(resources[6]);
					} catch {
					  // Nothing to do
					}
				});

		return new ManagedResource(acquire, release);
	}

	toAsync(): AsyncManagedResource<InputT, ErrorT, ResourceT> {
		return new AsyncManagedResource<InputT, ErrorT, ResourceT>(this.acquire.toAsync(), this.release.toAsync());
	}
}

export type AsyncAcquisition<InputT, ErrorT, ResourceT> = ((i: InputT) => Promise<ResourceT>) | AsyncIO<ResourceT> | IO<ResourceT> | AsyncSafeComputation<InputT, ResourceT> | SafeComputation<InputT, ResourceT> | AsyncTask<ErrorT, ResourceT> | Task<ErrorT, ResourceT> | AsyncComputation<InputT, ErrorT, ResourceT> | Computation<InputT, ErrorT, ResourceT>;
export type AsyncRelease<ResourceT> = ((resource: ResourceT) => Promise<any>) | AsyncSafeComputation<ResourceT, any>;
export type AsyncManagedResourceUsage<ResourceT, OutputT> = (resource: ResourceT) => Promise<OutputT> | AsyncSafeComputation<ResourceT, OutputT> | AsyncComputation<ResourceT, any, OutputT>;

export class AsyncManagedResource<InputT, out ErrorT, ResourceT> {
	static fromEffect<Input2T, Error2T, Resource2T, M extends ManagedResourceMappable<Input2T, Error2T, Resource2T>>(mappable: M): AsyncManagedResource<Input2T, Error2T, Resource2T> {
		return new AsyncManagedResource<Input2T, Error2T, Resource2T>(mappable, async (r: Resource2T) => undefined);
	}

	public readonly release: AsyncSafeComputation<ResourceT, any>;
	private readonly acquire: AsyncComputation<InputT, ErrorT, ResourceT>;

	constructor(
		acquire: AsyncAcquisition<InputT, ErrorT, ResourceT>,
		release: AsyncRelease<ResourceT>,
	) {
		const asyncAcquire
			= (
				acquire instanceof IO
				|| acquire instanceof Task
				|| acquire instanceof SafeComputation
				|| acquire instanceof Computation
			) ? acquire.toAsync() : acquire;

		if (asyncAcquire instanceof AsyncComputation) {
			this.acquire = asyncAcquire;
		} else if (asyncAcquire instanceof AsyncSafeComputation) {
			this.acquire = new AsyncComputation<InputT, ErrorT, ResourceT>(async (input: InputT) => new Right<ErrorT, ResourceT>((await asyncAcquire.evaluate(input))));
		} else if (asyncAcquire instanceof AsyncTask) {
			this.acquire = new AsyncComputation<InputT, ErrorT, ResourceT>(async (input: InputT) => (acquire as AsyncTask<ErrorT, ResourceT>).evaluate(input));
		} else if (asyncAcquire instanceof AsyncIO) {
			this.acquire = new AsyncComputation<InputT, ErrorT, ResourceT>(async (_: InputT) => new Right<ErrorT, ResourceT>(await asyncAcquire.evaluate()));
		} else {
			this.acquire = new AsyncComputation<InputT, ErrorT, ResourceT>(async (input: InputT) => new Right<ErrorT, ResourceT>((await asyncAcquire(input))));
		}

		this.release
			= release instanceof AsyncSafeComputation
				? release
				: new AsyncSafeComputation<ResourceT, any>(async (resource: ResourceT) => (release as (resource: ResourceT) => Promise<any>)(resource));
	}

	get unsafeAcquire(): AsyncComputation<InputT, ErrorT, ResourceT> {
		return this.acquire;
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
		const resolver = async (i: InputT) => {
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

		return new AsyncComputation<InputT, ErrorT, OutputT>(resolver);
	}

	zip<Resource2T>(other: AsyncManagedResource<InputT, ErrorT, Resource2T>): AsyncManagedResource<InputT, ErrorT, [ResourceT, Resource2T]> {
		const acquire = new AsyncComputation(async (input: InputT) => {
			const resource1 = await this.acquire.evaluate(input);
			if (resource1.isLeft()) {
				return resource1 as Left<ErrorT, [ResourceT, Resource2T]>;
			}

			const resource2 = await other.acquire.evaluate(input);
			if (resource2.isLeft()) {
				return resource2 as Left<ErrorT, [ResourceT, Resource2T]>;
			}

			return new Right<ErrorT, [ResourceT, Resource2T]>([
				resource1.get() as ResourceT,
				resource2.get() as Resource2T,
			]);
		});

		const release = new AsyncSafeComputation(async (resources: [ResourceT, Resource2T]) => {
			try {
			  await this.release.evaluate(resources[0]);
			} catch {
			  // Nothing to do
			}

			try {
			  await other.release.evaluate(resources[1]);
			} catch {
			  // Nothing to do
			}
		});

		return new AsyncManagedResource<InputT, ErrorT, [ResourceT, Resource2T]>(acquire, release);
	}

	zip2<Resource2T, Resource3T>(
		resource2: AsyncManagedResource<InputT, ErrorT, Resource2T>,
		resource3: AsyncManagedResource<InputT, ErrorT, Resource3T>,
	): AsyncManagedResource<InputT, ErrorT, [ResourceT, Resource2T, Resource3T]> {
		const acquire = new AsyncComputation(async (input: InputT) => {
			const resource1Resolved = await this.acquire.evaluate(input);
			if (resource1Resolved.isLeft()) {
				return resource1Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T]>;
			}

			const resource2Resolved = await resource2.acquire.evaluate(input);
			if (resource2Resolved.isLeft()) {
				return resource2Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T]>;
			}

			const resource3Resolved = await resource3.acquire.evaluate(input);
			if (resource3Resolved.isLeft()) {
				return resource3Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T]>;
			}

			return new Right<ErrorT, [ResourceT, Resource2T, Resource3T]>([
				resource1Resolved.get() as ResourceT,
				resource2Resolved.get() as Resource2T,
				resource3Resolved.get() as Resource3T,
			]);
		});

		const release = new AsyncSafeComputation(async (resources: [ResourceT, Resource2T, Resource3T]) => {
			try {
			  await this.release.evaluate(resources[0]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource2.release.evaluate(resources[1]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource3.release.evaluate(resources[2]);
			} catch {
			  // Nothing to do
			}
		});

		return new AsyncManagedResource<InputT, ErrorT, [ResourceT, Resource2T, Resource3T]>(acquire, release);
	}

	zip3<Resource2T, Resource3T, Resource4T>(
		resource2: AsyncManagedResource<InputT, ErrorT, Resource2T>,
		resource3: AsyncManagedResource<InputT, ErrorT, Resource3T>,
		resource4: AsyncManagedResource<InputT, ErrorT, Resource4T>,
	): AsyncManagedResource<InputT, ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T]> {
		const acquire = new AsyncComputation(async (input: InputT) => {
			const resource1Resolved = await this.acquire.evaluate(input);
			if (resource1Resolved.isLeft()) {
				return resource1Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T]>;
			}

			const resource2Resolved = await resource2.acquire.evaluate(input);
			if (resource2Resolved.isLeft()) {
				return resource2Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T]>;
			}

			const resource3Resolved = await resource3.acquire.evaluate(input);
			if (resource3Resolved.isLeft()) {
				return resource3Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T]>;
			}

			const resource4Resolved = await resource4.acquire.evaluate(input);
			if (resource4Resolved.isLeft()) {
				return resource4Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T]>;
			}

			return new Right<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T]>([
				resource1Resolved.get() as ResourceT,
				resource2Resolved.get() as Resource2T,
				resource3Resolved.get() as Resource3T,
				resource4Resolved.get() as Resource4T,
			]);
		});

		const release = new AsyncSafeComputation(async (resources: [ResourceT, Resource2T, Resource3T, Resource4T]) => {
			try {
			  await this.release.evaluate(resources[0]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource2.release.evaluate(resources[1]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource3.release.evaluate(resources[2]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource4.release.evaluate(resources[3]);
			} catch {
			  // Nothing to do
			}
		});

		return new AsyncManagedResource<InputT, ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T]>(acquire, release);
	}

	zip4<Resource2T, Resource3T, Resource4T, Resource5T>(
		resource2: AsyncManagedResource<InputT, ErrorT, Resource2T>,
		resource3: AsyncManagedResource<InputT, ErrorT, Resource3T>,
		resource4: AsyncManagedResource<InputT, ErrorT, Resource4T>,
		resource5: AsyncManagedResource<InputT, ErrorT, Resource5T>,
	): AsyncManagedResource<InputT, ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]> {
		const acquire = new AsyncComputation(async (input: InputT) => {
			const resource1Resolved = await this.acquire.evaluate(input);
			if (resource1Resolved.isLeft()) {
				return resource1Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>;
			}

			const resource2Resolved = await resource2.acquire.evaluate(input);
			if (resource2Resolved.isLeft()) {
				return resource2Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>;
			}

			const resource3Resolved = await resource3.acquire.evaluate(input);
			if (resource3Resolved.isLeft()) {
				return resource3Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>;
			}

			const resource4Resolved = await resource4.acquire.evaluate(input);
			if (resource4Resolved.isLeft()) {
				return resource4Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>;
			}

			const resource5Resolved = await resource5.acquire.evaluate(input);
			if (resource5Resolved.isLeft()) {
				return resource5Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>;
			}

			return new Right<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>([
				resource1Resolved.get() as ResourceT,
				resource2Resolved.get() as Resource2T,
				resource3Resolved.get() as Resource3T,
				resource4Resolved.get() as Resource4T,
				resource5Resolved.get() as Resource5T,
			]);
		});

		const release = new AsyncSafeComputation(async (resources: [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]) => {
			try {
			  await this.release.evaluate(resources[0]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource2.release.evaluate(resources[1]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource3.release.evaluate(resources[2]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource4.release.evaluate(resources[3]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource5.release.evaluate(resources[4]);
			} catch {
			  // Nothing to do
			}
		});

		return new AsyncManagedResource<InputT, ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>(acquire, release);
	}

	zip5<Resource2T, Resource3T, Resource4T, Resource5T, Resource6T>(
		resource2: AsyncManagedResource<InputT, ErrorT, Resource2T>,
		resource3: AsyncManagedResource<InputT, ErrorT, Resource3T>,
		resource4: AsyncManagedResource<InputT, ErrorT, Resource4T>,
		resource5: AsyncManagedResource<InputT, ErrorT, Resource5T>,
		resource6: AsyncManagedResource<InputT, ErrorT, Resource6T>,
	): AsyncManagedResource<InputT, ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]> {
		const acquire = new AsyncComputation(async (input: InputT) => {
			const resource1Resolved = await this.acquire.evaluate(input);
			if (resource1Resolved.isLeft()) {
				return resource1Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			const resource2Resolved = await resource2.acquire.evaluate(input);
			if (resource2Resolved.isLeft()) {
				return resource2Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			const resource3Resolved = await resource3.acquire.evaluate(input);
			if (resource3Resolved.isLeft()) {
				return resource3Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			const resource4Resolved = await resource4.acquire.evaluate(input);
			if (resource4Resolved.isLeft()) {
				return resource4Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			const resource5Resolved = await resource5.acquire.evaluate(input);
			if (resource5Resolved.isLeft()) {
				return resource5Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			const resource6Resolved = await resource6.acquire.evaluate(input);
			if (resource6Resolved.isLeft()) {
				return resource6Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			return new Right<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>([
				resource1Resolved.get() as ResourceT,
				resource2Resolved.get() as Resource2T,
				resource3Resolved.get() as Resource3T,
				resource4Resolved.get() as Resource4T,
				resource5Resolved.get() as Resource5T,
				resource6Resolved.get() as Resource6T,
			]);
		});

		const release = new AsyncSafeComputation(async (resources: [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]) => {
			try {
			  await this.release.evaluate(resources[0]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource2.release.evaluate(resources[1]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource3.release.evaluate(resources[2]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource4.release.evaluate(resources[3]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource5.release.evaluate(resources[4]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource6.release.evaluate(resources[5]);
			} catch {
			  // Nothing to do
			}
		});

		return new AsyncManagedResource<InputT, ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>(acquire, release);
	}

	zip6<Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T>(
		resource2: AsyncManagedResource<InputT, ErrorT, Resource2T>,
		resource3: AsyncManagedResource<InputT, ErrorT, Resource3T>,
		resource4: AsyncManagedResource<InputT, ErrorT, Resource4T>,
		resource5: AsyncManagedResource<InputT, ErrorT, Resource5T>,
		resource6: AsyncManagedResource<InputT, ErrorT, Resource6T>,
		resource7: AsyncManagedResource<InputT, ErrorT, Resource7T>,
	): AsyncManagedResource<InputT, ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]> {
		const acquire = new AsyncComputation(async (input: InputT) => {
			const resource1Resolved = await this.acquire.evaluate(input);
			if (resource1Resolved.isLeft()) {
				return resource1Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const resource2Resolved = await resource2.acquire.evaluate(input);
			if (resource2Resolved.isLeft()) {
				return resource2Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const resource3Resolved = await resource3.acquire.evaluate(input);
			if (resource3Resolved.isLeft()) {
				return resource3Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const resource4Resolved = await resource4.acquire.evaluate(input);
			if (resource4Resolved.isLeft()) {
				return resource4Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const resource5Resolved = await resource5.acquire.evaluate(input);
			if (resource5Resolved.isLeft()) {
				return resource5Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const resource6Resolved = await resource6.acquire.evaluate(input);
			if (resource6Resolved.isLeft()) {
				return resource6Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const resource7Resolved = await resource7.acquire.evaluate(input);
			if (resource7Resolved.isLeft()) {
				return resource7Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			return new Right<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>([
				resource1Resolved.get() as ResourceT,
				resource2Resolved.get() as Resource2T,
				resource3Resolved.get() as Resource3T,
				resource4Resolved.get() as Resource4T,
				resource5Resolved.get() as Resource5T,
				resource6Resolved.get() as Resource6T,
				resource7Resolved.get() as Resource7T,
			]);
		});

		const release = new AsyncSafeComputation(async (resources: [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]) => {
			try {
			  await this.release.evaluate(resources[0]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource2.release.evaluate(resources[1]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource3.release.evaluate(resources[2]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource4.release.evaluate(resources[3]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource5.release.evaluate(resources[4]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource6.release.evaluate(resources[5]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource7.release.evaluate(resources[6]);
			} catch {
			  // Nothing to do
			}
		});

		return new AsyncManagedResource<InputT, ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>(acquire, release);
	}

	zipWithNewInput<Input2T, Resource2T>(
		resource2: AsyncManagedResource<Input2T, ErrorT, Resource2T>,
	): AsyncManagedResource<[InputT, Input2T], ErrorT, [ResourceT, Resource2T]> {
		const acquire = new AsyncComputation(async (inputs: [InputT, Input2T]) => {
			const resource1Resolved = await this.acquire.evaluate(inputs[0]);
			if (resource1Resolved.isLeft()) {
				return resource1Resolved as Left<ErrorT, [ResourceT, Resource2T]>;
			}

			const resource2Resolved = await resource2.acquire.evaluate(inputs[1]);
			if (resource2Resolved.isLeft()) {
				return resource2Resolved as Left<ErrorT, [ResourceT, Resource2T]>;
			}

			return new Right<ErrorT, [ResourceT, Resource2T]>([
				resource1Resolved.get() as ResourceT,
				resource2Resolved.get() as Resource2T,
			]);
		});

		const release = new AsyncSafeComputation(async (resources: [ResourceT, Resource2T]) => {
			try {
			  await this.release.evaluate(resources[0]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource2.release.evaluate(resources[1]);
			} catch {
			  // Nothing to do
			}
		});

		return new AsyncManagedResource<[InputT, Input2T], ErrorT, [ResourceT, Resource2T]>(acquire, release);
	}

	zip2WithNewInput<Input2T, Resource2T, Input3T, Resource3T>(
		resource2: AsyncManagedResource<Input2T, ErrorT, Resource2T>,
		resource3: AsyncManagedResource<Input3T, ErrorT, Resource3T>,
	): AsyncManagedResource<[InputT, Input2T, Input3T], ErrorT, [ResourceT, Resource2T, Resource3T]> {
		const acquire = new AsyncComputation(async (inputs: [InputT, Input2T, Input3T]) => {
			const resource1Resolved = await this.acquire.evaluate(inputs[0]);
			if (resource1Resolved.isLeft()) {
				return resource1Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T]>;
			}

			const resource2Resolved = await resource2.acquire.evaluate(inputs[1]);
			if (resource2Resolved.isLeft()) {
				return resource2Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T]>;
			}

			const resource3Resolved = await resource3.acquire.evaluate(inputs[2]);
			if (resource3Resolved.isLeft()) {
				return resource3Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T]>;
			}

			return new Right<ErrorT, [ResourceT, Resource2T, Resource3T]>([
				resource1Resolved.get() as ResourceT,
				resource2Resolved.get() as Resource2T,
				resource3Resolved.get() as Resource3T,
			]);
		});

		const release = new AsyncSafeComputation(async (resources: [ResourceT, Resource2T, Resource3T]) => {
			try {
			  await this.release.evaluate(resources[0]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource2.release.evaluate(resources[1]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource3.release.evaluate(resources[2]);
			} catch {
			  // Nothing to do
			}
		});

		return new AsyncManagedResource<[InputT, Input2T, Input3T], ErrorT, [ResourceT, Resource2T, Resource3T]>(acquire, release);
	}

	zip3WithNewInput<Input2T, Resource2T, Input3T, Resource3T, Input4T, Resource4T>(
		resource2: AsyncManagedResource<Input2T, ErrorT, Resource2T>,
		resource3: AsyncManagedResource<Input3T, ErrorT, Resource3T>,
		resource4: AsyncManagedResource<Input4T, ErrorT, Resource4T>,
	): AsyncManagedResource<[InputT, Input2T, Input3T, Input4T], ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T]> {
		const acquire = new AsyncComputation(async (inputs: [InputT, Input2T, Input3T, Input4T]) => {
			const resource1Resolved = await this.acquire.evaluate(inputs[0]);
			if (resource1Resolved.isLeft()) {
				return resource1Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T]>;
			}

			const resource2Resolved = await resource2.acquire.evaluate(inputs[1]);
			if (resource2Resolved.isLeft()) {
				return resource2Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T]>;
			}

			const resource3Resolved = await resource3.acquire.evaluate(inputs[2]);
			if (resource3Resolved.isLeft()) {
				return resource3Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T]>;
			}

			const resource4Resolved = await resource4.acquire.evaluate(inputs[3]);
			if (resource4Resolved.isLeft()) {
				return resource4Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T]>;
			}

			return new Right<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T]>([
				resource1Resolved.get() as ResourceT,
				resource2Resolved.get() as Resource2T,
				resource3Resolved.get() as Resource3T,
				resource4Resolved.get() as Resource4T,
			]);
		});

		const release = new AsyncSafeComputation(async (resources: [ResourceT, Resource2T, Resource3T, Resource4T]) => {
			try {
			  await this.release.evaluate(resources[0]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource2.release.evaluate(resources[1]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource3.release.evaluate(resources[2]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource4.release.evaluate(resources[3]);
			} catch {
			  // Nothing to do
			}
		});

		return new AsyncManagedResource<[InputT, Input2T, Input3T, Input4T], ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T]>(acquire, release);
	}

	zip4WithNewInput<Input2T, Resource2T, Input3T, Resource3T, Input4T, Resource4T, Input5T, Resource5T>(
		resource2: AsyncManagedResource<Input2T, ErrorT, Resource2T>,
		resource3: AsyncManagedResource<Input3T, ErrorT, Resource3T>,
		resource4: AsyncManagedResource<Input4T, ErrorT, Resource4T>,
		resource5: AsyncManagedResource<Input5T, ErrorT, Resource5T>,
	): AsyncManagedResource<[InputT, Input2T, Input3T, Input4T, Input5T], ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]> {
		const acquire = new AsyncComputation(async (inputs: [InputT, Input2T, Input3T, Input4T, Input5T]) => {
			const resource1Resolved = await this.acquire.evaluate(inputs[0]);
			if (resource1Resolved.isLeft()) {
				return resource1Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>;
			}

			const resource2Resolved = await resource2.acquire.evaluate(inputs[1]);
			if (resource2Resolved.isLeft()) {
				return resource2Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>;
			}

			const resource3Resolved = await resource3.acquire.evaluate(inputs[2]);
			if (resource3Resolved.isLeft()) {
				return resource3Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>;
			}

			const resource4Resolved = await resource4.acquire.evaluate(inputs[3]);
			if (resource4Resolved.isLeft()) {
				return resource4Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>;
			}

			const resource5Resolved = await resource5.acquire.evaluate(inputs[4]);
			if (resource5Resolved.isLeft()) {
				return resource5Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>;
			}

			return new Right<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>([
				resource1Resolved.get() as ResourceT,
				resource2Resolved.get() as Resource2T,
				resource3Resolved.get() as Resource3T,
				resource4Resolved.get() as Resource4T,
				resource5Resolved.get() as Resource5T,
			]);
		});

		const release = new AsyncSafeComputation(async (resources: [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]) => {
			try {
			  await this.release.evaluate(resources[0]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource2.release.evaluate(resources[1]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource3.release.evaluate(resources[2]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource4.release.evaluate(resources[3]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource5.release.evaluate(resources[4]);
			} catch {
			  // Nothing to do
			}
		});

		return new AsyncManagedResource<[InputT, Input2T, Input3T, Input4T, Input5T], ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>(acquire, release);
	}

	zip5WithNewInput<Input2T, Resource2T, Input3T, Resource3T, Input4T, Resource4T, Input5T, Resource5T, Input6T, Resource6T>(
		resource2: AsyncManagedResource<Input2T, ErrorT, Resource2T>,
		resource3: AsyncManagedResource<Input3T, ErrorT, Resource3T>,
		resource4: AsyncManagedResource<Input4T, ErrorT, Resource4T>,
		resource5: AsyncManagedResource<Input5T, ErrorT, Resource5T>,
		resource6: AsyncManagedResource<Input6T, ErrorT, Resource6T>,
	): AsyncManagedResource<[InputT, Input2T, Input3T, Input4T, Input5T, Input6T], ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]> {
		const acquire = new AsyncComputation(async (inputs: [InputT, Input2T, Input3T, Input4T, Input5T, Input6T]) => {
			const resource1Resolved = await this.acquire.evaluate(inputs[0]);
			if (resource1Resolved.isLeft()) {
				return resource1Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			const resource2Resolved = await resource2.acquire.evaluate(inputs[1]);
			if (resource2Resolved.isLeft()) {
				return resource2Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			const resource3Resolved = await resource3.acquire.evaluate(inputs[2]);
			if (resource3Resolved.isLeft()) {
				return resource3Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			const resource4Resolved = await resource4.acquire.evaluate(inputs[3]);
			if (resource4Resolved.isLeft()) {
				return resource4Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			const resource5Resolved = await resource5.acquire.evaluate(inputs[4]);
			if (resource5Resolved.isLeft()) {
				return resource5Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			const resource6Resolved = await resource6.acquire.evaluate(inputs[5]);
			if (resource6Resolved.isLeft()) {
				return resource6Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			return new Right<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>([
				resource1Resolved.get() as ResourceT,
				resource2Resolved.get() as Resource2T,
				resource3Resolved.get() as Resource3T,
				resource4Resolved.get() as Resource4T,
				resource5Resolved.get() as Resource5T,
				resource6Resolved.get() as Resource6T,
			]);
		});

		const release = new AsyncSafeComputation(async (resources: [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]) => {
			try {
			  await this.release.evaluate(resources[0]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource2.release.evaluate(resources[1]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource3.release.evaluate(resources[2]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource4.release.evaluate(resources[3]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource5.release.evaluate(resources[4]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource6.release.evaluate(resources[5]);
			} catch {
			  // Nothing to do
			}
		});

		return new AsyncManagedResource<[InputT, Input2T, Input3T, Input4T, Input5T, Input6T], ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>(acquire, release);
	}

	zip6WithNewInput<Input2T, Resource2T, Input3T, Resource3T, Input4T, Resource4T, Input5T, Resource5T, Input6T, Resource6T, Input7T, Resource7T>(
		resource2: AsyncManagedResource<Input2T, ErrorT, Resource2T>,
		resource3: AsyncManagedResource<Input3T, ErrorT, Resource3T>,
		resource4: AsyncManagedResource<Input4T, ErrorT, Resource4T>,
		resource5: AsyncManagedResource<Input5T, ErrorT, Resource5T>,
		resource6: AsyncManagedResource<Input6T, ErrorT, Resource6T>,
		resource7: AsyncManagedResource<Input7T, ErrorT, Resource7T>,
	): AsyncManagedResource<[InputT, Input2T, Input3T, Input4T, Input5T, Input6T, Input7T], ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]> {
		const acquire = new AsyncComputation(async (inputs: [InputT, Input2T, Input3T, Input4T, Input5T, Input6T, Input7T]) => {
			const resource1Resolved = await this.acquire.evaluate(inputs[0]);
			if (resource1Resolved.isLeft()) {
				return resource1Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const resource2Resolved = await resource2.acquire.evaluate(inputs[1]);
			if (resource2Resolved.isLeft()) {
				return resource2Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const resource3Resolved = await resource3.acquire.evaluate(inputs[2]);
			if (resource3Resolved.isLeft()) {
				return resource3Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const resource4Resolved = await resource4.acquire.evaluate(inputs[3]);
			if (resource4Resolved.isLeft()) {
				return resource4Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const resource5Resolved = await resource5.acquire.evaluate(inputs[4]);
			if (resource5Resolved.isLeft()) {
				return resource5Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const resource6Resolved = await resource6.acquire.evaluate(inputs[5]);
			if (resource6Resolved.isLeft()) {
				return resource6Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const resource7Resolved = await resource7.acquire.evaluate(inputs[6]);
			if (resource7Resolved.isLeft()) {
				return resource7Resolved as Left<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			return new Right<ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>([
				resource1Resolved.get() as ResourceT,
				resource2Resolved.get() as Resource2T,
				resource3Resolved.get() as Resource3T,
				resource4Resolved.get() as Resource4T,
				resource5Resolved.get() as Resource5T,
				resource6Resolved.get() as Resource6T,
				resource7Resolved.get() as Resource7T,
			]);
		});

		const release = new AsyncSafeComputation(async (resources: [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]) => {
			try {
			  await this.release.evaluate(resources[0]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource2.release.evaluate(resources[1]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource3.release.evaluate(resources[2]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource4.release.evaluate(resources[3]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource5.release.evaluate(resources[4]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource6.release.evaluate(resources[5]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource7.release.evaluate(resources[6]);
			} catch {
			  // Nothing to do
			}
		});

		return new AsyncManagedResource<[InputT, Input2T, Input3T, Input4T, Input5T, Input6T, Input7T], ErrorT, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>(acquire, release);
	}

	zipWithNewError<Error2T, Resource2T>(resource2: AsyncManagedResource<InputT, Error2T, Resource2T>): AsyncManagedResource<InputT, ErrorT | Error2T, [ResourceT, Resource2T]> {
		const acquire = new AsyncComputation(async (input: InputT) => {
			const resource1Resolved = await this.acquire.evaluate(input);
			if (resource1Resolved.isLeft()) {
				return resource1Resolved as Left<ErrorT | Error2T, [ResourceT, Resource2T]>;
			}

			const resource2Resolved = await resource2.acquire.evaluate(input);
			if (resource2Resolved.isLeft()) {
				return resource2Resolved as Left<ErrorT | Error2T, [ResourceT, Resource2T]>;
			}

			return new Right<ErrorT | Error2T, [ResourceT, Resource2T]>([
				resource1Resolved.get() as ResourceT,
				resource2Resolved.get() as Resource2T,
			]);
		});

		const release = new AsyncSafeComputation(async (resources: [ResourceT, Resource2T]) => {
			try {
			  await this.release.evaluate(resources[0]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource2.release.evaluate(resources[1]);
			} catch {
			  // Nothing to do
			}
		});

		return new AsyncManagedResource<InputT, ErrorT | Error2T, [ResourceT, Resource2T]>(acquire, release);
	}

	zip2WithNewError<Error2T, Resource2T, Error3T, Resource3T>(
		resource2: AsyncManagedResource<InputT, Error2T, Resource2T>,
		resource3: AsyncManagedResource<InputT, Error3T, Resource3T>,
	): AsyncManagedResource<InputT, ErrorT | Error2T | Error3T, [ResourceT, Resource2T, Resource3T]> {
		const acquire = new AsyncComputation(async (input: InputT) => {
			const resource1Resolved = await this.acquire.evaluate(input);
			if (resource1Resolved.isLeft()) {
				return resource1Resolved as Left<ErrorT | Error2T | Error3T, [ResourceT, Resource2T, Resource3T]>;
			}

			const resource2Resolved = await resource2.acquire.evaluate(input);
			if (resource2Resolved.isLeft()) {
				return resource2Resolved as Left<ErrorT | Error2T | Error3T, [ResourceT, Resource2T, Resource3T]>;
			}

			const resource3Resolved = await resource3.acquire.evaluate(input);
			if (resource3Resolved.isLeft()) {
				return resource3Resolved as Left<ErrorT | Error2T | Error3T, [ResourceT, Resource2T, Resource3T]>;
			}

			return new Right<ErrorT | Error2T | Error3T, [ResourceT, Resource2T, Resource3T]>([
				resource1Resolved.get() as ResourceT,
				resource2Resolved.get() as Resource2T,
				resource3Resolved.get() as Resource3T,
			]);
		});

		const release = new AsyncSafeComputation(async (resources: [ResourceT, Resource2T, Resource3T]) => {
			try {
			  await this.release.evaluate(resources[0]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource2.release.evaluate(resources[1]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource3.release.evaluate(resources[2]);
			} catch {
			  // Nothing to do
			}
		});

		return new AsyncManagedResource<InputT, ErrorT | Error2T | Error3T, [ResourceT, Resource2T, Resource3T]>(acquire, release);
	}

	zip3WithNewError<Error2T, Resource2T, Error3T, Resource3T, Error4T, Resource4T>(
		resource2: AsyncManagedResource<InputT, Error2T, Resource2T>,
		resource3: AsyncManagedResource<InputT, Error3T, Resource3T>,
		resource4: AsyncManagedResource<InputT, Error4T, Resource4T>,
	): AsyncManagedResource<InputT, ErrorT | Error2T | Error3T | Error4T, [ResourceT, Resource2T, Resource3T, Resource4T]> {
		const acquire = new AsyncComputation(async (input: InputT) => {
			const resource1Resolved = await this.acquire.evaluate(input);
			if (resource1Resolved.isLeft()) {
				return resource1Resolved as Left<ErrorT | Error2T | Error3T | Error4T, [ResourceT, Resource2T, Resource3T, Resource4T]>;
			}

			const resource2Resolved = await resource2.acquire.evaluate(input);
			if (resource2Resolved.isLeft()) {
				return resource2Resolved as Left<ErrorT | Error2T | Error3T | Error4T, [ResourceT, Resource2T, Resource3T, Resource4T]>;
			}

			const resource3Resolved = await resource3.acquire.evaluate(input);
			if (resource3Resolved.isLeft()) {
				return resource3Resolved as Left<ErrorT | Error2T | Error3T | Error4T, [ResourceT, Resource2T, Resource3T, Resource4T]>;
			}

			const resource4Resolved = await resource4.acquire.evaluate(input);
			if (resource4Resolved.isLeft()) {
				return resource4Resolved as Left<ErrorT | Error2T | Error3T | Error4T, [ResourceT, Resource2T, Resource3T, Resource4T]>;
			}

			return new Right<ErrorT | Error2T | Error3T | Error4T, [ResourceT, Resource2T, Resource3T, Resource4T]>([
				resource1Resolved.get() as ResourceT,
				resource2Resolved.get() as Resource2T,
				resource3Resolved.get() as Resource3T,
				resource4Resolved.get() as Resource4T,
			]);
		});

		const release = new AsyncSafeComputation(async (resources: [ResourceT, Resource2T, Resource3T, Resource4T]) => {
			try {
			  await this.release.evaluate(resources[0]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource2.release.evaluate(resources[1]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource3.release.evaluate(resources[2]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource4.release.evaluate(resources[3]);
			} catch {
			  // Nothing to do
			}
		});

		return new AsyncManagedResource<InputT, ErrorT | Error2T | Error3T | Error4T, [ResourceT, Resource2T, Resource3T, Resource4T]>(acquire, release);
	}

	zip4WithNewError<Error2T, Resource2T, Error3T, Resource3T, Error4T, Resource4T, Error5T, Resource5T>(
		resource2: AsyncManagedResource<InputT, Error2T, Resource2T>,
		resource3: AsyncManagedResource<InputT, Error3T, Resource3T>,
		resource4: AsyncManagedResource<InputT, Error4T, Resource4T>,
		resource5: AsyncManagedResource<InputT, Error5T, Resource5T>,
	): AsyncManagedResource<InputT, ErrorT | Error2T | Error3T | Error4T | Error5T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]> {
		const acquire = new AsyncComputation(async (input: InputT) => {
			const resource1Resolved = await this.acquire.evaluate(input);
			if (resource1Resolved.isLeft()) {
				return resource1Resolved as Left<ErrorT | Error2T | Error3T | Error4T | Error5T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>;
			}

			const resource2Resolved = await resource2.acquire.evaluate(input);
			if (resource2Resolved.isLeft()) {
				return resource2Resolved as Left<ErrorT | Error2T | Error3T | Error4T | Error5T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>;
			}

			const resource3Resolved = await resource3.acquire.evaluate(input);
			if (resource3Resolved.isLeft()) {
				return resource3Resolved as Left<ErrorT | Error2T | Error3T | Error4T | Error5T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>;
			}

			const resource4Resolved = await resource4.acquire.evaluate(input);
			if (resource4Resolved.isLeft()) {
				return resource4Resolved as Left<ErrorT | Error2T | Error3T | Error4T | Error5T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>;
			}

			const resource5Resolved = await resource5.acquire.evaluate(input);
			if (resource5Resolved.isLeft()) {
				return resource5Resolved as Left<ErrorT | Error2T | Error3T | Error4T | Error5T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>;
			}

			return new Right<ErrorT | Error2T | Error3T | Error4T | Error5T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>([
				resource1Resolved.get() as ResourceT,
				resource2Resolved.get() as Resource2T,
				resource3Resolved.get() as Resource3T,
				resource4Resolved.get() as Resource4T,
				resource5Resolved.get() as Resource5T,
			]);
		});

		const release = new AsyncSafeComputation(async (resources: [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]) => {
			try {
			  await this.release.evaluate(resources[0]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource2.release.evaluate(resources[1]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource3.release.evaluate(resources[2]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource4.release.evaluate(resources[3]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource5.release.evaluate(resources[4]);
			} catch {
			  // Nothing to do
			}
		});

		return new AsyncManagedResource<InputT, ErrorT | Error2T | Error3T | Error4T | Error5T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>(acquire, release);
	}

	zip5WithNewError<Error2T, Resource2T, Error3T, Resource3T, Error4T, Resource4T, Error5T, Resource5T, Error6T, Resource6T>(
		resource2: AsyncManagedResource<InputT, Error2T, Resource2T>,
		resource3: AsyncManagedResource<InputT, Error3T, Resource3T>,
		resource4: AsyncManagedResource<InputT, Error4T, Resource4T>,
		resource5: AsyncManagedResource<InputT, Error5T, Resource5T>,
		resource6: AsyncManagedResource<InputT, Error6T, Resource6T>,
	): AsyncManagedResource<InputT, ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]> {
		const acquire = new AsyncComputation(async (input: InputT) => {
			const resource1Resolved = await this.acquire.evaluate(input);
			if (resource1Resolved.isLeft()) {
				return resource1Resolved as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			const resource2Resolved = await resource2.acquire.evaluate(input);
			if (resource2Resolved.isLeft()) {
				return resource2Resolved as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			const resource3Resolved = await resource3.acquire.evaluate(input);
			if (resource3Resolved.isLeft()) {
				return resource3Resolved as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			const resource4Resolved = await resource4.acquire.evaluate(input);
			if (resource4Resolved.isLeft()) {
				return resource4Resolved as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			const resource5Resolved = await resource5.acquire.evaluate(input);
			if (resource5Resolved.isLeft()) {
				return resource5Resolved as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			const resource6Resolved = await resource6.acquire.evaluate(input);
			if (resource6Resolved.isLeft()) {
				return resource6Resolved as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			return new Right<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>([
				resource1Resolved.get() as ResourceT,
				resource2Resolved.get() as Resource2T,
				resource3Resolved.get() as Resource3T,
				resource4Resolved.get() as Resource4T,
				resource5Resolved.get() as Resource5T,
				resource6Resolved.get() as Resource6T,
			]);
		});

		const release = new AsyncSafeComputation(async (resources: [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]) => {
			try {
			  await this.release.evaluate(resources[0]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource2.release.evaluate(resources[1]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource3.release.evaluate(resources[2]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource4.release.evaluate(resources[3]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource5.release.evaluate(resources[4]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource6.release.evaluate(resources[5]);
			} catch {
			  // Nothing to do
			}
		});

		return new AsyncManagedResource<InputT, ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>(acquire, release);
	}

	zip6WithNewError<
		Error2T, Resource2T,
		Error3T, Resource3T,
		Error4T, Resource4T,
		Error5T, Resource5T,
		Error6T, Resource6T,
		Error7T, Resource7T,
	>(
		resource2: AsyncManagedResource<InputT, Error2T, Resource2T>,
		resource3: AsyncManagedResource<InputT, Error3T, Resource3T>,
		resource4: AsyncManagedResource<InputT, Error4T, Resource4T>,
		resource5: AsyncManagedResource<InputT, Error5T, Resource5T>,
		resource6: AsyncManagedResource<InputT, Error6T, Resource6T>,
		resource7: AsyncManagedResource<InputT, Error7T, Resource7T>,
	): AsyncManagedResource<InputT, ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T | Error7T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]> {
		const acquire = new AsyncComputation(async (input: InputT) => {
			const resource1Resolved = await this.acquire.evaluate(input);
			if (resource1Resolved.isLeft()) {
				return resource1Resolved as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T | Error7T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const resource2Resolved = await resource2.acquire.evaluate(input);
			if (resource2Resolved.isLeft()) {
				return resource2Resolved as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T | Error7T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const resource3Resolved = await resource3.acquire.evaluate(input);
			if (resource3Resolved.isLeft()) {
				return resource3Resolved as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T | Error7T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const resource4Resolved = await resource4.acquire.evaluate(input);
			if (resource4Resolved.isLeft()) {
				return resource4Resolved as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T | Error7T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const resource5Resolved = await resource5.acquire.evaluate(input);
			if (resource5Resolved.isLeft()) {
				return resource5Resolved as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T | Error7T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const resource6Resolved = await resource6.acquire.evaluate(input);
			if (resource6Resolved.isLeft()) {
				return resource6Resolved as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T | Error7T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const resource7Resolved = await resource7.acquire.evaluate(input);
			if (resource7Resolved.isLeft()) {
				return resource7Resolved as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T | Error7T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			return new Right<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T | Error7T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>([
				resource1Resolved.get() as ResourceT,
				resource2Resolved.get() as Resource2T,
				resource3Resolved.get() as Resource3T,
				resource4Resolved.get() as Resource4T,
				resource5Resolved.get() as Resource5T,
				resource6Resolved.get() as Resource6T,
				resource7Resolved.get() as Resource7T,
			]);
		});

		const release = new AsyncSafeComputation(async (resources: [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]) => {
			try {
			  await this.release.evaluate(resources[0]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource2.release.evaluate(resources[1]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource3.release.evaluate(resources[2]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource4.release.evaluate(resources[3]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource5.release.evaluate(resources[4]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource6.release.evaluate(resources[5]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource7.release.evaluate(resources[6]);
			} catch {
			  // Nothing to do
			}
		});

		return new AsyncManagedResource<InputT, ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T | Error7T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>(acquire, release);
	}

	zipWithNewInputAndError<
		Input2T, Error2T, Resource2T,
	>(
		resource2: AsyncManagedResource<Input2T, Error2T, Resource2T>,
	): AsyncManagedResource<[InputT, Input2T], ErrorT | Error2T, [ResourceT, Resource2T]> {
		const acquire = new AsyncComputation(async (input: [InputT, Input2T]) => {
			const resource1Resolved = await this.acquire.evaluate(input[0]);
			if (resource1Resolved.isLeft()) {
				return resource1Resolved as Left<ErrorT | Error2T, [ResourceT, Resource2T]>;
			}

			const resource2Resolved = await resource2.acquire.evaluate(input[1]);
			if (resource2Resolved.isLeft()) {
				return resource2Resolved as Left<ErrorT | Error2T, [ResourceT, Resource2T]>;
			}

			return new Right<ErrorT | Error2T, [ResourceT, Resource2T]>([
				resource1Resolved.get() as ResourceT,
				resource2Resolved.get() as Resource2T,
			]);
		});

		const release = new AsyncSafeComputation(async (resources: [ResourceT, Resource2T]) => {
			try {
			  await this.release.evaluate(resources[0]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource2.release.evaluate(resources[1]);
			} catch {
			  // Nothing to do
			}
		});

		return new AsyncManagedResource<[InputT, Input2T], ErrorT | Error2T, [ResourceT, Resource2T]>(acquire, release);
	}

	zip2WithNewInputAndError<
		Input2T, Error2T, Resource2T,
		Input3T, Error3T, Resource3T,
	>(
		resource2: AsyncManagedResource<Input2T, Error2T, Resource2T>,
		resource3: AsyncManagedResource<Input3T, Error3T, Resource3T>,
	): AsyncManagedResource<[InputT, Input2T, Input3T], ErrorT | Error2T | Error3T, [ResourceT, Resource2T, Resource3T]> {
		const acquire = new AsyncComputation(async (input: [InputT, Input2T, Input3T]) => {
			const resource1Resolved = await this.acquire.evaluate(input[0]);
			if (resource1Resolved.isLeft()) {
				return resource1Resolved as Left<ErrorT | Error2T | Error3T, [ResourceT, Resource2T, Resource3T]>;
			}

			const resource2Resolved = await resource2.acquire.evaluate(input[1]);
			if (resource2Resolved.isLeft()) {
				return resource2Resolved as Left<ErrorT | Error2T | Error3T, [ResourceT, Resource2T, Resource3T]>;
			}

			const resource3Resolved = await resource3.acquire.evaluate(input[2]);
			if (resource3Resolved.isLeft()) {
				return resource3Resolved as Left<ErrorT | Error2T | Error3T, [ResourceT, Resource2T, Resource3T]>;
			}

			return new Right<ErrorT | Error2T | Error3T, [ResourceT, Resource2T, Resource3T]>([
				resource1Resolved.get() as ResourceT,
				resource2Resolved.get() as Resource2T,
				resource3Resolved.get() as Resource3T,
			]);
		});

		const release = new AsyncSafeComputation(async (resources: [ResourceT, Resource2T, Resource3T]) => {
			try {
			  await this.release.evaluate(resources[0]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource2.release.evaluate(resources[1]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource3.release.evaluate(resources[2]);
			} catch {
			  // Nothing to do
			}
		});

		return new AsyncManagedResource<[InputT, Input2T, Input3T], ErrorT | Error2T | Error3T, [ResourceT, Resource2T, Resource3T]>(acquire, release);
	}

	zip3WithNewInputAndError<
		Input2T, Error2T, Resource2T,
		Input3T, Error3T, Resource3T,
		Input4T, Error4T, Resource4T,
	>(
		resource2: AsyncManagedResource<Input2T, Error2T, Resource2T>,
		resource3: AsyncManagedResource<Input3T, Error3T, Resource3T>,
		resource4: AsyncManagedResource<Input4T, Error4T, Resource4T>,
	): AsyncManagedResource<[InputT, Input2T, Input3T, Input4T], ErrorT | Error2T | Error3T | Error4T, [ResourceT, Resource2T, Resource3T, Resource4T]> {
		const acquire = new AsyncComputation(async (input: [InputT, Input2T, Input3T, Input4T]) => {
			const resource1Resolved = await this.acquire.evaluate(input[0]);
			if (resource1Resolved.isLeft()) {
				return resource1Resolved as Left<ErrorT | Error2T | Error3T | Error4T, [ResourceT, Resource2T, Resource3T, Resource4T]>;
			}

			const resource2Resolved = await resource2.acquire.evaluate(input[1]);
			if (resource2Resolved.isLeft()) {
				return resource2Resolved as Left<ErrorT | Error2T | Error3T | Error4T, [ResourceT, Resource2T, Resource3T, Resource4T]>;
			}

			const resource3Resolved = await resource3.acquire.evaluate(input[2]);
			if (resource3Resolved.isLeft()) {
				return resource3Resolved as Left<ErrorT | Error2T | Error3T | Error4T, [ResourceT, Resource2T, Resource3T, Resource4T]>;
			}

			const resource4Resolved = await resource4.acquire.evaluate(input[3]);
			if (resource4Resolved.isLeft()) {
				return resource4Resolved as Left<ErrorT | Error2T | Error3T | Error4T, [ResourceT, Resource2T, Resource3T, Resource4T]>;
			}

			return new Right<ErrorT | Error2T | Error3T | Error4T, [ResourceT, Resource2T, Resource3T, Resource4T]>([
				resource1Resolved.get() as ResourceT,
				resource2Resolved.get() as Resource2T,
				resource3Resolved.get() as Resource3T,
				resource4Resolved.get() as Resource4T,
			]);
		});

		const release = new AsyncSafeComputation(async (resources: [ResourceT, Resource2T, Resource3T, Resource4T]) => {
			try {
			  await this.release.evaluate(resources[0]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource2.release.evaluate(resources[1]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource3.release.evaluate(resources[2]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource4.release.evaluate(resources[3]);
			} catch {
			  // Nothing to do
			}
		});

		return new AsyncManagedResource<[InputT, Input2T, Input3T, Input4T], ErrorT | Error2T | Error3T | Error4T, [ResourceT, Resource2T, Resource3T, Resource4T]>(acquire, release);
	}

	zip4WithNewInputAndError<
		Input2T, Error2T, Resource2T,
		Input3T, Error3T, Resource3T,
		Input4T, Error4T, Resource4T,
		Input5T, Error5T, Resource5T,
	>(
		resource2: AsyncManagedResource<Input2T, Error2T, Resource2T>,
		resource3: AsyncManagedResource<Input3T, Error3T, Resource3T>,
		resource4: AsyncManagedResource<Input4T, Error4T, Resource4T>,
		resource5: AsyncManagedResource<Input5T, Error5T, Resource5T>,
	): AsyncManagedResource<[InputT, Input2T, Input3T, Input4T, Input5T], ErrorT | Error2T | Error3T | Error4T | Error5T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]> {
		const acquire = new AsyncComputation(async (input: [InputT, Input2T, Input3T, Input4T, Input5T]) => {
			const resource1Resolved = await this.acquire.evaluate(input[0]);
			if (resource1Resolved.isLeft()) {
				return resource1Resolved as Left<ErrorT | Error2T | Error3T | Error4T | Error5T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>;
			}

			const resource2Resolved = await resource2.acquire.evaluate(input[1]);
			if (resource2Resolved.isLeft()) {
				return resource2Resolved as Left<ErrorT | Error2T | Error3T | Error4T | Error5T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>;
			}

			const resource3Resolved = await resource3.acquire.evaluate(input[2]);
			if (resource3Resolved.isLeft()) {
				return resource3Resolved as Left<ErrorT | Error2T | Error3T | Error4T | Error5T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>;
			}

			const resource4Resolved = await resource4.acquire.evaluate(input[3]);
			if (resource4Resolved.isLeft()) {
				return resource4Resolved as Left<ErrorT | Error2T | Error3T | Error4T | Error5T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>;
			}

			const resource5Resolved = await resource5.acquire.evaluate(input[4]);
			if (resource5Resolved.isLeft()) {
				return resource5Resolved as Left<ErrorT | Error2T | Error3T | Error4T | Error5T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>;
			}

			return new Right<ErrorT | Error2T | Error3T | Error4T | Error5T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>([
				resource1Resolved.get() as ResourceT,
				resource2Resolved.get() as Resource2T,
				resource3Resolved.get() as Resource3T,
				resource4Resolved.get() as Resource4T,
				resource5Resolved.get() as Resource5T,
			]);
		});

		const release = new AsyncSafeComputation(async (resources: [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]) => {
			try {
			  await this.release.evaluate(resources[0]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource2.release.evaluate(resources[1]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource3.release.evaluate(resources[2]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource4.release.evaluate(resources[3]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource5.release.evaluate(resources[4]);
			} catch {
			  // Nothing to do
			}
		});

		return new AsyncManagedResource<[InputT, Input2T, Input3T, Input4T, Input5T], ErrorT | Error2T | Error3T | Error4T | Error5T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T]>(acquire, release);
	}

	zip5WithNewInputAndError<
		Input2T, Error2T, Resource2T,
		Input3T, Error3T, Resource3T,
		Input4T, Error4T, Resource4T,
		Input5T, Error5T, Resource5T,
		Input6T, Error6T, Resource6T,
	>(
		resource2: AsyncManagedResource<Input2T, Error2T, Resource2T>,
		resource3: AsyncManagedResource<Input3T, Error3T, Resource3T>,
		resource4: AsyncManagedResource<Input4T, Error4T, Resource4T>,
		resource5: AsyncManagedResource<Input5T, Error5T, Resource5T>,
		resource6: AsyncManagedResource<Input6T, Error6T, Resource6T>,
	): AsyncManagedResource<[InputT, Input2T, Input3T, Input4T, Input5T, Input6T], ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]> {
		const acquire = new AsyncComputation(async (input: [InputT, Input2T, Input3T, Input4T, Input5T, Input6T]) => {
			const resource1Resolved = await this.acquire.evaluate(input[0]);
			if (resource1Resolved.isLeft()) {
				return resource1Resolved as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			const resource2Resolved = await resource2.acquire.evaluate(input[1]);
			if (resource2Resolved.isLeft()) {
				return resource2Resolved as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			const resource3Resolved = await resource3.acquire.evaluate(input[2]);
			if (resource3Resolved.isLeft()) {
				return resource3Resolved as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			const resource4Resolved = await resource4.acquire.evaluate(input[3]);
			if (resource4Resolved.isLeft()) {
				return resource4Resolved as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			const resource5Resolved = await resource5.acquire.evaluate(input[4]);
			if (resource5Resolved.isLeft()) {
				return resource5Resolved as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			const resource6Resolved = await resource6.acquire.evaluate(input[5]);
			if (resource6Resolved.isLeft()) {
				return resource6Resolved as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>;
			}

			return new Right<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>([
				resource1Resolved.get() as ResourceT,
				resource2Resolved.get() as Resource2T,
				resource3Resolved.get() as Resource3T,
				resource4Resolved.get() as Resource4T,
				resource5Resolved.get() as Resource5T,
				resource6Resolved.get() as Resource6T,
			]);
		});

		const release = new AsyncSafeComputation(async (resources: [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]) => {
			try {
			  await this.release.evaluate(resources[0]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource2.release.evaluate(resources[1]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource3.release.evaluate(resources[2]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource4.release.evaluate(resources[3]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource5.release.evaluate(resources[4]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource6.release.evaluate(resources[5]);
			} catch {
			  // Nothing to do
			}
		});

		return new AsyncManagedResource<[InputT, Input2T, Input3T, Input4T, Input5T, Input6T], ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T]>(acquire, release);
	}

	zip6WithNewInputAndError<
		Input2T, Error2T, Resource2T,
		Input3T, Error3T, Resource3T,
		Input4T, Error4T, Resource4T,
		Input5T, Error5T, Resource5T,
		Input6T, Error6T, Resource6T,
		Input7T, Error7T, Resource7T,
	>(
		resource2: AsyncManagedResource<Input2T, Error2T, Resource2T>,
		resource3: AsyncManagedResource<Input3T, Error3T, Resource3T>,
		resource4: AsyncManagedResource<Input4T, Error4T, Resource4T>,
		resource5: AsyncManagedResource<Input5T, Error5T, Resource5T>,
		resource6: AsyncManagedResource<Input6T, Error6T, Resource6T>,
		resource7: AsyncManagedResource<Input7T, Error7T, Resource7T>,
	): AsyncManagedResource<[InputT, Input2T, Input3T, Input4T, Input5T, Input6T, Input7T], ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T | Error7T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]> {
		const acquire = new AsyncComputation(async (input: [InputT, Input2T, Input3T, Input4T, Input5T, Input6T, Input7T]) => {
			const resource1Resolved = await this.acquire.evaluate(input[0]);
			if (resource1Resolved.isLeft()) {
				return resource1Resolved as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T | Error7T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const resource2Resolved = await resource2.acquire.evaluate(input[1]);
			if (resource2Resolved.isLeft()) {
				return resource2Resolved as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T | Error7T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const resource3Resolved = await resource3.acquire.evaluate(input[2]);
			if (resource3Resolved.isLeft()) {
				return resource3Resolved as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T | Error7T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const resource4Resolved = await resource4.acquire.evaluate(input[3]);
			if (resource4Resolved.isLeft()) {
				return resource4Resolved as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T | Error7T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const resource5Resolved = await resource5.acquire.evaluate(input[4]);
			if (resource5Resolved.isLeft()) {
				return resource5Resolved as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T | Error7T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const resource6Resolved = await resource6.acquire.evaluate(input[5]);
			if (resource6Resolved.isLeft()) {
				return resource6Resolved as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T | Error7T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			const resource7Resolved = await resource7.acquire.evaluate(input[6]);
			if (resource7Resolved.isLeft()) {
				return resource7Resolved as Left<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T | Error7T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>;
			}

			return new Right<ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T | Error7T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>([
				resource1Resolved.get() as ResourceT,
				resource2Resolved.get() as Resource2T,
				resource3Resolved.get() as Resource3T,
				resource4Resolved.get() as Resource4T,
				resource5Resolved.get() as Resource5T,
				resource6Resolved.get() as Resource6T,
				resource7Resolved.get() as Resource7T,
			]);
		});

		const release = new AsyncSafeComputation(async (resources: [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]) => {
			try {
			  await this.release.evaluate(resources[0]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource2.release.evaluate(resources[1]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource3.release.evaluate(resources[2]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource4.release.evaluate(resources[3]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource5.release.evaluate(resources[4]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource6.release.evaluate(resources[5]);
			} catch {
			  // Nothing to do
			}

			try {
			  await resource7.release.evaluate(resources[6]);
			} catch {
			  // Nothing to do
			}
		});

		return new AsyncManagedResource<[InputT, Input2T, Input3T, Input4T, Input5T, Input6T, Input7T], ErrorT | Error2T | Error3T | Error4T | Error5T | Error6T | Error7T, [ResourceT, Resource2T, Resource3T, Resource4T, Resource5T, Resource6T, Resource7T]>(acquire, release);
	}
}
