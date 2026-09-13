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
    /**
     * 销毁守卫（次要防线）。
     *
     * 主修复在 beforeDestroy：调用 myfx `debounce` 暴露的 `cancel()` 清除已排队的调用。
     * 这里再包一层守卫，用于覆盖定时器已出队、cancel 已无法拦下的边界
     *
     * 若缺少这一层，迟到 50~100ms 的回调会在 destroy() 把 this.__data_ 置为 null 之后
     * 读到 __data_，抛 "Reflect.get called on non-object"（未捕获异常）。
     * 同时 _$__ 非防抖版本也走守卫，对已销毁组件变为安全空操作。
     */
    let guard = function (this: any, ...a: any[]) {
      if (this?.isDestroyed) return
      return (fn as any).apply(this, a)
    }
    set(component, fieldName, debounce(guard as any, this.wait, this.immediate))
    set(component, fieldName + '_$__', guard)
  }
  beforeDestroy(component: CompElem, fieldName: string): void {
    //先在置 null 之前取到防抖函数并取消其排队调用
    const debouncedFn = get(component, fieldName) as any
    debouncedFn?.cancel?.()
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