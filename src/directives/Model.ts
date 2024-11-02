import { get, isEqual, isObject, last, set, trim } from "myfx";
import { CompElem } from "../CompElem";
import { Directive } from "../directive/Directive";
import { EnterPoint, EnterPointType, directive } from "../directive/index";
import { DirectiveUpdateTag } from "../types";

export const enum ModelTriggerType {
  CHANGE = 'change',
  INPUT = 'input',
}

/**
 * 实现双向绑定（仅支持静态路径，动态增加的属性路径无法识别）
 * 当用于组件时，监控 @update:value 事件
 * 当用于元素时，  
 * - 对于 input/textarea 监控 @input，并设置 value 属性
 * - 对于 checkbox/radio 监控 @change，并设置 checked 属性
 * - 对于 select  监控 @change，并设置 value 属性
 * @param modelValue 双向绑定的组件变量
 */
class Model extends Directive {
  update(nodes: Node[], newArgs: any[], oldArgs: any[]): DirectiveUpdateTag {
    if (!this.modelPath)
      this.modelPath = last(this.renderParams)
    if (!isEqual(newArgs, oldArgs)) {
      const node = this.point.startNode
      if (node instanceof CompElem) {
        // node._setParentProps({ value: newArgs[0] });
        node._updateProps({ value: newArgs[0] })
      } else if (node instanceof HTMLTextAreaElement || node instanceof HTMLSelectElement) {
        node.setAttribute('value', newArgs[0] + '')
      } else if (node instanceof HTMLInputElement) {
        switch (node.type) {
          case 'checkbox':
          case 'radio':
            if (!!newArgs[0]) {
              node.setAttribute('checked', '')
            } else {
              node.removeAttribute('checked')
            }

            break;
          case 'text':
          case 'email':
          case 'number':
          case 'password':
          case 'search':
          case 'tel':
          case 'url':
            node.setAttribute('value', newArgs[0] + '')
            break;

          default:
            node.setAttribute('value', newArgs[0] + '')
            break;
        }

      }
    }
    return DirectiveUpdateTag.NONE
  }
  static get scopes(): EnterPointType[] {
    return [EnterPointType.TAG]
  }
  modelPath: string[]
  point: EnterPoint
  constructor(point: EnterPoint) {
    super();
    this.point = point
  }
  render(modelValue: any) {
    if (!this.modelPath)
      this.modelPath = last(this.renderParams)
    const node = this.point.startNode
    if (get(node, '_model') === 'binded') return;

    if (!isObject(modelValue) && !trim(modelValue))
      modelValue = ''
    if (node instanceof CompElem) {
      //todo _setParentProps接口不应该外部使用
      // node._setParentProps({ value: modelValue });
      node._initProps({ value: modelValue })
      node.addEventListener('update:value', (e: CustomEvent) => {
        set(this.renderComponent, this.modelPath, e.detail.value)
      });
      set(node, '_model', 'binded')
    } else if (node instanceof HTMLTextAreaElement) {
      node.setAttribute('value', modelValue + '');
      node.addEventListener('input', (e: Event) => {
        let t = e.target as any
        set(this.renderComponent, this.modelPath, t.value)
      });
      set(node, '_model', 'binded')
    } else if (node instanceof HTMLInputElement) {
      let propName = '';
      let evName = '';
      switch (node.type) {
        case 'checkbox':
        case 'radio':
          propName = 'checked'
          evName = 'change'
          break;
        case 'text':
        case 'email':
        case 'number':
        case 'password':
        case 'search':
        case 'tel':
        case 'url':
          propName = 'value'
          evName = 'input'
          break;
        default:
          propName = 'value'
          evName = 'input'
          break;
      }
      node.setAttribute(propName, modelValue + '');
      node.addEventListener(evName, (e: Event) => {
        let t = e.target as any
        set(this.renderComponent, this.modelPath, t.value)
      });
      set(node, '_model', 'binded')
    } else if (node instanceof HTMLSelectElement) {
      node.setAttribute('value', modelValue + '');
      node.addEventListener('change', (e: Event) => {
        let t = e.target as any
        set(this.renderComponent, this.modelPath, t.value)
      });
      set(node, '_model', 'binded')
    }
  }
}
export const model = directive<Parameters<typeof Model.prototype.render>>(Model);
