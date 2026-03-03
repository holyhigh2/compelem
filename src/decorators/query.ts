import { CompElem } from "../CompElem"
import { decorator } from "../decorator"
import { Decorator, DecoratorType } from "../decorator/Decorator"

/**
 * 缓存策略
 */
export enum QueryCache {
  ONCE = 'once',//仅缓存一次（首次查询到结果时）
}

const CacheMap = new WeakMap<CompElem<any>, Map<string, any>>()
/**
 * css查询装饰器
 * @example
 *  @query('l-popup', QueryCache.ONCE)
 */
class QueryDecorator extends Decorator {
  static get priority(): number {
    return Number.MAX_VALUE
  }

  get targets(): DecoratorType[] {
    return [DecoratorType.FIELD]
  }
  selector: string
  cache: QueryCache | undefined
  constructor(selector: string, cache?: QueryCache) {
    super();
    this.selector = selector
    this.cache = cache
  }
  static getKey(selector: string): string {
    return selector
  }

  getter(component: CompElem) {
    let el = component?.shadowRoot?.querySelector(this.selector)
    let cMap = CacheMap.get(component)
    if (!cMap) {
      cMap = new Map()
      CacheMap.set(component, cMap)
    }
    cMap.set(this.selector, el)
  }
  mounted(component: CompElem, setReactive: (key: string, value: any) => any, fieldName: string, ...args: any[]) {
    const that = this
    let wk = new WeakRef(component)
    Reflect.defineProperty(component, fieldName, {
      configurable: true,
      get() {
        let ctx = wk.deref()!
        if (CacheMap.has(ctx) && CacheMap.get(ctx)?.has(that.selector) && that.cache === QueryCache.ONCE) {
          return CacheMap.get(ctx)?.get(that.selector)
        }
        that.getter(ctx)
        return CacheMap.get(ctx)?.get(that.selector)
      }
    })
  }
  beforeDestroy(component: CompElem, fieldName: string): void {
    CacheMap.get(component)?.clear()
    CacheMap.delete(component)
  }

  updated(component: CompElem, changed: Record<string, any>): void {
    if (this.cache === QueryCache.ONCE) return;
    this.getter(component)
  }
}
class QueryAllDecorator extends QueryDecorator {
  getter(component: CompElem) {
    let el = component.shadowRoot?.querySelectorAll(this.selector)
    let cMap = CacheMap.get(component)
    if (!cMap) {
      cMap = new Map()
      CacheMap.set(component, cMap)
    }
    cMap.set(this.selector, el)
  }
}

export const query = decorator<ConstructorParameters<typeof QueryDecorator>>(QueryDecorator)
export const queryAll = decorator<ConstructorParameters<typeof QueryAllDecorator>>(QueryAllDecorator)