/**
 * 视图模板
 * @author holyhigh2
 */
export class Template {
    strings: Array<string>;
    vars: Array<any>;
    constructor(strings: Array<string>, vars: Array<any>) {
        this.strings = strings as Array<string>
        this.vars = vars
    }
}