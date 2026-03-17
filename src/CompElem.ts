import {
  assign,
  camelCase,
  cloneDeep,
  closest,
  debounce,
  each,
  filter,
  first,
  flatMap,
  get,
  groupBy,
  has,
  isArray,
  isBlank,
  isBoolean,
  isDefined,
  isEmpty,
  isFunction,
  isNil,
  isNull,
  isObject,
  isString,
  isUndefined,
  kebabCase,
  keys,
  last,
  merge,
  parseJSON,
  reject,
  remove,
  set,
  size,
  some,
  test,
  toArray,
  trim,
  walkTree
} from "myfx";
import { ComponentDynamicCssUpdaterMap, ComputedUpdateDepsMap, CssUpdateDepsMap, DATA_KEY, DefinitionCompEventMap, DefinitionComputedMap, DefinitionDecoratorMap, DefinitionPropMap, DefinitionStateMap, PATH_SEPARATOR, SLOT_NAME_DEFAULT, WatchImmediateListMap, WatchKeysListMap, WatchKeysOnceMap } from "./constants";
import { DecoratorWrapper } from "./decorator";
import { _getObservedAttrs } from "./decorators/prop";
import { addEvent, EvHadler } from "./events/event";
import { IComponent } from "./IComponent";
import { Collector, getterValue, OBJECT_VAR_PATH, Queue, setterValue } from "./reactive";
import { ATTR_PREFIX_BOOLEAN, ATTR_PREFIX_EVENT, ATTR_PREFIX_PROP, ATTR_REF, buildView, updateSubScopeView, updateView } from "./render/render";
import { Template } from "./render/Template";
import { Constructor, DefaultProps, Getter, PropOption, SlotOptions, StateOption, TmplFn, UpdatePoint } from "./types";
import { _getSuper, _toUpdatePath, getBooleanValue, isBooleanProp, showTagError } from "./utils";
const PropTypeMap: Record<string, Constructor<any>> = {
  boolean: Boolean,
  string: String,
  number: Number,
  object: Object,
  array: Array,
  function: Function,
  undefined: Object
}
//组件静态样式
const ComponentStaticStyleMap = new WeakMap<Function, CSSStyleSheet[]>()
let DefaultCss: CSSStyleSheet[] = []
let DefaultGlobalProps = {}
let DefaultComponentProps: Record<string, any> = {}
let CompElemSn = 0
const SlotCompMap = new WeakMap()
const EMPTY_SLOTS = {}
const PROP_NAME_SLOTS = 'slots'

/**
 * CompElem基类，意为组件元素。提供了基本内置属性及生命周期等必备接口
 * 每个组件都需要继承自该类
 *
 * @author holyhigh2
 */
export class CompElem<T = HTMLElement> extends HTMLElement implements IComponent<T> {
  static __l_globalRule = document.createElement("style");
  //设置全局/组件默认属性
  static defaults(options: DefaultProps) {
    DefaultCss = flatMap<string | CSSStyleSheet, CSSStyleSheet>(options.css!, c => {
      if (isString(c)) {
        let sheet = new CSSStyleSheet();
        sheet.replaceSync(c)
        return sheet
      } else if (c instanceof CSSStyleSheet) {
        return c
      }
      return []
    })
    //todo...
    DefaultGlobalProps = options.global!
    each(options, (v, k) => {
      if (test(k[0], /[A-Z]/)) {
        DefaultComponentProps[k] = v
      }
    })
  }

  #cid: number
  #slotPropsMap: Record<string, Partial<SlotOptions>> = {}
  __data_: Record<string, any> = {};
  #updateSources: Record<string, { value: any; chain?: string[], oldValue?: any, end?: boolean, subNewValue?: any, subOldValue?: any }> = {};
  #shadow: ShadowRoot;
  //保存所有渲染上下文 {CompElem/Directive}
  __updateTree: Array<UpdatePoint>
  _eventBindList: Array<[string, Function, Node, Function?]>
  _listerners: Record<string, Function> = {};
  __docoEventMap: Map<string, Function>

  __updateSubViewDeps: Map<string, Set<UpdatePoint>>

  _cssUpdateInNextTick = false
  _cssVarOldValueMap: Record<string, string | number>
  __cssSheets: Array<CSSStyleSheet>

  _watchUpdateSetInNextTick: Set<Function>
  _watchUpdateArgsInNextTick: Map<Function, Record<string, any>>

  _computedUpdateSetInNextTick: Set<Function>

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
    return this.__wrapperComponent?.deref();
  }
  get slots(): Record<string, Array<Node>> {
    return EMPTY_SLOTS
  }
  get slotHooks() {
    return this.#slotHooks;
  }
  get cssSheets() {
    return ComponentStaticStyleMap.get(this.constructor)!
  }
  get globalCssSheet() {
    return CompElem.__l_globalRule.sheet!
  }
  get isMounted() {
    return this.#mounted
  }
  #attrs: Record<string, string>
  #props: Record<string, any>
  #renderRoot: WeakRef<HTMLElement> | undefined
  #renderRoots: WeakRef<HTMLElement>[]
  #parentComponent: WeakRef<CompElem> | undefined
  __wrapperComponent: WeakRef<CompElem> | undefined
  #slotsEl: Record<string, HTMLSlotElement> = {};
  #slotHooks: Record<string, (...args: any[]) => Template> = {};
  #slotNodes: Record<string, Node[]> = {};
  #mounted: boolean = false

  #updateViewImmediately = false
  #updateNextImmediatelyQ: Function[]

  //////////////////////////////////// styles
  /**
   * 组件样式，CSSStyleSheet可动态变更
   */
  static get css(): Array<string | CSSStyleSheet> {
    return [];
  }
  static get globalCss(): string | undefined {
    return undefined;
  }
  static get hostCss(): string | CSSStyleSheet | undefined {
    return undefined;
  }
  get cssVars(): Record<string, string | number | undefined> {
    return {}
  }

  __inited = false;
  #initiating = false;
  #onSlotChangeHookBindThis: EvHadler
  __thisRef: WeakRef<any>
  constructor(...args: any[]) {
    super();
    this.#cid = CompElemSn++

    this.__updateTree = []

    this.__thisRef = new WeakRef(this)

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
          return getterValue(undefined, 'slots', this)
        },
        set(v) {
          setterValue('slots', v, this)
        }
      })
    }

    /////////////////////////////////////////////////// decorators create
    let ary: DecoratorWrapper[] = DefinitionDecoratorMap.get(this.constructor) ?? DefinitionDecoratorMap.get(_getSuper(this.constructor as any))!
    ary && ary.sort((a, b) => b.priority - a.priority).forEach(dw => dw.create(this))

    this.#updatedD = this.#update.bind(this)
  }
  insertStyleSheet(sheet: string | CSSStyleSheet): CSSStyleSheet | null {
    if (!this.#shadow) return null
    let cssSheet: CSSStyleSheet;
    if (isString(sheet)) {
      cssSheet = new CSSStyleSheet();
      try {
        cssSheet.replaceSync(sheet);
      } catch (e) {
      }
    } else {
      if (this.#shadow.adoptedStyleSheets.includes(sheet)) return sheet

      cssSheet = sheet;
    }

    this.#shadow.adoptedStyleSheets = [...this.#shadow.adoptedStyleSheets, cssSheet]

    // Keep ComponentStyleMap in sync for this constructor
    const cur = ComponentStaticStyleMap.get(this.constructor) ?? [];
    cur.push(cssSheet)

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
  #updatedD

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

    if (!CompElem.__l_globalRule.parentNode) {
      document.head.appendChild(CompElem.__l_globalRule)
    }

    //host styles
    let hostStyle = get<string | CSSStyleSheet>(this.constructor, "hostCss")
    let styleSheet: CSSStyleSheet = get(this.constructor, 'hostCssSheet')
    if (hostStyle) {
      if (!styleSheet) {
        if (isString(hostStyle)) {
          styleSheet = new CSSStyleSheet();
          styleSheet.replaceSync(hostStyle)
        } else {
          styleSheet = hostStyle
        }
        set(this.constructor, 'hostCssSheet', styleSheet)
      }
      let styleRoot = this.__wrapperComponent?.deref()?.shadowRoot ?? this.#parentComponent?.deref()?.shadowRoot ?? this.ownerDocument
      //detached el
      if (this.__wrapperComponent && !this.__wrapperComponent.deref()?.shadowRoot?.contains(this)) {
        styleRoot = closest(this, n => n instanceof HTMLDocument || n instanceof ShadowRoot, 'parentNode')!
      }
      if (styleRoot && styleSheet && !styleRoot.adoptedStyleSheets.includes(styleSheet)) {
        styleRoot.adoptedStyleSheets = [...styleRoot.adoptedStyleSheets, styleSheet]
      }
    }

    this.__init();
    this.__bindEvents()
  }

  disconnectedCallback() {
    this.__unbindEvents()
  }
  __bindEvents() {
    let evs = this._eventBindList
    each(evs, (v: any) => {
      let [evName, cbk, node, binded] = v
      if (binded) return
      if (!node) return
      let handler = cbk ? cbk.bind(this) : cbk
      let unbinder = addEvent(evName, handler, node, this)
      v[3] = unbinder
    })

    //event decoration
    let events = DefinitionCompEventMap.get(this.constructor)!
    if (size(events) > 0) {
      if (!this.__docoEventMap)
        this.__docoEventMap = new Map()
      each(events, ({ name, targetFn, fnName }) => {
        if (this.__docoEventMap.has(name + "@" + fnName)) return

        let eventTarget = targetFn ? targetFn(this) : this
        let cbk = get(this, fnName) as Function
        let handler = cbk ? cbk.bind(this) : cbk
        let unbinder = addEvent(name, handler, eventTarget, this)
        this.__docoEventMap.set(name + "@" + fnName, unbinder!)
      })
    }
  }
  __unbindEvents() {
    each(this._eventBindList, (v: any) => {
      let [, , , unbinder] = v
      if (unbinder) unbinder()
      v[3] = null
    })
    let delDecoKeys: string[] = []
    each(this.__docoEventMap, (unbinder: any, k: string) => {
      if (unbinder) unbinder()
      delDecoKeys.push(k)
    })
    delDecoKeys.forEach(k => this.__docoEventMap.delete(k))
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

    let ary: DecoratorWrapper[] = DefinitionDecoratorMap.get(this.constructor) ?? DefinitionDecoratorMap.get(_getSuper(this.constructor as any))!
    ary && ary.sort((a, b) => b.priority - a.priority).forEach(dw => {
      dw.destroy(this)
    })

    this.beforeDestroyed()

    //events
    this.__unbindEvents()

    this._listerners = null as any

    this.__docoEventMap?.clear()
    this.__docoEventMap = this._eventBindList = null as any

    //styles
    ComponentDynamicCssUpdaterMap.get(this)?.clear()
    ComponentDynamicCssUpdaterMap.delete(this)

    //reactive
    this._watchUpdateArgsInNextTick?.clear()
    this._watchUpdateSetInNextTick?.clear()

    this._computedUpdateSetInNextTick?.clear()
    this._computedUpdateSetInNextTick = null as any

    this.__cssSheets = null as any
    this.__updateSubViewDeps?.clear()

    //sup scope
    if (this.#parentComponent) {
      let pComp = this.#parentComponent.deref()
      pComp && walkTree(pComp.__updateTree, (up) => {
        if (up.__destroyed) return
        if (up.node?.deref() === this) {
          up.destroy(pComp)
          remove(up.parent ? up.parent.children! : pComp.__updateTree, c => c === up)
        }
      })
    }
    //sub scopes
    each(this.__updateTree, up => up?.destroy(this))

    //slots
    each(this.#slotsEl, (slotEl) => {
      SlotCompMap.delete(slotEl)
      slotEl.remove()
    })
    each(this.#slotNodes, (nodes) => {
      each(nodes, (node: Element) => node.remove())
    })
    each(this.__data_.slots, (nodes: Node[], k) => {
      each(nodes, (node: Element) => node.remove())
    })
    this.#updateSlots.clear();
    this.#slotNodes = this.#slotsEl = this.#updateSlots = this.#slotPropsMap = this.__data_.slots = null as any

    this.remove()

    //data
    this._wrapperProp =
      this.#propsReady =
      this.#renderRoot = this.#renderRoots = this.#shadow =
      this.#updateSources =
      this.#attrs =
      this.#props =
      this.#renderRoot =
      this.#renderRoots =
      this.#slotHooks =
      this.#updatedD =
      this.__data_ =
      this.__updateTree =
      this.#parentComponent =
      this._asyncDirectives =
      this.__wrapperComponent = null as any
    //unmount

    this.destroyed()
  }

  //////////////////////////////////// lifecycles
  //********************************** 首次渲染
  //构造时上级传递的参数
  __init() {
    if (this.__inited) return;
    //防止在钩子中出现重新挂载的情况
    if (this.#initiating) return;
    this.#initiating = true;

    /////////////////////////////////////////////////// styles
    let dynamicStyleAry: Function[] = []
    //global styles
    let globalTextContent = get<string>(this.constructor, "globalCss")
    if (!isEmpty(globalTextContent) && isString(globalTextContent) && !get(this.constructor, '_globalRuleInserted')) {
      CompElem.__l_globalRule.textContent += globalTextContent//.sheet?.insertRule(globalTextContent, 0)
      set(this.constructor, '_globalRuleInserted', true)
    }
    //component styles
    let beAttached2 = ComponentStaticStyleMap.get(this.constructor)
    let styleSheets: CSSStyleSheet[] = beAttached2 ?? [];
    if (!beAttached2) {
      each(get<[]>(this.constructor, "css"), (st) => {
        if (isString(st)) {
          let sheet = new CSSStyleSheet();
          sheet.replaceSync(st)
          styleSheets.push(sheet);
        } else if (isFunction(st)) {
          dynamicStyleAry.push(st)
        } else {
          styleSheets.push(st);
        }
      });
      ComponentStaticStyleMap.set(this.constructor, styleSheets)
    }

    ////////////////////////////////////////////////// Props & States
    const props = this.#initProps();

    this.propsReady(props)
    for (const key in props) {
      const v = props[key];
      this.__data_[key] = v;
    }

    this.#initStates();

    //2. Data
    this.__data_.slots = {}

    Reflect.defineProperty(this.__data_, '__isData', {
      enumerable: false,
      value: true
    })

    //3. Watch
    let superComp = _getSuper(this.constructor as any)
    let watchKeys = WatchKeysListMap.get(this.constructor) ?? WatchKeysListMap.get(superComp)
    if (watchKeys) {
      this._watchUpdateSetInNextTick = new Set()
      this._watchUpdateArgsInNextTick = new Map()
      let onceMap = WatchKeysOnceMap.get(this.constructor) ?? WatchKeysOnceMap.get(superComp)!
      let watchImmediateList = WatchImmediateListMap.get(this.constructor) ?? WatchImmediateListMap.get(superComp)!
      each(watchImmediateList, (fns, k) => {
        let nv = get(this, k);
        fns.forEach(fn => {
          fn.call(this, nv, undefined, k);
        })
        if (onceMap.has(k)) {
          onceMap.set(k, true)
        }
      })
    }

    //4. Computed
    let computedMap = assign<Record<string, Getter>>({}, DefinitionComputedMap.get(this.constructor), DefinitionComputedMap.get(superComp))
    if (computedMap) {
      this._computedUpdateSetInNextTick = new Set()
      let depMap = ComputedUpdateDepsMap.get(this.constructor)!
      if (!depMap) {
        depMap = new Map()
        ComputedUpdateDepsMap.set(this.constructor, depMap)
        each(computedMap, (getter, propKey) => {
          set(getter, 'key', propKey)

          Collector.start();
          this[DATA_KEY][propKey] = getter.call(this)
          Collector.end();
          let computedDeps = Collector.popVarPathList()
          computedDeps.forEach(dep => {
            let list = depMap.get(dep)
            if (!list) {
              list = new Set()
              depMap.set(dep, list)
            }
            list.add(getter)
          })
        })
      } else {
        each(computedMap, (getter, propKey) => {
          this[DATA_KEY][propKey] = getter.call(this)
        })
      }
    }

    //5. Render

    Collector.start();
    let tmpl = this.render()
    Collector.end();
    let viewDeps = Collector.popVarPathList()
    if (!this.constructor.prototype._viewDeps) {
      this.constructor.prototype._viewDeps = viewDeps
    }

    let nodes: NodeListOf<ChildNode> | undefined
    if (tmpl === null) {
      this.#renderRoots = []
      this.#renderRoot = undefined
    } else {
      /////////////////////////////////////////////////// shadow dom
      this.#shadow = this.attachShadow({
        mode: "open"
      });

      this.#shadow.adoptedStyleSheets = [...DefaultCss, ...(ComponentStaticStyleMap.get(this.constructor) ?? [])];
      nodes = buildView(tmpl, this)
      if (nodes) {
        this.#renderRoots = filter<HTMLElement>(nodes, (n: Node) => n.nodeType === Node.ELEMENT_NODE).map<WeakRef<HTMLElement>>(n => new WeakRef(n))
        this.#renderRoot = this.#renderRoots[0]
      }
    }

    this.__inited = true;

    /////////////////////////////////////////////////// slots
    this.#updateSlotsAry()
    //slot hook
    each(this.#slotHooks, (v, k: string) => {
      this.#updateSlot(k)
    })

    const that = this
    let ary: DecoratorWrapper[] = DefinitionDecoratorMap.get(this.constructor) ?? DefinitionDecoratorMap.get(_getSuper(this.constructor as any))!
    ary && ary.sort((a, b) => b.priority - a.priority).forEach(dw => {
      dw.beforeMount(this, (key, value) => {
        that.__data_[key] = value
        return that.__data_[key]
      })
    })

    this.beforeMount();
    setTimeout(() => {
      if (this.isDestroyed) {
        console.debug('Component is destroyed before mount', this.tagName)
        return
      }

      this.#mounted = true;

      if (this.#shadow) {
        //instance dynamic style
        Collector.start()
        let cssVarObj = this.cssVars
        Collector.end()

        if (!isEmpty(cssVarObj)) {
          this._cssVarOldValueMap = {}
          let deps = CssUpdateDepsMap.get(this.constructor)
          if (!deps) {
            deps = new Set(Collector.popVarPathList())
            CssUpdateDepsMap.set(this.constructor, deps)
          }
          let cssStr = ''
          each(cssVarObj, (v, k) => {
            let cssVarKey = '--' + kebabCase(k).replace(/^-+/, '')
            if (isBlank(v) || isNil(v)) {
              v = 'initial'// invalid value
            }
            this._cssVarOldValueMap[cssVarKey] = v
            cssStr += ';' + cssVarKey + ':' + v
          })
          this.style.cssText += cssStr
        }
      }

      if (nodes)
        this.#shadow.append(...nodes)

      ary && ary.forEach(dw => {
        dw.mounted(this, (key, value) => {
          that.__data_[key] = value
          return that.__data_[key]
        })
      })

      if (this.#updateNextImmediatelyQ) {
        this.#updateNextImmediatelyQ.forEach((cbk) => Queue.pushNext(cbk as any))
      }
      if (this.#updateViewImmediately) {
        Queue.pushNext(this.#updatedD)
      }

      this.__bindEvents()

      this.mounted();
    }, 0)
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
            node._updateProps(props)
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

    let propName = camelCase(attributeName)
    let propDef: PropOption = DefinitionPropMap.get(this.constructor)![propName]

    if (isBooleanProp(propDef.type)) {
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
   * 由监控变量调用
   * @param stateKey
   * @param ov
   * @param rootStateKey 如果是对象内部属性变更，会返回根属性名
   * @returns
   */
  _notify(ov: any, chain: string[], subNewValue?: any, subOldValue?: any) {
    let varPath = [];
    for (let i = 0; i < chain.length; i++) {
      const seg = chain[i];
      varPath.push(seg);
      let v = get(this, varPath);
      let pathStr = _toUpdatePath(varPath);
      this.#updateSources[pathStr] = { value: v, chain: pathStr === PROP_NAME_SLOTS ? [PROP_NAME_SLOTS] : varPath, oldValue: ov, end: varPath.length === chain.length, subNewValue, subOldValue };
    }

    if (!this.isMounted) {
      console.debug('target update...', this.tagName)
      this.#updateViewImmediately = true
      return
    }
    Queue.pushNext(this.#updatedD)
  }

  #update() {
    if (size(this.#updateSources) < 1) return
    if (!this.isMounted) return

    const changed = this.#updateSources
    this.#updateSources = {}

    let toBreak = !this.shouldUpdate(changed)
    if (toBreak) return

    const changedKeys = Object.keys(changed)
    //update decorators
    let ary: DecoratorWrapper[] = DefinitionDecoratorMap.get(this.constructor) ?? DefinitionDecoratorMap.get(_getSuper(this.constructor as any))!
    ary && ary.sort((a, b) => b.priority - a.priority).forEach(dw => {
      dw.updated(this, changed)
    })

    //1. filter update point
    let toUpdateView = false
    let toUpdateUps = new Set<UpdatePoint>()
    let viewDeps = this.constructor.prototype._viewDeps
    each(changed, (x, k: string) => {
      if (!toUpdateView && viewDeps?.includes(k)) {
        toUpdateView = true
      }
      if (this.__updateSubViewDeps?.has(k)) {
        let ups = this.__updateSubViewDeps.get(k)
        if (ups) toUpdateUps = toUpdateUps.union(ups)
      }
    });
    //update watch
    this._watchUpdateSetInNextTick?.forEach((fn) => {
      let { newValue, oldValue, chain, rootObjNew, rootObjOld, fullMatch } = this._watchUpdateArgsInNextTick.get(fn)!
      let nv = fullMatch ? newValue : rootObjNew
      let ov = fullMatch ? oldValue : rootObjOld
      fn.call(this, nv, ov, chain, newValue, oldValue)
    })
    this._watchUpdateSetInNextTick?.clear()
    this._watchUpdateArgsInNextTick?.clear()
    // update computed
    this._computedUpdateSetInNextTick?.forEach(fn => {
      let k = get<string>(fn, 'key')
      let oldValue = this.__data_[k]
      let newValue = fn.call(this)
      if (!isObject(newValue) && newValue === oldValue) return

      this.__data_[k] = newValue
      this._notify(oldValue, [k])
    })
    this._computedUpdateSetInNextTick?.clear()
    // update css
    if (this._cssUpdateInNextTick) {
      let cssVarObj = this.cssVars
      each(cssVarObj, (v, k) => {
        let cssVarKey = '--' + kebabCase(k).replace(/^-+/, '')
        if (this._cssVarOldValueMap[cssVarKey] == v) {
          return
        }
        if (isBlank(v) || isNil(v)) {
          v = 'initial'// invalid value
        }
        this._cssVarOldValueMap[cssVarKey] = v
        this.style.setProperty(cssVarKey, v + '')
      })
    }

    //2. update view
    if (this.#renderRoot?.deref()) {
      if (toUpdateView) {
        updateView(this.render()!, this, this.__updateTree, changedKeys);
      }
      if (size(toUpdateUps) > 0) {
        toUpdateUps.forEach(up => {
          updateSubScopeView(up, this, undefined, changedKeys)
        })
      }
    }

    //update slot view
    this.#updateSlots.forEach((v) => {
      this.#updateSlot(v)
    })

    this.updated(changed);
  }

  /**
   * 1. 初始props中并未包含的属性，可从attributes取，且定义类型不是string时自动转换
   * 2. 如果attributes中也未出现且必填报错
   * 3. 否则设置默认值
   * @returns 非props的attr集合
   */
  #initProps() {
    let propDefs = DefinitionPropMap.get(this.constructor) ?? DefinitionPropMap.get(_getSuper(this.constructor as any))
    let attrs = this.attributes;
    let tagName = this.tagName;
    let parentProps = this.#props;
    let filterAttrs: Record<string, string> = {}
    each(attrs, ({ name, value }) => {
      if (name[0] === ATTR_PREFIX_EVENT ||
        name[0] === ATTR_PREFIX_PROP ||
        name[0] === ATTR_PREFIX_BOOLEAN ||
        name === ATTR_REF || name === 'slot') return;
      let camelName = camelCase(name)
      if (propDefs && !propDefs[camelName]) {
        filterAttrs[name] = value;
      }
    })
    this.#attrs = this.#attrs ? assign(this.#attrs, filterAttrs) : filterAttrs;
    let rs: Record<string, any> = {}
    if (!propDefs) return rs;

    let keys = Object.keys(propDefs)
    let size = keys.length
    for (let i = 0; i < size; i++) {
      const key = keys[i]
      const kbKey = kebabCase(key)
      const hasAttr = this.hasAttribute(kbKey)
      let propDef = propDefs[key];
      let isInited = has(parentProps, key);
      let defaultVal = get(this, key);
      if (!('_defaultValue' in propDef)) {
        //在构造结束后
        propDef._defaultValue = defaultVal
        if (!propDef.type) {
          if (isUndefined(defaultVal)) {
            showTagError(tagName, "Prop '" + key + "' has neither propType nor defaultValue be used for type inference");
          }
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
          attrs.getNamedItem(ATTR_PREFIX_PROP + kbKey);
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

      val = this.#propTypeCheck(propDefs, key, val, hasAttr)

      if (propDef.attribute && isDefined(val) && !isObject(val)) {
        this.#updateAttribute(propDef, key, val)
      }

      this.__data_[key] = val;
      rs[key] = val;

      delete (this as any)[key]
    }

    return rs
  }
  #updateAttribute(propDef: PropOption, key: string, val: string | null) {
    let k = kebabCase(key)
    let v = trim(val)
    if (isBooleanProp(propDef.type)) {
      v = getBooleanValue(val)
      if (isBoolean(v)) {
        if (v && !this.hasAttribute(k)) {
          this.toggleAttribute(k, true)
        } else if (!v && this.hasAttribute(k)) {
          this.toggleAttribute(k, false)
        }
      } else if (this.getAttribute(k) !== v) {
        this.setAttribute(k, v)
      }
    } else if (this.getAttribute(k) !== v) {
      this.setAttribute(k, v)
    }
  }
  #convertValue(v: string, types: Array<Constructor<any>>) {
    let val: any = v
    try {
      for (let i = 0; i < types.length; i++) {
        const t = types[i];
        if (t === Boolean) {
          val = getBooleanValue(v)
        } else if (t === Number) {
          val = Number(v)
        } else if (t === String) {
          val = String(v)
        } else if (t === Object || t === Array) {
          val = parseJSON(v)
        } else if (t === Date) {
          val = new Date(v)
        } else {
          val = new t(v)
        }
      }
    } catch (error) {
      showTagError(this.tagName, `Convert attribute error with ` + v);
    }
    return val
  }
  //属性值检测
  #propTypeCheck(propDefs: Record<string, PropOption>, propKey: string, newValue: string | null, hasAttr?: boolean) {
    let propDef = propDefs[propKey]
    if (!propDef) return newValue

    let validator = propDef.isValid
    let expectType = propDef.type
    let expectTypeAry = isArray<Constructor<any>>(expectType) ? expectType : [expectType]
    let typeConverter = propDef.converter
    let val: any = newValue
    if (!some(expectTypeAry, (et) => et === String) && isString(val) && !isNull(val)) {
      try {
        val = typeConverter ? typeConverter(val) : this.#convertValue(val, expectTypeAry)
      } catch (error) {
        showTagError(this.tagName, `Convert attribute '${propKey}' error with ` + val)
      }
    } //endif

    //extra work
    for (let i = 0; i < expectTypeAry.length; i++) {
      const et = expectTypeAry[i];
      if (et.name === 'Boolean' && hasAttr) {
        val = getBooleanValue(val)
      }
    }

    if (isNil(val)) {
      return val
    }

    let realType = typeof val;
    let matched = isDefined(val) ? false : true;
    for (let i = 0; i < expectTypeAry.length; i++) {
      const et = expectTypeAry[i];
      if (
        //base form
        test(realType, et.name, "i") ||
        //object form
        val instanceof et || (Object.prototype.toString.call(val) === Object.prototype.toString.call(et.prototype))
      ) {
        matched = true
        break
      }
    }

    if (!matched) {
      showTagError(
        this.tagName,
        `Invalid prop '${propKey}'. expected '${expectTypeAry.map(
          (t) => t.name || t
        )}' but got '${realType}'`
      );
    }
    if (validator) {
      if (!validator.call(this, val, this.__data_)) {
        showTagError(
          this.tagName,
          `Invalid prop '${propKey}'. IsValid() check failed`
        );
      }
    }

    return val;
  }
  #initStates() {
    let stateDefs = DefinitionStateMap.get(this.constructor) ?? DefinitionStateMap.get(_getSuper(this.constructor as any))
    if (stateDefs)
      each<StateOption, string>(stateDefs, (def, key) => {
        let stateDef = stateDefs[key];
        let val = get(this, key);
        if (stateDef) {
          let propName = stateDef.prop;
          val = propName ? cloneDeep(this.__data_[propName]) : get(this, key);
        }

        this.__data_[key] = val;
        delete (this as any)[key]
      });
  }
  /**
   * 由外部调用，在初始化及更新时。
   * @param props 
   * @param attrs 
   */
  #propsReady = debounce(this.propsReady, 100)
  _updateProps(props: Record<string, any>) {
    let propDefs = DefinitionPropMap.get(this.constructor)
    if (!propDefs) return
    let need2UpdateAttrs: Array<any> = []
    //存在attrs表示已初始化完成
    each(props, (v, k: string) => {
      let ck = camelCase(k)
      let propDef = propDefs[ck]
      if (!propDef) return
      v = this.#propTypeCheck(propDefs, ck, v)

      if (propDef.attribute && isDefined(v) && !isObject(v)) {
        need2UpdateAttrs.push([propDef, ck, v])
      }

      set(this, ck, v)
    })
    assign(this.#props, props)

    need2UpdateAttrs.forEach(([propDef, key, v]) => {
      this.#updateAttribute(propDef, key, v)
    })

    if (this.#props)
      this.#propsReady(this.#props);
  }
  _wrapperProp: Record<string, string> = {}
  _initProps(props: Record<string, any>, attrs?: Record<string, any>) {
    this.#props = merge(this.#props || {}, props);
    this.#attrs = merge(this.#attrs || {}, attrs);

    each(props, (v, k: string) => {
      if (isObject(v)) {
        let fromPath = OBJECT_VAR_PATH.get(v)
        if (fromPath) {
          let propPath = fromPath.join(PATH_SEPARATOR)
          this._wrapperProp[propPath] = k
          let parentStateDefs = this.wrapperComponent ? DefinitionStateMap.get(this.wrapperComponent?.constructor) : null
          let parentStateKey = fromPath[0]
          if (parentStateDefs && parentStateDefs[parentStateKey]) {
            let propDefs = DefinitionPropMap.get(this.constructor)
            set(propDefs!, [k, 'shallow'], parentStateDefs[parentStateKey].shallow)
          }
        }
      }
    })
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
    let unbinder = addEvent(evName, this.#onSlotChangeHookBindThis, slot, this)
    this._eventBindList.push([evName, this.#onSlotChangeHookBindThis, slot, unbinder!])

    //3. 保存参数
    if (!isEmpty(props)) {
      let slotMap = this.#slotPropsMap[name]
      if (!slotMap) {
        slotMap = this.#slotPropsMap[name] = {}
      }
      slotMap.props = props
    }

  }
  _bindSlotHook(name: string, hook: (...args: any[]) => Template) {
    this.#slotHooks[name] = hook
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
  #updateSlotsAry() {
    if (!this.#renderRoot) return
    let slotKeys = keys(this.#slotsEl)
    if (isEmpty(slotKeys)) return

    const cs = flatMap(this.childNodes, node => {
      if (node.nodeType === Node.COMMENT_NODE) return []
      if (node instanceof HTMLSlotElement) return node.assignedNodes({ flatten: true })
      return node
    })

    let groups = groupBy<Node>(cs, node => {
      if (node.nodeType === Node.TEXT_NODE && slotKeys.includes(SLOT_NAME_DEFAULT)) return SLOT_NAME_DEFAULT
      if (node instanceof Element) {
        let sName = node.getAttribute('slot') || SLOT_NAME_DEFAULT
        if (slotKeys.includes(sName))
          return sName
      }
    })
    if (isEmpty(groups)) {
      (this as any).slots = {};
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

      ; (this as any).slots = rs;
  }
  #updateSlot(name: string) {
    let hook = this.#slotHooks[name]
    if (!hook) return;
    let slotMap = this.#slotPropsMap[name]
    if (!this.__data_.slots) return
    let slot = this.__data_.slots[name]
    //slot not ready yet
    //1. 可能是if/each等指令还未插入
    if (!slot) return

    //组件通知渲染异步指令
    this.renderAsync(hook, get(slotMap, 'props'))
    const rc = this._asyncDirectives.get(hook)

    //todo 如果要做成通用异步指令，元素必须插入到指令挂载的位置，并且slot的插入节点还要去掉注释
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
  _asyncDirectives = new WeakMap<TmplFn, any>()
  renderAsync(cbk: TmplFn, ...args: any[]) {
  }

  #attrChanged(name: string, oldValue: string | null, newValue: string | null) {
    if (!this.__inited) return;
    let observedAttrs = _getObservedAttrs(this.constructor)
    if (observedAttrs.has(name)) {
      let camelName = camelCase(name)
      if (isNull(newValue)) {
        let propDefs = DefinitionPropMap.get(this.constructor)
        //使用默认值
        if (propDefs)
          newValue = propDefs[camelName]._defaultValue
      }
      this._updateProps({ [camelName]: newValue })
    }
  }

  _regSubViewDeps(props: string[], up: UpdatePoint) {
    if (!this.__updateSubViewDeps) {
      this.__updateSubViewDeps = new Map()
    }
    props.forEach(prop => {
      let depSet = this.__updateSubViewDeps.get(prop)
      if (!depSet) {
        depSet = new Set()
        this.__updateSubViewDeps.set(prop, depSet)
      }
      depSet.add(up)
    })

  }
  _getPrivateData() {
    return this.__data_
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
      if (this._listerners[evName]) {
        this._listerners[evName](arg)
      }
    }

  }

  _addEvent(evName: string, hook: (e: Event) => void) {
    if (!this._listerners) {
      this._listerners = {}
    }
    this._listerners[evName] = hook
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

      console.debug('target update...', this.tagName)
      this.#updateNextImmediatelyQ.push(cbk)
      return
    }

    Queue.pushNext(cbk)
  }
  /**
   * 强制更新一次视图
   */
  forceUpdate() {
    each(this.__data_, (v, k: string) => {
      this.#updateSources[k] = {
        value: undefined,
        chain: undefined,
      };
    })
    this.#update();
  }
}