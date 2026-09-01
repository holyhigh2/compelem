import { camelCase, each } from "myfx";
import { CompElem } from "../CompElem";
import { DefinitionPropMap } from "../constants";
import { directive } from "../directive/index";
import { EnterPointType } from "../types";
import { addUninitializedSubComponentProp, isCompElemNode } from "../utils";
const Ignores = ['key']
const LastValsMap = new WeakMap<Node, Record<string, any>>()
/**
 * 绑定属性到节点上，如果节点是组件会使用in操作符判断是否props
 * @param styles 对象/数组/字符串
 */
export const bind = directive(function Bind(obj: Record<string, any>) {
  return (pointNode: Node, [obj]: [Record<string, any>], oldArgs: any[] | undefined, { renderComponent }: { renderComponent: CompElem }) => {
    let el = pointNode as HTMLElement
    if (oldArgs) {
      let oldVals = LastValsMap.get(el)
      if (!oldVals) {
        oldVals = {}
        LastValsMap.set(el, oldVals)
      }
      each(obj, (v, k: string) => {
        if (oldVals![k] === v && (v === null || typeof v !== 'object')) return
        el.setAttribute(k, v)
        oldVals![k] = v
      })
      return;
    }

    if (isCompElemNode(el)) {
      //判断是否prop
      let props: Record<string, any> = {};
      // let attrs: Record<string, string> = {}
      let propDefs = DefinitionPropMap.get(el.constructor)

      let oldVals: Record<string, any> = {}
      LastValsMap.set(el, oldVals)

      each(obj, (v, k: string) => {
        if (Ignores.includes(k)) return;

        let ck = camelCase(k)
        let propDef = propDefs ? propDefs[ck] : undefined
        if (propDef) {
          props[k] = v;
        } else {
          el.setAttribute(k, v + '')
          oldVals[k] = v
        }
      })
      addUninitializedSubComponentProp(renderComponent, el, props)
    } else {
      let oldVals: Record<string, any> = {}
      LastValsMap.set(el, oldVals)
      each(obj, (v, k: string) => {
        el.setAttribute(k, v)
        oldVals[k] = v
      })
    }
  };
}, [EnterPointType.TAG])