import { Directive } from "../directive/Directive";
import { EnterPoint, EnterPointType, directive } from "../directive/index";
import { CssHelper } from "../helpers";
import { DirectiveUpdateTag } from "../types";

/**
 * 根据变量内容自动插入class，仅能用于style属性
 * @param styles 对象/字符串
 */
class Styles extends Directive {
  created(point: EnterPoint, styles: Record<string, string> | string): void {
    CssHelper.setStyle(styles, point.startNode as HTMLElement)
  }
  update(point: EnterPoint, newArgs: any[], oldArgs: any[]): DirectiveUpdateTag {
    this.created(point, newArgs[0])
    return DirectiveUpdateTag.NONE
  }
  constructor(point: EnterPoint) {
    super();
    this.point = point
  }
  static get scopes(): EnterPointType[] {
    return [EnterPointType.STYLE]
  }
  render(styles: Record<string, string> | string) {

  }
}
export const styles = directive<Parameters<typeof Styles.prototype.render>>(Styles);