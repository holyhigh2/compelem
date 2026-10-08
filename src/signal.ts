/**
 * 信号模型
 */
export type CleanupFn = () => void
export type EffectFn = () => void
export type ComputedFn<T> = () => T

export interface SignalNode<T> {
  get value(): T
  set value(v: T)
  // 非跟踪读：求值语义与 `get value()` 相同（computed 脏则求值），但**不建依赖**
  peek(): T
  readonly?: boolean
}

// 订阅关系的持有者
interface LinkOwner {
  links: Link[]
  cursor: number
  disposed: boolean
  /** true=computed（脏标记语义），false=effect（入队调度语义） */
  computed: boolean
}

//订阅接口
interface Sub extends LinkOwner {
  head: Link | null
  // 本次 run 的 runId 快照，与 lastOwner 共同构成同轮去重键
  runId: number
  // 上一次把本信号记为已读的那个 owner
  lastOwner: LinkOwner | null
  dirty: boolean
  cached: any
  fn: ComputedFn<any> | null
  // computed 是否正在求值（环检测：求值中被再次读取即为环）
  evaluating: boolean
  // 值版本号，每变更一次自增（供外部判定是否真变过）
  version: number
  // 诊断标签：环依赖报错时用于显示（computed 取 fn 名，普通信号为空）
  label: string
  // 当前 drain 代号：同一代内只入队一次，兼作环检测的代际标记
  gen: number
  // 非跟踪读：语义同 `get value()`，但不建依赖
  peek(): any
}

interface Link {
  owner: LinkOwner
  sub: Sub
  prev: Link | null
  next: Link | null
}

export interface EffectNode extends LinkOwner {
  fn: EffectFn
  /** 惰性：未注册过 cleanup 时为 null（避免每个 effect 无条件分配空数组） */
  cleanups: CleanupFn[] | null
  children: Set<EffectNode> | null
  running: boolean
  queued: boolean
  run(): void
  dispose(): void
}

let currentEffect: EffectNode | null = null
// 当前正在收集依赖的 computed
let computedStack: Sub | null = null
// 求值中的 computed 栈（LIFO）
const evalStack: Sub[] = []
let batchDepth = 0
let runId = 0
let flushing = false
/**
 * 当前依赖收集 run 的序号（每次 effect run / computed 求值自增）。
 */
export function currentRunId(): number {
  return runId
}

// 待运行队列：数组 + 每 effect 排队标记
const queue: EffectNode[] = []
let qHead = 0

// 待重算 computed 队列 + 代际标记
const computedQueue: Sub[] = []

let drainGen = 1
let draining = false
/** 进程内 computed 总数，仅用于给环检测预算定标 */
let computedCount = 0

////////////////////////////////////////// 依赖环检测

/**
 * 环检测上限。正常依赖图深度远小于此（UI 里最深也就十几层）。
 */
const RECURSION_LIMIT = 100

/**
 * 依赖环错误。
 *
 * `labels` 传入参与环的节点标签链（可为空）便于定位。
 */
function cyclicError(kind: string, labels: string[], tail = ''): Error {
  let where = ''
  if (labels.length) {
    const uniq: string[] = []
    const seen = new Set<string>()
    for (const c of labels) {
      if (!seen.has(c)) {
        seen.add(c)
        uniq.push(c)
      }
    }
    where = ` Nodes on the recursion path: ${uniq.slice(0, 8).join(' -> ')}.`
  }
  return new Error(
    `signal cyclic dependency: ${kind} ${tail || `recursion exceeded ${RECURSION_LIMIT} levels.`}${where} ` +
    `A computed whose body reads a downstream computed forms a cycle.`,
  )
}

////////////////////////////////////////// 链操作

function unlink(l: Link) {
  const { prev, next } = l
  if (prev !== null) prev.next = next
  else if (l.sub.head === l) l.sub.head = next
  if (next !== null) next.prev = prev
  l.prev = l.next = null
}

function linkInto(o: LinkOwner, sub: Sub): boolean {
  if (sub.runId === runId && sub.lastOwner === o) return false
  sub.runId = runId
  sub.lastOwner = o
  const links = o.links
  const i = o.cursor
  let link: Link
  if (i < links.length) {
    link = links[i]
    unlink(link)
    link.sub = sub
  } else {
    link = { owner: o, sub, prev: null, next: null }
    links.push(link)
  }
  link.next = sub.head
  if (sub.head !== null) sub.head.prev = link
  sub.head = link
  o.cursor++
  return true
}

function unlinkRemainder(o: LinkOwner) {
  const links = o.links
  while (o.cursor < links.length) {
    unlink(links.pop()!)
  }
  o.cursor = 0
}

// owner 整体退订（dispose）：链上全部摘掉，links 清空 ⇒ Link 对象一并废弃
function unlinkAll(o: LinkOwner) {
  const links = o.links
  for (let i = 0; i < links.length; i++) unlink(links[i])
  links.length = 0
  o.cursor = 0
}

////////////////////////////////////////// 调度

function enqueue(e: EffectNode) {
  if (e.queued || e.disposed || e.running) return
  e.queued = true
  queue.push(e)
}

/**
 * 通知订阅者，零分配地走链
 */
function notify(sub: Sub): void {
  for (let l = sub.head; l !== null; l = l.next) {
    const o = l.owner
    if (o.computed) {
      const c = o as Sub
      c.dirty = true
      // 无下游订阅者的 computed 只标脏不排队：subscriber 已全部 dispose 后，
      // 上游变化不再驱动其重算（读到时才由 getter 补算），省掉无人消费的求值。
      if (c.head !== null && c.gen !== drainGen) {
        c.gen = drainGen
        computedQueue.push(c)
      }
    } else {
      enqueue(o as EffectNode)
    }
  }
}



/**
 * 排空 computed 队列
 */
function drainComputed(): void {
  if (draining || computedQueue.length === 0) return
  draining = true
  drainGen++
  const budget = 64 + computedCount * 8
  let steps = 0
  try {
    while (computedQueue.length) {
      if (++steps > budget) {
        const tally = new Map<string, number>()
        for (const c of computedQueue) {
          const k = c.label || '<anonymous computed>'
          tally.set(k, (tally.get(k) ?? 0) + 1)
        }
        throw cyclicError('drain', [...tally.keys()], `单轮重算超过 ${budget} 次仍未收敛。`)
      }
      const c = computedQueue.pop()!
      // 允许本轮后续被重新标脏入队（值真变时 notify 会再排它，那是有意义的一轮传播）
      c.gen = 0
      updateComputed(c)
    }
  } finally {
    draining = false
    if (computedQueue.length) computedQueue.length = 0
  }
}

function flush() {
  if (flushing || batchDepth > 0) return
  flushing = true
  try {
    // 每轮固定边界：本轮新入队的留到下一轮（glitch-free 单遍，且避免同轮反复重跑）
    let rounds = 0
    while (qHead < queue.length) {
      if (++rounds > 2000) {
        const tally = new Map<string, number>()
        for (let i = 0; i < queue.length; i++) {
          const k = String(queue[i].fn).slice(0, 90)
          tally.set(k, (tally.get(k) ?? 0) + 1)
        }
        throw new Error('signal flush runaway: ' + JSON.stringify([...tally]))
      }
      const end = queue.length
      while (qHead < end) {
        const e = queue[qHead++]
        e.queued = false
        e.run()
      }
    }
  } finally {
    flushing = false
    if (qHead > 0) {
      queue.length = 0
      qHead = 0
    }
  }
}

////////////////////////////////////////// 依赖收集

function track(sub: Sub) {
  const e = currentEffect
  if (e !== null) {
    if (!e.disposed) linkInto(e, sub)
    return
  }
  const s = computedStack
  if (s !== null) linkInto(s, sub)
}

////////////////////////////////////////// computed

function updateComputed(s: Sub) {
  if (!s.dirty) return
  s.dirty = false
  const prevEffect = currentEffect
  const prevStack = computedStack
  // 求值体读的信号归本 computed 所有：屏蔽外层 effect / 上层 computed
  currentEffect = null
  computedStack = s
  s.cursor = 0
  runId++
  let next: any
  s.evaluating = true
  evalStack.push(s)
  try {
    next = s.fn!()
  } finally {
    currentEffect = prevEffect
    computedStack = prevStack
    s.evaluating = false
    evalStack.pop()
    unlinkRemainder(s)
  }
  if (!Object.is(s.cached, next)) {
    s.cached = next
    s.version++
    notify(s)
    // 值真变 → 继续把传播推进到本 computed 的下游 computed
    drainComputed()
  }
}

////////////////////////////////////////// 对外 API

/**
 * 信号主体：普通 signal 与 computed **共用一个类**
 */
class SubCell implements Sub {
  declare head: Link | null
  declare links: Link[]
  declare cursor: number
  declare runId: number
  declare lastOwner: LinkOwner | null
  declare disposed: boolean
  declare computed: boolean
  declare dirty: boolean
  declare cached: any
  declare fn: ComputedFn<any> | null
  declare evaluating: boolean
  declare version: number
  declare label: string
  declare gen: number
  /** computed 为 true：派生值只读（setter 抛错）。forceUpdate 等批量写入口据此跳过。 */
  declare readonly: boolean

  constructor(cached: any, fn: ComputedFn<any> | null, computed: boolean, label: string) {
    this.head = null
    this.links = []
    this.cursor = 0
    this.runId = 0
    this.lastOwner = null
    this.disposed = false
    this.computed = computed
    // computed 首读即求值；普通 signal 无脏概念
    this.dirty = computed
    this.cached = cached
    this.fn = fn
    this.evaluating = false
    this.version = 0
    this.label = label
    this.gen = 0
    this.readonly = computed
  }

  get value(): any {
    if (this.computed) {
      // 环检测：本 computed 仍在自己的求值栈上却被再次读到 = 依赖环。
      // 预算式护栏对「值相等即收敛」的环（如 NaN 不动点）检测不到，
      // 故用求值栈直接判定，报错并附带环上节点标签链。
      if (this.evaluating) {
        throw cyclicError(
          'computed evaluation re-entered',
          evalStack.map((c) => c.label).concat(this.label),
        )
      }
      if (this.dirty) updateComputed(this)
      track(this)
      return this.cached
    }
    track(this)
    return this.cached
  }

  /**
   * 非跟踪读：求值语义与 `get value()` 完全一致（computed 脏则求值、环检测照做），
   * **唯一差别是不调 `track(this)`**。
   *
   * 用在「写路径上要读当前值做去重」的场景 —— 典型是 `CompElemHelper.updatePropOne`
   * 在父级 point effect 体内读子组件 prop 的旧值：`get value()` 会把**子**的信号
   * 订阅进**父**的 effect，而父本来就是唯一写者，那条依赖纯属意外（子内部自己回写
   * 该 prop 时会让父无谓重跑）。`untrack` 也能屏蔽，但它是整段函数的开关（要闭包 +
   * try/finally），而这里只需要这一次读 —— 方法调用，零额外成本。
   */
  peek(): any {
    if (this.computed) {
      if (this.evaluating) {
        throw cyclicError(
          'computed evaluation re-entered',
          evalStack.map((c) => c.label).concat(this.label),
        )
      }
      if (this.dirty) updateComputed(this)
      return this.cached
    }
    return this.cached
  }

  set value(next: any) {
    if (this.computed) throw new Error('computed is read-only')
    if (Object.is(this.cached, next)) return
    this.cached = next
    this.version++
    notify(this)
    drainComputed()
    if (batchDepth === 0) flush()
  }
}

export function signal<T>(initial: T): SignalNode<T> {
  return new SubCell(initial, null, false, '') as unknown as SignalNode<T>
}

export function computed<T>(fn: ComputedFn<T>): SignalNode<T> {
  computedCount++
  // 诊断用：命名 fn 显示函数名，匿名 arrow 显示变量名提示（供环依赖报错定位）
  return new SubCell(
    undefined,
    fn,
    true,
    fn.name || '(anonymous computed)',
  ) as unknown as SignalNode<T>
}

export interface EffectOptions {
  /**
   * 是否挂到当前 effect 的 children 上（默认 true）
   */
  asChild?: boolean
}

/**
 * effect 节点
 */
class EffectNodeImpl implements EffectNode {
  declare fn: EffectFn
  declare links: Link[]
  declare cursor: number
  declare disposed: boolean
  declare computed: boolean
  /** 惰性：仅当真的注册过 cleanup 才建数组 */
  declare cleanups: CleanupFn[] | null
  declare children: Set<EffectNode> | null
  declare running: boolean
  declare queued: boolean

  constructor(fn: EffectFn) {
    this.fn = fn
    this.links = []
    this.cursor = 0
    this.disposed = false
    this.computed = false
    this.cleanups = null
    this.children = null
    this.running = false
    this.queued = false
  }

  run(): void {
    if (this.disposed || this.running) return
    this.running = true
    // 1. 退订本轮未再读到的旧依赖
    unlinkRemainder(this)
    // 2. 收尾钩子
    const cl = this.cleanups
    if (cl !== null && cl.length > 0) {
      for (let i = 0; i < cl.length; i++) cl[i]()
      cl.length = 0
    }
    // 3. 上一轮派生的子 effect 全量重建
    if (this.children !== null && this.children.size > 0) {
      for (const child of this.children) child.dispose()
      this.children.clear()
    }
    const prev = currentEffect
    currentEffect = this
    runId++
    try {
      this.fn()
    } finally {
      currentEffect = prev
      this.running = false
    }
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    unlinkAll(this)
    const cl = this.cleanups
    if (cl !== null && cl.length > 0) {
      for (let i = 0; i < cl.length; i++) cl[i]()
      cl.length = 0
    }
    if (this.children !== null && this.children.size > 0) {
      for (const child of this.children) child.dispose()
      this.children.clear()
    }
    this.queued = false
  }
}

export function effect(fn: EffectFn, opts: EffectOptions = {}): EffectNode {
  const asChild = opts.asChild !== false
  const e = new EffectNodeImpl(fn)
  const parent = currentEffect
  if (asChild && parent !== null && !parent.disposed) {
    (parent.children ??= new Set()).add(e)
  }
  e.run()
  return e
}

export function batch(fn: () => void): void {
  batchDepth++
  try {
    fn()
  } finally {
    batchDepth--
    if (batchDepth === 0) flush()
  }
}

export function onCleanup(fn: CleanupFn): void {
  const e = currentEffect
  if (e !== null && !e.disposed) (e.cleanups ??= []).push(fn)
}

// 同步冲刷待运行 effect
export function flushSync(): void {
  flush()
}

/**
 * 在 `fn` 执行期间关闭依赖收集
 */
export function untrack<T>(fn: () => T): T {
  const prevEffect = currentEffect
  const prevStack = computedStack
  currentEffect = null
  computedStack = null
  try {
    return fn()
  } finally {
    currentEffect = prevEffect
    computedStack = prevStack
  }
}
