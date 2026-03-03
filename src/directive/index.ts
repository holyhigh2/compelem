import { camelCase, compact, each, except, filter, get, groupBy, includes, initial, isEmpty, isNil, last, map, remove, set, test, toArray } from "myfx";
import { CompElem } from "../CompElem";
import { Collector } from "../reactive";
import { buildSubView, updateSubScopeView } from "../render/render";
import { Template } from "../render/Template";
import { DirectiveExecutor, DirectiveInstance, DirectiveUpdateTag, EnterPointType, UpdatePoint } from "../types";
import { DomUtil, showError } from "../utils";

export const DI_COMMENT_START_NODE_MAP = new WeakMap<Node, Node>()
export const TextOrSlotDirectiveExecutorMap = new Map<string, DirectiveExecutor>()

enum MovePosition {
  AFTER_BEGIN = 'afterbegin'
}

type MoveNode = { targetId: string, nodeId: string }

let newNodeMap: Record<string, HTMLElement> = {}
function addNodes(adds: Record<string, any>[], newTmpls: Record<string, Template>, component: CompElem, pointNode: Comment, newNodeMap: Record<string, HTMLElement>, up: UpdatePoint) {
  const combStrings: string[] = []
  const combVars: Template[] = []
  const ks: string[] = []
  let addGroup: Record<string, any>[] = []
  let lastKey: string
  adds.forEach(add => {
    let lastAdd = last(addGroup)
    if (lastAdd) {
      if (lastKey === add.prevNode) {
        if (!lastAdd.group) {
          lastAdd.group = [lastKey]
        }
        lastAdd.group.push(add.newkey)
      } else {
        addGroup.push(add)
      }
    } else {
      addGroup.push(add)
    }

    lastKey = add.newkey

    let k = add.newkey
    ks.push(k)
    combStrings.push('')
    combVars.push(newTmpls[k])
  })

  combStrings.push('')
  let tmpl = new Template(
    combStrings,
    combVars
  )

  let nodes = buildSubView(pointNode, tmpl, component, up, true)!

  let kMap = new Map<string, boolean>()
  nodes.forEach((n: HTMLElement) => {
    const k = n.getAttribute('key')!
    if (ks.includes(k)) {
      kMap.set(k, true)
      newNodeMap[k] = n
    }
  })

  return addGroup
}

export function updateDirective(pointNode: Node, newArgs: any[], oldArgs: any[], executor: DirectiveExecutor, renderComponent: CompElem, slotComponent: CompElem, varChain: any[], up: UpdatePoint) {
  let rs
  let isTextOrSlot = [EnterPointType.TEXT, EnterPointType.SLOT].includes(get(executor, '__scope', ''))
  if (isTextOrSlot) {
    Collector.start()
    rs = executor(pointNode, newArgs, oldArgs, { renderComponent, slotComponent, varChain })
    Collector.end(renderComponent, up)
  } else {
    rs = executor(pointNode, newArgs, oldArgs, { renderComponent, slotComponent, varChain })
  }

  if (!rs) return

  let [tag, tmpl] = rs

  if (tag === DirectiveUpdateTag.NONE) return

  let startNode = DI_COMMENT_START_NODE_MAP.get(pointNode)!
  let nodes = DomUtil.getNodes(startNode, pointNode)

  let updatePoints = up.children!
  if (tag === DirectiveUpdateTag.REMOVE) {
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i] as CharacterData | Element;
      n.remove()
      if (n instanceof CompElem) {
        n.destroy()
      }
    }

    updatePoints?.forEach((up, i) => {
      up.destroy(renderComponent)
    })

  } else if (tag === DirectiveUpdateTag.REPLACE) {
    let newNodes: Node[] = [];
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      n.parentNode?.removeChild(n)

      if (n instanceof CompElem) {
        n.destroy()
      }
    }

    updatePoints?.forEach((up, i) => {
      up.destroy(renderComponent)
    })

    let nnodes = buildSubView(pointNode as Comment, tmpl!, renderComponent, up, true)

    newNodes = toArray(nnodes)

    let fragment = document.createDocumentFragment();
    fragment.append(...newNodes);
    pointNode.parentNode!.insertBefore(fragment, pointNode);
  } else if (tag === DirectiveUpdateTag.UPDATE) {
    let newKeys: Record<string, boolean> = {}
    let nodesToUpdate
    //原节点顺序
    let oldSeq: string[] = []
    let newSeq: string[] = []

    if (!tmpl) {
      tmpl = new Template([], [])
    }

    if (isEmpty(nodes)) {
      let nodes = buildSubView(pointNode as Comment, tmpl!, renderComponent, up, true)
        ; (startNode as CharacterData).after(...nodes)
      return
    }

    let newTmpls: Record<string, Template> = {}
    if (tmpl instanceof Template) {
      tmpl.vars.forEach(v => {
        if (v instanceof Template) {
          const k = v.getKey()
          newTmpls[k] = v
          newKeys[k] = true
          newSeq.push(k)
        }
      })
    }

    //UPDATE仅处理元素节点
    nodes = filter(compact(nodes), n => n.nodeType === Node.ELEMENT_NODE);

    nodesToUpdate = filter(compact(toArray<Node>(nodesToUpdate!)), n => n.nodeType === Node.ELEMENT_NODE);
    let oldNodeMap: Record<string, HTMLElement | null> = {}
    let dupKey = ''
    let keyQ: Record<string, boolean> = {}
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      let treeNode = <HTMLElement>node;
      let k = treeNode.getAttribute("key")
      if (isNil(k)) continue;

      if (oldNodeMap[k]) {
        dupKey = k
        break
      }
      oldNodeMap[k] = treeNode
      oldSeq.push(k)
      keyQ[k] = true
    }

    if (dupKey) {
      showError(`${camelCase((pointNode as any).nodeValue)} - duplicate key '${dupKey}'`)
      return
    }

    let updateQ = newKeys

    //compare
    let adds: Record<string, any>[] = [];
    let dels: string[] = [];

    //计算del
    each(keyQ, (v, k) => {
      if (!updateQ[k]) {
        dels.push(k)
        delete keyQ[k]
        remove(oldSeq, x => x === k)
      }
    })

    //move
    let moved = false
    if (!isEmpty(newSeq)) {
      let lastMoveIndex = -1
      let lastGroup: MoveNode[] = []
      let moveQueue: { moveGroup: MoveNode[], moveIndex: number }[] = []
      let edgeOffset = 0
      let i = 0
      for (; i < newSeq.length; i++) {
        const nodeId = newSeq[i];
        let oldI = oldSeq.findIndex(c => c === nodeId)
        if (oldI < 0) {
          let prevKey = newSeq[i - 1]
          let prev = prevKey ? oldNodeMap[prevKey] || prevKey : startNode
          //add
          adds.push({ prevNode: prev, newkey: nodeId });
          edgeOffset++
          continue
        }
        if (oldI > -1 && oldI !== (i - edgeOffset)) {
          if (lastMoveIndex < 0 || Math.abs(lastMoveIndex - oldI) === 1) {
            let lastEl = last(lastGroup)
            lastGroup.push({ nodeId, targetId: i === 0 ? MovePosition.AFTER_BEGIN : (lastEl ? lastEl.nodeId : newSeq[i - 1]) })
          } else {
            moveQueue.push({ moveGroup: lastGroup, moveIndex: i + lastGroup.length })

            lastGroup = []
            lastGroup.push({ nodeId, targetId: newSeq[i - 1] })
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
            let lastTId = last(moveGroup).targetId
            if (moveGroup[moveGroup.length - 2].nodeId === lastTId) {
              moveGroup = initial(moveGroup)
            }
          }
          moveGroup.forEach(({ targetId, nodeId }) => {
            let srcEl = oldNodeMap[nodeId]!
            let target
            if (targetId === MovePosition.AFTER_BEGIN) {
              target = startNode as Element
              target.after(srcEl)
            } else if (oldNodeMap[targetId]) {
              target = oldNodeMap[targetId]
              target.after(srcEl)
            }
          })
        } else {
          let lastGroupIndex = last(vals).moveIndex
          if (Math.abs(vals[vals.length - 2].moveIndex - lastGroupIndex) === 1) {
            vals = initial(vals)
          }
          vals.forEach(({ moveGroup }) => {
            moveGroup.forEach(({ targetId, nodeId }) => {
              let srcEl = oldNodeMap[nodeId]!
              let target
              if (targetId === MovePosition.AFTER_BEGIN) {
                target = startNode as Element
                target.after(srcEl)
              } else {
                target = oldNodeMap[targetId]!
                target.after(srcEl)
              }
            })
          })
        }
      }//endif
    }

    //del
    dels.forEach(k => {
      let treeNode = oldNodeMap[k]
      if (treeNode && treeNode.parentNode) {
        oldNodeMap[k] = null
        treeNode.remove()
        let ups = remove(updatePoints, up => up.key == k)
        ups.forEach(up => up.destroy(renderComponent))
      }
    })

    //add
    let addGroup
    if (adds.length > 0) {
      addGroup = addNodes(adds, newTmpls, renderComponent, pointNode as Comment, newNodeMap, up)

      addGroup.forEach((v, i) => {
        let k = v.newkey
        let treeNode = newNodeMap[k]
        let prevNode = v.prevNode

        if (v.group) {
          let fragment = document.createDocumentFragment()
          fragment.append(...map(v.group, (nk: string) => newNodeMap[nk]))
          treeNode = fragment as any
        }

        if (prevNode === pointNode) {
          prevNode.before(treeNode)
        } else if (prevNode === startNode) {
          prevNode.after(treeNode)
        } else if (typeof prevNode === 'string') {
          newNodeMap[prevNode].after(treeNode)
        } else {
          prevNode.after(treeNode)
        }
      })

      //release
      newNodeMap = null as any
      newNodeMap = {}
    }

    //合并
    if (tmpl.vars[0] instanceof Template) {
      let tStrAry = []
      let tVarAry: any[] = []
      each(tmpl.vars, v => {
        tVarAry.push(...v.vars)
        tStrAry.push(...map(v.vars, v => '1'))
      })
      tStrAry.push('1')
      tmpl = new Template(tStrAry, tVarAry)
    }

    //移动顺序
    if (moved || dels.length > 0 || addGroup) {
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

    updateSubScopeView(up, renderComponent, tmpl)
  }
}

let DiSn = 0
/**
 * 返回指令调用函数
 * @param di
 * @returns
 */
export function directive<T extends Array<any>>(
  fn: (...args: T) => DirectiveExecutor,
  scopes: EnterPointType[]
): (...args: T) => DirectiveInstance {
  let name = fn.name || ('Di-' + DiSn++)
  let sym = Symbol.for(name)

  return (...args: T) => {
    let executor = fn(...args)
    if (includes(scopes, EnterPointType.TEXT) || includes(scopes, EnterPointType.SLOT))
      TextOrSlotDirectiveExecutorMap.set(name, executor)
    set(executor, '__scope', scopes[0])
    return [sym, args, executor as any, (scopeType: string) => {
      //校验scope
      if (!process.env.DEV) return
      if (!isEmpty(scopes) && !test(scopes.join(','), scopeType)) {
        showError(`Directive '${Symbol.keyFor(sym)}' is out of scopes, expect '${scopes.join(',')}' bug got '${scopeType}'`);
        return;
      }
    }, Collector.popDirectiveQ()]
  }
}