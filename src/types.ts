/**
 * @author holyhigh2
 */
import { CompElem } from "./CompElem";
import { Template } from "./render/Template";
import type { UpdatePoint } from "./render/UpdatePoint";

export type Constructor<T> = new (...args: any[]) => T;
export type Getter = () => any;

/** 一次建树的返回结构：主 buildTemplate 与 subViews 元素同形。 */
export type BuiltTemplateResult = {
    fragment: DocumentFragment,
    ups: any[],
    emptyEvents?: Record<number, string[]>,
    // 升序排列DOM
    nodes?: Node[],
    // 快速路径
    updateSns?: number[],
    updatePaths?: number[][],
};

/** 一个结构指令回调的子视图产物 */
export type CompiledSubView = {
    buildTemplate?: (this: CompElem<any>) => BuiltTemplateResult,
    pointEffects?: any[],
    fx?: any[],
};

/**
 * `@compelem/compiler` 注入的编译期静态元数据契约
 *
 */
export type CompiledStatic = {
    /**
     * 编译器生成的纯 document 建 DOM 函数，以首个组件实例为 this 调用。
     */
    buildTemplate?: (this: CompElem<any>) => BuiltTemplateResult,
    /**
     * 结构指令模板回调的子视图
     */
    subViews?: Record<number, CompiledSubView>,
    // prop 定义集合（沿构造器原型链浅替换合并后的**完整**表）
    props?: Record<string, PropOption>,
    // state 定义集合（同上，合并语义）
    states?: Record<string, StateOption>,
    // computed 定义集合
    computedGetters?: Record<string, Getter>,
    /**
     * `@watch` 产物：每个 watch 一个 effect 工厂
     */
    watchEffects?: Array<(comp: CompElem<any>) => () => void>,
    /**
     * `cssVars` 的响应式 effect 工厂
     */
    cssEffect?: (comp: CompElem<any>) => () => void,
    /**
     * 值点 per-point effect 工厂表
     */
    pointEffects?: Array<number | ((rc: any, nodes: any[], ...params: any[]) => () => void)>,
    /**
     * 逐实例产物工厂表（指令实例 / 事件 handler / ref 等）；下标 = up.ux
     */
    fx?: any[],
    /**
     * 无视图组件标记
     */
    noView?: boolean,
};

/**
 * 插槽配置对象
 */
export type SlotOptions = {
    props: Record<string, any>,
    hook: Function
}

export type TplFn = (...args: any[]) => Template;
export type KeyFn = (item: any, k: string | number, i: number) => string | number;

/**
 * 属性定义
 */
export enum EnterPointType {
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
export type StateOption = {
    /**
     * 是否浅层监控，默认false
     */
    shallow?: boolean,
    /**
     * 是否发生变更，如果未指定使用严格相等
     * @param newValue 
     * @param oldValue 
     * @returns 
     */
    hasChanged?: (newValue: any, oldValue: any, changeChain: string[], subNewValue: any, subOldValue: any) => boolean
};

export type StateDefInternal = StateOption & {
    prop?: string,
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
    type?: Constructor<any> | Array<Constructor<any>>,
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
    _typeAry?: Array<Constructor<any>>,
    /**
     * 属性校验器，可动态校验值是否合法
     * @param value 
     * @returns 
     */
    isValid?: (value: any, props?: Record<string, any>) => boolean
}

export type DirectiveExecutor = (node: Node, newArgs: any[], oldArgs: any[] | undefined, meta?: { pointType?: string, renderComponent?: CompElem, slotComponent?: CompElem, varChain?: string[], attrName?: string, up?: UpdatePoint }) => [DirectiveUpdateTag, ...any] | void

export type DirectiveInstance = [
    // symbol,
    DirectiveExecutor,// executor
    Array<any>,// args
    Function// scope checker
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

export type StyleValueObjectType = { value: number | string, important?: boolean }
export type StyleValueType = string | number | StyleValueObjectType