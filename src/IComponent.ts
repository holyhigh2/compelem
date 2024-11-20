import { Template } from "./render/render";

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
  get styles(): CSSStyleSheet[];
  //是否已挂载
  get isMounted(): boolean;

  //----------------------------------------------------- lifecycles —— 首次渲染
  // 1. 初始化属性及状态，该回调内可以访问props和state。此时组件dom并未构建，但已有parent 属性，没有root属性
  connected(): void;
  // 2. props初始化完成，即将开始渲染
  propsReady(): void;
  // 3. 每次更新时调用
  render(): Template;
  // 4. 首次渲染完成后调用
  mounted(): void;

  //----------------------------------------------------- lifecycles —— 更新
  // 1. 是否需要更新，返回true时更新
  shouldUpdate(changed: Record<string, any>): boolean;
  // 2. 视图及slot更新后触发。 包括 调用render、更新@query/all、更新ref、更新prop到attr的映射
  updated(changed: Record<string, any>): void;
  // 3. 插槽内容变更时触发
  slotChange(slot: HTMLSlotElement, name: string): void;

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
