import { TransitionCfg } from "../types";
/**
 * 视图更新点元数据
 */
export class UpdatePointMeta {
    //表达式对应的vars位置
    varIndex: number
    //如果在属性中，属性名
    attrName!: string
    //属性值模板
    attrTmpl!: string
    //属性值整体即单一插值占位符（如 "⟬Ċ⟭3"），更新时可直接set免replace
    isPureTmpl: boolean = false
    isText: boolean = false;
    isDirective: boolean = false;
    directiveType!: string
    directiveVarChain: string[]
    //是否组件属性
    isProp: boolean = false;
    //仅用于外部框架
    isPropPerfix: boolean = false;
    //是否布尔属性
    isToggleProp: boolean = false;
    //是否被更新，对于 key，event，ref等属性不需要更新，仅用于占位
    isPlaceholder: boolean = false
    isEvent: boolean = false
    isRef: boolean = false
    isKey: boolean = false
    isRefAttr: boolean = false
    //非跟踪属性
    isComponent: boolean = false
    isSlot: boolean = false
    //模板DOM中的节点路径
    nodeSn: number = -1
    slotNodeSn: number = -1
    //<transition>伪标签解析期附着的过渡配置（仅直接子级指令锚点携带）
    transitionCfg?: TransitionCfg

    constructor(varIndex: number) {
        this.varIndex = varIndex
    }
}