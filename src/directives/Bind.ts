import { camelCase, each } from "myfx";
import { CompElem } from "../CompElem";
import { DefinitionPropMap } from "../constants";
import { directive } from "../directive/index";
import { EnterPointType } from "../types";
import { addUninitializedSubComponentProp, isCompElemNode } from "../utils";
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
  const newClass = hasKey ? normalizeClass(val) : ''
  const oldClass = BindClassLast.get(el) ?? ''
  if (newClass === oldClass) return
  if (oldClass) {
    el.classList.remove(...oldClass.split(' ').filter(Boolean))
  }
  if (newClass) {
    el.classList.add(...newClass.split(' ').filter(Boolean))
  }
  BindClassLast.set(el, newClass)
}

/**
 * 合并写入 style，仅移除/设置本指令负责的键
 */
function applyBindStyle(el: HTMLElement, val: any, hasKey: boolean) {
  const styleObj = hasKey ? normalizeStyle(val) : {}
  const newKeys = new Set(Object.keys(styleObj))
  const oldKeys = BindStyleKeys.get(el)
  let oldVals = BindStyleVals.get(el)
  if (!oldVals) {
    oldVals = {}
    BindStyleVals.set(el, oldVals)
  }
  if (oldKeys) {
    oldKeys.forEach((k: string) => {
      if (!newKeys.has(k)) {
        el.style.removeProperty(k)
        delete oldVals![k]
      }
    })
  }
  each(styleObj, (v, k: string) => {
    const s = v.value + '' + (v.important ? ' !important' : '')
    if (oldVals![k] === s) return
    el.style.setProperty(k, v.value + '', v.important ? 'important' : '')
    oldVals![k] = s
  })
  BindStyleKeys.set(el, newKeys)
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
      each(obj, (v, k: string) => {
        if (Ignores.includes(k) || k === CLASS_KEY || k === STYLE_KEY) return
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
        if (Ignores.includes(k) || k === CLASS_KEY || k === STYLE_KEY) return;

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
        if (Ignores.includes(k) || k === CLASS_KEY || k === STYLE_KEY) return;
        el.setAttribute(k, v)
        oldVals[k] = v
      })
    }
  };
}, [EnterPointType.TAG])
