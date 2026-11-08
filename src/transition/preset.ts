import { css } from '../render/render'

/**
 * 结构指令过渡的类契约（P1 运行时消费）。
 *
 * 命名与 Vue 对齐，降低迁移成本：
 *   `${prefix}-enter-from` / `-enter-active` / `-enter-to`
 *   `${prefix}-leave-from` / `-leave-active` / `-leave-to`
 *
 * `prefix` 由 `transition="fade"` 决定 → `ce-fade`；缺省为 `ce`。
 *
 * 以 `css` 模板导出（`CssTemplate`），和 `?tmpl` 导入的样式走同一条路径：
 * 可以直接放进静态 `css` getter，也可以交给 `setDefaults`：
 *
 * ```ts
 * setDefaults({ css: [TRANSITION_CSS] })
 * ```
 *
 * 这份样式**不会自动注入**：结构指令的 DOM 位于组件 shadow root 内，
 * document 层的样式对它无效，必须显式给到组件。
 */
export const TRANSITION_CSS = css`
.ce-enter-from,.ce-leave-to{opacity:0}
.ce-enter-active,.ce-leave-active{transition:opacity 180ms cubic-bezier(.4,0,.2,1)}

.ce-fade-enter-from,.ce-fade-leave-to{opacity:0}
.ce-fade-enter-active,.ce-fade-leave-active{transition:opacity 180ms cubic-bezier(.4,0,.2,1)}

.ce-slide-up-enter-from,.ce-slide-up-leave-to{opacity:0;transform:translateY(12px)}
.ce-slide-up-enter-active,.ce-slide-up-leave-active{transition:opacity 180ms cubic-bezier(.4,0,.2,1),transform 180ms cubic-bezier(.4,0,.2,1)}

.ce-slide-down-enter-from,.ce-slide-down-leave-to{opacity:0;transform:translateY(-12px)}
.ce-slide-down-enter-active,.ce-slide-down-leave-active{transition:opacity 180ms cubic-bezier(.4,0,.2,1),transform 180ms cubic-bezier(.4,0,.2,1)}

.ce-scale-enter-from,.ce-scale-leave-to{opacity:0;transform:scale(.96)}
.ce-scale-enter-active,.ce-scale-leave-active{transition:opacity 180ms cubic-bezier(.4,0,.2,1),transform 180ms cubic-bezier(.4,0,.2,1)}
`
