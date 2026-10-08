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
    directiveVarChain: string[] = []
    //是否组件属性
    isProp: boolean = false;
    //仅用于外部框架
    isPropPerfix: boolean = false;
    //是否布尔属性
    isToggleProp: boolean = false;
    //是否被更新，对于 key，event，ref等属性不需要更新，仅用于占位
    ux = -1
    isPlaceholder: boolean = false
    isEvent: boolean = false
    isRef: boolean = false
    isRefAttr: boolean = false
    //模板DOM中的节点路径
    nodeSn: number = -1
    slotNodeSn: number = -1

    constructor(varIndex: number) {
        this.varIndex = varIndex
    }
}
const EMPTY_VAR_CHAIN: string[] = []

/**
 * 解析指令的 varChain
 */
export function resolveVarChain(upm: UpdatePointMeta | undefined): string[] {
    const m = upm?.directiveVarChain
    if (m && m.length) return m
    return EMPTY_VAR_CHAIN
}
