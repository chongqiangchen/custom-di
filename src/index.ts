import {Injector} from "./injector";


const injector = Injector.create([{provide: String, useValue: 'Hello'}]);
console.log(injector.get(String));

class Square {
    name = 'square';
}
const injector1 = Injector.create({providers: [{provide: Square, deps: []}]});

const shape: Square = injector1.get(Square);
console.log(shape.name);
