import { assign, get, isArray } from "myfx";
import { WatchDeepUpdateMap, WatchImmediateListMap, WatchKeysDeepListMap, WatchKeysListMap, WatchKeysOnceMap, WatchUpdateMap } from "../constants";
import { WatchOptions } from "../types";
import { _getSuper } from "../utils";

/**
 * 监控prop/state变量值变化
 * @param source 变量路径支持多级路径
 * @param options 
 * @returns 
 */
export function watch(source: string | string[], options?: WatchOptions): (target: any, name: any) => void {
  return (target: any, name: string) => {
    let watchDeepUpdateMap = WatchDeepUpdateMap.get(target.constructor)!
    let watchUpdateMap = WatchUpdateMap.get(target.constructor)!
    let onceMap = WatchKeysOnceMap.get(target.constructor)!
    let watchKeysDeep = WatchKeysDeepListMap.get(target.constructor)!
    let watchKeys = WatchKeysListMap.get(target.constructor)
    let watchImmediateList = WatchImmediateListMap.get(target.constructor)!
    if (!watchKeys) {
      watchKeys = []
      WatchKeysListMap.set(target.constructor, watchKeys)
      watchKeysDeep = []
      WatchKeysDeepListMap.set(target.constructor, watchKeysDeep)

      onceMap = new Map()
      WatchKeysOnceMap.set(target.constructor, onceMap)

      watchDeepUpdateMap = {}
      WatchDeepUpdateMap.set(target.constructor, watchDeepUpdateMap)
      watchUpdateMap = {}
      WatchUpdateMap.set(target.constructor, watchUpdateMap)

      watchImmediateList = {}
      WatchImmediateListMap.set(target.constructor, watchImmediateList)

      let parentCtor = _getSuper(target.constructor)
      while (parentCtor) {
        if (WatchKeysListMap.has(parentCtor)) {
          watchKeys.push(...WatchKeysListMap.get(parentCtor)!)
          watchKeysDeep.push(...WatchKeysDeepListMap.get(parentCtor)!)
          WatchKeysOnceMap.get(parentCtor)?.forEach((v, k) => {
            onceMap.set(k, v)
          })
          assign(watchDeepUpdateMap, WatchDeepUpdateMap.get(parentCtor))
          assign(watchUpdateMap, WatchUpdateMap.get(parentCtor))
          assign(watchImmediateList, WatchImmediateListMap.get(parentCtor))
        }

        parentCtor = _getSuper(parentCtor)
      }
    }

    const sources = isArray(source) ? source : [source]
    sources.forEach(src => {
      let handler = target[name]

      //////////////////////////////
      let onceWatch = get(options, "once", false);
      if (onceWatch) {
        onceMap.set(src, false)
      }
      let deep = get(options, "deep", false);
      watchKeys.push(src)
      if (deep) {
        watchDeepUpdateMap[src] = watchDeepUpdateMap[src] ?? new Set()
        watchDeepUpdateMap[src].add(handler)
        watchKeysDeep.push(src)
      } else {
        watchUpdateMap[src] = watchUpdateMap[src] ?? new Set()
        watchUpdateMap[src].add(handler)
      }

      let immediate = get(options, "immediate", false);
      if (immediate) {
        let handlerSet = watchImmediateList[src]
        if (!handlerSet) {
          handlerSet = watchImmediateList[src] = new Set()
        }
        handlerSet.add(handler)
      }
    })
  }
}


export type WatchHandler = (newValue: any, oldValue: any, source: string, subNewValue?: any, subOldValue?: any) => any;