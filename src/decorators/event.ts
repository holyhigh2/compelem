import { cloneDeep, has, isEmpty } from "myfx";
import { CompElem } from "../CompElem";

/**
 * 事件选项
 */
export type EventOption = {
  /**
   * 事件绑定目标，默认document
   */
  target?: Object | ((comp?: CompElem) => HTMLElement),
  /**
   * 是否深度监控
   */
  capture?: boolean,
  /**
   * 是否仅执行一次
   */
  once?: boolean
  passive?: boolean
}

/**
 * 绑定非视图事件，如window/document等
 * @param eventName 事件名
 * @param immediate 立即执行
 * @param deep 深度监控
 */
export function event(eventName: string, options?: EventOption) {
  return (target: any, name: string, descriptor: PropertyDescriptor) => {
    if (!has(target.constructor, '__deco_events')) {
      target.constructor.__deco_events = isEmpty(target.constructor.__deco_events) ? [] : cloneDeep(target.constructor.__deco_events)
    }

    target.constructor.__deco_events.push({ name: eventName, options, fn: target[name] })
  };
}