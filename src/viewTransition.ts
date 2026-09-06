/**
 * View Transitions API 封装：在浏览器支持的环境下返回过渡的 finished Promise，
 * 可用 ::view-transition-old(root) / ::view-transition-new(root) CSS 控制过渡效果。
 * 不支持时（如Firefox）降级为直接执行回调。
 *
 * 适合整页级路由切换：
 * @example
 * startViewTransition(() => { location.href = '#/next' })
 */
export function startViewTransition(callback: () => void | Promise<void>): Promise<void> | undefined {
  const doc: any = typeof document !== 'undefined' ? document : undefined
  if (typeof doc?.startViewTransition === 'function') {
    const vt = doc.startViewTransition(() => Promise.resolve(callback()))
    return vt.finished
  }
  callback()
  return undefined
}
