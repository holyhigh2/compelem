import { Template } from "./render/Template";

/**
 * 组件接口
 * 定义组件属性、生命周期及方法
 * @author holyhigh2
 */
export interface IComponent<T = HTMLElement> {
  //组件实例唯一序号
  get cid(): number;
  //外部传入的特性
  get attrs(): Record<string, string>;
  //外部传入的属性
  get props(): Record<string, any>;
  //首个渲染根元素
  get renderRoot(): T | undefined;
  //所有渲染根元素
  get renderRoots(): HTMLElement[];
  //根组件
  get rootComponent(): HTMLElement | undefined;
  //父组件
  get parentComponent(): HTMLElement | undefined;
  //包装组件
  get wrapperComponent(): HTMLElement | undefined;
  //每个插槽中保存的节点数组，无名插槽名称为 'default'
  get slots(): Record<string, Array<Node>>;
  //动态slot中的render函数，可传递给子元素的动态插槽
  get slotHooks(): Record<string, (...args: any[]) => Template>;
  //通过静态getter创建的所有样式表对象，所有实例共享
  get cssSheets(): CSSStyleSheet[];
  //通过静态getter创建的全局样式表对象，所有实例共享
  get globalCssSheet(): CSSStyleSheet;
  //是否已挂载
  get isMounted(): boolean;
  //响应式css变量
  get cssVars(): Record<string, string | number | undefined>

  //----------------------------------------------------- lifecycles —— 首次渲染
  // 1. 在props初始化及更新时调用，可添加或修改响应属性
  propsReady(props: Record<string, any>): void;
  // 每次渲染时调用
  render(): Template | null;
  // 2. slots、refs、props、attrs等初始化后调用
  beforeMount(): void;
  // 3. shadowDOM挂载后调用，仅触发一次
  mounted(): void;
  // 4. 每次插入dom时调用，子类需要super调用
  connectedCallback(): void;
  // 5. 每次从dom卸载时调用，子类需要super调用
  disconnectedCallback(): void;
  // 6. 组件销毁前调用，可以访问内部资源
  beforeDestroyed(): void;
  // 6. 组件销毁后调用，内部资源已全部释放
  destroyed(): void;

  //----------------------------------------------------- lifecycles —— 更新
  // 1. 是否需要更新，返回true时更新
  shouldUpdate(changed: Record<string, any>): boolean;
  // 2. 视图及slot更新后触发。 包括 调用render、更新@query/all、更新ref、更新prop到attr的映射
  updated(changed: Record<string, any>): void;
  // 3. 插槽内容变更时触发
  slotChange(slot: HTMLSlotElement, slotName: string): void;
  // 4. 组件属性由外部变更时触发
  attributeChangedCallback(attributeName: string, oldValue: string | null, newValue: string | null): void;

  //----------------------------------------------------- 接口
  /**
   * 抛出自定义事件
   * @param evName 事件名称
   * @param args 自定义参数
   */
  emit(
    evName: string,
    arg: Record<string, any>,
    event?: Event
  ): void;
  nextTick(cbk: () => void): void;
  /**
   * 强制更新一次视图
   */
  forceUpdate(): void;
  /**
   * 向组件插入样式表，没有shadowDOM的组件调用无效
   * @param sheet 
   */
  insertStyleSheet(sheet: string | CSSStyleSheet): CSSStyleSheet | null;
}
