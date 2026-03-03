import { debounce, get, set } from "myfx";
import { CompElem } from "../CompElem";
import { decorator } from "../decorator";
import { Decorator, DecoratorType } from "../decorator/Decorator";

/**
 * 定义防抖函数
 * 同时会创建一个以 _$__ 结尾的非防抖版本
 * @example
 *  @debounced(50, true)
 * 
 * @param wait 抖动间隔，单位ms
 * @param immediate 立即执行
 */
class DebouncedDecorator extends Decorator {
  static get priority(): number {
    return Number.MAX_VALUE
  }
  created(component: CompElem, fieldName: string, ...args: any[]) {
    let fn = get(component, fieldName)
    set(component, fieldName, debounce(fn as any, this.wait, this.immediate))
    set(component, fieldName + '_$__', fn)
  }
  beforeDestroy(component: CompElem, fieldName: string): void {
    set(component, fieldName, null)
    set(component, fieldName + '_$__', null)
  }
  get targets(): DecoratorType[] {
    return [DecoratorType.METHOD]
  }
  wait: number
  immediate: boolean
  constructor(wait: number, immediate: boolean = false) {
    super();
    this.wait = wait
    this.immediate = immediate
  }
}

export const debounced = decorator<ConstructorParameters<typeof DebouncedDecorator>>(DebouncedDecorator)