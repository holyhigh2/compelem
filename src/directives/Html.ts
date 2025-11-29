import { isNil } from "myfx";
import { CompElem } from "../CompElem";
import { EnterPoint, directive } from "../directive/index";
import { convertHTML } from "../render/render";
import { EnterPointType } from "../types";

/**
 * 向元素中插入指定HTML内容
 * @param htmlStr html内容
 */
export const htmlD = directive(function HtmlD(htmlStr?: string) {
  return (point: EnterPoint, newArgs: any[], oldArgs: any[] | undefined, { renderComponent, slotComponent }: { renderComponent: CompElem, slotComponent: CompElem }) => {
    if (oldArgs && newArgs[0] == oldArgs[0]) return
    if (isNil(newArgs[0])) return

    (point.startNode as HTMLElement).innerHTML = convertHTML(newArgs[0])
  };
}, [EnterPointType.TAG])