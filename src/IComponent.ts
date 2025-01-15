import { Template } from "./render/Template";

/**
 * 组件接口
 * 定义组件属性、生命周期及方法
 * @author holyhigh2
 */
export interface IComponent {

  //外部传入的特性
  get attrs(): Record<string, string>;
  //外部传入的属性
  get props(): Record<string, any>;
  //首个渲染根元素
  get renderRoot(): HTMLElement;
  //所有渲染根元素
  get renderRoots(): HTMLElement[];
  //父组件
  get parentComponent(): HTMLElement | null;
  //每个插槽中保存的节点数组，无名插槽名称为 'default'
  get slots(): Record<string, Array<Node>>;
  //动态slot中的render函数，可传递给子元素的动态插槽
  get slotHooks(): Record<string, (...args: any[]) => Template>;
  //通过静态getter创建的所有样式表对象，所有实例共享
  get css(): CSSStyleSheet[];
  //是否已挂载
  get isMounted(): boolean;
  //响应式样式数组
  get styles(): Array<() => string>

  //----------------------------------------------------- lifecycles —— 首次渲染
  // 1. 在props初始化及更新时调用
  propsReady(props: Record<string, any>): void;
  // 每次渲染时调用
  render(): Template;
  // 2. slots、refs、props、attrs等初始化后调用
  beforeMount(): void;
  // 3. 首次渲染完成后调用，仅触发一次
  mounted(): void;
  // 4. 每次插入dom时调用
  connectedCallback(): void;
  // 5. 卸载组件时调用
  disconnectedCallback(): void;

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
    options?: { event?: Event; bubbles?: boolean, composed?: boolean }
  ): void;

  /**
   * 在root上绑定事件
   * @param evName
   * @param hook
   */
  on(evName: string, hook: (e: Event) => void): void;
  /**
   * 下一帧执行
   * @param cbk
   */
  nextTick(cbk: () => void): void;
  /**
   * 强制更新一次视图
   */
  forceUpdate(): void;
}
