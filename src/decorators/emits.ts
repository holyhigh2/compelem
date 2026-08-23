import type { CompElem } from "../CompElem";
import { DefinitionCompEmitMap } from "../constants";

/**
 * class用装饰器，声明组件的自定义事件
 * 
 * 支持通配符 'update:*'（匹配 update:value 等）
 * 支持驼峰/短横线格式，但在父组件中监听时，必须使用短横线格式，如 'state-ready'，而不是 'stateReady'
 * 
 * @param eventNames 事件名列表，如 'input'、'change'、'update:*'
 * @example
 *  @emits('input', 'change', 'update:*')
 *  @tag('l-input')
 *  class Input extends CompElem { ... }
 */
export function emits(...eventNames: string[]) {
  return (target: typeof CompElem<any>) => {
    let set = DefinitionCompEmitMap.get(target)
    if (!set) {
      set = new Set()
      DefinitionCompEmitMap.set(target, set)
    }
    eventNames.forEach(n => set!.add(n))
  }
}
