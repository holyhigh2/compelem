import { clone, defaults, each, has, isLowerCaseChar, kebabCase, merge, set, toArray } from "myfx"
import { CompElem } from "../CompElem"
import { DefinitionModelMap, DefinitionPropMap, HasChangedPropOrStateMap, ObservedAttrsMap, PropShallowKeySetMap } from "../constants"
import { emitModelEvent, getterValue } from "../reactive"
import { PropOption } from "../types"
import { _getSuper, showTagError } from "../utils"
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
  options.shallow = options.shallow || false;
  defineProp(target, propertyKey, options, descriptor)
}

function defineProp(target: any, propertyKey: string, options: PropOption, descriptor?: PropertyDescriptor) {
  if (process.env.DEV) {
    if (!isLowerCaseChar(propertyKey[0])) {
      showTagError(target.constructor.name, `Prop '${propertyKey}' must be in CamelCase`)
    }
  }

  let attrSet: Set<string> | undefined
  if (!DefinitionPropMap.has(target.constructor)) {
    const mixinProps: Record<string, PropOption> = {}
    let parentCtor = target.constructor
    while ((parentCtor = _getSuper(parentCtor)) !== CompElem) {
      merge(mixinProps, clone(DefinitionPropMap.get(parentCtor) ?? {}))
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
  if (options.attribute) {
    if (!attrSet) {
      attrSet = ObservedAttrsMap.get(target.constructor)
    }
    let kbb = kebabCase(propertyKey)
    attrSet?.add(kbb)
  }
  if (options.model) {
    let modelList = DefinitionModelMap.get(target.constructor)
    if (!modelList) {
      modelList = []
      DefinitionModelMap.set(target.constructor, modelList)
    }
    if (!modelList.includes(propertyKey))
      modelList.push(propertyKey)
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

  if (options.shallow) {
    let keySet = PropShallowKeySetMap.get(target.constructor)
    if (!keySet) {
      keySet = new Set()
      PropShallowKeySetMap.set(target.constructor, keySet)
    }
    keySet.add(propertyKey)
  }

  //setters & getters
  Reflect.defineProperty(target, propertyKey, {
    get() {
      return getterValue(propertyKey, this)
    },
    set(v) {
      if (!DefinitionModelMap.get(target.constructor)?.includes(propertyKey)) {
        if (process.env.DEV) {
          showTagError(this.tagName, `Cannot assign the value '${v}' to the prop '${propertyKey}'`)
        }
        return
      }
      emitModelEvent(propertyKey, v, this)
    },
  })

}

//内部接口
const emptySet = new Set<string>
export function _getObservedAttrs(ctor: Function) {
  return ObservedAttrsMap.get(ctor) ?? emptySet
}