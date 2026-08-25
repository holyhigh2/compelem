import { debounce, each, find, get, isEmpty, isFunction, map, noop, once, remove, set, size, throttle } from "myfx";
import { CompElem } from "../CompElem";
import { DefinitionCompEmitMap, DefinitionCompEventMap, DefinitionComponentMap } from "../constants";
import { _getSuper } from "../utils";
import { addExtEvent, isExtEvent } from "./extends";

const MODI_EV_DEBOUNCE = /,|^(debounce:.+)|(debounce$)/;
const MODI_EV_THROTTLE = /,|^(throttle:.+)|(throttle$)/;
const MODI_EV_SELF = 'self';
const MODI_EV_STOP = 'stop';
const MODI_EV_PREVENT = 'prevent';
const MODI_EV_ONCE = 'once';
const MODI_EV_CAPTURE = 'capture';
const MODI_EV_PASSIVE = 'passive';
const MODI_EV_MOUSE_LEFT = 'left';
const MODI_EV_MOUSE_RIGHT = 'right';
const MODI_EV_MOUSE_MIDDLE = 'middle';
const MODI_EV_KEYBOARD_COMBO_CTRL = 'ctrl';
const MODI_EV_KEYBOARD_COMBO_ALT = 'alt';
const MODI_EV_KEYBOARD_COMBO_SHIFT = 'shift';
const MODI_EV_KEYBOARD_COMBO_META = 'meta';
const MODI_EV_KEYBOARD_KEY_MAP: Record<string, any> = {
  'esc': 'escape'
};
const MODI_PARAM_DIVIDER = ":";

/*************************************************************
 * 事件修饰符
 * @author holyhigh2
 * 
 * 全部通用 debounce/once/throttle/capture/passive 可组合
 * 原生通用 stop/prevent/self 可组合
 * 鼠标 left/right/middle 不可组合
 * 键盘 ctrl/alt/shift/meta 可组合 esc/letters... 不可组合,多个key并列式表示可选
 * 
 * 部分修饰符支持参数，使用冒号传参如：throttle:100 / debounce:100
 *************************************************************/
const VFN = () => { }
export type EvHadler = (ev: Event) => any

/**
 * "click.stop.prevent.debounce:100" → { evName: 'click', parts: [...] }
 */
function parseEventName(fullName: string) {
  let parts = fullName.split('.');
  let evName = parts.shift()!;
  return { evName, parts };
}

/**
 * 流程控制包装：debounce / throttle / once
 * 组件事件（addEmitEvent）与扩展事件（addExtEvent）共用
 */
function wrapControlFn(cbk: EvHadler, parts: string[]) {
  let c = cbk ?? VFN;
  let modi
  if (modi = find(parts, x => MODI_EV_DEBOUNCE.test(x))) {
    let params = modi.split(MODI_PARAM_DIVIDER)
    c = debounce(c, parseInt(params[1]) || 100)
  }
  if (modi = find(parts, x => MODI_EV_THROTTLE.test(x))) {
    let params = modi.split(MODI_PARAM_DIVIDER)
    c = throttle(c, parseInt(params[1]) || 100)
  }
  if (parts.includes(MODI_EV_ONCE)) {
    c = once(c)
  }
  return c
}

/**
 * 纯修饰符监听器包装：stop/prevent/self/鼠标/键盘
 * @param delegated 委托模式下 self 由外层分发器（handleEvent）判定，此处跳过
 */
function wrapListener(c: EvHadler, parts: string[], delegated = false): { handler: EvHadler; options: { capture: boolean; once: boolean; passive: boolean } } {
  let handler = (e: Event) => {
    if (parts.includes(MODI_EV_PREVENT)) e.preventDefault();
    if (parts.includes(MODI_EV_STOP)) e.stopPropagation();
    if (!delegated && parts.includes(MODI_EV_SELF) && e.target !== e.currentTarget) return;

    if (e instanceof MouseEvent) {
      if (parts.includes(MODI_EV_MOUSE_LEFT) && e.button != 0) return;
      if (parts.includes(MODI_EV_MOUSE_RIGHT) && e.button != 2) return;
      if (parts.includes(MODI_EV_MOUSE_MIDDLE) && e.button != 1) return;
    } else if (e instanceof KeyboardEvent) {
      let ks = parts.slice()
      if (remove(ks, p => p == MODI_EV_KEYBOARD_COMBO_CTRL)[0] && !e.ctrlKey) return;
      if (remove(ks, p => p == MODI_EV_KEYBOARD_COMBO_ALT)[0] && !e.altKey) return;
      if (remove(ks, p => p == MODI_EV_KEYBOARD_COMBO_SHIFT)[0] && !e.shiftKey) return;
      if (remove(ks, p => p == MODI_EV_KEYBOARD_COMBO_META)[0] && !e.metaKey) return;

      let checkKeys = map(ks, k => MODI_EV_KEYBOARD_KEY_MAP[k] || k)
      if (size(checkKeys) > 0 && !checkKeys.includes(e.key.toLowerCase())) return;
    }
    c(e)
  }
  let capture = parts.includes(MODI_EV_CAPTURE) || false
  let passive = parts.includes(MODI_EV_PASSIVE) || false
  let once = parts.includes(MODI_EV_ONCE) || false
  return { handler, options: { capture, once, passive } }
}

function applyEventModifiers(cbk: EvHadler, parts: string[], delegated = false) {
  let c = wrapControlFn(cbk, parts)
  return wrapListener(c, parts, delegated)
}

export function addEvent(fullName: string, cbk: EvHadler, node: Element, component: CompElem<any>, signal?: AbortSignal) {
  let { evName, parts } = parseEventName(fullName);
  let c = wrapControlFn(cbk, parts)
  let isOnce = parts.includes(MODI_EV_ONCE);

  let ctor = DefinitionComponentMap[node.tagName?.toLowerCase()]
  if (ctor) {
    let declared = matchEmit(ctor, evName)
    if (declared) {
      addEmitEvent(node, component, evName, c)
      return noop
    }
  }

  if (isExtEvent(evName)) {
    return addExtEvent(evName, node, c, parts, component, isOnce)
  }

  let { handler, options } = wrapListener(c, parts)
  let opts: AddEventListenerOptions = { capture: options.capture, passive: options.passive }
  if (signal) opts.signal = signal
  node.addEventListener(evName, handler, opts)

  //record
  return (remove = false) => {
    if (!signal) node.removeEventListener(evName, handler, opts)
    if (remove) node = null as any
  }
}

export function addEmitEvent(node: Element, component: CompElem<any>, evName: string, c: EvHadler) {
  let eventSourceSn = get<number>(node, '__c_emit_event_') ?? component._subComponentEventSn++
  set(node, '__c_emit_event_', eventSourceSn)
  let evMap = component._subComponentEventMap.get(eventSourceSn)
  if (!evMap) {
    evMap = {}
    component._subComponentEventMap.set(eventSourceSn, evMap)
  }
  evMap[evName] = c
}

//捕获事件（CAPTURE）
//wheel 同 focus/blur：WheelEvent.bubbles 恒为 false，但存在捕获阶段，故归入捕获委托
const CAPTURE_EVENTS = new Set([
  'focus', 'blur', 'visibilitychange', 'wheel'
]);
//特殊传播（NO_DELEGATE）
const NO_DELEGATE_EVENTS = new Set([
  'mouseenter', 'mouseleave', 'pointerenter', 'pointerleave'
]);
//元素事件（ELEMENT）
const ELEMENT_EVENTS = new Set([
  //资源加载类（重名、早发、无传播）
  'load', 'error', 'abort',
  //媒体类（依附元素实例状态）
  'play', 'pause', 'playing', 'waiting', 'canplay', 'canplaythrough',
  'loadedmetadata', 'loadeddata', 'ended', 'timeupdate', 'volumechange',
  'seeking', 'seeked', 'progress', 'stalled', 'suspend', 'emptied',
  'ratechange', 'durationchange', 'loadstart',
  //CSS 过渡 / 动画
  'transitionstart', 'transitionrun', 'transitionend', 'transitioncancel',
  'animationstart', 'animationend', 'animationcancel', 'animationiteration',
  //元素级滚动（高频、无冒泡、passive 需精细控制）
  'scroll',
  //slot 元素特有
  'slotchange'
]);

interface EventState {
  //[evName, cbk, node, binded?]
  bindList: Array<[string, Function, Node, Function?]>
  //{ name@fnName : fn }
  docoEventMap: Map<string, Function>
  //node -> evName -> [{ handler, parts }]
  handlerMap: WeakMap<Element, Map<string, Array<{ handler: EvHadler; parts: string[] }>>>
  //无法 signal 化的注册（扩展事件全局监听）释放函数集合
  releaseList: Array<Function>
  //'b:'|'c:' + evName
  delegationKeySet: Set<string>
  abortController: AbortController | undefined
  dispatch: (e: Event) => void
}

const ComponentEventStateMap = new WeakMap<CompElem, EventState>()

function getState(comp: CompElem): EventState {
  let s = ComponentEventStateMap.get(comp)
  if (!s) {
    s = {
      bindList: [],
      docoEventMap: new Map(),
      handlerMap: new WeakMap(),
      releaseList: [],
      delegationKeySet: new Set(),
      abortController: undefined,
      dispatch: e => dispatchDelegated(comp as CompElem<any>, e)
    }
    ComponentEventStateMap.set(comp, s)
  }
  return s
}

/**
 * 获取事件注册队列
 */
export function getEventBindList(comp: CompElem<any>): Array<[string, Function, Node, Function?]> {
  return getState(comp).bindList
}

/**
 * 创建 AbortController
 */
function initEventHandlers(comp: CompElem<any>) {
  let s = getState(comp)
  if (!s.abortController) {
    s.abortController = new AbortController();
  }
}


export function bindEvents(comp: CompElem<any>) {
  let s = getState(comp)

  //1. render & subview
  const pending = s.bindList
  if (pending.length > 0) {
    s.bindList = []
    for (let i = 0; i < pending.length; i++) {
      let v: any = pending[i]
      let evName = v[0], cbk = v[1], node = v[2]
      if (!node) continue
      if (v[3]) continue
      let handler = cbk && (get(globalThis, cbk.name) !== cbk) ? cbk.bind(comp) : cbk
      registerEvent(comp, evName, handler, node)
      v[3] = noop
    }
  }

  //2. @event
  let events = DefinitionCompEventMap.get(comp.constructor) ?? DefinitionCompEventMap.get(_getSuper(comp.constructor as any))
  if (events && size(events) > 0) {
    each(events!, ({ name, targetFn, fnName }: any) => {
      let key = name + "@" + fnName
      if (s.docoEventMap.has(key)) return
      let eventTarget = targetFn ? targetFn(comp) : comp
      let cbk = get(comp, fnName) as Function
      let handler = cbk && (get(globalThis, cbk.name) !== cbk) ? cbk.bind(comp) : cbk
      registerEvent(comp, name, handler, eventTarget)
      s.docoEventMap.set(key, handler)
    })
  }
}

/**
 * 匹配组件声明的 emit 事件（精确名或 'update:*' 通配符），沿继承链向上查找
 */
export function matchEmit(ctor: Function, evName: string): boolean {
  let c: Function | undefined = ctor
  while (c && c !== CompElem) {
    let set = DefinitionCompEmitMap.get(c)
    if (set) {
      if (set.has(evName)) return true
      for (let n of set) {
        if (n.endsWith(':*') && evName.startsWith(n.slice(0, -1))) return true
      }
    }
    c = _getSuper(c as any)
  }
  return false
}

export function emitEvent(comp: CompElem, evSrc: number, evName: string, arg: Record<string, any>) {
  let evMap = comp._subComponentEventMap.get(evSrc)
  let evFn = get(evMap, evName)
  if (isFunction(evFn)) evFn.call(comp, arg)
}

/**
 * 统一注册入口（组件事件不代理 / 扩展事件全局 / 委托或独立监听）
 * @param fullName 事件全名，含修饰符，如 "click.stop.prevent"
 * @param cbk 回调（已绑定 this）
 * @param node 目标节点（Element | Window | Document）
 */
export function registerEvent(comp: CompElem<any>, fullName: string, cbk: EvHadler, node: Element | Window | Document) {
  let { evName, parts } = parseEventName(fullName)

  //1. 组件事件（不代理）
  if (node instanceof Element) {
    let ctor = DefinitionComponentMap[node.tagName?.toLowerCase()]
    if (ctor) {
      let declared = matchEmit(ctor, evName)
      if (declared) {
        addEmitEvent(node, comp, evName, wrapControlFn(cbk, parts))
        return
      }
    }
  }

  //2. 扩展事件（全局注册，unbinder 进释放列表）
  if (isExtEvent(evName)) {
    let unbinder = addExtEvent(evName, node as Element, wrapControlFn(cbk, parts), parts, comp, parts.includes('once'))
    if (unbinder) getState(comp).releaseList.push(unbinder)
    return
  }

  //3. 委托判定：renderRoot 存在 + 节点在渲染树内 + 事件可委托
  let delegate = isInRenderTree(comp, node)
    && !ELEMENT_EVENTS.has(evName)
    && !NO_DELEGATE_EVENTS.has(evName)

  if (delegate) {
    //显式 .capture 修饰符优先于分类默认
    let capture = parts.includes('capture') || CAPTURE_EVENTS.has(evName)
    registerDelegation(comp, evName, cbk, parts, node as Element, capture)
  } else {
    registerElementEvent(comp, evName, cbk, parts, node)
  }
}

function isInRenderTree(comp: CompElem<any>, node: Element | Window | Document): boolean {
  if (!(node instanceof Element)) return false
  let root = comp.renderRoot as HTMLElement | undefined
  if (!root) return false
  return node === root || root.contains(node)
}

function registerDelegation(comp: CompElem<any>, evName: string, cbk: EvHadler, parts: string[], node: Element, capture: boolean) {
  if (!ensureDelegationListener(comp, evName, capture)) {
    //防御降级（正常流程 isInRenderTree 已保证可委托）
    registerElementEvent(comp, evName, cbk, parts, node)
    return
  }
  let { handler } = applyEventModifiers(cbk, parts, true)
  let s = getState(comp)
  let map = s.handlerMap.get(node)
  if (!map) {
    map = new Map()
    s.handlerMap.set(node, map)
  }
  let entries = map.get(evName)
  if (!entries) {
    entries = []
    map.set(evName, entries)
  }
  entries.push({ handler, parts })
}

/**
 * 懒挂载委托监听：首次注册某事件类型时在 renderRoot 上挂载
 * @returns 挂载成功
 */
function ensureDelegationListener(comp: CompElem<any>, evName: string, capture: boolean): boolean {
  let root = comp.renderRoot as HTMLElement | undefined
  if (!root) return false
  initEventHandlers(comp)
  let s = getState(comp)
  let key = (capture ? 'c:' : 'b:') + evName
  if (s.delegationKeySet.has(key)) return true
  root.addEventListener(evName, s.dispatch, { capture, signal: s.abortController!.signal })
  s.delegationKeySet.add(key)
  return true
}

function registerElementEvent(comp: CompElem<any>, evName: string, cbk: EvHadler, parts: string[], node: Element | Window | Document) {
  initEventHandlers(comp)
  let { handler, options } = applyEventModifiers(cbk, parts)
    ; (node as EventTarget).addEventListener(evName, handler, {
      capture: options.capture,
      once: options.once,
      passive: options.passive,
      signal: getState(comp).abortController!.signal
    })
}

function dispatchDelegated(comp: CompElem<any>, e: Event) {
  let root = comp.renderRoot as HTMLElement | undefined
  if (!root) return
  let type = e.type

  const path = e.composedPath()
  let endIndex = path.indexOf(root)
  if (endIndex < 0)//异常
    return
  let s = getState(comp)
  outer: for (let pi = 0; pi <= endIndex; pi++) {
    const el = path[pi];
    if (!(el instanceof HTMLElement)) continue
    let entries = s.handlerMap.get(el)?.get(type)!
    if (isEmpty(entries)) continue

    for (let i = 0; i < entries.length; i++) {
      let entry = entries[i]
      if (entry.parts.includes('self') && e.target !== el) continue
      if (entry.parts.includes('once')) {
        entries.splice(i, 1)
        i--
        if (entries.length < 1) s.handlerMap.get(el)?.delete(type)
      }
      entry.handler(e)

      if (entry.parts.includes('stop')) break outer
    }
  }
}

export function releaseEventHandlers(comp: CompElem<any>) {
  let s = getState(comp)
  s.abortController?.abort()
  s.abortController = undefined
  each(s.releaseList, (fn) => {
    if (typeof fn === 'function') fn(true)
  })
  s.releaseList = []
  s.docoEventMap.clear()
  s.handlerMap = new WeakMap()
  s.delegationKeySet.clear()
  s.bindList.length = 0
}
