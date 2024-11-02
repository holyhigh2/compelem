import { isUndefined } from "myfx";
import { Directive } from "../directive/Directive";
import { EnterPoint, EnterPointType, directive } from "../directive/index";
import { DirectiveUpdateTag } from "../types";

/**
 * display的快捷指令
 * 如果
 * @param isvisible 是否显示
 */
class Show extends Directive {
  update(nodes: Node[], newArgs: any[], oldArgs: any[]): DirectiveUpdateTag {
    this.render(newArgs[0])
    return DirectiveUpdateTag.NONE
  }
  display: string | undefined = undefined;

  static get scopes(): EnterPointType[] {
    return [EnterPointType.TAG]
  }
  constructor(point: EnterPoint) {
    super();
    this.point = point
  }
  render(isVisible: boolean) {
    let el = this.point.startNode as HTMLElement;
    if (isUndefined(this.display)) {
      this.display = el.style.display;
    }
    this.renderComponent.nextTick(() => {
      el.style.display = isVisible ? this.display! : 'none';
    })

  }
}
export const show = directive<Parameters<typeof Show.prototype.render>>(Show);