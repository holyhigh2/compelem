import { isNil } from "myfx";
import { CompElem } from "../CompElem";
import { EnterPoint, directive } from "../directive/index";
import { convertHTML } from "../render/render";
import { EnterPointType } from "../types";

let compiler = document.createElement('div')
/**
 * 向指定文本位置插入指定HTML内容
 * @param htmlStr html内容
 */
export const htmlC = directive(function HtmlC(htmlStr?: string) {
  return (point: EnterPoint, newArgs: any[], oldArgs: any[] | undefined, { renderComponent, slotComponent }: { renderComponent: CompElem, slotComponent: CompElem }) => {
    if (oldArgs && newArgs[0] == oldArgs[0]) return
    if (isNil(newArgs[0])) return

    compiler.innerHTML = convertHTML(newArgs[0]);
    (point.startNode as HTMLElement).after(...compiler.childNodes)
  };
}, [EnterPointType.TEXT, EnterPointType.SLOT])