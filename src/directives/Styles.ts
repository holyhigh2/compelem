import { compact, reduce, reject } from "myfx";
import { CompElem } from "../CompElem";
import { directive } from "../directive/index";
import { CssHelper } from "../helpers";
import { EnterPointType } from "../types";

/**
 * 根据变量内容设置元素样式，仅能用于style属性
 * @param styles 对象/字符串
 */
export const styles = directive(function Styles(...styles: (Record<string, string> | string)[]) {
  return (pointNode: Node, newArgs: any[], oldArgs: any[] | undefined, { renderComponent }: { renderComponent: CompElem }) => {

    let el = pointNode as HTMLElement;

    let cssText = reduce(newArgs, (acc, v) => acc + CssHelper.getCssText(v), '')
    let sKeys = compact(cssText.split(';').map(str => str.split(':')[0]))
    let eKeys = compact(el.style.cssText.split(';'))
    let ePairs = reject(eKeys, (str => sKeys.some(key => str.trim().startsWith(key))))

    el.style.cssText = cssText + ePairs.join(';');
  }
}, [EnterPointType.STYLE])