import { concat } from "myfx";

/**
 * 样式模板
 * @author holyhigh2
 */
export class CssTemplate {
    strings: Array<string>;
    vars: Array<any>;
    deps: Array<string> | undefined
    constructor(strings: Array<string>, vars: Array<any>, deps?: Array<string>) {
        this.strings = concat(strings)
        this.vars = vars
        this.deps = deps
    }

    getCss() {
        let str = '';
        this.strings.forEach((s, i) => {
            str = str + s + (this.vars[i] ?? '')
        });
        return str
    }

    destroy() {
        this.strings = this.vars = null as any
    }
}