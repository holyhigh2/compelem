import { directive, EnterPoint } from "../directive/index";
import { html } from "../render/render";
import { DirectiveUpdateTag, EnterPointType, TmplFn } from "../types";

/**
 * 条件为真时返回内容，仅能用于文本节点
 * @param condition 条件 
 * @param tmpl 模板
 */
export const ifTrue = directive(function IfTrue(condition: boolean, tmplFn: TmplFn) {
  return (point: EnterPoint, [condi, render]: any[], oldArgs: any[] | undefined) => {
    if (oldArgs) {
      //更新
      if (condi === oldArgs[0]) return [DirectiveUpdateTag.NONE, condi ? render() : html``]
      if (condi) {
        return [DirectiveUpdateTag.REPLACE, condi ? render() : html``]
      }
      return [DirectiveUpdateTag.REMOVE]
    } else {
      return [DirectiveUpdateTag.APPEND, condi ? render() : html``]
    }
  };
}, [EnterPointType.TEXT, EnterPointType.SLOT])