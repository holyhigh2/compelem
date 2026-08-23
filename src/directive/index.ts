import { compact, each, except, filter, findIndex, first, get, groupBy, initial, intersect, isArray, isEmpty, keys, last, map, remove, set, startsWith, test, toArray } from "myfx";
import { CompElem } from "../CompElem";
import { bindEvents } from "../events/event";
import { DirectiveScopeMap } from "../constants";
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
  let pointType = get<any>(DirectiveScopeMap.get(diFn), [0], '')
  let isTextOrSlot = [EnterPointType.TEXT, EnterPointType.SLOT].includes(pointType)
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
  if (tag === DirectiveUpdateTag.REFRESH) return

  let newValueAry = newAryOrObj
  let newValueConverted = false
  if (!isArray(newAryOrObj)) {
    newValueAry = map(newAryOrObj, (v, k) => v)
    newValueConverted = true
  }

  let subViewId = get(pointNode, '__anchor__')
  let parentViewsIdMap: Record<string, string> = {}
  each(keys<string>(pointNode), k => {
    if (k === '__anchor__') return
    if (!startsWith(k, '__c-')) return
    parentViewsIdMap[k] = get(pointNode, [k])
  })
  let subViewRootNodes = up.subViewRootNodes

  let updatePoints = up.children!
  if (tag === DirectiveUpdateTag.REMOVE) {
    let dels: any[] = []
    each(subViewRootNodes, (nodeAry, key) => {
      if (isArray(nodeAry)) {
        each(nodeAry, (weakN) => {
          let n = weakN.deref() as CharacterData | Element
          n.remove()
          if (n instanceof CompElem) {
            n.destroy()
          }
        })
      } else {
        let n = (nodeAry as WeakRef<any>).deref() as CharacterData | Element
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
    each(subViewRootNodes as WeakRef<any>[], (weakN) => {
      let n = weakN.deref() as CharacterData | Element
      n.remove()
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
    each(oldKeys, (key: string) => {
      let ary = oldNodeKeyMap[key]
      if (!ary) {
        ary = oldNodeKeyMap[key] = []
      }
      filter(pointNode.parentElement!.childNodes, (n: Node) => get(n, ['__c-' + subViewId]) == key).forEach(n => {
        ary.push(n)
      })
    })
    up.children?.forEach(up => {
      if (!oldUpKeyMap[up.key]) {
        oldUpKeyMap[up.key] = [up]
      } else {
        oldUpKeyMap[up.key].push(up)
      }
    })

    let oldSeq = oldKeys as string[]
    let newSeq = newKeys as string[]
    let sameKeys = intersect(oldKeys, newKeys)
    let delKeys = except<string | number>(oldKeys, sameKeys)

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
        let oldI = oldSeq.findIndex(c => c === newKey)
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
          let lastGroupIndex = last(vals).moveIndex
          if (Math.abs(vals[vals.length - 2].moveIndex - lastGroupIndex) === 1) {
            vals = initial(vals)
          }
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
        let i = findIndex(newKeys, k => k == add.newKey)
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
        each(addNodes, (n: Node) => {
          ary.push(n)
          rs.childNodes.forEach(n => set(n, '__c-' + subViewId, add.newKey + ''))
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
    delKeys.forEach(k => {
      oldNodeKeyMap[k].forEach(n => {
        n.parentNode?.removeChild(n)
      })
      oldUpKeyMap[k].forEach(up => {
        up.destroy()
      })
    })

    //移动顺序
    if (moved || delKeys.length > 0 || addGroup) {
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
    let rootNodes: Record<string, any> = {}
    each(newValueAry, (val: any, i: number) => {
      let newK = newKeys[i]
      let nodes = oldNodeKeyMap[newK]
      rootNodes![newK] = nodes.map((n: any) => new WeakRef(n))
    })
    up.subViewRootNodes = rootNodes
    //更新视图
    if (sameKeys.length > 0) {
      let varList: any[] = []
      each(newAryOrObj, (val: any, k: string | number, c, i: number) => {
        let v = val
        let vars = buildVars(tmplFn.call(renderComponent, v, k, i))
        varList.push(...vars)
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