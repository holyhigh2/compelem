import { compact, concat, each, flatMap, isArray, isMatch, isObject, isString } from "myfx";
import { CompElem } from "../CompElem";
import { EnterPoint, directive } from "../directive/index";
import { EnterPointType } from "../types";
const ClassLastMap = new Map()
/**
 * 根据变量内容自动插入class，仅能用于class属性
 * @param styles 对象/数组/字符串
 */
export const classes = directive(function Classes(clazz: Record<string, boolean | string> | Array<string> | string) {
  return (point: EnterPoint, [clazz]: [Record<string, boolean | string> | Array<string> | string], oldArgs: any[] | undefined, { renderComponent }: { renderComponent: CompElem; }) => {

    let rs: string[] = [];
    if (isArray(clazz)) {
      rs = compact(clazz)
    } else if (isObject(clazz)) {
      rs = flatMap<any, string, string>(clazz, (v, k) => v ? k : [])
    } else if (isString(clazz)) {
      rs = clazz.split(' ')
    }
    if (rs.length < 1 && !oldArgs) return

    let el = point.startNode as HTMLElement

    if (ClassLastMap.get(el) && ClassLastMap.get(el).length === rs.length && isMatch(ClassLastMap.get(el), rs)) return

    let lastCls = ClassLastMap.get(el)
    each(lastCls, (cls: string) => {
      el.classList.remove(cls)
    })
    each(rs, cls => {
      el.classList.add(cls)
    })

    lastCls = concat(rs);
    ClassLastMap.set(el, lastCls)
  }
}, [EnterPointType.CLASS])