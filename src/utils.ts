import { camelCase, each, get, isBlank, isString, isUndefined, kebabCase, parseJSON, some } from "myfx";
import { CompElem } from "./CompElem";
import { ComponentUninitializedSubComponentPropMap, CssVarKeyCacheMap, DefinitionComponentMap } from "./constants";
import { Constructor, StyleValueObjectType } from "./types";

export function showError(msg: string): void {
  console.error(`[CompElem]`, msg);
}

export function showTagError(tagName: string, msg: string): void {
  console.error(`[CompElem <${tagName}>]`, msg);
}

export function showWarn(...args: unknown[]): void {
  console.warn(`[CompElem]`, ...args);
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

export function convertValue(v: string, types: Array<Constructor<any>>) {
  let val: any = v
  try {
    //按声明顺序逐个尝试，首个成功转换即采用（后续类型不再覆盖）
    for (let i = 0; i < types.length; i++) {
      const t = types[i];
      if (t === Boolean) {
        if (isBlank(v)) {
          val = true
        } else if (/^true$/i.test(v)) {
          val = true
        } else if (/^false$/i.test(v)) {
          val = false
        } else {
          continue
        }
      } else if (t === Number) {
        if (isBlank(v)) {
          val = undefined
          break
        }
        val = Number(v)
        if (Number.isNaN(val)) continue
      } else if (t === String) {
        val = String(v)
      } else if (t === Object || t === Array) {
        val = parseJSON(v)
        //parseJSON 失败时返回原字符串
        if (val === v) continue
      } else if (t === Date) {
        val = new Date(v)
        if (Number.isNaN(val.getTime())) continue
      } else if (t === Function) {
        continue
      } else {
        val = new t(v)
      }
      break
    }
  } catch (error) {
    throw new Error(`Convert attribute error with ` + v)
  }
  return val
}

export const DomUtil = {
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
  return !!DefinitionComponentMap[tagNameLower(node.tagName) as string]
}

export function addUninitializedSubComponentProp(wrapperComponent: CompElem, node: Element, props: Record<string, any>) {
  let propMap = ComponentUninitializedSubComponentPropMap.get(wrapperComponent)
  if (!propMap) {
    propMap = new Map()
    ComponentUninitializedSubComponentPropMap.set(wrapperComponent, propMap)
  }
  let p = propMap.get(node) ?? {}
  propMap.set(node, Object.assign(p, props))
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

const QueryCacheMap = new WeakMap<CompElem, Map<string, any>>()
/**
 * @query/@queryAll
 */
export function _queryGet(selector: string, all: boolean, once: boolean, context: CompElem): any {
  if (!context.isMounted) return undefined
  let cMap = QueryCacheMap.get(context)
  if (!cMap) {
    cMap = new Map()
    QueryCacheMap.set(context, cMap)
  }
  if (once && cMap.has(selector)) return cMap.get(selector)
  const root = context.shadowRoot
  const el = all ? root?.querySelectorAll(selector) : root?.querySelector(selector)
  cMap.set(selector, el)
  return el
}

/**
 * observedAttributes 的推导实现
 */
export function _observedAttrs(ctor: Function): string[] {
  const cs = (ctor as any)?.__ce_static__
  const props = cs?.props
  const out: string[] = []
  if (props) {
    for (const k of Object.keys(props)) {
      const def = props[k]
      if (def && def.attribute === false) continue
      out.push(kebabCaseCached(k))
    }
  }
  return out
}

/**
 * 单参数纯函数的记忆化包装：返回行为等价的函数，命中缓存直接返回，未命中算一次后写入。
 *
 * 缓存是强引用 `Map`，故只适用于**值类型键**（string/number/boolean 等）；对象键会被
 * 缓存强引用住而阻止回收，那种场景得用 `WeakMap` 手写（见 `typeNameLower`）。
 * 满 `maxSize` 后整表清空（非 LRU：clear 是 O(1)，重排成本高于重算这些廉价函数的收益）。
 *
 * 约定：命中判定为 `!== undefined`，故 `fn` 返回 `undefined` 时**不缓存**（每次重算）。
 */
export function memo<A, R>(fn: (a: A) => R, maxSize = 512): (a: A) => R {
  const cache = new Map<A, R>()
  return (a: A): R => {
    let v = cache.get(a)
    if (v !== undefined) return v
    if (cache.size >= maxSize) cache.clear()
    v = fn(a)
    cache.set(a, v)
    return v
  }
}

//kebabCase结果缓存
export const kebabCaseCached: (name: string) => string = memo(kebabCase, 1024)

///////////////////////////////////////////////////////// 快路径
export function fieldGet(obj: any, name: string): any {
  if (name.indexOf('.') < 0 && name.indexOf('[') < 0) return obj[name]
  return get(obj, name)
}

//小写缓存
export const tagNameLower: (tagName: string | undefined) => string | undefined = memo(
  (tagName: string | undefined) => tagName?.toLowerCase(),
  512
)
//camelCase结果缓存
export const camelCaseCached: (name: string) => string = memo(camelCase, 1024)

//构造函数名小写缓存
const TypeNameLowerCache = new WeakMap<Function, string>()
export function typeNameLower(et: Function): string {
  let v = TypeNameLowerCache.get(et)
  if (v === undefined) {
    v = (et.name || '').toLowerCase()
    TypeNameLowerCache.set(et, v)
  }
  return v
}

/**
 * 类名差量写入：仅移除/添加本指令负责的类
 */
export function applyClassDiff(el: Element, lastMap: WeakMap<Node, string>, newClass: string) {
  const oldClass = lastMap.get(el) ?? '';
  if (newClass === oldClass) return
  if (oldClass) {
    el.classList.remove(...oldClass.split(' ').filter(Boolean));
  }
  if (newClass) {
    el.classList.add(...newClass.split(' ').filter(Boolean));
  }
  lastMap.set(el, newClass)
}

/**
 * 样式差量写入：仅移除/设置本指令负责的键
 * @param lastKeys 已应用键集合缓存
 * @param lastVals 已应用值缓存（值级diff用：跳过未变更项的CSSOM写入）
 */
export function applyStyleDiff(
  el: HTMLElement,
  lastKeys: WeakMap<Node, Set<string>>,
  lastVals: WeakMap<Node, Record<string, string>>,
  styleObj: Record<string, StyleValueObjectType>
) {
  let oldVals = lastVals.get(el)
  if (!oldVals) {
    oldVals = {}
    lastVals.set(el, oldVals)
  }
  // 键集合原地复用（每轮只做「删已消失 + 补新增」），避免每轮新建 Set 的分配
  let keys = lastKeys.get(el)
  if (!keys) {
    keys = new Set<string>()
    lastKeys.set(el, keys)
  }

  keys.forEach((k: string) => {
    if (styleObj[k] === undefined) {
      el.style.removeProperty(k)
      delete oldVals![k]
      keys!.delete(k)
    }
  })
  each(styleObj, (v, k: string) => {
    keys!.add(k)
    const s = v.value + '' + (v.important ? ' !important' : '')
    if (oldVals![k] === s) return
    el.style.setProperty(k, v.value + '', v.important ? 'important' : '')
    oldVals![k] = s
  })
}