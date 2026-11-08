/**
 * 列表 FLIP（First-Last-Invert-Play）：keyed 重排的位移过渡。
 *
 * 读写分离：
 *   1. 变更前 `captureRects` —— 一次批量读。读到的是**含动画位移**的屏幕位置，
 *      这正是新动画要接上的起点；此处不取消旧动画
 *   2. 变更后 `playMove`：取消旧动画（写）→ 批量读新位置与基础 transform（读）
 *      → 起新动画（写）
 *   3. 取消与重新起动画在同一次任务内完成，中间不产生绘制，观感连续
 *
 * 用 WAAPI 而不是内联 `transform` + 强制重排：
 *   - `fill: 'none'` 的终帧就是元素自身的样式，结束/取消都自然还原，
 *     不需要备份与「样式是否仍归我们所有」的判断；
 *   - 新一次重排直接 `cancel()` 上一段动画，不会叠加内联样式。
 * 基础 transform 拼在位移之后，保留组件自己的 transform。
 */
import type { MoveSpec } from '../types'
import { prefersReducedMotion } from './leave'

type Rect = { left: number, top: number }

/** 元素上正在播放的位移动画（下一次重排时取消） */
const RUNNING: WeakMap<HTMLElement, Animation> = new WeakMap()

/** 只认元素根：文本/注释节点没有盒子，无法参与 FLIP */
function firstElement(nodes: Node[] | undefined): HTMLElement | undefined {
  if (!nodes) return undefined
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].nodeType === Node.ELEMENT_NODE) return nodes[i] as HTMLElement
  }
  return undefined
}

/**
 * 采集「变更前」的位置。调用点必须在任何 DOM 变更之前。
 */
export function captureRects(keyMap: Record<string, Node[]>): Map<string, Rect> {
  const out = new Map<string, Rect>()
  for (const k in keyMap) {
    const el = firstElement(keyMap[k])
    if (!el || !el.isConnected) continue
    const r = el.getBoundingClientRect()
    out.set(k, { left: r.left, top: r.top })
  }
  return out
}

/**
 * 变更后播放位移：`keys` 是新的顺序，只有前后都在的项才会动。
 */
export function playMove(
  before: Map<string, Rect>,
  keyMap: Record<string, Node[]>,
  keys: string[],
  spec: MoveSpec,
): void {
  if (prefersReducedMotion() || before.size === 0) return
  const duration = typeof spec === 'string' ? 200 : (spec.duration ?? 200)
  const easing = typeof spec === 'string' ? 'cubic-bezier(.4,0,.2,1)' : (spec.easing ?? 'cubic-bezier(.4,0,.2,1)')
  if (duration <= 0) return

  // 写阶段：先取消上一段位移，再读新位置
  // 取消必须发生在读 rect 之前：`fill:'none'` 的取消会让元素落回布局位，
  // 带旧动画读数会把旧动画的当前偏移一起算进位移量，新动画起点因此偏移。
  // 同一次任务内取消并重新起动画，中间不产生绘制，观感上不跳。
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    if (!before.has(key)) continue
    const el = firstElement(keyMap[key])
    if (!el || !el.isConnected) continue
    const prev = RUNNING.get(el)
    if (prev) prev.cancel()
  }

  // 读阶段：批量取新位置，不和写交错
  const targets: { el: HTMLElement, dx: number, dy: number, base: string }[] = []
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    const prev = before.get(key)
    if (!prev) continue
    const el = firstElement(keyMap[key])
    if (!el || !el.isConnected) continue
    const r = el.getBoundingClientRect()
    const dx = prev.left - r.left
    const dy = prev.top - r.top
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue
    targets.push({ el, dx, dy, base: '' })
  }
  if (targets.length === 0) return

  for (let i = 0; i < targets.length; i++) {
    targets[i].base = getComputedStyle(targets[i].el).transform
  }

  // 写阶段：位移 → 自身 transform；`fill: 'none'` 结束后自动落回样式
  for (let i = 0; i < targets.length; i++) {
    const { el, dx, dy, base } = targets[i]
    const moved = `translate(${dx}px, ${dy}px)`
    const hasBase = base !== '' && base !== 'none'
    const anim = el.animate(
      [{ transform: hasBase ? `${moved} ${base}` : moved }, { transform: hasBase ? base : 'none' }],
      { duration, easing, fill: 'none' },
    )
    RUNNING.set(el, anim)
    anim.onfinish = () => {
      if (RUNNING.get(el) === anim) RUNNING.delete(el)
    }
    anim.oncancel = () => {
      if (RUNNING.get(el) === anim) RUNNING.delete(el)
    }
  }
}
