import type { CompElem } from '../CompElem'
import type { UpdatePoint } from './UpdatePoint'

/**
 * 指令更新点的**节点 → UpdatePoint** 反查表（每个组件一份，强 Map）。
 *
 */
export function purgeDirNodeMap(
  comp: CompElem<any>,
  upAry: UpdatePoint[] | undefined,
  nodes?: Node[]
): void {
  const map = (comp as any)?.__dirNodeMap as Map<Node, UpdatePoint | UpdatePoint[]> | undefined
  if (!map) return
  if (nodes !== undefined) {
    for (let i = 0; i < nodes.length; i++) map.delete(nodes[i])
  }
  if (upAry === undefined || upAry.length === 0) return
  const walk = (ups: UpdatePoint[]) => {
    for (let i = 0; i < ups.length; i++) {
      const up = ups[i]
      if (up.node) map.delete(up.node)
      if (up.children) walk(up.children)
    }
  }
  walk(upAry)
}