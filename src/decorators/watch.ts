import { each, isArray } from "myfx";
import { CompElem } from "../CompElem";
import { DefinitionWatchMap } from "../constants";
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
    if (!DefinitionWatchMap.has(target.constructor.name)) {
      const watchMap: Record<string, Record<string, any>[]> = {}
      let parentCtor = target.constructor
      while ((parentCtor = _getSuper(parentCtor)) !== CompElem) {
        if (DefinitionWatchMap.has(parentCtor.name)) {
          let parentMap = DefinitionWatchMap.get(parentCtor.name)
          each(parentMap!, (list, k) => {
            watchMap[k] = list
          })
        }
      }

      DefinitionWatchMap.set(target.constructor.name, watchMap)
    }

    const sources = isArray(source) ? source : [source]
    sources.forEach(src => {
      let srcList = DefinitionWatchMap.get(target.constructor.name)![src]
      if (!isArray(srcList)) {
        srcList = []
        DefinitionWatchMap.get(target.constructor.name)![src] = srcList
      }
      srcList.push({ source: src, options, handler: target[name] })
    })
  }
}


export type WatchHandler = (newValue: any, oldValue: any, source: string, subNewValue?: any, subOldValue?: any) => any;