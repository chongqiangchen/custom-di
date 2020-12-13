import {Injector} from "../injector";
import {InjectionToken} from "../injector-token";
import {Optional, Self} from "../metadata";


describe("test all type of injector", () => {
    it('should value when create ValueInjector', function () {
        // useValue指定的值(可以是具体的对象也可以是string ,number等等之类的值)就是Token依赖的对象。
        const injector = Injector.create([{provide: String, useValue: 'Hello'}]);

        expect(injector.get(String)).toEqual('Hello');
    });

    it('should return a value of another useExisting token when create ExistingProvider', function () {
        class Greeting {
            salutation = 'Hello';
        }

        class FormalGreeting extends Greeting {
            salutation = 'Greetings';
        }

        // 想获取Token(provide)对应的对象的时候, 获取当前使用useExisting(Token)对应的对象。
        // useExisting对应的值也是一个Token
        const injector = Injector.create([
            {provide: FormalGreeting, deps: []},
            {provide: Greeting, useExisting: FormalGreeting}
        ]);

        expect(injector.get(Greeting).salutation).toEqual('Greetings');
        expect(injector.get(FormalGreeting).salutation).toEqual('Greetings');
        expect(injector.get(FormalGreeting)).toBe(injector.get(Greeting));
    });

    it('should return an instance of useClass for a token when create StaticClassProvider', function () {
        abstract class Shape {
            name!: string;
        }

        class Square extends Shape {
            name = 'square';
        }

        // useClass指定的Type创建的对应对象就是Token对应的对象。
        const injector = Injector.create([{provide: Shape, useClass: Square, deps: []}]);

        const shape: Shape = injector.get(Shape);
        expect(shape.name).toEqual('square');
        expect(shape instanceof Square).toBe(true);
    });

    it('should return an instance of a token when create ConstructorProvider', function () {
        class Square {
            name = 'square';
        }

        // 使用给定的provide创建对象，并且Token也是给定的provide。这也是我们用的最多的一种方式
        const injector = Injector.create({providers: [{provide: Square, deps: []}]});

        const shape: Square = injector.get(Square);
        expect(shape.name).toEqual('square');
        expect(shape instanceof Square).toBe(true);
    });

    it('should return a value by invoking a useFactory function when create FactoryProvider', function () {
        const Location = new InjectionToken('location');
        const Hash = new InjectionToken('hash');

        // 通过调用 useFactory对应的函数，返回Token对应的依赖对象。
        // useFactory对应一个函数，该函数需要的对象通过deps提供，deps是一个Token数组。
        const injector = Injector.create([{
            provide: Hash,
            useFactory: (location: string) => `Hash for: ${location}`,
            deps: [[Location]]
        }]);

        expect(injector.get(Hash)).toEqual('Hash for: null');
    });
})

describe("test InjectFlags", () => {
    it('should return null when set optional flag', function () {
        class Engine {}

        class Car {
            constructor(public engine: Engine) {}
        }

        const injector =
            Injector.create({providers: [{provide: Car, deps: [[new Optional(), Engine]]}]});
        expect(injector.get(Car).engine).toBeNull();
    });

    it('should ', function () {
        class Dependency {}

        class NeedsDependency {
            constructor(public dependency: Dependency) {
                this.dependency = dependency;
            }
        }

        const parent = Injector.create({providers: [{provide: Dependency, deps: []}]});
        const child =
            Injector.create({providers: [{provide: NeedsDependency, deps: [Dependency]}], parent});

        expect(child.get(NeedsDependency).dependency instanceof Dependency).toBe(true);

        const inj = Injector.create(
            {providers: [{provide: NeedsDependency, deps: [[new Self(), Dependency]]}]});

        expect(() => inj.get(NeedsDependency)).toThrowError();
    });
})
