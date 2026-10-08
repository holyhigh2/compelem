/**
 * 定义节流函数。
 * 同时会创建一个以 `_$__` 结尾的非节流版本。
 *
 * @example
 *  @throttled(50)
 *
 * @param wait 节流间隔，单位ms
 *
 */
export function throttled(wait: number): MethodDecorator {
  return () => {
    // Implemented by the compiler
  }
}
