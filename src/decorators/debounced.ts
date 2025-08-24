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
 */
class DebouncedDecorator extends Decorator {
  static get priority(): number {
    return Number.MAX_VALUE
  }
  created(component: CompElem, classProto: CompElem, fieldName: string, ...args: any[]) {
    let fn = get(component, fieldName)
    set(component, fieldName, debounce(fn as any, this.wait, this.immediate))

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
  immediate: boolean
  result: any;
  constructor(wait: number, immediate: boolean = false) {
    super();
    this.wait = wait
    this.immediate = immediate
  }
}

export const debounced = decorator<ConstructorParameters<typeof DebouncedDecorator>>(DebouncedDecorator)