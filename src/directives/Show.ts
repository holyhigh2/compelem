import { isUndefined } from "myfx";
import { Directive } from "../directive/Directive";
import { EnterPoint, EnterPointType, directive } from "../directive/index";
import { DirectiveUpdateTag } from "../types";
type Cbk = (node: Element, isVisible: boolean) => void
let ShowSn = 0
/**
 * display的快捷指令
 * 如果
 * @param isvisible 是否显示
 * @param cbk 显示状态变更后调用的回调函数
 */
class Show extends Directive {
  created(point: EnterPoint, isVisible: boolean, cbk?: Cbk): void {
    let el = point.startNode as HTMLElement;
    if (isUndefined(this.display)) {
      this.display = el.style.display;
    }
    this.point = point
    this.cbk = cbk
    this.visible = isVisible

    this.renderComponent.nextTick(this.doChange, this.showId)
  }
  visible: boolean
  cbk?: Cbk
  doChange() {
    let el = this.point.startNode as HTMLElement;
    el.style.display = this.visible ? this.display! : 'none';
    if (this.cbk) this.cbk(el, this.visible)
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
    this.doChange = this.doChange.bind(this)
    this.showId = 'show_d' + ShowSn++
  }
  render(isVisible: boolean, cbk?: Cbk) {

  }
}
export const show = directive<Parameters<typeof Show.prototype.render>>(Show);