import { alphaId, find, get, isObject, isString, last, set, toPath, trim } from "myfx";
import { CompElem } from "../CompElem";
import { EnterPoint, directive } from "../directive/index";
import { ComponentEventsMap } from "../render/render";
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

    let evMap: Record<string, [string, Function]> | undefined = ComponentEventsMap.get(renderComponent.tagName)!

    let evId = alphaId(8)
    if (!isObject(modelValue) && !trim(modelValue)) modelValue = ''
    if (node instanceof CompElem) {
      node._initProps({ [updateProp]: modelValue })

      if (!evMap[evId]) {
        let evName = 'update:' + updateProp
        evMap[evId] = [evName, function (e: CustomEvent) {
          if (process.env.DEV)
            console.debug('Model =>', path)
          let ctx = this
          let pathFromWrapperComponent = ctx._wrapperProp[rootPath]
          let hasPath = rootPath in ctx
          if (!hasPath && pathFromWrapperComponent && get(ctx.wrapperComponent, rootPath) === get(ctx, pathFromWrapperComponent)) {
            ctx = ctx.wrapperComponent || ctx
          }
          set(ctx, path, e.detail.value)
        }]
        node.toggleAttribute('data-ev-' + evId, true)
      }
    } else if (node instanceof HTMLTextAreaElement) {
      node.setAttribute(updateProp, modelValue + '');
      if (!evMap[evId]) {
        let evName = 'input'
        evMap[evId] = [evName, function (e: Event) {
          if (process.env.DEV)
            console.debug('Model =>', path)
          let t = e.target as any
          set(this, path, t.value)
        }]
        node.toggleAttribute('data-ev-' + evId, true)
      }
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
      if (!evMap[evId]) {
        evMap[evId] = [evName, function (e: Event) {
          if (process.env.DEV)
            console.debug('Model =>', path)
          let t = e.target as any
          set(this, path, t.value)
        }]
        node.toggleAttribute('data-ev-' + evId, true)
      }
    } else if (node instanceof HTMLSelectElement) {
      node.setAttribute(updateProp, modelValue + '');
      if (!evMap[evId]) {
        evMap[evId] = ['change', function (e: Event) {
          if (process.env.DEV)
            console.debug('Model =>', path)
          let t = e.target as any
          let ctx = this;
          let pathFromWrapperComponent = ctx._wrapperProp[rootPath];
          let hasPath = rootPath in ctx;
          if (!hasPath && pathFromWrapperComponent && get(ctx.wrapperComponent, rootPath) === get(ctx, pathFromWrapperComponent)) {
            ctx = ctx.wrapperComponent || ctx;
          }
          set(ctx, path, t.value)
        }]
        node.toggleAttribute('data-ev-' + evId, true)
      }
    }
  };
}, [EnterPointType.TAG])