import { cloneDeep, has, isArray, isEmpty } from "myfx";
import { DecoratorKey } from "../constants";
import { PATH_SEPARATOR } from "../types";

/**
 * 监控定义
 */
export type WatchOptions = {
  /**
   * 是否立即执行
   */
  immediate?: boolean,
  /**
   * 是否深度监控
   */
  deep?: boolean,
  /**
   * 是否仅执行一次
   */
  once?: boolean
}
export function watch(source: string | string[], options?: WatchOptions): (target: any, name: any) => void {
  return (target: any, name: string) => {
    if (!has(target.constructor, DecoratorKey.WATCH)) {
      target.constructor[DecoratorKey.WATCH] = isEmpty(target.constructor[DecoratorKey.WATCH]) ? {} : cloneDeep(target.constructor[DecoratorKey.WATCH])
    }

    const sources = isArray(source) ? source : [source]
    sources.forEach(src => {
      let watchKey = src.replaceAll('.', PATH_SEPARATOR)
      let srcList = target.constructor[DecoratorKey.WATCH][watchKey]
      if (!isArray(srcList)) {
        srcList = target.constructor[DecoratorKey.WATCH][watchKey] = []
      }
      srcList.push({ source: src, options, handler: target[name] })
    })
  }
}


export type WatchHandler = (newValue: any, oldValue: any, source: string) => any;