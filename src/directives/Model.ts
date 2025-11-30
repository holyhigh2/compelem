import { find, get, isObject, isString, last, set, toPath, trim } from "myfx";
import { CompElem } from "../CompElem";
import { EnterPoint, directive } from "../directive/index";
import { EnterPointType } from "../types";
import { showError } from "../utils";

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
  return (point: EnterPoint, newArgs: any[], oldArgs: any[] | undefined, { varChain, renderComponent }: { renderComponent: CompElem; varChain: string[][] }) => {

    const node = point.startNode
    if (oldArgs) {
      const oldValue = oldArgs[0]
      const newValue = newArgs[0]
      let nodeValue = get(node, updateProp)
      if (!isObject(newValue) && Object.is(newValue, oldValue) && Object.is(nodeValue, newValue)) return

      if (node instanceof CompElem) {
        node._updateProps({ [updateProp]: newValue })
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
    if (get(node, '_model') === 'binded') return
    let path: string[]
    if (isString(modelProp)) {
      path = toPath(modelProp)
    } else {
      path = last(varChain)
    }

    const rootPath = path[0]
    if (!(rootPath in renderComponent) && !renderComponent._wrapperProp[rootPath]) {
      showError(`model - property '${rootPath}' is not defined on the instance of ` + renderComponent.tagName)
    }

    if (!isObject(modelValue) && !trim(modelValue)) modelValue = ''
    if (node instanceof CompElem) {
      node._initProps({ [updateProp]: modelValue })
      node.addEventListener('update:' + updateProp, (e: CustomEvent) => {
        console.debug('Model =>', path)
        let ctx = renderComponent
        let pathFromWrapperComponent = renderComponent._wrapperProp[rootPath]
        let hasPath = rootPath in renderComponent
        if (!hasPath && pathFromWrapperComponent && get(renderComponent.wrapperComponent, rootPath) === get(renderComponent, pathFromWrapperComponent)) {
          ctx = renderComponent.wrapperComponent || ctx
        }
        set(ctx, path, e.detail.value)
      });
      set(node, '_model', 'binded')
    } else if (node instanceof HTMLTextAreaElement) {
      node.setAttribute(updateProp, modelValue + '');
      node.addEventListener('input', (e: Event) => {
        console.debug('Model =>', path)
        let t = e.target as any
        set(renderComponent, path, t.value)
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
      node.setAttribute(updateProp ?? propName, modelValue + '');
      node.addEventListener(evName, (e: Event) => {
        console.debug('Model =>', path)
        let t = e.target as any
        set(renderComponent, path, t.value)
      });
      set(node, '_model', 'binded')
    } else if (node instanceof HTMLSelectElement) {
      node.setAttribute(updateProp, modelValue + '');
      node.addEventListener('change', (e: Event) => {
        console.debug('Model =>', path)
        let t = e.target as any
        let ctx = renderComponent;
        let pathFromWrapperComponent = renderComponent._wrapperProp[rootPath];
        let hasPath = rootPath in renderComponent;
        if (!hasPath && pathFromWrapperComponent && get(renderComponent.wrapperComponent, rootPath) === get(renderComponent, pathFromWrapperComponent)) {
          ctx = renderComponent.wrapperComponent || ctx;
        }
        set(ctx, path, t.value)
      });
      set(node, '_model', 'binded')
    }
  };
}, [EnterPointType.TAG])