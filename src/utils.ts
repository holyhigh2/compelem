import { toPath } from "myfx";

export function showError(msg: string): void {
  console.error(`[CompElem]`, msg);
}

export function showTagError(tagName: string, msg: string): void {
  console.error(`[CompElem <${tagName}>]`, msg);
}

export function showWarn(...args: unknown[]): void {
  console.warn(`[CompElem]`, ...args);
}
export function showTagWarn(tagName: string, msg: string): void {
  console.warn(`[CompElem <${tagName}>]`, msg);
}
//为依赖收集提供标准地址
export function toUpdatePath(varPath: string[]) {
  return toPath(varPath).join("-");
}