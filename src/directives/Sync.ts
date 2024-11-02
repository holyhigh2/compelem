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
  update(nodes: Node[], newArgs: any[], oldArgs: any[]): DirectiveUpdateTag {
    if (!isEqual(newArgs, oldArgs)) {
      this.targetComponent._updateProps({ [this.attrName]: newArgs[0] })
      // this.targetComponent._setParentProps({ [this.attrName]: newArgs[0] });
    }
    return DirectiveUpdateTag.NONE
  }
  static get scopes(): EnterPointType[] {
    return [EnterPointType.PROP]
  }
  modelPath: string[]
  attrName: string
  targetComponent: CompElem
  constructor(point: EnterPoint) {
    super();
    this.targetComponent = point.startNode as CompElem
    this.attrName = point.attrName
  }
  render(syncValue: any) {
    if (!this.modelPath)
      this.modelPath = last(this.renderParams)
    //todo _setParentProps接口不应该外部使用
    this.targetComponent._initProps({ [this.attrName]: syncValue })
    // this.targetComponent._setParentProps({ [this.attrName]: syncValue });
    this.targetComponent.addEventListener('update:' + this.attrName, (e: CustomEvent) => {
      set(this.renderComponent, this.modelPath, e.detail.value)
    });

  }
}
export const sync = directive<Parameters<typeof Sync.prototype.render>>(Sync);
