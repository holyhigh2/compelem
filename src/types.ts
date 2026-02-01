/**
 * @author holyhigh2
 */
import { CompElem } from "./CompElem";
import { EnterPoint } from "./directive";
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

export type DirectiveExecutor = (point: EnterPoint, newArgs: any[], oldArgs: any[] | undefined, meta?: { renderComponent?: CompElem, slotComponent?: CompElem, varChain?: string[][] }) => [DirectiveUpdateTag, Template?] | void

export type DirectiveInstance = [
    symbol,
    Array<any>,// args
    DirectiveExecutor,// executor
    (scopeType: string) => void,// scope checker
    any[][] // varChain
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
    node: Node | null;
    //如果在属性中，属性名
    attrName: string
    //属性值模板
    attrTmpl: string
    isText: boolean = false;
    //是否模板
    // isTmpl: boolean = false;
    isDirective: boolean = false;
    //如果是文本位置，与node一起构成插入范围
    textNode: Node;
    //是否组件
    isComponent: boolean = false;
    //是否组件属性
    isProp: boolean = false;
    //是否布尔属性
    isToggleProp: boolean = false;
    //是否被更新，对于 key，event，ref等属性不需要更新，仅用于占位
    notUpdated: boolean

    __destroyed = false
    directiveOldValue: Array<any> | null
    children: UpdatePoint[] | null
    parent: UpdatePoint | null

    constructor(varIndex: number, node: Node, attrName?: string, attrTmpl?: string) {
        this.varIndex = varIndex
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
        newUp.notUpdated = up.notUpdated
        return newUp
    }

    insert(up: UpdatePoint) {
        up.parent = this
        if (!this.children) {
            this.children = []
        }
        this.children.push(up)
    }
}

export const PATH_SEPARATOR = '-'