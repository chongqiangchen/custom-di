import {getClosureSafeProperty} from "./property";
import {stringify} from "querystring";
import {Type} from "../interface/types";

export interface ForwardRefFn {
    (): any;
}

const __forward_ref__ =
    getClosureSafeProperty({__forward_ref__: getClosureSafeProperty});

export function forwardRef(forwardRefFn: ForwardRefFn): Type<any> {
    (<any>forwardRefFn).__forward_ref__ = forwardRef;
    (<any>forwardRefFn).toString = function() {
        return stringify(this());
    };
    return (<Type<any>><any>forwardRefFn);
}

export function resolveForwardRef<T>(type: T): T {
    return isForwardRef(type) ? type() : type;
}

/** Checks whether a function is wrapped by a `forwardRef`. */
export function isForwardRef(fn: any): fn is() => any {
    return typeof fn === 'function' && fn.hasOwnProperty(__forward_ref__) &&
        fn.__forward_ref__ === forwardRef;
}
