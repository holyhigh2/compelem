import { merge, set } from "myfx";
import { CompElem } from "../CompElem";
import { DefinitionStateMap } from "../constants";
import { StateOption } from "../types";
import { _getSuper } from "../utils";

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

function defineState(target: any, stateKey: string, options: StateOption) {
  if (!DefinitionStateMap.has(target.constructor.name)) {
    const mixinStates = {}
    let parentCtor = target.constructor
    while ((parentCtor = _getSuper(parentCtor)) !== CompElem) {
      merge(mixinStates, DefinitionStateMap.get(parentCtor.name) ?? {})
    }
    DefinitionStateMap.set(target.constructor.name, mixinStates)
  }
  options.shallow = options.shallow || false;
  set(DefinitionStateMap.get(target.constructor.name)!, stateKey, options)
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