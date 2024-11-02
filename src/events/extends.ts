/*************************************************************
 * 扩展事件
 * @author holyhigh2
 * 
 * resize
 * outside.[mousedown/up/click/dblclick] 默认click
 * 
 *************************************************************/
const ExtEvNames = ['resize', 'outside']
///////////////////////////////////////////////// resize
const AllResizeEls = new WeakMap;
const AllOutsideDownEls: Array<Element | ((ev: Event) => any)>[] = [];
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
      cbk(ev)
    }
  }
});
function addResize(node: Element, cbk: (ev: Event) => any) {
  AllResizeEls.set(node, cbk)
  resizeObserver.observe(node);
}

///////////////////////////////////////////////// outside
document.addEventListener('mousedown', e => {
  let t = e.target as Node

  AllOutsideDownEls.forEach(([node, cbk]: [Node, any]) => {
    if (!node.contains(t)) {
      let ev = new CustomEvent('outside', {
        bubbles: false,
        cancelable: false,
        detail: {
          currentTarget:node,
          event: e
        },
      })
      cbk(ev)
    }
  })
}, false)
function addOutsideMouseDown(node: Element, cbk: (ev: Event) => any) {
  AllOutsideDownEls.push([node, cbk])
}

export function isExtEvent(evName: string) {
  return ExtEvNames.includes(evName)
}

export function addExtEvent(evName: string, node: Element, cbk: (ev: Event) => any, parts: string[]) {
  if (evName === 'resize') {
    addResize(node, cbk)
  } else if (evName === 'outside') {
    switch (parts[0]) {
      case 'mousedown':
        addOutsideMouseDown(node, cbk)
        break;

      default:
        break;
    }
  }
}

