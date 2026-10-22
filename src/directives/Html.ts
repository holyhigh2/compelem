import { isBlank, isElement, isNil, isString, kebabCase } from "myfx";
import { DefinitionTagMap } from "../constants";
import { directive } from "../directive/index";
import { EnterPointType } from "../types";
import { DomUtil, showError } from "../utils";

const EXP_TAG_CONVERT = /(<\/?)\s*([A-Z][A-Za-z0-9]*)([\s>])/gm
const EXP_ATTR_CONVERT = /\s+([\.?@*])?((?:[a-zA-Z]*[A-Z][^\s<>="']+))(?=[\s=>])/gm
// 属性值感知：引号内的 > 不算标签结束，匹配不到闭合 > 的残缺片段原样保留
const EXP_TAG_SEGMENT = /<(?:"[^"]*"|'[^']*'|[^"'>])*>/gm
const HAS_UPPER_RE = /[A-Z]/

function convertHTML(html: string) {
  if (!isString(html)) return html + ''
  if (!HAS_UPPER_RE.test(html)) return html
  //attr convert：仅限标签内的属性区，正文文本原样保留
  html = html.replace(EXP_TAG_SEGMENT, (tag: string) => {
    return tag.replace(EXP_ATTR_CONVERT, (a: string, b: string, c: string) => {
      return ` ${b ?? ''}${kebabCase(c)}`
    })
  })
  //tag convert
  html = html.replace(EXP_TAG_CONVERT, (a: string, b: string, c: string, d: string) => {
    let tag = DefinitionTagMap[c]
    if (tag === undefined) {
      if (process.env.DEV) {
        showError(`html - unknown component tag <${c}>, kept as-is`)
      }
      tag = c
    }
    return b + tag + d
  })
  return html
}

let compiler = document.createElement('template')
let startNodeMap = new WeakMap()
/**
 * 向元素/文本中插入指定HTML内容
 * 注意，应用该指令的元素内部不应再出现表达式，否则会导致异常显示
 * @param htmlStr html内容
 */
export const html = directive(function Html(htmlStr?: string) {
  return (pointNode: Node, newArgs: any[], oldArgs: any[] | undefined) => {
    if (oldArgs && newArgs[0] == oldArgs[0]) return
    if (isNil(newArgs[0])) return

    if (isElement(pointNode)) {
      (pointNode).innerHTML = convertHTML(newArgs[0])
    } else {
      let startNode = startNodeMap.get(pointNode)
      if (!startNode) {
        startNode = document.createTextNode('')
        pointNode.parentNode?.insertBefore(startNode, pointNode)
        startNodeMap.set(pointNode, startNode)
      }
      compiler.innerHTML = convertHTML(newArgs[0]);
      if (!isBlank(oldArgs)) {
        DomUtil.remove(startNode, pointNode)
      }
      (pointNode as HTMLElement).before(compiler.content.cloneNode(true))
    }
  };
}, [EnterPointType.TAG, EnterPointType.TEXT, EnterPointType.SLOT])