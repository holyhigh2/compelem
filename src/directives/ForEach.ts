import {
  clone,
  isEmpty,
  isMatch,
  last,
  map,
  trim
} from "myfx";
import { EXP_KEY } from "../constants";
import { EnterPoint, directive } from "../directive/index";
import { Template } from "../render/Template";
import { DirectiveUpdateTag, EnterPointType, TmplFn } from "../types";
import { showError } from "../utils";

const LastValueMap = new Map()
const LastTmplMap = new Map()
/**
 * 循环列表并自动优化列表更新
 * foreach循环的只能是节点，且必须有key属性。非节点元素会被过滤掉
 * 使用序号作为key时可能会导致异常问题
 */
export const forEach = directive(function ForEach(value: any[] | Record<string, any>, cbk: TmplFn) {
  return (point: EnterPoint, newArgs: any[], oldArgs: any[] | undefined, { varChain }: { varChain: string[][] }) => {
    let el = point.startNode
    let lastRenderTmpl = comboTmpl(newArgs[0], cbk, el)
    if (oldArgs && oldArgs[0]) {
      //更新
      const lastAry = LastValueMap.get(el)
      // const lastRenderTmpl = LastTmplMap.get(el)
      if (isEmpty(point.getNodes()) && (!newArgs || isEmpty(newArgs[0]))) return [DirectiveUpdateTag.NONE, lastRenderTmpl]
      if (lastAry && isMatch(lastAry, newArgs[0]) && lastAry.length === newArgs[0].length) return [DirectiveUpdateTag.NONE, lastRenderTmpl]
    }

    LastValueMap.set(el, clone(newArgs[0]))

    if (oldArgs) {
      return [DirectiveUpdateTag.UPDATE, lastRenderTmpl]
    }
    return [DirectiveUpdateTag.APPEND, lastRenderTmpl]
  };
}, [EnterPointType.TEXT, EnterPointType.SLOT])

function comboTmpl(value: any[] | Record<string, any>, cbk: TmplFn, el: Node) {
  //1. 产生模板
  let tmpls = map<any, any, Template>(value, (v, k) => {
    return cbk(v, k);
  });
  if (tmpls.length < 1) {
    let lastRenderTmpl = new Template(
      [],
      []
    )
    LastTmplMap.set(el, lastRenderTmpl)
    return lastRenderTmpl
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

  combStrings.push('')
  let lastRenderTmpl = new Template(
    combStrings,
    combVars
  )
  LastTmplMap.set(el, lastRenderTmpl)
  return lastRenderTmpl
}