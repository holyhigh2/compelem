import { StateOption } from "../types";

/**
 * 声明一个可双向变动的属性
 * @param options 可选参数（shallow / type），如果 type 未定义则根据默认值自动推断类型
 */
export function state(target: any, stateKey: any): void;
export function state(
  options: StateOption
): (target: any, stateKey: any) => void;
export function state(...args: any[]): any {
  // Implemented by the compiler
  if (args.length === 1) {
    return (_target: any, _stateKey: any) => { }
  }
  return undefined
}