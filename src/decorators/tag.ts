import { CompElem } from "../CompElem";
import { DefinitionComponentMap, DefinitionTagMap } from "../constants";

/**
 * class用注解，用于自动注册自定义组件
 * @param name 自定义组件名称
 * @param immediate 立即注册，默认false
 */
export function tag(name: string, immediate = false) {
  return (target: typeof CompElem<any>) => {
    if (target) {
      if (immediate) {
        customElements.define(name, target)
      } else {
        DefinitionTagMap[target.name] = name
        DefinitionComponentMap[name] = target
      }
    }
  };
}