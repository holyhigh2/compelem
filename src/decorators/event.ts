import { cloneDeep, has, isEmpty } from "myfx";
import { CompElem } from "../CompElem";
import { DecoratorKey } from "../constants";

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
    if (!has(target.constructor, DecoratorKey.EVENTS)) {
      target.constructor[DecoratorKey.EVENTS] = isEmpty(target.constructor[DecoratorKey.EVENTS]) ? [] : cloneDeep(target.constructor[DecoratorKey.EVENTS])
    }

    target.constructor[DecoratorKey.EVENTS].push({ name: eventName, options, fn: target[name] })
  };
}