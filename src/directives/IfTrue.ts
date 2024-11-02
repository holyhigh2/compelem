import { Directive } from "../directive/Directive";
import { directive, EnterPointType } from "../directive/index";
import { html } from "../render/render";
import { DirectiveUpdateTag, TmplFn } from "../types";

/**
 * 条件为真时返回内容，仅能用于文本节点
 * @param condition 条件 
 * @param tmpl 模板
 */
class IfTrue extends Directive {
  static get scopes(): EnterPointType[] {
    return [EnterPointType.TEXT, EnterPointType.SLOT]
  }
  update(nodes: Node[], newArgs: any[], oldArgs: any[]): DirectiveUpdateTag {
    if (newArgs[0] === oldArgs[0]) return DirectiveUpdateTag.UPDATE

    if (newArgs[0]) {
      return DirectiveUpdateTag.REPLACE
    }
    this.cacheNodes = nodes;
    return DirectiveUpdateTag.REMOVE
  }

  render(condition: boolean, tmplFn: TmplFn) {
    return condition ? tmplFn() : html``;
  }
}
export const ifTrue = directive<Parameters<typeof IfTrue.prototype.render>>(IfTrue);