import { split } from "myfx";
import { CompElem } from "../CompElem";
import { PATH_SEPARATOR } from "../constants";
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
    varIndex: any
    value: any
    //缓存varIndex的路径段（varIndex在子视图移动时会被重赋值，需按值失效）
    private __indexSegs: string[] | null = null
    private __segsFor: any

    //表达式所在节点，可能是元素/文本
    node: WeakRef<Node>;
    //子视图根元素 map/array
    subViewRootNodes: Record<string, WeakRef<any>[]> | WeakRef<any>[]

    __destroyed = false
    children: UpdatePoint[] | null
    parent: UpdatePoint | null

    constructor(varIndex: number) {
        this.varIndex = varIndex
        this.__indexSegs = [String(varIndex)]
        this.__segsFor = varIndex
    }

    getIndexSegs(): string[] {
        if (this.__segsFor !== this.varIndex) {
            this.__segsFor = this.varIndex
            this.__indexSegs = split(String(this.varIndex), PATH_SEPARATOR)
        }
        return this.__indexSegs!
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
        //clean up
        this.node = this.value = this.children = this.parent = this.metaInfo = null as any
        if (!node) return


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