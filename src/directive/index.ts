import { compact, each, except, first, get, groupBy, initial, isArray, isEmpty, isFunction, keys, last, map, remove, set, startsWith, test, toArray } from "myfx";
import { CompElem } from "../CompElem";
import { DirectiveScopeMap } from "../constants";
import { bindEvents } from "../events/event";
import { Collector } from "../reactive";
import { buildVars, insertSubView, renderTemplate, updateView } from "../render/render";
import { UpdatePoint } from "../render/UpdatePoint";
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

export function updateDirective(diFn: Function, pointNode: Node, newArgs: any[], oldArgs: any[], executor: DirectiveExecutor, renderComponent: CompElem, slotComponent: CompElem, varChain: any[], up: UpdatePoint, updatedMap?: Record<string, UpdatedSource>) {
  let rs
  let scopes = DirectiveScopeMap.get(diFn)
  let pointType = scopes ? scopes[0] : ''
  let isTextOrSlot = pointType === EnterPointType.TEXT || pointType === EnterPointType.SLOT
  if (isTextOrSlot) {
    Collector.start()
    rs = executor(pointNode, newArgs, oldArgs, { renderComponent, slotComponent, varChain, updatedMap, pointType })
    Collector.end(renderComponent, up)
  } else {
    rs = executor(pointNode, newArgs, oldArgs, { renderComponent, slotComponent, varChain, updatedMap, pointType })
  }

  if (!rs) return

  let [tag, tmplM, newKeys, oldKeys, tmplFn, newAryOrObj] = rs

  if (tag === DirectiveUpdateTag.NONE) return
  if (tag === DirectiveUpdateTag.REFRESH) {
    //REFRESH：结构/key未变仅值变化，直接应用新varList到子视图更新点
    //（此前结果被丢弃：仅主视图路径可达时——如整组同key替换——DOM不更新，且子视图路径会重复执行本指令）
    let r1 = rs[1]
    let newVars = isFunction(r1) ? buildVars(r1.call(renderComponent, newArgs[0])) : r1
    if (newVars) updateView(newVars, renderComponent, up.children!, undefined, updatedMap)
    return true
  }

  let newValueAry = newAryOrObj
  let newValueConverted = false
  if (!isArray(newAryOrObj)) {
    newValueAry = map(newAryOrObj, (v, k) => v)
    newValueConverted = true
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
    let dels: any[] = []
    each(subViewRootNodes, (nodeAry, key) => {
      if (isArray(nodeAry)) {
        each(nodeAry, (n) => {
          (n as CharacterData | Element).remove()
          if (n instanceof CompElem) {
            n.destroy()
          }
        })
      } else {
        let n = nodeAry as CharacterData | Element
        n.remove()
        dels.push(nodeAry)
        if (n instanceof CompElem) {
          n.destroy()
        }
      }
    })
    dels.forEach(d => {
      remove(subViewRootNodes as any, wr => wr === d)
    })

    updatePoints?.forEach((up, i) => {
      up.destroy(renderComponent)
      updatePoints[i] = null as any
    })
    up.children = compact(updatePoints)

    if (isArray(subViewRootNodes)) {
      up.subViewRootNodes = []
    } else {
      up.subViewRootNodes = {}
    }

  } else if (tag === DirectiveUpdateTag.REPLACE) {
    //删除旧dom
    each(subViewRootNodes as any[], (n) => {
      (n as CharacterData | Element).remove()
      if (n instanceof CompElem) {
        n.destroy()
      }
    })

    updatePoints?.forEach((up, i) => {
      up.destroy(renderComponent)
      updatePoints[i] = null as any
    })
    up.children = compact(updatePoints)
    //构造新DOM
    let [, tmplFn, tmplM] = rs

    insertSubView(pointNode, up, tmplFn, tmplM, renderComponent)

  } else if (tag === DirectiveUpdateTag.UPDATE) {
    if (isEmpty(subViewRootNodes)) {
      insertSubView(pointNode, up, tmplFn, tmplM, renderComponent, newAryOrObj, (v, k, i) => newKeys[i])
      return
    }

    let oldNodeKeyMap: Record<string, Node[]> = {}
    let oldUpKeyMap: Record<string, UpdatePoint[]> = {}

    let siblings = pointNode.parentElement!.childNodes
    let keyProp = '__c-' + subViewId
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
        let vars = buildVars(tmplFn.call(renderComponent, val, add.newKey, i))
        let [rs, upAry] = renderTemplate(renderComponent, tmplM, vars)
        add.fragment = rs
        each(upAry, nUp => {
          nUp.key = add.newKey
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
    delKeysArr.forEach(k => {
      oldNodeKeyMap[k].forEach(n => {
        n.parentNode?.removeChild(n)
      })
      oldUpKeyMap[k].forEach(up => {
        up.destroy()
      })
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

      let redundant = except<UpdatePoint>(updatePoints, movedUpAry)
      redundant.forEach(up => up.destroy(renderComponent))
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
    //更新视图
    if (sameKeysArr.length > 0) {
      let varList: any[] = []
      each(newAryOrObj, (val: any, k: string | number, c, i: number) => {
        let v = val
        let vars = buildVars(tmplFn.call(renderComponent, v, k, i))
        for (let vi = 0; vi < vars.length; vi++) {
          varList.push(vars[vi])
        }
      })
      updateView(varList, renderComponent, up.children!, undefined, updatedMap)
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
    return [executor as any, args, fn, Collector.popDirectiveQ()]
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