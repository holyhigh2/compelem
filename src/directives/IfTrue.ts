import { CompElem } from "../CompElem";
import { directive } from "../directive/index";
import { resolveSubTemplateMeta } from "../render/render";
import { DirectiveUpdateTag, EnterPointType, TplFn } from "../types";

const TmplMap = new WeakMap()
/**
 * 条件为真时返回内容，仅能用于文本节点
 * @param condition 条件 
 * @param tmpl 模板
 */
export const ifTrue = directive(function IfTrue(condition: boolean, tplFn: TplFn) {
  const executor = (pointNode: Node, newArgs: any[], oldArgs: any[] | undefined, { renderComponent }: { renderComponent: CompElem }): [DirectiveUpdateTag, ...any[]] | void => {
    const condi = newArgs[0]
    const render = newArgs[1]
    if (oldArgs) {
      if (oldArgs[0]) {
        if (!condi) {
          return [DirectiveUpdateTag.REMOVE]
        }
        return [DirectiveUpdateTag.REFRESH, render]
      } else {
        if (condi) {
          let tmplM = TmplMap.get(pointNode)
          if (!TmplMap.has(pointNode)) {
            tmplM = resolveSubTemplateMeta(renderComponent, render)
            TmplMap.set(pointNode, tmplM)
          }
          return [DirectiveUpdateTag.REPLACE, render, tmplM]
        }
      }
      return [DirectiveUpdateTag.NONE]
    }

    if (condi) {
      let tmplM = TmplMap.get(pointNode)
      if (!TmplMap.has(pointNode)) {
        tmplM = resolveSubTemplateMeta(renderComponent, render)
        TmplMap.set(pointNode, tmplM)
      }
      return [DirectiveUpdateTag.INIT, render, tmplM]
    }
    return [DirectiveUpdateTag.INIT]
  }
  return executor
}, [EnterPointType.TEXT, EnterPointType.SLOT])
