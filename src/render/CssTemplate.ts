
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