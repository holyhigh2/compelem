import {
  each,
  get,
  isEmpty,
  isString,
  noop
} from "myfx";
import { CompElem } from "../CompElem";
import { ComponentUninitializedWrapperComponentMap, CssTemplateCacheMap, PLACEHOLDER } from "../constants";
import { bindEvents, getEventBindList } from "../events/event";
import { effect, signal, SignalNode } from "../signal";
import { DirectiveInstance, KeyFn, TplFn } from "../types";
import { addUninitializedSubComponentProp, isCompElemNode, showTagError } from "../utils";
import { CssTemplate } from "./CssTemplate";
import { Template } from "./Template";
import { TemplateMeta } from "./TemplateMeta";
import { UpdatePoint } from "./UpdatePoint";
import { resolveVarChain, UpdatePointMeta } from "./UpdatePointMeta";

export const ATTR_PREFIX_EVENT = "@";
export const ATTR_PREFIX_PROP = ".";
export const ATTR_PREFIX_BOOLEAN = "?";
export const ATTR_PREFIX_REF = "*";
export const ATTR_PROP_DELIMITER = ":";
export const ATTR_REF = "ref";

const EXP_TAG = new RegExp(`${PLACEHOLDER}\\d+`)
const TMPL_META_CACHE: Map<Function, TemplateMeta> = new Map()

let SubViewSn = 0
/**
 * 提供渲染函数相关操作
 * @author holyhigh2
 */

//快照收集 fragment 中的元素与文本节点
function collectNodes(root: Node, out: Node[]) {
  let children = root.childNodes
  for (let i = 0, l = children.length; i < l; i++) {
    let n = children[i]
    let t = n.nodeType
    if (t === Node.ELEMENT_NODE) {
      out.push(n)
      collectNodes(n, out)
    } else if (t === Node.TEXT_NODE) {
      out.push(n)
    }
  }
}

// 按编译期发射的 childNodes 下标链从 fragment 根取节点
function resolvePath(root: Node, path: readonly number[]): Node {
  let n: any = root
  for (let i = 0; i < path.length; i++) n = n.childNodes[path[i]]
  return n as Node
}

export function renderTemplate(component: CompElem<any>, tmplM: TemplateMeta, built?: {
  fragment: DocumentFragment
  emptyEvents?: Record<number, string[]>
  nodes?: Node[]
}, opts?: { deferValueFill?: boolean; fx?: any[]; itemArgs?: any[] }): [DocumentFragment, UpdatePoint[]] {
  const { fragment: tmplFragment, emptyEvents: cachedEe, upmMap } = tmplM

  let rs: DocumentFragment
  let nodes: Node[]
  if (built) {
    rs = built.fragment
    nodes = built.nodes ?? []
    if (!built.nodes) collectNodes(rs, nodes)
  } else {
    rs = tmplFragment.cloneNode(true) as DocumentFragment
    nodes = []
    collectNodes(rs, nodes)
  }
  const emptyEvents = built?.emptyEvents ?? cachedEe
  let upAry: UpdatePoint[] = []

  const deferValueFill = opts?.deferValueFill === true
  const fx = opts?.fx
  const itemArgs = opts?.itemArgs
  const callFx = (f: any) =>
    itemArgs
      ? f(component, nodes, undefined, undefined, ...itemArgs)
      : f.length <= 1
        ? f(component)
        : f(component, nodes)

  let currentNode: any;
  let textDirectives: any[] = []
  let direcitves: any[] = []
  let evList: Array<[string, Function, Node, Function?]> = getEventBindList(component)
  let nodeSn = -1
  // 更新点序号
  const updateSns = tmplM.updateSns
  const updateSnsLen = updateSns ? updateSns.length : nodes.length
  for (let ni = 0; ni < updateSnsLen; ni++) {
    if (updateSns) {
      nodeSn = updateSns[ni]
      currentNode = nodes[nodeSn]
    } else {
      currentNode = nodes[ni]
      nodeSn++
    }
    let emptyEvs = emptyEvents[nodeSn]
    if (emptyEvs) {
      emptyEvs.forEach(evName => {
        evList.push([evName, noop, currentNode])
      })
    }
    let props: Record<string, any> | undefined;
    const upms = upmMap[nodeSn]
    if (upms) {
      const upmsLen = upms.length
      for (let ui = 0; ui < upmsLen; ui++) {
        const upm = upms[ui]
        const f = fx![(upm as any).ux]
        let val: any
        if (upm.isDirective || upm.isEvent || upm.isRef || upm.isRefAttr) {
          val = typeof f === 'function' ? callFx(f) : undefined
        } else if (isPropPoint(upm)) {
          val = typeof f === 'function' ? callFx(f) : undefined
        } else {
          val = undefined
        }

        let newUp = UpdatePoint.createFrom(upm)
        newUp.node = currentNode
        newUp.value = val
        if (currentNode instanceof CompElem) ((currentNode as CompElem)._hostUps ??= []).push(newUp)

        if (upm.isProp || upm.isPropPerfix) {
          (props ?? (props = {}))[upm.attrName] = val;
        } else if (upm.isRef) {
          val.__setRef(new WeakRef(currentNode))
        } else if (upm.isEvent) {
          evList.push([upm.attrName, val!, currentNode])
        } else if (upm.isToggleProp) {
          newUp.value = !!val;
          if (!deferValueFill) currentNode.toggleAttribute(upm.attrName, newUp.value)
        } else if (upm.isRefAttr) {
          currentNode.setAttribute(upm.attrName, val)
        } else if (upm.isText) {
          if (upm.isDirective) {
            let attrName = upm.attrName
            let slotComponent = upm.slotNodeSn > -1 ? nodes[upm.slotNodeSn] as CompElem<HTMLElement> : undefined
            let [executor, args] = val as DirectiveInstance
            const varChain = resolveVarChain(upm)
            const textDirMap = (component as any).__dirNodeMap
            if (textDirMap !== undefined) textDirMap.set(currentNode, newUp)
            textDirectives.push([currentNode, attrName, slotComponent, executor, args, varChain, newUp])
          } else if (!deferValueFill && !upm.isPlaceholder) {
            currentNode.textContent = val
          }
        } else if (upm.isDirective) {
          let slotComponent = upm.slotNodeSn > -1 ? nodes[upm.slotNodeSn] as CompElem<HTMLElement> : undefined
          let [executor, args] = val as DirectiveInstance
          let attrName = upm.attrName
          const varChain = resolveVarChain(upm)
          const dirMap = (component as any).__dirNodeMap
          if (dirMap !== undefined) {
            const prev = dirMap.get(currentNode)
            if (prev === undefined) dirMap.set(currentNode, newUp)
            else if (Array.isArray(prev)) prev.push(newUp)
            else dirMap.set(currentNode, [prev, newUp])
          }
          direcitves.push([currentNode, attrName, slotComponent, executor, args, varChain, upm.directiveType])
        } else if (!deferValueFill) {//attr
          currentNode.setAttribute(upm.attrName, upm.attrTmpl.replace(EXP_TAG, val))
        }
        upAry.push(newUp)
      }
    }
    if (currentNode instanceof HTMLSlotElement) {
      component._bindSlot(currentNode, currentNode.name || 'default', props!)
    } else if (currentNode instanceof HTMLElement) {
      if (isCompElemNode(currentNode)) {
        ComponentUninitializedWrapperComponentMap.set(currentNode, component)
        if (props) addUninitializedSubComponentProp(component, currentNode, props)
      }
    }
  }

  textDirectives.forEach(([currentNode, attrName, slotComponent, executor, args, varChain, newUp]) => {
    currentNode['__anchor__'] = SubViewSn++
    let tmpl = executor(currentNode, args, undefined, { renderComponent: component, slotComponent, varChain, attrName, pointType: newUp.directiveType })
    if (tmpl && tmpl.length > 1 && tmpl[1] && tmpl[2]) {
      let [, tmplFn, tmplM, newAry, keyFn] = tmpl
      insertSubView(currentNode, newUp, tmplFn, tmplM, component, newAry, keyFn)
    }
  })
  direcitves.forEach(([currentNode, attrName, slotComponent, executor, args, varChain, pointType]) => {
    executor(currentNode, args, undefined, { renderComponent: component, slotComponent, varChain, attrName, pointType })
  })
  return [rs, upAry]
}

type BuiltTemplate = {
  fragment: DocumentFragment
  ups?: any[]
  emptyEvents?: Record<number, string[]>
  nodes?: Node[]
  updateSns?: number[]
  updatePaths?: number[][]
}

function cloneBuiltTemplate(tmplM: TemplateMeta): BuiltTemplate {
  const fragment = tmplM.fragment.cloneNode(true) as DocumentFragment
  // 稀疏列表
  const updateSns = tmplM.updateSns
  const updatePaths = tmplM.updatePaths
  const nodes: Node[] = []
  if (updateSns && updatePaths) {
    for (let i = 0; i < updateSns.length; i++) nodes[updateSns[i]] = resolvePath(fragment, updatePaths[i])
  } else {
    collectNodes(fragment, nodes)
  }
  return { fragment, nodes }
}

const isPropPoint = (upm: any): boolean => !!(upm.isProp || upm.isPropPerfix)

/**
 * 主模板 pointEffects → 工厂数组，按 `__ce_static__` **类级缓存**
 */
const PE_FACTORIES_CACHE = new WeakMap<object, any[]>()
function resolvePointFactories(ceStatic: any): any[] {
  let f = PE_FACTORIES_CACHE.get(ceStatic)
  if (f === undefined) {
    const fxArr = ceStatic.fx as any[] | undefined
    // 显式标成 any[]：`f` 的类型是 `any[] | undefined`，直接 set / return 会被判错。
    const built: any[] = (ceStatic.pointEffects ?? []).map((x: any) =>
      typeof x === 'number' ? fxArr![x] : x,
    )
    PE_FACTORIES_CACHE.set(ceStatic, built)
    f = built
  }
  return f
}

export function buildStaticView(component: CompElem<any>): DocumentFragment {
  const ceStatic = (component.constructor as any).__ce_static__
  let tmplM = TMPL_META_CACHE.get(component.constructor)
  let out: BuiltTemplate
  if (tmplM) {
    out = cloneBuiltTemplate(tmplM)
  } else {
    const fresh = ceStatic.buildTemplate.call(component)
    out = fresh
    tmplM = convertTemplateMeta(fresh)
    tmplM.fragment = fresh.fragment.cloneNode(true) as DocumentFragment
    TMPL_META_CACHE.set(component.constructor, tmplM)
  }
  const nodes = out.nodes || []
  const fx = ceStatic.fx as any[] | undefined
    ; (component as any).__dirNodeMap = new Map<Node, UpdatePoint>()
  const [rs, upAry] = renderTemplate(component, tmplM, out, {
    deferValueFill: true,
    fx,
  })
  component.__updateTree = upAry
  const factories = resolvePointFactories(ceStatic)
  // 每个点的取值表达式都内联在 fx 工厂里，工厂不需要额外的取值解析实参。
  for (const factory of factories) {
    const effectFn = factory(component, nodes)
    component._regViewEffect(effect(effectFn, NO_CHILD_EFFECT))
  }
  return rs
}

// effect() 选项对象
const NO_CHILD_EFFECT = { asChild: false } as const

/**
 * 重跑指令点下所有子项的合并 effect（分支 REFRESH 的驱动入口）。
 */
export function rerunSubViewEffects(up: UpdatePoint): void {
  const kids = up.children
  if (!kids) return
  for (let i = 0; i < kids.length; i++) {
    const p = kids[i]
    if (!p || p.__destroyed) continue
    const se = p.subEffects
    if (se) {
      for (let j = 0; j < se.length; j++) se[j].run()
    }
  }
}

/**
 * 将编译数据 convert 成 TemplateMeta，供运行时渲染使用
 * @param out 
 * @returns 
 */
export function convertTemplateMeta(out: {
  fragment: DocumentFragment
  ups: any[]
  emptyEvents?: Record<number, string[]>
  nodes?: Node[]
  updateSns?: number[]
  updatePaths?: number[][]
}): TemplateMeta {
  const upms: UpdatePointMeta[] = out.ups.map((u: any, i: number) => {
    const upm = new UpdatePointMeta(u.varIndex ?? i)
    for (const k in u) {
      if (u[k] !== undefined) (upm as any)[k] = u[k]
    }
    if (upm.ux < 0) upm.ux = i
    return upm
  })
  const upmMap: Record<number, UpdatePointMeta[]> = {}
  upms.forEach((upm) => {
    if (!upmMap[upm.nodeSn]) upmMap[upm.nodeSn] = []
    upmMap[upm.nodeSn].push(upm)
  })
  const tmplM = Object.create(TemplateMeta.prototype) as TemplateMeta
  tmplM.fragment = out.fragment
  tmplM.emptyEvents = out.emptyEvents ?? {}
  tmplM.upmMap = upmMap
  // 编译期发射的节点访问表
  tmplM.updateSns = out.updateSns
  tmplM.updatePaths = out.updatePaths
  return tmplM
}

const SUB_TMPL_CACHE: WeakMap<Function, Map<number, TemplateMeta>> = new WeakMap()
let EMPTY_TmplM: TemplateMeta | undefined
/**
 * 空子模板 TemplateMeta
 * 用于 `when` 无匹配 case 且未提供 `default` 时运行时合成的空分支 ——
 * 该分支直接按空模板渲染。
 */
export function getEmptyTemplateMeta(): TemplateMeta {
  if (!EMPTY_TmplM) {
    EMPTY_TmplM = convertTemplateMeta({ fragment: document.createDocumentFragment(), ups: [], emptyEvents: {} })
  }
  return EMPTY_TmplM
}

/**
 * 按回调 `fn.__subId` 查 `__ce_static__.subViews` 取子模板结构元数据
 */
export function resolveSubTemplateMeta(component: CompElem<any>, tmplFn: Function): TemplateMeta | undefined {
  const subId = (tmplFn as any)?.__subId
  if (typeof subId === 'number') {
    const ceStatic = (component.constructor as any).__ce_static__
    const sub = ceStatic?.subViews?.[subId]
    if (sub?.buildTemplate) {
      let map = SUB_TMPL_CACHE.get(component.constructor)
      if (!map) {
        map = new Map()
        SUB_TMPL_CACHE.set(component.constructor, map)
      }
      let tmplM = map.get(subId)
      if (!tmplM) {
        tmplM = convertTemplateMeta(sub.buildTemplate.call(component))
        map.set(subId, tmplM)
      }
      return tmplM
    }
  }
  if (process.env.DEV) {
    showTagError(component.tagName, `Structural sub-template is not compiled — ${typeof subId === 'number' ? `__ce_static__.subViews[${subId}].buildTemplate missing` : 'fn.__subId missing'} (@compelem/compiler required)`)
  }
  return undefined
}

/**
 * 按子模板回调取本副本的产物
 */
export function buildSubTemplate(component: CompElem<any>, tmplFn: Function | undefined): BuiltTemplate | undefined {
  if (!tmplFn) return undefined
  const subId = (tmplFn as any)?.__subId
  if (typeof subId !== 'number') return undefined
  const ceStatic = (component.constructor as any).__ce_static__
  if (!ceStatic?.subViews?.[subId]?.buildTemplate) return undefined
  const tmplM = resolveSubTemplateMeta(component, tmplFn)
  return tmplM ? cloneBuiltTemplate(tmplM) : undefined
}

/**
 * 子模板的 per-point effect 工厂数组
 */
export function getSubPointEffects(component: CompElem<any>, tmplFn: Function | undefined): ((rc: any, nodes: Node[], get: (vi: number) => any, dep: { value: any }) => () => void)[] | undefined {
  const local = (tmplFn as any)?.__fx
  if (local) return local.pe
  const subId = (tmplFn as any)?.__subId
  if (typeof subId !== 'number') return undefined
  return (component.constructor as any).__ce_static__?.subViews?.[subId]?.pointEffects
}

/** 子模板内联 fx：优先回调实例上的 `__fx.fx`（跨层内联），否则 `subs[subId].fx`。 */
export function getSubFx(component: CompElem<any>, tmplFn: Function | undefined): any[] | undefined {
  const local = (tmplFn as any)?.__fx
  if (local) return local.fx
  const subId = (tmplFn as any)?.__subId
  if (typeof subId !== 'number') return undefined
  return (component.constructor as any).__ce_static__?.subViews?.[subId]?.fx
}

//  为一个已插入的子项注册 **1 个** per-point effect
export function registerSubViewEffects(
  component: CompElem<any>,
  tmplFn: Function,
  cell: SignalNode<any>,
  key: any,
  index: number,
  nodes: Node[],
  upAry: UpdatePoint[],
  tmplGetter?: () => Function | undefined,
): void {
  const factories = getSubPointEffects(component, tmplFn)
  if (!factories || factories.length === 0) return

  let e: any
  if ((tmplFn as any)?.__fx) {
    const ov: any[] = []
    e = effect(() => {
      const cur = (tmplGetter !== undefined ? tmplGetter() : undefined) ?? tmplFn
      const curPe = getSubPointEffects(component, cur)!
        ; (curPe[0] as any)(component, nodes, undefined, undefined, ov, cell.value, key, index)()
    }, { asChild: false })
  } else {
    // 自洽子模板（subs[].fx，类级常量）：合并工厂在 effect 体**每轮**重新调用，
    // 把持久旧值槽 ov 与当前 cell.value/key/index 作为实参传入。
    const ov: any[] = []
    const make = factories[0] as any
    e = effect(() => {
      make(component, nodes, undefined, undefined, ov, cell.value, key, index)()
    }, { asChild: false })
  }
  component._regViewEffect(e)
  const host = upAry[0]
  if (host !== undefined) (host.subEffects ??= []).push(e)
}

export function insertSubView(node: Node, point: UpdatePoint, tmplFn: TplFn, tmplM: TemplateMeta, component: CompElem<any>, valueAry?: any[], keyFn?: KeyFn) {
  let upList: any = []
  let rootNodes = keyFn ? {} as Record<string, any> : undefined
  valueAry = valueAry ?? [0]
  //延迟初始化
  let fragment: DocumentFragment | undefined = keyFn ? document.createDocumentFragment() : undefined
  let subViewId = get(node, '__anchor__')
  const keyProp = '__c-' + subViewId
  const addItem = (v: any, k: any, i: number) => {
    const built = buildSubTemplate(component, tmplFn)
    const subFx = getSubFx(component, tmplFn)
    // 子模板取值一律走 fx
    const [rs, upAry] = renderTemplate(component, tmplM, built, { deferValueFill: true, fx: subFx, itemArgs: [v, k, i] })
    // 本子项的 item 值信号。key 先算一次，cell 登记与节点标记共用
    const itemKey = keyFn ? keyFn.call(component, v, k, i) + '' : String(i)
    const cell = signal(v)
      ; (point.subCells ??= {})[itemKey] = cell
    if (!keyFn) (point as any).__renderedTmpl = tmplFn
    registerSubViewEffects(
      component, tmplFn, cell, k, i, (built?.nodes ?? []) as Node[], upAry,
      keyFn ? () => (point.value as any)?.[1]?.[2] : () => (point as any).__renderedTmpl ?? tmplFn,
    )
    const rn = rs.childNodes
    const roots: Node[] = []
    for (let ri = 0, rl = rn.length; ri < rl; ri++) roots.push(rn[ri])
    if (keyFn) {
      const key = itemKey
      for (let ri = 0; ri < roots.length; ri++) {
        ; (roots[ri] as any)[keyProp] = key
      }
      rootNodes![key] = roots
      for (let ui = 0; ui < upAry.length; ui++) {
        upAry[ui].key = key
        upList.push(upAry[ui])
      }
      fragment!.append(rs)
    } else {
      fragment = rs
      point.subViewRootNodes = roots
      for (let ui = 0; ui < upAry.length; ui++) {
        point.insert(upAry[ui])
      }
    }
  }
  const va: any = valueAry
  if (Array.isArray(va)) {
    for (let i = 0; i < va.length; i++) addItem(va[i], i, i)
  } else {
    each(va, (v: any, k: any, _c: any, i: number) => addItem(v, k, i))
  }

  if (rootNodes) {
    point.subViewRootNodes = rootNodes
    upList.forEach((up: UpdatePoint, i: number) => {
      up.varIndex = i
      point.insert(up)
    })
  }

  let len = fragment ? fragment.childNodes.length : 0
  if (len > 0) {
    bindEvents(component)
    node.parentNode!.insertBefore(fragment!, node);
  }
}

//////////////////////////////////////////////////// interfaces
/**
 * HTML模板函数，用于构建模板
 * @param strings
 * @param vars
 */
export function h(
  strings: TemplateStringsArray,
  ...vars: any
): Template {
  return new Template(
    isString(strings) ? ([strings] as any) : strings,
    vars
  );
}

/**
 * CSS模板函数，用于构建模板
 * @param strings
 * @param vars
 */
export function css(
  strings: TemplateStringsArray,
  ...vars: any
): CssTemplate {
  if (CssTemplateCacheMap.has(strings)) {
    return CssTemplateCacheMap.get(strings)!
  }
  let tmpl = new CssTemplate(
    strings,
    vars
  );

  let strVal = strings.join('')
  if (!isEmpty(strVal))
    CssTemplateCacheMap.set(strings, tmpl)
  return tmpl
}


class RefObject<T extends Node> {
  __ref: WeakRef<T> | undefined

  get current(): T | undefined {
    return this.__ref?.deref()
  }

  __setRef(ref: WeakRef<T>) {
    this.__ref = ref
  }
}
/**
 * 使用初始值创建一个引用对象
 * @param initValue 
 * @returns 
 */
export function createRef<T extends Node>() {
  return new RefObject<T>()
}