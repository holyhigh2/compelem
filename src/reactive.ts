/**
 * 用于提供全局state状态管理
 * @author holyhigh2
 */

import { concat, get, isArray, isFunction, isObject, isSymbol, some, startsWith, toArray } from "myfx";
import { CompElem } from "./CompElem";
import { CompiledWatchMeta, CompiledWatchMetaMap, ComputedUpdateDepsMap, CssUpdateDepsMap, DATA_KEY, HasChangedPropOrStateMap, PROP_NAME_SLOTS, PropShallowKeySetMap, StateShallowKeySetMap, WatchDeepUpdateMap, WatchKeyRootMap, WatchKeysDeepListMap, WatchKeysOnceMap, WatchUpdateMap } from "./constants";
import { UpdatePoint } from "./render/UpdatePoint";
import { Updater } from "./types";

const CHAR_CODE_UNDERSCORE = 95
export function getterValue(propertyKey: string, context: CompElem) {
  let thisHost = context
  let v = Reflect.get(thisHost[DATA_KEY], propertyKey)

  if (collectorCollecting) {
    collectorVarPathList.push(propertyKey)
  }

  if (v === null || (typeof v !== 'object' && typeof v !== 'function')) {
    return v
  }

  let p = PROXY_MAP.get(v)
  if (p || OBJECT_VAR_ROOT_CONTEXT.get(v)) {
    let contextList = EXTRA_CONTEXT_OF_VAR.get(v)
    if (!contextList) {
      contextList = new Set()
      EXTRA_CONTEXT_OF_VAR.set(v, contextList)
    }
    let rs = p ?? v
    if (OBJECT_VAR_ROOT_CONTEXT.get(rs)?.deref() !== context) {
      let wVkMap = OBJECT_VAR_ROOT_PATH_IN_CONTEXT.get(context)
      if (!wVkMap) {
        wVkMap = {}
        OBJECT_VAR_ROOT_PATH_IN_CONTEXT.set(context, wVkMap)
      }
      let srcPath = OBJECT_VAR_PATH.get(rs)
      if (srcPath)
        wVkMap[srcPath[0]] = propertyKey
    }
    contextList.add(thisHost.__thisRef)
    return rs
  }

  if (isObject(v) && !isFunction(v) && !(v instanceof Node) && !Object.isFrozen(v)) {
    let keySet = StateShallowKeySetMap.get(thisHost.constructor)
    let shallow = keySet?.has(propertyKey)
    if (!shallow) {
      keySet = PropShallowKeySetMap.get(thisHost.constructor)
      shallow = keySet?.has(propertyKey)
    }
    v = shallow || propertyKey === PROP_NAME_SLOTS ? v : reactive(v, thisHost, propertyKey)
  }
  return v
}
export function setterValue(propertyKey: string, v: any, context: CompElem) {
  let thisHost = context
  if (!thisHost.__inited) {
    Reflect.set(thisHost[DATA_KEY], propertyKey, v);
    return
  }
  let oldValue = thisHost[DATA_KEY][propertyKey]
  let stateMap = HasChangedPropOrStateMap.get(thisHost.constructor)
  let hasChanged = stateMap?.get(propertyKey)
  let oldValueProxy = PROXY_MAP.get(oldValue)
  if (hasChanged) {
    if (!hasChanged.call(thisHost, v, oldValue, [propertyKey], v, oldValue)) return true;
  } else {
    //默认对比算法
    if (Object.is(oldValue, v)) {
      return true;
    }
    if (isObject(v) && oldValueProxy === v) {
      return true
    }
  }

  Reflect.set(thisHost[DATA_KEY], propertyKey, v);

  requestUpdate(context, v, oldValue, [propertyKey])
}
export function emitModelEvent(propertyKey: string, v: any, context: CompElem) {
  context.emit('update:' + propertyKey, { value: v })
}

function getWatchMeta(ctor: Function): CompiledWatchMeta | null {
  let meta = CompiledWatchMetaMap.get(ctor)
  if (meta !== undefined) return meta
  let sup = Object.getPrototypeOf(ctor)
  let rootMap = WatchKeyRootMap.get(ctor) ?? WatchKeyRootMap.get(sup)
  meta = rootMap ? {
    rootMap,
    watchKeysDeep: WatchKeysDeepListMap.get(ctor) ?? WatchKeysDeepListMap.get(sup),
    watchDeepUpdateMap: WatchDeepUpdateMap.get(ctor) ?? WatchDeepUpdateMap.get(sup)!,
    watchUpdateMap: WatchUpdateMap.get(ctor) ?? WatchUpdateMap.get(sup)!,
    onceMap: WatchKeysOnceMap.get(ctor) ?? WatchKeysOnceMap.get(sup)!
  } : null
  CompiledWatchMetaMap.set(ctor, meta)
  return meta
}

function requestWatchUpdate(context: CompElem, newValue: any, oldValue: any, fullPath: string, rootObjNew?: any, rootObjOld?: any) {
  let meta = getWatchMeta(context.constructor as any)
  if (!meta) return

  let { rootMap, watchKeysDeep, watchDeepUpdateMap, watchUpdateMap, onceMap } = meta

  let rootKey = fullPath.split('.')[0]
  let candiKeys = rootMap?.get(rootKey)

  candiKeys?.forEach(wk => {
    if (fullPath === wk ||
      (startsWith(wk, fullPath + '.') && !Object.is(get(context._getPrivateData(), wk), get(newValue, wk))) ||
      (startsWith(fullPath, wk + '.') && watchKeysDeep?.includes(wk) && !Object.is(get(context._getPrivateData(), wk), get(newValue, wk)))
    ) {
      concat(toArray(watchUpdateMap[wk]), toArray(watchDeepUpdateMap[wk])).forEach(fn => {
        if (!fn) return
        if (onceMap.get(wk) === true) return
        context._watchUpdateArgsInNextTick?.set(fn, {
          newValue, oldValue, chain: fullPath.split('.'), rootObjNew, rootObjOld, fullMatch: wk === fullPath
        })
        context._watchUpdateSetInNextTick?.add(fn)
        if (onceMap.has(wk))
          onceMap.set(wk, true)
      })
    }
  })
}
function requestComputedUpdate(context: CompElem, fullPath: string) {
  let depMap = ComputedUpdateDepsMap.get(context.constructor)
  if (depMap?.has(fullPath)) {
    depMap.get(fullPath)?.forEach(fn => {
      context._computedUpdateSetInNextTick.add(fn)
    })
  }
}
function requestCssUpdate(context: CompElem, fullPath: string) {
  let deps = CssUpdateDepsMap.get(context.constructor)
  if (!deps) return

  let pathChain = fullPath.split('.')
  let path = ''
  pathChain.forEach(p => {
    path = path ? path + '.' + p : p

    if (deps.has(path)) {
      context._cssUpdateInNextTick = true
    }
  })
}
const seen = new Set<string>()
let collectorVarPathList = [] as string[]
let collectorCollecting = false
let collectorCurrentRenderComponent: CompElem | null = null
export const Collector = {
  popDirectiveQ() {
    let rs: string[] = []

    let list = collectorVarPathList
    for (let i = 0; i < list.length; i++) {
      let p = list[i]
      if (!seen.has(p)) {
        seen.add(p)
        rs.push(p)
      }
    }
    seen.clear()
    return rs;
  },
  start(comp: CompElem<any>) {
    collectorCollecting = true;
    collectorVarPathList = []
    collectorCurrentRenderComponent = comp
  },
  end(renderComponent?: CompElem, up?: UpdatePoint) {
    if (renderComponent && up) {
      renderComponent._regSubViewDeps(Collector.popVarPathList(), up)
    }
    collectorCollecting = false;
    collectorCurrentRenderComponent = null
  },
  popVarPathList() {
    let rs: string[] = Array.from(new Set(collectorVarPathList))
    collectorVarPathList = [];
    return rs;
  },
  getVarPathList() {
    return collectorVarPathList
  },
  isCollection() {
    return collectorCollecting
  }
}
export function getCurrentRenderComponent() {
  return collectorCurrentRenderComponent
}

//对象值在不同上下文的根路径
export const OBJECT_VAR_ROOT_PATH_IN_CONTEXT = new WeakMap<CompElem<any>, Record<string, string>>()
export const OBJECT_VAR_PATH = new WeakMap<any, Array<string>>()
//缓存已经创建的proxy对象
export const PROXY_MAP = new WeakMap<Record<string, any>, ProxyConstructor>()
//对象值的创建上下文
const OBJECT_VAR_ROOT_CONTEXT = new WeakMap<any, WeakRef<CompElem<any>>>()
//上级对象所在的扩展context
export const EXTRA_CONTEXT_OF_VAR = new WeakMap<any, Set<WeakRef<CompElem<any>>>>()

export function reactive(obj: Record<string, any>, context: CompElem<any>, rootProp?: string): ProxyConstructor {
  if (PROXY_MAP.has(obj)) return PROXY_MAP.get(obj)!
  if (OBJECT_VAR_ROOT_CONTEXT.has(obj)) {
    if (rootProp) {
      let contextList = EXTRA_CONTEXT_OF_VAR.get(obj)
      if (!contextList) {
        contextList = new Set()
        EXTRA_CONTEXT_OF_VAR.set(obj, contextList)
      }
      if (!some(contextList.values() as any, (v: WeakRef<any>) => v.deref() === context)) {
        contextList.add(new WeakRef(context))
      }
    }

    return obj as ProxyConstructor
  }
  const proxyObject = new Proxy(obj, {
    get(target: any, prop: string, receiver: any): any {
      if (!prop) return undefined;
      const value = Reflect.get(target, prop, receiver);
      if (isSymbol(prop)) return value
      const isAryTarget = isArray(target)
      if (isFunction(value)) return value
      if (prop === 'length' && isAryTarget) return value
      //ignores private props
      if (prop.charCodeAt(0) === CHAR_CODE_UNDERSCORE && prop.charCodeAt(1) === CHAR_CODE_UNDERSCORE) return value

      let supPathArr = OBJECT_VAR_PATH.get(receiver)

      if (collectorCollecting) {
        let supPath = supPathArr ? concat(supPathArr) : []
        supPath.push(prop)
        collectorVarPathList.push(supPath.join('.'))
      }

      if (value !== null && typeof value === 'object' && PROXY_MAP.has(value)) return PROXY_MAP.get(value)

      let reactiveVal = value
      if (isObject(value) && !isFunction(value) && !(value instanceof Node) && !Object.isFrozen(value)) {
        let supPath = supPathArr ? concat(supPathArr) : []

        reactiveVal = reactive(value, context)
        supPath.push(prop)
        OBJECT_VAR_PATH.set(reactiveVal, supPath)
        PROXY_MAP.set(value, reactiveVal)
      }

      return reactiveVal;
    },
    set(target: any, prop: string, newValue: any, receiver: any) {
      if (!prop) return false;

      let ov = target[prop];

      let chain = OBJECT_VAR_PATH.get(receiver) ?? []
      let subChain = concat(chain, [prop])
      let stateMap = HasChangedPropOrStateMap.get(context.constructor)
      let hasChanged = stateMap?.get(subChain[0])
      let moreThan1 = subChain.length > 1
      let rootObjNew = newValue
      let rootObjOld = ov
      if (moreThan1) {
        rootObjOld = rootObjNew = context._getPrivateData()[subChain[0]]
      }
      if (hasChanged) {
        if (!hasChanged.call(context, rootObjNew, rootObjOld, subChain, newValue, ov)) return true;
      } else {
        //默认对比算法
        if (Object.is(ov, newValue)) {
          return true;
        }
      }

      let nv: any = newValue;

      let rs = Reflect.set(target, prop, nv);

      requestUpdate(context, nv, ov, subChain)

      let extraContext = EXTRA_CONTEXT_OF_VAR.get(receiver)
      let invalidCtxRefs: WeakRef<CompElem<any>>[] = []
      extraContext?.forEach(ctxRef => {
        let ctx = ctxRef.deref()
        if (!ctx) return
        if (ctx === context) return
        if (ctx.isDestroyed) {
          invalidCtxRefs.push(ctxRef)
          return
        }

        let rootPathInCtxMap = OBJECT_VAR_ROOT_PATH_IN_CONTEXT.get(ctx) ?? {}
        let ctxRootPath = rootPathInCtxMap[subChain[0]]
        if (ctxRootPath === undefined) return
        let ck = subChain.join('.')
        ck = ck.replace(subChain[0], ctxRootPath)

        requestUpdate(ctx, nv, ov, ck.split('.'), rootObjNew, rootObjOld)
      })
      invalidCtxRefs.forEach(ctxRef => {
        let ctx = ctxRef.deref()
        OBJECT_VAR_ROOT_PATH_IN_CONTEXT.delete(ctx!)
        extraContext!.delete(ctxRef)
      })

      return rs;
    }
  });

  if (!OBJECT_VAR_PATH.has(proxyObject)) {
    OBJECT_VAR_PATH.set(proxyObject, rootProp ? [rootProp] : [])
  }

  PROXY_MAP.set(obj, proxyObject)
  if (rootProp) {
    OBJECT_VAR_ROOT_CONTEXT.set(proxyObject, new WeakRef(context))
  }

  return proxyObject
}

export function notifyUpdate(context: CompElem<any>, newValue: any, oldValue: any, path: string[], subNewValue?: any, subOldValue?: any) {
  context._notify(newValue, oldValue, path, subNewValue, subOldValue)
}

export function appendUpdate(context: CompElem<any>, nv: any, ov: any, path: string[]) {
  let k = path.join('.')
  requestWatchUpdate(context, nv, ov, k, nv, ov)
  requestComputedUpdate(context, k)
  requestCssUpdate(context, k)
}

export function requestUpdate(context: CompElem<any>, nv: any, ov: any, subChain: string[], rootObjNew?: any, rootObjOld?: any) {
  rootObjNew = rootObjNew ?? nv
  rootObjOld = rootObjOld ?? ov
  if (subChain.length > 1) {
    rootObjOld = rootObjNew = context._getPrivateData()[subChain[0]]
  }
  let k = subChain.join('.')
  requestWatchUpdate(context, nv, ov, k, rootObjNew, rootObjOld)
  //check computed
  requestComputedUpdate(context, k)
  //check css
  requestCssUpdate(context, k)

  notifyUpdate(context, rootObjNew, rootObjOld, subChain, nv, ov)
}

export class Queue {
  static nextSet = new Set<Updater>()
  static nextPending = false;
  static next: () => void;

  static flush() {
    Queue.nextPending = false

    let nq = Array.from(Queue.nextSet)
    Queue.nextSet.clear()
    nq.forEach(u => u())
    nq = null as any
  }

  static pushNext(updater: () => void) {
    Queue.nextSet.add(updater)
    if (!Queue.nextPending) {
      Queue.nextPending = true
      Queue.next()
    }
  }
}
(() => {
  const p = Promise.resolve();
  const nextFn = Queue.flush
  Queue.next = () => {
    p.then(nextFn)
  }
})()