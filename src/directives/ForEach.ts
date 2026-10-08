import {
  each,
  isEmpty,
  isNil,
  isUndefined
} from "myfx";
import { CompElem } from "../CompElem";
import { directive } from "../directive/index";
import { resolveSubTemplateMeta } from "../render/render";
import type { UpdatePoint } from "../render/UpdatePoint";
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
  return (pointNode: Node, newArgs: any[], oldArgs: any[] | undefined, { renderComponent, updatedMap, up }: { renderComponent: CompElem, varChain: string[], updatedMap: Record<string, UpdatedSource>, up?: UpdatePoint }) => {
    let newAryOrObj = newArgs[0]
    if (isEmpty(newAryOrObj) && isUndefined(oldArgs)) return [DirectiveUpdateTag.INIT]

    let oldKeys: string[] | undefined = LastKeysMap.get(pointNode)

    // REFRESH 载荷附加
    const refreshWithCells = (keys: string[], coll: any): [DirectiveUpdateTag, ...any[]] => {
      const vals: any[] = new Array(keys.length)
      let vi = 0
      each(coll, (v: any) => { if (vi < vals.length) vals[vi++] = v })
      // rs[1] 恒为 null：forEach 的 REFRESH 只走 cells 路径（keys + vals）。
      return [DirectiveUpdateTag.REFRESH, null, keys, vals]
    }


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

    LastKeysMap.set(pointNode, newKeys)
    if (oldArgs) {
      if (isEmpty(newKeys)) return [DirectiveUpdateTag.REMOVE]
      if (oldKeys && newKeys.length === oldKeys.length && isStrictEqual(newKeys, oldKeys)) {
        // 只回写 cell
        return refreshWithCells(newKeys, newAryOrObj)
      }
    }

    let tmplM
    let tmplFn = newArgs[2]
    if (!EachTmplMap.has(pointNode)) {
      // 结构指令子模板唯一来源 __ce_static__.subViews
      tmplM = resolveSubTemplateMeta(renderComponent, tmplFn)
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

function isStrictEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
