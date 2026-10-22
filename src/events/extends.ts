import { includes, remove, size } from "myfx";
import { CompElem } from "../CompElem";
import { showError } from "../utils";
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
/**
 * 扩展事件的回调不吃原生 Event：resize/outside/mutate 各自派发一个 detail 对象
 */
type ExtHandler = (detail: any) => any
///////////////////////////////////////////////// resize
const AllResizeEls = new WeakMap<Node, EvHadler[]>();
const AllOutsideDownEls: Array<[Node, ExtHandler]> = [];
const AllOutsideClickEls: Array<[Node, ExtHandler]> = [];
const AllOutsideDblClickEls: Array<[Node, ExtHandler]> = [];
const ResizeTargetInitSet = new WeakSet()
//兼容 SSR/测试环境
const resizeObserver: ResizeObserver | undefined = typeof ResizeObserver !== "undefined"
  ? new ResizeObserver((entries) => {
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
      let cbks = AllResizeEls.get(entry.target)
      if (cbks) {
        cbks.forEach(cbk => {
          cbk({ target: entry.target, contentBoxSize, borderBoxSize, type: 'resize' } as any)
        })
      }
    }
  })
  : undefined;
function addResize(node: Element, cbk: EvHadler, _component: CompElem<any>, isOnce: boolean) {
  if (!resizeObserver) {
    if (process.env.DEV) {
      showError(`ResizeObserver is not defined`)
    }
    return
  }
  let cbks = AllResizeEls.get(node)
  if (!cbks) {
    cbks = []
    AllResizeEls.set(node, cbks)
  }

  let observer = resizeObserver!

  if (isOnce) {
    let fn = cbk
    cbk = (...args) => {
      fn(...args)
      remove(cbks, c => c === cbk)
      if (size(cbks) < 1) {
        observer.unobserve(node)
        AllResizeEls.delete(node)
      }
    }
  }
  cbks.push(cbk)

  resizeObserver.observe(node);

  //record
  return (toRemove = false) => {
    remove(cbks, c => c === cbk)
    if (size(cbks) < 1) {
      observer.unobserve(node)
      AllResizeEls.delete(node)
      if (toRemove) {
        observer = node = null as any
      }
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
/** 单个节点的登记：自有观测器 + 类型槽（槽内可挂多个回调，同节点多修饰符合并到这里） */
type MutationReg = {
  observer: MutationObserver
  map: Record<string, ExtHandler[]>
  /**
   * 本节点当前生效的 observe 选项
   */
  opts: MutationObserverInit
}
const AllMutationEls = new WeakMap<Element, MutationReg>;
/** 摘掉本回调在该节点上的全部槽位登记；最后一个登记被摘走时断开观测 */
function unregisterMutation(node: Element, reg: MutationReg, cbk: ExtHandler) {
  const slotKeys = Object.keys(reg.map)
  for (let i = 0; i < slotKeys.length; i++) {
    const list = reg.map[slotKeys[i]]
    const at = list.indexOf(cbk)
    if (at > -1) list.splice(at, 1)
    if (list.length < 1) delete reg.map[slotKeys[i]]
  }
  if (Object.keys(reg.map).length === 0) {
    AllMutationEls.delete(node)
    reg.observer.disconnect()
  }
}
//观测回调（登记节点共享同一实现；观测器 → 登记节点查表，记录只派发给本节点自己的登记槽）
const ObserverNodeMap = new WeakMap<MutationObserver, Element>()
const onMutations = (mutations: MutationRecord[], observer: MutationObserver) => {
  const regNode = ObserverNodeMap.get(observer) as Element
  const reg = AllMutationEls.get(regNode)
  if (!reg) return
  for (let i = 0; i < mutations.length; i++) {
    const mutation = mutations[i];
    let slotKey: MutationType
    switch (mutation.type as string) {
      case "childList":
        slotKey = MutationType.Child
        break;
      case "attributes":
        slotKey = MutationType.Attr
        break;
      case "characterData":
        slotKey = MutationType.Char
        break;
      default:
        continue
    }

    const isDeep = mutation.type === 'characterData'
      ? mutation.target.parentNode !== regNode
      : mutation.target !== regNode
    const cbs = isDeep ? undefined : reg.map[slotKey]
    const treeCbs = reg.map[MutationType.Tree]
    if (!cbs && !treeCbs) continue
    const detail: Record<string, any> = {
      target: mutation.target,
      type: slotKey as string
    }
    if (mutation.type === "childList") {
      detail.addedNodes = mutation.addedNodes
      detail.removedNodes = mutation.removedNodes
    } else if (mutation.type === "attributes") {
      detail.attributeName = mutation.attributeName
      detail.oldValue = mutation.oldValue
    } else {
      detail.oldValue = mutation.oldValue
    }
    // 倒序遍历：once 回调会就地摘除自己，正序会漏掉后一项
    if (cbs) for (let ci = cbs.length - 1; ci >= 0; ci--) cbs[ci](detail)
    if (treeCbs) for (let ci = treeCbs.length - 1; ci >= 0; ci--) treeCbs[ci](detail)
  }
}
function addMutation(node: Element, cbk: EvHadler, parts: string[], _component: CompElem<any>, isOnce: boolean) {
  if (typeof MutationObserver === "undefined") {
    if (process.env.DEV) {
      showError(`MutationObserver is not defined`)
    }
    return
  }
  let child = includes(parts, 'child')
  let attr = includes(parts, 'attr')
  let char = includes(parts, 'char')
  let tree = includes(parts, 'tree')

  const slots: MutationType[] = []
  if (child) slots.push(MutationType.Child)
  if (attr) slots.push(MutationType.Attr)
  if (char) slots.push(MutationType.Char)
  if (tree) slots.push(MutationType.Tree)
  // 没有任何类型（裸 @mutate）时 observe 会直接抛错：静默不注册。
  // 声明期违规由编译器 E-MUTATE-MODIFIER 阻断构建；此守卫兜底动态事件名（@event('mutate') 等）不可静态判定的路径。
  if (slots.length === 0) return

  // MutationObserver 无 unobserve：按节点建观测器，该节点登记全部释放时才 disconnect
  let reg = AllMutationEls.get(node)
  if (!reg) {
    const observer = new MutationObserver(onMutations)
    ObserverNodeMap.set(observer, node)
    reg = { observer, map: {}, opts: {} }
    AllMutationEls.set(node, reg)
  } else if (process.env.DEV) {
    // 同节点重复注册不再丢弃：回调合并进已有槽位，observe 选项由下面显式做并集
    showError(`mutate - multiple registrations on the same node: callbacks and observe options are merged by the framework`)
  }
  const owner = reg

  let handler: ExtHandler = cbk
  if (isOnce) {
    // once：触发即摘表（末位登记时 disconnect），观测不留到组件释放
    handler = (detail) => {
      try {
        cbk(detail)
      } finally {
        unregisterMutation(node, owner, handler)
      }
    }
  }
  for (let i = 0; i < slots.length; i++) {
    const list = owner.map[slots[i]]
    if (list) list.push(handler)
    else owner.map[slots[i]] = [handler]
  }

  // tree 隐含观测全部变动类型（仅 subtree 而不开启类型等于没有观测）
  // oldValue 需显式开启（注意：attributeOldValue/characterDataOldValue 为 true 会连带打开对应类型）
  // 与该节点已生效的选项做并集后单次 observe：重复注册时旧观测类型不会被替换丢掉
  const prev = owner.opts
  const merged: MutationObserverInit = {
    ...prev,
    childList: prev.childList === true || child || tree,
    attributes: prev.attributes === true || attr || tree,
    characterData: prev.characterData === true || char || tree,
    subtree: prev.subtree === true || tree,
    attributeOldValue: prev.attributeOldValue === true || attr || tree,
    characterDataOldValue: prev.characterDataOldValue === true || char || tree
  }
  owner.opts = merged
  owner.observer.observe(node, merged)
  //record
  return (_remove = false) => {
    unregisterMutation(node, owner, handler)
  }
}

/////////////////////////////////////// outside
/**
 * 外部点击派发
 */
function dispatchOutside(list: Array<[Node, ExtHandler]>, e: Event, modifier: string) {
  if (list.length === 0) return
  const onPath: Set<EventTarget> = new Set(e.composedPath())
  // 倒序遍历：once 回调会就地摘除自己，正序会漏掉后一项
  for (let i = list.length - 1; i >= 0; i--) {
    const [node, cbk] = list[i]
    if (onPath.has(node)) continue
    cbk({ type: 'outside', target: node, modifier, event: e })
  }
}
//兼容 SSR/测试
if (typeof document !== "undefined") {
  document.addEventListener('mousedown', e => dispatchOutside(AllOutsideDownEls, e, 'mousedown'), false)
  document.addEventListener('click', e => dispatchOutside(AllOutsideClickEls, e, 'click'), false)
  document.addEventListener('dblclick', e => dispatchOutside(AllOutsideDblClickEls, e, 'dblclick'), false)
}
/** 注册进对应的外部事件表；once 时回调触发后自行摘表，不存活到组件释放 */
function addOutside(list: Array<[Node, ExtHandler]>, node: Element, cbk: EvHadler, isOnce: boolean) {
  let entry: [Node, ExtHandler]
  const unregister = () => {
    const at = list.indexOf(entry)
    if (at > -1) list.splice(at, 1)
  }
  let handler: ExtHandler = cbk
  if (isOnce) {
    handler = (detail) => {
      try {
        cbk(detail)
      } finally {
        unregister()
      }
    }
  }
  entry = [node, handler]
  list.push(entry)

  //record
  return (_remove = false) => {
    unregister()
  }
}
function addOutsideMouseDown(node: Element, cbk: EvHadler, _component: CompElem<any>, isOnce: boolean) {
  return addOutside(AllOutsideDownEls, node, cbk, isOnce)
}
function addOutsideClick(node: Element, cbk: EvHadler, _component: CompElem<any>, isOnce: boolean) {
  return addOutside(AllOutsideClickEls, node, cbk, isOnce)
}
function addOutsideDblClick(node: Element, cbk: EvHadler, _component: CompElem<any>, isOnce: boolean) {
  return addOutside(AllOutsideDblClickEls, node, cbk, isOnce)
}

export function isExtEvent(evName: string) {
  return ExtEvNames.includes(evName)
}

export function addExtEvent(evName: string, node: Element, cbk: EvHadler, parts: string[], component: CompElem<any>, isOnce: boolean) {
  if (evName === 'resize') {
    return addResize(node, cbk, component, isOnce)
  } else if (evName === 'outside') {
    switch (parts[0]) {
      case 'mousedown':
        return addOutsideMouseDown(node, cbk, component, isOnce)
      case 'dblclick':
        return addOutsideDblClick(node, cbk, component, isOnce)
      case 'click':
      default:
        return addOutsideClick(node, cbk, component, isOnce)
    }
  } else if (evName === 'mutate') {
    return addMutation(node, cbk, parts, component, isOnce)
  }
}

