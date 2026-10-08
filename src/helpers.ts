import { isArray, isBoolean, isDefined, isNil, isNull, isObject, isString, join, kebabCase, map, some, trim } from "myfx";
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

  /**
   * 设置样式
   * @param styles 样式字符串或样式对象
   * @param node HTML元素
   * @returns 每个样式的旧值map
   */
  static setStyle(styles: Record<string, string> | string, node: HTMLElement) {
    if (isString(styles) && !trim(styles)) return
    let css = CssHelper.getCssText(styles)
    // cssText 整写会清掉组件宿主上的 cssVars 自定义属性 → 失效其旧值镜像
    const comp = node as any
    if (comp.__cssVarVals !== undefined) comp.__cssVarVals = undefined
    node.style.cssText = css
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
    const hasString = some(expectTypeAry, (et) => et === String)
    if (!hasString && isString(val) && !isNull(val)) {
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
      if (!validator.call(comp, val, comp.__data_)) {
        showTagError(
          comp.tagName,
          `Invalid prop '${propKey}'. IsValid() check failed`
        );
      }
    }

    return val;
  }
  static updateAttribute(comp: CompElem<any>, propDef: PropOption, key: string, val: string | null) {
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
      if (comp.props) comp.props[k] = v
      // 同 updateProps：未 inited 时也须写 signal，否则值丢失
      const ck0 = camelCaseCached(k)
      if (comp.__s[ck0]) comp.__s[ck0].value = v
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

    const oldValue = comp.__s[ck] ? comp.__s[ck].peek() : comp.__data_[ck]

    if (!force && Object.is(oldValue, v)) {
      if (comp.props) comp.props[k] = raw
      return
    }
    let attrPending = false
    if (propDef.attribute !== false && isDefined(v) && !isObject(v)) {
      attrPending = true
    }

    comp.__data_[ck] = v
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