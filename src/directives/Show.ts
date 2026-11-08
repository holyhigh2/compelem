import { directive } from "../directive/index";
import { cancelEnter, prepareEnter } from "../transition/enter";
import { runLeave } from "../transition/leave";
import { EnterPointType } from "../types";
import type { TransitionSpec } from "../types";

type Cbk = (node: Element, isVisible: boolean) => void

/** `show()` 的选项：不传则维持 `display` 直切（零开销） */
export type ShowOptions = {
  /** 过渡预设名，如 `'fade'`；与结构指令的 leave/enter 共用同一套类 */
  transition?: TransitionSpec
}

const DisplayMap = new WeakMap()

/**
 * 每个元素的「显示代次」：每次 show 调用 +1。
 *
 * 离场是异步的（几百毫秒后才 `display:none`），期间状态可能翻转
 * （hover 进出、快速开关）。若无条件落定，就会把**已经重新打开**的元素
 * 再藏起来；而此后 `condi === oldArgs[0]`、更新不会再触发，元素会永久消失。
 * 代次不匹配的落定直接丢弃。
 */
const ShowGen = new WeakMap<Element, number>()
/** 进行中的离场取消器：状态翻转时先取消，避免新旧过渡的类互相打架 */
const ActiveLeave = new WeakMap<Element, () => void>()

/**
 * display的快捷指令
 *
 * @param isVisible 是否显示
 * @param cbk 状态变更回调；也可直接传选项对象（等价于省略回调）
 * @param options 过渡选项：`transition` 非空时改为「淡出结束后再 display:none」
 */
export const show = directive(function Show(isVisible: boolean, cbk?: Cbk | ShowOptions, options?: ShowOptions) {
  return (pointNode: Node, [condi, rawCbk, rawOptions]: any[], oldArgs: any[] | undefined, meta?: any) => {
    if (oldArgs && condi === oldArgs[0]) return

    // 允许 `show(v, { transition })`：第二参是对象时视为省略了回调
    let cb: Cbk | undefined = rawCbk
    let opts: ShowOptions | undefined = rawOptions
    if (cb !== null && typeof cb === 'object') {
      opts = cb as ShowOptions
      cb = undefined
    }

    let el = pointNode as HTMLElement;
    if (!DisplayMap.has(el)) {
      // 内联 display:none 不留原值：'' 会删掉内联声明、回落到样式表与 UA 默认值。
      // 不能写 'unset' —— display 非继承，unset 等于 initial（inline），
      // 块级元素（div/li/td）会被降成行内框。
      let dis = el.style.display
      DisplayMap.set(el, dis === 'none' ? '' : dis)
    }

    // 任何一次调用都开启新的一代，并取消上一次未完成的过渡。
    // 代次必须先自增：取消会经 settle 触发离场 finalize，代次不匹配才能拦住
    // 「刚被重新打开的元素又被藏起来」。
    const gen = (ShowGen.get(el) ?? 0) + 1
    ShowGen.set(el, gen)
    const pending = ActiveLeave.get(el)
    if (pending !== undefined) {
      ActiveLeave.delete(el)
      pending()
    }
    cancelEnter([el])

    const spec = (opts as ShowOptions | undefined)?.transition
    // 首屏建树不入场（与结构指令同一条规则）；
    // 动效降级与 duration:0 由 core 判定 —— runLeave 会同步落定，prepareEnter 不挂类
    const firstBuild = meta?.renderComponent?.__firstBuild === true
    if (!spec || firstBuild) {
      el.style.display = condi ? DisplayMap.get(el) : 'none';

      if (cb) {
        cb(el, condi)
      }
      return
    }

    if (condi) {
      // 先从 -enter-from 起步再恢复 display，避免闪一帧全亮
      prepareEnter([el], spec)
      el.style.display = DisplayMap.get(el)
      if (cb) cb(el, true)
      return
    }

    // 隐藏：淡出结束后才真正 display:none（期间保持占位）
    let settled = false
    const cancel = runLeave([el], spec, () => {
      settled = true
      // 期间状态又变过：这次落定作废（新的一次 show 已经接管最终状态）
      if (ShowGen.get(el) !== gen) return
      ActiveLeave.delete(el)
      el.style.display = 'none'
      if (cb) cb(el, false)
    })
    // 同步落定（duration: 0 / 动效降级）时 finalize 已经跑过，不留登记
    if (!settled) ActiveLeave.set(el, cancel)
  };
}, [EnterPointType.TAG])
