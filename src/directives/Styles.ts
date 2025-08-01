import { Directive } from "../directive/Directive";
import { EnterPoint, EnterPointType, directive } from "../directive/index";
import { CssHelper } from "../helpers";
import { DirectiveUpdateTag } from "../types";
let StyleSn = 0
/**
 * 根据变量内容自动插入class，仅能用于style属性
 * @param styles 对象/字符串
 */
class Styles extends Directive {
  created(point: EnterPoint, styles: Record<string, string> | string): void {
    let el = point.startNode as HTMLElement;

    this.renderComponent.nextTick(() => {
      CssHelper.setStyle(styles, el)
    }, this.styleId)

  }
  update(point: EnterPoint, newArgs: any[], oldArgs: any[]): DirectiveUpdateTag {
    this.created(point, newArgs[0])
    return DirectiveUpdateTag.NONE
  }
  constructor(point: EnterPoint) {
    super();
    this.point = point
    this.styleId = 'style_d' + StyleSn++
  }
  static get scopes(): EnterPointType[] {
    return [EnterPointType.STYLE]
  }
  render(styles: Record<string, string> | string) {

  }
}
export const styles = directive<Parameters<typeof Styles.prototype.render>>(Styles);