import { closest, isBlank, isString, isUndefined, some, toPath } from "myfx";
import { CompElem } from "./CompElem";

export function showError(msg: string): void {
  console.error(`[CompElem]`, msg);
}

export function showTagError(tagName: string, msg: string): void {
  console.error(`[CompElem <${tagName}>]`, msg);
}

export function showWarn(...args: unknown[]): void {
  console.warn(`[CompElem]`, ...args);
}
export function showTagWarn(tagName: string, msg: string): void {
  console.warn(`[CompElem <${tagName}>]`, msg);
}
//为依赖收集提供标准地址
export function _toUpdatePath(varPath: string[]) {
  return toPath(varPath).join("-");
}

//获取父类构造
export function _getSuper(cls: CompElem) {
  return Object.getPrototypeOf(cls)
}

export function isBooleanProp(type: any) {
  return type === Boolean || some(type, t => t === Boolean)
}
//返回boolean值或非boolean值
export function getBooleanValue(v: any) {
  let val = v
  if (isString(v) && /(?:^true$)|(?:^false$)/.test(val)) {
    val = val === 'true' ? true : false
  } else if (isUndefined(val) || isBlank(val)) {
    val = true;
  }
  return val
}

export const DomUtil = {
  getNodes(startNode: Node, endNode: Node) {
    let nextNode = startNode.nextSibling
    if (!endNode) return [nextNode] as Node[]
    let rs: Node[] = []
    while (nextNode && nextNode !== endNode) {
      rs.push(nextNode)
      nextNode = nextNode?.nextSibling
    }
    return rs;
  },
  insertBefore: function (node: Node, newNodes: any[]) {
    if (!node.parentNode) return;

    let fragment = document.createDocumentFragment();
    fragment.append(...newNodes);
    node.parentNode!.insertBefore(fragment, node);
  },
  remove: function (startNode: Node, endNode: Node) {
    if (startNode === endNode) {
      startNode?.parentNode?.removeChild(startNode)
      return;
    }
    let nextNode = startNode.nextSibling
    while (nextNode && nextNode !== endNode) {
      nextNode?.parentNode?.removeChild(nextNode)
      nextNode = startNode.nextSibling
    }
  },
  //清除dom内容并释放内存
  clear(container: Element, comp: CompElem) {

  }
}

export function getSlotComponent(node: Node, renderComponent: CompElem) {
  let documentFragment = closest(node!, (n: any) => n.host && n.host instanceof CompElem, 'parentNode')
  if (documentFragment && documentFragment.host === renderComponent) return undefined
  return documentFragment ? documentFragment.host : undefined
}