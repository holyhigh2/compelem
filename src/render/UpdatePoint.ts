import { closest } from "myfx";
import { CompElem } from "../CompElem";
import type { EffectNode, SignalNode } from "../signal";
import { DomUtil } from "../utils";
import { UpdatePointMeta } from "./UpdatePointMeta";

/**
 * 视图更新点
 */
export class UpdatePoint {
    metaInfo: UpdatePointMeta
    //在子视图中的平级key
    key: string
    //表达式对应的vars位置（子视图平铺后的数字索引，UPDATE重排/updateView时重赋值）
    varIndex: number
    value: any

    //表达式所在节点，可能是元素/文本
    node: Node | null;
    //子视图根元素 map/array
    subViewRootNodes: Record<string, any[]> | any[]

    __destroyed = false
    //已冻结（停止订阅，但 DOM 与 children 仍保留，等待离场动画结束）
    __frozen = false
    children: UpdatePoint[] | null
    parent: UpdatePoint | null

    //指令更新热路径缓存
    private __slotCompResolved = false
    private __slotComp: CompElem<any> | null = null
    //所属子视图id（__anchor__，可能为0，用undefined判断未缓存）
    __subViewId: number | undefined
    //父级子视图key映射（__c-*属性）
    __parentViewsIdMap: Record<string, string> | undefined
    subEffects?: EffectNode[]
    subCells?: Record<string, SignalNode<any>>

    constructor(varIndex: number) {
        this.varIndex = varIndex
    }

    /**
     * 获取更新点所属的slot组件（带缓存）
     */
    getSlotComponent(renderComponent: CompElem<any>): any {
        if (!this.__slotCompResolved) {
            this.__slotCompResolved = true
            if (this.node) {
                let documentFragment = closest(this.node, (n: any) => n.host && n.host instanceof CompElem, 'parentNode')
                if (documentFragment && documentFragment.host !== renderComponent) {
                    this.__slotComp = documentFragment.host
                }
            }
        }
        return this.__slotComp
    }

    static createFrom(upm: UpdatePointMeta) {
        let newUp = new UpdatePoint(upm.varIndex)
        newUp.metaInfo = upm
        return newUp
    }

    /**
     * 冻结：停掉本点的全部订阅（subEffects / subCells），**不动 DOM、不动 children**。
     *
     * 用于「离场动画期间保留 DOM」：冻结后响应式再也写不进这棵子树，
     * 动画结束再由 `destroy()` 收干净。幂等。
     */
    freeze() {
        if (this.__frozen) return
        this.__frozen = true
        const se = this.subEffects
        if (se !== undefined && se.length > 0) {
            for (let i = 0; i < se.length; i++) se[i].dispose()
            se.length = 0
        }
        this.subEffects = undefined
        this.subCells = undefined
        // 嵌套更新点（子结构指令产出）的 effect 挂在自己身上，必须递归冻结
        const kids = this.children
        if (kids) {
            for (let i = 0; i < kids.length; i++) kids[i]?.freeze()
        }
    }

    destroy(contextComponent?: CompElem<any>) {
        if (this.__destroyed) return;
        this.__destroyed = true
        this.freeze()
        let node = this.node
        let children = this.children
        //clean up
        this.node = this.value = this.children = this.parent = this.metaInfo = null as any
        this.__slotComp = null
        this.__parentViewsIdMap = undefined
        this.__subViewId = undefined
        if (!node) return


        //sub scopes
        let updatePoints = children
        updatePoints?.forEach((up, _i) => {
            up.destroy(contextComponent);
        });

        if (node instanceof CompElem) {
            node.destroy()
        }
        if (contextComponent) {
            //文本/注释节点不可能包含子组件，跳过子树扫描
            if (node instanceof Element) DomUtil.clear(node)
        }

        (node as any)?.remove()
    }

    insert(up: UpdatePoint) {
        up.parent = this
        if (!this.children) {
            this.children = []
        }
        this.children.push(up)
    }
}