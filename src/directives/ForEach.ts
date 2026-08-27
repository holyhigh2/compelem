import {
  each,
  isEmpty,
  isNil,
  isUndefined,
  keys,
  startsWith
} from "myfx";
import { CompElem } from "../CompElem";
import { directive } from "../directive/index";
import { buildVars } from "../render/render";
import { TemplateMeta } from "../render/TemplateMeta";
import { Collector, OBJECT_VAR_PATH, OBJECT_VAR_ROOT_PATH_IN_CONTEXT } from "../reactive";
import { DirectiveUpdateTag, EnterPointType, KeyFn, TplFn, UpdatedSource } from "../types";
import { showError } from "../utils";

const LastKeysMap = new WeakMap()

const EachTmplMap = new WeakMap()

//每项vars缓存（脏项局部更新用）
interface ForEachVarsCache {
  keys: string[]//缓存对应的key序列（与LastKeysMap中同一引用）
  varsPerItem: any[][]
  cross: boolean//模板存在跨项依赖（读取其他项/整组数组路径）时为true，禁用局部更新
}
const EachVarsMap = new WeakMap<object, ForEachVarsCache>()

/**
 * 解析本轮变更中属于数组元素内部路径（root.N[.field]）的脏项索引
 * 返回null表示无法解析（应回退全量路径）
 */
function parseDirtyIndices(updatedMap: Record<string, UpdatedSource> | undefined, root: string): Set<number> | null {
  if (!updatedMap) return null
  let keys = Object.keys(updatedMap)
  if (keys.length === 0) return null
  let rootPrefix = root + '.'
  let dirty = new Set<number>()
  for (let i = 0; i < keys.length; i++) {
    let k = keys[i]
    if (k === root || startsWith(root, k + '.')) {
      //root自身或其祖先路径：仅作为更深层变更的前缀副产物（end=false）时允许
      if (updatedMap[k].end) return null
      continue
    }
    if (!startsWith(k, rootPrefix)) return null
    let rest = k.slice(rootPrefix.length)
    let dotIdx = rest.indexOf('.')
    let nStr = dotIdx < 0 ? rest : rest.slice(0, dotIdx)
    let n = Number(nStr)
    if (!Number.isInteger(n) || n < 0 || String(n) !== nStr) return null
    dirty.add(n)
  }
  return dirty
}

/**
 * 获取数组的路径根：
 * - proxyRoot：reactive代理记录的路径（与依赖收集到的读取路径同命名空间，用于跨项检测）
 * - ctxRoot：变更通知中的路径根（数组跨组件传入时会被重映射为当前组件的属性名，用于脏项解析）
 * 数组非reactive代理时返回null
 */
function getContextRoots(aryOrObj: any, renderComponent: CompElem): { proxyRoot: string, ctxRoot: string } | null {
  let pathAry: Array<string> | undefined = OBJECT_VAR_PATH.get(aryOrObj)
  if (!pathAry || pathAry.length === 0) return null
  let proxyRoot = pathAry.join('.')
  let remap = OBJECT_VAR_ROOT_PATH_IN_CONTEXT.get(renderComponent)
  let first = remap?.[pathAry[0]]
  let ctxRoot = first !== undefined ? [first, ...pathAry.slice(1)].join('.') : proxyRoot
  return { proxyRoot, ctxRoot }
}

/**
 * 检测mark之后读取的路径中是否存在跨项依赖（读取其他项或整组数组的路径）
 * 存在时脏项外的渲染结果可能依赖脏项数据，必须禁用/放弃局部更新
 */
function detectCrossRead(mark: number, root: string, idx: number): boolean {
  let reads = Collector.__varPathList
  let self = root + '.' + idx
  for (let j = mark; j < reads.length; j++) {
    let p = reads[j]
    if (p === root || (startsWith(p, root + '.') && p !== self && !startsWith(p, self + '.'))) {
      return true
    }
  }
  return false
}

/**
 * 全量重建每项vars并构建缓存；处于依赖收集会话时同步进行跨项依赖检测
 */
function getVars(newAryOrObj: any, tmplFn: TplFn, renderComponent: CompElem, proxyRoot?: string, ctxRoot?: string, pointNode?: Node) {
  let varList: any[] = []
  let varsPerItem: any[][] = []
  let cross = false
  let tracking = proxyRoot !== undefined && Collector.__collecting
  let idx = 0
  each(newAryOrObj, (val, k) => {
    let mark = tracking ? Collector.__varPathList.length : 0
    let vars = buildVars(tmplFn.call(renderComponent, val, k))
    if (tracking && !cross) {
      cross = detectCrossRead(mark, proxyRoot!, idx)
    }
    varsPerItem.push(vars)
    varList.push(...vars)
    idx++
  })
  if (pointNode !== undefined && proxyRoot !== undefined && ctxRoot !== undefined) {
    if (tracking) {
      EachVarsMap.set(pointNode, { keys: LastKeysMap.get(pointNode) as string[], varsPerItem, cross })
    } else {
      //非收集会话（子视图路径）无法做跨项检测，缓存不可信
      EachVarsMap.delete(pointNode)
    }
  }
  return varList
}

/**
 * 循环节点指令
 * 1. 支持多根输出
 * 2. 
 */
export const forEach = directive(function ForEach(value: any[] | Record<string, any>, keyFn: KeyFn, tmpl: TplFn) {
  return (pointNode: Node, newArgs: any[], oldArgs: any[] | undefined, { renderComponent, updatedMap }: { renderComponent: CompElem, varChain: string[], updatedMap: Record<string, UpdatedSource> }) => {

    let newAryOrObj = newArgs[0]
    if (isEmpty(newAryOrObj) && isUndefined(oldArgs)) return [DirectiveUpdateTag.INIT]

    let oldKeys: string[] | undefined = LastKeysMap.get(pointNode)

    //快速路径：数组引用未变且本轮变更均为元素内部路径（root.N.xxx）时，非脏项key必然不变，
    //脏项key经下方显式校验（key字段变异/排序/增删导致不匹配时回退全量路径走UPDATE）
    //命中缓存时进一步只重建脏项模板vars
    if (oldArgs && oldKeys && !isEmpty(newAryOrObj) && oldArgs[0] === newAryOrObj) {
      let roots = getContextRoots(newAryOrObj, renderComponent)
      if (roots) {
        let dirty = parseDirtyIndices(updatedMap, roots.ctxRoot)
        if (dirty) {
          let ary = newAryOrObj as any[]
          //脏项key校验：key字段被就地修改时回退全量路径（走UPDATE做增删移）
          let keyChanged = false
          for (let n of dirty) {
            if (n >= ary.length) { keyChanged = true; break }
            let k = keyFn(ary[n], n, n)
            let sk = isNil(k) ? null : (typeof k === 'string' ? k : String(k))
            if (sk !== oldKeys[n]) { keyChanged = true; break }
          }
          if (!keyChanged) {
            let cache = EachVarsMap.get(pointNode)
            if (cache && cache.keys === oldKeys && !cache.cross && cache.varsPerItem.length === oldKeys.length) {
              //脏项局部更新：仅重建脏项vars，其余复用缓存
              let tracking = Collector.__collecting
              let flipped = false
              for (let n of dirty) {
                let mark = tracking ? Collector.__varPathList.length : 0
                cache.varsPerItem[n] = buildVars(tmpl.call(renderComponent, ary[n], n))
                if (tracking && !cache.cross && detectCrossRead(mark, roots.proxyRoot, n)) {
                  //重建过程中发现新的跨项依赖：本轮放弃局部结果，回退全量
                  cache.cross = true
                  flipped = true
                  break
                }
              }
              if (!flipped) {
                let varList: any[] = []
                for (let i = 0; i < cache.varsPerItem.length; i++) {
                  varList.push(...cache.varsPerItem[i])
                }
                return [DirectiveUpdateTag.REFRESH, varList]
              }
            }
            //key序列未变：跳过key计算直接REFRESH（getVars全量重建并刷新缓存）
            return [DirectiveUpdateTag.REFRESH, getVars(newAryOrObj, tmpl, renderComponent, roots.proxyRoot, roots.ctxRoot, pointNode)]
          }
        }
      }
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
        let roots = getContextRoots(newAryOrObj, renderComponent)
        return [DirectiveUpdateTag.REFRESH, roots
          ? getVars(newAryOrObj, tmpl, renderComponent, roots.proxyRoot, roots.ctxRoot, pointNode)
          : getVars(newAryOrObj, tmpl, renderComponent)]
      }
    }

    //key序列变化：结构更新，脏项缓存失效
    EachVarsMap.delete(pointNode)

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

function isStrictEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
