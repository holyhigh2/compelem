import { CompElem } from "../CompElem";
import { DefinitionComponentMap, DefinitionTagMap } from "../constants";

/**
 * class装饰器：注册自定义元素，可选立即 define
 * @param name 自定义元素名
 * @param immediate 立即 define，默认 false
 */
export function tag(name: string, immediate = false) {
  return (target: typeof CompElem<any>) => {
    if (target) {
      DefinitionTagMap[target.name] = name
      DefinitionComponentMap[name] = target
      if (immediate) {
        if (!customElements.get(name)) customElements.define(name, target)
      }
    }
  }
}