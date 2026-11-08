/**
 * 入场（enter）运行时入口。
 *
 * 与离场共用 `./core` 的队列与结束判定；入场不得在首屏触发，判定见 core
 * 的 `drain`（未连接批次直接落定，等价于 Vue 的 `appear: false` 默认值）。
 */
import type { TransitionSpec } from '../types'

export type EnterSpec = TransitionSpec

export { prepareEnter, cancelEnter } from './core'
