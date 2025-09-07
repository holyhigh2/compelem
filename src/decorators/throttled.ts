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
  created(component: CompElem, classProto: CompElem, fieldName: string, ...args: any[]) {
    let fn = get(component, fieldName)
    set(component, fieldName, throttle(fn as any, this.wait))

    let proto = Reflect.getPrototypeOf(component)
    if (proto && !get(proto, fieldName + '_$__')) {
      set(proto, fieldName + '_$__', fn)
    }
  }
  beforeMount(component: CompElem, setReactive: (key: string, value: any) => any, ...args: any[]) {
  }
  mounted(component: CompElem, setReactive: (key: string, value: any) => any, ...args: any[]) {
  }
  updated(component: CompElem, changed: Record<string, any>) {
  }
  get targets(): DecoratorType[] {
    return [DecoratorType.METHOD]
  }
  wait: number
  result: any;
  constructor(wait: number) {
    super();
    this.wait = wait
  }
}

export const throttled = decorator<ConstructorParameters<typeof ThrottledDecorator>>(ThrottledDecorator)