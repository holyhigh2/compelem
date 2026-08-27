import { assign, concat, replaceAll } from "myfx";
import { CompElem } from "../CompElem";
import { PLACEHOLDER } from "../constants";
import { showError } from "../utils";
import { convertHTML, createTemplate } from "./render";
import { Template } from "./Template";
import { UpdatePointMeta } from "./UpdatePointMeta";


const EXP_STR = new RegExp(`([a-z0-9"'${PLACEHOLDER}])\\s*>\\s*<`, 'img')
const EXP_ATTR_CHECK = new RegExp(`[.?-a-z]+\\s*=\\s*(['"])\\s*([^='"]*${PLACEHOLDER}){2,}.*?\\1`, 'ims');
/**
 * 视图模板元信息
 * @author holyhigh2
 */
export class TemplateMeta {
    updatePointMetas!: Array<UpdatePointMeta>
    fragment!: DocumentFragment
    emptyEvents: Record<number, string[]>
    upmMap: Record<number, UpdatePointMeta[]>
    slotNodeMap: Record<number, Node | null>

    constructor(tmpl: Template, component: CompElem<any>, vars?: any[]) {
        let [html, v] = this.parseTemplate(tmpl);
        if (vars) {
            assign(vars, v)
        }
        this.updatePointMetas = []
        this.emptyEvents = {}
        this.fragment = createTemplate(this.updatePointMetas, html, v, component, this.emptyEvents);
        this.upmMap = {}
        this.slotNodeMap = {}
        this.updatePointMetas.forEach((upm, i) => {
            if (!this.upmMap[upm.nodeSn]) this.upmMap[upm.nodeSn] = []
            this.upmMap[upm.nodeSn].push(upm)
            if (upm.slotNodeSn > -1) {
                this.slotNodeMap[upm.slotNodeSn] = null
            }
        })
    }

    parseTemplate(
        tmpl: Template
    ): [string, any[]] {
        let html = "";
        let vars = concat(tmpl.vars)
        let l = tmpl.strings.length - 1;
        let vl = tmpl.vars.length - 1
        let varIndex = 0
        for (let i = 0; i <= l; i++) {
            const str = tmpl.strings[i];
            let val = varIndex < vars.length ? vars[varIndex] : '';

            if (val instanceof Template) {
                let [h, v] = this.parseTemplate(val)
                val = h

                vars.splice(varIndex, 1, ...v)
                varIndex += v.length - 1
            }
            else {
                val = i > vl ? "" : (PLACEHOLDER + varIndex);
            }

            varIndex++
            html = html + str + val;
        }

        if (process.env.DEV) {
            //attr check
            let rs = html.match(EXP_ATTR_CHECK)
            if (rs) {
                let errorMsg = replaceAll(rs![0], PLACEHOLDER, '${...}')
                showError(`Template parse error: attribute value can be set only one interpolation —— \n ${errorMsg}`)
                return ['', vars];
            }
        }

        html = html.replace(EXP_STR, '$1><').trim()

        html = convertHTML(html)

        return [html, vars];
    }
}