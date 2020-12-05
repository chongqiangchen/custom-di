import {getClosureSafeProperty} from "./utils/property";
import {ValueProvider} from "./interface/provider";
import {Injector} from "./injector";
import {stringify} from "querystring";

export const NG_TEMP_TOKEN_PATH = 'ngTempTokenPath';
export const THROW_IF_NOT_FOUND = {};

export const USE_VALUE =
    getClosureSafeProperty<ValueProvider>({provide: String, useValue: getClosureSafeProperty});

/**
 * inject使用的当前注入器值。
 * `undefined`：调用inject是一个错误`
 * `null`:inject可以调用，但没有injector（limp mode）。
 * 注射器实例：使用注射器进行解析。
 */
let _currentInjector: Injector|undefined|null = undefined;

export function setCurrentInjector(injector: Injector|null|undefined): Injector|undefined|null {
    const former = _currentInjector;
    _currentInjector = injector;
    return former;
}

export class NullInjector implements Injector {
    get(token: any, notFoundValue: any = THROW_IF_NOT_FOUND): any {
        if (notFoundValue === THROW_IF_NOT_FOUND) {
            const error = new Error(`NullInjectorError: No provider for ${stringify(token)}!`);
            error.name = 'NullInjectorError';
            throw error;
        }
        return notFoundValue;
    }
}
