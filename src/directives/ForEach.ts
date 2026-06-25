import {
  endsWith,
  get,
  keys,
  last,
  map,
  size,
  trim
} from "myfx";
import { EXP_KEY } from "../constants";
import { directive } from "../directive/index";
import { Template } from "../render/Template";
import { DirectiveUpdateTag, EnterPointType, TmplFn, UpdatedSource } from "../types";
import { showError } from "../utils";

const LastTmplMap = new WeakMap()

/**
 * 循环列表并自动优化列表更新
 * foreach循环的只能是节点，且必须有key属性。非节点元素会被过滤掉
 * 使用序号作为key时可能会导致异常问题
 */
export const forEach = directive(function ForEach(value: any[] | Record<string, any>, cbk: TmplFn) {
  return (pointNode: Node, newArgs: any[], oldArgs: any[] | undefined, { varChain, updatedMap }: { varChain: string[], updatedMap: Record<string, UpdatedSource> }) => {
    let el = pointNode
    let lastRenderTmpl = comboTmpl(newArgs[0], newArgs[1], el)
    if (oldArgs && oldArgs[0] && size(newArgs[0]) === size(oldArgs[0])) {
      //更新

      let updatedKey = keys(updatedMap).find(k => endsWith(k, last(varChain)))
      if (updatedKey && get(updatedMap, [updatedKey!, 'end'], true)) {
        const lastRenderTmpl = LastTmplMap.get(el)
        return [DirectiveUpdateTag.NONE, lastRenderTmpl]
      }
    }

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