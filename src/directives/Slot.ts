import { CompElem } from "../CompElem";
import { ComponentUninitializedSlotFunctionMap } from "../constants";
import { directive } from "../directive/index";
import { EnterPointType, TplFn } from "../types";

/**
 * 创建一个动态插槽内容
 * @param cbk 回调函数，函数接收插槽上定义得变量
 * @param slotName 插槽名词，默认default
 */
export const slot = directive(function Slot(cbk: TplFn, slotName?: string) {
  return (pointNode: Node, [cbk, slotName]: any[], oldArgs: any[] | undefined, { renderComponent, slotComponent }: { renderComponent: CompElem, slotComponent: CompElem }) => {
    if (oldArgs) return

    cbk = cbk.bind(renderComponent)
    let slotMap = ComponentUninitializedSlotFunctionMap.get(slotComponent)
    if (!slotMap) {
      slotMap = {}
      ComponentUninitializedSlotFunctionMap.set(slotComponent, slotMap)
    }
    slotMap[slotName || 'default'] = cbk
  };
}, [EnterPointType.SLOT])