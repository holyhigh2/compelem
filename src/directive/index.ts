import { each, except, first, get, groupBy, initial, isArray, isEmpty, keys, last, map, set, startsWith, toArray } from "myfx";
import { CompElem } from "../CompElem";
import { DirectiveScopeMap } from "../constants";
import { bindEvents } from "../events/event";
import { commitRemove } from "../render/commitRemove";
import { buildSubTemplate, getSubFx, insertSubView, registerSubViewEffects, renderTemplate, rerunSubViewEffects } from "../render/render";
import { UpdatePoint } from "../render/UpdatePoint";
import { batch, signal } from "../signal";
import { DirectiveExecutor, DirectiveInstance, DirectiveUpdateTag, EnterPointType } from "../types";

enum MovePositionType {
  AFTER_BEGIN = 'afterbegin'
}

type MovePosition = { refKey: string, newKey: string, refNew: boolean }
type AddPostion = { refKey: string, newKey: string, fragment?: DocumentFragment }

/** 子项解析出的 tag，REFRESH 分支还要带 keys/vals */
type EachRs = [DirectiveUpdateTag, ...any[]]

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
 * 摘掉一个指令点当前挂着的子视图：收节点 + 收 UpdatePoint + 销毁
 */
function detachSubView(up: UpdatePoint, component: CompElem<any>) {
  const roots = up.subViewRootNodes
  const nodes: Node[] = []
  if (roots) {
    each(roots, (nodeAry: any) => {
      if (isArray(nodeAry)) {
        each(nodeAry, (n: any) => nodes.push(n))
      } else {
        nodes.push(nodeAry)
      }
    })
  }
  const oldUps: UpdatePoint[] = up.children ? toArray(up.children) : []
  up.subViewRootNodes = isArray(roots) ? [] : {}
  up.children = []
  commitRemove(nodes, oldUps, component)
}

/** 拆掉旧子视图，换成回调 `tmplFn` 的新子视图 */
function replaceSubView(pointNode: Node, up: UpdatePoint, tmplFn: any, tmplM: any, component: CompElem<any>) {
  detachSubView(up, component)
  insertSubView(pointNode, up, tmplFn, tmplM, component)
}

/** REFRESH：keys 未变时的快路径，只把新值回写进已有 cell，由 cell 的 effect 各自更新 DOM */
function writeCells(up: UpdatePoint, keys: string[], values: any[]) {
  const cells = up.subCells
  if (cells === undefined) return
  // 一次 flush 落盘全部 cell，而不是 N 次（逐项写会在 flush 外部时变成 N 轮同步 flush）
  batch(() => {
    for (let ci = 0; ci < keys.length; ci++) {
      const c = cells[keys[ci]]
      if (c !== undefined && ci < values.length) c.value = values[ci]
    }
  })
}

/** 把 executor 解出的「当前渲染的是哪个回调」记回 UpdatePoint，供子 effect 重跑时取用 */
function applyRefresh(up: UpdatePoint, tmplFn: any) {
  if (!tmplFn) return
    ; (up as any).__renderedTmpl = tmplFn
  rerunSubViewEffects(up)
}

/* ═══════════════════════ 指令点定位 ═══════════════════════ */

/**
 * 由锚点 DOM 找到它的 UpdatePoint。
 *
 * TAG 位指令（show/classes/styles/bind/model）可能与结构指令叠在同一元素上，
 * `__dirNodeMap` 的值因此是数组 —— 按 DirectiveInstance 里的 diFn 反查回自己那条。
 */
function resolveUp(comp: CompElem<any>, node: Node, inst?: DirectiveInstance): UpdatePoint | undefined {
  const entry = (comp as any).__dirNodeMap?.get(node)
  if (!entry) return undefined
  if (!Array.isArray(entry)) return entry
  const di = inst?.[2]
  if (di === undefined) return entry[entry.length - 1]
  return entry.find((u: any) => u.value?.[2] === di) ?? entry[entry.length - 1]
}

/** 造 executor 的新旧实参：只有第 0 位（条件 / 集合 / 匹配值）会变 */
function buildArgs(args: any[], nv: any, ov: any): [any[], any[]] {
  const newArgs = args.slice()
  newArgs[0] = nv
  const oldArgs = args.slice()
  // effect 首次运行时 ov 为 undefined，此时用挂载时的原始值
  oldArgs[0] = ov === undefined ? args[0] : ov
  return [newArgs, oldArgs]
}

/** 定位 + 造参 + 调 executor，返回 tag 载荷（executor 返回空则返回 null） */
function runExecutor(comp: CompElem<any>, node: Node, up: UpdatePoint, nv: any, ov: any, inst: DirectiveInstance, meta: any): any[] | null {
  const executor: DirectiveExecutor = inst[0]
  const [newArgs, oldArgs] = buildArgs(inst[1], nv, ov)
  const rs = executor(node, newArgs, oldArgs, { renderComponent: comp, up, ...meta }) as any[] | undefined
  if (!rs || rs.length === 0) return null
  return rs
}

/* ═══════════════════════ 三个入口 ═══════════════════════ */

/**
 * `forEach` 专用入口
 */
export function execEach(comp: CompElem<any>, node: Node, nv: any, ov: any, inst?: DirectiveInstance) {
  if (!inst) return
  const up = resolveUp(comp, node, inst)
  if (!up) return
  const rs = runExecutor(comp, node, up, nv, ov, inst, {}) as EachRs | null
  if (!rs) return
  switch (rs[0]) {
    case DirectiveUpdateTag.UPDATE:
      reconcileEach(node, up, rs, comp)
      return
    case DirectiveUpdateTag.REFRESH:
      // rs = [REFRESH, null, keys, vals]
      writeCells(up, rs[2], rs[3])
      return
    case DirectiveUpdateTag.REMOVE:
      detachSubView(up, comp)
      return
    default:
      // INIT / NONE：更新期不该出现（effect 只在值变化时进来），忽略
      return
  }
}

/**
 * 条件类指令专用入口：ifTrue / ifElse / when
 */
export function execCond(comp: CompElem<any>, node: Node, nv: any, ov: any, inst?: DirectiveInstance) {
  if (!inst) return
  const up = resolveUp(comp, node, inst)
  if (!up) return
  const rs = runExecutor(comp, node, up, nv, ov, inst, {}) as EachRs | null
  if (!rs) return
  switch (rs[0]) {
    case DirectiveUpdateTag.REFRESH:
      // rs = [REFRESH, tmplFn]
      applyRefresh(up, rs[1])
      return
    case DirectiveUpdateTag.REMOVE:
      detachSubView(up, comp)
      return
    case DirectiveUpdateTag.REPLACE: {
      // rs = [REPLACE, tmplFn, tmplM]
      const [, tmplFn, tmplM] = rs
      replaceSubView(node, up, tmplFn, tmplM, comp)
      return
    }
    default:
      return
  }
}

/**
 * 通用入口：TAG 位指令（show/classes/styles/bind/model）、`slot()`、
 * 以及第三方自定义指令
 */
export function execDir(comp: CompElem<any>, node: Node, nv: any, ov: any, inst?: DirectiveInstance) {
  if (!inst) return
  const up = resolveUp(comp, node, inst)
  if (!up) return

  const [executor, args, diFn] = inst
  const [newArgs, oldArgs] = buildArgs(args, nv, ov)
  const scopes = DirectiveScopeMap.get(diFn)
  const slotComponent = up.getSlotComponent(comp)
  const rs = executor(node, newArgs, oldArgs, {
    renderComponent: comp,
    slotComponent,
    varChain: up.metaInfo?.directiveVarChain,
    up,
    pointType: scopes ? scopes[0] : '',
  }) as any[] | undefined

  if (!rs || rs.length === 0) return
  switch (rs[0]) {
    case DirectiveUpdateTag.REFRESH:
      applyRefresh(up, rs[1])
      return
    case DirectiveUpdateTag.REMOVE:
      detachSubView(up, comp)
      return
    case DirectiveUpdateTag.REPLACE: {
      const [, tmplFn, tmplM] = rs
      replaceSubView(node, up, tmplFn, tmplM, comp)
      return
    }
    default:
      return
  }
}

/* ═══════════════════════ forEach 的 keyed 协调器 ═══════════════════════ */

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
 * forEach 的 UPDATE 分支：按 key 做增 / 删 / 移的 diff
 */
function reconcileEach(pointNode: Node, up: UpdatePoint, rs: any[], renderComponent: CompElem<any>) {
  const [, tmplM, newKeys, oldKeys, tmplFn, newAryOrObj] = rs as [
    DirectiveUpdateTag, any, string[], string[], any, any
  ]
  const newValueAry = isArray(newAryOrObj) ? newAryOrObj : map(newAryOrObj, (v: any) => v)

  let subViewRootNodes = up.subViewRootNodes

  //以下两个值在结构初始化（insertSubView标记）后保持不变，缓存到更新点避免每次扫描节点属性
  let subViewId = up.__subViewId
  if (subViewId === undefined) {
    subViewId = up.__subViewId = get(pointNode, '__anchor__')
  }
  let parentViewsIdMap = up.__parentViewsIdMap
  if (parentViewsIdMap === undefined) {
    parentViewsIdMap = up.__parentViewsIdMap = {}
    each(keys<string>(pointNode), (k: string) => {
      if (k === '__anchor__') return
      if (!startsWith(k, '__c-')) return
      parentViewsIdMap![k] = get(pointNode, [k])
    })
  }

  let updatePoints = up.children!
  if (isEmpty(subViewRootNodes)) {
    insertSubView(pointNode, up, tmplFn, tmplM, renderComponent, newAryOrObj, (_v, _k, i) => newKeys[i])
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
      each(upAry, (nUp: UpdatePoint) => {
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

    addGroup.forEach((v, _i) => {
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
    const upGroup = groupBy<UpdatePoint>(updatePoints, (up: UpdatePoint) => up.key)
    let movedUpAry: UpdatePoint[] = []
    let i = 0
    newSeq.forEach((nk: string) => {
      upGroup[nk] && upGroup[nk].forEach((up: UpdatePoint) => {
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
    each(newValueAry, (_val: any, i: number) => {
      let newK = newKeys[i]
      let nodes = oldNodeKeyMap[newK]
      rootNodes![newK] = nodes
    })
    up.subViewRootNodes = rootNodes
  }

  writeCells(up, newKeys, newValueAry)
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
  };
}