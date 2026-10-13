import { CompElem } from "../CompElem";
import { ComponentUninitializedSlotFunctionMap } from "../constants";
import { directive } from "../directive/index";
import { registerSlotOrigin } from "../render/slot-provenance";
import { EnterPointType, TplFn } from "../types";

/**
 * 创建一个动态插槽内容
 * @param cbk 回调函数，函数接收插槽上定义得变量
 * @param slotName 插槽名词，默认default
 */
export const slot = directive(function Slot(cbk: TplFn, slotName?: string) {
  return (_pointNode: Node, [cbk, slotName]: any[], oldArgs: any[] | undefined, { renderComponent, slotComponent }: { renderComponent: CompElem, slotComponent: CompElem }) => {
    if (oldArgs) return

    const owner = renderComponent
    const bound = registerSlotOrigin(cbk.bind(owner) as TplFn, {
      owner,
      subId: (cbk as any).__subId,
      fx: (cbk as any).__fx,
      bv: (cbk as any).__bv,
    })
    cbk = bound
    let slotMap = ComponentUninitializedSlotFunctionMap.get(slotComponent)
    if (!slotMap) {
      slotMap = {}
      ComponentUninitializedSlotFunctionMap.set(slotComponent, slotMap)
    }
    slotMap[slotName || 'default'] = cbk
  };
}, [EnterPointType.SLOT])