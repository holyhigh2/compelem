/**
 * 异步资源
 *
 * 把「一次可能失败、可能被取消、可能重来」的异步读取接进响应式图。
 * 它补的是 `signal / computed / effect` 缺失的那一维：**时间**。三者只有同步语义，
 * 模型里没有「还没有返回」这个状态；一旦接入网络，「请求在飞、值不确定」就必须可被观测、
 * 可被渲染（骨架屏、刷新指示、失败重试）。
 *
 * 负责：
 * - 状态流转（idle / loading / refreshing / ok / error）
 * - source 驱动重取：依赖一变自动重来，不必在调用点手动 `load()`
 * - 生命周期：owner 销毁即 abort，不必手写退订
 * - 竞态：换参时主动 abort 旧请求，只有最新一次的响应能落地
 * - 刷新期保留旧值（refreshing），避免重取时闪回骨架屏
 *
 */
import {
  batch,
  effect,
  onCleanup,
  signal,
  untrack,
  type EffectNode,
  type SignalNode,
} from './signal'

/**
 * 资源状态。
 *
 * `loading` 与 `refreshing` 必须分开：前者表示「还没有值」，后者表示「有旧值、正在更新」。
 * 合成一个布尔 `loading` 会在重取时让界面闪回骨架屏。
 */
export type ResourceStatus = 'idle' | 'loading' | 'refreshing' | 'ok' | 'error'

/**
 * 超时标记：`error` 为它时表示「这次失败是等超时了」，而不是请求本身出错。
 *
 */
export const RESOURCE_TIMEOUT: unique symbol = Symbol('compelem.resource.timeout')

/** [`RESOURCE_TIMEOUT`] 的类型别名，供业务侧标注 */
export type ResourceTimeout = typeof RESOURCE_TIMEOUT

export interface Resource<T> {
  /**
   * 最近一次成功的数据。
   *
   * `refreshing` 期间仍返回旧值（不闪回空），但那个值对应的是**上一次成功的参数**，
   * 不一定是当前 source 对应的。要判断是否过期，把参数一起放进返回值
   * （如 `{ q, items }`）再和当前参数比。
   */
  readonly data: Readonly<SignalNode<T | undefined>>
  /**
   * 最近一次失败的原因；成功后被清空。
   *
   * 超时是 [`RESOURCE_TIMEOUT`]（框架不写文案，由调用点决定怎么展示）；
   * 其余是 loader 抛出的原值（通常是 `Error`）。
   */
  readonly error: Readonly<SignalNode<unknown>>
  readonly status: Readonly<SignalNode<ResourceStatus>>
  /**
   * 手动触发一次取数。**首次拉取与刷新是同一个入口** ——
   * `immediate: false` 时创建后停在 `idle`，第一次调用它就是首拉。
   *
   * 返回本次取数的结算 promise（成功或失败都已处理，不会 reject）；
   * 结果读 `data`、失败读 `error`，它本身不携带返回值。
   * 若 source 当前未就绪（返回 undefined/null/false），不会发请求。
   */
  load(): Promise<void>
  /** 销毁：退订 source、中止在途请求。之后 load 为 no-op */
  dispose(): void
}

/**
 * 资源的**解包视图**：`@resource` 注入的成员就是它。
 *
 * ```ts
 * this.rows.data      // Row[] | undefined —— 直接是值
 * this.rows.busy      // boolean
 * this.rows.load()    // 触发一次取数（首拉与刷新同一个入口）
 * ```
 */
export interface ResourceView<T> {
  /**
   * 最近一次成功的数据。`refreshing` 期间仍返回旧值，不会闪回空。
   *
   * 但旧值属于**上一次成功的参数**：搜索框已改成 `abb`、列表可能还是 `a` 的结果。
   * 判断过期要把参数一起塞进 `T`（如 `{ q, items }`）再比，别假定它和当前参数一致。
   */
  readonly data: T | undefined
  readonly status: ResourceStatus
  /** 最近一次失败的原因；超时是 [`RESOURCE_TIMEOUT`]，其余是 loader 抛出的原值 */
  readonly error: unknown
  /**
   * 是否有请求在飞：`loading || refreshing`。
   *
   * **不是** `status === 'loading'`——只判 loading 会让「有旧值的刷新」期间按钮失效。
   */
  readonly busy: boolean
  /** 手动触发一次取数；返回本次结算 promise，不会 reject。结果读 `data` */
  load(): Promise<void>
}

export interface ResourceOptions {
  /**
   * 超时毫秒数。不设（或 `<= 0`）表示不限时，一直等到 loader 自己结算。
   *
   * 到时后状态转 `error`、`error` 的值为 [`RESOURCE_TIMEOUT`]（不是 `Error`，
   * 文案由调用点决定怎么展示），同时 abort 在途请求
   */
  timeout?: number
  /**
   * loader 的**同步执行段**是否参与依赖收集（默认 `false`）
   *
   * 只收同步段：`currentEffect` 是同步上下文，`await` 之后的读取不登记依赖
   * ——不报错也不告警，只是改了那个信号不会重取。async loader 请把读取全部
   * 提到第一个 `await` 之前，或改用 `source` 显式声明依赖。
   * 详见 `@resource` 的 `ResourceLoader` 类型注释。
   */
  track?: boolean
  /**
   * 是否在创建后立即取一次（默认 `true`）。
   *
   * `false` 时停在 `idle`、一个请求都不发，直到第一次 `load()`——
   * 用于「用户点了才开始拉」的场景。`load()` 会把资源转为已武装状态，
   * 之后 source/依赖的变化照常触发重取。
   */
  immediate?: boolean
}

/**
 * 创建一个异步资源。
 *
 * @param loader 取数函数。接收 `AbortSignal`，必须把它传给底层请求（fetch 的 signal 选项），
 *   否则取消只能丢弃结果、不能真正中止请求。
 * @param source 依赖源。返回 `undefined / null / false` 时跳过本次取数（参数未就绪的常见场景）；
 *   不传则创建后立即取一次，之后只能靠 `load()`。
 * @param opts 选项
 *
 * @example
 * const res = createResource(
 *   (signal) => fetch(url, { signal }).then(r => r.json()),
 *   () => params.id || undefined,
 * )
 * // res.status.value === 'loading' | 'refreshing' | 'ok' | 'error' | 'idle'
 */
export function createResource<T>(
  loader: (signal: AbortSignal) => Promise<T>,
  source?: () => unknown,
  opts: ResourceOptions = {},
): Resource<T> {
  const data = signal<T | undefined>(undefined)
  const error = signal<unknown>(undefined)
  const status = signal<ResourceStatus>('idle')
  /** 手动 load 的触发器：effect 读它，自增即触发重跑 */
  const nonce = signal(0)

  /** 当前在途请求，仅用于 dispose 兜底（正常路径由 cleanup 中止） */
  let inflight: AbortController | null = null
  /** 每次发起取数自增；只有最新一次的响应能落地 */
  let seq = 0
  /** 是否拿到过值——决定下一次是 loading 还是 refreshing */
  let hasValue = false
  /** 是否已武装：`immediate: false` 时为 false，首次 load 才置 true */
  let armed = opts.immediate !== false
  /** 最新一次取数的结算 promise，供 load 返回 */
  let current: Promise<void> | null = null

  function start(): Promise<void> {
    const my = ++seq
    const ctrl = new AbortController()
    inflight = ctrl

    status.value = hasValue ? 'refreshing' : 'loading'

    let timedOut = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const timeout = opts.timeout

    const settle = () => {
      if (timer !== undefined) clearTimeout(timer)
      if (inflight === ctrl) inflight = null
    }

    // 超时必须由这里自己结算：loader 若没把 signal 传给底层请求，abort() 不会让它 reject，
    // 只靠 abort 的超时会永远停在 loading
    const gate = new Promise<never>((_, reject) => {
      if (timeout === undefined || timeout <= 0) return
      timer = setTimeout(() => {
        timedOut = true
        // 先 abort：让底层请求尽快释放连接。代价是 loader 的 AbortError 会在
        // 微任务队列里抢在本次 reject 之前赢得 race —— 所以下面 timedOut 分支
        // 不采用 race 给出的那个错误（它说的是「取消」，不是「超时」）。
        ctrl.abort()
        reject(RESOURCE_TIMEOUT)
      }, timeout)
    })

    // 换参或 owner 销毁时中止在途请求；迟到的响应由 seq 判定丢弃。
    onCleanup(() => {
      settle()
      ctrl.abort()
    })

    let p: Promise<T>
    try {
      // 依赖收集有两种口径：
      // - opts.track（装饰器模式）：loader 即 source，同步段里读到的信号成为依赖，
      //   参数变化自动重取。source 同时给出时以 source 为准（显式胜过隐式）。
      // - 默认：untrack 掉 loader 内的读取，依赖只由 source 决定。
      p = opts.track && source === undefined ? loader(ctrl.signal) : untrack(() => loader(ctrl.signal))
    } catch (e) {
      // 同步抛出也要按失败处理，不能让它穿透 effect
      p = Promise.reject(e)
    }

    return Promise.race([p, gate]).then(
      (v) => {
        settle()
        // 已被新一次取数取代，静默丢弃
        if (my !== seq || ctrl.signal.aborted) return
        batch(() => {
          hasValue = true
          data.value = v
          error.value = undefined
          status.value = 'ok'
        })
      },
      (e) => {
        settle()
        if (my !== seq) return
        // 超时是我们自己触发的，此时 ctrl 已被 abort，必须先于下面的取消分支判断
        if (timedOut) {
          batch(() => {
            error.value = RESOURCE_TIMEOUT
            status.value = 'error'
          })
          return
        }
        // 主动取消（换参 / dispose）不是失败：状态由接替它的那次取数决定
        if (ctrl.signal.aborted) return
        batch(() => {
          error.value = e
          status.value = 'error'
        })
      },
    )
  }

  const node: EffectNode = effect(() => {
    // 裸读 nonce 登记依赖，使 load() 的自增能触发重跑
    // eslint-disable-next-line no-unused-expressions
    nonce.value

    // 未武装（immediate: false）时一个请求都不发：load() 会置 armed 再自增 nonce
    if (!armed) {
      status.value = 'idle'
      // 没有在飞的请求，就别让 load() 返回上一次那个已结算的 promise
      current = null
      return
    }

    if (source !== undefined) {
      const key = source()
      // 参数未就绪就不发请求：调用点不必在外面包 if
      if (key === undefined || key === null || key === false) {
        status.value = 'idle'
        current = null
        return
      }
    }

    current = start()
  })

  return {
    data,
    error,
    status,
    load() {
      // 未武装的资源由 load 转正：先置 armed 再自增，effect 会带着新状态重跑
      armed = true
      // 写入即同步重跑 effect（signal 的 setter 会 flush），随后 current 已指向新一次取数
      nonce.value++
      return current ?? Promise.resolve()
    },
    dispose() {
      // 退订 + 触发 cleanup（内含 abort）
      node.dispose()
      inflight?.abort()
      inflight = null
    },
  }
}
