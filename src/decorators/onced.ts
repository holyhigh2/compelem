import { bind, get, once, set } from "myfx";
import { CompElem } from "../CompElem";
import { decorator } from "../decorator";
import { Decorator, DecoratorType } from "../decorator/Decorator";

/**
 * 定义一次性函数
 * 同时会创建一个以 _$__ 结尾的非一次性版本
 * @example
 *  @onced
 *
 * @param wait 抖动间隔，单位ms
 */
class OncedDecorator extends Decorator {
  static get priority(): number {
    return Number.MAX_VALUE
  }
  created(component: CompElem, classProto: CompElem, fieldName: string, ...args: any[]) {
    let fn = bind(get(component, fieldName), component)
    set(component, fieldName, once(fn as any))

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
  constructor() {
    super();
  }
}

export const onced = decorator<ConstructorParameters<typeof OncedDecorator>>(OncedDecorator)