import { flushSync } from '../signal'
import { prefersReducedMotion } from './leave'

/**
 * 浏览器 View Transition 实例的最小形状。
 * 不依赖 DOM lib 是否已声明 `ViewTransition`，也不用 `any`。
 */
type ViewTransitionLike = {
  readonly finished: Promise<void>
  readonly ready: Promise<void>
  readonly updateCallbackDone: Promise<void>
  skipTransition?: () => void
}

type DocWithViewTransition = Document & {
  startViewTransition?: (cb: () => void | Promise<void>) => ViewTransitionLike
}

export type ViewTransitionOptions = {
  /**
   * 预设名，写到 `<html data-ce-vt="...">` 上。
   * 缺省走浏览器默认交叉淡出。
   */
  name?: 'fade' | 'slide-up' | 'slide-down' | 'scale' | (string & {})
  /** 尊重 `prefers-reduced-motion: reduce`，默认 true */
  respectReducedMotion?: boolean
  /** 首次运行时自动注入预设样式表，默认 true */
  autoStyle?: boolean
  /** 指定文档，默认取全局 document（SSR/多文档场景用） */
  document?: Document
}

const ATTR_NAME = 'data-ce-vt'
const STYLE_ID = 'compelem-view-transition'
/** 每个文档的标记代次：只有最新一次调用有权清理 `data-ce-vt` */
const VT_GEN: WeakMap<Document, number> = new WeakMap()

/** 预设样式：只在文档层生效（`::view-transition-*` 无法进入 shadow root） */
export const VIEW_TRANSITION_CSS = `
@keyframes ce-vt-fade-in{from{opacity:0}}
@keyframes ce-vt-fade-out{to{opacity:0}}
@keyframes ce-vt-slide-up-in{from{opacity:0;transform:translateY(12px)}}
@keyframes ce-vt-slide-up-out{to{opacity:0;transform:translateY(-12px)}}
@keyframes ce-vt-slide-down-in{from{opacity:0;transform:translateY(-12px)}}
@keyframes ce-vt-slide-down-out{to{opacity:0;transform:translateY(12px)}}
@keyframes ce-vt-scale-in{from{opacity:0;transform:scale(.96)}}
@keyframes ce-vt-scale-out{to{opacity:0;transform:scale(.96)}}
@media (prefers-reduced-motion: no-preference){
::view-transition-group(root){animation-duration:180ms;animation-timing-function:cubic-bezier(.4,0,.2,1)}
html[${ATTR_NAME}="fade"]::view-transition-old(root){animation:ce-vt-fade-out 180ms both}
html[${ATTR_NAME}="fade"]::view-transition-new(root){animation:ce-vt-fade-in 180ms both}
html[${ATTR_NAME}="slide-up"]::view-transition-old(root){animation:ce-vt-slide-up-out 180ms both}
html[${ATTR_NAME}="slide-up"]::view-transition-new(root){animation:ce-vt-slide-up-in 180ms both}
html[${ATTR_NAME}="slide-down"]::view-transition-old(root){animation:ce-vt-slide-down-out 180ms both}
html[${ATTR_NAME}="slide-down"]::view-transition-new(root){animation:ce-vt-slide-down-in 180ms both}
html[${ATTR_NAME}="scale"]::view-transition-old(root){animation:ce-vt-scale-out 180ms both}
html[${ATTR_NAME}="scale"]::view-transition-new(root){animation:ce-vt-scale-in 180ms both}
}
`.trim()

/** 当前环境是否支持同文档 View Transitions */
export function supportsViewTransition(doc?: Document): boolean {
  const d = doc ?? (typeof document !== 'undefined' ? document : undefined)
  return typeof (d as DocWithViewTransition | undefined)?.startViewTransition === 'function'
}

/** 注入预设样式（幂等；仅文档层，shadow root 不参与） */
export function installViewTransitionStyles(doc?: Document): void {
  const d = doc ?? (typeof document !== 'undefined' ? document : undefined)
  if (!d?.head || d.getElementById(STYLE_ID)) return
  const style = d.createElement('style')
  style.id = STYLE_ID
  style.textContent = VIEW_TRANSITION_CSS
  d.head.appendChild(style)
}

type ViewTransitionSetup = {
  doc: Document
  start: NonNullable<DocWithViewTransition['startViewTransition']>
  cleanup: () => void
}

/**
 * 两个入口共用的前置：支持判定、动效降级、样式注入、`data-ce-vt` 标记与代次。
 *
 * 返回 `undefined` 表示本次走同步路径（不支持 / 已关闭动效），调用方自行执行更新。
 * `start` 的调用留在各自函数里 —— 它抛错时两个入口的收尾不同。
 */
function setupViewTransition(options: ViewTransitionOptions): ViewTransitionSetup | undefined {
  const doc = options.document ?? (typeof document !== 'undefined' ? document : undefined)
  const start = (doc as DocWithViewTransition | undefined)?.startViewTransition
  if (!doc || typeof start !== 'function' || (options.respectReducedMotion !== false && prefersReducedMotion())) {
    return undefined
  }

  if (options.autoStyle !== false) installViewTransitionStyles(doc)

  const root = doc.documentElement
  const name = options.name
  if (name) root.setAttribute(ATTR_NAME, name)
  else root.removeAttribute(ATTR_NAME)
  const gen = (VT_GEN.get(doc) ?? 0) + 1
  VT_GEN.set(doc, gen)
  const cleanup = () => {
    if (gen !== VT_GEN.get(doc)) return
    root.removeAttribute(ATTR_NAME)
  }
  return { doc, start, cleanup }
}

/**
 * 把一次 DOM 变更包进 View Transition。
 *
 * `update` 必须是**同步**改状态的回调：内部会在它之后调 `flushSync()`，
 * 保证浏览器在回调返回前就看到新 DOM（否则快照会停在旧状态）。
 *
 * @example
 * 点击换页
 * ```ts
 * button.onclick = () => withViewTransition(() => { this.page = 2 }, { name: 'slide-up' })
 * ```
 */
export function withViewTransition(
  update: () => void,
  options: ViewTransitionOptions = {},
): Promise<void> {
  let ran = false
  const run = () => {
    if (ran) return
    ran = true
    update()
    // 状态写入是同步 flush，但 `batch()` 之外仍可能有排队项，这里兜一次底
    flushSync()
  }

  // 不支持 / 关闭动效：直接同步执行，保持零动画开销
  const setup = setupViewTransition(options)
  if (!setup) {
    run()
    return Promise.resolve()
  }
  const { doc, start, cleanup } = setup

  let vt: ViewTransitionLike
  try {
    vt = start.call(doc, run)
  } catch {
    // 上一次过渡未结束等异常路径：清理标记并按普通更新执行
    cleanup()
    run()
    return Promise.resolve()
  }

  // ready / updateCallbackDone 在过渡被 skip 或 update 抛错时会 reject，
  // 不接住就是 unhandled rejection；update 的异常单独收上来，最后透出给调用方。
  vt.ready.catch(() => { })
  // `throw undefined` 也算失败，用对象包一层，不拿返回值当哨兵
  const updateResult = vt.updateCallbackDone.then(
    () => ({ ok: true as const }),
    (err) => ({ ok: false as const, err }),
  )

  // `finished` 在过渡被 skip 时也会 reject；skip 收敛为成功，更新异常照常抛出。
  // 这里不需要 `createViewTransition` 那样的 ready 兜底：`run` 恒为同步函数
  // （`update()` 的返回值被丢弃），updateCallbackDone 必然结算，finished 不会悬挂。
  return vt.finished.catch(() => { }).then(() => {
    cleanup()
    return updateResult.then((r) => {
      if (!r.ok) throw r.err
    })
  })
}

/** 分段式过渡句柄，见 `createViewTransition` */
export type ViewTransitionHandle = {
  /**
   * 浏览器已采集旧快照并进入 update 回调。
   * 在此之后改动 DOM，改动才会落进新快照；过渡被浏览器跳过时同样会完成。
   * `ready` 不能替代它：浏览器把 `ready` 挂在回调返回的 promise 上，提交之后才完成。
   */
  started: Promise<void>
  /** 放行新快照采集。可重复调用；早于 update 回调到达也会被记住 */
  commit: () => void
  /** 过渡播完。被跳过、或未 commit 就被下一条顶掉时同样完成，不会悬挂 */
  finished: Promise<void>
}

const NOOP_HANDLE: ViewTransitionHandle = {
  started: Promise.resolve(),
  commit: () => { },
  finished: Promise.resolve(),
}

/**
 * 分段式 View Transition：调用时捕获旧快照，`commit()` 决定何时捕获新快照。
 *
 * 用于更新时机不在自己手上的场景 —— 典型是路由：`startViewTransition` 的 update
 * 回调要等到下一个渲染机会才被执行，而导航（守卫、异步加载）是异步的；若等换页
 * 之后再调用 `withViewTransition`，旧快照采到的已经是新页面，过渡会退化成
 * 「新页面淡到自己」。
 *
 * ```ts
 * const vt = createViewTransition({ name: 'fade' })
 * await vt.started    // 旧快照已采集，现在改动 DOM 才进新快照
 * // …导航 / 异步加载 / 换页…
 * vt.commit()         // 采集新快照并播放
 * await vt.finished
 * ```
 *
 * 不支持 View Transitions 或系统要求减少动效时返回空句柄：`started` / `finished`
 * 立即完成、`commit` 是空操作，调用方不需要分支。
 */
export function createViewTransition(options: ViewTransitionOptions = {}): ViewTransitionHandle {
  const setup = setupViewTransition(options)
  if (!setup) return NOOP_HANDLE
  const { doc, start, cleanup } = setup

  let startedResolve: (() => void) | undefined
  const started = new Promise<void>((resolve) => {
    startedResolve = resolve
  })
  let committed = false
  // update 回调若被调用多次，每个等待器都要被放行，不能互相覆盖
  let pendingCommit: (() => void)[] = []
  const waitCommit = () => {
    // 进入回调 = 旧快照已采集
    startedResolve?.()
    return new Promise<void>((resolve) => {
      if (committed) resolve()
      else pendingCommit.push(resolve)
    })
  }

  let vt: ViewTransitionLike
  try {
    vt = start.call(doc, waitCommit)
  } catch {
    // 上一次过渡未结束等异常路径：按无动画处理，时序照旧
    cleanup()
    return NOOP_HANDLE
  }

  // 被 skip 时 update 回调可能永远不执行，`started` 不能悬着；ready 此时会 reject
  vt.ready.then(() => startedResolve?.(), () => startedResolve?.())

  // `ready` 拒绝 = 不会播放（被跳过 / 旧快照采集失败）。此时原生 `finished`
  // 可能**永不结算** —— update 回调的 promise 一直 pending 时连 `skipTransition()`
  // 都不会结掉它，只 catch 只会把 promise 挂住，连带 cleanup 不执行、`data-ce-vt` 残留。
  // 所以拿 ready 的拒绝与 finished 赛跑；ready 正常时这条永不结算，不影响真实时长。
  const noPlay = vt.ready.then<void, void>(
    () => new Promise<void>(() => { }),
    () => { },
  )

  return {
    started,
    commit: () => {
      committed = true
      const waiting = pendingCommit
      pendingCommit = []
      for (let i = 0; i < waiting.length; i++) waiting[i]()
    },
    // `finished` 被 skip 时会 reject，不接住就是 unhandled rejection
    finished: Promise.race([vt.finished.catch(() => { }), noPlay]).then(cleanup),
  }
}
