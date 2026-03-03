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
 */
class OncedDecorator extends Decorator {
  static get priority(): number {
    return Number.MAX_VALUE
  }
  created(component: CompElem, classProto: CompElem, fieldName: string, ...args: any[]) {
    let fn = bind(get(component, fieldName), component)
    set(component, fieldName, once(fn as any))
    set(component, fieldName + '_$__', fn)

  }
  beforeDestroy(component: CompElem, fieldName: string): void {
    set(component, fieldName, null)
    set(component, fieldName + '_$__', null)
  }
  get targets(): DecoratorType[] {
    return [DecoratorType.METHOD]
  }
}

export const onced = decorator<ConstructorParameters<typeof OncedDecorator>>(OncedDecorator)