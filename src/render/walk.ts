import { PLACEHOLDER } from "../constants";

/**
 * nodeType 常量（ELEMENT_NODE=1 / TEXT_NODE=3）。
 */
const ELEMENT_NODE = 1
const TEXT_NODE = 3
const PLACEHOLDER_DIGIT_RE = new RegExp(PLACEHOLDER + "\\d")

/**
 * 文本拆分计划（编译器 emitText 同循环产出，文档序，每个含插值文本节点一条）：
 * 扁平数组里 `[start,end]` 对 = 静态段（相对解析后文本数据的偏移，编译期已 trim），
 * `-1` = 空占位符节点；标量 `-1` = 整段恰为单占位符（复用原节点、data 置空）。
 */
export type TextSplitPlan = (number | number[])[]

/**
 * 文档序遍历 `f` 的后代收集进 `nodes`；含占位符的文本节点按编译期计划原位切片。
 * 语义（trim/分段/空段丢弃）全在编译期，这里只做机械执行。
 *
 * `plan` 缺失只可能来自「旧编译器产物 + 新运行时」（旧产物是两参调用），此时必须
 * 立刻抛出可读错误：否则 `plan[pi++]` 会是 `undefined`，报一个与原因无关的 TypeError。
 */
export function walkSplitText(f: Node, nodes: Node[], plan?: TextSplitPlan): void {
  if (plan === undefined) {
    throw new Error(
      '[compelem] splitPlan missing: artifact compiled by an older @compelem/compiler; rebuild with a matching version',
    )
  }
  let pi = 0
  const visit = (parent: Node): void => {
    const arr: Node[] = []
    for (let i = 0; i < parent.childNodes.length; i++) arr.push(parent.childNodes[i])
    for (let i = 0; i < arr.length; i++) {
      const c = arr[i]
      if (c.nodeType === ELEMENT_NODE) {
        nodes.push(c)
        visit(c)
      } else if (c.nodeType === TEXT_NODE) {
        const data = (c as Text).data
        if (!PLACEHOLDER_DIGIT_RE.test(data)) {
          nodes.push(c)
          continue
        }
        const entry = plan[pi++]
        if (entry === undefined) {
          throw new Error(
            `[compelem] splitPlan entry #${pi} missing: plan/DOM mismatch; rebuild with a matching @compelem/compiler version`,
          )
        }
        if (entry === -1) {
          //快路径：整段恰为单占位符，复用原节点
          (c as Text).data = ''
          nodes.push(c)
          continue
        }
        const segs = entry as number[]
        for (let j = 0; j < segs.length;) {
          let n: Text
          if (segs[j] === -1) {
            n = document.createTextNode('')
            j++
          } else {
            n = document.createTextNode(data.slice(segs[j], segs[j + 1]))
            j += 2
          }
          c.parentNode!.insertBefore(n, c)
          nodes.push(n)
        }
        c.parentNode!.removeChild(c)
      }
    }
  }
  visit(f)
  if (process.env.DEV && pi !== plan.length) {
    throw new Error(
      `[compelem] splitPlan not fully consumed: ${plan.length} entries, ${pi} used; rebuild with a matching @compelem/compiler version`,
    )
  }
}