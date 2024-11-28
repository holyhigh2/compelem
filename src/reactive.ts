/**
 * 用于提供全局state状态管理
 * @author holyhigh2
 */

import { clone, concat, get, includes, initial, isArray, isElement, isEqual, isFunction, isObject, last, startsWith } from "myfx";
import { CompElem } from "./CompElem";
import { PropOption } from "./decorators/prop";
import { StateOption } from "./decorators/state";
import { IRenderContext } from "./render/RenderContext";
import { Getter } from "./types";
import { _toUpdatePath, showWarn } from "./utils";

const EVENT_UPDATE = 'update'

export const Collector = {
  startCss(comp: CompElem) {
    this.__cssCollecting = comp;
  },
  endCss() {
    this.__cssCollecting = null;
  },
  setCssUpdater(updater: Getter) {
    this.__cssUpdater = updater;
  },
  startCompute(comp: CompElem) {
    this.__computeCollecting = comp;
  },
  endCompute() {
    this.__computeCollecting = null;
  },
  setComputedProp(updater: Getter) {
    this.__computeUpdater = updater;
  },
  __computeCollecting: null,
  __computeUpdater: null,
  __cssCollecting: null,
  __cssUpdater: null,
  //仅用于指令在构造时获取
  __directiveQ: [] as any[][],
  setDirectiveQ(val: any[]) {
    let lastVar = last<Array<string>>(this.__directiveQ)
    if (lastVar && isEqual(lastVar, val)) return;
    if (lastVar && lastVar.length < val.length && startsWith(val.join(','), lastVar.join(','))) {
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
  startRender(context: IRenderContext) {
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
const OBJECT_VAR_PATH = new WeakMap<any, Array<string>>()
const COMPUTED_MAP = new WeakMap<CompElem, Record<string, Getter[] | null>>()
const CSS_MAP = new WeakMap<CompElem, Record<string, Getter | null>>()

/**
 * 1. 初始化时obj都是普通对象
 * 2. OBJECT_VAR_PATH 首次是普通对象
 * 3. OBJECT_META_DATA 直接绑定代理对象
 * @param obj 
 * @param context 
 * @returns 
 */
export function reactive(obj: Record<string, any>, context: any) {
  if (!isObject(obj)) return obj;

  const proxyObject = obj.__proxy ? obj : new Proxy(obj, {
    get(target: any, prop: string, receiver: any): any {
      if (!prop) return undefined;
      const ks = Object.keys(target)
      const value = Reflect.get(target, prop, receiver);
      if (!includes(ks, prop)) {
        return value;
      }
      if (target.hasOwnProperty(prop)) {
        let chain = OBJECT_VAR_PATH.get(receiver) ?? []
        let subChain = concat(chain, [prop])
        let subChainStr = subChain.join('-')
        if (Collector.__renderCollecting) {
          Collector.collect(_toUpdatePath(subChain))
          Collector.setDirectiveQ(subChain)
        } else if (Collector.__computeCollecting) {
          let watchVarMap = COMPUTED_MAP.get(Collector.__computeCollecting)
          if (!watchVarMap) {
            watchVarMap = {}
            COMPUTED_MAP.set(Collector.__computeCollecting, watchVarMap)
          }
          let list = watchVarMap[subChainStr]
          if (!list) list = watchVarMap[subChainStr] = []
          list.push(Collector.__computeUpdater!);
        } else if (Collector.__cssCollecting) {
          let watchVarMap = CSS_MAP.get(Collector.__cssCollecting)
          if (!watchVarMap) {
            watchVarMap = {}
            CSS_MAP.set(Collector.__cssCollecting, watchVarMap)
          }
          watchVarMap[subChainStr] = Collector.__cssUpdater
        }
      }

      return value;
    },
    set(target: any, prop: string, newValue: any, receiver: any) {
      if (!prop) return false;
      let sourceContext = OBJECT_META_DATA.get(receiver)!.from
      let propDefs = get<Record<string, PropOption>>(sourceContext.constructor, '__deco_props')
      if (propDefs && propDefs[prop] && target.__isData) {
        if (propDefs[prop].sync) {
          sourceContext.emit(EVENT_UPDATE + ":" + prop, { value: newValue })
        }
      }
      let ov = target[prop];

      let stateDefs = get<Record<string, StateOption>>(sourceContext.constructor, '__deco_states')
      let hasChanged = get<Function>(propDefs, [prop, 'hasChanged']) || get<Function>(stateDefs, [prop, 'hasChanged'])
      if (hasChanged) {
        if (!hasChanged.call(sourceContext, newValue, ov)) return false;
      } else {
        //防止重复设置，如Array.length
        if (target[prop] === newValue) return true;
        if (Number.isNaN(newValue) && Number.isNaN(target[prop])) return false;
      }

      //todo 如果对象保存一层副本，如果要保存全部内容需要自行实现
      if (isObject(ov)) {
        ov = clone(ov)
      }

      let deps = OBJECT_META_DATA.get(receiver)?.contextSet!

      //get oldValue from sourceContext
      let chain = OBJECT_VAR_PATH.get(receiver) ?? []
      let subChain = concat(chain, [prop])
      let nv: any = newValue;

      if (isObject(newValue) && !isFunction(newValue) && !isElement(newValue)) {
        deps.forEach(dep => {
          let pathMap = OBJECT_META_DATA.get(receiver)?.pathMap
          let pathAry = pathMap?.get(dep)
          if (!pathAry) return

          subChain = concat(pathAry, [prop])
          OBJECT_VAR_PATH.set(nv, subChain)
          nv = reactive(nv, dep)
          OBJECT_VAR_PATH.set(nv, subChain)
        })
      }

      let rs = Reflect.set(target, prop, nv);

      let pathMap = OBJECT_META_DATA.get(receiver)!.pathMap
      deps.forEach(dep => {
        //view update
        let pathAry = pathMap.get(dep)
        if (!pathAry) return

        //数组length属性变动直接通知为数组自身变动
        subChain = concat(pathAry, prop == 'length' && isArray(receiver) ? [] : [prop])
        dep._notify(ov, subChain);
        let varPath = subChain.join('-')

        //computed
        let watchVarMap = COMPUTED_MAP.get(dep)!
        if (watchVarMap) {
          let computedList = watchVarMap[varPath]
          if (computedList) {
            computedList.forEach(computedGetter => {
              computedGetter.call(dep)
            })
          }
          let i = subChain.length - 1
          while (i) {
            let subPath = subChain.slice(0, i).join('-')
            let computedList = watchVarMap[subPath]
            if (computedList) {
              computedList.forEach(computedGetter => {
                computedGetter.call(dep)
              })
            }

            i--;
          }
        }

        //css
        let cssMap = CSS_MAP.get(dep)!
        if (cssMap) {
          let computedCss = cssMap[varPath]
          if (computedCss) {
            computedCss.call(dep)
          }
          let i = subChain.length - 1
          while (i) {
            let subPath = subChain.slice(0, i).join('-')
            let computedCss = cssMap[subPath]
            if (computedCss) {
              computedCss.call(dep)
            }

            i--;
          }
        }

      });

      return rs;
    }
  });
  if (!obj.__proxy) {
    Object.defineProperty(obj, "__proxy", {
      enumerable: false,
      writable: false,
      configurable: false,
      value: true,
    });
  }

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

  for (let k in obj) {
    const v = obj[k];
    if (isObject(v) && !isFunction(v) && !isElement(v) && !(v instanceof Text)) {
      OBJECT_VAR_PATH.set(v, concat(chain, [k]))
      obj[k] = reactive(v, context);
      OBJECT_VAR_PATH.set(obj[k], concat(chain, [k]))
    }
  }

  return proxyObject
}

