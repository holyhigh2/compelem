import { UpdatePointMeta } from "./UpdatePointMeta";

/**
 * 视图模板元信息
 * @author holyhigh2
 */
export class TemplateMeta {
    fragment!: DocumentFragment
    emptyEvents!: Record<number, string[]>
    upmMap!: Record<number, UpdatePointMeta[]>
    /**
     * 保存升序排列的更新点 nodeSn数组
     */
    updateSns?: number[]
    updatePaths?: number[][]
}