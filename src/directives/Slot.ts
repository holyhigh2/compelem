import { Directive } from "../directive/Directive";
import { EnterPointType, directive } from "../directive/index";
import { DirectiveUpdateTag, TmplFn } from "../types";

/**
 * 创建一个动态插槽内容
 * @param cbk 回调函数，函数接收插槽上定义得变量
 * @param slotName 插槽名词，默认default
 */
class Slot extends Directive {
  update(nodes: Node[], newArgs: any[], oldArgs: any[]): DirectiveUpdateTag {
    return DirectiveUpdateTag.NONE
  }
  static get scopes(): EnterPointType[] {
    return [EnterPointType.SLOT]
  }
  render(cbk: TmplFn, slotName?: string) {
    cbk = cbk.bind(this.renderComponent)
    this.slotComponent._bindSlotHook(slotName || 'default', cbk)

    return cbk
  }
}
export const slot = directive<Parameters<typeof Slot.prototype.render>>(Slot);
