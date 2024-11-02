import { each } from "myfx";
import { EnterPoint, EnterPointType, directive } from "../directive/index";
import { Directive } from "../directive/Directive";
import { CompElem } from "../CompElem";
import { DirectiveUpdateTag } from "../types";
const Ignores = ['key']
/**
 * 绑定属性到节点上，如果节点是组件会使用in操作符判断是否props
 * @param styles 对象/数组/字符串
 */
class Bind extends Directive {
  update(nodes: Node[], newArgs: any[], oldArgs: any[]): DirectiveUpdateTag {
    return DirectiveUpdateTag.NONE
  }
  static get scopes(): EnterPointType[] {
    return [EnterPointType.TAG]
  }
  constructor(point: EnterPoint) {
    super();
    this.point = point
  }
  render(obj: Record<string, any>) {
    let el = this.point.startNode as HTMLElement
    if (el instanceof CompElem) {
      //判断是否prop
      let props: Record<string, any> = {};
      let attrs: Record<string, string> = {}
      each(obj, (v, k: string) => {
        if (Ignores.includes(k)) return;

        if (k in el) {
          props[k] = v;
        } else {
          attrs[k] = v + '';
        }
      })
      // el._setParentProps(props, attrs)
      el._initProps(props, attrs)
    } else {
      each(obj, (v, k: string) => {
        el.setAttribute(k, v)
      })
    }
  }
}
export const bind = directive<Parameters<typeof Bind.prototype.render>>(Bind);