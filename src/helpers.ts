import { isArray, isBoolean, isDefined, isNil, isNull, isObject, isString, join, kebabCase, map, trim } from "myfx";
import { CompElem } from "./CompElem";
import { Constructor, PropOption } from "./types";
import { camelCaseCached, convertValue, getBooleanValue, isBooleanProp, kebabCaseCached, showTagError, typeNameLower } from "./utils";
/**
 * Css 辅助类
 */
export class CssHelper {
  /**
   * 用于转换style对象为标准style字符串，会自动转换对象key为短横线格式
   * @param styles 样式对象
   * @returns 
   */
  static getCssText(styles: Record<string, string> | string, important: boolean = false): string {
    if (isString(styles)) return styles
    return join(map(styles, (v, k: string) => {
      if (k.startsWith('--')) return k + ":" + v + (important ? ' !important' : '')
      return kebabCase(k) + ":" + v + (important ? ' !important' : '')
    }), ';') + ';'
  }

}

export class CompElemHelper {
  //属性值检
  static propTypeCheck(comp: CompElem<any>, propDefs: Record<string, PropOption>, propKey: string, newValue: string | null, hasAttr?: boolean) {
    let propDef = propDefs[propKey]
    if (!propDef) return newValue

    let validator = propDef.isValid
    //类级缓存
    let expectTypeAry = propDef._typeAry
    if (!expectTypeAry) {
      const t = propDef.type ?? Object
      expectTypeAry = propDef._typeAry = isArray<Constructor<any>>(t) ? t : [t]
    }
    let typeConverter = propDef.converter
    let val: any = newValue

    if (isString(val) && !isNull(val)) {
      try {
        val = typeConverter ? typeConverter(val) : convertValue(val, expectTypeAry)
      } catch (error) {
        showTagError(comp.tagName, `Convert attribute '${propKey}' error with ` + val)
      }
    } //endif

    //extra work
    for (let i = 0; i < expectTypeAry.length; i++) {
      const et = expectTypeAry[i];
      if (et.name === 'Boolean' && hasAttr) {
        val = getBooleanValue(val)
      }
    }

    if (isNil(val)) {
      return val
    }

    let realType = typeof val;
    let matched = isDefined(val) ? false : true;
    for (let i = 0; i < expectTypeAry.length; i++) {
      const et = expectTypeAry[i];
      if (
        //base form
        realType === typeNameLower(et) ||
        //object form
        val instanceof et || (Object.prototype.toString.call(val) === Object.prototype.toString.call(et.prototype))
      ) {
        matched = true
        break
      }
    }

    if (!matched) {
      showTagError(
        comp.tagName,
        `Invalid prop '${propKey}'. expected '${expectTypeAry.map(
          (t) => t.name || t
        )}' but got '${realType}'`
      );
    }
    if (validator) {
      if (!validator.call(comp, val, CompElemHelper.snapshotProps(comp, propDefs))) {
        showTagError(
          comp.tagName,
          `Invalid prop '${propKey}'. IsValid() check failed`
        );
      }
    }

    return val;
  }
  /**
   * 按 `__s` 物化一份 props 快照
   *
   */
  static snapshotProps(comp: CompElem<any>, propDefs: Record<string, PropOption> | undefined) {
    const snap: Record<string, any> = {}
    if (propDefs === undefined) return snap
    const sigs = comp.__s
    for (const k in propDefs) {
      const sig = sigs[k]
      if (sig !== undefined) snap[k] = sig.peek()
    }
    return snap
  }
  static updateAttribute(comp: CompElem<any>, propDef: PropOption, key: string, val: string | null) {
    if (val == null || Number.isNaN(val as any)) {
      const k0 = kebabCaseCached(key)
      if (comp.hasAttribute(k0)) comp.removeAttribute(k0)
      return
    }
    let k = kebabCaseCached(key)
    let v = trim(val)
    if (isBooleanProp(propDef.type)) {
      v = getBooleanValue(val)
      if (isBoolean(v)) {
        if (v && !comp.hasAttribute(k)) {
          comp.toggleAttribute(k, true)
        } else if (!v && comp.hasAttribute(k)) {
          comp.toggleAttribute(k, false)
        }
      } else if (comp.getAttribute(k) !== v) {
        comp.setAttribute(k, v)
      }
    } else if (comp.getAttribute(k) !== v) {
      comp.setAttribute(k, v)
    }
  }
  static updatePropOne(comp: CompElem<any>, k: string, v: any, force = false): void {
    const propDefs = comp.__propDefs
    if (!propDefs) return
    if (!comp.__inited) {
      // 未 inited 时 props 表可能尚未建立，交由 updateProps 建表后写入
      comp.updateProps({ [k]: v })
      return
    }
    const ck = camelCaseCached(k)
    const propDef = propDefs[ck]
    if (!propDef) {
      if (comp.props) comp.props[k] = v
      return
    }
    const raw = v
    v = CompElemHelper.propTypeCheck(comp, propDefs, ck, v)

    const oldValue = comp.__s[ck] ? comp.__s[ck].peek() : undefined

    if (!force && Object.is(oldValue, v)) {
      if (comp.props) comp.props[k] = raw
      return
    }
    let attrPending = false
    if (propDef.attribute !== false && isDefined(v) && !isObject(v)) {
      attrPending = true
    }

    if (comp.props) {
      comp.props[k] = k === ck ? v : raw
    }
    if (k !== ck) {
      if (comp.props) comp.props[ck] = v
    }
    if (comp.__s[ck]) {
      comp.__s[ck].value = v
    }
    if (attrPending) {
      CompElemHelper.updateAttribute(comp, propDef, ck, v)
    }
  }
}