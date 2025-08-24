import { call, each, findIndex, isFunction } from "myfx";
import { directive, EnterPoint } from "../directive/index";
import { html } from "../render/render";
import { Template } from "../render/Template";
import { DirectiveUpdateTag, EnterPointType, TmplFn } from "../types";

/**
 * 分支指令，具有switch / else if 两种模式
 * @example
 *  switch 模式
 * ${when(var, {
    closed: () => html``, //case 1
    connecting: () => html``, //case 2
    default: () => html``// default是switch模式下的关键字key
   })}

   else if 模式
 * ${when(this.editingTitle, [
    [(v: any) => v.substring(2) > 0, () => html`<div style="${PageHome.tunnelLight}"></div>`],
    [(v: any) => v == 'closed', () => html`<div style="${PageHome.tunnelLight}"></div>`],
    [() => true, () => html`默认`]
    ])}
 * 
 * @param condition 条件 
 * @param tmpl 模板
 */
export const when = directive(function When(value: string | number, cases: Array<[(v: any) => boolean, TmplFn]> | Record<string | number, TmplFn>) {
  return (point: EnterPoint, [value, cases]: [string | number, Array<[(v: any) => boolean, TmplFn]> | Record<string | number, TmplFn>], oldArgs: any[] | undefined) => {
    let defaultFn: TmplFn = () => html``;
    let conditionList: any[] = []
    let tmplList: TmplFn[] = []
    each(cases, (v: Array<TmplFn> | TmplFn, k) => {
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
        defaultFn = v as TmplFn
      }
    })
    let i = findIndex(conditionList, c => {
      if (isFunction(c)) {
        return c(value)
      } else {
        return c == value;
      }
    })
    if (oldArgs) return [DirectiveUpdateTag.REPLACE, call(tmplList[i] ?? defaultFn) as Template]

    return [DirectiveUpdateTag.APPEND, call(tmplList[i] ?? defaultFn) as Template]
  };
}, [EnterPointType.TEXT, EnterPointType.SLOT])