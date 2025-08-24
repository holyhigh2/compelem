import { EnterPoint, directive } from "../directive/index";
import { EnterPointType } from "../types";
type Cbk = (node: Element, isVisible: boolean) => void

const DisplayMap = new Map()
/**
 * display的快捷指令
 * 如果
 * @param isvisible 是否显示
 * @param cbk 显示状态变更后调用的回调函数
 */
export const show = directive(function Show(isVisible: boolean, cbk?: Cbk) {
  return (point: EnterPoint, [condi]: any[], oldArgs: any[] | undefined) => {
    if (oldArgs && condi === oldArgs[0]) return

    let el = point.startNode as HTMLElement;
    if (!DisplayMap.has(el)) {
      let dis = el.style.display
      DisplayMap.set(el, dis == 'none' ? 'unset' : dis)
    }

    el.style.display = condi ? DisplayMap.get(el) : 'none';

    if (cbk) {
      cbk(el, condi)
    }
  };
}, [EnterPointType.TAG])