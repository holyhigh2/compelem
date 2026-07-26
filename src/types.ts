/**
 * @author holyhigh2
 */
import { CompElem } from "./CompElem";
import { Template } from "./render/Template";

export type Constructor<T> = new (...args: any[]) => T;
export type Getter = () => any;
export type Updater = (...args: any[]) => any;

/**
 * 插槽配置对象
 */
export type SlotOptions = {
    props: Record<string, any>,
    hook: Function
}

export type TplFn = (...args: any[]) => Template;
export type KeyFn = (item: any, k: string | number, i: number) => string | number;

export type UpdatedSource = { value: any; chain?: string[], oldValue?: any, end?: boolean, subNewValue?: any, subOldValue?: any }

/**
 * 属性定义
 */
export enum EnterPointType {
    ATTR = "attr", //属性，文本内容，可以内嵌多插值
    PROP = "prop", //参数，智能内嵌一个插值
    TEXT = "text",
    SLOT = "slot",
    TAG = 'tag' //在标签内但不是属性内
}

/**
 * 监控定义
 */
export type WatchOptions = {
    /**
     * 是否立即执行
     */
    immediate?: boolean,
    /**
     * 是否深度监控
     */
    deep?: boolean,
    /**
     * 是否仅执行一次
     */
    once?: boolean
}
/**
 * 事件选项
 */
export type QueryOption = {
    /**
     * 指示是否返回任何可用子<slot>元素的指定节点（true）或不返回（false）
     */
    flatten?: boolean,
    /**
     * 对节点列表进行过滤
     */
    selector?: string,
    /**
     * 缓存标识
     */
    cache?: string
}

export type StateOption = {
    /**
     * 是否浅层监控，默认false
     */
    shallow?: boolean,
    /**
     * 指定prop进行初始化，如果时对象类型时
     */
    prop?: string,
    /**
     * 是否发生变更，如果未指定使用严格相等
     * @param newValue 
     * @param oldValue 
     * @returns 
     */
    hasChanged?: (newValue: any, oldValue: any, changeChain: string[], subNewValue: any, subOldValue: any) => boolean
};


/**
 * 属性定义
 */
export type PropOption = {
    /**
     * 是否浅层监控，默认false。如果属性值是由上级组件传递的state且已经指定shallow，则忽略该属性
     */
    shallow?: boolean,
    /**
     * 参数类型
     */
    type: Constructor<any> | Array<Constructor<any>>,
    /**
     * 是否必填，默认false
     */
    required?: boolean,
    /**
     * 是否声明为一个双向绑定属性，默认false
     */
    model?: boolean
    /**
     * 是否关联属性，prop会生成dom属性且当属性变动时自动更新值。默认true
     */
    attribute?: boolean,
    /**
     * 是否发生变更，如果未指定使用严格相等
     * @param newValue 
     * @param oldValue 
     * @returns 
     */
    hasChanged?: (newValue: any, oldValue: any, changeChain: string[], subNewValue: any, subOldValue: any) => boolean,
    /**
     * 当传递参数值为string类型且参数类型不是string时会调用转换器进行转换
     * @param stringValue 
     * @returns 
     */
    converter?: (stringValue: string) => any,
    _defaultValue?: any
    /**
     * 属性校验器，可动态校验值是否合法
     * @param value 
     * @returns 
     */
    isValid?: (value: any, props?: Record<string, any>) => boolean
}

export type DirectiveExecutor = (node: Node, newArgs: any[], oldArgs: any[] | undefined, meta?: { pointType?: string, renderComponent?: CompElem, slotComponent?: CompElem, varChain?: string[], attrName?: string, updatedMap?: Record<string, UpdatedSource> }) => [DirectiveUpdateTag, ...any] | void

export type DirectiveInstance = [
    // symbol,
    DirectiveExecutor,// executor
    Array<any>,// args
    Function,// scope checker
    any[] // varChain
]

export enum DirectiveUpdateTag {
    NONE = 'NONE',//框架不处理
    REFRESH = 'REFRESH',//刷新视图
    REMOVE = 'REMOVE',//删除指令创建的节点
    REPLACE = 'REPLACE',//删除已有节点后插入
    UPDATE = 'UPDATE',//对比更新
    INIT = 'INIT'//首次渲染
}

export type DefaultProps = Partial<{
    //全局默认样式
    css: Array<string | CSSStyleSheet>,
    //全局默认prop
    global: Record<string, any>,
    //组件的默认prop
    [key: string]: Record<string, any>
}>
