import { cloneDeep, has, isEmpty } from "myfx"
import { showError } from "../utils"

/**
 * 属性定义
 */
export type PropOption = {
  /**
   * 参数类型
   */
  type: any,
  /**
   * 是否必填，默认false
   */
  required?: boolean,
  /**
   * 是否可以修改属性，默认false
   */
  sync?: boolean
  /**
   * 是否关联属性，prop会生成dom属性且当属性变动时自动更新值。默认true
   */
  attribute?: boolean,
  /**
   * 是否发生变更，如果未指定使用严格相等
   * @param newValue 
   * @param oldValue 
   * @returns 
   */
  hasChanged?: (newValue: any, oldValue: any) => boolean,
  /**
   * 设置属性getter，可以通过 get 函数方式设置
   * @returns 
   */
  getter?: () => any,
  /**
   * 设置属性setter，可以通过 set 函数方式设置
   * @returns 
   */
  setter?: (v: any) => void,
  /**
   * 当传递参数值为string类型且参数类型不是string时会调用转换器进行转换
   * @param stringValue 
   * @returns 
   */
  converter?: (stringValue: string) => any,
  _defaultValue?: any
  /**
   * 属性校验器，可动态校验值是否合法
   * @param value 
   * @returns 
   */
  isValid?: (value: any, props?: Record<string, any>) => boolean
}

/**
 * 声明一个由外部传入的单向更新属性
 * @param options 可选参数 PropOption，如果type未定义则根据默认值自动推断类型
 */
export function prop(options: PropOption): (target: any, propertyKey: any) => void;
export function prop(target: any, propertyKey: any): void;
export function prop(options: any) {
  if (arguments.length === 1) {
    return (target: any, propertyKey: string, descriptor?: PropertyDescriptor) => {
      options.required = options.required || false
      options.attribute = options.attribute === false ? false : true;
      defineProp(target, propertyKey, options, descriptor)
    }
  }

  let target = arguments[0], propertyKey = arguments[1], descriptor = arguments[2]
  defineProp(target, propertyKey, { type: undefined, required: false, attribute: true }, descriptor)
}

function defineProp(target: any, propertyKey: string, options: PropOption, descriptor?: PropertyDescriptor) {
  if (!/[a-z]/.test(propertyKey[0])) {
    showError(`Prop '${propertyKey}' must be in CamelCase`)
  }
  if (!has(target.constructor, '__deco_props')) {
    target.constructor.__deco_props = isEmpty(target.constructor.__deco_props) ? {} : cloneDeep(target.constructor.__deco_props)
  }
  if (descriptor) {
    if (descriptor.get) options.getter = descriptor.get
    if (descriptor.set) options.setter = descriptor.set
  }
  target.constructor.__deco_props[propertyKey] = options
}