import { concat } from "myfx";
import { CompElem } from "../CompElem";
import { DefinitionCompEventMap } from "../constants";
import { _getSuper } from "../utils";

/**
 * 绑定非视图事件，如window/document等
 * @param eventName 事件名，含修饰参数。同视图模板中的事件名
 * @param eventTarget 事件绑定目标，默认this
 */
export function event(eventName: string, eventTarget?: (comp?: CompElem) => (HTMLElement | Promise<HTMLElement> | Window)) {
  return (target: any, name: string, descriptor: PropertyDescriptor) => {
    if (!DefinitionCompEventMap.has(target.constructor.name)) {
      let mixinEvents = []
      let parentCtor = target.constructor
      while ((parentCtor = _getSuper(parentCtor)) !== CompElem) {
        mixinEvents = concat(mixinEvents, DefinitionCompEventMap.get(parentCtor.name) ?? [])
      }
      DefinitionCompEventMap.set(target.constructor.name, mixinEvents)
    }

    DefinitionCompEventMap.get(target.constructor.name)?.push({ name: eventName, targetFn: eventTarget, fnName: name })
  };
}