import { each, isObject, isString, join, kebabCase, map, trim } from "myfx";
import { Directive } from "../directive/Directive";
import { EnterPoint, EnterPointType, directive } from "../directive/index";
import { DirectiveUpdateTag } from "../types";

/**
 * 根据变量内容自动插入class，仅能用于style属性
 * @param styles 对象/字符串
 */
class Styles extends Directive {
  update(nodes: Node[], newArgs: any[], oldArgs: any[]): DirectiveUpdateTag {
    this.render(newArgs[0])
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
    let rs = '';
    if (isObject(styles)) {
      rs = join(map(styles, (v, k: string) => kebabCase(k) + ":" + v), ';')
    } else if (isString(styles)) {
      rs = styles
    }
    each(rs.split(';'), prop => {
      let kv = prop.split(':');
      (<HTMLElement>this.point.startNode).style.setProperty(trim(kv[0]), trim(kv[1]));
    })
  }
}
export const styles = directive<Parameters<typeof Styles.prototype.render>>(Styles);