export const Type = Function;

export interface AbstractType<T> extends Function {
  prototype: T;
}

export interface Type<T> extends Function {
  new (...args: any[]): T;
}
