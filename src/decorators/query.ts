/**
 * 缓存策略
 */
export enum QueryCache {
  ONCE = 'once',//仅缓存一次（首次查询到结果时）
}

/**
 * css查询装饰器
 * @example
 *  @query('l-popup', QueryCache.ONCE)
 */
export function query(selector: string, cache?: QueryCache): (target: any, propertyKey: any) => void;
export function query(...args: any[]): any {
  // Implemented by the compiler
  return (_target: any, _propertyKey: any) => { }
}

/**
 * css查询装饰器（querySelectorAll，返回 NodeList）
 * @example
 *  @queryAll('.item')
 */
export function queryAll(selector: string): (target: any, propertyKey: any) => void;
export function queryAll(...args: any[]): any {
  // Implemented by the compiler
  return (_target: any, _propertyKey: any) => { }
}
