import { camelCase, compact, each, filter, get, initial, isEmpty, isFunction, last, remove, test, toArray } from "myfx";
import { CompElem } from "../CompElem";
import { Collector } from "../reactive";
import { Template } from "../render/Template";
import { DirectiveUpdateTag } from "../types";
import { showError } from "../utils";
import { Directive } from "./Directive";

/**
 * 属性定义
 */
export enum EnterPointType {
  ATTR = "attr", //属性，文本内容，可以内嵌多插值
  PROP = "prop", //参数，智能内嵌一个插值
  TEXT = "text",
  CLASS = "class",
  STYLE = "style",
  SLOT = "slot",
  TAG = 'tag' //在标签内但不是属性内
}

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

/**
 * Delay the actual time of execution of directive
 */
export class DirectiveWrapper extends Function {
  diClass: any;
  args: any[];
  di: Directive;
  varPath: string;
  point: EnterPoint;
  slotComponent: CompElem;
  varChain: any[];

  constructor(diClass: typeof Directive, ...args: any[]) {
    super();
    this.diClass = diClass;
    this.args = args;
    this.varChain = Collector.popDirectiveQ();

    this.di = new this.diClass();
    this.di.renderParams = this.varChain;

  }
  //校验scope
  checkScope(scopeType: string) {
    let scopes = get<string[]>(this.diClass, 'scopes')
    if (!isEmpty(scopes) && !test(scopes.join(','), scopeType)) {
      showError(`Directive '${this.diClass.name}' is out of scopes, expect '${scopes.join(',')}' bug got '${scopeType}'`);
      return;
    }
  }

  render(component: CompElem) {
    let di = this.di;
    if (!di.renderComponent) {
      di.renderComponent = component;
    }

    this.di = di;
    di._renderArgs = this.args
    return this.di.render(...this.args);
  }

  update(point: EnterPoint, newArgs: any[], oldArgs: any[]) {
    let tag = this.di.update(point, newArgs, oldArgs)

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

      let rs = this.di.render(...newArgs)!
      let nnodes = this.di.buildView(rs)

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

      let updateRs = this.di.render(...newArgs)
      if (!updateRs) {
        updateRs = new Template([], [])
      }

      if (isEmpty(nodes)) {
        let nodes = this.di.buildView(updateRs);
        ; (point.startNode as CharacterData).after(...nodes)
        return
      }

      let newTmpls: Record<string, Template> = {}
      if (updateRs instanceof Template) {
        updateRs.vars.forEach(v => {
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
        if (!k) continue;

        if (oldNodeMap[k]) {
          dupKey = k
          break
        }
        oldNodeMap[k] = treeNode
        oldSeq.push(k)
        keyQ[k] = true
      }

      if (dupKey) {
        showError(`${camelCase(this.diClass.name)} - duplicate key '${dupKey}'`)
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

      //计算move
      if (!isEmpty(newSeq)) {
        let lastMoveNodeId = '';
        let lastMoveIndex = -1
        let lastGroup: { targetId: string, nodeId: string }[] = []
        let idWeightMap: Map<number, { group: { targetId: string, nodeId: string }[], targetId: string | undefined }> = new Map()
        for (let i = 0; i < newSeq.length; i++) {
          const nodeId = newSeq[i];
          let oldI = oldSeq.findIndex(c => c === nodeId)
          if (oldI > -1 && oldI !== i) {
            if (lastMoveIndex < 0 || lastMoveIndex - oldI == 1) {
              let lastEl = last(lastGroup)
              lastGroup.push({ nodeId, targetId: i === 0 ? MovePosition.AFTER_BEGIN : (lastEl ? lastEl.nodeId : newSeq[i - 1]) })
            } else {
              idWeightMap.set(lastGroup.length, { group: lastGroup, targetId: '' })
              // idWeightMap[lastGroup.length] = { group: lastGroup, targetId: '' }
              lastGroup = []
              lastGroup.push({ nodeId, targetId: oldSeq[oldI] })
            }
            lastMoveIndex = oldI
          } else if (oldI < 0) {
            let prev = lastMoveNodeId ? oldNodeMap[lastMoveNodeId] || point.endNode : point.startNode
            //add
            adds.push({ prevNode: prev, newkey: nodeId });
          }
          lastMoveNodeId = nodeId
        }

        if (isEmpty(idWeightMap) && lastGroup.length > 0) {
          idWeightMap.set(lastGroup.length, { group: lastGroup, targetId: '' })
          // idWeightMap[lastGroup.length] = { group: lastGroup, targetId: '' }
        }

        let keys = idWeightMap.keys().toArray();
        let keyNums = keys.sort((a, b) => a - b)

        if (keys.length > 0) {
          if (keys.length < 2) {
            //如果仅有一组，留最后一个节点
            let { group } = idWeightMap.get(keyNums[0])! //idWeightMap[keyNums[0]]
            initial(group).forEach(({ targetId, nodeId }) => {
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
            //如果多组，留最后一组
            console.debug('todo....')
          }
        }//endif
        console.debug('test....')
      }
      if (adds.length > 0) {
        this.#addNodes(adds, newTmpls, newSeq)
      }
      adds.forEach(v => {
        let k = v.newkey
        let treeNode = this.newNodeMap[k]
        let prevNode = v.prevNode
        if (prevNode === point.endNode) {
          prevNode.before(treeNode)
        } else if (prevNode === point.startNode) {
          prevNode.after(treeNode)
        } else {
          prevNode.after(treeNode)
        }
      })

      dels.forEach(k => {
        let treeNode = oldNodeMap[k]
        if (treeNode && treeNode.parentNode) {
          parentNode!.removeChild(treeNode)
        }
      })
      //reset varIndex
      this.di.__updatePoints.forEach(up => {
        if (!up.key) {
          up.key = up.value.tmpl.getKey()
        }
        const i = newSeq.findIndex(s => s == up.key)
        up.varIndex = i
      })


      this.di.updateView(updateRs)
    }
  }

  getDirective() {
    return this.di
  }
  newNodeMap: Record<string, HTMLElement> = {}
  #addNodes(adds: Record<string, any>[], newTmpls: Record<string, Template>, newSeq: string[]) {
    const combStrings: string[] = []
    const combVars: Template[] = []
    const ks: number[] = []
    adds.forEach(add => {
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

    let originalUps = this.di.__updatePoints
    let nodes = this.di.buildView(tmpl)
    this.di.__updatePoints.forEach((up, i) => {
      const k = up.value.tmpl.getKey()
      up.key = k
    })
    this.di.__updatePoints.push(...originalUps)

    nodes.forEach((n: HTMLElement) => {
      if (n instanceof HTMLElement)
        this.newNodeMap[n.getAttribute('key')!] = n
    })
  }
}

/**
 * 返回指令调用函数
 * @param di
 * @returns
 */
export function directive<T extends Array<any>>(diClass: typeof Directive) {
  return (...args: T) => {
    let wrapper: DirectiveWrapper | null = null
    //todo 可能存在非返回模板函数开启了依赖监控
    args.forEach((v, i) => {
      if (isFunction(v)) {
        let cbk = v
        args[i] = function (...ps: T) {
          let di = wrapper!.di
          Collector.startRender(di);
          let rs = cbk.call(di.renderComponent, ...ps)
          Collector.endRender(di.renderComponent);
          return rs;
        }
      }
    })
    wrapper = new DirectiveWrapper(diClass, ...args);
    return wrapper
  };
}
