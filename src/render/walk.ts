/** 占位符文本节点 */
const SPLIT_TAG_TEST = new RegExp('⟬Ċ⟭\\d+')
/** 占位符文本节点 */
const SPLIT_TAG_SCAN = new RegExp('⟬Ċ⟭(\\d+)', 'g')

/**
 * nodeType 常量（ELEMENT_NODE=1 / TEXT_NODE=3）。
 */
const ELEMENT_NODE = 1
const TEXT_NODE = 3

/**
 * 文档序遍历 `f` 的后代，把节点按顺序收集进 `nodes`
 */
export function walkSplitText(f: Node, nodes: Node[]): void {
  const arr: Node[] = []
  for (let i = 0; i < f.childNodes.length; i++) arr.push(f.childNodes[i])
  for (let i = 0; i < arr.length; i++) {
    const c = arr[i]
    if (c.nodeType === ELEMENT_NODE) {
      nodes.push(c)
      walkSplitText(c, nodes)
    } else if (c.nodeType === TEXT_NODE) {
      const data = (c as Text).data
      if (SPLIT_TAG_TEST.test(data)) {
        const s0 = data.trim()
        const only = /^⟬Ċ⟭\d+$/.exec(s0)
        if (only) {
          //快路径
          (c as Text).data = ''
          nodes.push(c)
          continue
        }
        const s = s0
        let m: RegExpExecArray | null
        let last = 0
        const segs: Text[] = []
        SPLIT_TAG_SCAN.lastIndex = 0
        while ((m = SPLIT_TAG_SCAN.exec(s))) {
          if (m.index > last) {
            const st = s.slice(last, m.index).trim()
            if (st) segs.push(document.createTextNode(st))
          }
          segs.push(document.createTextNode(''))
          last = m.index + m[0].length
        }
        if (last < s.length) {
          const st = s.slice(last).trim()
          if (st) segs.push(document.createTextNode(st))
        }
        for (let k = 0; k < segs.length; k++) {
          c.parentNode!.insertBefore(segs[k], c)
          nodes.push(segs[k])
        }
        c.parentNode!.removeChild(c)
      } else {
        nodes.push(c)
      }
    }
  }
}
