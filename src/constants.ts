export const enum OptionFlags {
    Optional = 1 << 0,
    CheckSelf = 1 << 1,
    CheckParent = 1 << 2,
    Default = CheckSelf | CheckParent
}

export enum InjectFlags {
    /** Check self and check parent injector if needed */
    Default = 0b0000,
    /**
     * Specifies that an injector should retrieve a dependency from any injector until reaching the
     * host element of the current component. (Only used with Element Injector)
     */
    Host = 0b0001,
    /** Don't ascend to ancestors of the node requesting injection. */
    Self = 0b0010,
    /** Skip the node that is requesting injection. */
    SkipSelf = 0b0100,
    /** Inject `defaultValue` instead if token not found. */
    Optional = 0b1000,
}

