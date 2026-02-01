/**
 * 用于提供全局state状态管理
 * @author holyhigh2
 */

import { concat, get, initial, isArray, isEmpty, isFunction, isObject, isSymbol, last, startsWith } from "myfx";
import { CompElem } from "./CompElem";
import { CollectorType, DecoratorKey } from "./constants";
import { PropOption } from "./decorators/prop";
import { StateOption } from "./decorators/state";
import { Getter, PATH_SEPARATOR, Updater } from "./types";
import { _toUpdatePath, showWarn } from "./utils";

const EVENT_UPDATE = 'update'

export const Collector = {
  collectWatch(comp: CompElem, updater: Getter, subPath: string) {
    let collectVarMap = WATCH_MAP.get(comp)
    if (!collectVarMap) {
      collectVarMap = {}
      WATCH_MAP.set(comp, collectVarMap)
    }
    let list = collectVarMap![subPath]
    if (!list) list = collectVarMap![subPath] = []
    list.push(updater);
  },
  startCollect(comp: CompElem, type: CollectorType) {
    this.__collectType = type;
    this.__collecting = comp;
  },
  setUpdater(updater: Getter) {
    this.__updater = updater;
  },
  endCollect() {
    this.__collecting = null;
  },
  //仅用于指令在构造时获取
  __directiveQ: [] as any[][],
  setDirectiveQ(val: any[]) {
    let lastVar = last<Array<string>>(this.__directiveQ)
    const vj = val ? val.join(',') : ''
    const lj = lastVar ? lastVar.join(',') : ''
    if (lastVar && vj === lj) return;
    if (lastVar && lastVar.length < val.length && startsWith(vj, lj)) {
      this.__directiveQ[this.__directiveQ.length - 1] = val
      return;
    }

    this.__directiveQ.push(val)
  },
  popDirectiveQ() {
    let rs = concat(this.__directiveQ)
    this.__directiveQ = [];
    return rs;
  },
  startRender(context: Node) {
    this.__renderCollecting = true;
    this.__renderContext = context;
  },
  endRender(component: CompElem) {
    //注册依赖
    this.__renderCollection.forEach((varPath: string) => {
      component._regDeps(varPath, this.__renderContext)
    })
    this.__renderCollection.clear();

    this.__renderCollecting = false;
    this.__renderContext = null;
  },
  collect(prop: string) {
    this.__renderCollection.add(prop)
  },
  clear() {
    this.__directiveQ = []
  },
  __updater: null,
  __collecting: null,
  __collectType: -1,
  __renderCollection: new Set<string>(),
  __renderContext: null,
  __renderCollecting: false,
  __skipCheck: false
}

interface MetaData {
  //对象声明位置
  from: CompElem,
  //相关联的上下文列表
  contextSet: Set<CompElem>,
  //同一个对象在不同组件中的变量路径. ****======***** 同一个对象，在同一个组件中只能保留最后一个路径，多个路径会警告 
  pathMap: WeakMap<any, Array<string>>
}
const OBJECT_META_DATA = new WeakMap<any, MetaData>()
export const OBJECT_VAR_PATH = new WeakMap<any, Array<string>>()

//存储每个组件的computed/css/watch依赖
const COMPUTED_MAP = new WeakMap<CompElem, Record<string, Getter[] | null>>()
const CSS_MAP = new WeakMap<CompElem, Record<string, Getter[] | null>>()
const WATCH_MAP = new WeakMap<CompElem, Record<string, Getter[] | null>>()
//缓存已经创建的proxy对象
const PROXY_MAP = new WeakMap<Record<string, any>, ProxyConstructor>()

/**
 * @param obj 
 * @param context 
 * @returns 
 */
export function reactive(obj: Record<string, any>, context: any): ProxyConstructor {
  if (!isObject(obj)) return obj;
  if (PROXY_MAP.has(obj)) return PROXY_MAP.get(obj)!
  if (OBJECT_META_DATA.has(obj)) return obj as ProxyConstructor

  const proxyObject = new Proxy(obj, {
    get(target: any, prop: string, receiver: any): any {
      if (!prop) return undefined;
      const value = Reflect.get(target, prop, receiver);
      if (isSymbol(prop)) return value
      if (isFunction(value)) return value
      if (prop === 'length' && isArray(target)) return value

      let chain = OBJECT_VAR_PATH.get(receiver) ?? []
      let subChain = concat(chain, [prop])
      let hasProp = prop in target
      if ((Collector.__renderCollecting || Collector.__collecting) && ((hasProp && target.hasOwnProperty(prop)) || !hasProp)) {
        let subChainStr = subChain.join(PATH_SEPARATOR)
        if (Collector.__renderCollecting) {
          Collector.collect(_toUpdatePath(subChain))
          Collector.setDirectiveQ(subChain)
        } else if (Collector.__collecting) {
          let collectVarMap;
          switch (Collector.__collectType) {
            case CollectorType.COMPUTED:
              collectVarMap = COMPUTED_MAP.get(Collector.__collecting)
              if (!collectVarMap) {
                collectVarMap = {}
                COMPUTED_MAP.set(Collector.__collecting, collectVarMap)
              }
              break;
            case CollectorType.CSS:
              collectVarMap = CSS_MAP.get(Collector.__collecting)
              if (!collectVarMap) {
                collectVarMap = {}
                CSS_MAP.set(Collector.__collecting, collectVarMap)
              }
              break;
          }
          let list = collectVarMap![subChainStr]
          if (!list) list = collectVarMap![subChainStr] = []
          list.push(Collector.__updater!);
        }
      }
      const meta = OBJECT_META_DATA.get(receiver)!
      let sourceContext = meta.from

      if (PROXY_MAP.has(value)) return PROXY_MAP.get(value)

      let stateDefs = get<Record<string, StateOption>>(sourceContext.constructor, DecoratorKey.STATES)
      let shallowDef = get<Record<string, any>>(stateDefs, [subChain[0]])
      if (!shallowDef) {
        let propDefs = get<Record<string, PropOption>>(sourceContext.constructor, DecoratorKey.PROPS)
        shallowDef = get<Record<string, any>>(propDefs, [subChain[0]])
      }

      if (!shallowDef) return value;
      let shallow = get<boolean>(shallowDef, 'shallow')
      if (shallow && subChain.length > 1) return value

      let reactiveVal = value
      if (isObject(value) && !isFunction(value) && !(value instanceof Node) && !Object.isFrozen(value)) {
        let pathMap = meta.pathMap
        let deps = meta.contextSet!

        deps.forEach(dep => {
          let pathAry = pathMap?.get(dep)
          if (!pathAry) return

          reactiveVal = reactive(value, dep)

          PROXY_MAP.set(value, reactiveVal)

          if (!OBJECT_VAR_PATH.has(reactiveVal))
            OBJECT_VAR_PATH.set(reactiveVal, subChain)
        })
      }

      return reactiveVal;
    },
    set(target: any, prop: string, newValue: any, receiver: any) {
      if (!prop) return false;
      if (!context.isMounted) {
        let rs = Reflect.set(target, prop, newValue);
        return rs;
      }

      let ov = target[prop];

      let chain = OBJECT_VAR_PATH.get(receiver) ?? []
      let subChain = concat(chain, [prop])
      let propDefs = get<Record<string, PropOption>>(context.constructor, DecoratorKey.PROPS)
      let stateDefs = get<Record<string, StateOption>>(context.constructor, DecoratorKey.STATES)
      let hasChanged = get<Function>(propDefs, [subChain[0], 'hasChanged']) || get<Function>(stateDefs, [subChain[0], 'hasChanged'])
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

      if (propDefs && propDefs[prop] && target.__isData) {
        if (propDefs[prop].sync) {
          context.emit(EVENT_UPDATE + ":" + prop, { value: newValue })
        }
      }

      //get oldValue from sourceContext
      let nv: any = newValue;

      let rs = Reflect.set(target, prop, nv);

      notifyUpdate(context, rootObjOld, subChain, newValue, ov)

      return rs;
    }
  });

  let chain = OBJECT_VAR_PATH.get(obj) ?? []
  if (Object.isExtensible(obj) && !OBJECT_META_DATA.get(proxyObject)) {
    let contextSet = new Set<any>();
    contextSet.add(context);
    //对象所属context
    let pathMap = new WeakMap();
    pathMap.set(context, chain)
    OBJECT_META_DATA.set(proxyObject, {
      from: context,
      contextSet,
      pathMap
    })
  } else {
    let deps = OBJECT_META_DATA.get(proxyObject)!.contextSet
    deps.add(context);
    let pathMap = OBJECT_META_DATA.get(proxyObject)!.pathMap
    let chains = pathMap.get(context);

    let subChain = concat(chain)
    if (chains && chains.join('') !== subChain.join('')) {
      let parentVar = get(context, initial(chains))
      //处理数组元素更新，如 ary.1 -> ary.0
      if (!isArray(parentVar)) {
        showWarn(`The object is referenced by more than one @state '${subChain.join('.')},${chains.join('.')}'`)
      }
      chains = subChain
    } else {
      pathMap.set(context, subChain)
    }
  }

  PROXY_MAP.set(obj, proxyObject)

  return proxyObject
}
export function notifyUpdate(context: CompElem, oldValue: any, path: string[], subNewValue?: any, subOldValue?: any) {
  //computed
  let computedMap = COMPUTED_MAP.get(context)!
  //css
  let cssMap = CSS_MAP.get(context)!
  //watch
  let watchMap = WATCH_MAP.get(context)

  //recur path
  if (computedMap || cssMap || watchMap) {
    let i = path.length
    while (i) {
      let subPath = path.slice(0, i).join(PATH_SEPARATOR)
      if (watchMap) {
        const watchList = watchMap[subPath]
        if (i === path.length) {
          watchList?.forEach((wk) => {
            let updater = wk()
            updater.oldValue = oldValue
            updater.subNewValue = subNewValue
            updater.subOldValue = subOldValue
            updater.path = path
            Queue.pushWatch(updater)
          })
        } else {
          watchList?.forEach((wk) => {
            let updater = wk()
            if (get(updater, 'deep')) {
              updater.oldValue = oldValue
              updater.subNewValue = subNewValue
              updater.subOldValue = subOldValue
              updater.path = path
              Queue.pushWatch(updater)
            }
          })
        }
      }
      if (computedMap) {
        let computedList = computedMap[subPath]!
        if (!isEmpty(computedList)) {
          for (let l = 0; l < computedList.length; l++) {
            const updater = computedList[l];
            Queue.pushComputed(updater)
          }
        }
      }
      if (cssMap) {
        let computedCssList = cssMap[subPath]!
        if (!isEmpty(computedCssList)) {
          for (let l = 0; l < computedCssList.length; l++) {
            const updater = computedCssList[l];
            Queue.pushCss(updater)
          }
        }
      }

      i--;
    }
  }

  let updater = context._notify(oldValue, path);
  Queue.pushNext(updater, context.cid)
}

const QMap = new Map()
export class Queue {
  static watchSet = new Set<Updater>()
  static computedSet = new Set<Updater>()
  static cssSet = new Set<Updater>()
  static nextSet = new Set<Updater>()
  static nextPending = false;
  static next: () => void;

  static flush() {
    Queue.nextPending = false
    let wq = Array.from(Queue.watchSet)
    Queue.watchSet.clear()
    let cq = Array.from(Queue.computedSet)
    Queue.computedSet.clear()
    let sq = Array.from(Queue.cssSet)
    Queue.cssSet.clear()
    let nq = Array.from(Queue.nextSet)
    Queue.nextSet.clear()

    QMap.clear()

    wq.forEach(u => u(get(u, 'path'), get(u, 'oldValue'), get(u, 'subNewValue'), get(u, 'subOldValue')))
    cq.forEach(u => u())
    sq.forEach(u => u())
    nq.forEach(u => u())
  }

  static pushWatch(updater: Getter) {
    Queue.watchSet.add(updater)
  }
  static pushComputed(updater: Getter) {
    Queue.computedSet.add(updater)
  }
  static pushCss(updater: Getter) {
    Queue.cssSet.add(updater)
  }
  static pushNext(updater: () => void, key?: string | number) {
    if (key) {
      if (QMap.has(key)) {
        return
      }
      QMap.set(key, updater)
    }

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