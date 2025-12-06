import { CompElem } from "../CompElem";
import { EnterPoint, directive } from "../directive/index";
import { CssHelper } from "../helpers";
import { EnterPointType } from "../types";

const StyleMap = new Map()
let StyleSn = 0
/**
 * 根据变量内容自动插入class，仅能用于style属性
 * @param styles 对象/字符串
 */
export const styles = directive(function Styles(styles: Record<string, string> | string) {
  return (point: EnterPoint, newArgs: any[], oldArgs: any[] | undefined, { renderComponent }: { renderComponent: CompElem }) => {

    let el = point.startNode as HTMLElement;

    let styleId = StyleMap.get(el)
    if (!styleId) {
      styleId = 'style_d' + StyleSn++
      StyleMap.set(el, styleId)
    }

    if (renderComponent.isMounted) {
      renderComponent.nextTick(() => {
        CssHelper.setStyle(newArgs[0], el)
      }, styleId)
    } else {
      CssHelper.setStyle(newArgs[0], el)
    }
  }
}, [EnterPointType.STYLE])