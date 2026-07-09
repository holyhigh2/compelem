import { call, each, findIndex, isFunction } from "myfx";
import { directive } from "../directive/index";
import { h } from "../render/render";
import { Template } from "../render/Template";
import { DirectiveUpdateTag, EnterPointType, TplFn } from "../types";
const LastConditionMap = new WeakMap()
/**
 * 分支指令，具有switch / else if 两种模式
 * @example
 *  switch 模式
 * ${when(var, {
    closed: () => h``, //case 1
    connecting: () => h``, //case 2
    default: () => h``// default是switch模式下的关键字key
   })}

   else if 模式
 * ${when(this.editingTitle, [
    [(v: any) => v.substring(2) > 0, () => h`<div style="${PageHome.tunnelLight}"></div>`],
    [(v: any) => v == 'closed', () => h`<div style="${PageHome.tunnelLight}"></div>`],
    [() => true, () => h`默认`]
    ])}
 * 
 * @param condition 条件 
 * @param tmpl 模板
 */
export const when = directive(function When(value: string | number, cases: Array<[(v: any) => boolean, TplFn]> | Record<string | number, TplFn>) {
  return (pointNode: Node, [value, cases]: [string | number, Array<[(v: any) => boolean, TplFn]> | Record<string | number, TplFn>], oldArgs: any[] | undefined) => {
    let defaultFn: TplFn = () => h``;
    let conditionList: any[] = []
    let tmplList: TplFn[] = []
    each(cases, (v: Array<TplFn> | TplFn, k) => {
      if (isFunction(v)) {
        conditionList.push(k);
        tmplList.push(v);
      } else {
        let condiFn = v[0]
        let tmplFn = v[1]
        conditionList.push(condiFn);
        tmplList.push(tmplFn);
      }
      if (k === 'default') {
        defaultFn = v as TplFn
      }
    })
    let i = findIndex(conditionList, c => {
      if (isFunction(c)) {
        return c(value)
      } else {
        return c == value;
      }
    })
    let lastCase = LastConditionMap.get(pointNode)
    LastConditionMap.set(pointNode, i)
    if (oldArgs) {
      if (lastCase == i) {
        return [DirectiveUpdateTag.UPDATE, call(tmplList[i] ?? defaultFn) as Template]
      }
      return [DirectiveUpdateTag.REPLACE, call(tmplList[i] ?? defaultFn) as Template]
    }

    return [DirectiveUpdateTag.APPEND, call(tmplList[i] ?? defaultFn) as Template]
  };
}, [EnterPointType.TEXT, EnterPointType.SLOT])