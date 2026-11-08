/**
 * 离场（leave）运行时入口。
 *
 * 实现已与入场合并到 `./core`（同一条批量队列、同一次强制重排）；
 * 本模块只保留对外类型名与导出面，供既有 import 继续工作。
 */
import type { TransitionSpec } from '../types'

/** `transition="fade"` 或 `{ name, duration, delay }` */
export type LeaveSpec = TransitionSpec

export {
  LEAVING_ATTR,
  INDEX_VAR,
  nextFrame,
  prefersReducedMotion,
  normalizeSpec,
  transitionInfoOf,
  transitionMsOf,
  whenTransitionEnds,
  stripViewKeyMarkers,
  runLeave,
} from './core'
export type { NormalizedSpec, TransitionInfo } from './core'
