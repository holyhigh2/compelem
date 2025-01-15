import {
  clone,
  isArray,
  isEmpty,
  isMatch,
  last,
  map,
  toArray,
  trim
} from "myfx";
import { EXP_KEY } from "../constants";
import { Directive } from "../directive/Directive";
import { EnterPoint, EnterPointType, directive } from "../directive/index";
import { Template } from "../render/Template";
import { DirectiveUpdateTag, TmplFn } from "../types";
import { showError } from "../utils";


/**
 * 循环列表并自动优化列表更新
 * foreach循环的只能是节点，且必须有key属性。非节点元素会被过滤掉
 * 使用序号作为key时可能会导致异常问题
 */
class ForEach extends Directive {
  created(point: EnterPoint, ...args: any): void {
  }
  update(point: EnterPoint, newArgs: any[], oldArgs: any[]): DirectiveUpdateTag {
    if (isEmpty(point.getNodes()) && (!newArgs || isEmpty(newArgs[0]))) return DirectiveUpdateTag.NONE
    if (isMatch(this.lastAry, newArgs[0]) && this.lastAry.length === newArgs[0].length) return DirectiveUpdateTag.NONE

    if (!isEmpty(this.renderParams)) {
      let rp = last(this.renderParams) as any
      if (!isArray(rp)) {
        rp = [rp]
      }
      this.renderParams = rp
    }

    this.lastAry = clone(newArgs[0])

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
  lastAry: any[] | Record<string, any[]>
  lastRenderTmpl: Template
  render(value: any[] | Record<string, any[]>, cbk: TmplFn) {

    //1. 产生模板
    let tmpls = map<any, any, Template>(value, (v, k) => {
      return cbk(v, k);
    });
    if (tmpls.length < 1) {
      this.lastRenderTmpl = new Template(
        [],
        []
      )
      return this.lastRenderTmpl
    }
    //2. 检查 & 合并模板
    let keyAry: string[] = [];
    let strs: string[] = [];
    const combStrings = []
    const combVars = []
    for (let l = 0; l < tmpls.length; l++) {
      const tmpl = tmpls[l];
      let lastStr = last(strs);
      let vars = tmpl.vars;
      let hasNoKey = true;
      let tmplStrs = tmpl.strings
      for (let i = 0; i < tmplStrs.length; i++) {
        const str = tmplStrs[i];
        if (EXP_KEY.test(str)) {
          let key = vars[i] + ''

          if (keyAry.includes(key)) {
            showError(`forEach - duplicate key '${key}'`)
            return
          }
          keyAry.push(key);
          hasNoKey = false;
        }
        if (i == 0 && lastStr) {
          strs[strs.length - 1] = lastStr + str;
          continue;
        }
        strs.push(str);
      }
      if (hasNoKey) {
        showError("forEach - missing 'key' prop")
        return
      }
      let lastVar = last(combStrings) as string
      if (lastVar && tmplStrs.length > 0) {
        combStrings[combStrings.length - 1] = trim(lastVar) + tmplStrs.shift()
      }
      combStrings.push('')
      combVars.push(tmpl)
    }

    this.lastAry = clone(value)

    combStrings.push('')
    this.lastRenderTmpl = new Template(
      combStrings,
      combVars
    )
    return this.lastRenderTmpl
  }
}
export const forEach = directive<Parameters<typeof ForEach.prototype.render>>(ForEach);
