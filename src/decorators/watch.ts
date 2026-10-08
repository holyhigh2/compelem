import { WatchOptions } from "../types";
/**
 * 监控prop/state变量值变化
 * @param source 变量路径支持多级路径
 * @param options 
 * @returns 
 */
export function watch(source: string | string[], options?: WatchOptions): (target: any, name: any) => void {
  return (_target: any, _name: string) => { }
}

