# Custom DI

> 取自Angular源码，处理,
>
> 删去部分
> 1. 暂时删除对InjectFlag，OptionFlag，Parent（用于处理父子间Injector的依赖关系链），现在两者Injector实例暂时无法关联
> 2. 暂时删去multi处理

## 学习文章
1. [Angular DI解析 - 1](./doc/Angular%20DI解析%20-%201.md) Angular DI介绍
2. [Angular DI解析 - 2](./doc/Angular%20DI解析%20-%202.md) StaticInjector Create源码解析
3. [Angular DI解析 - 3](./doc/Angular%20DI解析%20-%203.md) StaticInjector Get源码解析(doing)

## 将要做的事情
1. 补充未完成讲解内容（get）
2. 将前面提到的InjectFlag，OptionFlag，Parent处理这一块加入到该项目中
3. 讲解InjectFlag，OptionFlag进行处理的小技巧
4. 结合装饰器进一步完善DI系统
