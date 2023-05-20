export type Throwable = Error | string | ((...args: any[]) => Error) | ((...args: any[]) => string);
export class QueriedValueNotPresent extends Error {
    constructor(queryDescription: string) {
        super('Queried value not present: ' + queryDescription);
    }
}
