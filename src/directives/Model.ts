import { find, isObject, isString, last, set, toPath, trim } from "myfx";
import { CompElem } from "../CompElem";
import { DefinitionComponentMap } from "../constants";
import { directive } from "../directive/index";
import { addEmitEvent, getEventBindList } from "../events/event";
import { EnterPointType } from "../types";
import { addUninitializedSubComponentProp } from "../utils";

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
 * @param updateProp 绑定模型变更时的监控属性，默认 value
 * @param modelProp 当初始模型路径不存在时可指定路径
 */
export const model = directive(function Model(modelValue: any, updateProp: string = 'value', modelProp?: string) {
  return (pointNode: Node, [modelValue, updateProp, modelProp]: any[], oldArgs: any[] | undefined, { varChain, renderComponent }: { renderComponent: CompElem; varChain: string[] }) => {

    updateProp = updateProp ?? 'value'
    const node = pointNode as Element
    if (oldArgs) {
      const oldValue = oldArgs[0]
      const newValue = modelValue
      if (!isObject(newValue) && Object.is(newValue, oldValue)) return

      if (node instanceof CompElem) {
        node.updateProps({ [updateProp]: newValue })
      } else if (node instanceof HTMLTextAreaElement || node instanceof HTMLSelectElement) {
        node.setAttribute(updateProp, newValue + '')
        if (node instanceof HTMLSelectElement) {
          let opt = find(node.querySelectorAll('option'), n => n.value == newValue)
          if (opt) {
            opt.selected = true
          }
        }
      } else if (node instanceof HTMLInputElement) {
        if (node.value == newValue) return
        switch (node.type) {
          case 'checkbox':
          case 'radio':
            if (!!newValue) {
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
            node.setAttribute(updateProp, newValue + '')
            set(node, updateProp, newValue)
            break;

          default:
            node.setAttribute(updateProp, newValue + '')
            break;
        }

      }
      return
    }

    let path: string
    if (isString(modelProp)) {
      path = toPath(modelProp)[0]
    } else {
      path = last(varChain)
    }

    let evList: Array<[string, Function, Node, Function?]> = getEventBindList(renderComponent)

    if (!isObject(modelValue) && !trim(modelValue)) modelValue = ''
    let ctor = DefinitionComponentMap[node.tagName.toLowerCase()]

    if (ctor) {
      addUninitializedSubComponentProp(renderComponent, node, { [updateProp]: modelValue })

      let evName = 'update:' + updateProp
      addEmitEvent(node, renderComponent, evName, function (obj: Record<string, any>) {
        let ctx = this
        set(ctx, path, obj.value)
      })
    } else if (node instanceof HTMLTextAreaElement) {
      node.setAttribute(updateProp, modelValue + '');

      let evName = 'input'
      evList.push([evName, function (e: Event) {
        let t = e.target as any
        set(this, path, t.value)
      }, node])

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
      node.setAttribute(updateProp ?? propName, modelValue + '');

      evList.push([evName, function (e: Event) {
        let t = e.target as any
        set(this, path, t.value)
      }, node])
    } else if (node instanceof HTMLSelectElement) {
      node.setAttribute(updateProp, modelValue + '');
      evList.push(['change', function (e: Event) {
        let t = e.target as any
        let ctx = this;
        set(ctx, path, t.value)
      }, node])
    }
  };
}, [EnterPointType.TAG])