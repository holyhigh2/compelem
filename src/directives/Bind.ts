import { each } from "myfx";
import { CompElem } from "../CompElem";
import { EnterPoint, directive } from "../directive/index";
import { EnterPointType } from "../types";
const Ignores = ['key']
/**
 * 绑定属性到节点上，如果节点是组件会使用in操作符判断是否props
 * @param styles 对象/数组/字符串
 */
export const bind = directive(function Bind(obj: Record<string, any>) {
  return (point: EnterPoint, [obj]: [Record<string, any>], oldArgs: any[] | undefined) => {
    let el = point.startNode as HTMLElement
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
      each(obj, (v, k: string) => {
        if (Ignores.includes(k)) return;

        if (k in el) {
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