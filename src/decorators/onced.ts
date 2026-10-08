/**
 * 定义一次性函数。
 * 同时会创建一个以 `_$__` 结尾的非一次性版本。
 *
 * @example
 *  @onced
 */
export function onced(...args: any[]): any {
  if (args.length >= 2) return
  return () => {
    // Implemented by the compiler
  }
}
