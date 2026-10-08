import {
  assign,
  cloneDeep,
  closest,
  each,
  first,
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
  keys,
  last,
  merge,
  reject,
  remove,
  size,
  toArray
} from "myfx";
import { getBaseSheets } from "./config";
import { ComponentUninitializedSlotFunctionMap, ComponentUninitializedSubComponentPropMap, ComponentUninitializedWrapperComponentMap, CssScopeCacheMap, CssTemplateSheetMap, PropTypeMap, SLOT_NAME_DEFAULT } from "./constants";
import { Csscope } from "./decorators/csscope";
import { bindEvents, emitEvent, EvHadler, registerEvent, releaseEventHandlers } from "./events/event";
import { CompElemHelper } from "./helpers";
import { IComponent } from "./IComponent";
import { CssTemplate } from "./render/CssTemplate";
import { ATTR_PREFIX_BOOLEAN, ATTR_PREFIX_EVENT, ATTR_PREFIX_PROP, ATTR_REF, buildStaticView } from "./render/render";
import { Template } from "./render/Template";
import { UpdatePoint } from "./render/UpdatePoint";
import { walkSplitText } from "./render/walk";
import { batch, effect, EffectNode, signal, SignalNode } from "./signal";
import { PropOption, SlotOptions, StateDefInternal, StateOption, TplFn } from "./types";
import { _getSuper, camelCaseCached, DomUtil, getBooleanValue, isBooleanProp, kebabCaseCached, showTagError } from "./utils";

let CompElemSn = 0
const SlotCompMap = new WeakMap()
const EMPTY_SLOTS = {}
const EMPTY_PARENT_PROPS: Record<string, any> = {}
/** varChain 兜底的空值：共享同一个冻结数组，缺路径时指令拿到的是空链而非 undefined */
const EMPTY_VAR_CHAIN: string[] = []

/**
 * slots 内容浅比较
 */
function sameSlots(a: Record<string, Node[]>, b: Record<string, Node[]>): boolean {
  const ka = keys(a)
  if (ka.length !== size(b)) return false
  for (let i = 0; i < ka.length; i++) {
    const k = ka[i]
    const av = a[k]
    const bv = b[k]
    if (av === bv) continue
    if (!av || !bv || av.length !== bv.length) return false
    for (let j = 0; j < av.length; j++) {
      if (av[j] !== bv[j]) return false
    }
  }
  return true
}

/**
 * CompElem基类（见 utils.ts：静态元数据 helper 已下沉）。
 *
 * @author holyhigh2
 */
export class CompElem<T = HTMLElement> extends HTMLElement implements IComponent<T> {
  #cid: number
  #slotPropsMap: Record<string, Partial<SlotOptions>> = {}
  __data_: Record<string, any> = {};
  #shadow: ShadowRoot;
  //保存所有渲染上下文 {CompElem/Directive}
  __updateTree: Array<UpdatePoint>
  // 每实例信号存储
  __s: Record<string, SignalNode<any>>

  // 强制刷新标志
  __f = false

  // cssVars
  __cssVarVals: Record<string, string> | undefined

  #viewEffects: EffectNode[] = []

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
  get slots(): Record<string, Array<Node>> {
    return EMPTY_SLOTS
  }
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
    if (size(args) === 1) {
      this.#props = {}
      assign(this.#props, first(args))
    }

    /////////////////////////////////////////////////// slots
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

    /////////////////////////////////////////////////// 方法装饰器
  }
  insertStyleSheet(sheet: CssTemplate | CSSStyleSheet): CSSStyleSheet | null {
    if (!this.#shadow) return null
    let cssSheet: CSSStyleSheet | undefined;
    if (sheet instanceof CssTemplate) {
      cssSheet = CssTemplateSheetMap.get(sheet)
      if (!cssSheet) {
        let cssTxt = sheet.getCssText()
        cssSheet = new CSSStyleSheet();
        try {
          cssSheet.replaceSync(cssTxt)
        } catch (e) { }
        CssTemplateSheetMap.set(sheet, cssSheet)
      }
    } else if (sheet instanceof CSSStyleSheet) {
      if (this.#shadow.adoptedStyleSheets.includes(sheet)) return sheet
      cssSheet = sheet;
    }

    if (cssSheet && !this.#shadow.adoptedStyleSheets.includes(cssSheet))
      this.#shadow.adoptedStyleSheets = [...this.#shadow.adoptedStyleSheets, cssSheet]

    return cssSheet!;
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
    return this.#destroyed
  }
  #destroyed = false
  destroy() {
    if (this.#destroyed) return

    this.#destroyed = true

    this.beforeDestroyed()

    //events
    releaseEventHandlers(this)
    //effects
    const viewEffects = this.#viewEffects
    for (let i = 0; i < viewEffects.length; i++) {
      viewEffects[i].dispose()
    }
    viewEffects.length = 0
    this.__f = false

    //sup scope
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
    each(this.__s?.slots?.value, (nodes: Node[], k) => {
      each(nodes, (node: Element) => node.remove())
    })
    this.#updateSlots.clear();
    this.#onSlotChangeHookBindThis = this.__thisRef =
      this.#slotNodes = this.#slotsEl = this.#updateSlots = this.#slotPropsMap = null as any
    if (this.__s?.slots) this.__s.slots = null as any

    this.remove()

    //data
    this.#renderRoot = this.#renderRoots = this.#shadow =
      this.#attrs =
      this.#props =
      this.#renderRoot =
      this.#renderRoots =
      this.#slotHooks =
      this.__data_ =
      this.__updateTree =
      this.#parentComponent =
      this._asyncDirectives =
      this.#wrapperComponent = null as any
    //unmount

    this.destroyed()
  }

  //////////////////////////////////// lifecycles
  //********************************** 首次渲染
  setup() {
    if (this.__inited) return;
    //防止在钩子中出现重新挂载
    if (this.#initiating) return;
    this.#initiating = true;

    ////////////////////////////////////////////// Props & States
    const props = this.#initProps();
    this.#props = {}
    Object.assign(this.#props, props)
    for (const key in props) {
      const v = props[key];
      this.__data_[key] = v;
    }

    this.#initStates();
    this.propsReady(props)

    //2. Data
    this.#slotsSig().value = {}

    Reflect.defineProperty(this.__data_, '__isData', {
      enumerable: false,
      value: true
    })

    //3. Render
    const ceStatic = (this.constructor as any).__ce_static__
    let fragment: DocumentFragment | undefined
    if (ceStatic?.noView) {
      //无视图组件
      this.#renderRoots = []
      this.#renderRoot = undefined
    } else if (ceStatic?.buildTemplate) {
      this.#shadow = this.attachShadow({ mode: "open" });
      this.#shadow.adoptedStyleSheets = getBaseSheets(this.constructor);
      fragment = buildStaticView(this)
      if (ceStatic.watchEffects) {
        for (const factory of ceStatic.watchEffects) {
          effect(factory(this))
        }
      }
      if (ceStatic.cssEffect) {
        const cssEffectFn = ceStatic.cssEffect(this)
        effect(cssEffectFn)
      }
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
    this.#updateSlotsAry()
    //slot hook
    let slotMap = ComponentUninitializedSlotFunctionMap.get(this)
    if (slotMap) {
      this.#slotHooks = slotMap
      ComponentUninitializedSlotFunctionMap.delete(this)
    }
    each(this.#slotHooks, (v, k: string) => {
      this.#updateSlot(k)
    })

    this.beforeMount();
    if (this.isDestroyed) {
      console.debug('Component is destroyed before mount', this.tagName)
      return
    }

    this.#mounted = true;

    if (fragment && fragment.children.length > 0) {
      this.#shadow.append(fragment)
      ComponentUninitializedSubComponentPropMap.delete(this)
    }

    if (this.#updateNextImmediatelyQ) {
      this.#updateNextImmediatelyQ.forEach((cbk) => Promise.resolve().then(cbk as any))
    }

    bindEvents(this)

    this.mounted();
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
  #onSlotChange(slot: HTMLSlotElement, name: string) {
    //1. 更新 _slotsPropMap & slots
    this.#updateSlotsAry()
    //2. 设置attrs
    let props = get<Record<string, any>>(this.#slotPropsMap[name], 'props')
    if (props) {
      each(this.slots, (nodeAry, k: string) => {
        nodeAry.filter(node => node.nodeType === Node.ELEMENT_NODE).forEach((node: Element) => {
          if (node instanceof CompElem) {
            node.updateProps(props)
            return;
          }
          each(props, (v, k: string) => {
            if (node instanceof HTMLSlotElement) {
              let compOfSlot = SlotCompMap.get(node)
              if (compOfSlot) {
                let sname = node.name || SLOT_NAME_DEFAULT
                let slotMap = compOfSlot.#slotPropsMap[sname]
                if (!slotMap) {
                  slotMap = compOfSlot.#slotPropsMap[sname] = { props: {} }
                }
                if (!slotMap.props) {
                  slotMap.props = {}
                }
                slotMap.props[k] = v
                compOfSlot.#onSlotChange(node, sname)
              } else {
                //...
              }
            } else {
              node.setAttribute(k, v)
            }

          })
        })
      })
    }

    //3. callback
    this.slotChange(slot, name)
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
   * 是否需要更新，可获取变更属性
   * 返回true时更新
   */
  shouldUpdate(changed: Record<string, any>): boolean {
    return true;
  }
  /**
   * 1. 调用render
   * 2. 更新@query/all
   * 3. 更新ref
   * 4. 更新prop到attr的映射
   * @param changed
   */
  updated(changed: Record<string, any>) { }

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

    let keys = Object.keys(propDefs)
    let size = keys.length
    for (let i = 0; i < size; i++) {
      const key = keys[i]
      const kbKey = kebabCaseCached(key)
      const hasAttr = this.hasAttribute(kbKey)
      let propDef = propDefs[key];
      let isInited = has(parentProps, key);
      const sig = this.__s[key]
      let defaultVal = sig !== undefined ? sig.value : this.__data_[key]
      if (!('_defaultValue' in propDef)) {
        //在构造结束后
        propDef._defaultValue = defaultVal
        if (!propDef.type) {
          let type = typeof defaultVal as string
          if (isArray(defaultVal)) type = 'array'
          let inferredType = PropTypeMap[type]
          propDef.type = inferredType
        }
      }

      let val = undefined;
      if (isInited) {
        val = isNil(parentProps[key]) ? defaultVal : parentProps[key];
      } else {
        val = defaultVal;
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
        break
      }

      val = CompElemHelper.propTypeCheck(this, propDefs, key, val, hasAttr)

      if (propDef.attribute !== false && isDefined(val) && !isObject(val)) {
        CompElemHelper.updateAttribute(this, propDef, key, val)
      }

      this.__data_[key] = val;
      if (sig !== undefined) sig.value = val
      if (hasAttr)
        rs[key] = val;
    }

    return rs
  }

  #initStates() {
    let stateDefs = this.__stateDefs
    if (stateDefs)
      each<StateDefInternal, string>(stateDefs, (def, key) => {
        let stateDef = stateDefs[key] as StateDefInternal
        const sig = this.__s[key]
        if (stateDef && stateDef.prop) {
          const val = cloneDeep(this.__data_[stateDef.prop])
          this.__data_[key] = val
          if (sig !== undefined) sig.value = val
        } else {
          this.__data_[key] = sig !== undefined ? sig.value : undefined
        }
      });
  }
  updateProps(props: Record<string, any>, force = false) {
    let propDefs = this.__propDefs
    if (!propDefs) return
    if (!this.__inited) {
      assign(this.#props, props)
      for (const k in props) {
        if (!Object.prototype.hasOwnProperty.call(props, k)) continue
        const ck = camelCaseCached(k)
        if (this.__s[ck]) this.__s[ck].value = props[k]
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
    const pendingAttrs: Array<any> = []
    batch(() => {
      for (const k in props) {
        if (!Object.prototype.hasOwnProperty.call(props, k)) continue
        let v = props[k]
        let ck = camelCaseCached(k)
        let propDef = propDefs[ck]
        if (!propDef) continue
        v = CompElemHelper.propTypeCheck(this, propDefs, ck, v)

        const oldValue = this.__s[ck] ? this.__s[ck].value : this.__data_[ck]
        if (!force && Object.is(oldValue, v)) continue

        if (propDef.attribute !== false && isDefined(v) && !isObject(v)) {
          pendingAttrs.push([propDef, ck, v])
        }

        this.__data_[ck] = v
        props[ck] = v
        if (this.__s[ck]) this.__s[ck].value = v
      }
    })
    const need2UpdateAttrs = pendingAttrs.length ? pendingAttrs : null
    assign(this.#props, props)

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
  #updateSlots: Set<string> = new Set()
  _updateSlot(name: string, propName?: string, value?: any) {
    let slotEl = this.#slotsEl[name]
    let hook = this.#slotHooks[name]
    if (!hook && !slotEl) return;

    let slotMap = this.#slotPropsMap[name]
    if (propName) {
      if (!slotMap.props) {
        slotMap.props = {}
      }
      slotMap.props[propName] = value
    }
    if (!!hook) {
      this.#updateSlots.add(name)
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

    const cs: Node[] = []
    const childNodes = this.childNodes
    for (let ci = 0; ci < childNodes.length; ci++) {
      const node = childNodes[ci]
      if (node.nodeType === Node.COMMENT_NODE) continue
      if (node.nodeType === Node.TEXT_NODE && isBlank(node.textContent)) continue
      if (node instanceof HTMLSlotElement) {
        const assigned = node.assignedNodes({ flatten: true })
        for (let ai = 0; ai < assigned.length; ai++) cs.push(assigned[ai])
        continue
      }
      cs.push(node)
    }

    let groups = groupBy<Node>(cs, node => {
      if (node.nodeType === Node.TEXT_NODE && slotKeys.includes(SLOT_NAME_DEFAULT)) return SLOT_NAME_DEFAULT
      if (node instanceof Element) {
        let sName = node.getAttribute('slot') || SLOT_NAME_DEFAULT
        if (slotKeys.includes(sName))
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
        let node = nodeAry[0]
        if ((node.nodeType === Node.TEXT_NODE && isBlank(node.textContent)) ||
          (node instanceof HTMLSlotElement && isEmpty(node.assignedNodes({ flatten: true })))
        ) {
          nodeAry.shift();
          continue;
        }
        break;
      }
      while (nodeAry.length > 0) {
        let node = last(nodeAry)
        if ((node.nodeType === Node.TEXT_NODE && isBlank(node.textContent)) ||
          (node instanceof HTMLSlotElement && isEmpty(node.assignedNodes({ flatten: true })))
        ) {
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
  #setSlots(next: Record<string, Node[]>) {
    const sig = this.#slotsSig()
    if (sameSlots(sig.value, next)) return
    sig.value = next
  }
  #updateSlot(name: string) {
    let hook = this.#slotHooks[name]
    if (!hook) return;
    let slotMap = this.#slotPropsMap[name]
    const slotsMap = this.#slotsSig().value
    let slot = slotsMap[name]
    //slot not ready yet
    //1. 可能是if/each等指令还未插入
    if (!slot) return

    //组件通知渲染异步指令
    this.renderAsync(hook, get(slotMap, 'props'))
    const rc = this._asyncDirectives.get(hook)

    let nodes = rc?.buildView(hook(get(slotMap, 'props')))!
    let nnodes = reject(toArray<Node>(nodes), n => n.nodeType === Node.COMMENT_NODE);

    if (nnodes) {
      let slottedNodes = this.#slotNodes[name]
      if (!isEmpty(slottedNodes)) {

        for (let i = 0; i < slottedNodes.length; i++) {
          const n = slottedNodes[i];
          n.parentNode?.removeChild(n)
        }
      }
      this.#slotNodes[name] = nnodes;
      this.append(...nnodes)
      this.#updateSlots.clear();
    }

  }
  _asyncDirectives = new WeakMap<TplFn, any>()
  renderAsync(cbk: TplFn, ...args: any[]) {
  }

  #attrChanged(name: string, oldValue: string | null, newValue: string | null) {
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

    if (has(this.#attrs, 'emit-native')) {
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
    this.#viewEffects.push(e)
  }

  /**
   * 强制重渲染一次视图
   */
  forceUpdate() {
    if (!this.shouldUpdate({})) return
    const effects = this.#viewEffects
    if (effects.length > 0) {
      this.__f = true
      try {
        for (let i = 0; i < effects.length; i++) {
          const e = effects[i]
          if (!e.disposed) e.run()
        }
      } finally {
        this.__f = false
      }
    }
    this.#updateSlots.forEach((v) => {
      this.#updateSlot(v)
    })
    this.updated({});
  }
}