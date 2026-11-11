/**
 * 过渡运行时（enter / leave 共用）。
 *
 * 只做「让节点在文档流里多活一会儿」与「让新节点从 from 状态起步」两件事，
 * 不参与响应式；调用方负责在此之前冻结订阅（`UpdatePoint.freeze()`）。
 *
 * enter 与 leave 共用同一条批量队列：
 *   1. 插入/删除前挂 `-from` + `-active`
 *   2. 下一帧一次性换到 `-to`（写阶段）
 *   3. 只做一次强制重排，再逐元素取实际创建的动画（读阶段）
 *   4. 每个元素等自己的全部动画结束，全部落定后再统一 cleanup/finalize
 */
import type { TransitionSpec } from '../types'
import { map, parseDuration } from 'myfx'
import { showError } from '../utils'

export const LEAVING_ATTR = 'data-ce-leaving'

/**
 * 过渡期间写在元素上的序号变量。
 *
 * 使用者拿它排节奏：`transition-delay: calc(var(--ce-i, 0) * 60ms)`。
 * 取值为「元素在本批中的位置」：结构指令按批内下标，`forEach` 传入本批第几个
 * （列表项逐个插入时各自成批，下标无法自行推出）。
 */
export const INDEX_VAR = '--ce-i'

export type NormalizedSpec = {
  /** 类前缀，如 `ce-fade` / `ce` */
  prefix: string
  duration?: number
  delay?: number
  /** 本批的起始序号；缺省时按元素在批内的下标取 */
  index?: number
}

const raf: (cb: () => void) => void =
  typeof requestAnimationFrame === 'function'
    ? (cb) => requestAnimationFrame(cb)
    : (cb) => { setTimeout(cb, 16) }

/**
 * 两帧后执行；`setTimeout(100)` 兜底先到先跑。
 *
 * 必须是**两帧**：节点在 `prepareEnter` 之后才插入，第一帧才把 `-from` 状态
 * 画出来；若同一帧内就换到 `-to`，浏览器看不到起始值，过渡不会触发。
 * 后台标签页里 rAF 不触发，只等 rAF 会让入场节点永久停在 `-enter-from`、
 * 离场节点永久留在 DOM，所以按可见性兜底：页面隐藏时直接执行。
 *
 * 兜底不按固定时长触发 —— 长帧 / 低端机上 100ms 可能落在两帧之间，
 * 此时提前换 `-to` 会让过渡静默不播（表现为「瞬间切换」）。
 */
export function nextFrame(cb: () => void): void {
  let done = false
  let frames = 0
  let timer: ReturnType<typeof setInterval> | undefined
  const run = () => {
    if (done) return
    done = true
    if (timer !== undefined) clearInterval(timer)
    cb()
  }
  const tick = () => {
    frames++
    if (frames >= 2) run()
    else raf(tick)
  }
  raf(tick)
  let checks = 0
  timer = setInterval(() => {
    // 隐藏页 + 兜底上限（3s）：避免 rAF 迟迟不来时定时器与节点永久悬着
    checks++
    if (typeof document === 'undefined' || document.visibilityState === 'hidden' || checks >= 30) run()
  }, 100)
}

/** 系统层是否要求减少动效；为真时所有过渡都退化为同步路径 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** 规整 spec：字符串 → `ce-<name>` 前缀（enter / leave 共用） */
export function normalizeSpec(spec: TransitionSpec): NormalizedSpec {
  if (typeof spec === 'string') {
    return { prefix: spec ? `ce-${spec}` : 'ce' }
  }
  return {
    prefix: spec.name ? `ce-${spec.name}` : 'ce',
    duration: spec.duration,
    delay: spec.delay,
  }
}

/* ═══════════════════════ 时长与结束判定 ═══════════════════════ */

/**
 * 解析 CSS 时长列表（如 `0.3s, 0.5s`）为毫秒数组。
 *
 * myfx 2.0 移除了业务耦合的 parseDurations，这里在使用方就地实现：
 * 空串返回 `[]`（保证 propCount 为 0），其余按逗号拆分后逐项 parseDuration。
 */
function parseDurations(value: string): number[] {
  if (!value) return []
  return map(value.split(','), parseDuration)
}

/**
 * 一次过渡的总时长：各属性 `duration + delay` 的最大值。
 *
 * delay 数量少于 duration 时按取模循环复用（与 CSS 规范一致）。
 * myfx 2.0 移除了该业务函数，这里在使用方独立实现。
 */
function durationTimeout(durations: number[], delays: number[]): number {
  let max = 0
  for (let i = 0; i < durations.length; i++) {
    const delay = delays.length ? delays[i % delays.length] : 0
    const total = durations[i] + delay
    if (total > max) max = total
  }
  return max
}

type TransitionType = 'transition' | 'animation'

export type TransitionInfo = {
  type: TransitionType | null
  timeout: number
  propCount: number
  transitionTimeout: number
  animationTimeout: number
}

/**
 * 读取元素当前的过渡信息。
 *
 * transition 与 animation 同时存在时取时长更长的一方（等长时算 animation，与 Vue 一致）。
 * `propCount` 是本次过渡的属性/动画数量，用于等全部属性结束，
 * 避免 opacity 先结束就把 transform 截断。
 */
export function transitionInfoOf(el: Element): TransitionInfo {
  const cs = getComputedStyle(el)
  const transitionDurations = parseDurations(cs.transitionDuration)
  const transitionDelays = parseDurations(cs.transitionDelay)
  const animationDurations = parseDurations(cs.animationDuration)
  const animationDelays = parseDurations(cs.animationDelay)
  const transitionTimeout = durationTimeout(transitionDurations, transitionDelays)
  const animationTimeout = durationTimeout(animationDurations, animationDelays)

  if (transitionTimeout > 0 && transitionTimeout > animationTimeout) {
    return {
      type: 'transition',
      timeout: transitionTimeout,
      propCount: transitionDurations.length,
      transitionTimeout,
      animationTimeout,
    }
  }
  if (animationTimeout > 0) {
    return {
      type: 'animation',
      timeout: animationTimeout,
      propCount: animationDurations.length,
      transitionTimeout,
      animationTimeout,
    }
  }
  return {
    type: null,
    timeout: 0,
    propCount: 0,
    transitionTimeout,
    animationTimeout,
  }
}

/** 从 computed style 反推本节点一次过渡的总时长（含 delay，取 transition / animation 中更长的一方） */
export function transitionMsOf(el: Element): number {
  return transitionInfoOf(el).timeout
}

/**
 * 一次性完成器：`finish` 重复调用只生效一次，触发时清掉已挂的超时兜底。
 *
 * 三个等待函数共用它；监听移除放在各自的 `done` 里，因为只有它们知道挂在哪。
 */
function createSettle(done: () => void): { finish: () => void; arm: (ms: number) => void } {
  let settled = false
  let timer: ReturnType<typeof setTimeout> | undefined
  const finish = () => {
    if (settled) return
    settled = true
    if (timer !== undefined) clearTimeout(timer)
    done()
  }
  return {
    finish,
    arm(ms: number) { timer = setTimeout(finish, ms) },
  }
}

/**
 * 等一次过渡结束。
 *
 * - 不传 `prop`：按 computed style 选 transition 或 animation 其一，
 *   等**全部**属性/动画结束（`propCount`），超时兜底 `ms + 50`。
 * - 传 `prop`：只认该 transition 属性的 `transitionend`（供 FLIP 等精确场景使用）。
 *
 * 返回取消器。
 */
export function whenTransitionEnds(el: Element, ms: number, done: () => void, prop?: string): () => void {
  const info = prop === undefined ? transitionInfoOf(el) : undefined
  const type: TransitionType | null = prop !== undefined ? 'transition' : info!.type
  const propCount = prop !== undefined ? 1 : Math.max(1, info!.propCount)
  const endEvent = type === null ? '' : `${type}end`
  let ended = 0
  let onEnd: (e: Event) => void = () => { }

  const settle = createSettle(() => {
    if (endEvent) el.removeEventListener(endEvent, onEnd)
    done()
  })
  onEnd = (e: Event) => {
    if (e.target !== el) return
    if (prop !== undefined) {
      if ((e as TransitionEvent).propertyName !== prop) return
    } else if (++ended < propCount) {
      return
    }
    settle.finish()
  }

  if (endEvent) el.addEventListener(endEvent, onEnd)
  // 过渡事件可能因为属性值未变化而不触发，超时是唯一兜底
  settle.arm(Math.max(0, ms) + (endEvent ? 50 : 0))
  return settle.finish
}

/**
 * 该元素上**实际创建**的 CSS 过渡/动画。
 *
 * 只认 `CSSTransition` / `CSSAnimation`（duck-typing 区分），业务自己用 WAAPI
 * 起的自由动画不参与。相比「解析 computed style 猜属性数」：
 * - `transition: all .18s` 只解析出 1 项时长，实际可能在跑 opacity/transform 两段；
 * - 属性值没变化时浏览器根本不会创建动画对象，这里直接为空 —— 不必靠超时猜。
 */
function cssAnimationsOf(el: Element): Animation[] {
  const list = el.getAnimations()
  const out: Animation[] = []
  for (let i = 0; i < list.length; i++) {
    const a = list[i] as any
    if (a.transitionProperty !== undefined || a.animationName !== undefined) out.push(list[i])
  }
  return out
}

/**
 * 一组动画里最长的一条，只用于超时兜底。
 *
 * 取 `getComputedTiming().endTime`：它已含 iterations / delay / endDelay，
 * 而 `getTiming().duration` 只是一次的时长 —— 多次迭代的动画按它算会把兜底
 * 压到第一次迭代结束，兜底抢在动画之前触发就摘类取消动画。
 * 无限迭代时 `endTime` 是 `Infinity`，退回一次迭代的时长当上限。
 */
function totalMsOf(anims: Animation[]): number {
  let max = 0
  for (let i = 0; i < anims.length; i++) {
    const effect = anims[i].effect
    const endTime = effect?.getComputedTiming().endTime
    let total: number
    if (typeof endTime === 'number' && isFinite(endTime)) {
      total = endTime
    } else {
      const timing = effect?.getTiming()
      const duration = typeof timing?.duration === 'number' ? timing.duration : 0
      const delay = typeof timing?.delay === 'number' ? timing.delay : 0
      total = duration + delay
    }
    if (total > max) max = total
  }
  return max
}

/**
 * 等一组动画全部结束（被取消也算结束）。
 *
 * `finished` 正常不会悬挂，但 `fill` 或时间线异常时可能不 resolve，
 * 超时兜底与 `whenTransitionEnds` 保持同一策略。
 */
function whenAnimationsEnd(anims: Animation[], ms: number, done: () => void): () => void {
  let remaining = anims.length
  const settle = createSettle(done)
  const one = () => {
    if (--remaining === 0) settle.finish()
  }

  for (let i = 0; i < anims.length; i++) anims[i].finished.then(one, one)
  settle.arm(Math.max(0, ms) + 50)
  return settle.finish
}

/** 纯计时（显式 `duration` 但没有动画对象时使用） */
function whenMsElapses(ms: number, done: () => void): () => void {
  const settle = createSettle(done)
  settle.arm(ms)
  return settle.finish
}

/** 摘掉 keyed 列表打在节点上的 `__c-<subViewId>` 标记（离场节点不再参与 diff） */
export function stripViewKeyMarkers(nodes: Node[]): void {
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i] as any
    const keys = Object.keys(n)
    for (let k = 0; k < keys.length; k++) {
      if (keys[k].startsWith('__c-')) delete n[keys[k]]
    }
  }
}

/* ═══════════════════════ 统一队列 ═══════════════════════ */

type Phase = 'enter' | 'leave'

type Job = {
  els: HTMLElement[]
  prefix: string
  phase: Phase
  duration?: number
  delay?: number
  index?: number
  finalize?: () => void
  cancelled: boolean
  done: boolean
  waits: (() => void)[]
}

const queue: Job[] = []
const running = new Set<Job>()
let scheduled = false
/** 正在播放入场的元素 → 类前缀（供 cancelEnter 定向清类） */
const ACTIVE: WeakMap<HTMLElement, string> = new WeakMap()

function elementRoots(nodes: Node[]): HTMLElement[] {
  const els: HTMLElement[] = []
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]
    if (n.nodeType === Node.ELEMENT_NODE) els.push(n as HTMLElement)
  }
  return els
}

function classesOf(prefix: string, phase: Phase): [from: string, active: string, to: string] {
  return [`${prefix}-${phase}-from`, `${prefix}-${phase}-active`, `${prefix}-${phase}-to`]
}

/** 被本模块写过内联 delay 的元素 → 写入前的内联值（cleanup 时按此恢复） */
const DELAY_BASE: WeakMap<HTMLElement, { transition: string; animation: string }> = new WeakMap()

/**
 * 把 `delay` 写进内联样式，让过渡真的延后播放。
 *
 * 内联长属性的优先级高于使用者的 `.ce-*-active` 规则（含其中的 `transition` 简写），
 * 所以这是唯一能压过 CSS 自带 delay 的通道。基线只在首次写入时记录，
 * 避免同一元素连续两批时把上一批的 delay 当成原值。
 */
function applyDelay(el: HTMLElement, ms: number) {
  if (!DELAY_BASE.has(el)) {
    DELAY_BASE.set(el, { transition: el.style.transitionDelay, animation: el.style.animationDelay })
  }
  el.style.transitionDelay = `${ms}ms`
  el.style.animationDelay = `${ms}ms`
}

function restoreDelay(el: HTMLElement) {
  const base = DELAY_BASE.get(el)
  if (!base) return
  el.style.transitionDelay = base.transition
  el.style.animationDelay = base.animation
  DELAY_BASE.delete(el)
}

function startClasses(job: Job) {
  const [from, active] = classesOf(job.prefix, job.phase)
  const delay = job.delay
  const base = job.index
  for (let i = 0; i < job.els.length; i++) {
    const el = job.els[i]
    el.classList.add(from, active)
    // 同一列表项的多根共享一个序号；没有显式序号时按批内下标
    el.style.setProperty(INDEX_VAR, String(base === undefined ? i : base))
    if (delay !== undefined && delay > 0) applyDelay(el, delay)
    if (job.phase === 'leave') el.setAttribute(LEAVING_ATTR, '')
  }
}

function cleanup(job: Job) {
  const [from, active, to] = classesOf(job.prefix, job.phase)
  for (let i = 0; i < job.els.length; i++) {
    const el = job.els[i]
    el.classList.remove(from, active, to)
    el.style.removeProperty(INDEX_VAR)
    restoreDelay(el)
    if (job.phase === 'leave') el.removeAttribute(LEAVING_ATTR)
    ACTIVE.delete(el)
  }
}

function settle(job: Job) {
  if (job.done) return
  job.done = true
  running.delete(job)

  // 取消器来自内部实现，正常不抛；单条抛出不得连带跳过 cleanup
  const waits = job.waits
  job.waits = []
  for (let i = 0; i < waits.length; i++) {
    try {
      waits[i]()
    } catch (e) {
      reportError(e)
    }
  }

  cleanup(job)
  // finalize 走用户的 beforeDestroyed()/destroyed() 与 up.destroy()，是外部代码：
  // 抛出只上报，不影响同批其余 job（settle 可能从动画 finished 的异步回调进入，
  // 放出去会变成 unhandled rejection）
  try {
    job.finalize?.()
  } catch (e) {
    reportError(e)
  }
}

function reportError(e: unknown) {
  showError(e instanceof Error ? (e.stack ?? e.message) : String(e))
}

function cancelJob(job: Job) {
  if (job.done) return
  job.cancelled = true
  settle(job)
}

function schedule(nodes: Node[], phase: Phase, norm: NormalizedSpec, finalize?: () => void): Job | undefined {
  const els = elementRoots(nodes)
  if (els.length === 0) return undefined

  const job: Job = {
    els,
    prefix: norm.prefix,
    phase,
    duration: norm.duration,
    delay: norm.delay,
    index: norm.index,
    finalize,
    cancelled: false,
    done: false,
    waits: [],
  }
  startClasses(job)
  queue.push(job)
  if (!scheduled) {
    scheduled = true
    nextFrame(drain)
  }
  return job
}

/**
 * 插入**之前**调用：挂 `-enter-from` + `-enter-active`。
 *
 * 此时节点还在游离 fragment 里，不会被绘制，所以不会闪一帧全亮内容。
 * `duration: 0` 与动效偏好同 leave 一致，直接不挂类（同步路径）。
 * `index` 是本批的起始序号（`forEach` 传本批第几个），会写进 `--ce-i`。
 */
export function prepareEnter(nodes: Node[], spec: TransitionSpec | null | undefined, index?: number): void {
  if (!spec) return
  const norm = normalizeSpec(spec)
  if (prefersReducedMotion() || norm.duration === 0) return
  norm.index = index
  schedule(nodes, 'enter', norm)
}

/**
 * 跑一段离场动画，结束后回调 `finalize`。
 *
 * 无元素节点、`duration: 0`、或取不到任何过渡时长时**同步** finalize，
 * 不进 rAF —— 尊重动效偏好与零配置降级都走这条路。
 * `index` 同 `prepareEnter`：写进 `--ce-i` 供 CSS 排节奏。
 */
export function runLeave(nodes: Node[], spec: TransitionSpec, finalize: () => void, index?: number): () => void {
  const norm = normalizeSpec(spec)
  if (norm.duration === 0 || prefersReducedMotion()) {
    finalize()
    return () => { }
  }
  norm.index = index

  const job = schedule(nodes, 'leave', norm, finalize)
  if (!job) {
    finalize()
    return () => { }
  }
  return () => cancelJob(job)
}

/**
 * 取消进行中的入场（元素状态已翻转时由 `show` 调用）。
 *
 * 队列里等待 drain 的 job 就地作废；已开始播放的取消等待并清类。
 * 只影响 enter，不触碰 leave。
 */
export function cancelEnter(nodes: Node[]): void {
  // 无事可取消时直接返回：ACTIVE 的登记只由 running 里的 job 建立，
  // 两者同空就没有需要清的元素，省掉一次 elementRoots 分配与两轮扫描
  if (queue.length === 0 && running.size === 0) return

  const els = elementRoots(nodes)
  if (els.length === 0) return

  const hit = (job: Job) => job.phase === 'enter' && job.els.some(el => els.indexOf(el) >= 0)
  for (let i = 0; i < queue.length; i++) {
    if (hit(queue[i])) cancelJob(queue[i])
  }
  for (const job of running) {
    if (hit(job)) cancelJob(job)
  }

  // 兜底：job 已不在队列/运行集但 ACTIVE 里仍有登记
  for (let i = 0; i < els.length; i++) {
    const el = els[i]
    const prefix = ACTIVE.get(el)
    if (prefix === undefined) continue
    ACTIVE.delete(el)
    const [from, active, to] = classesOf(prefix, 'enter')
    el.classList.remove(from, active, to)
    el.style.removeProperty(INDEX_VAR)
    restoreDelay(el)
  }
}

/**
 * 一帧内排空队列：
 * 写阶段 = 全批换 from → to；读阶段 = 全批只强制一次 reflow，再逐元素取动画；
 * 等待阶段 = 每个元素等自己的全部动画结束。读写严格分离，避免布局抖动。
 */
function drain() {
  scheduled = false
  const jobs = queue.splice(0, queue.length)
  if (jobs.length === 0) return

  const live: Job[] = []
  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i]
    if (job.cancelled || job.done) continue
    // 首屏（未连接）与已脱离文档的批次：不参与动画，直接落定
    // 逐元素判定：多根批次里只要还有根在文档里，就得按动画路径走
    let connected = false
    for (let j = 0; j < job.els.length; j++) {
      if (job.els[j].isConnected) {
        connected = true
        break
      }
    }
    if (!connected) {
      settle(job)
      continue
    }
    live.push(job)
  }
  if (live.length === 0) return

  // 写阶段：from → to
  for (let i = 0; i < live.length; i++) {
    const job = live[i]
    const [from, , to] = classesOf(job.prefix, job.phase)
    for (let j = 0; j < job.els.length; j++) {
      const el = job.els[j]
      el.classList.remove(from)
      el.classList.add(to)
      if (job.phase === 'enter') ACTIVE.set(el, job.prefix)
    }
    running.add(job)
  }

  // 全批共用一次强制重排：把 to 状态固化后再读时长
  // 取第一个仍在文档里的元素 —— 已脱线的元素不产生布局，读它不会强制重排
  let reflowEl: HTMLElement | undefined
  for (let i = 0; i < live.length && reflowEl === undefined; i++) {
    const els = live[i].els
    for (let j = 0; j < els.length; j++) {
      if (els[j].isConnected) {
        reflowEl = els[j] as HTMLElement
        break
      }
    }
  }
  if (reflowEl) void reflowEl.offsetHeight

  // 读阶段 + 等待：时长从动画对象自身取，不再解析 computed style
  for (let i = 0; i < live.length; i++) {
    const job = live[i]
    let remaining = job.els.length
    const one = () => {
      if (--remaining === 0) settle(job)
    }
    for (let j = 0; j < job.els.length; j++) {
      const el = job.els[j]
      if (!el.isConnected) {
        one()
        continue
      }

      // 老浏览器（没有 getAnimations）退回「解析 computed style + 事件计数」
      if (typeof el.getAnimations !== 'function') {
        // 显式 duration 时 computed style 里的时长不作数，delay 另有内联写入，需自己加
        const ms = job.duration !== undefined
          ? job.duration + (job.delay ?? 0)
          : transitionMsOf(el)
        if (ms <= 0) {
          one()
          continue
        }
        job.waits.push(whenTransitionEnds(el, ms, one))
        continue
      }

      const anims = cssAnimationsOf(el)
      if (anims.length > 0) {
        // delay 已写进内联样式，含在每条动画的 timing 里，不能再加一次
        job.waits.push(whenAnimationsEnd(anims, totalMsOf(anims), one))
        continue
      }

      // 没有过渡被创建：显式 duration 仍按它计时（声明了动画就该等），否则立即落定
      if (job.duration !== undefined) {
        const ms = job.duration + (job.delay ?? 0)
        if (ms <= 0) {
          one()
          continue
        }
        job.waits.push(whenMsElapses(ms, one))
        continue
      }
      one()
    }
  }
}
