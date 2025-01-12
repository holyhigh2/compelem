import { CompElem } from "../CompElem"
import { decorator } from "../decorator"
import { Decorator, DecoratorType } from "../decorator/Decorator"

/**
 * 缓存策略
 */
export enum QueryCache {
  ONCE = 'once',//仅缓存一次（首次查询到结果时）
  UPDATABLE = 'updatable'//每次update结束都会更新缓存
}

/**
 * 事件选项
 */
export type QueryOption = {
  /**
   * 指示是否返回任何可用子<slot>元素的指定节点（true）或不返回（false）
   */
  flatten?: boolean,
  /**
   * 对节点列表进行过滤
   */
  selector?: string,
  /**
   * 缓存标识
   */
  cache?: string
}

/**
 * css查询装饰器
 * @example
 *  @query('l-popup', QueryCache.ONCE)
 */
class QueryDecorator extends Decorator {
  static get priority(): number {
    return Number.MAX_VALUE
  }
  created(component: CompElem, classProto: CompElem, fieldName: string, ...args: any[]) {
  }
  mounted(component: CompElem, setReactive: (key: string, value: any) => any, ...args: any[]) {
  }
  get targets(): DecoratorType[] {
    return [DecoratorType.FIELD]
  }
  selector: string
  cache: QueryCache | undefined
  result: any;
  constructor(selector: string, cache?: QueryCache) {
    super();
    this.selector = selector
    this.cache = cache
  }
  static getKey(selector: string): string {
    return selector
  }

  getter(component: CompElem) {
    this.result = component.shadowRoot?.querySelector(this.selector)
  }
  beforeMount(component: CompElem, setReactive: (key: string, value: any) => any, classProto: CompElem, fieldName: string, ...args: any[]) {
    const that = this
    Reflect.defineProperty(component, fieldName, {
      get() {
        if (that.result && that.cache) {
          return that.result
        }
        that.getter(component)
        return that.result
      }
    })
  }

  updated(component: CompElem, changed: Record<string, any>): void {
    if (this.cache !== QueryCache.UPDATABLE) return;
    this.getter(component)
  }
}
class QueryAllDecorator extends QueryDecorator {
  getter(component: CompElem) {
    this.result = component.shadowRoot?.querySelectorAll(this.selector)
  }
}

export const query = decorator<ConstructorParameters<typeof QueryDecorator>>(QueryDecorator)
export const queryAll = decorator<ConstructorParameters<typeof QueryAllDecorator>>(QueryAllDecorator)

