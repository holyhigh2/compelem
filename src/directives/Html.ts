import { isBlank, isElement, isNil } from "myfx";
import { CompElem } from "../CompElem";
import { directive } from "../directive/index";
import { convertHTML } from "../render/render";
import { EnterPointType } from "../types";
import { DomUtil } from "../utils";

let compiler = document.createElement('template')
let startNodeMap = new WeakMap()
/**
 * 向元素/文本中插入指定HTML内容
 * 注意，应用该指令的元素内部不应再出现表达式，否则会导致异常显示
 * @param htmlStr html内容
 */
export const html = directive(function Html(htmlStr?: string) {
  return (pointNode: Node, newArgs: any[], oldArgs: any[] | undefined, { renderComponent }: { renderComponent: CompElem }) => {
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