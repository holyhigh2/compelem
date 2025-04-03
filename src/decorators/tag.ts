import { CompElem } from "../CompElem";

/**
 * class用注解，用于自动注册自定义组件
 * @param name 自定义组件名称
 */
export function tag(name: string) {
  return (target: typeof CompElem) => {
    if (target) {
      //attrChange
      if (target.prototype.hasOwnProperty('attributeChangedCallback')) {
        let cbk = target.prototype.attributeChangedCallback
        target.prototype.attributeChangedCallback = function (name: any, oldValue: any, newValue: any) {
          CompElem.prototype.attributeChangedCallback.call(this, name, oldValue, newValue)
          cbk.call(this, name, oldValue, newValue)
        }
      }
      //connectedCallback
      if (target.prototype.hasOwnProperty('connectedCallback')) {
        let cbk = target.prototype.connectedCallback
        target.prototype.connectedCallback = function () {
          CompElem.prototype.connectedCallback.call(this)
          cbk.call(this)
        }
      }
      //disconnectedCallback
      if (target.prototype.hasOwnProperty('disconnectedCallback')) {
        let cbk = target.prototype.disconnectedCallback
        target.prototype.disconnectedCallback = function () {
          CompElem.prototype.disconnectedCallback.call(this)
          cbk.call(this)
        }
      }
      customElements.define(name, target as any)
    }
  };
}