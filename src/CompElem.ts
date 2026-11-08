import {
  assign,
  cloneDeep,
  closest,
  each,
  get,
  groupBy,
  has,
  isArray,
  isBlank,
  isDefined,
  isEmpty,
  isNil,
  isNull,
  isObject,
  isUndefined,
  keys,
  merge,
  reject,
  remove,
  size
} from "myfx";
import { getBaseSheets, getDefaultComponentProps } from "./config";
import { ComponentUninitializedSlotFunctionMap, ComponentUninitializedSubComponentPropMap, ComponentUninitializedWrapperComponentMap, CssScopeCacheMap, NO_CHILD_EFFECT, PropTypeMap, SLOT_NAME_DEFAULT } from "./constants";
import { Csscope } from "./decorators/csscope";
import { releaseResources, viewResource } from "./decorators/resource";
import { bindEvents, emitEvent, EvHadler, registerEvent, releaseEventHandlers } from "./events/event";
import { CompElemHelper } from "./helpers";
import { IComponent } from "./IComponent";
import { CssTemplate, sheetOfCssTemplate } from "./render/CssTemplate";
import { purgeDirNodeMap } from "./render/dir-node-map";
import { ATTR_PREFIX_BOOLEAN, ATTR_PREFIX_EVENT, ATTR_PREFIX_PROP, ATTR_REF, buildStaticView, buildSubTemplateView } from "./render/render";
import { resolveSubTemplateOwner } from "./render/slot-provenance";
import { Template } from "./render/Template";
import { UpdatePoint } from "./render/UpdatePoint";
import { walkSplitText } from "./render/walk";
import { batch, effect, EffectNode, onCleanup, onFlushEnd, reportEffectError, signal, SignalNode, untrack } from "./signal";
import { prepareEnter } from "./transition/enter";
import { runLeave, stripViewKeyMarkers } from "./transition/leave";
import { CompiledStatic, PropOption, SlotOptions, StateDefInternal, StateOption, TplFn } from "./types";
import { _getSuper, camelCaseCached, DomUtil, freezeSubComponents, getBooleanValue, isBooleanProp, kebabCaseCached, showTagError, showWarn, tagNameLower } from "./utils";

let CompElemSn = 0
const SlotCompMap = new WeakMap()
const EMPTY_SLOTS: Record<string, Node[]> = Object.freeze({})
const EMPTY_PARENT_PROPS: Record<string, any> = {}
/** 已就 own 字段覆盖做过类级 static 表补丁的类（见 #adoptOwnFieldDefaults） */
const FieldOverridePatched = new WeakSet<Function>()
/** 已探测过 `slots` 访问器安装情况的类（安装是类级一次性动作，见构造器） */
const SlotsInstalled = new WeakSet<Function>()
/** 已按 `__ce_static__.resources` 安装过资源访问器的类（同上，类级一次性） */
const ResInstalled = new WeakSet<Function>()
/** 已安装的资源访问器函数（子类静态表含祖先的 key，撞上它属正常复用） */
const ResourceGetters = new WeakSet<Function>()

/**
 * flush 末段派发：本轮跑过 effect 的组件触发 `afterUpdate`
 */
onFlushEnd(owners => {
  for (let i = 0; i < owners.length; i++) {
    const comp = owners[i] as CompElem<any>
    // 销毁过的组件与已挂载前（首屏 effect 也会记账）的实例都跳过
    if (comp.isDestroyed || !comp.isMounted) continue
    comp.afterUpdate()
  }
})

/** 沿原型链查找键的描述符，跳过对象自身 */
function getProtoDescriptor(obj: object, key: string): PropertyDescriptor | undefined {
  let p = Object.getPrototypeOf(obj)
  while (p) {
    const d = Object.getOwnPropertyDescriptor(p, key)
    if (d) return d
    p = Object.getPrototypeOf(p)
  }
  return undefined
}

/** 原型链上是否存在同名访问器（own 属性遮蔽的判定前提） */
function hasAccessor(obj: object, key: string): boolean {
  const d = getProtoDescriptor(obj, key)
  return d !== undefined && (d.get !== undefined || d.set !== undefined)
}

/**
 * 单个插槽的节点数组浅比较（同一轮里 #updateSlotsAry 每次都会产出新数组，只能逐元素比）
 */
function sameNodeAry(a: Node[] | undefined, b: Node[] | undefined): boolean {
  if (a === b) return true
  if (!a || !b || a.length !== b.length) return false
  for (let j = 0; j < a.length; j++) {
    if (a[j] !== b[j]) return false
  }
  return true
}

/**
 * slots 内容浅比较
 */
function sameSlots(a: Record<string, Node[]>, b: Record<string, Node[]>): boolean {
  const ka = keys(a)
  if (ka.length !== size(b)) return false
  for (let i = 0; i < ka.length; i++) {
    const k = ka[i]
    if (!sameNodeAry(a[k], b[k])) return false
  }
  return true
}

/**
 * CompElem基类（见 utils.ts：静态元数据 helper 已下沉）。
 *
 * @author holyhigh2
 */
/**
 * 插槽过渡配置：`<slot transition="fade">` 的静态属性。
 *
 * 只支持一个名字（进出共用同一套类）；空串等同未配置。
 * 注意 slotted 内容挂在**宿主元素的 light DOM**，所以对应的 `.ce-*` 样式
 * 必须定义在 light DOM 所在的作用域（document 或父组件的 shadow root），
 * 写在本组件 shadow root 的样式对它无效。
 */
function slotTransitionOf(slot: HTMLSlotElement | undefined): string | null {
  const v = slot?.getAttribute('transition')
  return v ? v : null
}

export class CompElem<T = HTMLElement> extends HTMLElement implements IComponent<T> {
  /**
   * 运行时基类自声明 `noView`。
   */
  static __ce_static__ = { noView: true }

  #cid: number
  #slotPropsMap: Record<string, Partial<SlotOptions>> = {}
  #shadow: ShadowRoot;
  //保存所有渲染上下文 {CompElem/Directive}
  __updateTree: Array<UpdatePoint>
  // 每实例信号存储
  __s: Record<string, SignalNode<any>>

  // 强制刷新标志
  __f = false

  // cssVars
  __cssVarVals: Record<string, string> | undefined

  /**
   * 视图 effect 账本
   */
  #viewEffects: Set<EffectNode> = new Set()

  /**
   * `@watch` / `cssVars` 的 effect 账本，与视图 effect 分开记
   */
  #setupEffects: EffectNode[] = []

  __propDefs: Record<string, PropOption> | undefined
  __stateDefs: Record<string, StateOption> | undefined

  /**
   * 宿主标签上属于本组件实例的更新点
   */
  _hostUps: UpdatePoint[] | undefined

  _subComponentEventSn = 0
  _subComponentEventMap = new Map<number, Record<string, Function>>()

  get [Symbol.toStringTag]() {
    return this.constructor.name;
  }
  get cid() {
    return this.#cid
  }
  get attrs(): Record<string, string> {
    return this.#attrs
  }
  get props(): Record<string, any> {
    return this.#props
  }
  get renderRoot(): T | undefined {
    return this.#renderRoot?.deref() as T;
  }
  get renderRoots(): HTMLElement[] {
    return this.#renderRoots.flatMap(wr => wr.deref() ?? []);
  }
  get parentComponent(): CompElem | undefined {
    return this.#parentComponent?.deref();
  }
  get wrapperComponent(): CompElem | undefined {
    return this.#wrapperComponent?.deref();
  }
  declare slots: Record<string, Node[]>
  get slotHooks() {
    return this.#slotHooks;
  }
  get cssSheets() {
    return CssScopeCacheMap.get(this.constructor)?.get(Csscope.INNER)!
  }
  get isMounted() {
    return this.#mounted
  }
  #attrs: Record<string, string>
  #props: Record<string, any>
  #renderRoot: WeakRef<HTMLElement> | undefined
  #renderRoots: WeakRef<HTMLElement>[]
  #parentComponent: WeakRef<CompElem> | undefined
  #wrapperComponent: WeakRef<CompElem> | undefined
  #slotsEl: Record<string, HTMLSlotElement> = {};
  #slotHooks: Record<string, (...args: any[]) => Template> = {};
  #slotNodes: Record<string, Node[]> = {};
  #mounted: boolean = false

  #updateNextImmediatelyQ: Function[]

  //////////////////////////////////// styles
  get cssVars(): Record<string, string | number | undefined> {
    return {}
  }

  __inited = false;
  #initiating = false;
  /**
   * setup 前就被 updateProps 写过信号的 prop key
   */
  #preSetProps: Set<string> | undefined
  #onSlotChangeHookBindThis: EvHadler
  __thisRef: WeakRef<any>
  __superComp!: Function
  constructor(...args: any[]) {
    super();
    this.#cid = CompElemSn++

    this.__updateTree = []

    this.__thisRef = new WeakRef(this)

    this.__superComp = _getSuper(this.constructor as any)

    // 编译器注入
    this.__s = {} as Record<string, SignalNode<any>>

    const ceStatic = (this.constructor as any).__ce_static__

    // prop/state 定义表
    this.__propDefs = ceStatic?.props
    this.__stateDefs = ceStatic?.states

    this.#onSlotChangeHookBindThis = this.#onSlotChangeHook.bind(this)

    //init props via constructor
    if (args.length === 1) {
      this.#props = {}
      assign(this.#props, args[0])
    }

    /////////////////////////////////////////////////// slots
    if (!SlotsInstalled.has(this.constructor)) {
      SlotsInstalled.add(this.constructor)
      if (!Reflect.getOwnPropertyDescriptor(this.constructor.prototype, 'slots')) {
        Reflect.defineProperty(this.constructor.prototype, 'slots', {
          get() {
            if (this.isDestroyed) return EMPTY_SLOTS
            return this.#slotsSig().value
          },
          set(v) {
            if (this.isDestroyed) return
            this.#slotsSig().value = v
          }
        })
      }
    }

    /////////////////////////////////////////////////// 资源访问器
    // 编译器只把资源名与纯数据选项写进 `__ce_static__.resources`，访问器在这里按表安装
    // （类级一次性，与 slots 同一模式）。必须留在构造体内：它早于子类字段初始化器执行，
    // `@state x = this.rows` 这类写法才读得到值。
    const resDefs = ceStatic?.resources
    if (resDefs && !ResInstalled.has(this.constructor)) {
      ResInstalled.add(this.constructor)
      const proto = this.constructor.prototype
      for (const rKey in resDefs) {
        const existing = getProtoDescriptor(proto, rKey)
        if (existing) {
          // 祖先装过的资源访问器由子类复用；撞上其它成员时资源取不到值，只告警不覆盖
          if (process.env.DEV && !ResourceGetters.has(existing.get as Function)) {
            showWarn(`@resource '${rKey}' 与原型链上的同名成员冲突，访问器未安装——this.${rKey} 不是资源视图`)
          }
          continue
        }
        const getter = function (this: any) { return viewResource(this, rKey) }
        ResourceGetters.add(getter)
        Reflect.defineProperty(proto, rKey, { get: getter, configurable: true })
      }
    }

    /////////////////////////////////////////////////// 方法装饰器
  }
  insertStyleSheet(sheet: CssTemplate | CSSStyleSheet): CSSStyleSheet | null {
    if (!this.#shadow) return null
    const cssSheet = sheet instanceof CssTemplate ? sheetOfCssTemplate(sheet) : sheet
    if (!cssSheet) return null
    if (!this.#shadow.adoptedStyleSheets.includes(cssSheet))
      this.#shadow.adoptedStyleSheets = [...this.#shadow.adoptedStyleSheets, cssSheet]

    return cssSheet;
  }
  /**
   * Returns the root component in the parent chain, or itself if it's the top-level component.
   */
  get rootComponent(): CompElem {
    let comp: CompElem<any> = this;
    while (comp.parentComponent) {
      comp = comp.parentComponent;
    }
    return comp;
  }

  connectedCallback() {
    //parent
    let node = closest<Node | ShadowRoot>(
      this.parentNode!,
      (node) =>
        node instanceof CompElem || node.host instanceof CompElem,
      "parentNode"
    );
    this.#parentComponent = node
      ? node instanceof CompElem
        ? new WeakRef(node)
        : new WeakRef((node as ShadowRoot)!.host as CompElem)
      : undefined;

    let wrapper = ComponentUninitializedWrapperComponentMap.get(this)
    if (wrapper) {
      this.#wrapperComponent = new WeakRef(wrapper)
      ComponentUninitializedWrapperComponentMap.delete(this)
    }

    //host styles
    let hostCss = CssScopeCacheMap.get(this.constructor)?.get(Csscope.HOST)
    if (hostCss) {
      let styleRoot = this.#wrapperComponent?.deref()?.shadowRoot ?? this.#parentComponent?.deref()?.shadowRoot as HTMLDocument | ShadowRoot | undefined
      if (!styleRoot || !styleRoot.contains(this)) {
        styleRoot = this.ownerDocument
      }
      each(hostCss, cs => {
        if (!styleRoot.adoptedStyleSheets.includes(cs)) {
          styleRoot.adoptedStyleSheets = [...styleRoot.adoptedStyleSheets, cs]
        }
      })
    }

    this.setup();
  }

  disconnectedCallback() {
  }
  beforeDestroyed() {
  }
  destroyed() {
  }
  get isDestroyed() {
    // 已冻结同样视为「不可再使用」：离场动画期间它已不响应任何状态
    return this.#destroyed || this.#frozen
  }
  #destroyed = false
  #frozen = false
  //拆解进行中：挡住 beforeDestroyed() 里重入 destroy()（旧实现靠「入口即置 destroyed」达到同样效果）
  #tearingDown = false

  /**
   * 冻结：停掉事件、effect、资源，但**保留 shadow DOM 与元素本身**。
   *
   * 供离场动画使用（`commitRemove` 的 leave 路径调用）。冻结后组件不再响应
   * 任何状态变化，但元素仍带样式留在文档里演完动画，随后必须调 `__finalize()`
   * 收尾（`destroy()` 会依次做完两步）。幂等。
   */
  __freeze() {
    if (this.#frozen || this.#destroyed) return
    this.#frozen = true
    this.#tearingDown = true
    try {
      // 用户钩子放在最前：此时 effect/资源都还活着
      this.beforeDestroyed()

      //events
      releaseEventHandlers(this)
      //effects：视图 effect 在 dispose 时经 onDispose 自摘除，这里只需取快照逐个 dispose
      const viewEffects = Array.from(this.#viewEffects)
      this.#viewEffects.clear()
      for (let i = 0; i < viewEffects.length; i++) {
        viewEffects[i].dispose()
      }
      // setup effect（@watch / cssVars）在视图 effect 之后回收
      const setupEffects = this.#setupEffects
      this.#setupEffects = []
      for (let i = 0; i < setupEffects.length; i++) {
        const e = setupEffects[i]
        e.onDispose = undefined
        e.dispose()
      }
      releaseResources(this)
      this.__f = false
    } finally {
      this.#tearingDown = false
    }
  }

  /**
   * 落定：真正拆掉 DOM、槽与宿主更新点，并触发 `destroyed()`。幂等。
   */
  __finalize() {
    if (this.#destroyed) return
    this.#destroyed = true

    //sup scope：宿主（父组件）指向本组件的更新点
    const hostUps = this._hostUps
    this._hostUps = undefined
    if (hostUps && this.#parentComponent) {
      let pComp = this.#parentComponent.deref()
      if (pComp) {
        for (let i = 0; i < hostUps.length; i++) {
          const up = hostUps[i]
          if (up.__destroyed) continue
          up.destroy(pComp)
          remove(up.parent ? up.parent.children! : pComp.__updateTree, c => c === up)
        }
      }
    }
    //sub scopes
    //shadow 树内一次性清理全部嵌套子组件（含无插值覆盖的静态子组件，它们没有对应的更新点）
    if (this.#shadow) DomUtil.clear(this.#shadow)
    each(this.__updateTree, up => up?.destroy(this))

    //slots
    each(this.#slotsEl, (slotEl) => {
      SlotCompMap.delete(slotEl)
      slotEl.remove()
    })
    each(this.#slotNodes, (nodes) => {
      each(nodes, (node: Element) => node.remove())
    })
    each(this.__s?.slots?.value, (nodes: Node[], _k) => {
      each(nodes, (node: Element) => node.remove())
    })
    // slots 订阅 effect
    if (this.#slotSync !== undefined) {
      this.#slotSync.dispose()
      this.#slotSync = undefined
    }
    this.#onSlotChangeHookBindThis = this.__thisRef =
      this.#slotNodes = this.#slotsEl = this.#slotPropsMap = null as any
    if (this.__s?.slots) this.__s.slots = null as any

    this.remove()

    //data
    this.#renderRoot = this.#renderRoots = this.#shadow =
      this.#attrs =
      this.#props =
      this.#renderRoot =
      this.#renderRoots =
      this.#slotHooks =
      this.__updateTree =
      this.#parentComponent =
      this.#wrapperComponent = null as any
    //unmount

    this.destroyed()
  }

  destroy() {
    if (this.#destroyed || this.#tearingDown) return
    this.__freeze()
    this.#tearingDown = true
    try {
      this.__finalize()
    } finally {
      this.#tearingDown = false
    }
  }

  //////////////////////////////////// lifecycles
  //********************************** 首次渲染
  /**
   * 收编「视图无关」的 effect：`@watch`（`watchEffects`）与 `cssVars`（`cssEffect`）
   */
  #mountSetupEffects(ceStatic: CompiledStatic | undefined) {
    if (!ceStatic) return
    const watches = ceStatic.watchEffects
    const css = ceStatic.cssEffect
    if (watches === undefined && css === undefined) return
    if (watches !== undefined) {
      for (let i = 0, l = watches.length; i < l; i++) {
        // 追加而非去重：setup 途中抛错会让 __inited 停在 false，重入时再建一条，destroy 一并回收
        this.#setupEffects.push(effect(untrack(() => watches[i](this)), NO_CHILD_EFFECT))
      }
    }
    if (css !== undefined) {
      this.#setupEffects.push(effect(untrack(() => css(this)), NO_CHILD_EFFECT))
    }
  }

  setup() {
    if (this.__inited) return;
    //防止在钩子中出现重新挂载
    if (this.#initiating) return;
    this.#initiating = true;
    try {
      this.#doSetup();
    } finally {
      // 成功与抛错都复位：抛错时 __inited 仍为 false，重连后还能重试初始化；
      // 进行中的重入（钩子里再次挂载）仍被上面的 #initiating 判定挡住
      this.#initiating = false;
    }
  }

  #doSetup() {
    ////////////////////////////////////////////// Props & States
    const attrProps = this.#initProps();
    this.#props = {}
    Object.assign(this.#props, attrProps)

    this.#initStates();
    this.propsReady(CompElemHelper.snapshotProps(this, this.__propDefs))

    //2. Data
    this.#slotsSig().value = {}

    //3. Render
    const ctor = this.constructor as any
    const ceStatic = ctor.__ce_static__
    let fragment: DocumentFragment | undefined
    if (ceStatic?.noView) {
      //无视图组件
      this.#renderRoots = []
      this.#renderRoot = undefined
      // noView 同样需要 @watch / cssVars
      this.#mountSetupEffects(ceStatic)
    } else if (ceStatic?.buildTemplate) {
      this.#shadow = this.attachShadow({ mode: "open" });
      this.#shadow.adoptedStyleSheets = getBaseSheets(this.constructor);
      fragment = buildStaticView(this)
      this.#mountSetupEffects(ceStatic)
      if (fragment && fragment.children.length > 0) {
        const els = fragment.children
        const roots: Array<WeakRef<HTMLElement>> = []
        for (let i = 0, l = els.length; i < l; i++) {
          const n = els[i]
          if (n.nodeType === Node.ELEMENT_NODE) roots.push(new WeakRef(n as HTMLElement))
        }
        this.#renderRoots = roots
        this.#renderRoot = roots[0]
      }
    } else {
      throw new Error(
        `[compelem] <${this.tagName}> Component is not compiled @compelem/compiler plugin is required`,
      )
    }

    this.__inited = true;

    /////////////////////////////////////////////////// slots
    //slot hook
    let slotMap = ComponentUninitializedSlotFunctionMap.get(this)
    if (slotMap) {
      this.#slotHooks = slotMap
      ComponentUninitializedSlotFunctionMap.delete(this)
    }
    each(this.#slotHooks, (_v, k: string) => {
      this.#updateSlot(k)
    })

    this.beforeMount();
    // 首屏 props 已由 #initProps 取走，清掉 wrapper 外层条目中的本节点登记。
    // 放在早退之前：destroy() 在 beforeMount 里发生时，早退路径同样不能把条目留成强引用。
    ComponentUninitializedSubComponentPropMap.get(this.wrapperComponent!)?.delete(this)
    if (this.isDestroyed) {
      console.debug('Component is destroyed before mount', this.tagName)
      return
    }

    this.#mounted = true;

    if (fragment && fragment.children.length > 0) {
      this.#shadow.append(fragment)
    }

    this.#updateSlotsAry()

    if (this.#updateNextImmediatelyQ) {
      this.#updateNextImmediatelyQ.forEach((cbk) => Promise.resolve().then(cbk as any))
    }

    bindEvents(this)

    this.mounted();

    this.#mountSlotSync()
  }

  propsReady(props: Record<string, any>) { }

  render(): Template | null {
    return null
  }
  beforeMount(): void { }
  mounted(): void { }

  #onSlotChangeHook(e: Event) {
    let t = e.currentTarget as HTMLSlotElement
    let name = ''
    each(this.#slotsEl, (el, n) => {
      if (el === t) {
        name = n
        return false
      }
    })
    if (this.__inited)
      this.#onSlotChange(t, name === SLOT_NAME_DEFAULT ? '' : name)
  }
  /**
   * 插槽内容变化入口
   */
  #onSlotChange(slot: HTMLSlotElement, name: string) {
    this.#updateSlotsAry()
  }
  /**
   * 把某个具名插槽的 props 铺到它分配到的节点上，并派发 slotChange
   */
  #applySlotProps(slot: HTMLSlotElement, name: string) {
    const slotPropsMap = this.#slotPropsMap
    const props = get<Record<string, any>>(slotPropsMap[name], 'props')
    if (props) {
      const nodeAry = this.#slotsSig().peek()[name]
      if (nodeAry !== undefined) {
        for (let i = 0; i < nodeAry.length; i++) {
          const node = nodeAry[i] as Element
          if (node.nodeType !== Node.ELEMENT_NODE) continue
          if (node instanceof CompElem) {
            node.updateProps(props)
            continue
          }
          each(props, (v, k: string) => {
            if (node instanceof HTMLSlotElement) {
              const compOfSlot = SlotCompMap.get(node)
              if (compOfSlot) {
                const sname = node.name || SLOT_NAME_DEFAULT
                let slotMap = compOfSlot.#slotPropsMap[sname]
                if (!slotMap) {
                  slotMap = compOfSlot.#slotPropsMap[sname] = { props: {} }
                }
                if (!slotMap.props) {
                  slotMap.props = {}
                }
                slotMap.props[k] = v
                compOfSlot.#applySlotProps(node, sname)
              } else {
                //...
              }
            } else {
              node.setAttribute(k, v)
            }
          })
        }
      }
    }
    this.slotChange(slot, name === SLOT_NAME_DEFAULT ? '' : name)
  }
  /**
   * slots 信号订阅 effect
   */
  #slotSync: EffectNode | undefined
  /** 订阅 effect 的首跑标记：首屏对所有插槽铺 props + 派发（等价原生初始 slotchange） */
  #slotSyncFirst = true
  #mountSlotSync() {
    if (this.#slotSync !== undefined) return
    const sig = this.#slotsSig()
    this.#slotSync = effect(() => {
      const slots = sig.value
      const changed = this.#changedSlots
      this.#changedSlots = undefined
      const first = this.#slotSyncFirst
      this.#slotSyncFirst = false
      const slotKeys = keys<string>(slots)
      for (let i = 0; i < slotKeys.length; i++) {
        const k = slotKeys[i]
        // 此后只对**内容真的变了**的插槽派发：此前任何一处变动都会全表重铺 props + 全表 slotChange
        if (!first && changed !== undefined && !changed.has(k)) continue
        const slotEl = this.#slotsEl[k]
        if (slotEl === undefined) continue
        this.#applySlotProps(slotEl, k)
      }
    }, NO_CHILD_EFFECT)
  }
  slotChange(slot: HTMLSlotElement, name: string) { }
  attributeChangedCallback(attributeName: string, oldValue: string | null, newValue: string | null) {
    if (!this.__inited) return
    if (Object.is(newValue, oldValue)) return

    if (newValue === 'undefined') {
      newValue = null
    }

    let propName = camelCaseCached(attributeName)
    let propDef = this.__propDefs?.[propName]

    if (propDef && isBooleanProp(propDef.type)) {
      let v = isNull(newValue) ? false : getBooleanValue(newValue)
      if (get<boolean>(this, propName) === v) return
    }

    this.#attrChanged(attributeName, oldValue, newValue)
  }
  //********************************** 更新
  /**
   * 一轮 flush 结束后、且**本组件有视图 effect 真的跑过**时触发。
   *
   * 这是信号架构下「DOM 已落盘」的确定时点：更新单位是 effect，没有组件级 render
   * pass，所以 `updated(changed)` 那种「更新完了」钩子不存在（变更 diff 也无从汇总）。
   * 需要「某字段变了做某事」请直接用 `@watch('field')`，比全局时点精确得多。
   *
   * 触发范围：
   * - 数据驱动更新与 `forceUpdate()` 都会触发；
   * - 只有 `@watch` / `cssVars` 变化时**不**触发（它们的 effect 记在 `#setupEffects`，
   *   不进 `#viewEffects`，`forceUpdate()` 也碰不到）；
   * - 无视图组件（`render()` 返回 null）与模板无插值位的组件**永不触发**——没有视图
   *   effect 可跑，也就没有「更新完」可言。
   */
  afterUpdate(): void { }

  /**
   * 收编「子类以**裸类字段**覆盖继承自父类的 prop 默认值」——受支持的写法
   */
  #adoptOwnFieldDefaults(propDefs: Record<string, PropOption>) {
    const ctor = this.constructor as any
    const ceStatic = ctor.__ce_static__ as any
    if (!ceStatic) return
    const adopted: string[] = []
    for (const key in propDefs) {
      // hasOwn 而非 `key in this`：后者会命中原型链上的访问器，等于没判断
      if (!Object.prototype.hasOwnProperty.call(this, key)) continue
      // 必须确认原型链上确有访问器，才说明这是「遮蔽」而非「同名私有字段」。
      // 没有访问器时 own 属性是该 key 的唯一存储，删掉就是丢数据 —— 不动它。
      if (!hasAccessor(this, key)) continue
      const ownVal = (this as any)[key]
      delete (this as any)[key]
      if (!isUndefined(ownVal)) {
        // 已有信号（编译器为继承来的 prop 建的）直接写值；没有则补建 ——
        // 把「props 键 ⇒ __s 有信号」从编译器约定升级为运行时保证，
        // #initProps 的默认值就只需读 `__s[k].peek()`，不必再兜一份镜像
        const sig = this.__s[key]
        if (sig !== undefined) sig.value = ownVal
        else this.defineSignalField(key, ownVal)
      }
      adopted.push(key)
    }
    if (!adopted.length) return

    let table = ceStatic.props
    const superCtor = Reflect.getPrototypeOf(ctor) as any
    const superStatic = superCtor?.__ce_static__ as any
    if (table === superStatic?.props) {
      table = ceStatic.props = { ...table }
    }
    this.__propDefs = table
    if (FieldOverridePatched.has(ctor)) return
    FieldOverridePatched.add(ctor)
    for (let i = 0; i < adopted.length; i++) {
      const key = adopted[i]
      table[key] = { ...table[key] }
    }
  }

  /**
   * 1. 初始props中并未包含的属性，可从attributes取，且定义类型不是string时自动转
   * 2. 如果attributes中也未出现且必填报错
   * 3. 否则设置默认
   * @returns 非props的attr集合
   */
  #initProps() {
    let propDefs = this.__propDefs
    let attrs = this.attributes;
    let tagName = this.tagName;
    let wrapperProps = ComponentUninitializedSubComponentPropMap.get(this.wrapperComponent!)?.get(this) ?? null
    let parentProps: Record<string, any>
    if (this.#props == null) {
      parentProps = wrapperProps ?? EMPTY_PARENT_PROPS
    } else {
      parentProps = wrapperProps == null ? this.#props : merge(this.#props, wrapperProps)
    }
    let filterAttrs: Record<string, string> = {}
    for (let i = 0, l = attrs.length; i < l; i++) {
      let { name, value } = attrs[i] as Attr;
      if (name[0] === ATTR_PREFIX_EVENT ||
        name[0] === ATTR_PREFIX_PROP ||
        name[0] === ATTR_PREFIX_BOOLEAN ||
        name === ATTR_REF || name === 'slot') continue;
      let camelName = camelCaseCached(name)
      if (propDefs && !propDefs[camelName]) {
        filterAttrs[name] = value;
      }
    }
    this.#attrs = this.#attrs ? assign(this.#attrs, filterAttrs) : filterAttrs;
    let rs: Record<string, any> = {}
    if (!propDefs) return rs;

    // 子类以裸类字段覆盖继承自父类的 prop 默认值 ⇒ 收编（见 #adoptOwnFieldDefaults）
    this.#adoptOwnFieldDefaults(propDefs)
    propDefs = this.__propDefs!

    // setDefaults 登记的组件级默认 props（tag 名键）：在类字段默认值之后、外部 props 之前应用
    const compDefaults = getDefaultComponentProps(tagNameLower(tagName)!)

    let keys = Object.keys(propDefs)
    let size = keys.length
    for (let i = 0; i < size; i++) {
      const key = keys[i]
      const kbKey = kebabCaseCached(key)
      const hasAttr = this.hasAttribute(kbKey)
      let propDef = propDefs[key];
      let isInited = has(parentProps, key);
      let parentVal = parentProps[key]
      if (!isInited && has(parentProps, kbKey)) {
        isInited = true;
        parentVal = parentProps[kbKey]
      }
      const sig = this.__s[key]
      // peek()：setup 可能跑在父组件的 effect 里，`.value` 会把依赖挂到父身上
      let defaultVal = sig !== undefined ? sig.peek() : undefined
      // 生效默认值：setDefaults 组件级默认覆盖类字段默认（仍低于外部传入）
      let effDefault = defaultVal
      if (compDefaults !== undefined) {
        const cd = has(compDefaults, key) ? compDefaults[key] : compDefaults[kbKey]
        if (!isUndefined(cd)) effDefault = cd
      }
      // _defaultValue 是类级共享表：只登记来自类字段初始声明的值。setup 前被
      // updateProps 写过信号的 key（#preSetProps）此时 peek() 到的是外部传入值，
      // 登记进去会污染后续所有实例的默认值 —— 跳过，留给未被污染的实例登记
      if (!('_defaultValue' in propDef) && !this.#preSetProps?.has(key)) {
        //在构造结束后
        propDef._defaultValue = defaultVal
        if (!propDef.type) {
          const inferSrc = isUndefined(defaultVal) ? effDefault : defaultVal
          let type = typeof inferSrc as string
          if (isArray(inferSrc)) type = 'array'
          let inferredType = PropTypeMap[type]
          propDef.type = inferredType
        }
      }

      let val: any = undefined;
      if (isInited) {
        val = isNil(parentVal) ? effDefault : parentVal;
      } else {
        val = effDefault;
        let attr =
          attrs.getNamedItem(kbKey) ||
          attrs.getNamedItem(ATTR_PREFIX_PROP + kbKey) ||
          attrs.getNamedItem(kbKey + ATTR_PREFIX_PROP);
        if (attr) {
          isInited = true;
          val = attr.value;
        }
      }

      //required check
      let isRequired = propDef.required;
      if (isRequired && !isInited) {
        showTagError(tagName, "Prop '" + key + "' is required");
        continue
      }

      val = CompElemHelper.propTypeCheck(this, propDefs, key, val, hasAttr)
      // 字符串转换失败落到 undefined（如空白特性对 Number，见 convertValue）⇒ 回退默认值
      if (isUndefined(val)) val = effDefault

      if (propDef.attribute !== false && isDefined(val) && !isObject(val)) {
        CompElemHelper.updateAttribute(this, propDef, key, val)
      }

      if (sig !== undefined) sig.value = val
      else this.defineSignalField(key, val)
      if (hasAttr)
        rs[key] = val;
    }

    return rs
  }

  #initStates() {
    let stateDefs = this.__stateDefs
    if (stateDefs)
      each<StateDefInternal, string>(stateDefs, (_def, key) => {
        let stateDef = stateDefs[key] as StateDefInternal
        const sig = this.__s[key]
        if (stateDef && stateDef.prop) {
          // peek()：setup 可能跑在父组件的 effect 里，`.value` 会把依赖挂到父身上
          const src = this.__s[stateDef.prop]
          const val = cloneDeep(src !== undefined ? src.peek() : undefined)
          if (sig !== undefined) sig.value = val
        }
      })
  }
  updateProps(props: Record<string, any>, force = false) {
    let propDefs = this.__propDefs
    if (!propDefs) return
    if (!this.__inited) {
      // #props 可能尚未建立（无参构造），先建表再 assign，否则写入丢失
      this.#props ??= {}
      assign(this.#props, props)
      for (const k in props) {
        if (!Object.prototype.hasOwnProperty.call(props, k)) continue
        const ck = camelCaseCached(k)
        if (this.__s[ck]) {
          this.__s[ck].value = props[k]
            // 记下 setup 前写过信号的 key：#initProps 不再把它当类字段默认值登记
            ; (this.#preSetProps ??= new Set<string>()).add(ck)
        }
      }
      return
    }

    //单键快路径
    let singleK: string | undefined
    let keyCount = 0
    for (const k in props) {
      if (!Object.prototype.hasOwnProperty.call(props, k)) continue
      singleK = k
      keyCount++
      if (keyCount > 1) break
    }
    if (keyCount === 1) {
      CompElemHelper.updatePropOne(this, singleK!, props[singleK!], force)
      return
    }
    // 归一化（camelCase 键 + 类型转换后的值）写在**副本**上：
    // 直接改 props 会污染调用方传入的对象（编译产物的字面量、父组件的缓存值）
    const normalized: Record<string, any> = { ...props }
    const pendingAttrs: Array<any> = []
    batch(() => {
      for (const k in props) {
        if (!Object.prototype.hasOwnProperty.call(props, k)) continue
        let v = props[k]
        let ck = camelCaseCached(k)
        let propDef = propDefs[ck]
        if (!propDef) continue
        v = CompElemHelper.propTypeCheck(this, propDefs, ck, v)

        // peek()：写路径上读旧值去重，`.value` 会在父的 point effect 里挂上多余依赖
        const oldValue = this.__s[ck] ? this.__s[ck].peek() : undefined
        if (!force && Object.is(oldValue, v)) continue

        if (propDef.attribute !== false && isDefined(v) && !isObject(v)) {
          pendingAttrs.push([propDef, ck, v])
        }

        normalized[ck] = v
        if (this.__s[ck]) this.__s[ck].value = v
      }
    })
    const need2UpdateAttrs = pendingAttrs.length ? pendingAttrs : null
    assign(this.#props, normalized)

    if (need2UpdateAttrs) {
      for (let i = 0; i < need2UpdateAttrs.length; i++) {
        const [propDef, key, v] = need2UpdateAttrs[i]
        CompElemHelper.updateAttribute(this, propDef, key, v)
      }
    }
  }

  /**
   * 绑定slot标签，render时调用
   */
  _bindSlot(slot: HTMLSlotElement, name: string, props: Record<string, any>) {
    //1. 设置map
    if (!this.#slotsEl[name]) {
      this.#slotsEl[name] = slot;
      SlotCompMap.set(slot, this)
    }

    let evName = 'slotchange'
    //slotchange
    registerEvent(this, evName, this.#onSlotChangeHookBindThis, slot)

    //3. 保存参数
    if (!isEmpty(props)) {
      let slotMap = this.#slotPropsMap[name]
      if (!slotMap) {
        slotMap = this.#slotPropsMap[name] = {}
      }
      slotMap.props = props
    }

  }
  //slot变量变动时触发
  _updateSlot(name: string, propName?: string, value?: any) {
    let slotEl = this.#slotsEl[name]
    let hook = this.#slotHooks[name]
    if (!hook && !slotEl) return;

    if (propName) {
      let slotMap = this.#slotPropsMap[name] ?? (this.#slotPropsMap[name] = {})
        ; (slotMap.props ?? (slotMap.props = {}))[propName] = value
    }
    if (!!hook) {
      this.#updateSlot(name)
    } else {
      //update nodes
      let els = slotEl.assignedElements({ flatten: true })
      for (let i = 0; i < els.length; i++) {
        const el = els[i];
        el.setAttribute(propName!, value + '')
      }
    }
  }

  /**
   * 编译器产物 `buildTemplate()` 的 innerHTML 快路径入口：把片段里的占位符文本节点
   * 原位拆分并按文档序收集进 `nodes`。
   *
   * 暴露为实例方法（而非让产物 import 一个自由函数）是因为 `buildTemplate` 与
   * `subs[id].buildTemplate` 都以 `buildTemplate.call(component)` 调用 —— `this`
   * 恒为组件实例，无需给产物引入额外的模块级标识符。
   */
  _ceWalkSplit(f: Node, nodes: Node[]): void {
    walkSplitText(f, nodes)
  }

  #updateSlotsAry() {
    if (!this.#renderRoot) return
    let slotKeys = keys(this.#slotsEl)
    if (isEmpty(slotKeys)) return
    // 分组键判定对每个节点都做一次成员查找，Set 比 includes 的线性扫划算得多
    const slotKeySet = new Set<string>(slotKeys)

    // assignedNodes({flatten:true}) 每次都要重算分配：同一轮里「收集」与「修剪空插槽」
    // 会问到同一个插槽元素，本轮缓存一次
    const assignedCache = new Map<HTMLSlotElement, Node[]>()
    const assignedOf = (el: HTMLSlotElement): Node[] => {
      let a = assignedCache.get(el)
      if (a === undefined) assignedCache.set(el, a = el.assignedNodes({ flatten: true }))
      return a
    }
    // 修剪用判据：空白文本节点与没有分配内容的插槽都不算插槽内容
    const isSlotFiller = (node: Node) =>
      (node.nodeType === Node.TEXT_NODE && isBlank(node.textContent)) ||
      (node instanceof HTMLSlotElement && assignedOf(node).length === 0)

    const cs: Node[] = []
    const childNodes = this.childNodes
    for (let ci = 0; ci < childNodes.length; ci++) {
      const node = childNodes[ci]
      if (node.nodeType === Node.COMMENT_NODE) continue
      if (node.nodeType === Node.TEXT_NODE && isBlank(node.textContent)) continue
      if (node instanceof HTMLSlotElement) {
        const assigned = assignedOf(node)
        for (let ai = 0; ai < assigned.length; ai++) cs.push(assigned[ai])
        continue
      }
      cs.push(node)
    }

    let groups = groupBy<Node>(cs, node => {
      if (node.nodeType === Node.TEXT_NODE && slotKeySet.has(SLOT_NAME_DEFAULT)) return SLOT_NAME_DEFAULT
      if (node instanceof Element) {
        let sName = node.getAttribute('slot') || SLOT_NAME_DEFAULT
        if (slotKeySet.has(sName))
          return sName
      }
    })
    if (isEmpty(groups)) {
      this.#setSlots({})
      return;
    }

    each(groups, (nodeAry, k: string) => {
      if (!k) return;
      while (nodeAry.length > 0) {
        if (isSlotFiller(nodeAry[0])) {
          nodeAry.shift();
          continue;
        }
        break;
      }
      while (nodeAry.length > 0) {
        if (isSlotFiller(nodeAry[nodeAry.length - 1])) {
          nodeAry.pop();
          continue;
        }
        break;
      }
    })

    let rs: typeof groups = {}
    each(groups, (v, k) => {
      if (!isEmpty(v)) {
        rs[k] = v
      }
    })

    this.#setSlots(rs)
  }


  #slotsSig() {
    const s = this.__s || (this.__s = {} as Record<string, SignalNode<any>>)
    return (s.slots || (s.slots = signal<Record<string, Node[]>>({})))
  }
  /**
   * 本轮**内容真的变了**的插槽名集合（`slotChange` 只对这些名字派发）。
   *
   * 由 #setSlots 累积、由 slots 订阅 effect 取走清空：同一轮多次写入自然并集。
   */
  #changedSlots: Set<string> | undefined
  #setSlots(next: Record<string, Node[]>) {
    const sig = this.#slotsSig()
    const prev = sig.value
    if (sameSlots(prev, next)) return
    // 逐名浅比较收集变化集（数组每轮都是新建的，只能比元素）
    const changed = this.#changedSlots ?? (this.#changedSlots = new Set<string>())
    const nextKeys = keys<string>(next)
    for (let i = 0; i < nextKeys.length; i++) {
      const k = nextKeys[i]
      if (!sameNodeAry(prev[k], next[k])) changed.add(k)
    }
    const prevKeys = keys<string>(prev)
    for (let i = 0; i < prevKeys.length; i++) {
      const k = prevKeys[i]
      if (next[k] === undefined) changed.add(k)
    }
    // 整体写入语义不变：slots 读侧（模板里的 this.slots.xxx）拿的仍是全量表
    sig.value = next
  }
  /**
   * 重算某个**函数型插槽**的 DOM，并整体替换上一次的结果
   */
  #slotViews: Record<string, EffectNode> = {}
  // 正在跑离场动画的插槽旧节点：仍挂在 light DOM 上，不能由 #swapSlotNodes 摘除。
  // 按节点而非插槽名登记：连续多次换代时，各代的收尾只清自己的标记，
  // 不会把仍在动画中的下一代标记提前删掉。
  #leavingNodes: WeakSet<Node> | undefined
  #updateSlot(name: string) {
    let hook = this.#slotHooks[name]
    if (!hook) return;
    let slotMap = this.#slotPropsMap[name]
    if (!this.#slotsEl[name]) return
    const owner = resolveSubTemplateOwner(hook)!

    let view = this.#slotViews[name]
    if (view !== undefined && !view.disposed) {
      view.run()
    } else {
      // `<slot transition="fade">`：静态属性，读一次即可
      const spec = slotTransitionOf(this.#slotsEl[name])
      // 上一代快照的 UpdatePoint 树（item effect 的挂靠点），由 onCleanup 回收
      let prevUpAry: UpdatePoint[] | undefined
      const eff = effect(() => {
        // 上一代 scope 回收：effect 重跑前（replace）与 dispose 时（组件销毁）都会执行
        onCleanup(() => {
          const ups = prevUpAry
          prevUpAry = undefined
          const oldNodes = this.#slotNodes?.[name]
          const hasOld = oldNodes !== undefined && oldNodes.length > 0

          // 同步路径（未配置过渡 / 组件正在销毁 / 没有旧内容）与旧实现逐字等价：
          // 节点摘除由紧随其后的 #swapSlotNodes 负责
          const teardown = (removeNodes: boolean) => {
            if (ups !== undefined) {
              // 必须在 up.destroy() 把 up.node 置 null 之前摘除 __dirNodeMap 条目
              //（Map 强引用节点，旧节点被拆下后条目不摘就连带子树一起泄漏）
              purgeDirNodeMap(owner, ups)
              // destroy 带 context：有更新点覆盖的元素子树经 DomUtil.clear 连带销毁
              //（组件自身销毁路径同样经这里回收）
              for (let i = 0; i < ups.length; i++) ups[i].destroy(this)
            }
            if (!hasOld) return
            // 更新点只覆盖有插值的位置：上一代根节点里无更新点覆盖的静态嵌套
            // CompElem 不在 ups 子树内，须对全部旧根节点补一次子树扫描
            //（destroy 幂等，与上面 destroy(this) 的重叠部分无害）
            for (let i = 0; i < oldNodes!.length; i++) {
              const n = oldNodes![i]
              if (removeNodes) n.parentNode?.removeChild(n)
              if (n instanceof CompElem) n.destroy()
              else DomUtil.clear(n as Element)
            }
          }

          if (spec === null || this.isDestroyed || !hasOld) {
            teardown(false)
            return
          }

          // 离场：冻结订阅 → 标记本插槽处于离场（#swapSlotNodes 跳过旧节点摘除）
          // → 动画结束后统一收尾
          if (ups !== undefined) {
            for (let i = 0; i < ups.length; i++) ups[i].freeze()
          }
          for (let i = 0; i < oldNodes!.length; i++) freezeSubComponents(oldNodes![i])
          stripViewKeyMarkers(oldNodes!)
          const leavingSet = this.#leavingNodes ?? (this.#leavingNodes = new WeakSet())
          for (let i = 0; i < oldNodes!.length; i++) leavingSet.add(oldNodes![i])
          runLeave(oldNodes!, spec, () => {
            for (let i = 0; i < oldNodes!.length; i++) leavingSet.delete(oldNodes![i])
            teardown(true)
          })
        })
        const nodes = buildSubTemplateView(owner, hook, get(slotMap, 'props'))
        // 先摘本代 upAry（buildSubTemplateView 挂在首个产出节点的 __ceUpAry 上），
        // 再滤注释节点 —— 顺序反了会把载体节点一起滤掉
        prevUpAry = (nodes[0] as any)?.__ceUpAry as UpdatePoint[] | undefined
        this.#swapSlotNodes(name, reject(nodes, (n: Node) => n.nodeType === Node.COMMENT_NODE), spec)
      }, NO_CHILD_EFFECT)
      this._regViewEffect(eff)
      this.#slotViews[name] = eff
    }
  }

  /**
   * 拆掉上一次的插槽内容并挂上这一代的（replace 契约）。
   * 从 #updateSlot 抽出：常驻 effect 每次重跑与首屏创建走同一条替换路径。
   */
  #swapSlotNodes(name: string, nnodes: Node[], spec: string | null = null) {
    // 上一代正在跑离场：节点归 runLeave 的 finalize 摘除，这里不能抢
    let slottedNodes = this.#slotNodes[name]
    let leaving = false
    if (this.#leavingNodes !== undefined && !isEmpty(slottedNodes)) {
      for (let i = 0; i < slottedNodes!.length; i++) {
        if (this.#leavingNodes.has(slottedNodes![i])) {
          leaving = true
          break
        }
      }
    }
    if (!leaving && !isEmpty(slottedNodes)) {
      // replace 契约：先拆干净上一次的作用域（节点），再挂新的
      for (let i = 0; i < slottedNodes.length; i++) {
        const n = slottedNodes[i];
        n.parentNode?.removeChild(n)
      }
    }
    this.#slotNodes[name] = nnodes;
    if (name && name !== SLOT_NAME_DEFAULT) {
      for (let i = 0; i < nnodes.length; i++) {
        const n = nnodes[i]
        if (n.nodeType === Node.ELEMENT_NODE) (n as Element).setAttribute('slot', name)
      }
    }
    // 首屏（未 mounted）不入场，与结构指令的 appear 规则保持一致
    if (spec && this.isMounted) prepareEnter(nnodes, spec)
    this.append(...nnodes)
  }

  /**
   * 把**已编译的**子模板回调渲染成节点数组
   *
   * @param tmplFn 子模板回调**本体**（不是它的返回值）
   * @param args   透传给回调形参的实参
   */
  getSubViewNodes(tmplFn: TplFn, ...args: any[]): Node[] {
    const owner = resolveSubTemplateOwner(tmplFn)
    if (!owner) {
      if (process.env.DEV) {
        showTagError(this.tagName, `getSubViewNodes: 回调缺少 provenance（未经 slot() 指令登记），无法定位其编译产物`)
      }
      return []
    }
    return buildSubTemplateView(owner, tmplFn, ...args)
  }

  #attrChanged(name: string, _oldValue: string | null, newValue: string | null) {
    if (!this.__inited) return;
    const propDef = this.__propDefs?.[camelCaseCached(name)]
    if (!propDef) return;
    let camelName = camelCaseCached(name)
    if (isNull(newValue)) {
      //使用默认值
      newValue = propDef._defaultValue
    }
    this.updateProps({ [camelName]: newValue })
  }

  ////////////////////----------------------------/////////////// APIs
  /**
   * 发出组件事件
   * @param evName 事件名称
   * @param args 自定义参数
   */
  emit(
    evName: string,
    arg: Record<string, any> = {},
    event?: Event
  ) {
    if (event) {
      arg.event = event;
    }
    arg.target = this;

    if (this.hasAttribute('emit-native')) {
      this.dispatchEvent(
        new CustomEvent(evName, {
          bubbles: false,
          composed: false,
          cancelable: true,
          detail: arg,
        })
      );
    } else {
      let evSrc = get<number>(this, '__c_emit_event_')
      if (!this.wrapperComponent) {
        return
      }
      emitEvent(this.wrapperComponent, evSrc, evName, arg)
    }
  }
  /**
   * 下一帧执行
   * @param cbk
   */
  nextTick(cbk: () => void) {
    if (!this.isMounted) {
      if (!this.#updateNextImmediatelyQ) {
        this.#updateNextImmediatelyQ = []
      }

      this.#updateNextImmediatelyQ.push(cbk)
      return
    }

    Promise.resolve().then(cbk)
  }
  /**
   * 声明一个运行时命名的响应式字段，返回其信号
   * @param key 
   * @param init 
   * @returns 
   */
  defineSignalField<T = any>(key: string, init: T): { value: T } {
    const s = this.__s || (this.__s = {} as Record<string, SignalNode<any>>)
    return (s[key] || (s[key] = signal(init)))
  }
  // 编译器调用
  _regViewEffect(e: EffectNode) {
    // 登记可能晚于 effect 的销毁：结构指令删除子项时 commitRemove 先拆组件再
    // up.destroy()，此时本 effect 已 disposed；组件自身已销毁时同理。
    if (e.disposed || this.isDestroyed) {
      e.dispose()
      return
    }
    // 归属标记：flush 末段据此汇总「本轮更新过的组件」并触发 afterUpdate
    e.owner = this
    const effects = this.#viewEffects
    effects.add(e)
    e.onDispose = () => {
      e.onDispose = undefined
      effects.delete(e)
    }
  }

  /**
   * 强制重渲染一次视图
   */
  forceUpdate() {
    // 整段批量
    batch(() => {
      const effects = this.#viewEffects
      if (effects.size > 0) {
        this.__f = true
        try {
          // 直接迭代 Set：重跑中途 dispose 掉的条目自摘除后不会再被访问，
          // 同轮新登记的会被访问——与原数组「每轮重读 length」的行为一致
          for (const e of effects) {
            if (e.disposed) continue
            try {
              e.run()
            } catch (err) {
              reportEffectError(err, e)
            }
          }
        } finally {
          this.__f = false
        }
      }
    })
  }
}