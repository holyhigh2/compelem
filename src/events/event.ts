import { debounce, find, map, once, remove, size, throttle } from "myfx";
import { CompElem } from "../CompElem";
import { addExtEvent, isExtEvent } from "./extends";

const MODI_EV_DEBOUNCE = /,|^(debounce:.+)|(debounce$)/;
const MODI_EV_THROTTLE = /,|^(throttle:.+)|(throttle$)/;
const MODI_EV_SELF = 'self';
const MODI_EV_STOP = 'stop';
const MODI_EV_PREVENT = 'prevent';
const MODI_EV_ONCE = 'once';
const MODI_EV_CAPTURE = 'capture';
const MODI_EV_PASSIVE = 'passive';
const MODI_EV_MOUSE_LEFT = 'left';
const MODI_EV_MOUSE_RIGHT = 'right';
const MODI_EV_MOUSE_MIDDLE = 'middle';
const MODI_EV_KEYBOARD_COMBO_CTRL = 'ctrl';
const MODI_EV_KEYBOARD_COMBO_ALT = 'alt';
const MODI_EV_KEYBOARD_COMBO_SHIFT = 'shift';
const MODI_EV_KEYBOARD_COMBO_META = 'meta';
const MODI_EV_KEYBOARD_KEY_MAP: Record<string, any> = {
  'esc': 'escape'
};
const MODI_PARAM_DIVIDER = ":";

/*************************************************************
 * 事件修饰符
 * @author holyhigh2
 * 
 * 全部通用 debounce/once/throttle/capture/passive 可组合
 * 原生通用 stop/prevent/self 可组合
 * 鼠标 left/right/middle 不可组合
 * 键盘 ctrl/alt/shift/meta 可组合 esc/letters... 不可组合,多个key并列式表示可选
 * 
 * 部分修饰符支持参数，使用冒号传参如：throttle:100 / debounce:100
 *************************************************************/

export type EvHadler = (ev: Event) => any
export function addEvent(fullName: string, cbk: EvHadler, node: Element, component: CompElem) {
  let parts = fullName.split('.');
  let evName = parts.shift()!;
  let isOnce = parts.includes(MODI_EV_ONCE);
  let c = cbk;
  let modi
  if (modi = find(parts, x => MODI_EV_DEBOUNCE.test(x))) {
    let params = modi.split(MODI_PARAM_DIVIDER)
    c = debounce(c, parseInt(params[1]) || 100)
  }
  if (modi = find(parts, x => MODI_EV_THROTTLE.test(x))) {
    let params = modi.split(MODI_PARAM_DIVIDER)
    c = throttle(c, parseInt(params[1]) || 100)
  }
  if (isOnce) {
    c = once(c)
  }

  if (isExtEvent(evName)) {
    addExtEvent(evName, node, c, parts)
    return c;
  }

  let listener = (e: Event) => {
    if (parts.includes(MODI_EV_PREVENT)) e.preventDefault();
    if (parts.includes(MODI_EV_STOP)) e.stopPropagation();
    if (parts.includes(MODI_EV_SELF) && e.target !== e.currentTarget) return;

    if (e instanceof MouseEvent) {
      if (parts.includes(MODI_EV_MOUSE_LEFT) && e.button != 0) return;
      if (parts.includes(MODI_EV_MOUSE_RIGHT) && e.button != 2) return;
      if (parts.includes(MODI_EV_MOUSE_MIDDLE) && e.button != 1) return;
    } else if (e instanceof KeyboardEvent) {
      if (remove(parts, p => p == MODI_EV_KEYBOARD_COMBO_CTRL)[0] && !e.ctrlKey) return;
      if (remove(parts, p => p == MODI_EV_KEYBOARD_COMBO_ALT)[0] && !e.altKey) return;
      if (remove(parts, p => p == MODI_EV_KEYBOARD_COMBO_SHIFT)[0] && !e.shiftKey) return;
      if (remove(parts, p => p == MODI_EV_KEYBOARD_COMBO_META)[0] && !e.metaKey) return;

      let checkKeys = map(parts, k => MODI_EV_KEYBOARD_KEY_MAP[k] || k)
      if (size(checkKeys) > 0 && !checkKeys.includes(e.key.toLowerCase())) return;
    }
    c(e)
  }
  let capture = parts.includes(MODI_EV_CAPTURE) || false
  let passive = parts.includes(MODI_EV_PASSIVE) || false
  let options = { capture, passive }
  node.addEventListener(evName, listener, options)

  //record
  let evAry = component.__events[evName]
  if (!evAry) evAry = component.__events[evName] = []
  evAry.push([node, listener, options])

  return listener;
}
