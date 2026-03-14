import { camelCase, each } from "myfx";
import { CompElem } from "../CompElem";
import { DefinitionPropMap } from "../constants";
import { directive } from "../directive/index";
import { EnterPointType } from "../types";
const Ignores = ['key']
/**
 * 绑定属性到节点上，如果节点是组件会使用in操作符判断是否props
 * @param styles 对象/数组/字符串
 */
export const bind = directive(function Bind(obj: Record<string, any>) {
  return (pointNode: Node, [obj]: [Record<string, any>], oldArgs: any[] | undefined) => {
    let el = pointNode as HTMLElement
    if (oldArgs) {
      each(obj, (v, k: string) => {
        el.setAttribute(k, v)
      })
      return;
    }

    if (el instanceof CompElem) {
      //判断是否prop
      let props: Record<string, any> = {};
      let attrs: Record<string, string> = {}
      let propDefs = DefinitionPropMap.get(el.constructor)

      each(obj, (v, k: string) => {
        if (Ignores.includes(k)) return;

        let ck = camelCase(k)
        let propDef = propDefs ? propDefs[ck] : undefined
        if (propDef) {
          props[k] = v;
        } else {
          attrs[k] = v + '';
        }
      })
      el._initProps(props, attrs)
    } else {
      each(obj, (v, k: string) => {
        el.setAttribute(k, v)
      })
    }
  };
}, [EnterPointType.TAG])