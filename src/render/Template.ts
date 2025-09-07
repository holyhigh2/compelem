import { concat, each, isEmpty, last, reduce, toString } from "myfx";
import { CompElem } from "../CompElem";
import { EXP_KEY } from "../constants";
import { buildHTML, buildTmplate } from "./render";

/**
 * 视图模板
 * @author holyhigh2
 */
export class Template {
    strings: Array<string>;
    vars: Array<any>;
    constructor(strings: Array<string>, vars: Array<any>) {
        this.strings = concat(strings)
        this.vars = vars
    }
    //解析模板中的key
    getKey() {
        let vars = this.vars
        let k = ''
        each(this.strings, (str, i) => {
            if (EXP_KEY.test(str)) {
                k = toString(vars[i])
                return false
            }
        })
        return k
    }
    getKeys() {
        let vars = this.vars
        let ks: string[] = []
        for (let i = 0; i < this.strings.length; i++) {
            const str = this.strings[i];
            if (EXP_KEY.test(str)) {
                let k = toString(vars[i])
                ks.push(k)
            }
        }
        if (isEmpty(ks)) {
            vars.forEach(v => {
                if (v instanceof Template) {
                    let k = v.getKey()
                    ks.push(k)
                }
            })
        }
        return ks
    }
    /**
   * 追加tmpl
   * 交接处模板进行合并
   * @param tmpl
   */
    append(tmpl: Template) {
        let lastStr = last(this.strings);

        tmpl.strings.forEach((str, i) => {
            if (i == 0) {
                this.strings[this.strings.length - 1] = lastStr + str;
                return;
            }
            this.strings.push(str);
        });
        this.vars = concat(this.vars, tmpl.vars);
        return this;
    }
    /**
     * 指定位置插入模板
     * @param position 字符模板位置
     * @param tmpl 
     * @returns 
     */
    insert(position: number, tmpl: Template) {
        let firstStr = tmpl.strings.shift()
        this.strings[position] += firstStr
        this.strings.splice(position + 1, 0, ...tmpl.strings)

        this.vars.splice(position, 0, ...tmpl.vars)
        return this;
    }
    getHTML(comp: CompElem) {
        let [html, vars] = buildHTML(comp, this);
        let nodes = buildTmplate([], html, vars, comp);
        return reduce(nodes, (a, v: HTMLElement) => a + (v.outerHTML ?? ''), '')
    }
}