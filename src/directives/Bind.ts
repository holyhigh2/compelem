import { camelCase, each } from "myfx";
import { CompElem } from "../CompElem";
import { directive } from "../directive/index";
import { wAttr } from "../render/write";
import { EnterPointType } from "../types";
import { addUninitializedSubComponentProp, applyClassDiff, applyStyleDiff, isCompElemNode } from "../utils";
import { normalizeClass } from "./Classes";
import { normalizeStyle } from "./Styles";
const Ignores = ['key', 'ref', 'emit-native']
const LastValsMap = new WeakMap<Node, Record<string, any>>()
//bind 写入的 class
const BindClassLast = new WeakMap<Node, string>()
//bind 写入的 style 键/值
const BindStyleKeys = new WeakMap<Node, Set<string>>()
const BindStyleVals = new WeakMap<Node, Record<string, string>>()

const CLASS_KEY = 'class'
const STYLE_KEY = 'style'

/**
 * 合并写入 class，仅移除/添加本指令负责的类
 */
function applyBindClass(el: Element, val: any, hasKey: boolean) {
  applyClassDiff(el, BindClassLast, hasKey ? normalizeClass(val) : '')
}

/**
 * 合并写入 style，仅移除/设置本指令负责的键
 */
function applyBindStyle(el: HTMLElement, val: any, hasKey: boolean) {
  applyStyleDiff(el, BindStyleKeys, BindStyleVals, hasKey ? normalizeStyle(val) : {})
}
/**
 * 绑定属性到节点上，如果节点是组件会使用in操作符判断是否props
 * @param styles 对象/数组/字符串
 */
export const bind = directive(function Bind(obj: Record<string, any>) {
  return (pointNode: Node, [obj]: [Record<string, any>], oldArgs: any[] | undefined, { renderComponent }: { renderComponent: CompElem }) => {
    let el = pointNode as HTMLElement

    //class/style 合并
    applyBindClass(el, obj[CLASS_KEY], CLASS_KEY in obj)
    applyBindStyle(el, obj[STYLE_KEY], STYLE_KEY in obj)

    if (oldArgs) {
      let oldVals = LastValsMap.get(el)
      if (!oldVals) {
        oldVals = {}
        LastValsMap.set(el, oldVals)
      }
      const isComp = isCompElemNode(el)
      const propDefs = isComp ? (el.constructor as any).__ce_static__?.props : undefined
      let props: Record<string, any> | undefined = undefined
      each(obj, (v, k: string) => {
        if (Ignores.includes(k) || k === CLASS_KEY || k === STYLE_KEY) return
        if (oldVals![k] === v && (v === null || typeof v !== 'object')) return
        if (propDefs && propDefs[camelCase(k)]) {
          if (!props) props = {}
          props[k] = v
        } else {
          wAttr(el, k, v)
        }
        oldVals![k] = v
      })
      if (props && isComp) (el as any).updateProps(props)
      return;
    }

    if (isCompElemNode(el)) {
      //判断是否prop
      let props: Record<string, any> = {};
      let propDefs = (el.constructor as any).__ce_static__?.props

      let oldVals: Record<string, any> = {}
      LastValsMap.set(el, oldVals)

      each(obj, (v, k: string) => {
        if (Ignores.includes(k) || k === CLASS_KEY || k === STYLE_KEY) return;

        let ck = camelCase(k)
        let propDef = propDefs ? propDefs[ck] : undefined
        if (propDef) {
          props[k] = v;
        } else {
          wAttr(el, k, v)
          oldVals[k] = v
        }
      })
      addUninitializedSubComponentProp(renderComponent, el, props)
    } else {
      let oldVals: Record<string, any> = {}
      LastValsMap.set(el, oldVals)
      each(obj, (v, k: string) => {
        if (Ignores.includes(k) || k === CLASS_KEY || k === STYLE_KEY) return;
        wAttr(el, k, v)
        oldVals[k] = v
      })
    }
  };
}, [EnterPointType.TAG])
