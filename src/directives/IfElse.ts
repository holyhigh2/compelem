import { Directive } from "../directive/Directive";
import { EnterPoint, EnterPointType, directive } from "../directive/index";
import { DirectiveUpdateTag, TmplFn } from "../types";

/**
 * 条件为真时返回参数1，否则返回参数2，仅能用于文本节点
 * @param condition 条件 
 * @param tmpl 模板
 */
class IfElse extends Directive {
  created(point: EnterPoint, ...args: any): void {
  }
  //todo 缓存后会导致缓存内容无法更新，需要按照新的结构修改后进行缓存
  ifNodes: Node[]
  elseNodes: Node[]
  static get scopes(): EnterPointType[] {
    return [EnterPointType.TEXT, EnterPointType.SLOT]
  }
  update(point: EnterPoint, newArgs: any[], oldArgs: any[]): DirectiveUpdateTag {
    if (!!newArgs[0] === !!oldArgs[0]) {
      return DirectiveUpdateTag.NONE
    }
    if (newArgs[0]) {
      //缓存else
      // if (isEmpty(this.elseNodes)) {
      //   this.elseNodes = concat(nodes)
      // }
      return DirectiveUpdateTag.REPLACE
    } else {
      //缓存if
      // if (isEmpty(this.ifNodes)) {
      //   this.ifNodes = concat(nodes)
      // }
      return DirectiveUpdateTag.REPLACE
    }
  }

  render(condition: boolean, tmplFn1: TmplFn, tmplFn2: TmplFn) {
    return condition ? tmplFn1(condition) : tmplFn2(condition)
  }
}
export const ifElse = directive<Parameters<typeof IfElse.prototype.render>>(IfElse);