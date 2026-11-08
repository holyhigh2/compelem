import { each } from "myfx";
import { CompElem } from "../CompElem";
import { LeaveSpec, runLeave, stripViewKeyMarkers } from "../transition/leave";
import { UpdatePoint } from "./UpdatePoint";
import { purgeDirNodeMap } from "./dir-node-map";
import { freezeSubComponents } from "../utils";

/**
 * 真正执行节点移除 + 更新点销毁。
 *
 * 与动画无关时是 `for` / `if` / `when` 等结构指令删除子项的**必经路径**，
 * 独立成模块放在 render 层。
 *
 * 传入 `leave` 时改为「冻结 → 保留 DOM → 跑离场 → 落定」：
 * - 冻结走 `UpdatePoint.freeze()`，响应式再也写不进离场子树；
 * - 期间摘掉 `__c-*` 标记，避免同 key 重插时被旧节点认领；
 * - `finalize` 才 `remove()` + `destroy()`，语义与不传 `leave` 时完全一致。
 *
 * `index` 透传给 `runLeave` 写进 `--ce-i`（`forEach` 传本批第几个），
 * 其余调用方不传，离场按批内下标编号。
 */
export function commitRemove(nodes: Node[], ups: UpdatePoint[], component?: CompElem, leave?: LeaveSpec | null, index?: number) {
    if (component) purgeDirNodeMap(component, ups, nodes)

    if (leave && nodes.length > 0) {
        each(ups, (up: UpdatePoint) => up.freeze())
        // 子树里的子组件（含 shadow 内嵌套的）同样先冻结：
        // 它们的 effect 记在自己实例上，父级 __freeze() 碰不到
        each(nodes, (n: any) => freezeSubComponents(n))
        stripViewKeyMarkers(nodes)
        runLeave(nodes, leave, () => finalizeRemove(nodes, ups, component), index)
        return
    }

    finalizeRemove(nodes, ups, component)
}

function finalizeRemove(nodes: Node[], ups: UpdatePoint[], component?: CompElem) {
    each(nodes, (n: any) => {
        (n as CharacterData | Element).remove()
        if (n instanceof CompElem) {
            n.destroy()
        }
    })
    each(ups, up => up.destroy(component))
}
