import { isEqual, last, set } from "myfx";
import { CompElem } from "../CompElem";
import { EnterPoint, directive } from "../directive/index";
import { EnterPointType } from "../types";

/**
 * 类似Model，实现属性的同步跟踪
 * 设置组件prop，并监控 @update:prop 事件
 * @param syncValue 双向绑定的组件变量
 */
export const sync = directive(function Sync(syncValue: any) {
  return (point: EnterPoint, newArgs: any[], oldArgs: any[] | undefined, { renderComponent, varChain }: { renderComponent: CompElem, varChain: string[][] }) => {
    const targetComponent = point.startNode as CompElem
    if (oldArgs) {
      if (!isEqual(newArgs, oldArgs)) {
        let attrName = point.attrName
        targetComponent._updateProps({ [attrName]: newArgs[0] })
      }
      return
    }

    let modelPath = last(varChain)
    let attrName = point.attrName
    //todo _setParentProps接口不应该外部使用
    targetComponent._initProps({ [attrName]: syncValue })
    targetComponent.addEventListener('update:' + attrName, (e: CustomEvent) => {
      set(renderComponent, modelPath, e.detail.value)
    });

  }
}, [EnterPointType.PROP])