import { CompElem } from "../CompElem";

/**
 * class用注解，用于自动注册自定义组件
 * @param name 自定义组件名称
 */
export function tag(name: string) {
  return (target: typeof CompElem) => {
    if (target) {
      customElements.define(name, target as any)
    }
  };
}