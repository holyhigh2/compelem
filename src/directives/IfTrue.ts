import { directive } from "../directive/index";
import { h } from "../render/render";
import { Template } from "../render/Template";
import { DirectiveUpdateTag, EnterPointType, TplFn } from "../types";

/**
 * 条件为真时返回内容，仅能用于文本节点
 * @param condition 条件 
 * @param tmpl 模板
 */
export const ifTrue = directive(function IfTrue(condition: boolean, tplFn: TplFn) {
  return (pointNode: Node, [condi, render]: any[], oldArgs: any[] | undefined) => {
    if (oldArgs) {
      //更新
      if (condi === oldArgs[0]) return [DirectiveUpdateTag.UPDATE, new Template(
        ['', ''],
        [condi ? render() : h``]
      )]
      if (condi) {
        return [DirectiveUpdateTag.REPLACE, condi ? render() : h``]
      }
      return [DirectiveUpdateTag.REMOVE]
    } else {
      return [DirectiveUpdateTag.APPEND, condi ? render() : h``]
    }
  };
}, [EnterPointType.TEXT, EnterPointType.SLOT])