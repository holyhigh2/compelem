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
    get dynamic() {
        return this.vars.length > 0
    }
}

/**
 * CssTemplate → `CSSStyleSheet`。
 *
 * 静态模板按 `strings` 共享一张表，多个组件、多个 shadow root 复用，不随实例数增长；
 * `css` 标签与 `?tmpl` 导入的静态模板走这条路径。
 */
export function sheetOfCssTemplate(tmpl: CssTemplate): CSSStyleSheet {
    if (tmpl.dynamic) {
        const sheet = new CSSStyleSheet()
        sheet.replaceSync(tmpl.getCssText())
        return sheet
    }
    let sheet = CssStyleSheetCacheMap.get(tmpl.strings)
    if (sheet) return sheet
    sheet = new CSSStyleSheet()
    sheet.replaceSync(tmpl.getCssText())
    CssStyleSheetCacheMap.set(tmpl.strings, sheet)
    return sheet
}
