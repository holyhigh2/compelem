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
import { DirectiveUpdateTag, EnterPointType, KeyFn, TplFn } from "../types";
import { showError } from "../utils";

const LastKeysMap = new WeakMap()

const EachTmplMap = new WeakMap()


/**
 * 循环节点指令
 * 1. 支持多根输出
 * 2. 
 */
export const forEach = directive(function ForEach(value: any[] | Record<string, any>, keyFn: KeyFn, tmpl: TplFn) {
  return (pointNode: Node, newArgs: any[], oldArgs: any[] | undefined, { renderComponent }: { renderComponent: CompElem, varChain: string[], up?: UpdatePoint }) => {
    let newAryOrObj = newArgs[0]
    if (isEmpty(newAryOrObj) && isUndefined(oldArgs)) return [DirectiveUpdateTag.INIT]

    let oldKeys: string[] | undefined = LastKeysMap.get(pointNode)

    // REFRESH 载荷附加
    const refreshWithCells = (keys: string[], vals: any[]): [DirectiveUpdateTag, ...any[]] => {
      // rs[1] 恒为 null：forEach 的 REFRESH 只走 cells 路径（keys + vals）。
      return [DirectiveUpdateTag.REFRESH, null, keys, vals]
    }

    const newKeys: string[] = [];
    const newVals: any[] = [];
    const checkSet = new Set<string>();
    let i = 0
    each(newAryOrObj, (v, k) => {
      let key = keyFn.call(renderComponent, v, k, i++)
      if (isNil(key)) {
        // nil key 无法参与 keyed diff：跳过该项（数据依赖，只能运行期诊断）
        if (process.env.DEV) {
          showError(`forEach - nil key, the item is skipped`)
        }
        return
      }
      const strKey = typeof key === 'string' ? key : String(key)

      if (checkSet.has(strKey)) {
        showError(`forEach - duplicate key '${strKey}', the later item is skipped`)
        return
      }
      checkSet.add(strKey)
      newKeys.push(strKey)
      newVals.push(v)
    })

    LastKeysMap.set(pointNode, newKeys)
    if (oldArgs) {
      if (isEmpty(newKeys)) return [DirectiveUpdateTag.REMOVE]
      if (oldKeys && newKeys.length === oldKeys.length && isStrictEqual(newKeys, oldKeys)) {
        // 只回写 cell
        return refreshWithCells(newKeys, newVals)
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
      return [DirectiveUpdateTag.UPDATE, tmplM, newKeys, oldKeys, tmplFn, newVals]
    }

    return [DirectiveUpdateTag.INIT, tmpl, tmplM, newVals, keyFn]
  };
}, [EnterPointType.TEXT, EnterPointType.SLOT])

function isStrictEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
