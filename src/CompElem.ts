import {
  assign,
  bind,
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
  last,
  merge,
  once,
  parseJSON,
  reject,
  set,
  size,
  some,
  test,
  toArray,
  trim
} from "myfx";
import { ChangedMap, CollectorType, DecoratorKey } from "./constants";
import { _DecoratorsKey, DecoratorWrapper } from "./decorator";
import { _getObservedAttrs, PropOption } from "./decorators/prop";
import { StateOption } from "./decorators/state";
import { IComponent } from "./IComponent";
import { Collector, Queue, reactive } from "./reactive";
import { ATTR_PREFIX_BOOLEAN, ATTR_PREFIX_EVENT, ATTR_PREFIX_PROP, ATTR_REF, buildView, updateDirectiveView, updateView } from "./render/render";
import { Template } from "./render/Template";
import { Constructor, DefaultProps, Getter, SlotOptions, TmplFn } from "./types";
import { _toUpdatePath, getBooleanValue, isBooleanProp, showTagError } from "./utils";
const PropTypeMap: Record<string, Constructor<any>> = {
  boolean: Boolean,
  string: String,
  number: Number,
  object: Object,
  array: Array,
  function: Function,
  undefined: Object
}
const PrivatePreffix = '#'
//组件静态样式
const ComponentStyleMap = new WeakMap<WeakKey, CSSStyleSheet[]>()
let DefaultCss: CSSStyleSheet[] = []
let DefaultGlobalProps = {}
let DefaultComponentProps: Record<string, any> = {}
let CompElemSn = 0
const GlobalStyleMap = new Map<Function, HTMLStyleElement>()
const HostStyleMap = new WeakMap<WeakKey, Constructor<any>[]>()
/**
 * CompElem基类，意为组件元素。提供了基本内置属性及生命周期等必备接口
 * 每个组件都需要继承自该类
 *
 * @author holyhigh2
 */
export class CompElem extends HTMLElement implements IComponent {
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
  #data: Record<string, any> = { '#slots': {} };
  #reactiveData: Record<string, any> = {};
  #updateSources: Record<string, { value: any; chain?: string[], oldValue?: any, end?: boolean }> = {};
  #shadow: ShadowRoot;
  //保存所有渲染上下文 {CompElem/Directive}
  #renderContextList: Record<string, Set<CompElem | Node>> = {};
  __events: Record<string, Array<Node | ((e: Event) => void)>[]> = {}

  get [Symbol.toStringTag]() {
    return this.constructor.name;
  }
  get cid() {
    return this.#cid
  }
  get reactiveData() {
    return this.#reactiveData
  }
  get attrs(): Record<string, string> {
    return this.#attrs
  }
  get props(): Record<string, any> {
    return this.#props
  }
  get renderRoot(): HTMLElement {
    return this.#renderRoot;
  }
  get renderRoots(): HTMLElement[] {
    return this.#renderRoots;
  }
  get parentComponent(): CompElem | null {
    return this.#parentComponent;
  }
  get wrapperComponent(): CompElem | null {
    return this.#wrapperComponent;
  }
  get slotHooks() {
    return this.#slotHooks;
  }
  get css() {
    return ComponentStyleMap.get(this.constructor)!
  }
  get globalStyleSheet() {
    return GlobalStyleMap.get(this.constructor)?.sheet!
  }
  get isMounted() {
    return this.#mounted
  }
  //slots列表中绝对不会出现slot元素
  get slots() {
    return this.#data['#slots'] as Record<string, Array<Node>>
  }
  #attrs: Record<string, string>
  #props: Record<string, any>
  #renderRoot: HTMLElement
  #renderRoots: HTMLElement[]
  #parentComponent: CompElem | null
  #wrapperComponent: CompElem | null
  #slotsEl: Record<string, HTMLSlotElement> = {};
  #slotHooks: Record<string, (...args: any[]) => Template> = {};
  #slotNodes: Record<string, Node[]> = {};
  #mounted: boolean = false

  //////////////////////////////////// styles
  /**
   * 组件样式，CSSStyleSheet可动态变更
   */
  static get styles(): Array<string | CSSStyleSheet> {
    return [];
  }
  static get globalStyles(): Array<string> {
    return [];
  }
  static get hostStyles(): Array<string> {
    return [];
  }
  get styles(): Array<() => string> {
    return []
  }

  #inited = false;
  #initiating = false;
  constructor(...args: any[]) {
    super();
    this.#cid = CompElemSn++

    //init props via constructor
    if (size(args) === 1) {
      this.#props = {}
      assign(this.#props, first(args))
    }

    let render = this.render.bind(this);
    this.render = function () {
      let rs
      Collector.startRender(this);
      rs = render();
      Collector.endRender(this);
      return rs;
    }

    /////////////////////////////////////////////////// styles
    //global styles
    let globalStyles = get<[]>(this.constructor, "globalStyles")
    // let beAttached = get(this.constructor, '_global_style_attached')
    let beAttached = GlobalStyleMap.has(this.constructor)
    if (!isEmpty(globalStyles) && !beAttached) {
      let globalTextContent = "";
      globalStyles.forEach((st) => {
        if (isString(st)) {
          globalTextContent += st + "\n";
        }
      });
      let style = document.createElement('style')
      style.textContent += globalTextContent;
      GlobalStyleMap.set(this.constructor, style)
      document.head.appendChild(style);
      // set(this.constructor, '_global_style_attached', '1')
    }
    //component styles
    let beAttached2 = ComponentStyleMap.get(this.constructor)
    let styleSheets: CSSStyleSheet[] = beAttached2 ?? [];
    if (!beAttached2) {
      each(get<[]>(this.constructor, "styles"), (st) => {
        if (isString(st)) {
          let sheet = new CSSStyleSheet();
          sheet.replaceSync(st)
          styleSheets.push(sheet);
        } else {
          styleSheets.push(st);
        }
      });
      ComponentStyleMap.set(this.constructor, styleSheets)
    }

    /////////////////////////////////////////////////// shadow
    this.#shadow = this.attachShadow({
      mode: "open"
    });

    this.#shadow.adoptedStyleSheets = [...DefaultCss, ...styleSheets];

    /////////////////////////////////////////////////// slots
    this.#updateSlotsAry()
    //slots prop map
    // this._slotsPropMap = { default: [] }

    /////////////////////////////////////////////////// decorators create
    let ary: DecoratorWrapper[] = get(this.constructor, _DecoratorsKey)
    ary && ary.sort((a, b) => b.priority - a.priority).forEach(dw => dw.create(this))

    this.#updatedD = this.#update.bind(this)
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
        ? node
        : (node as ShadowRoot)!.host as CompElem
      : null;

    this.__init();
  }

  disconnectedCallback() {

  }

  //////////////////////////////////// lifecycles
  //********************************** 首次渲染
  //构造时上级传递的参数
  __init() {
    if (this.#inited) return;
    //防止在钩子中出现重新挂载的情况
    if (this.#initiating) return;
    this.#initiating = true;

    /////////////////////////////////////////////////// slots
    this.#updateSlotsAry()

    //1. Props & States
    const props = this.#initProps();

    this.propsReady(props)
    for (const key in props) {
      const v = props[key];
      this.#data[key] = v;
    }

    this.#initStates();

    //2. Data
    each(this.#data, (v, k: string) => {
      let descr = Reflect.getOwnPropertyDescriptor(this.#data, k);
      Reflect.defineProperty(this, k, {
        get() {
          let v: any = Reflect.get(this.#reactiveData, k);
          return descr?.get ? descr?.get() : v;
        },
        set(v) {
          if (descr?.set) {
            descr?.set(v)
          } else {
            Reflect.set(this.#reactiveData, k, v);
          }
        },
      });
    });
    Reflect.defineProperty(this.#data, '__isData', {
      enumerable: false,
      value: true
    })
    this.#reactiveData = reactive(this.#data, this);

    //3. Computed
    let computedMap: Record<string, Getter> =
      get(this.constructor, DecoratorKey.COMPUTED);
    each(computedMap, (getter, propKey) => {
      Collector.startCollect(this, CollectorType.COMPUTED);
      Collector.setUpdater(() => {
        this.#reactiveData[propKey] = getter.call(this)
      });
      this.#data[propKey] = getter.call(this)
      Collector.endCollect();

      Reflect.defineProperty(this, propKey, {
        get() {
          return Reflect.get(this.#reactiveData, propKey);
        },
        set(v) {
          showTagError(this.tagName, "Cannot set a computed property '" + propKey + "'");
        },
      });
    })

    //4. Watch
    let watchMap = get<Record<string, any>[]>(this.constructor, DecoratorKey.WATCH)
    each(watchMap, (watchList: Record<string, any>[], k: string) => {
      watchList.forEach(v => {
        let { source, options, handler } = v
        let fn = handler.bind(this)
        let onceWatch = get(options, "once", false);
        if (onceWatch) {
          fn = once(fn)
        }
        const updater = (function (ov: any) {
          let nv = get(this, source.replaceAll('-', '.'));
          fn(nv, ov, source)
        }).bind(this)
        let deep = get(options, "deep", false);
        updater.deep = deep
        Collector.collectWatch(this, () => updater, k)

        let immediate = get(options, "immediate", false);
        if (!immediate) return

        let nv = get(this, source.replaceAll('-', '.'));
        fn(nv, nv, source);
      })
    })

    //5. Render
    let tmpl = this.render()
    let nodes = buildView(tmpl, this)

    if (nodes) {
      this.#shadow.append(...nodes)

      this.#renderRoots = filter<HTMLElement>(this.#shadow.childNodes, (n: Node) => n.nodeType === Node.ELEMENT_NODE);
      this.#renderRoot = this.#renderRoots[0] as HTMLElement;
    }

    /////////////////////////////////////////////////// before mount

    //slot hook
    each(this.#slotHooks, (v, k: string) => {
      this.#updateSlot(k)
    })

    const that = this
    let ary: DecoratorWrapper[] = get(this.constructor, _DecoratorsKey)
    ary && ary.sort((a, b) => b.priority - a.priority).forEach(dw => {
      dw.beforeMount(this, (key, value) => {
        that.#reactiveData[key] = value
        return that.#reactiveData[key]
      })
    })

    //host styles
    let hostStyles = get<[]>(this.constructor, "hostStyles")
    let styleRoot = this.#wrapperComponent?.shadowRoot ?? this.ownerDocument
    let cls = HostStyleMap.get(styleRoot)
    if (!cls?.includes(this.constructor as any) && hostStyles.length > 0) {
      let styleSheets: CSSStyleSheet[] = [];
      each(hostStyles, (st) => {
        if (isString(st)) {
          let sheet = new CSSStyleSheet();
          sheet.replaceSync(st)
          styleSheets.push(sheet);
        } else {
          styleSheets.push(st);
        }
      });
      styleRoot.adoptedStyleSheets = [...styleRoot.adoptedStyleSheets, ...styleSheets]
      cls?.push(this.constructor as any)
    }

    this.beforeMount();

    //events
    let eventList = get<Record<string, any>[]>(this.constructor, DecoratorKey.EVENTS)
    eventList && eventList.forEach(async (ev) => {
      let name = ev.name;
      let options = assign({ target: document, once: false, passive: false, capture: false }, ev.options);
      let listener = bind(ev.fn, this)
      let target = options.target;
      if (isFunction(target)) {
        target = await target.call(this, this)
      }
      if (!target) {
        showTagError(this.tagName, "The target of @event('" + name + "',...) is invalid");
        return
      }
      target.addEventListener(name, listener, options)
    })

    //instance dynamic style
    Collector.startCollect(this, CollectorType.CSS);
    let cssAry: CSSStyleSheet[] = []
    this.styles.forEach(st => {
      if (!isFunction(st)) return;
      let cssss = new CSSStyleSheet()
      cssAry.push(cssss)

      Collector.setUpdater(() => {
        let css = st() ?? ''
        cssss.replaceSync(css)
      })
      let css = st()
      if (isBlank(css)) return

      cssss.replaceSync(css)
    })
    Collector.endCollect()

    if (cssAry.length > 0) {
      this.#shadow.adoptedStyleSheets = [...this.#shadow.adoptedStyleSheets, ...cssAry];
    }

    setTimeout(() => {

      this.#mounted = true;
      this.mounted();

      ary && ary.forEach(dw => {
        dw.mounted(this, (key, value) => {
          that.#reactiveData[key] = value
          return that.#reactiveData[key]
        })
      })
    }, 0);

    this.#inited = true;
  }

  propsReady(props: Record<string, any>) { }
  render(): Template {
    throw Error(`[CompElem <${this.tagName}>] Missing render()`)
  }
  beforeMount(): void { }
  mounted(): void { }
  #onSlotChange(slot: HTMLSlotElement, name: string) {
    //1. 更新 _slotsPropMap & slots
    this.#updateSlotsAry()
    //2. 设置attrs
    let props = get<Record<string, any>>(this.#slotPropsMap[name], 'props')
    if (props) {
      each(this.slots, (nodeAry, k: string) => {
        nodeAry.filter(node => node.nodeType === Node.ELEMENT_NODE).forEach((node: Element) => {
          if (node instanceof CompElem) {
            // node._setParentProps(props)
            node._updateProps(props)
            return;
          }
          each(props, (v, k: string) => {
            if (node instanceof HTMLSlotElement) {
              let compOfSlot = get<CompElem>(node, '__l_comp')
              if (compOfSlot) {
                let sname = node.name || 'default'
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

  #rootEvs: Record<string, any[]> = {};

  /**
   * 由监控变量调用
   * @param stateKey
   * @param ov
   * @param rootStateKey 如果是对象内部属性变更，会返回根属性名
   * @returns
   */
  _notify(ov: any, chain: string[]) {
    //todo  1. 取消data - 0这个层级的监控；需要验证删除行时的路径
    let varPath = [];
    for (let i = 0; i < chain.length; i++) {
      const seg = chain[i];
      varPath.push(seg);
      let v = get(this, varPath);
      let pathStr = _toUpdatePath(varPath);
      this.#updateSources[pathStr] = { value: v, chain: pathStr === "slots" ? ['slots'] : varPath, oldValue: ov, end: varPath.length === chain.length };
      if (isObject(v) && pathStr[0] != PrivatePreffix) {
        ChangedMap.set(v, pathStr)
      }
    }

    return this.#updatedD
  }
  #update() {
    if (size(this.#updateSources) < 1) return;

    const changed = this.#updateSources
    this.#updateSources = {}

    //update decorators
    let ary: DecoratorWrapper[] = get(this.constructor, _DecoratorsKey)
    ary && ary.sort((a, b) => b.priority - a.priority).forEach(dw => {
      dw.updated(this, changed)
    })

    let toBreak = !this.shouldUpdate(changed);
    if (toBreak) return;

    let renderContextList: Set<CompElem | Node> = new Set()

    //1. filter context
    each(changed, ({ value, chain, oldValue, end }, k: string) => {
      if (this.#renderContextList[k]) {
        this.#renderContextList[k].forEach(cx => {
          renderContextList.add(cx)
        })
      }
    });
    //2. update context
    renderContextList.forEach(context => {
      if (context === this) {
        updateView(this.render(), this);
      } else {
        //指令在这里仅更新视图
        updateDirectiveView(context, this)
      }
    })

    //update slot view
    this.#updateSlots.forEach((v) => {
      this.#updateSlot(v)
    })

    this.updated(changed);

    each(changed, ({ value, chain, oldValue }, k: string) => {
      if (isObject(value) && ChangedMap.has(value)) {
        ChangedMap.delete(value)
      }
    })
  }

  /**
   * 1. 初始props中并未包含的属性，可从attributes取，且定义类型不是string时自动转换
   * 2. 如果attributes中也未出现且必填报错
   * 3. 否则设置默认值
   * @returns 非props的attr集合
   */
  #initProps() {
    let propDefs: Record<string, PropOption> = get(
      this.constructor,
      DecoratorKey.PROPS
    );
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
    if (!propDefs) return Object.seal(rs);

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

      let getter = get<() => any>(propDefs, [key, 'getter'])
      if (getter) getter = bind(getter, this);
      let setter = get<(v: any) => void>(propDefs, [key, 'setter'])
      if (setter) setter = bind(setter, this);
      if (getter || setter) {
        Reflect.defineProperty(this.#data, key, {
          set: setter || function (v: any) { },
          get: getter
        })
      }
      if (propDef.attribute && isDefined(val) && !isObject(val)) {
        let k = kebabCase(key)
        let v = trim(val)
        if (isBooleanProp(propDef.type)) {
          v = getBooleanValue(val)
          if (isBoolean(v)) {
            this.toggleAttribute(k, v)
          } else {
            this.setAttribute(k, v)
          }
        } else {
          this.setAttribute(k, v)
        }
      }
      this.#data[key] = val;
      rs[key] = val;
    }

    return Object.seal(rs)
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
    let expectTypeAry = isArray<Constructor<any>>(expectType) ? expectType : [expectType];
    let typeConverter = propDef.converter;
    let val: any = newValue
    if (!some(expectTypeAry, (et) => et === String) && isString(val) && !isNull(val)) {
      try {
        val = typeConverter ? typeConverter(val) : this.#convertValue(val, expectTypeAry);
      } catch (error) {
        showTagError(this.tagName, `Convert attribute '${propKey}' error with ` + val);
      }
    } //endif

    //extra work
    for (let i = 0; i < expectTypeAry.length; i++) {
      const et = expectTypeAry[i];
      if (et.name === 'Boolean') {
        val = hasAttr === false && isBlank(val) ? false : getBooleanValue(val)
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
      if (!validator.call(this, val, this.#data)) {
        showTagError(
          this.tagName,
          `Invalid prop '${propKey}'. IsValid() check failed`
        );
      }
    }

    return val;
  }
  #initStates() {
    let stateDefs: Record<string, StateOption> = get(
      this.constructor,
      DecoratorKey.STATES
    );

    each<StateOption, string>(stateDefs, (def, key) => {
      let stateDef = stateDefs[key];
      let val = get(this, key);
      if (stateDef) {
        let propName = stateDef.prop;
        val = propName ? cloneDeep(this.#data[propName]) : get(this, key);
      }

      this.#data[key] = val;
    });
  }
  /**
   * 由外部调用，在初始化及更新时。
   * @param props 
   * @param attrs 
   */
  #propsReady = debounce(this.propsReady, 100)
  /**
   * @deprecated
   */
  _setParentProps(props: Record<string, any>, attrs?: Record<string, any>) {
    if (this.#inited) {
      let propDefs: Record<string, PropOption> = get(
        this.constructor,
        DecoratorKey.PROPS
      );
      //存在attrs表示已初始化完成
      each(props, (v, k: string) => {
        let ck = camelCase(k)
        let propDef = propDefs[ck]
        if (!propDef) return
        let ov = this.#data[ck]
        v = this.#propTypeCheck(propDefs, ck, v)
        if (propDef.hasChanged && !propDef.hasChanged.call(this, v, ov)) return;

        this.#data[ck] = v;
        this._notify(ov, [ck])
      })
      assign(this.#props, props)
      assign(this.#attrs, attrs)

      this.#propsReady(this.#props);
    }
  }
  //todo 这里需要直接修改prop
  _updateProps(props: Record<string, any>) {
    let propDefs: Record<string, PropOption> = get(
      this.constructor,
      DecoratorKey.PROPS
    );
    //存在attrs表示已初始化完成
    each(props, (v, k: string) => {
      let ck = camelCase(k)
      let propDef = propDefs[ck]
      if (!propDef) return
      v = this.#propTypeCheck(propDefs, ck, v)

      Collector.__skipCheck = true;
      set(this, ck, v)
      Collector.__skipCheck = false;
    })
    assign(this.#props, props)

    this.#propsReady(this.#props);
  }
  _initProps(props: Record<string, any>, attrs?: Record<string, any>) {
    this.#props = merge(this.#props || {}, props);
    this.#attrs = merge(this.#attrs || {}, attrs);
  }
  /**
   * 绑定slot标签，render时调用
   */
  _bindSlot(slot: HTMLSlotElement, name: string, props: Record<string, any>) {
    //1. 设置map
    if (!this.#slotsEl[name]) {
      this.#slotsEl[name] = slot;
      Reflect.defineProperty(slot, '__l_comp', {
        value: this
      })
    }

    slot.addEventListener('slotchange', (e: Event) => {
      if (this.#inited)
        this.#onSlotChange(slot, name === 'default' ? '' : name)
    })

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
    const cs = flatMap(this.childNodes, node => {
      if (node.nodeType === Node.COMMENT_NODE) return []
      if (node instanceof HTMLSlotElement) return node.assignedNodes({ flatten: true })
      return node
    })

    let groups = groupBy<Node>(cs, node => {
      if (node.nodeType === Node.TEXT_NODE) return 'default'
      if (node instanceof Element) {
        return node.getAttribute('slot') || 'default'
      }
    })
    if (isEmpty(groups)) {
      if (!isEmpty(this.#data['#slots'])) {
        this.#inited ? this.#reactiveData['#slots'] = {} : this.#data['#slots'] = {};
      }

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

    this.#inited ? this.#reactiveData['#slots'] = rs : this.#data['#slots'] = rs;
  }
  #updateSlot(name: string) {
    let hook = this.#slotHooks[name]
    if (!hook) return;
    let slotMap = this.#slotPropsMap[name]

    let slot = this.#data['#slots'][name]
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
    if (!this.#inited) return;
    let observedAttrs = _getObservedAttrs(this.constructor)
    if (observedAttrs.has(name)) {
      let camelName = camelCase(name)
      if (isNull(newValue)) {
        let propDefs: Record<string, PropOption> = get(
          this.constructor,
          DecoratorKey.PROPS
        );
        //使用默认值
        newValue = propDefs[camelName]._defaultValue
      }
      this._updateProps({ [camelName]: newValue })
    }
  }
  /**
   * todo 
   * 1. 取消上溯递归路径
   */
  _regDeps(varPath: string, renderContext: CompElem | Node) {
    let list = this.#renderContextList[varPath]
    if (!list) {
      list = this.#renderContextList[varPath] = new Set<CompElem | Node>()
    }
    list.add(renderContext)

    let restPath = varPath.split('-')
    restPath.pop()
    if (restPath.length < 1) return;
    let upperPath = restPath.join('-')

    list = this.#renderContextList[upperPath]
    if (!list) {
      list = this.#renderContextList[upperPath] = new Set<CompElem | Node>()
    }
    list.add(renderContext)
  }
  _regWrapper(wrapperComponent: CompElem) {
    this.#wrapperComponent = wrapperComponent
  }
  ////////////////////----------------------------/////////////// APIs
  /**
   * 抛出自定义事件
   * @param evName 事件名称
   * @param args 自定义参数
   */
  emit(
    evName: string,
    arg: Record<string, any> = {},
    options?: { event?: Event; bubbles?: boolean, composed?: boolean }
  ) {
    if (options && options.event) {
      arg.event = options.event;
    }
    arg.target = this;
    this.dispatchEvent(
      new CustomEvent(evName, {
        bubbles: get(options, "bubbles", false),
        composed: get(options, "composed", false),
        cancelable: true,
        detail: arg,
      })
    );
  }
  /**
   * 在root上绑定事件
   * @param evName
   * @param hook
   */
  on(evName: string, hook: (e: Event) => void) {
    if (!this.#rootEvs[evName]) {
      this.#rootEvs[evName] = [];
    }
    let cbk = hook.bind(this);
    this.#rootEvs[evName].push(cbk);
    this.addEventListener(evName, cbk);
  }
  /**
   * 下一帧执行
   * @param cbk
   */
  nextTick(cbk: () => void, key?: string) {
    Queue.pushNext(cbk, key)
  }
  /**
   * 强制更新一次视图
   */
  forceUpdate() {
    each(this.#reactiveData, (v, k: string) => {
      this.#updateSources[k] = {
        value: undefined,
        chain: undefined,
      };
    })
    this.#update();
  }
}