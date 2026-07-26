import { CompElem } from "../CompElem";
import { DomUtil } from "../utils";
import { UpdatePointMeta } from "./UpdatePointMeta";

/**
 * 视图更新点
 */
export class UpdatePoint {
    metaInfo: UpdatePointMeta
    //在子视图中的平级key
    key: string
    //表达式对应的vars位置
    varIndex: number
    value: any
    //表达式所在节点，可能是元素/文本
    node: WeakRef<Node>;
    //子视图根元素 map/array
    subViewRootNodes: Record<string, WeakRef<any>[]> | WeakRef<any>[]

    __destroyed = false
    children: UpdatePoint[] | null
    parent: UpdatePoint | null

    constructor(varIndex: number) {
        this.varIndex = varIndex
    }

    static createFrom(upm: UpdatePointMeta) {
        let newUp = new UpdatePoint(upm.varIndex)
        newUp.metaInfo = upm
        return newUp
    }

    destroy(contextComponent?: CompElem<any>) {
        if (this.__destroyed) return;
        this.__destroyed = true
        let node = this.node
        let children = this.children
        let parent = this.parent
        //clean up
        this.node = this.value = this.children = this.parent = this.metaInfo = null as any
        if (!node) return

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