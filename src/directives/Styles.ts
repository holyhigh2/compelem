import { each, isEmpty, isNumber, isNumeric, isObject, isString, kebabCase } from "myfx";
import { directive } from "../directive/index";
import { EnterPointType, StyleValueObjectType, StyleValueType } from "../types";

const KeyCache = new Map();
const OldKeys = new WeakMap<Node, Set<string>>();

const LENGTH_PROPS = new Set([
  // size
  'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height',
  // padding & margin
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  // border
  'border-width', 'border-radius', 'outline-width', 'outline-offset',
  // position
  'top', 'right', 'bottom', 'left',
  'inset', 'inset-block', 'inset-inline', 'inset-block-start', 'inset-block-end',
  'inset-inline-start', 'inset-inline-end',
  // font
  'font-size', 'letter-spacing', 'word-spacing', 'text-indent',
  // layout
  'gap', 'row-gap', 'column-gap',
  'grid-gap', 'grid-row-gap', 'grid-column-gap',
]);

function parseValue(sv: StyleValueType): StyleValueObjectType | undefined {
  if (isEmpty(sv)) return undefined
  let rs: StyleValueObjectType = { value: '' }
  if (isObject(sv)) {
    rs = sv
  } else if (isString(sv) || isNumber(sv)) {
    rs.value = sv
    rs.important = false
  } else {
    return undefined
  }
  return rs
}

function normalizeStyle(val: Record<string, string> | string | Array<Record<string, string> | string>) {
  let rs: Record<string, StyleValueObjectType> = {};
  if (isString(val)) {
    const trimmed = val.trim();
    if (trimmed) {
      trimmed.split(';').filter(rule => rule.trim()).forEach(rule => {
        const colonIndex = rule.indexOf(':');
        if (colonIndex > 0) {
          const key = rule.slice(0, colonIndex).trim();
          const val = rule.slice(colonIndex + 1).trim();
          let pv = parseValue(val);
          if (pv)
            rs[key] = pv;
        }
      });
    }
    return rs;
  }

  let tmp: Record<string, any> = {}
  if (Array.isArray(val)) {
    for (const item of val) {
      const normalizedItem = normalizeStyle(item);
      Object.assign(tmp, normalizedItem);
    }
  } else if (isObject(val)) {
    tmp = val;
  }

  each(tmp, (v, k) => {
    let nk = normalizeKey(k)
    let nv = parseValue(v)
    if (!nv) return

    if (LENGTH_PROPS.has(nk) && !nk.startsWith('--') && isNumeric(nv.value)) {
      nv.value = nv.value + 'px';
    }
    rs[nk] = nv
  })

  return rs;
}

function normalizeKey(key: string) {
  if (key.startsWith('--')) {
    return key;
  }
  if (KeyCache.has(key)) {
    return KeyCache.get(key);
  }

  const result = kebabCase(key)
  KeyCache.set(key, result);
  return result;
}
/**
 * 根据变量内容设置元素样式
 * @param styles 对象/字符串
 */
export const styles = directive(function Styles(style: Record<string, string> | string | Array<Record<string, string> | string>) {
  return (pointNode: Node, newArgs: any[], oldArgs: any[] | undefined) => {
    let el = pointNode as HTMLElement;

    const styleObj = normalizeStyle(newArgs[0]);

    const newKeys = new Set(Object.keys(styleObj));
    const oldkeys = OldKeys.get(el)!

    each(oldkeys, (v: string) => {
      if (!newKeys.has(v)) {
        el.style.removeProperty(v)
      }
    })
    each(styleObj, (v, k: string) => {
      el.style.setProperty(k, v.value + '', v.important ? 'important' : '')
    })
    OldKeys.set(el, newKeys)
  }
}, [EnterPointType.TAG])
