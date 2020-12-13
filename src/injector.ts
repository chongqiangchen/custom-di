import {AbstractType, Type} from "./interface/types";
import {InjectionToken} from "./injector-token";
import {
    ConstructorProvider,
    ExistingProvider,
    FactoryProvider,
    StaticClassProvider,
    StaticProvider,
    ValueProvider
} from "./interface/provider";
import {stringify} from "querystring";
import {resolveForwardRef} from "./utils/stringify";
import {
    NG_TEMP_TOKEN_PATH,
    THROW_IF_NOT_FOUND,
    NullInjector,
    setCurrentInjector,
    USE_VALUE
} from "./injector_compatibility";
import {InjectFlags, OptionFlags} from "./constants";
import {Inject, Optional, Self, SkipSelf} from "./metadata";

export function INJECTOR_IMPL(
    providers: StaticProvider[], parent: Injector | undefined, name: string) {
    return new StaticInjector(providers, parent, name);
}

const IDENT = function <T>(value: T): T {
    return value;
};
const CIRCULAR = IDENT;
const EMPTY = <any[]>[];

type SupportedProvider =
    ValueProvider | ExistingProvider | StaticClassProvider | ConstructorProvider | FactoryProvider;

interface Record {
    fn: Function;
    useNew: boolean;
    deps: DependencyRecord[];
    value: any;
}

interface DependencyRecord {
    token: any;
    options: number;
}


export abstract class Injector {
    static THROW_IF_NOT_FOUND = THROW_IF_NOT_FOUND;
    static NULL: Injector = new NullInjector();

    abstract get<T>(
        token: Type<T> | InjectionToken<T> | AbstractType<T>, notFoundValue?: T, flags?: InjectFlags): T;
    abstract get<T>(token: any, notFoundValue: any): any;


    static create(providers: StaticProvider[]): Injector;
    static create(options: { providers: StaticProvider[], parent?: Injector, name?: string }): Injector;
    static create(
        options: StaticProvider[] | { providers: StaticProvider[], parent?: Injector, name?: string },
        parent?: Injector): Injector {
        if (Array.isArray(options)) {
            return INJECTOR_IMPL(options, parent, '');
        } else {
            return INJECTOR_IMPL(options.providers, options.parent, options.name || '');
        }
    }
}

export class StaticInjector implements Injector {
    readonly parent: Injector;
    readonly source: string | null;
    readonly scope: string | null;

    private readonly _records: Map<any, Record | null>;

    constructor(providers: StaticProvider[], parent: Injector = Injector.NULL, source: string | null = null) {
        this.parent = parent;
        this.source = source;
        const records = this._records = new Map<any, Record>();
        this._records.set(Injector, <Record>{token: Injector, fn: IDENT, deps: EMPTY, value: this, useNew: false});
        this.scope = recursivelyProcessProviders(records, providers);
    }

    get<T>(token: Type<T> | InjectionToken<T>, notFoundValue?: T, flags?: InjectFlags): T;
    get(token: any, notFoundValue?: any): any;
    get(token: any, notFoundValue?: any, flags: InjectFlags = InjectFlags.Default): any {
        const records = this._records;
        let record = records.get(token);
        if (record === undefined) {
            records.set(token, null);
        }
        let lastInjector = setCurrentInjector(this);
        try {
            return tryResolveToken(token, record, records, this.parent, notFoundValue, flags);
        } catch (e) {
            throw Error('获取依赖失败');
        } finally {
            setCurrentInjector(lastInjector);
        }
    }

    toString() {
        const tokens = <string[]>[], records = this._records;
        records.forEach((v, token) => tokens.push(stringify(token)));
        return `StaticInjector[${tokens.join(', ')}]`;
    }
}

function recursivelyProcessProviders(records: Map<any, Record>, provider: StaticProvider): string |
    null {
    let scope = null;
    if (provider) {
        provider = resolveForwardRef(provider);
        if (Array.isArray(provider)) {
            for (let i = 0; i < provider.length; i++) {
                scope = recursivelyProcessProviders(records, provider[i]) || scope;
            }
        } else if (typeof provider === 'function') {
            // Functions were supported in ReflectiveInjector, but are not here. For safety give useful
            // error messages
            throw Error('Function/Class not supported' + provider);
        } else if (provider && typeof provider === 'object' && provider.provide) {
            const token = resolveForwardRef(provider.provide);
            const resolvedProvider = resolveProvider(provider);
            // todo: multi
            // todo: INJECTOR_SCOPE
            records.set(token, resolvedProvider);
        } else {
            throw Error('Unexpected provider' + provider);
        }
    }

    return scope;
}

function resolveProvider(provider: SupportedProvider): Record {
    const deps = computeDeps(provider);
    let fn: Function = IDENT;
    let value: any = EMPTY;
    let useNew: boolean = false;
    let provide = resolveForwardRef(provider.provide);
    if (USE_VALUE in provider) {
        value = (provider as ValueProvider).useValue;
    } else if ((provider as FactoryProvider).useFactory) {
        fn = (provider as FactoryProvider).useFactory;
    } else if ((provider as ExistingProvider).useExisting) {
        // Just use IDENT
    } else if ((provider as StaticClassProvider).useClass) {
        useNew = true;
        fn = resolveForwardRef((provider as StaticClassProvider).useClass);
    } else if (typeof provide == 'function') {
        useNew = true;
        fn = provide;
    } else {
        throw Error(
            'StaticProvider does not have [useValue|useFactory|useExisting|useClass] or [provide] is not newable' + provider);
    }
    return {deps, fn, useNew, value};
}

function computeDeps(provider: StaticProvider): DependencyRecord[] {
    let deps: DependencyRecord[] = EMPTY;
    const providerDeps: any[] =
        (provider as ExistingProvider & StaticClassProvider & ConstructorProvider).deps;
    if (providerDeps && providerDeps.length) {
        deps = [];
        for (let i = 0; i < providerDeps.length; i++) {
            let options = OptionFlags.Default;
            let token = resolveForwardRef(providerDeps[i]);
            if (Array.isArray(token)) {
                for (let j = 0, annotations = token; j < annotations.length; j++) {
                    const annotation = annotations[j];
                    if (annotation instanceof Optional || annotation == Optional) {
                        options = options | OptionFlags.Optional; // CheckParent | CheckSelf | Optional
                    } else if (annotation instanceof SkipSelf || annotation == SkipSelf) {
                        options = options & ~OptionFlags.CheckSelf; // CheckParent
                    } else if (annotation instanceof Self || annotation == Self) {
                        options = options & ~OptionFlags.CheckParent; // CheckSelf
                    } else if (annotation instanceof Inject) {
                        token = (annotation as Inject).token;
                    } else {
                        token = resolveForwardRef(annotation);
                    }
                }
            }
            deps.push({token, options});
        }
    } else if ((provider as ExistingProvider).useExisting) {
        const token = resolveForwardRef((provider as ExistingProvider).useExisting);
        deps = [{token, options: OptionFlags.Default}];
    } else if (!providerDeps && !(USE_VALUE in provider)) {
        // useValue & useExisting are the only ones which are exempt from deps all others need it.
        throw Error('\'deps\' required' + provider);
    }
    return deps;
}

function tryResolveToken(token: any, record: Record | undefined | null, records: Map<any, Record | null>,
                         parent: Injector, notFoundValue: any, flags: InjectFlags
) {
    try {
        return resolveToken(token, record, records, parent, notFoundValue, flags);
    } catch (e) {
        if (!(e instanceof Error)) {
            e = new Error(e);
        }
        const path: any[] = e[NG_TEMP_TOKEN_PATH] = e[NG_TEMP_TOKEN_PATH] || [];
        path.unshift(token);
        if (record && record.value == CIRCULAR) {
            // Reset the Circular flag.
            record.value = EMPTY;
        }
        throw e;
    }
}

function resolveToken(token: any, record: Record | undefined | null, records: Map<any, Record | null>,
                      parent: Injector, notFoundValue: any, flags: InjectFlags,
) {
    let value;
    if (record) {
        value = record.value;
        if (value == CIRCULAR) {
            throw Error('Circular dependency');
        } else if (value === EMPTY) {
            record.value = CIRCULAR;
            let obj = undefined;
            let useNew = record.useNew;
            let fn = record.fn;
            let depRecords = record.deps;
            let deps = EMPTY;
            if (depRecords.length) {
                deps = [];
                for (let i = 0; i < depRecords.length; i++) {
                    const depRecord: DependencyRecord = depRecords[i];
                    const options = depRecord.options;
                    const childRecord =
                        options & OptionFlags.CheckSelf ? records.get(depRecord.token) : undefined;
                    // 默认为Optional
                    deps.push(tryResolveToken(
                        depRecord.token,
                        childRecord,
                        records,
                        !childRecord && !(options & OptionFlags.CheckParent) ? Injector.NULL : parent,
                        options & OptionFlags.Optional ? null : Injector.THROW_IF_NOT_FOUND,
                        InjectFlags.Default
                    ));
                }
            }
            record.value = value = useNew ? new (fn as any)(...deps) : fn.apply(obj, deps);
        }
    } else if (!(flags & InjectFlags.Self)) {
        // 若为Self,此时parent为NULL, notFoundValue = Throw_if_not_found, 在Injector.NULL中会报错
        value = parent.get(token, notFoundValue, InjectFlags.Default);
    } else if (!(flags & InjectFlags.Optional)) {
        value = Injector.NULL.get(token, notFoundValue);
    } else {
        value = Injector.NULL.get(token, typeof notFoundValue !== 'undefined' ? notFoundValue : null);
    }
    return value;
}








