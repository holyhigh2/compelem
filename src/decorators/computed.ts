import { DATA_KEY, DefinitionComputedMap } from "../constants";
import { Collector } from "../reactive";
import { showError } from "../utils";

/**
 * 定义计算属性
 * 计算属性会自动跟踪get函数内的state/prop，并在变动时自动变更
 * 只能应用在一个非静态get属性上
 * @param source 变量名(数组)，支持访问链
 * @param immediate 立即执行
 * @param deep 深度监控
 */
export function computed(...args: any[]): void
export function computed(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  if (!descriptor.get) {
    showError(`Computed '${propertyKey}' must be a getter`)
  }
  if (!DefinitionComputedMap.has(target.constructor)) {
    DefinitionComputedMap.set(target.constructor, {})
  }
  DefinitionComputedMap.get(target.constructor)![propertyKey] = descriptor.get!

  //getter
  delete target[propertyKey]
  Reflect.defineProperty(target, propertyKey, {
    get() {
      if (Collector.__collecting) {
        Collector.__varPathList.push(propertyKey)
      }
      let v = Reflect.get(this[DATA_KEY], propertyKey)
      return v
    }
  });
  return Reflect.getOwnPropertyDescriptor(target, propertyKey)
}