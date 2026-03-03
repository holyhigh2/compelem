/**
 * @author holyhigh2
 */
import { CompElem } from "./CompElem";
import { Template } from "./render/Template";
import { DomUtil } from "./utils";

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

export type TmplFn = (...args: any[]) => Template;

/**
 * 属性定义
 */
export enum EnterPointType {
    ATTR = "attr", //属性，文本内容，可以内嵌多插值
    PROP = "prop", //参数，智能内嵌一个插值
    TEXT = "text",
    CLASS = "class",
    STYLE = "style",
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
     * 参数类型
     */
    type: Constructor<any> | Array<Constructor<any>>,
    /**
     * 是否必填，默认false
     */
    required?: boolean,
    /**
     * 是否可以修改属性，默认false
     */
    sync?: boolean
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
     * 设置属性getter，可以通过 get 函数方式设置
     * @returns 
     */
    getter?: () => any,
    /**
     * 设置属性setter，可以通过 set 函数方式设置
     * @returns 
     */
    setter?: (v: any) => void,
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

export type DirectiveExecutor = (node: Node, newArgs: any[], oldArgs: any[] | undefined, meta?: { renderComponent?: CompElem, slotComponent?: CompElem, varChain?: string[], attrName?: string }) => [DirectiveUpdateTag, Template?] | void

export type DirectiveInstance = [
    symbol,
    Array<any>,// args
    DirectiveExecutor,// executor
    (scopeType: string) => void,// scope checker
    any[] // varChain
]

export enum DirectiveUpdateTag {
    NONE = 'NONE',//框架不处理
    REMOVE = 'REMOVE',//删除指令创建的节点
    REPLACE = 'REPLACE',//删除已有节点后插入
    UPDATE = 'UPDATE',//对比更新
    APPEND = 'APPEND'
}

export type DefaultProps = Partial<{
    //全局默认样式
    css: Array<string | CSSStyleSheet>,
    //全局默认prop
    global: Record<string, any>,
    //组件的默认prop
    [key: string]: Record<string, any>
}>

/**
 * 视图更新点
 */
export class UpdatePoint {
    //在子视图中的平级key
    key: string
    //表达式对应的vars位置
    varIndex: number
    value: any
    //表达式所在节点，可能是元素/文本
    node: WeakRef<Node>;
    //如果在属性中，属性名
    attrName: string
    //属性值模板
    attrTmpl: string
    isText: boolean = false;
    //是否模板
    // isTmpl: boolean = false;
    isDirective: boolean = false;
    //是否组件
    isComponent: boolean = false;
    //是否组件属性
    isProp: boolean = false;
    //是否布尔属性
    isToggleProp: boolean = false;
    //是否被更新，对于 key，event，ref等属性不需要更新，仅用于占位
    isPlaceholder: boolean

    __destroyed = false
    directiveOldValue: Array<any> | null
    children: UpdatePoint[] | null
    parent: UpdatePoint | null

    constructor(varIndex: number, node?: WeakRef<Node>, attrName?: string, attrTmpl?: string) {
        this.varIndex = varIndex
        if (node)
            this.node = node;
        if (attrName)
            this.attrName = attrName;
        if (attrTmpl) {
            this.attrTmpl = attrTmpl
        }
    }

    static createFrom(up: UpdatePoint) {
        let newUp = new UpdatePoint(up.varIndex, up.node!, up.attrName, up.attrTmpl)
        newUp.key = up.key
        newUp.value = up.value
        newUp.isText = up.isText
        newUp.isDirective = up.isDirective
        newUp.isComponent = up.isComponent
        newUp.isProp = up.isProp
        newUp.isToggleProp = up.isToggleProp
        newUp.isPlaceholder = up.isPlaceholder
        return newUp
    }

    destroy(contextComponent?: CompElem<any>) {
        if (this.__destroyed) return;
        this.__destroyed = true
        let node = this.node
        let children = this.children
        let parent = this.parent
        //clean up
        this.node = this.value = this.directiveOldValue = this.children = this.parent = null as any
        if (!node) return
        //sup scope
        let pChildren = parent?.children || contextComponent?.__updateTree
        if (pChildren) {
            // let i = findIndex(pChildren, c => c === this)
            // pChildren[i] = null
            // remove(pChildren, c => c === this)
        }

        // contextComponent?._unregDeps(node.deref()!)

        //sub scopes
        let updatePoints = children
        updatePoints?.forEach((up, i) => {
            up.destroy(contextComponent);
        });

        if (node instanceof CompElem) {
            node.destroy()
        }
        if (contextComponent) {
            DomUtil.clear(node.deref() as Element, contextComponent)
        }

        (node.deref() as any)?.remove()
    }

    insert(up: UpdatePoint) {
        up.parent = this
        if (!this.children) {
            this.children = []
        }
        this.children.push(up)
    }
}