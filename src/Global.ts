/**
 * Taken from https://github.com/Effect-TS/data/blob/main/src/Global.ts
 */

const globalStoreId = Symbol.for('@mbauer83/ts-functional/globalStoreId');

if (!(globalStoreId in globalThis)) {
	(globalThis as any)[globalStoreId] = new Map();
}

const globalStore = (globalThis as any)[globalStoreId] as Map<unknown, any>;

export const globalValue = <A>(id: unknown, compute: () => A): A => {
	if (!globalStore.has(id)) {
		globalStore.set(id, compute());
	}

	return globalStore.get(id)! as A;
};
