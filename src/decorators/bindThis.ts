import { bind, get, set } from "myfx";
import { CompElem } from "../CompElem";
import { decoratorWithNoArgs } from "../decorator";
import { Decorator, DecoratorType } from "../decorator/Decorator";

/**
 * 为组件函数绑定this
 * @example
 *  @bindThis
 */
class BindThisDecorator extends Decorator {
  static get priority(): number {
    return Number.MAX_VALUE
  }
  created(component: CompElem, classProto: CompElem, fieldName: string, ...args: any[]) {
    let fn = get(component, fieldName)
    set(component, fieldName, bind(fn, component))
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
  constructor() {
    super();
  }
}

export const bindThis = decoratorWithNoArgs(BindThisDecorator)