export class InjectionToken<T> {
    /** @internal */
    readonly ngMetadataName = 'InjectionToken';

    constructor(protected _desc: string) {
    }

    toString(): string {
        return `InjectionToken ${this._desc}`;
    }
}
