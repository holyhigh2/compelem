import { each } from "myfx";
import { CompElem } from "../CompElem";
import { UpdatePoint } from "./UpdatePoint";

/**
 * 真正执行节点移除 + 更新点销毁。
 *
 * 与动画无关，是 `for` / `if` / `when` 等结构指令删除子项的**必经路径**，
 * 独立成模块放在 render 层。
 */
export function commitRemove(nodes: Node[], ups: UpdatePoint[], component?: CompElem) {
    each(nodes, (n: any) => {
        (n as CharacterData | Element).remove()
        if (n instanceof CompElem) {
            n.destroy()
        }
    })
    each(ups, up => up.destroy(component))
}
