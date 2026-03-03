import { isEqual, last, set } from "myfx";
import { CompElem } from "../CompElem";
import { directive } from "../directive/index";
import { EnterPointType } from "../types";

/**
 * 类似Model，实现属性的同步跟踪
 * 设置组件prop，并监控 @update:prop 事件
 * @param syncValue 双向绑定的组件变量
 */
export const sync = directive(function Sync(syncValue: any) {
  return (pointNode: Node, newArgs: any[], oldArgs: any[] | undefined, { renderComponent, varChain, attrName }: { renderComponent: CompElem, varChain: string[], attrName: string }) => {
    const targetComponent = pointNode as CompElem
    if (oldArgs) {
      if (!isEqual(newArgs, oldArgs)) {
        targetComponent._updateProps({ [attrName]: newArgs[0] })
      }
      return
    }

    let modelPath = last(varChain)
    targetComponent._initProps({ [attrName]: newArgs[0] })
    targetComponent.addEventListener('update:' + attrName, (e: CustomEvent) => {
      set(renderComponent, modelPath, e.detail.value)
    });

  }
}, [EnterPointType.PROP])