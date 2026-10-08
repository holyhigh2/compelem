import { CompElem } from "../CompElem";
import { directive } from "../directive/index";
import { resolveSubTemplateMeta } from "../render/render";
import { DirectiveUpdateTag, EnterPointType, TplFn } from "../types";

const IfTmplMap = new WeakMap()
const ElseTmplMap = new WeakMap()
/**
 * 条件为真时返回参数1，否则返回参数2，仅能用于文本节点
 * @param condition 条件
 * @param tmpl 模板
 */
export const ifElse = directive(function IfElse(condition: boolean, ifTmpl: TplFn, elseTmpl: TplFn) {
  const executor = (pointNode: Node, [condi, ifTmpl, elseTmpl]: any[], oldArgs: any[] | undefined, { renderComponent }: { renderComponent: CompElem }): [DirectiveUpdateTag, ...any[]] | void => {
    let tmplM

    if (oldArgs) {
      //更新
      if (!!condi === !!oldArgs[0]) {
        return [DirectiveUpdateTag.REFRESH, condi ? ifTmpl : elseTmpl]
      }
      let tmpl = condi ? ifTmpl : elseTmpl
      if (condi) {
        tmplM = IfTmplMap.get(pointNode)
        if (!tmplM) {
          tmplM = resolveSubTemplateMeta(renderComponent, tmpl)
          IfTmplMap.set(pointNode, tmplM)
        }
      } else {
        tmplM = ElseTmplMap.get(pointNode)
        if (!tmplM) {
          tmplM = resolveSubTemplateMeta(renderComponent, tmpl)
          ElseTmplMap.set(pointNode, tmplM)
        }
      }
      return [DirectiveUpdateTag.REPLACE, tmpl, tmplM]
    }


    let tmpl = condi ? ifTmpl : elseTmpl
    if (condi) {
      tmplM = IfTmplMap.get(pointNode)
      if (!tmplM) {
        tmplM = resolveSubTemplateMeta(renderComponent, tmpl)
        IfTmplMap.set(pointNode, tmplM)
      }
    } else {
      tmplM = ElseTmplMap.get(pointNode)
      if (!tmplM) {
        tmplM = resolveSubTemplateMeta(renderComponent, tmpl)
        ElseTmplMap.set(pointNode, tmplM)
      }
    }

    return [DirectiveUpdateTag.INIT, tmpl, tmplM]

  }
  return executor
}, [EnterPointType.TEXT, EnterPointType.SLOT])