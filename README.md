# Custom DI

> 取自Angular源码，删除对InjectFlag，OptionFlag，Parent处理,
> 简单说就是暂时删去了父子间Injector的依赖关系链处理，现在两者Injector实例暂时无法关联

## ReflectiveInjector 与StaticInjector

**Q1**：为何V5之后选择StaticInjector？
Angular团队在V5前后分别设计了两套依赖注入的处理方案，至于为何V5之后选择使用StaticInjector,按照官方说法只是性能考虑，对于兼容性的话其实在现在已不是啥问题，毕竟Reflect应该就只有被淘汰的IE不支持了把？

**Q2**: 那么ReflectiveInjector是一个残次品吗？
并非如此，Angular团队成员还专门提出了这个方案以供其他场景下使用。

**Q3**: 两者区别在哪？

- **ReflectiveInjector**: 使用了reflect作为反射，简单说就是在每个需要注入的类型上加上了标记，然后将标记存放到全局的一个Map（此Map可以在Reflect对于的[core.js源码](https://github.com/zloirock/core-js/blob/caf594934688fbe0d253679a544fa0c05ac2c993/packages/core-js/internals/reflect-metadata.js#L9)看到）中，需要的时候get一下，代码如下：

  ```javascript
  // 打标记
  function ParamDecorator(cls: any, unusedKey: any, index: number) {
    ...
    // parameters here will be [ {token: B} ]
    Reflect.defineMetadata('parameters', parameters, cls);
    return cls;
  }
  
  // 创建注入器
  export function resolveReflectiveProviders(providers: Provider[]): ResolvedReflectiveProvider[] {
    // 格式化Providers 转为[{provide: xx, useClass | other: xx},...]
    const normalized = _normalizeProviders(providers, []);
    // 解析provider，得到class ResolvedReflectiveProvider_{ resolvedFactory: [{fn, deps}] }
    const resolved = normalized.map(resolveReflectiveProvider);
    // 整理并存放到Map中
    const resolvedProviderMap = mergeResolvedReflectiveProviders(resolved, new Map());
    return Array.from(resolvedProviderMap.values());
  }
  
  // 获取
    get(token: any, notFoundValue: any = THROW_IF_NOT_FOUND): any {
      // 利用token 直接获取需要访问的内容
      return this._getByKey(ReflectiveKey.get(token), null, notFoundValue);
    }
  ```

  说实话这样的处理方式在get时候很方便，利用reflect可以马上知道需要注入的内容。

- **StaticInjector**: 不会解析隐式依赖，相反，它需要开发者为每一个提供商显式指定依赖，它的处理方案则是显示的提供deps数组，在create时存放deps，并在get时候遍历deps取出需要的dep，并注入其中，创建返回开发者

  ```javascript
  export class StaticInjector implements Injector {
    // 创建Injector
  		constructor(providers: StaticProvider[], source: string | null = null) {
          this.source = source;
        		// 为每个Injector单独创建一个Map
          const records = this._records = new Map<any, Record>();
          ...
          // 递归创建Providers，并存放在Map中
          this.scope = recursivelyProcessProviders(records, providers);
      }
  		// 获取
  		get<T>(token: Type<T> | InjectionToken<T>, notFoundValue?: T): T;
    get(token: any, notFoundValue?: any): any;
    get(token: any, notFoundValue?: any): any {
          const records = this._records;
          let record = records.get(token);
          if (record === undefined) {
              records.set(token, null);
          }
          let lastInjector = setCurrentInjector(this);
          try {
            		// 重点在这，此方法将会解析出对应的内容，具体可以参考我从Angular 中抽出的简化版DI
              return tryResolveToken(token, record, records, notFoundValue);
          } catch (e) {
          } finally {
              setCurrentInjector(lastInjector);
          }
      }
  }
  
  // 递归创建Providers，关键一步，此方法中利用compuuteDeps处理相关依赖，并存放到deps数组中，最终会在recursivelyProcessProviders中set到Records下存放
  function resolveProvider(provider: SupportedProvider): Record {
      const deps = computeDeps(provider);
      let fn: Function = IDENT;
      let value: any = EMPTY;
      let useNew: boolean = false;
      let provide = resolveForwardRef(provider.provide);
     		...
      return {deps, fn, useNew, value};
  }
  ```

  可以看到，事实上在没有reflect的时候get时需要对所需的deps进行查找，上面的代码是我简化后的，在Angular源码中事实上还有存在Parent Injector的关系链，有些deps会到Parent上查找。[传送门](https://github.com/angular/angular/blob/7954c8dfa3c85d12780949c75f1448c8d783a8cf/packages/core/src/di/injector.ts#L353)

## 五类Provider简介

> 具体的使用方法看测试吧！我参照官方给的例子分别对应写了5个测试，我投个懒就不讲了[传送门](https://github.com/chongqiangchen/custom-di/blob/master/src/__test__/injector.test.ts)

1. ValueProvider

   使用useValue指定的值(可以是具体的对象也可以是string ,number等等之类的值)就是Token依赖的对象。

2. ExistingProvider

   想获取Token(provide)对应的对象的时候, 获取当前使用useExisting(Token)对应的对象。

3. StaticClassProvider

   useClass指定的Type创建的对应对象就是Token对应的对象。

4. ConstructorProvider

   使用给定的provide创建对象，并且Token也是给定的provide。这也是我们用的最多的一种方式

5. FactoryProvider

   通过调用 useFactory对应的函数，返回Token对应的依赖对象。
