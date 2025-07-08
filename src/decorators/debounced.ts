import { debounce } from "myfx";
import { CompElem } from "../CompElem";
import { decorator } from "../decorator";
import { Decorator, DecoratorType } from "../decorator/Decorator";

/**
 * 定义防抖函数
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
    component[fieldName] = debounce(component[fieldName], this.wait, this.immediate);
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