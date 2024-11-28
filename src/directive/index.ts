import { camelCase, compact, each, filter, get, head, initial, isArray, isEmpty, isFunction, last, map, remove, test, toArray } from "myfx";
import { CompElem } from "../CompElem";
import { Collector } from "../reactive";
import { Template } from "../render/render";
import { DirectiveUpdateTag } from "../types";
import { showError } from "../utils";
import { Directive } from "./Directive";

const DI_KEY = "__directives";

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
    level: number,
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
    let diMap = get<Record<string, Directive>>(component, DI_KEY);

    let di = this.di || diMap[this.varPath];
    let update = true;
    if (!di) {
      update = false
      di = new this.diClass(this.point);

      di.renderComponent = component;
      di.slotComponent = this.slotComponent;
      di.renderParams = this.varChain;
    }
    this.di = di;
    di._renderArgs = this.args
    let [nodes, expPos, expPosMap] = di.renderContext(...this.args)
    if (expPosMap) {
      di.__expPosMap = expPosMap
    } else if (expPos) {
      di.__expPos = expPos
    }
    return nodes;
  }

  update(nodes: Node[], newArgs: any[], oldArgs: any[]) {
    let tag = this.di.update(nodes, newArgs, oldArgs)

    if (tag === DirectiveUpdateTag.REMOVE) {
      nodes.forEach(n => {
        n.parentNode?.removeChild(n)
      })
    } else if (tag === DirectiveUpdateTag.REPLACE) {

      let newNodes: Node[] = [];
      nodes.forEach(n => {
        n.parentNode?.removeChild(n)
      })

      let rs = this.di.render(...newArgs)
      let [nnodes, expPos, expPosMap] = this.di.renderContext(rs)
      if (expPosMap) {
        this.di.__expPosMap = expPosMap
      } else if (expPos) {
        this.di.__expPos = expPos
      }
      newNodes = toArray(nnodes)

      let fragment = document.createDocumentFragment();
      fragment.append(...newNodes);
      this.point.endNode.parentNode!.insertBefore(fragment, this.point.endNode);
    } else if (tag === DirectiveUpdateTag.UPDATE) {
      let newKeys: Record<string, string> = {}
      let newKeyMap: Record<string, Template> = {}
      let nodesToUpdate
      //原节点顺序
      let oldSeq: string[] = []
      let newSeq: string[] = []
      let updateRs = this.di.render(...newArgs)

      if (isArray<Template>(updateRs) && updateRs[0] instanceof Template) {
        updateRs.forEach(tmpl => {
          let k = tmpl.key ?? tmpl.getKey()
          newKeys[k] = '1'
          newKeyMap[k] = tmpl
          newSeq.push(k)
        })
      }

      //UPDATE仅处理元素节点
      nodes = filter(compact(nodes), n => n.nodeType === Node.ELEMENT_NODE);

      nodesToUpdate = filter(compact(toArray<Node>(nodesToUpdate!)), n => n.nodeType === Node.ELEMENT_NODE);
      let oldNodeMap: Record<string, HTMLElement> = {}
      let dupKey = ''
      let keyQ: Record<string, string> = {}
      map<any, string>(nodes, (node) => {
        let treeNode = <HTMLElement>node;
        let k = treeNode.getAttribute("key")
        if (!k) return;

        if (oldNodeMap[k]) {
          dupKey = k
          return false;
        }
        oldNodeMap[k] = treeNode
        oldSeq.push(k)
        keyQ[k] = '1'
      });

      if (dupKey) {
        showError(`${camelCase(this.diClass.name)} - duplicate key '${dupKey}'`)
      }
      let newNodeMap: Record<string, any> = {}
      let updateQ = newKeys

      const parentNode = this.point.startNode.parentNode
      //compare
      let adds: Record<string, any>[] = [];
      let dels: string[] = [];

      //计算del
      each(keyQ, (v, k) => {
        if (!updateQ[k]) {
          dels.push(k);
          delete keyQ[k]
          remove(oldSeq, k)
        }
      })

      //计算move
      if (!isEmpty(newSeq)) {
        let lastMoveNodeId = '';
        let lastMoveIndex = -1
        let lastGroup: { targetId: string, nodeId: string }[] = []
        let idWeightMap: Record<number, { group: { targetId: string, nodeId: string }[], targetId: string | undefined }> = {}
        newSeq.forEach((nodeId, i) => {
          let oldI = oldSeq.findIndex(c => c === nodeId)
          if (oldI > -1 && oldI !== i) {
            if (lastMoveIndex < 0 || lastMoveIndex - oldI == 1) {
              let lastEl = last(lastGroup)
              lastGroup.push({ nodeId, targetId: i === 0 ? MovePosition.AFTER_BEGIN : (lastEl ? lastEl.nodeId : newSeq[i - 1]) })
            } else {
              idWeightMap[lastGroup.length] = { group: lastGroup, targetId: '' }
              lastGroup = []
              lastGroup.push({ nodeId, targetId: oldSeq[oldI] })
            }
            lastMoveIndex = oldI
          } else if (oldI < 0) {
            let prev = lastMoveNodeId ? oldNodeMap[lastMoveNodeId] || this.point.endNode : this.point.startNode
            //add
            adds.push({ prevNode: prev, newkey: nodeId });
          }
          lastMoveNodeId = nodeId
        })
        if (isEmpty(idWeightMap) && lastGroup.length > 0) {
          idWeightMap[lastGroup.length] = { group: lastGroup, targetId: '' }
        }
        let keys = Object.keys(idWeightMap);
        let keyNums = keys.map(k => parseInt(k)).sort((a, b) => a - b)

        if (keys.length > 0) {
          if (keys.length < 2) {
            //如果仅有一组，留最后一个节点
            let { group } = idWeightMap[keyNums[0]]
            initial(group).forEach(({ targetId, nodeId }) => {
              let srcEl = oldNodeMap[nodeId]
              let target
              if (targetId === MovePosition.AFTER_BEGIN) {
                target = this.point.startNode as Element
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
      }

      adds.forEach(v => {
        let k = v.newkey
        let treeNode = newNodeMap[k] || this.#addNode(newKeyMap[k], k)
        let prevNode = v.prevNode
        if (prevNode === this.point.endNode) {
          prevNode.before(treeNode)
        } else if (prevNode === this.point.startNode) {
          prevNode.after(treeNode)
        } else {
          prevNode.after(treeNode)
        }
      })

      dels.forEach(k => {
        this.#removeNode(k)
        // remove(adjustedQ, ak => ak === k)
        let treeNode = oldNodeMap[k]
        if (treeNode) {
          parentNode!.removeChild(treeNode)
        }
      })

      this.di.updateContext(updateRs)
    }

  }

  getDirective() {
    return this.di
  }

  #addNode(tmpl: Template, key: string) {
    //追加expPos
    let [nodes, expPos, expPosMap] = this.di.renderContext(tmpl)
    let node = head(nodes)
    this.di.__expPosMap[key] = expPos
    // this.di.__expPosMap[key] = clone(this.di.__expPos)
    return node;
  }
  #removeNode(key: string) {
    this.di.__expPosMap[key] = null;
    delete this.di.__expPosMap[key]
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
