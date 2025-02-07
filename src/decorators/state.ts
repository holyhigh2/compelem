import { cloneDeep, has, merge } from "myfx";
import { CompElem } from "../CompElem";
import { DecoratorKey } from "../constants";
import { _getSuper } from "../utils";

export type StateOption = {
  /**
   * 指定prop进行初始化，如果时对象类型时
   */
  prop?: string,
  /**
   * 是否发生变更，如果未指定使用严格相等
   * @param newValue 
   * @param oldValue 
   * @returns 
   */
  hasChanged?: (newValue: any, oldValue: any) => boolean
};

/**
 * 声明一个可双向变动的属性
 * @param options 可选参数 {prop从prop获取初始值}，如果type未定义则根据默认值自动推断类型
 */
export function state(target: any, stateKey: any): void;
export function state(
  options: StateOption
): (target: any, stateKey: any) => void;
export function state(options: StateOption) {
  if (arguments.length === 1) {
    return (target: any, stateKey: string) => {
      defineState(target, stateKey, options);
    };
  }

  let target = arguments[0],
    stateKey = arguments[1];
  defineState(target, stateKey, { prop: "" });
}

function defineState(target: any, stateKey: string, options?: StateOption) {
  if (!has(target.constructor, DecoratorKey.STATES)) {
    const mixinStates = {}
    let parentCtor = target.constructor
    while ((parentCtor = _getSuper(parentCtor)) !== CompElem) {
      merge(mixinStates, parentCtor[DecoratorKey.STATES] ? cloneDeep(parentCtor[DecoratorKey.STATES]) : {})
    }
    Reflect.defineProperty(target.constructor, DecoratorKey.STATES, {
      configurable: false,
      enumerable: false,
      value: mixinStates
    })
  }
  target.constructor[DecoratorKey.STATES][stateKey] = options;
}

/**
 * 同@state装饰器，但可用于构造器中调用
 * @param ctor 类构造函数
 * @param stateKey state 名称
 * @param options 
 */
export function makeState(ctor: Function, stateKey: string, options?: StateOption) {
  defineState(ctor.prototype, stateKey, options || { prop: "" });
}