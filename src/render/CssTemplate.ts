import { CssStyleSheetCacheMap } from "../constants";

/**
 * Css模板
 * @author holyhigh2
 */
export class CssTemplate {
    strings: TemplateStringsArray;
    vars: Array<any>;
    cssText: string | undefined;
    constructor(strings: TemplateStringsArray, vars: Array<any>) {
        this.strings = strings
        this.vars = vars
    }
    getCssText() {
        if (this.cssText) return this.cssText
        let cssText = ''
        let l = this.strings.length - 1;
        for (let i = 0; i <= l; i++) {
            const str = this.strings[i];
            let val = this.vars[i] ?? ''
            if (val instanceof CssTemplate) {
                val = val.getCssText()
            }
            cssText = cssText + str + val;
        }
        this.cssText = cssText
        return cssText
    }
}

/**
 * CssTemplate → 共享的 `CSSStyleSheet`。
 *
 * 按 `strings` 缓存：同一个模板只建一张表，多个组件、多个 shadow root 复用，
 * 不随实例数增长。`css` 标签与 `?tmpl` 导入的模板走同一条路径。
 */
export function sheetOfCssTemplate(tmpl: CssTemplate): CSSStyleSheet {
    let sheet = CssStyleSheetCacheMap.get(tmpl.strings)
    if (sheet) return sheet
    sheet = new CSSStyleSheet()
    sheet.replaceSync(tmpl.getCssText())
    CssStyleSheetCacheMap.set(tmpl.strings, sheet)
    return sheet
}
