import { each, except, first, get, groupBy, initial, isArray, isEmpty, keys, last, map, set, startsWith, test, toArray } from "myfx";
import { CompElem } from "../CompElem";
import { DirectiveScopeMap } from "../constants";
import { bindEvents } from "../events/event";
import { commitRemove } from "../render/commitRemove";
import { buildSubTemplate, getSubFx, insertSubView, registerSubViewEffects, renderTemplate, rerunSubViewEffects } from "../render/render";
import { UpdatePoint } from "../render/UpdatePoint";
import { resolveVarChain } from "../render/UpdatePointMeta";
import { batch, signal } from "../signal";
import { DirectiveExecutor, DirectiveInstance, DirectiveUpdateTag, EnterPointType, UpdatedSource } from "../types";
import { showTagError } from "../utils";

enum MovePositionType {
  AFTER_BEGIN = 'afterbegin'
}

type MovePosition = { refKey: string, newKey: string, refNew: boolean }
type AddPostion = { refKey: string, newKey: string, fragment?: DocumentFragment }

function groupAddNodes(adds: Record<string, any>[]) {
  let addGroup: Record<string, any>[] = []
  let lastKey: string
  adds.forEach(add => {
    let lastAdd = last(addGroup)
    if (lastAdd) {
      if (lastKey === add.refKey) {
        if (!lastAdd.group) {
          lastAdd.group = [lastAdd.fragment]
        }
        lastAdd.group.push(add.fragment)
      } else {
        addGroup.push(add)
      }
    } else {
      addGroup.push(add)
    }

    lastKey = add.newKey
  })

  return addGroup
}

/**
 * 结构指令分派入口
 */
export function execDir(comp: CompElem<any>, _dirType: string, node: Node, nv: any, ov: any, inst?: DirectiveInstance) {
  const entry = (comp as any).__dirNodeMap?.get(node)
  if (!entry) return

  let up = entry
  if (Array.isArray(entry)) {
    const di = inst?.[2]
    up = di !== undefined ? entry.find((u: any) => u.value?.[2] === di) ?? entry[entry.length - 1] : entry[entry.length - 1]
  }
  const real = inst ?? (up.value as DirectiveInstance | undefined)
  if (!real || !Array.isArray(real) || !Array.isArray(real[1])) return
  const [executor, args, diFn] = real
  const varChain = resolveVarChain(up.metaInfo)
  // 只换集合，keyFn / tmplFn 原样保留
  const newArgs = args.slice()
  newArgs[0] = nv
  // 旧集合：effect 首次运行时 ov 为 undefined，此时用挂载时的原始集合
  const oldArgs = args.slice()
  oldArgs[0] = ov === undefined ? args[0] : ov
  updateDir(comp, up, newArgs, oldArgs, executor, diFn, varChain)
}

/**
 * 编译期 directive 分派辅助
 */
export function updateDir(comp: CompElem<any>, up: UpdatePoint, newArgs: any[], oldArgs: any[] | undefined, executor: any, diFn: Function, varChain: string[], ru?: Set<UpdatePoint>, ch?: any): void {
  const slotComponent = up.getSlotComponent(comp)
  const updated = updateDirective(
    diFn,
    up.node!,
    newArgs,
    oldArgs,
    executor,
    comp as any,
    slotComponent,
    varChain,
    up,
    ch,
  )

  const rv = (up as any).__refreshVars
  if (rv) {
    (up as any).__refreshVars = undefined
      ; (up as any).__renderedTmpl = rv
    rerunSubViewEffects(up)
  }
  if (updated) ru?.delete(up)
}

/**
 * 指令执行入口
 */
export function updateDirective(diFn: Function, pointNode: Node, newArgs: any[], oldArgs: any[] | undefined, executor: DirectiveExecutor, renderComponent: CompElem, slotComponent: CompElem, varChain: string[], up: UpdatePoint, updatedMap?: Record<string, UpdatedSource>) {
  let rs
  let scopes = DirectiveScopeMap.get(diFn)
  let pointType = scopes ? scopes[0] : ''
  rs = executor(pointNode, newArgs, oldArgs, { renderComponent, slotComponent, varChain, updatedMap, up, pointType })

  if (!rs) return

  let [tag, tmplM, newKeys, oldKeys, tmplFn, newAryOrObj] = rs

  if (tag === DirectiveUpdateTag.NONE) return
  if (tag === DirectiveUpdateTag.REFRESH) {
    if (rs.length >= 4 && Array.isArray(rs[2]) && Array.isArray(rs[3]) && up.subCells !== undefined) {
      const nk = rs[2] as string[]
      const nv = rs[3] as any[]
      const cells = up.subCells
      // 整批一次 flush：逐项写会在 flush 外部时变成 N 轮同步 flush
      batch(() => {
        for (let ci = 0; ci < nk.length; ci++) {
          const c = cells[nk[ci]]
          if (c !== undefined && ci < nv.length) c.value = nv[ci]
        }
      })
      return true
    }
    ; (up as any).__refreshVars = rs[1]
    return true
  }

  let newValueAry = newAryOrObj
  if (!isArray(newAryOrObj)) {
    newValueAry = map(newAryOrObj, (v, k) => v)
  }

  //以下两个值在结构初始化（insertSubView标记）后保持不变，缓存到更新点避免每次扫描节点属性
  let subViewId = up.__subViewId
  if (subViewId === undefined) {
    subViewId = up.__subViewId = get(pointNode, '__anchor__')
  }
  let parentViewsIdMap = up.__parentViewsIdMap
  if (parentViewsIdMap === undefined) {
    parentViewsIdMap = up.__parentViewsIdMap = {}
    each(keys<string>(pointNode), k => {
      if (k === '__anchor__') return
      if (!startsWith(k, '__c-')) return
      parentViewsIdMap![k] = get(pointNode, [k])
    })
  }
  let subViewRootNodes = up.subViewRootNodes

  let updatePoints = up.children!
  if (tag === DirectiveUpdateTag.REMOVE) {
    let nodes: Node[] = []
    each(subViewRootNodes, (nodeAry: any) => {
      if (isArray(nodeAry)) {
        each(nodeAry, (n: any) => nodes.push(n))
      } else {
        nodes.push(nodeAry)
      }
    })
    let oldUps: UpdatePoint[] = updatePoints ? toArray(updatePoints) : []
    up.subViewRootNodes = isArray(subViewRootNodes) ? [] : {}
    up.children = []
    commitRemove(nodes, oldUps, renderComponent)

  } else if (tag === DirectiveUpdateTag.REPLACE) {
    let oldNodes: Node[] = []
    each(subViewRootNodes as any[], (n: any) => oldNodes.push(n))
    let oldUps: UpdatePoint[] = updatePoints ? toArray(updatePoints) : []
    up.children = []
    up.subViewRootNodes = isArray(subViewRootNodes) ? [] : {}
    //构造新DOM
    let [, tmplFn, tmplM] = rs

    commitRemove(oldNodes, oldUps, renderComponent)
    insertSubView(pointNode, up, tmplFn, tmplM, renderComponent)

  } else if (tag === DirectiveUpdateTag.UPDATE) {
    if (isEmpty(subViewRootNodes)) {
      insertSubView(pointNode, up, tmplFn, tmplM, renderComponent, newAryOrObj, (v, k, i) => newKeys[i])
      return
    }

    let keyProp = '__c-' + subViewId

    let oldNodeKeyMap: Record<string, Node[]> = {}
    let oldUpKeyMap: Record<string, UpdatePoint[]> = {}

    if (isArray(subViewRootNodes)) {
      let siblings = pointNode.parentElement!.childNodes
      for (let si = 0; si < siblings.length; si++) {
        let sib: any = siblings[si]
        let sibKey = sib[keyProp]
        if (sibKey != null) {
          let ary = oldNodeKeyMap[sibKey]
          if (!ary) {
            ary = oldNodeKeyMap[sibKey] = []
          }
          ary.push(sib)
        }
      }
    } else {
      each(subViewRootNodes as Record<string, Node[]>, (nodes: Node[], k: string) => {
        if (nodes !== undefined) oldNodeKeyMap[k] = nodes
      })
    }
    up.children?.forEach(up => {
      if (!oldUpKeyMap[up.key]) {
        oldUpKeyMap[up.key] = [up]
      } else {
        oldUpKeyMap[up.key].push(up)
      }
    })

    let oldSeq = oldKeys as string[]
    let newSeq = newKeys as string[]
    let oldSeqMap = new Map<string, number>()
    let newSeqMap = new Map<string, number>()
    oldSeq.forEach((v, i) => {
      oldSeqMap.set(v, i)
    })
    newSeq.forEach((v, i) => {
      newSeqMap.set(v, i)
    })

    const oldUsed = new Uint8Array(oldSeq.length)
    const sameKeysArr: string[] = []
    for (let i = 0; i < newSeq.length; i++) {
      const idx = oldSeqMap.get(newSeq[i])
      if (idx !== undefined) {
        oldUsed[idx] = 1
        sameKeysArr.push(newSeq[i])
      }
    }
    const delKeysArr: string[] = []
    for (let i = 0; i < oldSeq.length; i++) {
      if (!oldUsed[i]) {
        delKeysArr.push(oldSeq[i])
      }
    }

    //compare
    let adds: AddPostion[] = [];
    let moveAfterAddGroups: MovePosition[][] = []
    //move
    let moved = false
    if (!isEmpty(newSeq)) {
      let lastMoveIndex = -1
      let lastGroup: MovePosition[] = []
      let moveQueue: { moveGroup: MovePosition[], moveIndex: number }[] = []
      let edgeOffset = 0
      let i = 0
      for (; i < newSeq.length; i++) {
        const newKey = newSeq[i];
        let oldI = oldSeqMap.get(newKey) ?? -1
        if (oldI < 0) {
          let prevKey = newSeq[i - 1]
          //add
          oldNodeKeyMap[newKey] = []
          adds.push({ refKey: prevKey, newKey });
          edgeOffset++
          continue
        }
        if (oldI > -1 && oldI !== (i - edgeOffset)) {
          if (lastMoveIndex < 0 || Math.abs(lastMoveIndex - oldI) === 1) {
            let lastEl = last(lastGroup)
            let refKey = i === 0 ? MovePositionType.AFTER_BEGIN : (lastEl ? lastEl.newKey : newSeq[i - 1])
            let refNew = false
            if (i !== 0 && isEmpty(oldNodeKeyMap[refKey])) {
              refNew = true
            }
            lastGroup.push({ newKey, refKey, refNew })
          } else {
            moveQueue.push({ moveGroup: lastGroup, moveIndex: i + lastGroup.length })

            let refKey = newSeq[i - 1]
            let refNew = false
            if (isEmpty(oldNodeKeyMap[refKey])) {
              refNew = true
            }
            lastGroup = []
            lastGroup.push({ newKey, refKey, refNew })
          }
          lastMoveIndex = oldI
        }
      }

      if (lastGroup.length > 0) {
        moveQueue.push({ moveGroup: lastGroup, moveIndex: i + lastGroup.length })
      }

      if (moveQueue.length > 0) {
        moved = true
        let vals = moveQueue.sort((a, b) => a.moveGroup.length - b.moveGroup.length)
        if (vals.length < 2) {
          let { moveGroup } = vals[0]
          if (moveGroup.length > 1) {
            let lastTId = last(moveGroup).refKey
            if (moveGroup[moveGroup.length - 2].newKey === lastTId) {
              moveGroup = initial(moveGroup)
            }
          }
          moveGroupNodes(moveGroup, oldNodeKeyMap, oldKeys)
        } else {
          //注意：不可按「相邻moveIndex」丢弃组——单项反转（如[1,2,3]→[3,2,1]产生两个moveIndex相邻的
          //单元素组）会被误删导致后半组节点永不移动（实测 sort/下标互换渲染错乱）
          vals.forEach(({ moveGroup }) => {
            if (moveGroup[0].refNew) {
              moveAfterAddGroups.push(moveGroup)
              return
            }
            moveGroupNodes(moveGroup, oldNodeKeyMap, oldKeys)
          })
        }
      }//endif
    }

    //add
    let addGroup
    if (adds.length > 0) {
      adds.forEach(add => {
        let i = newSeqMap.get(add.newKey) ?? -1
        let val = newValueAry[i]
        const built = buildSubTemplate(renderComponent, tmplFn)
        const subFx = getSubFx(renderComponent, tmplFn)
        // 子模板取值一律走 fx
        const [rs, upAry] = renderTemplate(renderComponent, tmplM, built, { deferValueFill: true, fx: subFx, itemArgs: [val, add.newKey, i] })

        const cell = signal(val)
          ; (up.subCells ??= {})[add.newKey] = cell
        registerSubViewEffects(renderComponent, tmplFn, cell, add.newKey, i, (built?.nodes ?? []) as Node[], upAry, () => (up.value as any)?.[1]?.[2])
        add.fragment = rs
        each(upAry, nUp => {
          nUp.key = add.newKey
          nUp.parent = up
          up.children?.push(nUp)
        })

        let addNodes = toArray(rs.childNodes)
        //for afterAdd move
        let ary = oldNodeKeyMap[add.newKey]

        let newKeyStr = add.newKey + ''
        each(addNodes, (n: any) => {
          ary.push(n)
          set(n, '__c-' + subViewId, newKeyStr)
          each(parentViewsIdMap, (v, pid) => set(n, pid, v))
        })
      })
      bindEvents(renderComponent)
      addGroup = groupAddNodes(adds)

      addGroup.forEach((v, i) => {
        let treeNode = v.fragment
        let nodes = oldNodeKeyMap[v.refKey ?? oldKeys[0]]
        let refFirstNode = first(nodes) as Element
        let refLastNode = last(nodes) as Element

        if (v.group) {
          let fragment = document.createDocumentFragment()
          fragment.append(...v.group)
          treeNode = fragment as any
        }

        if (refFirstNode === pointNode) {
          refFirstNode.before(treeNode)
        } else if (!v.refKey) {
          refFirstNode.before(treeNode)
        } else if (typeof refFirstNode === 'string') {
          // newNodeMap[prevNode].after(treeNode)
        } else {
          refLastNode.after(treeNode)
        }
      })

    }

    //afterAdd move
    each(moveAfterAddGroups, moveGroup => {
      moveGroupNodes(moveGroup, oldNodeKeyMap, oldKeys)
    })

    //del
    const delCells = up.subCells
    if (delCells !== undefined) {
      for (let di = 0; di < delKeysArr.length; di++) delete delCells[delKeysArr[di]]
    }
    delKeysArr.forEach(k => {
      commitRemove(oldNodeKeyMap[k] || [], oldUpKeyMap[k] || [], renderComponent)
    })

    //移动顺序
    if (moved || delKeysArr.length > 0 || addGroup) {
      const upGroup = groupBy<UpdatePoint>(updatePoints, up => up.key)
      let movedUpAry: UpdatePoint[] = []
      let i = 0
      newSeq.forEach(nk => {
        upGroup[nk] && upGroup[nk].forEach((up) => {
          up.varIndex = i++
          movedUpAry.push(up)
        })
      })

      if (movedUpAry.length !== updatePoints.length) {
        const redundant = except<UpdatePoint>(updatePoints, movedUpAry)
        redundant.forEach(up => up.destroy(renderComponent))
      }
      up.children = movedUpAry
    }
    //更新rootNodes
    if (moved || delKeysArr.length > 0 || addGroup) {
      let rootNodes: Record<string, any> = {}
      each(newValueAry, (val: any, i: number) => {
        let newK = newKeys[i]
        let nodes = oldNodeKeyMap[newK]
        rootNodes![newK] = nodes
      })
      up.subViewRootNodes = rootNodes
    }

    const cells = up.subCells
    if (cells !== undefined && newKeys.length > 0) {
      // 同上：一次 flush 落盘全部 cell，而不是 N 次
      batch(() => {
        for (let ci = 0; ci < newKeys.length; ci++) {
          const c = cells[newKeys[ci]]
          if (c !== undefined) c.value = newValueAry[ci]
        }
      })
    }
  }
  return true
}

function moveGroupNodes(moveGroup: MovePosition[], oldNodeKeyMap: Record<string, Node[]>, oldKeys: string[]) {
  moveGroup.forEach(({ refKey, newKey }) => {
    let moveNodes = oldNodeKeyMap[newKey]!
    if (refKey === MovePositionType.AFTER_BEGIN) {
      let nodes = oldNodeKeyMap[oldKeys[0]]
      let refNode = first(nodes) as Element
      refNode.before(...moveNodes)
    } else if (oldNodeKeyMap[refKey]) {
      let nodes = oldNodeKeyMap[refKey]
      let refNode = last(nodes) as Element
      refNode?.after(...moveNodes)
    }
  })
}

/**
 * 返回指令调用函数
 * @param di
 * @returns
 */
export function directive<T extends Array<any>>(
  fn: (...args: T) => DirectiveExecutor,
  scopes: EnterPointType[]
): (...args: T) => DirectiveInstance {

  DirectiveScopeMap.set(fn, scopes)
  return (...args: T) => {
    let executor = fn(...args)
    return [executor as any, args, fn]
  }
}

export function directiveScopeChecker(diFn: Function, scopeType: string, tagName: string) {
  let scopes = DirectiveScopeMap.get(diFn)!
  //校验scope
  if (!process.env.DEV) return
  if (!isEmpty(scopes) && !test(scopes.join(','), scopeType)) {
    showTagError(tagName, `Directive '${diFn.name}' is out of scopes, expect '${scopes.join(',')}' bug got '${scopeType}'`);
    return;
  }
}