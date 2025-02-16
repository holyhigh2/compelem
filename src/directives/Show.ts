import { isUndefined } from "myfx";
import { Directive } from "../directive/Directive";
import { EnterPoint, EnterPointType, directive } from "../directive/index";
import { DirectiveUpdateTag } from "../types";
type Cbk = (node: Element, isVisible: boolean) => void
/**
 * display的快捷指令
 * 如果
 * @param isvisible 是否显示
 */
class Show extends Directive {
  created(point: EnterPoint, isVisible: boolean, cbk?: Cbk): void {
    let el = point.startNode as HTMLElement;
    if (isUndefined(this.display)) {
      this.display = el.style.display;
    }
    let fn = cbk
    this.renderComponent.nextTick(() => {
      el.style.display = isVisible ? this.display! : 'none';
      if (fn) fn(el, isVisible)
    })
  }
  update(point: EnterPoint, newArgs: any[], oldArgs: any[]): DirectiveUpdateTag {
    this.created(point, newArgs[0], newArgs[1])
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
  render(isVisible: boolean, cbk?: Cbk) {

  }
}
export const show = directive<Parameters<typeof Show.prototype.render>>(Show);