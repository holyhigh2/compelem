import { find, isObject, isString, set, toPath, trim } from "myfx";
import { CompElem } from "../CompElem";
import { DefinitionComponentMap } from "../constants";
import { directive } from "../directive/index";
import { addEmitEvent, getEventBindList } from "../events/event";
import { EnterPointType } from "../types";
import { addUninitializedSubComponentProp } from "../utils";

/**
 * 实现双向绑定（仅支持静态路径，动态增加的属性路径无法识别）
 * 当用于组件时，监控 @update:value 事件
 * 当用于元素时，  
 * - 对于 input/textarea 监控 @input，并设置 value
 * - 对于 checkbox/radio 监控 @change，并设置 checked
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
        // select 快路径：已有选中项且其 value 与模型一致 ⇒ 无需重设/全表查 option
        if (node instanceof HTMLSelectElement && node.selectedIndex > -1 && node.value == newValue) return
        node.setAttribute(updateProp, newValue + '')
        if (node instanceof HTMLSelectElement) {
          let opt = find(node.querySelectorAll('option'), n => n.value == newValue)
          if (opt) {
            opt.selected = true
          }
        } else {
          set(node, updateProp, newValue)
        }
      } else if (node instanceof HTMLInputElement) {
        // checkbox/radio 的 node.value 恒为 value 特性（默认 "on"），拿它做「值未变」
        // 快比对会误命中（"1" == true），更新被短路后视图永久卡死 ⇒ 这两类不走守卫
        const checkable = node.type === 'checkbox' || node.type === 'radio'
        if (!checkable && node.value == newValue) return
        switch (node.type) {
          case 'checkbox':
            node.checked = !!newValue
            break;
          case 'radio':
            // 标量模型：只有 value 与模型相等的项选中，同组其它项必须取消
            node.checked = node.value == newValue
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
      path = varChain[varChain.length - 1]
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
      set(node, updateProp, modelValue)

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
      if (propName === 'checked') {
        const isRadio = node.type === 'radio'
        // radio 是标量模型：勾不勾取决于「本项 value 是否等于模型值」，
        // 用 !!modelValue 会让同组所有 radio 一起选中
        node.checked = isRadio ? node.value == modelValue : !!modelValue

        evList.push([evName, function (e: Event) {
          let t = e.target as any
          // radio 写回被选中项的 value（标量），checkbox 写回勾选态（布尔）
          set(this, path, isRadio ? t.value : t.checked)
        }, node])
      } else {
        node.setAttribute(updateProp ?? propName, modelValue + '');

        evList.push([evName, function (e: Event) {
          let t = e.target as any
          set(this, path, t.value)
        }, node])
      }
    } else if (node instanceof HTMLSelectElement) {
      node.value = modelValue + ''
      evList.push(['change', function (e: Event) {
        let t = e.target as any
        let ctx = this;
        set(ctx, path, t.value)
      }, node])
    }
  };
}, [EnterPointType.TAG])