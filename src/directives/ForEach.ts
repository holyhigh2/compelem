import {
  each,
  isEmpty,
  isNil,
  isUndefined,
  keys
} from "myfx";
import { CompElem } from "../CompElem";
import { directive } from "../directive/index";
import { buildVars } from "../render/render";
import { TemplateMeta } from "../render/TemplateMeta";
import { DirectiveUpdateTag, EnterPointType, KeyFn, TplFn, UpdatedSource } from "../types";
import { showError } from "../utils";

const LastKeysMap = new WeakMap()

const EachTmplMap = new WeakMap()

/**
 * 循环节点指令
 * 1. 支持多根输出
 * 2. 
 */
export const forEach = directive(function ForEach(value: any[] | Record<string, any>, keyFn: KeyFn, tmpl: TplFn) {
  return (pointNode: Node, newArgs: any[], oldArgs: any[] | undefined, { renderComponent, varChain, updatedMap }: { renderComponent: CompElem, varChain: string[], updatedMap: Record<string, UpdatedSource> }) => {

    let newAryOrObj = newArgs[0]
    if (isEmpty(newAryOrObj) && isUndefined(oldArgs)) return [DirectiveUpdateTag.INIT]
    const newKeys: string[] = [];
    const checkSet = new Set<string>();
    let i = 0
    each(newAryOrObj, (v, k) => {
      let key = keyFn(v, k, i++)
      if (isNil(key)) return
      const strKey = typeof key === 'string' ? key : String(key)

      if (checkSet.has(strKey)) {
        showError(`forEach - duplicate key in '${newKeys}'`)
        return
      }
      checkSet.add(strKey)
      newKeys.push(strKey)
    })

    let oldKeys = LastKeysMap.get(pointNode)
    LastKeysMap.set(pointNode, newKeys)
    if (oldArgs) {
      if (isEmpty(newKeys)) return [DirectiveUpdateTag.REMOVE]
      if (newKeys.length === oldKeys.length && isStrictEqual(newKeys, oldKeys)) return [DirectiveUpdateTag.REFRESH, getVars(newAryOrObj, tmpl, renderComponent)]
    }

    let tmplM
    let tmplFn = newArgs[2]
    if (!EachTmplMap.has(pointNode)) {
      let k = keys<any>(newAryOrObj)[0]
      let v = newAryOrObj[k]
      let tmpl = tmplFn.call(renderComponent, v, k, 0)
      tmplM = new TemplateMeta(tmpl, renderComponent)
      EachTmplMap.set(pointNode, tmplM)
    } else {
      tmplM = EachTmplMap.get(pointNode)
    }

    if (oldArgs) {
      return [DirectiveUpdateTag.UPDATE, tmplM, newKeys, oldKeys, tmplFn, newAryOrObj]
    }

    return [DirectiveUpdateTag.INIT, tmpl, tmplM, newAryOrObj, keyFn]
  };
}, [EnterPointType.TEXT, EnterPointType.SLOT])

function getVars(newAryOrObj: any, tmplFn: TplFn, renderComponent: CompElem) {
  let varList: any[] = []
  each(newAryOrObj, (val, i) => {
    let vars = buildVars(tmplFn.call(renderComponent, val, i))
    varList.push(...vars)
  })
  return varList
}
function isStrictEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}