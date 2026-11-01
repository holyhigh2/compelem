/**
 * `@resource` —— 声明式异步资源。编译期前移，运行时装饰器为空壳。
 *
 * 与 `@prop` / `@state` / `@computed` 同属编码期标注，实际工作由
 * `@compelem/compiler` 在构建期完成：
 *
 *   1. 删除装饰器本身（产物中无 `_decorate` 残留）；
 *   2. 把选项里的 `loader` 箭头函数搬成私有方法 `__rl_<field>`；
 *   3. 把纯数据选项写进 `__ce_static__.resources`。
 *
 */
import {
  createResource,
  type Resource,
  type ResourceOptions,
  type ResourceStatus,
  type ResourceView,
} from '../resource'
import { signal, untrack } from '../signal'
import { showWarn } from '../utils'

/**
 * `@resource` 第一个参数的类型：取数函数
 */
export type ResourceLoader<T> = (self: any, signal: AbortSignal) => Promise<T>

/** `@resource` 的第二个参数（可选）：`ResourceOptions` + 显式依赖源 */
export interface ResourceDecoratorOptions extends ResourceOptions {
  /**
   * 显式依赖源（覆盖自动推导）。返回 `undefined / null / false` 时跳过本次取数，
   * 用于「参数未就绪就先别请求」的门控场景
   */
  source?: (self: any) => unknown
}

/**
 * `@resource` 注入到 `__ce_static__.resources` 的单条目形态
 */
export interface ResourceStaticDef {
  timeout?: number
  immediate?: boolean
  track?: boolean
  source?: boolean
}

/** 组件实例 → 该实例上的全部 resource。组件销毁时按此表统一回收 */
const ResourceMap = new WeakMap<object, Map<string, Resource<any>>>()

/** 组件实例 → 该实例上的全部视图对象（每次读字段都返回同一个，引用稳定） */
const ViewMap = new WeakMap<object, Map<string, ResourceView<any>>>()

/**
 * 已回收组件的集合（由 `releaseResources` 登记）
 */
const Released = new WeakSet<object>()

/** 已回收组件的占位资源（单例：它不持有任何外部对象，被长期引用也无妨） */
let DEAD: Resource<any> | null = null
function deadResource(): Resource<any> {
  if (DEAD) return DEAD
  const data = signal<any>(undefined)
  const error = signal<unknown>(undefined)
  const status = signal<ResourceStatus>('idle')
  return (DEAD = { data, error, status, load: () => Promise.resolve(), dispose: () => { } })
}

/** 静态表缺失时的兜底（组件用了 @resource 但构建链没挂编译器） */
const EMPTY_DEF: ResourceStaticDef = {}

/**
 * 声明一个异步资源。
 *
 */
export function resource<T>(loader: ResourceLoader<T>, options?: ResourceDecoratorOptions): any
export function resource(..._args: any[]): any {
  // Implemented by the compiler
  return (_target: any, _key: string) => { }
}

/**
 * 取实例上的资源，首次访问时创建
 */
export function bindResource(self: any, key: string): Resource<any> {
  if (Released.has(self)) return deadResource()
  let map = ResourceMap.get(self)
  if (!map) ResourceMap.set(self, (map = new Map()))
  let res = map.get(key)
  if (res !== undefined) return res

  const defs: Record<string, ResourceStaticDef> | undefined = self.constructor?.__ce_static__?.resources
  const def = defs?.[key] ?? EMPTY_DEF
  // 前缀是编译期契约，必须与 `@compelem/compiler` 的 `analyze/resource-extract.ts`
  // 里的 LOADER_PREFIX / SOURCE_PREFIX 逐字一致（那边负责生成方法，这边负责调用）。
  const loader = self['__rl_' + key]
  const source = def.source === true ? () => self['__rs_' + key]() : undefined

  if (process.env.DEV && typeof loader !== 'function') {
    showWarn(
      `@resource 字段 '${key}' 的 loader 缺失（找不到方法 __rl_${key}）——` +
      `请确认构建链挂了 @compelem/compiler，且它与 compelem 版本匹配`,
    )
  }

  res = untrack(() =>
    createResource(
      (sig) => (typeof loader === 'function' ? loader.call(self, sig) : Promise.resolve(undefined)),
      source,
      {
        timeout: def.timeout,
        immediate: def.immediate,
        // 未给显式 source 时，loader 同步段上的读取即为资源依赖；
        // 给了 source 则以 source 为准（见 ResourceOptions.track）。
        track: def.track ?? source === undefined,
      },
    ),
  )
  map.set(key, res)
  return res
}

/**
 * 取实例上的资源视图，首次访问时创建（连同底层资源一起）。
 *
 * 调用方是 `CompElem` 按 `__ce_static__.resources` 安装的原型访问器：
 * `get rows() { return viewResource(this, "rows") }`。
 */
export function viewResource(self: any, key: string): ResourceView<any> {
  let views = ViewMap.get(self)
  if (!views) ViewMap.set(self, (views = new Map()))
  const hit = views.get(key)
  if (hit !== undefined) return hit

  // 惰性：view 本身不建资源，第一次读某个字段才建。
  // 这样 `this.rows`（只拿对象）不会触发请求，`this.rows.busy` 才会。
  const res = () => bindResource(self, key)
  const view: ResourceView<any> = {
    get data() { return res().data.value },
    get status() { return res().status.value },
    get error() { return res().error.value },
    get busy() {
      const st = res().status.value
      return st === 'loading' || st === 'refreshing'
    },
    load() { return res().load() },
  }
  views.set(key, view)
  return view
}

/**
 * 回收组件上的全部资源（退订 source、中止在途请求）
 */
export function releaseResources(comp: object): void {
  Released.add(comp)
  ViewMap.delete(comp)
  const map = ResourceMap.get(comp)
  if (map === undefined) return
  ResourceMap.delete(comp)
  for (const res of map.values()) res.dispose()
}