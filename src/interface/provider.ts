import {Type} from "./types";

export type StaticProvider =
    ValueProvider | ExistingProvider | StaticClassProvider | ConstructorProvider | FactoryProvider | any[];

/**
 * 使用
 * const injector = Injector.create([{provide: String, useValue: 'Hello'}]);
 */
export interface ValueProvider {
    provide: any;
    multi?: boolean;
    useValue: any;
}

/**
 * 使用
 * const injector = Injector.create([{provide: FormalGreeting, deps: []},
 * {provide: Greeting, useExisting: FormalGreeting}]);
 */
export interface ExistingProvider {
    provide: any;
    multi?: boolean;
    useExisting: any;
}

/**
 * 使用：
 * const injector = Injector.create([{provide: Shape, useClass: Square, deps: []}]);
 */
export interface StaticClassProvider {
    provide: any
    multi?: boolean
    useClass: Type<any>
    deps: any[]
}

/**
 * 使用：
 * const injector = Injector.create({providers: [{provide: Square, deps: []}]});
 */
export interface ConstructorProvider {
    provide: Type<any>
    multi?: boolean
    deps?: any[]
}

/**
 * 使用：
 * const injector = Injector.create([{
 * provide: Hash,
 * useFactory: (location: string) => `Hash for: ${location}`,
 * // use a nested array to define metadata for dependencies.
 * deps: [[new Optional(), Location]]
 * }]);
 */
export interface FactoryProvider {
    provide: any
    multi?: boolean

    // 继承自 core/FactorySansProvider
    useFactory: Function
    deps?: any[]
}


