import {
  assign,
  bind,
  camelCase,
  clone,
  cloneDeep,
  closest,
  concat,
  debounce,
  each,
  filter,
  first,
  flatMap,
  fval,
  get,
  groupBy,
  has,
  isArray,
  isBlank,
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
  omit,
  omitBy,
  reject,
  set,
  size,
  slice,
  some,
  test,
  toArray,
  trim
} from "myfx";
import { _DecoratorsKey, DecoratorWrapper } from "./decorator";
import { _getObservedAttrs, PropOption } from "./decorators/prop";
import { StateOption } from "./decorators/state";
import { Directive } from "./directive/Directive";
import { IComponent } from "./IComponent";
import { Collector, reactive } from "./reactive";
import { ATTR_PREFIX_BOOLEAN, ATTR_PREFIX_EVENT, ATTR_PREFIX_PROP, ATTR_REF, html, Template } from "./render/render";
import { IRenderContext, RenderContext } from "./render/RenderContext";
import { SlotOptions, TmplFn } from "./types";
import { _toUpdatePath, showTagError } from "./utils";
const ATTR_CSS_LINK = "css-link";
const PropTypeMap: Record<string, Function> = {
  boolean: Boolean,
  string: String,
  number: Number,
  object: Object,
  array: Array,
  function: Function,
  bigint: BigInt,
  symbol: Symbol,
  undefined: Object
}
const PrivatePreffix = '#'
//组件静态样式
const ComponentStyleMap = new WeakMap<WeakKey, CSSStyleSheet[]>()

/**
 * CompElem基类，意为组件元素。提供了基本内置属性及生命周期等必备接口
 * 每个组件都需要继承自该类
 *
 * @author holyhigh2
 */
export class CompElem extends RenderContext(HTMLElement) implements IComponent {
  static __l_globalRule = document.createElement("style");
  static {
    document.head.appendChild(CompElem.__l_globalRule);
  }

  #slotPropsMap: Record<string, Partial<SlotOptions>> = {}
  #data: Record<string, any> = { '#slots': {} };
  #reactiveData: Record<string, any> = {};
  #updateTimer: any;
  #updateSources: Record<string, { value: any; chain?: string[], oldValue?: any, end?: boolean }> = {};
  #shadow: ShadowRoot;
  #selfObserver: MutationObserver
  //保存所有渲染上下文 {CompElem/Directive}
  #renderContextList: Record<string, Set<CompElem | Directive>> = {};
  __events: Record<string, Array<Node | ((e: Event) => void)>[]> = {}

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
  get parentComponent(): HTMLElement | null {
    return this.#parentComponent;
  }
  get slotHooks() {
    return this.#slotHooks;
  }
  get styles() {
    return ComponentStyleMap.get(this.constructor)!
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
  #parentComponent: HTMLElement | null
  #slotsEl: Record<string, HTMLSlotElement> = {};
  #slotHooks: Record<string, (...args: any[]) => Template> = {};
  #slotNodes: Record<string, Node[]> = {};
  #mounted: boolean = false
  #instanceCss = new CSSStyleSheet()

  /**
   * 是否自动插入插槽，如果需要控制插槽类型时，可以设置为false
   */
  static get autoSlot() {
    return true;
  }
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
  get css() {
    return ''
  }

  #inited = false;
  constructor(...args: any[]) {
    super();
    //init props via constructor
    if (size(args) === 1) {
      this.#props = {}
      assign(this.#props, first(args))
    }

    this.renderComponent = this;
    let render = this.render;
    this.render = () => {
      let rs
      Collector.startRender(this);
      rs = render.call(this);
      Collector.endRender(this.renderComponent);
      return rs;
    }

    /////////////////////////////////////////////////// styles
    //global styles
    let globalStyles = get<[]>(this.constructor, "globalStyles")
    let beAttached = get(this.constructor, '_global_style_attached')
    if (!isEmpty(globalStyles) && beAttached !== '1') {
      let globalTextContent = "";
      each(globalStyles, (st) => {
        if (isString(st)) {
          globalTextContent += st + "\n";
        }
      });
      CompElem.__l_globalRule.textContent += globalTextContent;
      set(this.constructor, '_global_style_attached', '1')
    }
    //component styles
    let beAttached2 = ComponentStyleMap.get(this.constructor)
    let styleSheets: CSSStyleSheet[] = beAttached2 ?? [];
    if (!beAttached2) {
      each(get<[]>(this.constructor, "styles"), (st) => {
        if (isString(st)) {
          let sheet = new CSSStyleSheet();
          sheet.replace(st)
          styleSheets.push(sheet);
        } else {
          styleSheets.push(st);
        }
      });
      ComponentStyleMap.set(this.constructor, styleSheets)
    }

    /////////////////////////////////////////////////// shadow
    this.#shadow = this.attachShadow({
      mode: "open",
      slotAssignment: get<boolean>(this.constructor, "autoSlot", true) ? "named" : "manual",
    });

    this.#shadow.adoptedStyleSheets = concat(styleSheets, this.#instanceCss);

    //check link
    let cssLink = this.attributes.getNamedItem(ATTR_CSS_LINK)?.value;
    if (cssLink) {
      const link = document.createElement("style");
      link.textContent = `@import "${cssLink}"`;
      this.#shadow.appendChild(link);
    }

    let filterSlotFn = debounce(this.#filterSlot, 20)
    this.#selfObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          filterSlotFn.call(this);
        }
      });
    });

    //slots prop map
    this._slotsPropMap = { default: [] }

    /////////////////////////////////////////////////// decorators create
    let ary: DecoratorWrapper[] = get(this.constructor, _DecoratorsKey)
    each(ary, dw => {
      dw.create(this)
    })

    this.#updatedD = debounce(this.#update, 50)
  }
  #updatedD

  connectedCallback() {
    //parent
    let node = closest(
      this.parentNode!,
      (node) =>
        node instanceof CompElem || node.host instanceof CompElem,
      "parentNode"
    );
    this.#parentComponent = node
      ? node instanceof CompElem
        ? node
        : node!.host
      : null;

    this.connected();

    this.__init();
  }

  disconnectedCallback() {
    this.#selfObserver.disconnect()
  }

  //////////////////////////////////// lifecycles
  //********************************** 首次渲染
  //构造时上级传递的参数
  __init() {
    if (this.#inited) return;

    /////////////////////////////////////////////////// slots
    this.#updateSlotsAry()

    //check props
    this.#initProps();
    this.#initStates();

    //define reactive
    each(this.#data, (v, k: string) => {
      let descr = Reflect.getOwnPropertyDescriptor(this.#data, k);
      Object.defineProperty(this, k, {
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
    Object.defineProperty(this.#data, '__isData', {
      enumerable: false,
      value: true
    })

    this.#reactiveData = reactive(this.#data, this);

    /////////////////////////////////////////////////// decorators propsReady
    const that = this
    let ary: DecoratorWrapper[] = get(this.constructor, _DecoratorsKey)
    each(ary, dw => {
      dw.propsReady(this, (key, value) => {
        that.#reactiveData[key] = value
        return that.#reactiveData[key]
      })
    })

    this.propsReady();

    //computed props
    let computedMap: Record<string, Record<string, any>> =
      get(this.constructor, "__deco_computed");
    each(computedMap, ({ key, getter }, propKey: string) => {
      Collector.startCompute(this);
      Collector.setComputedProp(() => {
        this.#reactiveData[propKey] = getter.call(this)
      });
      this.#data[propKey] = getter.call(this)
      Collector.endCompute();
    })
    each(computedMap, (v, k) => {
      Object.defineProperty(this, k, {
        get() {
          return Reflect.get(this.#reactiveData, k);
        },
        set(v) {
          showTagError(this.tagName, "Cannot set a computed property '" + k + "'");
        },
      });
    })

    //render
    let [nodes, expPos, expPosMap] = this.renderContext()
    this.__expPos = expPos
    if (nodes) {
      let children = toArray<HTMLElement>(nodes);

      each(children, (c) => {
        this.#shadow.appendChild(c);
      });

      this.#renderRoots = children;
      this.#renderRoot = children[0] as HTMLElement;
    }

    //filter slot before append to dom
    this.#filterSlot()

    this.#selfObserver.observe(this, { childList: true })

    //events
    let eventList = get<Record<string, any>[]>(this.constructor, "__deco_events")
    each(eventList, (ev) => {
      let name = ev.name;
      let options = assign({ target: document, once: false, passive: false, capture: false }, ev.options);
      let listener = bind(ev.fn, this)
      let target = options.target;
      if (isFunction(target)) {
        target = target.call(this, this)
      }
      target.addEventListener(name, listener, options)
    })

    //slot hook
    each(this.#slotHooks, (v, k: string) => {
      this.#updateSlot(k)
    })

    //instance dynamic style
    Collector.startCss(this)
    Collector.setCssUpdater(() => {
      let css = this.css;
      this.#instanceCss.replace(css)
    })
    let css = this.css;
    if (trim(css)) {
      this.#instanceCss.replace(css)
    }
    Collector.endCss()

    setTimeout(() => {
      this.#mounted = true;
      this.mounted();
      each(ary, dw => {
        dw.mounted(this, (key, value) => {
          that.#reactiveData[key] = value
          return that.#reactiveData[key]
        })
      })
    }, 0);

    this.#inited = true;
  }

  /**
   * 初始化属性及状态，该回调内可以访问props和state
   * 此时组件dom并未构建，但已有parent 属性，没有root属性
   */
  connected() { }
  /**
   * props初始化完成回调
   */
  propsReady() { }

  /**
   * 每次更新时调用
   */
  render(): Template {
    throw Error(`[CompElem <${this.tagName}>] Missing render()`)
  }
  /**
   * dom渲染完毕后调用，该回调内可以query注解初始化完成
   */
  mounted() { }
  #onSlogChange(slot: HTMLSlotElement, name: string) {
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
                compOfSlot.#onSlogChange(node, sname)
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

  #rootEvs: Record<string, any[]> = {};
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
  nextTick(cbk: () => void) {
    requestAnimationFrame(cbk);
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

  /**
   * 由监控变量调用
   * @param stateKey
   * @param ov
   * @param rootStateKey 如果是对象内部属性变更，会返回根属性名
   * @returns
   */
  _notify(ov: any, chain: string[]) {
    let varPath = [];
    each(chain, (seg) => {
      varPath.push(seg);
      let v = get(this, varPath);
      let pathStr = _toUpdatePath(varPath);
      this.#updateSources[pathStr] = { value: v, chain: pathStr === "slots" ? ['slots'] : varPath, oldValue: ov, end: varPath.length === chain.length };
    });

    //debounce
    this.#updatedD()
  }
  #update() {
    if (size(this.#updateSources) < 1) return;

    const changed = Object.seal(clone(omitBy(this.#updateSources, (v, k: string) => k[0] === PrivatePreffix)) as any)

    //update decorators
    let ary: DecoratorWrapper[] = get(this.constructor, _DecoratorsKey)
    each(ary, dw => {
      dw.updated(this, changed)
    })

    let toBreak = !this.shouldUpdate(changed);
    if (toBreak) return;

    let renderContextList: Set<CompElem | Directive> = new Set()

    //1. filter context
    each(this.#updateSources, ({ value, chain, oldValue }, k: string) => {
      if (this.#renderContextList[k]) {
        this.#renderContextList[k].forEach(cx => {
          renderContextList.add(cx)
        })
      }
    });
    //2. update context
    renderContextList.forEach(context => {
      context.updateContext(...(context._renderArgs ? context._renderArgs : []));
    })

    //update slot view
    each(this.#updateSlots, (v) => {
      this.#updateSlot(v)
    })

    this.updated(changed);

    this.#updateSources = {};
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
      "__deco_props"
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
    each<PropOption, string>(propDefs, (def, key) => {
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
          attrs.getNamedItem(kebabCase(key)) ||
          attrs.getNamedItem(ATTR_PREFIX_PROP + kebabCase(key));
        if (attr) {
          isInited = true;
          val = attr.value;
        }
      }

      //required check
      let isRequired = propDef.required;
      if (isRequired && !isInited) {
        showTagError(tagName, "Prop '" + key + "' is required");
        return false;
      }

      val = this.#propTypeCheck(propDefs, key, val)

      let getter = get<() => any>(propDefs, [key, 'getter'])
      if (getter) getter = bind(getter, this);
      let setter = get<(v: any) => void>(propDefs, [key, 'setter'])
      if (setter) setter = bind(setter, this);
      if (getter || setter) {
        Object.defineProperty(this.#data, key, {
          set: setter || function (v: any) { },
          get: getter
        })
      }
      if (propDef.attribute && isDefined(val) && !isObject(val)) {
        this.setAttribute(kebabCase(key), trim(val))
      }
      this.#data[key] = val;
    });
  }
  //属性值检测
  #propTypeCheck(propDefs: Record<string, PropOption>, propKey: string, newValue: string | null) {
    let propDef = propDefs[propKey]
    if (!propDef) return newValue

    let validator = propDef.isValid
    let expectType = propDef.type
    let expectTypeAry = isArray(expectType) ? expectType : [expectType];
    let typeConverter = propDef.converter;
    let val: any = newValue
    if (!some(expectTypeAry, (et) => et === String) && isString(val) && !isNull(val)) {
      try {
        val = typeConverter ? typeConverter(val) : fval(val, { html });
      } catch (error) {
        showTagError(this.tagName, `Convert attribute '${propKey}' error with ` + val);
      }
    } //endif

    //extra work
    expectTypeAry.forEach(et => {
      if (et.name === 'Boolean') {
        if (isString(val) && /(?:^true$)|(?:^false$)/.test(val)) {
          val = fval(val)
        } else if (isUndefined(val) || isBlank(val)) {
          val = true;
        }
      }
    })

    let realType = typeof val;
    let matched = isDefined(val) ? false : true;
    each(expectTypeAry, (et) => {
      if (
        //base form
        test(realType, et.name, "i") ||
        //object form
        val instanceof et
      ) {
        matched = true;
        return false;
      }

    });

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
      "__deco_states"
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
        "__deco_props"
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

      this.#propsReady();
    } else {
      // this.#props = merge(this.#props || {}, props);
      // this.#attrs = merge({}, attrs);
    }
  }
  //todo 这里需要直接修改prop
  _updateProps(props: Record<string, any>) {
    let propDefs: Record<string, PropOption> = get(
      this.constructor,
      "__deco_props"
    );
    //存在attrs表示已初始化完成
    each(props, (v, k: string) => {
      let ck = camelCase(k)
      let propDef = propDefs[ck]
      if (!propDef) return
      let ov = this.#data[ck]
      v = this.#propTypeCheck(propDefs, ck, v)
      if (propDef.hasChanged && !propDef.hasChanged.call(this, v, ov)) return;

      Collector.__skipCheck = true;
      set(this, ck, v)
      Collector.__skipCheck = false;
    })
    assign(this.#props, props)

    this.#propsReady();
  }
  _initProps(props: Record<string, any>, attrs?: Record<string, any>) {
    this.#props = merge(this.#props || {}, props);
    this.#attrs = merge({}, attrs);
  }
  /**
   * 绑定slot标签，render时调用
   */
  _bindSlot(slot: HTMLSlotElement, name: string, props: Record<string, any>) {
    //1. 设置map
    if (!this.#slotsEl[name]) {
      this.#slotsEl[name] = slot;
      Object.defineProperty(slot, '__l_comp', {
        value: this
      })
    }

    slot.addEventListener('slotchange', (e: Event) => {
      if (this.#inited)
        this.#onSlogChange(slot, name === 'default' ? '' : name)
    })

    //3. 保存参数
    if (!isEmpty(props)) {
      let slotMap = this.#slotPropsMap[name]
      if (!slotMap) {
        slotMap = this.#slotPropsMap[name] = {}
      }
      if (props.nodeFilter) {
        slotMap.filter = props.nodeFilter
      }

      slotMap.props = omit(props, 'nodeFilter')
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
      each(els, el => {
        el.setAttribute(propName!, value + '')
      })
    }
  }
  #updateSlotsAry() {
    const cs = flatMap(this.childNodes, node => {
      if (node.nodeType === Node.COMMENT_NODE) return []
      if (node instanceof HTMLSlotElement) return node.assignedNodes({ flatten: true })
      return node
    })

    let groups = groupBy<Node, Record<string, Node[]>>(cs, node => {
      // if (node.nodeType === Node.COMMENT_NODE) return ''
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
    let [nodes, expPos, expPosMap] = rc?.renderContext(hook(get(slotMap, 'props')))!
    let nnodes = reject(toArray<Node>(nodes), n => n.nodeType === Node.COMMENT_NODE);

    if (nnodes) {
      let slottedNodes = this.#slotNodes[name]
      if (!isEmpty(slottedNodes)) {

        each(slottedNodes!, n => {
          n.parentNode?.removeChild(n)
        })
      }
      this.#slotNodes[name] = nnodes;
      this.append(...nnodes)
      this.#updateSlots.clear();
    }

  }
  _asyncDirectives = new WeakMap<TmplFn, IRenderContext>()
  renderAsync(cbk: TmplFn, ...args: any[]) {

  }
  //children变化时触发
  #filterSlot() {
    if (isEmpty(this.#slotPropsMap)) return;

    each(this.slots, (slottedNodes, k: string) => {
      if (isEmpty(slottedNodes)) return;
      let slotMap = this.#slotPropsMap[k]
      let filterNodes = slottedNodes
      if (slotMap) {
        let filterFn = slotMap.filter
        if (isFunction(filterFn)) {
          filterNodes = filterFn(slottedNodes)
        } else if (isObject(filterFn)) {
          let type = filterFn.type;
          let maxCount = filterFn.maxCount;
          if (type) {
            let ts = isArray(type) ? type : [type]
            filterNodes = filter(slottedNodes, n => some(ts, t => n instanceof t))
          }
          if (maxCount > 0) {
            filterNodes = slice(slottedNodes, 0, maxCount)
          }
        }
      }
      if (this.#shadow.slotAssignment === 'named') {
        let removeNodes: Node[] = []
        each(slottedNodes, c => {
          if (!filterNodes.includes(c)) {
            removeNodes.push(c)
          }
        })
        while (removeNodes.length > 0) {
          let n = removeNodes.pop()!
          n.parentNode?.removeChild(n)
        }
      } else {
        this.#slotsEl[k].assign(...filterNodes as any);
      }

      if (this.#inited)
        this.#onSlogChange(this.#slotsEl[k], k === 'default' ? '' : k)
    })
  }

  #attrChanged(name: string, oldValue: string | null, newValue: string | null) {
    if (!this.isMounted) return;
    let observedAttrs = _getObservedAttrs(this.constructor)
    if (observedAttrs.has(name)) {
      let camelName = camelCase(name)
      if (isNull(newValue)) {
        let propDefs: Record<string, PropOption> = get(
          this.constructor,
          "__deco_props"
        );
        //使用默认值
        newValue = propDefs[camelName]._defaultValue
      }
      this._updateProps({ [camelName]: newValue })
    }
  }
  _regDeps(varPath: string, renderContext: CompElem | Directive) {
    let list = this.#renderContextList[varPath]
    if (!list) {
      list = this.#renderContextList[varPath] = new Set<CompElem | Directive>()
    }
    list.add(renderContext)

    let lastPath = ''
    let restPath = varPath.split('-')
    restPath.pop()
    restPath.forEach(vp => {
      lastPath = isEmpty(lastPath) ? vp : lastPath + '-' + vp
      let list = this.#renderContextList[lastPath]
      if (!list) {
        list = this.#renderContextList[lastPath] = new Set<CompElem | Directive>()
      }
      list.add(renderContext)
    })
  }
}
