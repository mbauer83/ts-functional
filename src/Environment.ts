import {type AsyncIO} from './AsyncIO.js';
import {type AsyncSafeComputation} from './AsyncSafeComputation.js';
import {type AsyncTask} from './AsyncTask.js';
import {type Computation} from './Computation.js';
import {type IO} from './IO.js';
import {type SafeComputation} from './SafeComputation.js';
import {type Identifiers, type InputTaggedEffect, type Services, type Tag, type Tagged, type TagsOfTaggedUnion, type TaggedUnion} from './Tag.js';
import {type Task} from './Task.js';
import {type Effect} from './definitions.js';

// eslint-disable-next-line @typescript-eslint/array-type, @typescript-eslint/ban-types
type UnifiedServices<ServicesT extends ({} | {}[]), Services2T extends ({} | {}[])> = ServicesT extends Array<{}> ? Services2T extends Array<{}> ? [...ServicesT, ...Services2T] : [...ServicesT, Services2T] : Services2T extends Array<{}> ? [ServicesT, ...Services2T] : [ServicesT, Services2T];

type EffectWithoutInput<EffectT extends Effect<any, any, any>> =
	EffectT extends IO<infer T>
		? IO<T>
		: EffectT extends Task<infer ErrorT, infer OutputT>
			? Task<ErrorT, OutputT>
			: EffectT extends SafeComputation<any, infer OutputT>
				? IO<OutputT>
				: EffectT extends Computation<any, infer ErrorT, infer OutputT>
					? Task<ErrorT, OutputT>
					: never;

type AsyncEffectWithoutInput<EffectT extends Effect<any, any, any>> =
	EffectT extends AsyncIO<infer T>
		? AsyncIO<T>
		: EffectT extends AsyncTask<infer ErrorT, infer OutputT>
			? AsyncTask<ErrorT, OutputT>
			: EffectT extends AsyncSafeComputation<any, infer OutputT>
				? AsyncIO<OutputT>
				: EffectT extends Computation<any, infer ErrorT, infer OutputT>
					? AsyncTask<ErrorT, OutputT>
					: never;

// eslint-disable-next-line @typescript-eslint/array-type, @typescript-eslint/ban-types
type IndexType<ServicesT extends ({} | {}[]), TaggedT extends TaggedUnion<any, ServicesT>> = Identifiers<TaggedT> extends Array<(string | symbol | number)> ? Identifiers<TaggedT>[number] : Identifiers<TaggedT>;

// eslint-disable-next-line @typescript-eslint/array-type, @typescript-eslint/ban-types
export class Environment<ServicesT extends ({} | {}[]), TaggedT extends TaggedUnion<any, ServicesT>> {
	public readonly services: Record<(string | number | symbol), Tagged<any, Services<TaggedT>>>;

	constructor(taggedServices: TaggedT) {
		const taggedArray: TaggedT extends any[] ? TaggedT : TaggedT[] = (Array.isArray(taggedServices) ? taggedServices : [taggedServices]) as TaggedT extends any[] ? TaggedT : TaggedT[];
		const svcs = {} as any as Record<any, Tagged<any, Services<TaggedT>>>;
		for (const tagged of taggedArray) {
			const asTagged = tagged as Tagged<any, Services<TaggedT>>;
			svcs[asTagged._tag.identifier] = asTagged;
		}

		this.services = svcs;
	}

	public unsafeGet<K extends IndexType<ServicesT, TaggedT>>(key: K): Tagged<(string | symbol), Services<TaggedT>> {
		const svc = this.services[key as keyof typeof this.services];
		if (svc === undefined) {
			throw new Error(`Service ${key.toString()} not found in environment`);
		}

		return svc;
	}

	// eslint-disable-next-line @typescript-eslint/array-type, @typescript-eslint/ban-types
	public with<Services2T extends ({} | {}[]), Tagged2T extends TaggedUnion<any, Services2T>>(tagged: Tagged2T): Environment<UnifiedServices<ServicesT, Services2T>, TaggedUnion<any, UnifiedServices<ServicesT, Services2T>>> {
		const newArray = [...this.services.values as any as Array<Tagged<any, Services<TaggedT>>>, ...tagged as Array<Tagged<any, Services2T>>];
		return new Environment(newArray as any as TaggedUnion<any, UnifiedServices<ServicesT, Services2T>>);
	}

	public unsafeBindInput<InputT extends ServicesT, ErrorT, OutputT, EffectT extends Effect<InputT, ErrorT, OutputT>, TaggedEffectT extends InputTaggedEffect<InputT, ErrorT, OutputT, EffectT>>(effect: TaggedEffectT): EffectWithoutInput<TaggedEffectT> {
		const inputTags = effect._inputTags;
		const inputTagsArray = Array.isArray(inputTags) ? inputTags : [inputTags];
		const inputsRecord: Record<(string | symbol), Tagged<(string | symbol), Services<TaggedT>>> = {} as any as Record<(string | symbol), Tagged<(string | symbol), Services<TaggedT>>>;
		for (const inputTag of inputTagsArray) {
			const asTag = inputTag as Tag<(string | symbol), any>;
			if (this.services[asTag.identifier] === undefined) {
				throw new Error(`Service ${asTag.identifier.toString()} not found in environment`);
			}

			inputsRecord[asTag.identifier] = this.services[asTag.identifier];
		}

		const inputs = inputTagsArray.map((inputTag: TagsOfTaggedUnion<TaggedUnion<any, InputT>>) => inputsRecord[(inputTag as Tag<(string | symbol), InputT>).identifier]);
		return effect.toComputation().bindInput(inputs as any as InputT) as EffectWithoutInput<TaggedEffectT>;
	}
}
