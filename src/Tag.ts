/* eslint-disable @typescript-eslint/ban-types */
/**
 * Inspired by https://github.com/Effect-TS/data/blob/main/src/internal/Context.ts
 */

import {type Effect, type AsyncEffect} from './definitions.js';

export interface Tag<IdentifierT extends (string | symbol), T extends {}> {
	readonly isTag: true;
	readonly identifier: IdentifierT;
}

export type Tagged<IdentifierT extends (string | symbol), T extends {}> = T & {readonly _tag: Tag<IdentifierT, T>};

export type InputTaggedEffect<InputT extends ({} | Array<{}>), ErrorT, OutputT, EffectT extends (Effect<InputT, ErrorT, OutputT> | AsyncEffect<InputT, ErrorT, OutputT>)> = EffectT & {_inputTags: TagsOfTaggedUnion<TaggedUnion<any, InputT>>};
export function tagEffectInput<InputT extends ({} | Array<{}>), ErrorT, OutputT, EffectT extends (Effect<InputT, ErrorT, OutputT> | AsyncEffect<InputT, ErrorT, OutputT>)>(effect: EffectT, tags: TagsOfTaggedUnion<TaggedUnion<any, InputT>>): InputTaggedEffect<InputT, ErrorT, OutputT, EffectT> {
	return Object.assign(effect, {_inputTags: tags});
}

export type TaggedUnion<IdentifiersT extends (string | symbol | Array<(string | symbol)>), Ts extends ({} | Array<{}>)>
	= IdentifiersT extends Array<(string | symbol)>
		? [keyof IdentifiersT] extends [keyof Ts]
			? [keyof Ts] extends [keyof IdentifiersT]
				? {
					[K in (keyof IdentifiersT & keyof Ts)]:
					IdentifiersT[K] extends (string | symbol)
						? Ts[K] extends {}
							? Tagged<IdentifiersT[K], Ts[K]>
							: never
						: never
				}
				: never
			: never
		: IdentifiersT extends (string | symbol)
			? Ts extends {}
				? Tagged<IdentifiersT, Ts>
				: never
			: never;

export type Service<T extends Tag<any, any>> = T extends Tag<any, infer U> ? U : never;
export type Identifier<T extends Tag<any, any>> = T extends Tag<infer U, any> ? U : never;

export type Services<T extends TaggedUnion<any, any>> = T extends TaggedUnion<any, infer U> ? U : never;
export type Identifiers<T extends TaggedUnion<any, any>> = T extends TaggedUnion<infer U, any> ? U : never;

export type TagOfTagged<T extends Tagged<any, any>> = T extends Tagged<infer NameT, infer TypeT> ? Tag<NameT, TypeT> : never;
export type TagsOfTaggedUnion<T extends TaggedUnion<any, any>>
	= T extends TaggedUnion<infer NamesT, infer TypesT>
		? NamesT extends Array<(string | symbol)>
			? {
				[K in (keyof NamesT & keyof TypesT)]:
				NamesT[K] extends (string | symbol)
					? TypesT[K] extends {}
						? Tag<NamesT[K], TypesT[K]>
						: never
					: never
			}
			: TagOfTagged<T>
		: never;

export function getTag<IdentifierT extends (string | symbol), T extends {}>(tagged: Tagged<IdentifierT, T>): Tag<IdentifierT, T> {
	return tagged._tag;
}

export function getTags<IdentifiersT extends (string | symbol | Array<(string | symbol)>), Ts extends ({} | Array<{}>)>(taggedUnion: TaggedUnion<IdentifiersT, Ts>): TagsOfTaggedUnion<TaggedUnion<IdentifiersT, Ts>> {
	if (Array.isArray(taggedUnion)) {
		return taggedUnion.map((tagged: Tagged<any, any>) => getTag(tagged)) as any as TagsOfTaggedUnion<TaggedUnion<IdentifiersT, Ts>>;
	}

	return getTag(taggedUnion as Tagged<any, any>) as TagsOfTaggedUnion<TaggedUnion<IdentifiersT, Ts>>;
}

export function tagged<IdentifierT extends (string | symbol), T extends {}>(identifier: IdentifierT, value: T): Tagged<IdentifierT, T> {
	return Object.assign(
		value,
		new class {
			readonly _tag: Tag<IdentifierT, T> = {isTag: true, identifier};
		}(),
	);
}

export function withTag<IdentifierT extends (string | symbol), T extends {}>(tag: Tag<IdentifierT, T>, value: T): Tagged<IdentifierT, T> {
	return Object.assign(
		value,
		new class {
			readonly _tag: Tag<IdentifierT, T> = tag;
		}(),
	);
}

export const anyTag: Tag<'any', any> = {isTag: true, identifier: 'any'};
export const anyArrayTag: Tag<'anyArray', any[]> = {isTag: true, identifier: 'anyArray'};
