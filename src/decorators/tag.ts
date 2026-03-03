import { CompElem } from "../CompElem";
import { DefinitionTagMap } from "../constants";

/**
 * class用注解，用于自动注册自定义组件
 * @param name 自定义组件名称
 */
export function tag(name: string) {
  return (target: typeof CompElem<any>) => {
    if (target) {
      DefinitionTagMap[target.name] = name
      customElements.define(name, target as any)
    }
  };
}