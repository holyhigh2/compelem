import { call, each, findIndex, isEqual, isFunction } from "myfx";
import { Directive } from "../directive/Directive";
import { directive, EnterPoint, EnterPointType } from "../directive/index";
import { html } from "../render/render";
import { Template } from "../render/Template";
import { DirectiveUpdateTag, TmplFn } from "../types";

/**
 * 分支指令，具有switch / if else 两种模式
 * @example
 *  switch 模式
 * ${when(var, {
    closed: () => html``, //case 1
    connecting: () => html``, //case 2
    default: () => html``// default
   })}

   if else 模式
 * ${when(this.editingTitle, [
    [(v: any) => v.substring(2) > 0, () => html`<div style="${PageHome.tunnelLight}"></div>`],
    [(v: any) => v == 'closed', () => html`<div style="${PageHome.tunnelLight}"></div>`],
    [() => true, () => html`默认`]
    ])}
 * 
 * @param condition 条件 
 * @param tmpl 模板
 */
class When extends Directive {
  created(point: EnterPoint, ...args: any): void {
  }
  static get scopes(): EnterPointType[] {
    return [EnterPointType.TEXT, EnterPointType.SLOT]
  }

  update(point: EnterPoint, newArgs: any[], oldArgs: any[]): DirectiveUpdateTag {
    if (isEqual(newArgs, oldArgs)) {
      return DirectiveUpdateTag.NONE;
    }

    //todo 缓存
    return DirectiveUpdateTag.REPLACE
  }
  render(value: any, cases: Array<TmplFn>[] | Record<string | number, TmplFn>) {
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
    return call(tmplList[i] ?? defaultFn) as Template
  }
}
export const when = directive<Parameters<typeof When.prototype.render>>(When);