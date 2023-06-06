/**
 * Encapsulates a getter for `ProjectionT` from `InputT` and a replacement-function which replaces `ProjectionT` with `ReplacementT` in `InputT`.
 */
export class AdaptiveLens<InputT, ProjectionT, ReplacementT, OutputT> {
	/**
	 * Is called with generic parameters for the input and replacement.
	 * The resulting function is called the name of a property in `Input2T` and returns an {@link AdaptiveLens} for that property with replacement `Replacement2`.
	 */
	// eslint-disable-next-line @typescript-eslint/ban-types
	static forProperty<Input2T extends object, Replacement2>() {
		return function <K extends keyof Input2T, Output2T extends Omit<Input2T, K> & Record<K, Replacement2>>(name: K): AdaptiveLens<Input2T, Input2T[K], Replacement2, Output2T> {
			return new AdaptiveLens<Input2T, Input2T[K], Replacement2, Output2T>(
				(i: Input2T) => i[name],
				(i: Input2T, pr: Replacement2) => {
					const iCopy = Object.create(i) as Output2T;
					Object.assign(iCopy, i);
					// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
					delete iCopy[name];
					const newProp: Partial<Record<K, Replacement2>> = {};
					newProp[name] = pr;
					Object.assign(iCopy, newProp);
					return iCopy;
				},
			);
		};
	}

	/**
	 * Is called with generic parmameters for the input and replacement.
	 * The resulting function is called with an array of property names in `Input2T` and returns an {@link AdaptiveLens} for those properties with replacement `Replacement2T`.
	 */
	// eslint-disable-next-line @typescript-eslint/ban-types
	static forProperties<Input2T extends object, Replacement2T>() {
		return function <K extends Array<keyof Input2T>, Output2T extends Omit<Input2T, K[number]> & {[PK in keyof Replacement2T]: Replacement2T[PK]}>(
			names: [...K],
		): AdaptiveLens<Input2T, {[N in keyof K]: Input2T[K[N]]}, Replacement2T, Output2T> {
			const projector = (i: Input2T) => {
				const tuple = [] as unknown as {[N in keyof K]: Input2T[K[N]]};
				for (const name of names) {
					tuple.push(i[name]);
				}

				return tuple;
			};

			const updater = (i: Input2T, newData: Replacement2T): Output2T => {
				const iCopy = Object.create(i) as Input2T;
				Object.assign(iCopy, i);
				for (const name of names) {
					// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
					delete iCopy[name as keyof Input2T];
				}

				Object.assign(iCopy, newData);
				return iCopy as unknown as Output2T;
			};

			return new AdaptiveLens(projector, updater);
		};
	}

	constructor(
		// Gets the `ProjectionT` from `InputT`.
		public readonly get: (i: InputT) => ProjectionT,
		// Replaces the `ProjectionT` in `InputT` with `ReplacementT`.
		public readonly update: (i: InputT, p: ReplacementT) => OutputT,
	) {}

	/**
	 * Composes this {@link AdaptiveLens} with another `AdaptiveLens` from properties of the projection of this lens to some other replacement.
	 */
	compose<Projection2T extends ProjectionT[keyof ProjectionT], Projection2ReplacementT>(l2: AdaptiveLens<ProjectionT, Projection2T, Projection2ReplacementT, ReplacementT>): AdaptiveLens<InputT, Projection2T, Projection2ReplacementT, OutputT> {
		return new AdaptiveLens(
			(i: InputT) => l2.get(this.get(i)),
			(i: InputT, p2r: Projection2ReplacementT) => this.update(i, l2.update(this.get(i), p2r)),
		);
	}
}
