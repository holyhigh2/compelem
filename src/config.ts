import { each, flatMap, isString } from "myfx"
import { CssScopeCacheMap } from "./constants"
import { Csscope } from "./decorators/csscope"
import { CssTemplate, sheetOfCssTemplate } from "./render/CssTemplate"
import type { DefaultProps } from "./types"

//全局/组件默认属性
let DefaultCss: CSSStyleSheet[] = []
let DefaultComponentProps: Record<string, Record<string, any>> = {}

/**
 * 设置全局/组件默认属性
 * @param options
 */
export function setDefaults(options: DefaultProps) {
  DefaultCss = flatMap<CssTemplate | string | CSSStyleSheet, CSSStyleSheet>(options.css!, c => {
    if (c instanceof CssTemplate) {
      return sheetOfCssTemplate(c)
    } else if (isString(c)) {
      let sheet = new CSSStyleSheet();
      sheet.replaceSync(c)
      return sheet
    } else if (c instanceof CSSStyleSheet) {
      return c
    }
    return []
  })

  each(options, (v, k) => {
    if (k !== 'css' && k !== 'global' && k.includes('-')) {
      DefaultComponentProps[k] = v as Record<string, any>
    }
  })

  BaseSheetsCacheMap = new WeakMap()
}

let BaseSheetsCacheMap: WeakMap<Function, CSSStyleSheet[]> = new WeakMap()
export function getBaseSheets(ctor: Function): CSSStyleSheet[] {
  let sheets = BaseSheetsCacheMap.get(ctor)
  if (!sheets) {
    sheets = [...getDefaultCss(), ...(CssScopeCacheMap.get(ctor)?.get(Csscope.INNER) ?? [])]
    BaseSheetsCacheMap.set(ctor, sheets)
  }
  return sheets
}

export const getDefaultCss = (): CSSStyleSheet[] => DefaultCss
export const getDefaultComponentProps = (tag: string): Record<string, any> | undefined => DefaultComponentProps[tag]
