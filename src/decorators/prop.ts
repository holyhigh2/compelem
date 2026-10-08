import { PropOption } from "../types";

/**
 * 声明一个由外部传入的单向更新属性
 * @param options 可选参数 PropOption，如果 type 未定义则根据字段初始化器自动推断类型型
 */
export function prop(options: PropOption): (target: any, propertyKey: any) => void;
export function prop(target: any, propertyKey: any, options?: PropOption): void;
export function prop(...args: any[]): any {
  // Implemented by the compiler
  if (args.length === 1) {
    return (_target: any, _propertyKey: any) => { }
  }
  return undefined
}

