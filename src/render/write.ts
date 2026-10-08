import { isBlank, isEmpty, isNil } from 'myfx'
import { CompElem } from '../CompElem'
import { CompElemHelper } from '../helpers'
import { getCssVarKey } from '../utils'

//转换为字符串（null/undefined → ''，-0 → '-0'，其他类型按 JS 规则转）
export function t2s(v: any): string {
  if (v == null) return ''
  if (v === 0 && 1 / v < 0) return '-0'
  const type = typeof v
  if (type === 'string') return v
  if (type === 'number' || type === 'boolean') return String(v)
  if (type === 'symbol') return v.toString()
  return v.toString ? v.toString() : Object.prototype.toString.call(v)
}

//设置节点文本内容
export function wText(node: any, v: any): void {
  const t = t2s(v)
  if (t !== node.textContent) node.textContent = t
}

//设置属性
export function wAttr(node: any, attrName: string, v: any): void {
  node.setAttribute(attrName, v + '')
}

//设置混合模板属性点：`pre + (v + '') + post`（pre/post 是编译器切好的常量）
export function wAttrT(node: any, attrName: string, pre: string, post: string, v: any): void {
  node.setAttribute(attrName, pre + (v + '') + post)
}

//设置 classes 指令点
export function wClass(node: any, v: any): void {
  node.className = t2s(v)
}

/**
 * styles 指令点
 * cssText 整写会清掉 cssVars 自定义属性 → 失效宿主镜像，故先把子组件上的
 * 缓存置为 undefined，让它按新样式重建。
 */
export function wStyle(node: any, v: any): void {
  if (node instanceof CompElem) (node as any).__cssVarVals = undefined
  node.style.cssText = t2s(v)
}

// 设置display样式
export function wShow(node: any, v: any): void {
  node.style.display = v ? '' : 'none'
}

// toggle 属性点（`?disabled=${v}`）
export function wToggleProp(node: any, attrName: string, val: boolean): void {
  node.toggleAttribute(attrName, val)
  if (node instanceof CompElem) CompElemHelper.updatePropOne(node, attrName, val)
}

// prop 点（`.pv=${v}`）
export function wProp(comp: CompElem<any>, node: any, attrName: string, val: any): void {
  if (node instanceof CompElem) {
    CompElemHelper.updatePropOne(node, attrName, val)
  } else if (node instanceof HTMLSlotElement) {
    ; (comp as any)._updateSlot(node.getAttribute('name') || 'default', attrName, val)
  }
}

/**
 * cssVars 宿主镜像同步
 */
export function wCssVars(comp: CompElem<any>): void {
  const cssVarObj = comp.cssVars
  if (isEmpty(cssVarObj)) return
  const keys = Object.keys(cssVarObj)
  const style = comp.style
  let mirror = comp.__cssVarVals as Record<string, string> | undefined
  if (mirror === undefined) mirror = comp.__cssVarVals = {}
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i]
    let v = cssVarObj[k]
    const cssVarKey = getCssVarKey(comp.constructor, k)
    if (isBlank(v) || isNil(v)) v = 'initial'
    else v = '' + v
    if (mirror[cssVarKey] === v) continue
    mirror[cssVarKey] = v
    style.setProperty(cssVarKey, v)
  }
}
