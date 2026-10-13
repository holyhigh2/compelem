import { each, findIndex, isArray, isFunction } from "myfx";
import { CompElem } from "../CompElem";
import { directive } from "../directive/index";
import { resolveSubTemplateMeta } from "../render/render";
import type { TemplateMeta } from "../render/TemplateMeta";
import type { UpdatePoint } from "../render/UpdatePoint";
import { DirectiveUpdateTag, EnterPointType, TplFn } from "../types";
import { showTagError } from "../utils";
const LastConditionMap = new WeakMap()
const BranchTmplMMap = new WeakMap<Node, TemplateMeta[]>()
//cases 解析缓存
const CasesCacheMap = new WeakMap<Node, { cases: any, conditionList: any[], tmplList: TplFn[], defaultFn: TplFn | undefined }>()
/**
 * @example
 *  switch 模式
 * ${when(var, {
    closed: () => h``, //case 1
    connecting: () => h``, //case 2
    default: () => h``// default是switch模式下的关键字key（可省略，省略时无命中即不渲染任何内容）
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
  const executor = (pointNode: Node, [value, cases]: [string | number, Array<[(v: any) => boolean, TplFn]> | Record<string | number, TplFn>], oldArgs: any[] | undefined, { renderComponent, up }: { renderComponent: CompElem, up?: UpdatePoint }): [DirectiveUpdateTag, ...any[]] | void => {
    let cc = CasesCacheMap.get(pointNode)
    if (!cc || cc.cases !== cases) {
      let defaultFn: TplFn | undefined = undefined
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
      cc = { cases, conditionList, tmplList, defaultFn }
      CasesCacheMap.set(pointNode, cc)
    }
    const { conditionList, tmplList, defaultFn } = cc
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

    /** 本指令点当前是否挂着子视图 */
    const mounted = (): boolean => {
      const roots = up?.subViewRootNodes
      if (!roots) return false
      return isArray(roots) ? roots.length > 0 : Object.keys(roots).length > 0
    }
    const drop = (): [DirectiveUpdateTag] =>
      mounted() ? [DirectiveUpdateTag.REMOVE] : [DirectiveUpdateTag.NONE]

    const branchFn = tmplList[i] ?? defaultFn
    if (!branchFn) return drop()

    if (!tplAry[i]) {
      const resolved = resolveSubTemplateMeta(renderComponent, branchFn)
      if (!resolved) {
        showTagError(
          renderComponent.tagName,
          `Structural sub-template is missing — ${typeof (branchFn as any).__subId === 'number'
            ? `__ce_static__.subViews[${(branchFn as any).__subId}].buildTemplate missing`
            : 'fn.__subId missing'}`,
        )
        return drop()
      }
      tplAry[i] = resolved
    }
    if (oldArgs) {
      if (lastCase == i) {
        return [DirectiveUpdateTag.REFRESH, tmplList[i] ?? defaultFn]
      }
      return [DirectiveUpdateTag.REPLACE, tmplList[i] ?? defaultFn, tplAry[i]]
    }

    return [DirectiveUpdateTag.INIT, tmplList[i] ?? defaultFn, tplAry[i]]
  }
  return executor
}, [EnterPointType.TEXT, EnterPointType.SLOT])