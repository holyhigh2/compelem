import { camelCase, compact, each, filter, groupBy, includes, initial, isEmpty, isNil, last, map, remove, set, test, toArray } from "myfx";
import { CompElem } from "../CompElem";
import { Collector } from "../reactive";
import { buildDirectiveView, DirectiveUpdatePointsMap, TextOrSlotDirectiveExecutorMap, updateDirectiveView } from "../render/render";
import { Template } from "../render/Template";
import { DirectiveExecutor, DirectiveInstance, DirectiveUpdateTag, EnterPointType, UpdatePoint } from "../types";
import { showError } from "../utils";

/**
 * 交互点信息
 */
export class EnterPoint {
  startNode: Node; //依赖节点
  endNode: Node; //依赖节点2
  type: EnterPointType; //依赖类型
  attrName: string; //依赖属性名
  varIndex: number;
  expressionChain: string;//所在层级序号 [parentVarIndex-varIndex-]+，如1-6 表示根的第2个表达式下的context的第7个表达式

  nodes: Node[];//如果是插入节点，保存插入的节点数组
  constructor(
    node: Node,
    attrName: string,
    type: EnterPointType
  ) {
    this.startNode = node;
    this.attrName = attrName;
    this.type = type;
  }

  setVarIndex(varIndex: number) {
    this.varIndex = varIndex;
  }

  getNodes(): Node[] {
    let nextNode = this.startNode.nextSibling
    if (!this.endNode) return [nextNode as Node]
    let rs: Node[] = []
    while (nextNode && nextNode !== this.endNode) {
      rs.push(nextNode)
      nextNode = nextNode?.nextSibling
    }
    return rs;
  }
}

enum MovePosition {
  AFTER_BEGIN = 'afterbegin'
}

type MoveNode = { targetId: string, nodeId: string }

const newNodeMap: Record<string, HTMLElement> = {}
function addNodes(adds: Record<string, any>[], newTmpls: Record<string, Template>, newSeq: string[], component: CompElem, updatePoints: UpdatePoint[], pointNode: Node) {
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

  let originalUps = [...updatePoints]
  let nodes = buildDirectiveView(pointNode, tmpl, component)!//this.di.buildView(tmpl)
  let ups = DirectiveUpdatePointsMap.get(pointNode)!
  updatePoints.length = 0
  updatePoints.push(...ups)

  let kMap = new Map<string, boolean>()
  nodes.forEach((n: HTMLElement) => {
    const k = n.getAttribute('key')!
    if (ks.includes(k)) {
      kMap.set(k, true)
      newNodeMap[k] = n
    }
  })

  originalUps.forEach((up, i) => {
    const k = up.key + ''
    if (!kMap.get(k) && newSeq.includes(k)) {
      updatePoints.push(up)
    }
  })

  return addGroup
}

export function updateDirective(point: EnterPoint, newArgs: any[], oldArgs: any[], updater: DirectiveExecutor, renderComponent: CompElem, slotComponent: CompElem, varChain: any[][], isTextOrSlot = false) {

  let rs
  if (isTextOrSlot) {
    Collector.startRender(point.endNode)
    rs = updater(point, newArgs, oldArgs, { renderComponent, slotComponent, varChain })
    Collector.endRender(renderComponent)
  } else {
    rs = updater(point, newArgs, oldArgs, { renderComponent, slotComponent, varChain })
  }

  if (!rs) return

  let [tag, tmpl] = rs

  if (tag === DirectiveUpdateTag.NONE) return

  let nodes = point.getNodes()

  if (tag === DirectiveUpdateTag.REMOVE) {
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      n.parentNode?.removeChild(n)
    }
  } else if (tag === DirectiveUpdateTag.REPLACE) {
    let newNodes: Node[] = [];
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      n.parentNode?.removeChild(n)
    }

    let nnodes = buildDirectiveView(point.endNode, tmpl!, renderComponent)

    newNodes = toArray(nnodes)

    let fragment = document.createDocumentFragment();
    fragment.append(...newNodes);
    point.endNode.parentNode!.insertBefore(fragment, point.endNode);
  } else if (tag === DirectiveUpdateTag.UPDATE) {
    let newKeys: Record<string, boolean> = {}
    let nodesToUpdate
    //原节点顺序
    let oldSeq: string[] = []
    let newSeq: string[] = []

    let updatePoints = DirectiveUpdatePointsMap.get(point.endNode)!

    if (!tmpl) {
      tmpl = new Template([], [])
    }

    if (isEmpty(nodes)) {
      let nodes = buildDirectiveView(point.endNode, tmpl!, renderComponent)
        ; (point.startNode as CharacterData).after(...nodes)
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
    let oldNodeMap: Record<string, HTMLElement> = {}
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
      showError(`${camelCase((point.endNode as any)._diName)} - duplicate key '${dupKey}'`)
      return
    }

    let updateQ = newKeys

    const parentNode = point.startNode.parentNode
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
          let prev = prevKey ? oldNodeMap[prevKey] || prevKey : point.startNode
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
            let srcEl = oldNodeMap[nodeId]
            let target
            if (targetId === MovePosition.AFTER_BEGIN) {
              target = point.startNode as Element
              target.after(srcEl)
            } else {
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
              let srcEl = oldNodeMap[nodeId]
              let target
              if (targetId === MovePosition.AFTER_BEGIN) {
                target = point.startNode as Element
                target.after(srcEl)
              } else {
                target = oldNodeMap[targetId]
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
        // oldNodeMap[k] = null as any
        treeNode.remove()
      }
    })

    //add
    let addGroup
    if (adds.length > 0) {
      addGroup = addNodes(adds, newTmpls, newSeq, renderComponent, updatePoints, point.endNode)

      addGroup.forEach((v, i) => {
        let k = v.newkey
        let treeNode = newNodeMap[k]
        let prevNode = v.prevNode

        if (v.group) {
          let fragment = document.createDocumentFragment()
          fragment.append(...map(v.group, (nk: string) => newNodeMap[nk]))
          treeNode = fragment as any
        }

        if (prevNode === point.endNode) {
          prevNode.before(treeNode)
        } else if (prevNode === point.startNode) {
          prevNode.after(treeNode)
        } else if (typeof prevNode === 'string') {
          newNodeMap[prevNode].after(treeNode)
        } else {
          prevNode.after(treeNode)
        }
      })
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

      updatePoints = movedUpAry
    }

    updateDirectiveView(point.endNode, renderComponent, tmpl, updatePoints)
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