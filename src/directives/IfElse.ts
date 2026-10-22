import { CompElem } from "../CompElem";
import { directive } from "../directive/index";
import { resolveSubTemplateMeta } from "../render/render";
import { DirectiveUpdateTag, EnterPointType, TplFn } from "../types";

const IfTmplMap = new WeakMap()
const ElseTmplMap = new WeakMap()

/** 分支子模板元数据：按分支缓存解析结果 */
function resolveBranch(cacheMap: WeakMap<Node, any>, pointNode: Node, renderComponent: CompElem, tmpl: TplFn) {
  let tmplM = cacheMap.get(pointNode)
  if (!tmplM) {
    tmplM = resolveSubTemplateMeta(renderComponent, tmpl)
    cacheMap.set(pointNode, tmplM)
  }
  return tmplM
}
/**
 * 条件为真时返回参数1，否则返回参数2，仅能用于文本节点
 * @param condition 条件
 * @param tmpl 模板
 */
export const ifElse = directive(function IfElse(condition: boolean, ifTmpl: TplFn, elseTmpl: TplFn) {
  const executor = (pointNode: Node, [condi, ifTmpl, elseTmpl]: any[], oldArgs: any[] | undefined, { renderComponent }: { renderComponent: CompElem }): [DirectiveUpdateTag, ...any[]] | void => {
    if (oldArgs && !!condi === !!oldArgs[0]) {
      //更新：分支未切换
      return [DirectiveUpdateTag.REFRESH, condi ? ifTmpl : elseTmpl]
    }
    let tmpl = condi ? ifTmpl : elseTmpl
    let tmplM = resolveBranch(condi ? IfTmplMap : ElseTmplMap, pointNode, renderComponent, tmpl)

    if (oldArgs) {
      return [DirectiveUpdateTag.REPLACE, tmpl, tmplM]
    }

    return [DirectiveUpdateTag.INIT, tmpl, tmplM]

  }
  return executor
}, [EnterPointType.TEXT, EnterPointType.SLOT])