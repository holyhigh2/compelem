import { CompElem } from "../CompElem";
import { EnterPoint, directive } from "../directive/index";
import { DirectiveUpdateTag, EnterPointType, TmplFn } from "../types";

const LastTmplMap = new WeakMap()
/**
 * 条件为真时返回参数1，否则返回参数2，仅能用于文本节点
 * @param condition 条件 
 * @param tmpl 模板
 */
export const ifElse = directive(function IfElse(condition: boolean, ifTmpl: TmplFn, elseTmpl: TmplFn) {
  return (point: EnterPoint, [condi, render]: any[], oldArgs: any[] | undefined, { renderComponent }: { renderComponent: CompElem }) => {
    let el = point.endNode as HTMLElement

    if (oldArgs) {
      //更新
      if (!!condi === !!oldArgs[0]) {
        let tmpl = LastTmplMap.get(el)
        return [DirectiveUpdateTag.NONE, tmpl.call(renderComponent, condi)]
      }
      let tmpl = condi ? ifTmpl : elseTmpl
      LastTmplMap.set(el, tmpl)
      return [DirectiveUpdateTag.REPLACE, tmpl.call(renderComponent, condi)]
    } else {
      let tmpl = condi ? ifTmpl : elseTmpl
      LastTmplMap.set(el, tmpl)
      return [DirectiveUpdateTag.APPEND, tmpl.call(renderComponent, condition)]
    }
  };
}, [EnterPointType.TEXT, EnterPointType.SLOT])