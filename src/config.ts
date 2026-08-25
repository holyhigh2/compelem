import { each, flatMap, isString, test } from "myfx"
import { CssScopeCacheMap } from "./constants"
import { Csscope } from "./decorators/csscope"
import type { DefaultProps } from "./types"

//全局/组件默认属性
let DefaultCss: CSSStyleSheet[] = []
let DefaultGlobalProps = {}
let DefaultComponentProps: Record<string, any> = {}

/**
 * 设置全局/组件默认属性
 * @param options
 */
export function setDefaults(options: DefaultProps) {
  DefaultCss = flatMap<string | CSSStyleSheet, CSSStyleSheet>(options.css!, c => {
    if (isString(c)) {
      let sheet = new CSSStyleSheet();
      sheet.replaceSync(c)
      return sheet
    } else if (c instanceof CSSStyleSheet) {
      return c
    }
    return []
  })

  DefaultGlobalProps = options.global!
  each(options, (v, k) => {
    if (test(k[0], /[A-Z]/)) {
      DefaultComponentProps[k] = v
    }
  })

  BaseSheetsCacheMap.clear()
}

const BaseSheetsCacheMap = new Map<Function, CSSStyleSheet[]>()
export function getBaseSheets(ctor: Function): CSSStyleSheet[] {
  let sheets = BaseSheetsCacheMap.get(ctor)
  if (!sheets) {
    sheets = [...getDefaultCss(), ...(CssScopeCacheMap.get(ctor)?.get(Csscope.INNER) ?? [])]
    BaseSheetsCacheMap.set(ctor, sheets)
  }
  return sheets
}

export const getDefaultCss = (): CSSStyleSheet[] => DefaultCss
export const getGlobalDefaultProps = (): Record<string, any> => DefaultGlobalProps
export const getComponentDefaultProps = (): Record<string, any> => DefaultComponentProps
