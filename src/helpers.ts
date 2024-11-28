import { each, isString, join, kebabCase, map, trim } from "myfx";
/**
 * Css 辅助类
 */
export class CssHelper {
  /**
   * 用于转换style对象为标准style字符串，会自动转换对象key为短横线格式
   * @param styles 样式对象
   * @returns 
   */
  static getCssText(styles: Record<string, string> | string) {
    if (isString(styles)) return styles
    return join(map(styles, (v, k: string) => kebabCase(k) + ":" + v), ';')
  }

  /**
   * 设置样式
   * @param styles 样式字符串或样式对象
   * @param node HTML元素
   * @returns 每个样式的旧值map
   */
  static setStyle(styles: Record<string, string> | string, node: HTMLElement) {
    if (isString(styles) && !trim(styles)) return {}
    let css = CssHelper.getCssText(styles)
    let oldValueMap: Record<string, string> = {}
    each(css.split(';'), prop => {
      let kv = prop.split(':')
      let k = trim(kv[0])
      let v = trim(kv[1])
      oldValueMap[k] = node.style.getPropertyValue(k)
      node.style.setProperty(k, v)
    })
    return oldValueMap
  }
}