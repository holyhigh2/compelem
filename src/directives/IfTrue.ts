import { CompElem } from "../CompElem";
import { directive } from "../directive/index";
import { TemplateMeta } from "../render/TemplateMeta";
import { DirectiveUpdateTag, EnterPointType, TplFn } from "../types";

const TmplMap = new WeakMap()
/**
 * 条件为真时返回内容，仅能用于文本节点
 * @param condition 条件 
 * @param tmpl 模板
 */
export const ifTrue = directive(function IfTrue(condition: boolean, tplFn: TplFn) {
  return (pointNode: Node, [condi, render]: any[], oldArgs: any[] | undefined, { renderComponent }: { renderComponent: CompElem }) => {
    let tmplM = TmplMap.get(pointNode)
    if (condi && !TmplMap.has(pointNode)) {
      tmplM = new TemplateMeta(render.call(renderComponent), renderComponent)
      TmplMap.set(pointNode, tmplM)
    }
    if (oldArgs) {
      if (oldArgs[0]) {
        if (!condi) {
          return [DirectiveUpdateTag.REMOVE]
        } else {
          return [DirectiveUpdateTag.REFRESH, render]
        }
      } else {
        if (condi) {
          return [DirectiveUpdateTag.REPLACE, render, tmplM]
        }
      }
      return [DirectiveUpdateTag.NONE]
    }

    return [DirectiveUpdateTag.INIT, ...(condi ? [render, tmplM] : [])]
  };
}, [EnterPointType.TEXT, EnterPointType.SLOT])