import { defaults, each, has, isLowerCaseChar, kebabCase, merge, set, toArray } from "myfx"
import { CompElem } from "../CompElem"
import { DefinitionPropMap, HasChangedPropOrStateMap, ObservedAttrsMap, PropSyncKeySetMap } from "../constants"
import { getterValue, setterValue } from "../reactive"
import { PropOption } from "../types"
import { _getSuper, showError } from "../utils"
/**
 * 声明一个由外部传入的单向更新属性
 * @param options 可选参数 PropOption，如果type未定义则根据默认值自动推断类型
 */
export function prop(options: PropOption): (target: any, propertyKey: any) => void;
export function prop(target: any, propertyKey: any, options?: PropOption): void;
export function prop(options: any) {
  if (arguments.length === 1) {
    return (target: any, propertyKey: string, descriptor?: PropertyDescriptor) => {
      options.required = options.required || false
      options.attribute = options.attribute === false ? false : true;
      defineProp(target, propertyKey, options, descriptor)
    }
  }

  let target = arguments[0], propertyKey = arguments[1], descriptor = arguments[2]
  options = { type: undefined, required: false, attribute: true }
  if (descriptor && typeof descriptor.type === 'function') {
    options = defaults(descriptor, options)
    descriptor = undefined
  }
  defineProp(target, propertyKey, options, descriptor)
}

function defineProp(target: any, propertyKey: string, options: PropOption, descriptor?: PropertyDescriptor) {
  if (!isLowerCaseChar(propertyKey[0])) {
    showError(`Prop '${propertyKey}' must be in CamelCase`)
  }

  let attrSet: Set<string> | undefined
  if (!DefinitionPropMap.has(target.constructor)) {
    const mixinProps: Record<string, PropOption> = {}
    let parentCtor = target.constructor
    while ((parentCtor = _getSuper(parentCtor)) !== CompElem) {
      merge(mixinProps, DefinitionPropMap.get(parentCtor) ?? {})
    }
    attrSet = new Set<string>()
    each(mixinProps, (v, k) => {
      if (v.attribute) {
        let kbb = kebabCase(k)
        attrSet?.add(kbb)
      }
    })
    ObservedAttrsMap.set(target.constructor, attrSet)
    DefinitionPropMap.set(target.constructor, mixinProps)
  }
  if (descriptor) {
    if (descriptor.get) options.getter = descriptor.get
    if (descriptor.set) options.setter = descriptor.set
  }
  if (options.attribute) {
    if (!attrSet) {
      attrSet = ObservedAttrsMap.get(target.constructor)
    }
    let kbb = kebabCase(propertyKey)
    attrSet?.add(kbb)
  }
  //observeAttrs
  if (!has(target.constructor, 'observedAttributes')) {
    target.constructor.observedAttributes = []
  }
  if (attrSet)
    target.constructor.observedAttributes = toArray(attrSet)
  set(DefinitionPropMap.get(target.constructor)!, propertyKey, options)

  //cache tags
  if (options.hasChanged) {
    let changeMap = HasChangedPropOrStateMap.get(target.constructor)
    if (!changeMap) {
      changeMap = new Map()
      HasChangedPropOrStateMap.set(target.constructor, changeMap)
    }
    changeMap.set(propertyKey, options.hasChanged)
  }
  if (options.sync) {
    let keySet = PropSyncKeySetMap.get(target.constructor)
    if (!keySet) {
      keySet = new Set()
      PropSyncKeySetMap.set(target.constructor, keySet)
    }
    keySet.add(propertyKey)
  }

  //setters & getters
  Reflect.defineProperty(target, propertyKey, {
    get() {
      return getterValue(descriptor?.get, propertyKey, this)
    },
    set(v) {
      if (descriptor?.set) {
        descriptor.set(v)
      } else {
        setterValue(propertyKey, v, this)
      }
    },
  })

}

//内部接口
const emptySet = new Set<string>
export function _getObservedAttrs(ctor: Function) {
  return ObservedAttrsMap.get(ctor) ?? emptySet
}