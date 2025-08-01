import { compact, concat, each, flatMap, isArray, isObject, isString } from "myfx";
import { Directive } from "../directive/Directive";
import { EnterPoint, EnterPointType, directive } from "../directive/index";
import { DirectiveUpdateTag } from "../types";
let ClassSn = 0
/**
 * 根据变量内容自动插入class，仅能用于class属性
 * @param styles 对象/数组/字符串
 */
class Classes extends Directive {
  created(point: EnterPoint, clazz: Record<string, boolean | string> | Array<string> | string): void {
    let rs: string[] = [];
    if (isArray(clazz)) {
      rs = compact(clazz)
    } else if (isObject(clazz)) {
      rs = flatMap<any, string, string>(clazz, (v, k) => v ? k : [])
    } else if (isString(clazz)) {
      rs = clazz.split(' ')
    }
    let el = point.startNode as HTMLElement

    this.renderComponent.nextTick(() => {
      each(this.lastCls, cls => {
        el.classList.remove(cls)
      })
      each(rs, cls => {
        el.classList.add(cls)
      })

      this.lastCls = concat(rs);
    }, this.classId)
  }
  update(point: EnterPoint, newArgs: any[], oldArgs: any[]): DirectiveUpdateTag {
    this.created(point, newArgs[0])
    return DirectiveUpdateTag.NONE
  }
  constructor(point: EnterPoint) {
    super();
    this.classId = 'class_d' + ClassSn++
  }

  static get scopes(): EnterPointType[] {
    return [EnterPointType.CLASS]
  }

  lastCls: string[]
  render(clazz: Record<string, boolean | string> | Array<string> | string) {

  }
}
export const classes = directive<Parameters<typeof Classes.prototype.render>>(Classes);