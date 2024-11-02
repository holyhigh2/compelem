import { each, get, isArray, once, startsWith } from "myfx";
import { decorator } from "../decorator";
import { DecoratorType, Decorator } from "../decorator/Decorator";
import { CompElem } from "../CompElem";

/**
 * 监控定义
 */
export type WatchOptions = {
  /**
   * 是否立即执行
   */
  immediate?: boolean,
  /**
   * 是否深度监控
   */
  deep?: boolean,
  /**
   * 是否仅执行一次
   */
  once?: boolean
}
export type WatchHandler = (newValue: any, oldValue: any, source: string) => any;
/**
 * 装饰器
 */
export type DecoratorWatch = {
  handler: WatchHandler,
  options: WatchOptions
}

/**
 * prop/state监视
 * @example
 *  @watch('a.b.c')
 */
class WatchDecorator extends Decorator {
  created(component: CompElem, ...args: any[]) {
  }
  propsReady(component: CompElem, setReactive: (key: string, value: any) => any, ...args: any[]) {
  }
  get targets(): DecoratorType[] {
    return [DecoratorType.METHOD]
  }
  sources: string[]
  options?: WatchOptions
  handler: WatchHandler
  constructor(source: string | string[], options?: WatchOptions) {
    super();
    this.sources = isArray(source) ? source : [source]
    this.options = options
  }

  static getKey(source: string | string[]): string {
    return isArray(source) ? source.sort().join('') : source
  }

  mounted(component: CompElem, setReactive: (key: string, value: any) => any, classProto: CompElem, fnName: string, ...args: any[]) {
    let handler = this.handler = component[fnName]

    let immediate = get<WatchOptions>(this.options, "immediate", false);
    let onceWatch = get<WatchOptions>(this.options, "once", false);
    if (onceWatch) {
      handler = once(handler.bind(component))
    }
    let invocations: { handler: Function, value: any, varPath: string }[] = []
    this.sources.forEach(src => {
      let nv = get(component, src.replaceAll('-', '.'));
      if (immediate) {
        invocations.push({
          handler, value: nv, varPath: src
        })
      }
    })
    invocations.forEach(({ handler, value, varPath }) => {
      handler.call(component, get(component, varPath), value, varPath);
    })

  }

  updated(component: CompElem, changed: Record<string, any>): void {
    this.sources.forEach(src => {
      each(changed, ({ value, chain, oldValue, end }, k) => {
        let srcPath = src.replaceAll('.', '-')
        //监视路径不长于变量路径
        if (!startsWith(k, srcPath)) return

        if (k === srcPath && end) {
          this.handler && this.handler.call(component, value, oldValue, k)
        }
        //watches deep
        let i = chain.length - 1
        while (i) {
          let varPath = chain.slice(0, i)
          if (end && varPath.join('-') === srcPath && get(this.options, 'deep')) {
            let v = get(component, varPath)
            this.handler.call(component, v, v, varPath.join('-'));
          }

          i--;
        }
      })
    })

  }
}
export const watch = decorator<ConstructorParameters<typeof WatchDecorator>>(WatchDecorator)