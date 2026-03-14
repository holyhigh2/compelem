/**
 * 用于提供全局state状态管理
 * @author holyhigh2
 */

import { concat, eachRight, get, isArray, isFunction, isObject, isSymbol, size, slice, startsWith, toArray } from "myfx";
import { CompElem } from "./CompElem";
import { ComputedUpdateDepsMap, CssUpdateDepsMap, DATA_KEY, HasChangedPropOrStateMap, PROP_NAME_SLOTS, PropSyncKeySetMap, StateShallowKeySetMap, WatchDeepUpdateMap, WatchKeysDeepListMap, WatchKeysListMap, WatchKeysOnceMap, WatchUpdateMap } from "./constants";
import { UpdatePoint, Updater } from "./types";
import { _getSuper } from "./utils";


export function getterValue(getter: Function | undefined, propertyKey: string, context: CompElem) {
  let thisHost = context
  let v = getter ? getter.call(thisHost) : Reflect.get(thisHost[DATA_KEY], propertyKey)

  if (Collector.__collecting) {
    Collector.__varPathList.push(propertyKey)
  }
  if (PROXY_MAP.has(v)) {
    let contextList = EXTRA_CONTEXT_OF_VAR.get(v)
    if (!contextList) {
      contextList = new Set()
      EXTRA_CONTEXT_OF_VAR.set(v, contextList)
    }
    contextList.add(thisHost.__thisRef)
    return PROXY_MAP.get(v)!
  }

  if (isObject(v) && !isFunction(v) && !(v instanceof Node) && !Object.isFrozen(v)) {
    let keySet = StateShallowKeySetMap.get(thisHost.constructor)
    let shallow = keySet?.has(propertyKey)
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
  if (hasChanged) {
    if (!hasChanged.call(thisHost, v, oldValue, [propertyKey], v, oldValue)) return true;
  } else {
    //默认对比算法
    if (Object.is(oldValue, v)) {
      return true;
    }
  }

  //check watch
  requestWatchUpdate(thisHost, v, oldValue, propertyKey)

  //check computed
  requestComputedUpdate(thisHost, propertyKey)

  //check css
  requestCssUpdate(thisHost, propertyKey)

  Reflect.set(thisHost[DATA_KEY], propertyKey, v);

  thisHost._notify(oldValue, [propertyKey])

  //update sync
  let syncKeySet = PropSyncKeySetMap.get(thisHost.constructor)
  if (syncKeySet?.has(propertyKey)) {
    thisHost.emit('update' + ":" + propertyKey, { value: v })
  }
}

function requestWatchUpdate(context: CompElem, newValue: any, oldValue: any, fullPath: string, rootObjNew?: any, rootObjOld?: any) {
  let superComp = _getSuper(context.constructor as any)
  let watchKeys = WatchKeysListMap.get(context.constructor) ?? WatchKeysListMap.get(superComp)
  let watchKeysDeep = WatchKeysDeepListMap.get(context.constructor) ?? WatchKeysDeepListMap.get(superComp)
  let watchDeepUpdateMap = WatchDeepUpdateMap.get(context.constructor) ?? WatchDeepUpdateMap.get(superComp)!
  let watchUpdateMap = WatchUpdateMap.get(context.constructor) ?? WatchUpdateMap.get(superComp)!
  let onceMap = WatchKeysOnceMap.get(context.constructor) ?? WatchKeysOnceMap.get(superComp)!

  watchKeys?.forEach(wk => {
    if (fullPath === wk ||
      (startsWith(wk, fullPath + '.') && !Object.is(get(context._getPrivateData(), wk), get(newValue, wk))) ||
      (startsWith(fullPath, wk + '.') && watchKeysDeep?.includes(wk) && !Object.is(get(context._getPrivateData(), wk), get(newValue, wk)))
    ) {
      concat(toArray(watchUpdateMap[wk]), toArray(watchDeepUpdateMap[wk])).forEach(fn => {
        if (!fn) return
        if (onceMap.get(wk) === true) return
        context._watchUpdateArgsInNextTick.set(fn, {
          newValue, oldValue, chain: fullPath.split('.'), rootObjNew, rootObjOld, fullMatch: wk === fullPath
        })
        context._watchUpdateSetInNextTick.add(fn)
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

export const Collector = {
  popDirectiveQ() {
    let rs: string[] = this.__varPathList.reduceRight((acc: string[], p: string) => {
      if (!acc.includes(p)) {
        acc.unshift(p);
      }
      return acc;
    }, [])
    return rs;
  },
  start() {
    this.__collecting = true;
    this.__varPathList = []
  },
  end(renderComponent?: CompElem, up?: UpdatePoint) {
    if (renderComponent && up) {
      renderComponent._regSubViewDeps(Collector.popVarPathList(), up)
    }
    this.__collecting = false;
  },
  popVarPathList() {
    let rs: string[] = Array.from(new Set(this.__varPathList))
    this.__varPathList = [];
    return rs;
  },
  __varPathList: [] as string[],
  __collecting: false,
}

//对象值在不同上下文的根路径
const OBJECT_VAR_ROOT_PATH_IN_CONTEXT = new WeakMap<CompElem<any>, WeakMap<ProxyConstructor, string>>()
export const OBJECT_VAR_PATH = new WeakMap<any, Array<string>>()
//缓存已经创建的proxy对象
export const PROXY_MAP = new WeakMap<Record<string, any>, ProxyConstructor>()
//对象值的创建上下文
const OBJECT_VAR_ROOT_CONTEXT = new WeakMap<any, CompElem<any>>()
//上级对象所在的扩展context
export const EXTRA_CONTEXT_OF_VAR = new WeakMap<any, Set<WeakRef<CompElem<any>>>>()

export function reactive(obj: Record<string, any>, context: CompElem<any>, rootProp?: string): ProxyConstructor {
  if (PROXY_MAP.has(obj)) return PROXY_MAP.get(obj)!
  if (OBJECT_VAR_ROOT_CONTEXT.has(obj)) {
    if (rootProp) {
      let pathMap = OBJECT_VAR_ROOT_PATH_IN_CONTEXT.get(context)
      if (!pathMap) {
        pathMap = new WeakMap()
        OBJECT_VAR_ROOT_PATH_IN_CONTEXT.set(context, pathMap)
      }
      pathMap.set(obj as ProxyConstructor, rootProp)

      let contextList = EXTRA_CONTEXT_OF_VAR.get(obj)
      if (!contextList) {
        contextList = new Set()
        EXTRA_CONTEXT_OF_VAR.set(obj, contextList)
      }
      if (!contextList.values().some(v => v.deref() === context)) {
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
      if (isFunction(value)) return value
      if (prop === 'length' && isArray(target)) return value

      if (Collector.__collecting) {
        let supPath = OBJECT_VAR_PATH.has(receiver) ? concat(OBJECT_VAR_PATH.get(receiver)) : []
        supPath.push(prop)
        let propPath = supPath.join('.')
        Collector.__varPathList.push(propPath)
      }

      if (PROXY_MAP.has(value)) return PROXY_MAP.get(value)

      let reactiveVal = value
      if (isObject(value) && !isFunction(value) && !(value instanceof Node) && !Object.isFrozen(value)) {

        reactiveVal = reactive(value, context)

        let supPath = OBJECT_VAR_PATH.has(receiver) ? concat(OBJECT_VAR_PATH.get(receiver)) : []
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

      let extraContext = EXTRA_CONTEXT_OF_VAR.get(receiver)

      let k = subChain.join('.')
      //check watch
      requestWatchUpdate(context, nv, ov, k, rootObjNew, rootObjOld)
      //check computed
      requestComputedUpdate(context, k)
      //check css
      requestCssUpdate(context, k)

      notifyUpdate(context, rootObjOld, subChain, nv, ov)

      extraContext?.forEach(ctxRef => {
        let ctx = ctxRef.deref()
        if (!ctx) return

        let ctxRootPath = ctx._wrapperProp[subChain[0]]
        let ck = subChain.join('.')
        ck = ck.replace(subChain[0], ctxRootPath)
        //check watch
        requestWatchUpdate(ctx, nv, ov, ck)
        //check computed
        requestComputedUpdate(ctx, ck)
        //check css
        requestCssUpdate(ctx, ck)

        notifyUpdate(ctx, rootObjOld, ck.split('.'), nv, ov)
      })

      return rs;
    }
  });

  if (!OBJECT_VAR_PATH.has(proxyObject)) {
    OBJECT_VAR_PATH.set(proxyObject, rootProp ? [rootProp] : [])
  }

  PROXY_MAP.set(obj, proxyObject)
  if (rootProp) {
    OBJECT_VAR_ROOT_CONTEXT.set(proxyObject, context)
    if (!OBJECT_VAR_ROOT_PATH_IN_CONTEXT.has(context)) {
      let pathMap = new WeakMap()
      pathMap.set(proxyObject, rootProp)
      OBJECT_VAR_ROOT_PATH_IN_CONTEXT.set(context, pathMap)
    }
  }

  return proxyObject
}

export function notifyUpdate(context: CompElem, oldValue: any, path: string[], subNewValue?: any, subOldValue?: any) {
  let i = size(path)
  eachRight(path, (p) => {
    let varPath = slice<string>(path, 0, i--)
    context._notify(oldValue, varPath)
  })
}

const QMap = new Map()
export class Queue {
  static nextSet = new Set<Updater>()
  static nextPending = false;
  static next: () => void;

  static flush() {
    Queue.nextPending = false

    let nq = Array.from(Queue.nextSet)
    Queue.nextSet.clear()
    QMap.clear()
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