import { each, findIndex, isFunction } from "myfx";
import { CompElem } from "../CompElem";
import { directive } from "../directive/index";
import { h } from "../render/render";
import { TemplateMeta } from "../render/TemplateMeta";
import { DirectiveUpdateTag, EnterPointType, TplFn } from "../types";
const LastConditionMap = new WeakMap()
const BranchTmplMMap = new WeakMap<Node, TemplateMeta[]>()
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
  return (pointNode: Node, [value, cases]: [string | number, Array<[(v: any) => boolean, TplFn]> | Record<string | number, TplFn>], oldArgs: any[] | undefined, { renderComponent }: { renderComponent: CompElem }) => {
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
    let tplAry = BranchTmplMMap.get(pointNode)
    if (!tplAry) {
      tplAry = []
      BranchTmplMMap.set(pointNode, tplAry)
    }
    if (!tplAry[i]) {
      let tmplM = new TemplateMeta((tmplList[i] ?? defaultFn).call(renderComponent), renderComponent)
      tplAry[i] = tmplM
    }
    if (oldArgs) {
      if (lastCase == i) {
        return [DirectiveUpdateTag.REFRESH, tmplList[i] ?? defaultFn]
      }
      return [DirectiveUpdateTag.REPLACE, tmplList[i] ?? defaultFn, tplAry[i]]
    }

    return [DirectiveUpdateTag.INIT, tmplList[i] ?? defaultFn, tplAry[i]]
  };
}, [EnterPointType.TEXT, EnterPointType.SLOT])