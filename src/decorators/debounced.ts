/**
 * 定义防抖函数。
 * 同时会创建一个以 `_$__` 结尾的非防抖版本。
 *
 * @example
 *  @debounced(50, true)
 *
 * @param wait 抖动间隔，单位ms
 * @param immediate 立即执行
 */
export function debounced(wait: number, immediate: boolean = false): MethodDecorator {
  return () => {
    // Implemented by the compiler
  }
}
