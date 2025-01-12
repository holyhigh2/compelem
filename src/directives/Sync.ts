import { isEqual, last, set } from "myfx";
import { CompElem } from "../CompElem";
import { Directive } from "../directive/Directive";
import { EnterPoint, EnterPointType, directive } from "../directive/index";
import { DirectiveUpdateTag } from "../types";

/**
 * 类似Model，实现属性的同步跟踪
 * 设置组件prop，并监控 @update:prop 事件
 * @param syncValue 双向绑定的组件变量
 */
class Sync extends Directive {
  created(point: EnterPoint, syncValue: any): void {
    if (!this.modelPath)
      this.modelPath = last(this.renderParams)
    const targetComponent = point.startNode as CompElem
    let attrName = point.attrName
    //todo _setParentProps接口不应该外部使用
    targetComponent._initProps({ [attrName]: syncValue })
    targetComponent.addEventListener('update:' + attrName, (e: CustomEvent) => {
      set(this.renderComponent, this.modelPath, e.detail.value)
    });
  }
  update(point: EnterPoint, newArgs: any[], oldArgs: any[]): DirectiveUpdateTag {
    if (!isEqual(newArgs, oldArgs)) {
      const targetComponent = point.startNode as CompElem
      let attrName = point.attrName
      targetComponent._updateProps({ [attrName]: newArgs[0] })
    }
    return DirectiveUpdateTag.NONE
  }
  static get scopes(): EnterPointType[] {
    return [EnterPointType.PROP]
  }
  modelPath: string[]
  constructor(point: EnterPoint) {
    super();
  }
  render(syncValue: any) {


  }
}
export const sync = directive<Parameters<typeof Sync.prototype.render>>(Sync);
