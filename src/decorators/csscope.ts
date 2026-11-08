import { each, isArray } from "myfx";
import { CssScopeCacheMap } from "../constants";
import { CssTemplate, sheetOfCssTemplate } from "../render/CssTemplate";

/**
 * 样式应用区域范围
 */
export enum Csscope {
  INNER = 'inner',//组件内样式
  HOST = 'host',//组件宿主样式
  GLOBAL = 'global'//全局样式
}
/**
 * 样式表应用区域注解
 * @param name 自定义组件名称
 * @param immediate 立即注册，默认false
 */
export function csscope(...scopes: string[]): any {
  return (target: any, _name: any, descriptor: PropertyDescriptor) => {
    let getterRs = descriptor.get!()
    let css = isArray(getterRs) ? getterRs : [getterRs]
    css.forEach(cs => {
      let styleSheet: CSSStyleSheet | undefined
      if (cs instanceof CssTemplate) {
        styleSheet = sheetOfCssTemplate(cs)
      } else if (cs instanceof CSSStyleSheet) {
        styleSheet = cs
      }
      if (!styleSheet) return

      let scopeMap = CssScopeCacheMap.get(target)
      if (!scopeMap) {
        scopeMap = new Map()
        CssScopeCacheMap.set(target, scopeMap)
      }
      each(scopes, sc => {
        if (sc === Csscope.GLOBAL) {
          if (!document.adoptedStyleSheets.includes(styleSheet))
            document.adoptedStyleSheets = [...document.adoptedStyleSheets, styleSheet];
          return
        }

        let list = scopeMap.get(sc)
        if (!list) {
          list = []
          scopeMap.set(sc, list)
        }
        list.push(styleSheet)
      })
    })
    return descriptor
  };
}