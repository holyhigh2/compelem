import { concat } from "myfx";
import { CompElem } from "../CompElem";

/**
 * 样式模板
 * @author holyhigh2
 */
export class CssTemplate {
    strings: Array<string>;
    vars: Array<any>;
    constructor(strings: Array<string>, vars: Array<any>) {
        this.strings = concat(strings)
        this.vars = vars
    }

    getCss(comp: CompElem<any>) {
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