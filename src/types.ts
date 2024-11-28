/**
 * @author holyhigh2
 */

import { Template } from "./render/render";
export type Constructor<T> = new (...args: any[]) => T;
export type Getter = () => any;

/**
 * 插槽配置对象
 */
export type SlotOptions = {
    filter: Record<string, any> | Function,
    props: Record<string, any>,
    hook: Function
}

export type TmplFn = (...args: any[]) => Template;

export enum DirectiveUpdateTag {
    NONE = 'NONE',//框架不处理
    REMOVE = 'REMOVE',//删除指令创建的节点
    REPLACE = 'REPLACE',//删除已有节点后插入
    UPDATE = 'UPDATE',//对比更新
    APPEND = 'APPEND'
}

/**
 * 模板中的表达式位置
 */
export class ExpPos {
    //表达式位置，多层使用-分割
    index: string
    value: any
    isText: boolean = false;
    //是否模板
    isTmpl: boolean = false;
    isDirective: boolean = false;
    //表达式所在节点，可能是元素/文本
    node: Node;
    //如果是文本位置，与node一起构成插入范围
    textNode: Node;
    //是否组件
    isComponent: boolean = false;
    //如果在属性中，属性名
    attrName: string
    //属性值模板
    attrTmpl: string
    //是否组件属性
    isProp: boolean = false;
    //是否布尔属性
    isToggleProp: boolean = false;
    //是否事件
    isEvent: boolean;

    constructor(varIndex: string | number, node: Node, attrName?: string, attrTmpl?: string) {
        this.index = varIndex + '';
        this.node = node;
        if (attrName)
            this.attrName = attrName;
        if (attrTmpl) {
            this.attrTmpl = attrTmpl
        }
    }
}