import { get, set, throttle } from "myfx";
import { CompElem } from "../CompElem";
import { decorator } from "../decorator";
import { Decorator, DecoratorType } from "../decorator/Decorator";

/**
 * 定义节流函数
 * 同时会创建一个以 _$__ 结尾的非节流版本
 * @example
 *  @throttled(50, true)
 * 
 * @param wait 抖动间隔，单位ms
 */
class ThrottledDecorator extends Decorator {
  static get priority(): number {
    return Number.MAX_VALUE
  }
  created(component: CompElem, fieldName: string, ...args: any[]) {
    let fn = get(component, fieldName)
    set(component, fieldName, throttle(fn as any, this.wait))
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
  constructor(wait: number) {
    super();
    this.wait = wait
  }
}

export const throttled = decorator<ConstructorParameters<typeof ThrottledDecorator>>(ThrottledDecorator)