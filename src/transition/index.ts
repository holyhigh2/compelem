import { each } from "myfx";
import { CompElem } from "../CompElem";
import { UpdatePoint } from "../render/UpdatePoint";
import { TransitionCfg, TransitionOptions } from "../types";

/**
 * 过渡动画运行时
 *
 * CSS 类名协议：
 * - 入场：`${name}-enter-from` + `${name}-enter-active` → 下一帧换 `${name}-enter-to`
 * - 离场：`${name}-leave-from` + `${name}-leave-active` → 下一帧换 `${name}-leave-to`
 * - 列表位移：`${name}-move`
 * 动画由用户CSS声明，结束时自动探测 transition/animation 时长（或使用显式duration）。
 */

function nextFrame(cb: () => void) {
    requestAnimationFrame(() => requestAnimationFrame(cb))
}

function toMs(s: string) {
    return Number(s.slice(0, -1).replace(',', '.')) * 1000
}

function getTimeout(delays: string[], durations: string[]) {
    while (delays.length < durations.length) {
        delays = delays.concat(delays)
    }
    let max = 0
    durations.forEach((d, i) => {
        max = Math.max(max, toMs(d) + toMs(delays[i] ?? '0s'))
    })
    return max
}

/**
 * 读取元素计算样式，判断使用transition还是animation并计算总时长
 */
function getTransitionInfo(el: Element): { endEvent: string, timeout: number, propCount: number } | null {
    const styles = getComputedStyle(el)
    const style = (k: string) => ((styles as any)[k] || '').split(', ')
    const tDelays = style('transitionDelay')
    const tDurations = style('transitionDuration')
    const tTimeout = getTimeout(tDelays, tDurations)
    if (tTimeout > 0) {
        return { endEvent: 'transitionend', timeout: tTimeout, propCount: tDurations.length }
    }
    const aDelays = style('animationDelay')
    const aDurations = style('animationDuration')
    const aTimeout = getTimeout(aDelays, aDurations)
    if (aTimeout > 0) {
        return { endEvent: 'animationend', timeout: aTimeout, propCount: aDurations.length }
    }
    return null
}

/**
 * 等待元素过渡/动画结束（事件监听 + 超时兜底）。
 * 显式duration存在时直接使用定时器。
 */
function waitTransitionEnd(el: Element, cfg: TransitionCfg, done: () => void) {
    if (cfg.duration != null) {
        setTimeout(done, cfg.duration)
        return
    }
    const info = getTransitionInfo(el)
    if (!info) {
        done()
        return
    }
    let ended = 0
    let finished = false
    const finish = () => {
        if (finished) return
        finished = true
        clearTimeout(tid)
        el.removeEventListener(info.endEvent, onEnd)
        done()
    }
    const onEnd = (e: Event) => {
        if (e.target === el && ++ended >= info.propCount) finish()
    }
    const tid = setTimeout(finish, info.timeout + 1)
    el.addEventListener(info.endEvent, onEnd)
}

/**
 * 对一组元素按类名协议执行入场/离场时序。
 * 返回取消函数：清理类名并触发cancelled钩子，但不调用done（由中断方接管后续）。
 */
export function runTransition(component: CompElem, els: Element[], kind: 'enter' | 'leave', cfg: TransitionCfg, done: () => void): () => void {
    if (!els.length) {
        done()
        return () => { }
    }
    const base = `${cfg.name}-${kind}`
    const hooks = cfg.hooks ?? {}
    const onBefore = kind === 'enter' ? hooks!['before-enter'] : hooks!['before-leave']
    const onDuring = kind === 'enter' ? hooks!['enter'] : hooks!['leave']
    const onAfter = kind === 'enter' ? hooks!['after-enter'] : hooks!['after-leave']
    const onCancelled = kind === 'enter' ? hooks!['enter-cancelled'] : hooks!['leave-cancelled']

    let finished = false
    let pending = els.length
    const settle = (el: Element) => {
        if (finished) return
        el.classList.remove(`${base}-active`, `${base}-to`)
        onAfter?.call(component, el)
        if (--pending === 0) {
            finished = true
            done()
        }
    }

    each(els, el => onBefore?.call(component, el))
    each(els, el => {
        el.classList.add(`${base}-from`, `${base}-active`)
    })

    nextFrame(() => {
        if (finished) return
        each(els, el => {
            el.classList.remove(`${base}-from`)
            el.classList.add(`${base}-to`)
        })
        each(els, el => {
            if (onDuring) {
                //用户钩子接管结束时机
                onDuring.call(component, el, () => settle(el))
            } else {
                waitTransitionEnd(el, cfg, () => settle(el))
            }
        })
    })

    return function cancel() {
        if (finished) return
        finished = true
        each(els, el => {
            el.classList.remove(`${base}-from`, `${base}-active`, `${base}-to`)
            onCancelled?.call(component, el)
        })
    }
}

//////////////////////////////////////////////////// 子视图节点收集

/**
 * 收集子视图根节点（数组/按key记录两种形态）
 */
export function collectRootNodes(subViewRootNodes: any, out: Node[]) {
    if (!subViewRootNodes) return
    if (Array.isArray(subViewRootNodes)) {
        each(subViewRootNodes, (n: any) => out.push(n))
    } else {
        each(subViewRootNodes, (nodeAry: any) => {
            if (Array.isArray(nodeAry)) {
                each(nodeAry, (n: any) => out.push(n))
            } else {
                out.push(nodeAry)
            }
        })
    }
}

//////////////////////////////////////////////////// 配置

/**
 * 由 transition 指令选项构建内部配置
 */
export function buildTransitionCfg(name: string, options?: TransitionOptions): TransitionCfg | undefined {
    if (!name) return undefined
    if (!options) return { name }
    const { onBeforeEnter, onEnter, onAfterEnter, onEnterCancelled, onBeforeLeave, onLeave, onAfterLeave, onLeaveCancelled, ...rest } = options
    const hooks = { onBeforeEnter, onEnter, onAfterEnter, onEnterCancelled, onBeforeLeave, onLeave, onAfterLeave, onLeaveCancelled }
    return {
        name,
        mode: rest.mode,
        appear: rest.appear,
        duration: rest.duration,
        hooks: (onBeforeEnter || onEnter || onAfterEnter || onEnterCancelled || onBeforeLeave || onLeave || onAfterLeave || onLeaveCancelled) ? hooks : undefined
    }
}

/**
 * 读取更新点上的过渡配置：
 * - `<transition>` 伪标签：附着在模板元数据上（解析期），钩子表达式经 resolveAnchorHooks 解析后存于 __resolvedTransition
 * - transition() 指令：每次更新附着在更新点上（钩子为实函数，无需解析）
 */
export function getTransitionCfg(up: UpdatePoint): TransitionCfg | undefined {
    return up.__transition ?? up.__resolvedTransition ?? up.metaInfo?.transitionCfg
}

/**
 * 解析<transition>伪标签钩子引用：按锚点vars槽位偏移从当前vars取函数并绑定组件实例。
 * 结果写入 up.__resolvedTransition（每次更新重算）。
 * ⚠️ 必须返回/写入拷贝：metaInfo.transitionCfg 属于模板级共享元数据，不可原地注入运行时函数。
 */
export function resolveAnchorHooks(up: UpdatePoint, vars: any[], component: CompElem<any>): void {
    const cfg = up.metaInfo?.transitionCfg
    if (!cfg?.hooks) return
    const anchorIdx = up.varIndex
    if (anchorIdx == null || anchorIdx < 0) return

    up.__resolvedTransition = { ...cfg, hooks: cfg?.hooks }
}

//////////////////////////////////////////////////// 入场

/**
 * 收集子视图根元素
 */
export function collectElementRoots(subViewRootNodes: any): Element[] {
    const nodes: Node[] = []
    collectRootNodes(subViewRootNodes, nodes)
    return nodes.filter(n => n instanceof Element) as Element[]
}

/**
 * 入场第一阶段：必须在元素插入文档【之前】调用。
 * 提前打好 enter-from/enter-active，使元素的首个计算样式即为入场起点；
 * 若插入后才加类，浏览器会以插入态（如opacity:1）为过渡起点产生幻影过渡，入场动画不可见。
 */
export function beginEnter(component: CompElem, els: Element[], cfg: TransitionCfg) {
    if (!els.length) return
    const base = `${cfg.name}-enter`
    each(els, el => cfg.hooks?.onBeforeEnter?.call(component, el))
    each(els, el => el.classList.add(`${base}-from`, `${base}-active`))
}

/**
 * 入场第二阶段：元素插入文档后调用——下一帧移除enter-from换enter-to并等待过渡结束。
 * 返回取消函数（清理类名并触发onEnterCancelled，不调用done）。
 */
export function settleEnter(component: CompElem, els: Element[], cfg: TransitionCfg, done?: () => void): () => void {
    if (!els.length) {
        done?.()
        return () => { }
    }
    const base = `${cfg.name}-enter`
    const hooks = cfg.hooks
    let finished = false
    let pending = els.length
    const settle = (el: Element) => {
        if (finished) return
        el.classList.remove(`${base}-active`, `${base}-to`)
        hooks?.onAfterEnter?.call(component, el)
        if (--pending === 0) {
            finished = true
            done?.()
        }
    }
    nextFrame(() => {
        if (finished) return
        each(els, el => {
            el.classList.remove(`${base}-from`)
            el.classList.add(`${base}-to`)
        })
        each(els, el => {
            if (hooks?.onEnter) {
                //用户钩子接管结束时机
                hooks.onEnter.call(component, el, () => settle(el))
            } else {
                waitTransitionEnd(el, cfg, () => settle(el))
            }
        })
    })
    return function cancel() {
        if (finished) return
        finished = true
        each(els, el => {
            el.classList.remove(`${base}-from`, `${base}-active`, `${base}-to`)
            hooks?.onEnterCancelled?.call(component, el)
        })
    }
}

//////////////////////////////////////////////////// 离场（延迟移除）

interface PendingLeave {
    cancel: () => void,
    commit: () => void
}

const PendingLeaveMap = new WeakMap<UpdatePoint, PendingLeave>()

function commitRemove(nodes: Node[], ups: UpdatePoint[], component?: CompElem) {
    each(nodes, (n: any) => {
        (n as CharacterData | Element).remove()
        if (n instanceof CompElem) {
            n.destroy()
        }
    })
    each(ups, up => up.destroy(component))
}

/**
 * 立即结束锚点上进行中的离场动画并完成移除。
 * 用于 REMOVE/REPLACE 开始前清理旧离场批次：中断过渡、立即移除节点与更新点，
 * 且不触发该批次挂起的 onAfter（如out-in模式下已被取代的延迟插入）。
 */
export function forceFinishLeave(up: UpdatePoint) {
    const pending = PendingLeaveMap.get(up)
    if (!pending) return
    PendingLeaveMap.delete(up)
    pending.cancel()
    pending.commit()
}

/**
 * 延迟离场移除：对元素打 leave 类，过渡结束后才执行真正的节点移除与更新点销毁。
 * 无配置或无可动画元素时立即移除（与原行为一致）。
 */
export function removeNodesAnimated(
    up: UpdatePoint,
    nodes: Node[],
    ups: UpdatePoint[],
    component: CompElem,
    cfg: TransitionCfg | undefined,
    opts?: { onAfter?: () => void, forceFinish?: boolean }
) {
    const els = nodes.filter(n => n instanceof Element) as Element[]
    if (!cfg || els.length === 0) {
        commitRemove(nodes, ups, component)
        opts?.onAfter?.()
        return
    }
    if (opts?.forceFinish !== false) {
        forceFinishLeave(up)
    }
    //入场中途离场：清理可能残留的enter类，避免enter-from的初始样式干扰离场可见性
    each(els, el => {
        el.classList.remove(`${cfg.name}-enter-from`, `${cfg.name}-enter-active`, `${cfg.name}-enter-to`)
    })

    let committed = false
    const entry: PendingLeave = {
        cancel: () => { },
        commit: () => {
            if (committed) return
            committed = true
            if (PendingLeaveMap.get(up) === entry) PendingLeaveMap.delete(up)
            commitRemove(nodes, ups, component)
        }
    }
    entry.cancel = runTransition(component, els, 'leave', cfg, () => {
        entry.commit()
        opts?.onAfter?.()
    })
    PendingLeaveMap.set(up, entry)
}

//////////////////////////////////////////////////// 列表位移（FLIP）

/**
 * FLIP回放列表位移：从First位置到当前Last位置的反向transform过渡。
 * leaving中的元素不在回放范围内。
 */
export function playMove(
    flipRects: Map<Element, DOMRect>,
    nodeMap: Record<string, any> | any[],
    leavingEls: Set<Element>,
    cfg: TransitionCfg
) {
    const moveClass = `${cfg.name}-move`
    const items: { el: HTMLElement, prev: string }[] = []
    const visit = (n: any) => {
        if (!(n instanceof Element)) return
        if (leavingEls.has(n)) return
        const first = flipRects.get(n)
        if (!first) return
        const lastRect = n.getBoundingClientRect()
        const dx = first.left - lastRect.left
        const dy = first.top - lastRect.top
        if (!dx && !dy) return
        const st = (n as HTMLElement).style
        items.push({ el: n as HTMLElement, prev: st.transform })
        n.classList.add(moveClass)
        st.transitionDuration = '0s'
        st.transform = `translate(${dx}px, ${dy}px)`
    }
    if (Array.isArray(nodeMap)) {
        each(nodeMap, visit)
    } else {
        each(nodeMap, (nodes: any) => {
            if (Array.isArray(nodes)) each(nodes, visit)
            else visit(nodes)
        })
    }
    if (!items.length) return
    //强制回流使反位移先生效
    void document.body.offsetWidth
    nextFrame(() => {
        each(items, ({ el }) => {
            el.style.removeProperty('transition-duration')
            el.style.removeProperty('transform')
            waitTransitionEnd(el, cfg, () => el.classList.remove(moveClass))
        })
    })
}
