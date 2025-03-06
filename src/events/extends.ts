import { closest, get, includes } from "myfx";
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
const resizeObserver = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const contentBoxSize = Array.isArray(entry.contentBoxSize)
      ? entry.contentBoxSize[0]
      : entry.contentBoxSize;
    const borderBoxSize = Array.isArray(entry.borderBoxSize)
      ? entry.borderBoxSize[0]
      : entry.borderBoxSize;

    let cbk = AllResizeEls.get(entry.target)
    if (cbk) {
      let ev = new CustomEvent('resize', {
        bubbles: false,
        cancelable: false,
        detail: {
          borderBox: { w: borderBoxSize.inlineSize, h: borderBoxSize.blockSize },
          contentBox: { w: contentBoxSize.inlineSize, h: contentBoxSize.blockSize },
        },
      })
      cbk(ev, entry.target)
    }
  }
});
function addResize(node: Element, cbk: EvHadler) {
  if (AllResizeEls.has(node)) return;

  AllResizeEls.set(node, cbk)
  resizeObserver.observe(node);
}
///////////////////////////////////////////////// mutate
enum MutationType {
  Child = 'child',
  Tree = 'tree',
  Attr = 'attr',
  Char = 'char'
}
const AllMutationEls = new WeakMap<Element, Record<string, EvHadler>>;
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
      let ev = new CustomEvent('mutate', {
        bubbles: false,
        cancelable: false,
        detail
      })
      cbk(ev)
    }
  }
});
function addMutation(node: Element, cbk: EvHadler, parts: string[]) {
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
}

///////////////////////////////////////////////// outside
document.addEventListener('mousedown', e => {
  let t = get<Node>(e.composedPath(), 0, e.target)

  AllOutsideDownEls.forEach(([node, cbk]: [Node, any]) => {
    if (!node.contains(t) && !node.contains(closest(t, (node) => node instanceof ShadowRoot, 'parentNode')?.host)) {
      let ev = new CustomEvent('outside', {
        bubbles: false,
        cancelable: false,
        detail: {
          currentTarget: node,
          event: e
        },
      })
      cbk(ev, node)
    }
  })
}, false)
document.addEventListener('click', e => {
  let t = get<Node>(e.composedPath(), 0, e.target)

  AllOutsideClickEls.forEach(([node, cbk]: [Node, any]) => {
    if (!node.contains(t) && !node.contains(closest(t, (node) => node instanceof ShadowRoot, 'parentNode')?.host)) {
      let ev = new CustomEvent('outside', {
        bubbles: false,
        cancelable: false,
        detail: {
          currentTarget: node,
          event: e
        },
      })
      cbk(ev, node)
    }
  })
}, false)
document.addEventListener('dblclick', e => {
  let t = get<Node>(e.composedPath(), 0, e.target)

  AllOutsideDblClickEls.forEach(([node, cbk]: [Node, any]) => {
    if (!node.contains(t) && !node.contains(closest(t, (node) => node instanceof ShadowRoot, 'parentNode')?.host)) {
      let ev = new CustomEvent('outside', {
        bubbles: false,
        cancelable: false,
        detail: {
          currentTarget: node,
          event: e
        },
      })
      cbk(ev, node)
    }
  })
}, false)
function addOutsideMouseDown(node: Element, cbk: EvHadler) {
  AllOutsideDownEls.push([node, cbk])
}
function addOutsideClick(node: Element, cbk: EvHadler) {
  AllOutsideClickEls.push([node, cbk])
}
function addOutsideDblClick(node: Element, cbk: EvHadler) {
  AllOutsideDblClickEls.push([node, cbk])
}

export function isExtEvent(evName: string) {
  return ExtEvNames.includes(evName)
}

export function addExtEvent(evName: string, node: Element, cbk: EvHadler, parts: string[]) {
  if (evName === 'resize') {
    addResize(node, cbk)
  } else if (evName === 'outside') {
    switch (parts[0]) {
      case 'mousedown':
        addOutsideMouseDown(node, cbk)
        break;
      case 'dblclick':
        addOutsideDblClick(node, cbk)
        break;
      case 'click':
      default:
        addOutsideClick(node, cbk)
        break;
    }
  } else if (evName === 'mutate') {
    addMutation(node, cbk, parts)
  }
}

