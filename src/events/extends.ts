import myfx, { closest, get, includes } from "myfx";
import { CompElem } from "../CompElem";
import { EvHadler } from "./event";
/*************************************************************
 * 扩展事件
 * @author holyhigh2
 * 
 * resize
 * outside[.mousedown/mouseup/click/dblclick] 默认click
 * mutate[.attr/child/char/tree]
 * 
 *************************************************************/
const ExtEvNames = ['resize', 'outside', 'mutate']
///////////////////////////////////////////////// resize
const AllResizeEls = new WeakMap;
const AllOutsideDownEls: Array<Element | EvHadler>[] = [];
const AllOutsideClickEls: Array<Element | EvHadler>[] = [];
const AllOutsideDblClickEls: Array<Element | EvHadler>[] = [];
const ResizeTargetInitSet = new WeakSet()
const resizeObserver = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const contentBoxSize = Array.isArray(entry.contentBoxSize)
      ? entry.contentBoxSize[0]
      : entry.contentBoxSize;
    const borderBoxSize = Array.isArray(entry.borderBoxSize)
      ? entry.borderBoxSize[0]
      : entry.borderBoxSize;

    if (!ResizeTargetInitSet.has(entry.target)) {
      ResizeTargetInitSet.add(entry.target)
      continue
    }
    let cbk = AllResizeEls.get(entry.target)
    if (cbk) {
      cbk({ target: entry.target, contentBoxSize, borderBoxSize, type: 'resize' })
    }
  }
});
function addResize(node: Element, cbk: EvHadler, component: CompElem<any>) {
  if (AllResizeEls.has(node)) return;

  AllResizeEls.set(node, cbk)
  resizeObserver.observe(node);

  //record
  let observer = resizeObserver
  return (remove = false) => {
    observer.unobserve(node);
    AllResizeEls.delete(node)
    if (remove) {
      observer = node = null as any
    }
  }
}
///////////////////////////////////////////////// mutate
enum MutationType {
  Child = 'child',
  Tree = 'tree',
  Attr = 'attr',
  Char = 'char'
}
const AllMutationEls = new WeakMap<Element, Record<string, any>>;
const mutationObserver = new MutationObserver(mutations => {
  for (let i = 0; i < mutations.length; i++) {
    const mutation = mutations[i];
    let map = AllMutationEls.get(mutation.target as Element)
    if (!map) return;
    let detail: Record<string, any> = {
      target: mutation.target
    }
    let cbk = null
    switch (mutation.type as string) {
      case 'subtree':
        detail.type = MutationType.Tree
        cbk = map[MutationType.Tree]
        break;
      case "childList":
        detail.type = MutationType.Child
        detail.addedNodes = mutation.addedNodes
        detail.removedNodes = mutation.removedNodes
        cbk = map[MutationType.Child]
        break;
      case "attributes":
        detail.type = MutationType.Attr
        detail.attributeName = mutation.attributeName
        detail.oldValue = mutation.oldValue
        cbk = map[MutationType.Attr]
        break;
      case "characterData":
        detail.type = MutationType.Char
        detail.oldValue = mutation.oldValue
        cbk = map[MutationType.Char]
        break;
    }
    if (cbk) {
      detail.type = 'mutate'
      cbk(detail)
    }
  }
});
function addMutation(node: Element, cbk: EvHadler, parts: string[], component: CompElem<any>) {
  let child = includes(parts, 'child')
  let attr = includes(parts, 'attr')
  let char = includes(parts, 'char')
  let tree = includes(parts, 'tree')
  let map = AllMutationEls.get(node)
  if (map) return;

  map = {}
  AllMutationEls.set(node, map)
  if (child) {
    map[MutationType.Child] = cbk
  }
  if (attr) {
    map[MutationType.Attr] = cbk
  }
  if (char) {
    map[MutationType.Char] = cbk
  }
  if (tree) {
    map[MutationType.Tree] = cbk
  }
  mutationObserver.observe(node, {
    childList: child,
    attributes: attr,
    characterData: char,
    subtree: tree
  })

  //record
  return (remove = false) => {
    AllMutationEls.delete(node)
    if (remove) {
      node = null as any
    }
  }
}

///////////////////////////////////////////////// outside
document.addEventListener('mousedown', e => {
  let t = get<Node>(e.composedPath(), 0, e.target)

  AllOutsideDownEls.forEach(([node, cbk]: [Node, any]) => {
    if (!node.contains(t) && !node.contains(closest(t, (node) => node instanceof ShadowRoot, 'parentNode')?.host)) {
      cbk({ type: 'outside', target: node, modifier: 'mousedown', event: e })
    }
  })
}, false)
document.addEventListener('click', e => {
  let t = get<Node>(e.composedPath(), 0, e.target)

  AllOutsideClickEls.forEach(([node, cbk]: [Node, any]) => {
    if (!node.contains(t) && !node.contains(closest(t, (node) => node instanceof ShadowRoot, 'parentNode')?.host)) {
      cbk({ type: 'outside', target: node, modifier: 'click', event: e })
    }
  })
}, false)
document.addEventListener('dblclick', e => {
  let t = get<Node>(e.composedPath(), 0, e.target)

  AllOutsideDblClickEls.forEach(([node, cbk]: [Node, any]) => {
    if (!node.contains(t) && !node.contains(closest(t, (node) => node instanceof ShadowRoot, 'parentNode')?.host)) {
      cbk({ type: 'outside', target: node, modifier: 'dblclick', event: e })
    }
  })
}, false)
function addOutsideMouseDown(node: Element, cbk: EvHadler, component: CompElem<any>) {
  AllOutsideDownEls.push([node, cbk])

  //record
  return (remove = false) => {
    myfx.remove(AllOutsideDownEls, el => el[0] === node && el[1] === cbk)
  }
}
function addOutsideClick(node: Element, cbk: EvHadler, component: CompElem<any>) {
  AllOutsideClickEls.push([node, cbk])
  //record
  return (remove = false) => {
    myfx.remove(AllOutsideClickEls, el => el[0] === node && el[1] === cbk)
  }
}
function addOutsideDblClick(node: Element, cbk: EvHadler, component: CompElem<any>) {
  AllOutsideDblClickEls.push([node, cbk])
  //record
  return (remove = false) => {
    myfx.remove(AllOutsideDblClickEls, el => el[0] === node && el[1] === cbk)
  }
}

export function isExtEvent(evName: string) {
  return ExtEvNames.includes(evName)
}

export function addExtEvent(evName: string, node: Element, cbk: EvHadler, parts: string[], component: CompElem<any>) {
  if (evName === 'resize') {
    return addResize(node, cbk, component)
  } else if (evName === 'outside') {
    switch (parts[0]) {
      case 'mousedown':
        return addOutsideMouseDown(node, cbk, component)
      case 'dblclick':
        return addOutsideDblClick(node, cbk, component)
      case 'click':
      default:
        return addOutsideClick(node, cbk, component)
    }
  } else if (evName === 'mutate') {
    return addMutation(node, cbk, parts, component)
  }
}

