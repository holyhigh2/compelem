import { CompElem } from "../CompElem";
import { directive } from "../directive/index";
import { TemplateMeta } from "../render/TemplateMeta";
import { DirectiveUpdateTag, EnterPointType, TplFn } from "../types";

const LastTplFnMap = new WeakMap()
const IfTmplMap = new WeakMap()
const ElseTmplMap = new WeakMap()
/**
 * 条件为真时返回参数1，否则返回参数2，仅能用于文本节点
 * @param condition 条件 
 * @param tmpl 模板
 */
export const ifElse = directive(function IfElse(condition: boolean, ifTmpl: TplFn, elseTmpl: TplFn) {
  return (pointNode: Node, [condi, ifTmpl, elseTmpl]: any[], oldArgs: any[] | undefined, { renderComponent }: { renderComponent: CompElem }) => {
    let tmplM

    if (oldArgs) {
      //更新
      if (!!condi === !!oldArgs[0]) {
        let tplFn = LastTplFnMap.get(pointNode)
        return [DirectiveUpdateTag.REFRESH, tplFn]
      }
      let tmpl = condi ? ifTmpl : elseTmpl
      if (condi) {
        tmplM = IfTmplMap.get(pointNode)
        if (!tmplM) {
          tmplM = new TemplateMeta(tmpl.call(renderComponent, condi), renderComponent)
          IfTmplMap.set(pointNode, tmplM)
        }
      } else {
        tmplM = ElseTmplMap.get(pointNode)
        if (!tmplM) {
          tmplM = new TemplateMeta(tmpl.call(renderComponent, condi), renderComponent)
          ElseTmplMap.set(pointNode, tmplM)
        }
      }
      return [DirectiveUpdateTag.REPLACE, tmpl, tmplM]
    }


    let tmpl = condi ? ifTmpl : elseTmpl
    if (condi) {
      tmplM = IfTmplMap.get(pointNode)
      if (!tmplM) {
        tmplM = new TemplateMeta(tmpl.call(renderComponent, condi), renderComponent)
        IfTmplMap.set(pointNode, tmplM)
      }
    } else {
      tmplM = ElseTmplMap.get(pointNode)
      if (!tmplM) {
        tmplM = new TemplateMeta(tmpl.call(renderComponent, condi), renderComponent)
        ElseTmplMap.set(pointNode, tmplM)
      }
    }

    LastTplFnMap.set(pointNode, tmpl)

    return [DirectiveUpdateTag.INIT, tmpl, tmplM]

  };
}, [EnterPointType.TEXT, EnterPointType.SLOT])