import { each, isPlainObject } from "myfx";
import { directive } from "../directive/index";
import { EnterPointType } from "../types";
const ClassLastMap = new WeakMap()

function normalizeClass(val: Record<string, boolean> | string | Array<Record<string, boolean> | string>) {
  if (typeof val === 'string') {
    return val.trim();
  }

  if (isPlainObject(val)) {
    let result = '';
    each(val, (v, k) => {
      if (v)
        result += (result ? ' ' : '') + k;
    })
    return result;
  }

  if (Array.isArray(val)) {
    let result = '';
    each(val, v => {
      const normalized = normalizeClass(v);
      if (normalized) {
        result += (result ? ' ' : '') + normalized;
      }
    })
    return result;
  }

  return '';
}

/**
 * 根据变量内容自动插入class，与静态class自动合并
 * @param styles 对象/数组/字符串
 */
export const classes = directive(function Classes(clazz: Record<string, boolean | string> | Array<string> | string) {
  return (pointNode: Node, [clazz]: [Record<string, boolean> | Array<string> | string], oldArgs: any[] | undefined) => {
    const el = pointNode as Element
    const newClass = normalizeClass(clazz);
    const oldClass = ClassLastMap.get(el) ?? '';

    if (oldClass) {
      el.classList.remove(...oldClass.split(' ').filter(Boolean));
    }
    if (newClass) {
      el.classList.add(...newClass.split(' ').filter(Boolean));
      ClassLastMap.set(el, newClass)
    }
  }
}, [EnterPointType.TAG])