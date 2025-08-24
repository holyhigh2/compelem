import { CompElem } from "../CompElem";
import { EnterPoint, directive } from "../directive/index";
import { EnterPointType, TmplFn } from "../types";

/**
 * 创建一个动态插槽内容
 * @param cbk 回调函数，函数接收插槽上定义得变量
 * @param slotName 插槽名词，默认default
 */
export const slot = directive(function Slot(cbk: TmplFn, slotName?: string) {
  return (point: EnterPoint, newArgs: any[], oldArgs: any[] | undefined, { renderComponent, slotComponent }: { renderComponent: CompElem, slotComponent: CompElem }) => {
    if (oldArgs) return

    cbk = cbk.bind(renderComponent)
    slotComponent._bindSlotHook(slotName || 'default', cbk)
  };
}, [EnterPointType.SLOT])