/* eslint-disable @typescript-eslint/ban-types, unicorn/no-nested-ternary */
import {Computation} from './Computation.js';
import {type Either, Right} from './Either.js';
import {IO} from './IO.js';
import {type Acquisition, ManagedResource, type Release} from './ManagedResource.js';
import {SafeComputation} from './SafeComputation.js';
import {type Tag, type TaggedUnion, type Tagged, type TagsOfTaggedUnion, type Services, tagged, withTag, anyTag} from './Tag.js';
import {Task} from './Task.js';

export type TaggedParameters<FunctionT extends (..._: any[]) => any>
	= Parameters<FunctionT> extends [infer FirstParameter, ...infer RestParameters]
		? FirstParameter extends {}
			? RestParameters extends never
				? [Tagged<any, FirstParameter>]
				: [Tagged<any, FirstParameter>, ...TaggedParameters<(..._: RestParameters) => ReturnType<FunctionT>>]
			: never
		: never;

export type TaggedConstructorParameters<ServiceT extends new (..._: any[]) => any>
	= ConstructorParameters<ServiceT> extends [infer FirstParameter, ...infer RestParameters]
		? FirstParameter extends {}
			? RestParameters extends never
				? [Tagged<any, FirstParameter>]
				: [Tagged<any, FirstParameter>, ...TaggedParameters<(..._: RestParameters) => ServiceT>]
			: never
		: never;

export class Layer<InputT extends ({} | Array<{}>), ErrorT, ServicesT extends ({} | Array<{}>), InputTaggedUnion extends TaggedUnion<any, InputT>, ServicesTaggedUnion extends TaggedUnion<any, ServicesT>> extends ManagedResource<InputTaggedUnion, ErrorT, ServicesTaggedUnion> {
	static fromService<ServiceT extends {}>(service: ServiceT, tag: Tag<any, ServiceT>): Layer<any, never, ServiceT, TaggedUnion<'any', any>, TaggedUnion<any, ServiceT>> {
		const acquisition: Acquisition<any, never, Services<TaggedUnion<any, ServiceT>>> = ((_: any) => service as Services<TaggedUnion<any, ServiceT>>[keyof Services<TaggedUnion<any, ServiceT>>]) as Acquisition<any, never, Services<TaggedUnion<any, ServiceT>>>;
		return new Layer<any, never, ServiceT, TaggedUnion<'any', any>, TaggedUnion<any, ServiceT>>(anyTag, tag as TagsOfTaggedUnion<TaggedUnion<any, ServiceT>>, acquisition);
	}

	static fromManaged<InputT extends ({} | Array<{}>), ErrorT, ServicesT extends ({} | Array<{}>)>(managed: ManagedResource<InputT, ErrorT, ServicesT>, inputTags: TagsOfTaggedUnion<TaggedUnion<any, InputT>>, servicesTags: TagsOfTaggedUnion<TaggedUnion<any, ServicesT>>): Layer<InputT, ErrorT, ServicesT, TaggedUnion<any, InputT>, TaggedUnion<any, ServicesT>> {
		const acquire = managed.unsafeAcquire as any as Acquisition<Services<TaggedUnion<any, InputT>>, ErrorT, Services<TaggedUnion<any, ServicesT>>>;
		const release = managed.release as any as Release<Services<TaggedUnion<any, ServicesT>>>;
		return new Layer<InputT, ErrorT, ServicesT, TaggedUnion<any, InputT>, TaggedUnion<any, ServicesT>>(inputTags, servicesTags, acquire, release);
	}

	static make<ServiceT extends new (...args: any[]) => any, TagT extends (string | symbol)>(serviceTagName: TagT, constructor: new () => ServiceT, parameters: ConstructorParameters<typeof constructor>): Layer<any, never, ServiceT, TaggedUnion<'any', any>, TaggedUnion<TagT, ServiceT>> {
		const acquire = (..._: any[]) => new constructor(...parameters as ConstructorParameters<typeof constructor>) as any as Services<TaggedUnion<TagT, ServiceT>>;
		const release = (_: Services<TaggedUnion<TagT, ServiceT>>) => undefined;
		const serviceTag: Tag<TagT, ServiceT> = {isTag: true, identifier: serviceTagName};

		return new Layer<any, never, ServiceT, TaggedUnion<'any', any>, TaggedUnion<TagT, ServiceT>>(anyTag, serviceTag as TagsOfTaggedUnion<TaggedUnion<TagT, ServiceT>>, acquire, release);
	}

	static liftService<ServiceT extends new (...args: any[]) => any, TagT extends (string | symbol)>(serviceTagName: TagT, inputTags: TagsOfTaggedUnion<TaggedUnion<any, ConstructorParameters<ServiceT>>>, constructor: new (..._: ConstructorParameters<ServiceT>) => ServiceT): Layer<ConstructorParameters<ServiceT>, never, ServiceT, TaggedUnion<any, ConstructorParameters<ServiceT>>, TaggedUnion<TagT, ServiceT>> {
		const acquire = (parameters: Services<TaggedUnion<any, ConstructorParameters<ServiceT>>>) => (new constructor(...parameters as any as ConstructorParameters<ServiceT>) as any as Services<TaggedUnion<TagT, ServiceT>>);
		const release = (_: Services<TaggedUnion<TagT, ServiceT>>) => undefined;
		const serviceTag: Tag<TagT, ServiceT> = {isTag: true, identifier: serviceTagName};

		return new Layer<ConstructorParameters<ServiceT>, never, ServiceT, TaggedUnion<any, ConstructorParameters<ServiceT>>, TaggedUnion<TagT, ServiceT>>(inputTags, serviceTag as TagsOfTaggedUnion<TaggedUnion<TagT, ServiceT>>, acquire, release);
	}

	readonly inputTags: TagsOfTaggedUnion<InputTaggedUnion>;
	readonly servicesTags: TagsOfTaggedUnion<ServicesTaggedUnion>;

	constructor(
		inputTags: TagsOfTaggedUnion<InputTaggedUnion>,
		servicesTags: TagsOfTaggedUnion<ServicesTaggedUnion>,
		acquire: Acquisition<Services<InputTaggedUnion>, ErrorT, Services<ServicesTaggedUnion>>,
		release: Release<Services<ServicesTaggedUnion>> = (..._: any[]) => undefined,
	) {
		const acquireComputation
			= (acquire instanceof Computation)
				? acquire
				: ((acquire instanceof SafeComputation)
					? new Computation<Services<InputTaggedUnion>, ErrorT, Services<ServicesTaggedUnion>>((input: Services<InputTaggedUnion>) => new Right<ErrorT, Services<ServicesTaggedUnion>>(acquire.evaluate(input)))
					: (acquire instanceof Task)
						? new Computation<Services<InputTaggedUnion>, ErrorT, Services<ServicesTaggedUnion>>((input: Services<InputTaggedUnion>) => acquire.evaluate(input))
						: (acquire instanceof IO)
							? new Computation<Services<InputTaggedUnion>, ErrorT, Services<ServicesTaggedUnion>>((input: Services<InputTaggedUnion>) => new Right<ErrorT, Services<ServicesTaggedUnion>>(acquire.evaluate()))
							: new Computation<Services<InputTaggedUnion>, ErrorT, Services<ServicesTaggedUnion>>((input: Services<InputTaggedUnion>) => new Right<ErrorT, Services<ServicesTaggedUnion>>(acquire(input))));

		const newAcquisition = new Computation<InputTaggedUnion, ErrorT, ServicesTaggedUnion>((inputServices: InputTaggedUnion): Either<ErrorT, ServicesTaggedUnion> => {
			const resolved = acquireComputation.evaluate(inputServices as any as Services<InputTaggedUnion>);
			if (resolved.isLeft()) {
				return resolved as any as Either<ErrorT, ServicesTaggedUnion>;
			}

			let i = 0;
			const services = resolved.get() as ({} | Array<{}>);
			const hasMultipleServices = Array.isArray(services);
			const servicesArray: Array<{}> = (hasMultipleServices ? services : [services]) as Array<{}>;
			const taggedServices = Array.from({length: servicesArray.length});
			for (const service of servicesArray) {
				const tag: Tag<any, typeof service> = (servicesTags as Array<Tag<any, {}>>)[i++];
				const taggedService: Tagged<any, typeof service> = withTag(tag, service);
				taggedServices.push(taggedService);
			}

			return new Right(hasMultipleServices ? taggedServices as any as ServicesTaggedUnion : taggedServices[0] as any as ServicesTaggedUnion);
		});

		super(newAcquisition, release as any as Release<ServicesTaggedUnion>);
		this.inputTags = inputTags;
		this.servicesTags = servicesTags;
	}

	map<Services2T extends ({} | Array<{}>)>(
		f: (services: Services<ServicesTaggedUnion>) => Services<TaggedUnion<any, Services2T>>,
		servicesTags: TagsOfTaggedUnion<TaggedUnion<any, Services2T>>,
		release: Release<Services<TaggedUnion<any, Services2T>>>,
	): Layer<InputT, ErrorT, Services2T, InputTaggedUnion, TaggedUnion<any, Services2T>> {
		const oldAcquire = this.unsafeAcquire as any as Computation<Services<InputTaggedUnion>, ErrorT, Services<ServicesTaggedUnion>>;
		const newAcquire = oldAcquire.map<Services<TaggedUnion<any, Services2T>>>(element => f(element));

		return new Layer<InputT, ErrorT, Services2T, InputTaggedUnion, TaggedUnion<any, Services2T>>(this.inputTags, servicesTags, newAcquire, release);
	}
}
