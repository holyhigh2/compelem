import {
  isArray,
  isEmpty,
  last,
  map,
  toArray
} from "myfx";
import { Directive } from "../directive/Directive";
import { EnterPoint, EnterPointType, directive } from "../directive/index";
import { Template } from "../render/render";
import { DirectiveUpdateTag, TmplFn } from "../types";
import { showError } from "../utils";

const EXP_KEY = /\s+\.?key\s*=/;
/**
 * 循环列表并自动优化列表更新
 * foreach循环的只能是节点，且必须有key属性。非节点元素会被过滤掉
 * 使用序号作为key时可能会导致异常问题
 */
class ForEach extends Directive {
  update(nodes: Node[], newArgs: any[], oldArgs: any[]): DirectiveUpdateTag {
    if (isEmpty(nodes) && isEmpty(newArgs[0])) return DirectiveUpdateTag.NONE

    if (!isEmpty(this.renderParams)) {
      let rp = last(this.renderParams) as any
      if (!isArray(rp)) {
        rp = [rp]
      }
      this.renderParams = rp
    }


    return DirectiveUpdateTag.UPDATE

  }
  constructor(point: EnterPoint) {
    super();
    if (!isEmpty(this.renderParams))
      this.renderParams = toArray(last(this.renderParams))
  }

  static get scopes(): EnterPointType[] {
    return [EnterPointType.TEXT, EnterPointType.SLOT];
  }
  render(value: any[] | Record<string, any[]>, cbk: TmplFn) {
    //1. 产生模板
    let tmpls = map<any, any, Template>(value, (v, k) => {
      return cbk(v, k);
    });
    //2. 合并模板
    let keyAry: string[] = [];
    let strs: string[] = [];
    tmpls.forEach((tmpl) => {
      let lastStr = last(strs);
      let vars = tmpl.vars;
      let hasNoKey = true;
      tmpl.strings.forEach((str, i) => {
        if (EXP_KEY.test(str)) {
          let key = vars[i] + ''

          if (keyAry.includes(key)) {
            showError(`forEach - duplicate key '${key}'`)
          }
          keyAry.push(key);
          hasNoKey = false;
        }
        if (i == 0 && lastStr) {
          strs[strs.length - 1] = lastStr + str;
          return;
        }
        strs.push(str);
      });
      if (hasNoKey) {
        showError("forEach - missing 'key' prop")
      }
    });

    return tmpls
  }
}
export const forEach = directive<Parameters<typeof ForEach.prototype.render>>(ForEach);
