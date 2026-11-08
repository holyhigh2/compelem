import type { StructureTransitionOptions } from '../types'

/** 结构指令末尾实参里与过渡相关的字段 */
export type TransitionOpts = StructureTransitionOptions

const EMPTY: TransitionOpts = {}

function looksLikeSpec(v: any): boolean {
  if (typeof v === 'string') return true
  // 只认普通对象：函数（when 的 cases 值）与数组（cases 元组）一律排除
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

/**
 * 从指令实参里取过渡选项。
 *
 * 位置随指令而异（`ifTrue(cond, tpl, opts)` 在 2、`forEach(v, key, tpl, opts)` 在 3、
 * `ifElse(cond, a, b, opts)` 在 3），故从尾部往前找第一个「带 enter/leave 的普通对象」。
 * 把选项写成函数或数组的指令实参（如 `when` 的 cases）不会被误判。
 */
export function transitionOptsOf(args?: readonly any[] | null): TransitionOpts {
  if (!args) return EMPTY
  for (let i = args.length - 1; i >= 1; i--) {
    const a = args[i]
    if (a === null || typeof a !== 'object' || Array.isArray(a)) continue
    if (looksLikeSpec((a as TransitionOpts).enter) || looksLikeSpec((a as TransitionOpts).leave) || looksLikeSpec((a as TransitionOpts).move)) {
      return a as TransitionOpts
    }
  }
  return EMPTY
}
