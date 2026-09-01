import { assign, camelCase, isBlank, isString, isUndefined, kebabCase, some } from "myfx";
import { CompElem } from "./CompElem";
import { ComponentUninitializedSubComponentPropMap, CssVarKeyCacheMap, DefinitionComponentMap } from "./constants";

export function showError(msg: string): void {
  console.error(`[CompElem]`, msg);
}

export function showTagError(tagName: string, msg: string): void {
  console.error(`[CompElem <${tagName}>]`, msg);
}

export function showWarn(...args: unknown[]): void {
  console.warn(`[CompElem]`, ...args);
}
export function showTagWarn(tagName: string, msg: string): void {
  console.warn(`[CompElem <${tagName}>]`, msg);
}

//获取父类构造
export function _getSuper(cls: CompElem) {
  return Object.getPrototypeOf(cls)
}

export function isBooleanProp(type: any) {
  return type === Boolean || some(type, t => t === Boolean)
}
//返回boolean值或非boolean值
export function getBooleanValue(v: any) {
  let val = v
  if (isString(v) && /(?:^true$)|(?:^false$)/.test(val)) {
    val = val === 'true' ? true : false
  } else if (isUndefined(val) || isBlank(val)) {
    val = true;
  }
  return val
}

export const DomUtil = {
  getNodes(startNode: Node, endNode: Node) {
    let nextNode = startNode.nextSibling
    if (!endNode) return [nextNode] as Node[]
    let rs: Node[] = []
    while (nextNode && nextNode !== endNode) {
      rs.push(nextNode)
      nextNode = nextNode?.nextSibling
    }
    return rs;
  },
  insertBefore: function (node: Node, newNodes: any[]) {
    if (!node.parentNode) return;

    let fragment = document.createDocumentFragment();
    fragment.append(...newNodes);
    node.parentNode!.insertBefore(fragment, node);
  },
  remove: function (startNode: Node, endNode: Node) {
    if (startNode === endNode) {
      startNode?.parentNode?.removeChild(startNode)
      return;
    }
    let nextNode = startNode.nextSibling
    while (nextNode && nextNode !== endNode) {
      nextNode?.parentNode?.removeChild(nextNode)
      nextNode = startNode.nextSibling
    }
  },
  //清除dom内容并释放内存
  clear(container: Element | ShadowRoot | null) {
    if (!container) return

    //先收集后销毁
    let comps: CompElem[] = []
    let walk = (parent: Node) => {
      let children = parent.childNodes
      for (let i = 0, l = children.length; i < l; i++) {
        let n = children[i]
        if (n.nodeType !== Node.ELEMENT_NODE) continue
        if (n instanceof CompElem) comps.push(n)
        walk(n)
      }
    }
    walk(container)
    for (let i = 0, l = comps.length; i < l; i++) {
      comps[i].destroy()
    }
  }
}

export function isCompElemNode(node: Element) {
  return !!DefinitionComponentMap[node.tagName?.toLowerCase()]
}

export function addUninitializedSubComponentProp(wrapperComponent: CompElem, node: Element, props: Record<string, any>) {
  let propMap = ComponentUninitializedSubComponentPropMap.get(wrapperComponent)
  if (!propMap) {
    propMap = new Map()
    ComponentUninitializedSubComponentPropMap.set(wrapperComponent, propMap)
  }
  let p = propMap.get(node) ?? {}
  propMap.set(node, assign(p, props))
}

export function getCssVarKey(ctor: Function, k: string): string {
  let m = CssVarKeyCacheMap.get(ctor)
  if (!m) {
    m = new Map()
    CssVarKeyCacheMap.set(ctor, m)
  }
  let v = m.get(k)
  if (v === undefined) {
    v = '--' + kebabCase(k).replace(/^-+/, '')
    m.set(k, v)
  }
  return v
}

//camelCase结果缓存
const CamelCaseCache = new Map<string, string>()
export function camelCaseCached(name: string): string {
  let v = CamelCaseCache.get(name)
  if (v !== undefined) return v
  if (CamelCaseCache.size > 1024) CamelCaseCache.clear()
  v = camelCase(name)
  CamelCaseCache.set(name, v)
  return v
}

//构造函数名小写缓存（prop类型检查用，避免每次更新构造正则）
const TypeNameLowerCache = new WeakMap<Function, string>()
export function typeNameLower(et: Function): string {
  let v = TypeNameLowerCache.get(et)
  if (v === undefined) {
    v = (et.name || '').toLowerCase()
    TypeNameLowerCache.set(et, v)
  }
  return v
}
