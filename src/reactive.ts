/**
 * 用于提供全局state状态管理
 * @author holyhigh2
 */

import { concat, each, eachRight, isArray, isFunction, isObject, isSymbol, size, slice } from "myfx";
import { CompElem } from "./CompElem";
import { UpdatePoint, Updater } from "./types";

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
export const EXTRA_CONTEXT_OF_VAR = new WeakMap<any, Set<CompElem<any>>>()

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
      contextList.add(context)
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
      let hasChanged = context._hasChangedPropOrStateMap?.get(subChain[0])
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
      context._requestWatchUpdate(nv, ov, k)
      //check computed
      context._requestComputedUpdate(k)

      notifyUpdate(context, rootObjOld, subChain, nv, ov)

      each(extraContext!, ctx => {
        let ctxRootPath = ctx._wrapperProp[subChain[0]]
        let ck = subChain.join('.')
        ck = ck.replace(subChain[0], ctxRootPath)
        //check watch
        ctx._requestWatchUpdate(nv, ov, ck)
        //check computed
        ctx._requestComputedUpdate(ck)

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