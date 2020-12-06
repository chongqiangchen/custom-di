>  前文已经简单的介绍了下Angular DI，这篇文章将主要讲解StaticInjector中是如何创建对应的依赖
>
> 注意： 此文讲解删去了Parent Injector, multi的处理，展现的源码也是删减后的，在之后的文章中会进行补充，删减较多的地方将会给出Angular源码对应的内容地址

## StaticInjector Create

如果有简单的了解过Angular Inejctor的时候，大概知道底层中Injector创建是从Injector.create开始，我们看看此方法做了什么：

```typescript
// Injector 
static create(providers: StaticProvider[]): Injector;
static create(options: { providers: StaticProvider[], name?: string }): Injector;
static create(options: StaticProvider[] | { providers: StaticProvider[], name?: string 		     }): Injector {
        if (Array.isArray(options)) {
            return INJECTOR_IMPL(options, '');
        } else {
            return INJECTOR_IMPL(options.providers, options.name || '');
        }
   }

// INJECTOR_IMPL
export function INJECTOR_IMPL(
    providers: StaticProvider[], name: string) {
    return new StaticInjector(providers, name);
}
```

比较简单，可以看到，其实就是将providers和name丢给StaticInjector类进行构建，那么继续看：

```typescript
export class StaticInjector implements Injector {
    readonly source: string | null;
    readonly scope: string | null;

    private readonly _records: Map<any, Record | null>;

    constructor(providers: StaticProvider[], source: string | null = null) {
        this.source = source;
        const records = this._records = new Map<any, Record>();
        this._records.set(Injector, <Record>{token: Injector, fn: IDENT, deps: EMPTY, value: this, useNew: false});
        this.scope = recursivelyProcessProviders(records, providers);
    }
    ... 
```

这里可以看到的比较明确，简单总结下：

1. this.source = source 此处看来应该是做一个命名，[Angular源码](https://github.com/angular/angular/blob/a1b6ad07a894421c4a741f6831d684d5e68f85e1/packages/core/src/di/injector.ts#L186)中看应该为报错而存放的内容
2. 接下来就是在此Injector中创建一个Map来存放相关的Provider（经过相关处理后，类型为[Record](https://github.com/angular/angular/blob/a1b6ad07a894421c4a741f6831d684d5e68f85e1/packages/core/src/di/injector.ts#L202)）
3. 每个Injector都会注入Injector，为应一些场景需要在对应的component,service中调用Injector
4. recursivelyProcessProviders这是重点方法，此处会将providers进行处理，然后转化为Record类型存放到Map中

### recursivelyProcessProviders

> 此处Angular源码[传送门](https://github.com/angular/angular/blob/a1b6ad07a894421c4a741f6831d684d5e68f85e1/packages/core/src/di/injector.ts#L245)

```typescript
function recursivelyProcessProviders(records: Map<any, Record>, provider: StaticProvider): string | null {
    let scope = null;
    if (provider) {
        provider = resolveForwardRef(provider);
        if (Array.isArray(provider)) {
            for (let i = 0; i < provider.length; i++) {
                scope = recursivelyProcessProviders(records, provider[i]) || scope;
            }
        } else if (typeof provider === 'function') {
            throw Error('Function/Class not supported' + provider);
        } else if (provider && typeof provider === 'object' && provider.provide) {
          	 // 重点在这
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
```

简单总结：

1. 若是Provider是一个数组，则再次调用recursivelyProcessProviders递归处理
2. 若是function，则抛出错误，在StaticInjector中function的Provider是不允许的，这里function或者class的Provider是指：`Injector.create( function() { return [{provide: xxx, deps: []},{...}]} )` create的参数providers不允许是function/class
3. 核心在这，若是provider存在，为对象且provider.provide存在，则将获取利用provide作为token，其次在解析provider获取真正需要的存放的function（resolveProvider：处理第一篇文中提到的五类Provider），然后存入Map中。（resolveForwardRef： 可能有人会好奇这个是什么用，简单说就是配合forwardRef将一个暂未定义的Class提前处理，以避免前后顺序造成未定义的问题出现，可以看下[官方例子](https://angular.cn/api/core/forwardRef)）

### resolveProvider

```typescript
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
```

这里还是比较明确，对五大类分别做了相应的处理，此处你可以先看第一篇文中提到的测试，然后再来理解会比较容易，我就简单说下useExisting的处理，事实上在computeDeps中会将useExisting的值作为一个Token存放到deps中，在get时候存在一步` fn.apply(obj, deps)` 这里将会调用IDENT的方法将deps中的token替换provide内容

### computeDeps

> 再次提醒，文中的代码是做了裁剪的。此处Angular源码[传送门](https://github.com/angular/angular/blob/a1b6ad07a894421c4a741f6831d684d5e68f85e1/packages/core/src/di/injector.ts#L370)

```typescript
function computeDeps(provider: StaticProvider): DependencyRecord[] {
    let deps: DependencyRecord[] = EMPTY;
    const providerDeps: any[] =
        (provider as ExistingProvider & StaticClassProvider & ConstructorProvider).deps;
    if (providerDeps && providerDeps.length) {
        deps = [];
        for (let i = 0; i < providerDeps.length; i++) {
            let token = resolveForwardRef(providerDeps[i]);
 														... 
            deps.push({token});
        }
    } else if ((provider as ExistingProvider).useExisting) {
        const token = resolveForwardRef((provider as ExistingProvider).useExisting);
        deps = [{token}];
    } else if (!providerDeps && !(USE_VALUE in provider)) {
        throw Error('\'deps\' required' + provider);
    }
    return deps;
}

```

简单总结：

1. 获取provider.deps，判断是否存在，若存在则将每个dep作为token存放到deps中（注意：源码在我上面代码省略的地方会多做一步，涉及到[OptionFlags](https://github.com/angular/angular/blob/a1b6ad07a894421c4a741f6831d684d5e68f85e1/packages/core/src/di/injector.ts#L132)，后续文章会提到）
2. 第二个条件分支就是前面提到过的，对useExisting做了特殊处理，这里也可以看到useExisting的值也是一个存在于providers中的Token

回过头在看下StaticInjector类，事实上创建的工作到此为止，总结一下：

1. 创建records = new Map()
2. 递归处理传入的Providers,将其中各种类型Provider统一转化为[Record](https://github.com/angular/angular/blob/a1b6ad07a894421c4a741f6831d684d5e68f85e1/packages/core/src/di/injector.ts#L202)类型，并存放进Map中