import { concat, get, has, isDefined, isEmpty, isObject, isUndefined } from 'myfx';
import { Constructor } from './../types';
/*************************************************************
 * 装饰器
 * @author holyhigh2
 *************************************************************/
import { CompElem } from "../CompElem";
import { showError } from '../utils';
import { Decorator, DecoratorType } from "./Decorator";

export const GetKeyFnName = 'getKey'
export const _DecoratorsKey = '__decorators'
export const _DecoratorMap = new WeakMap
/**
 * 装饰器包装类
 * 用于框架内部，表示class上的一个装饰器属性定义
 * 该定义在实例初始化时会产生装饰器实例属性
 */
export class DecoratorWrapper {
  //execute 参数
  args: any[]
  //装饰器参数
  metadata: any[]
  decoratorClass: Constructor<Decorator>
  instanceMap: WeakMap<CompElem, Decorator>
  key?: string //装饰器唯一key
  priority: number = 0

  constructor(args: any[], metadata: any[], decoratorClass: Constructor<Decorator>) {
    this.args = args;
    this.metadata = metadata;
    this.decoratorClass = decoratorClass;
    this.priority = get(decoratorClass, 'priority', 0)
    this.instanceMap = new WeakMap
  }

  //在组件构造时调用
  create(comp: CompElem) {
    let ins = new this.decoratorClass(...this.args)
    //1. 校验targets
    let targets = ins.targets
    let decoType: DecoratorType | undefined = undefined;
    let descriptor = this.metadata[2]
    if (isObject(descriptor) && isDefined(get(descriptor, 'configurable'))) {
      decoType = DecoratorType.METHOD
    } else if (isUndefined(this.metadata[2])) {
      decoType = DecoratorType.FIELD
    }

    if (isEmpty(targets) || !decoType || !targets.includes(decoType)) {
      showError(`Decorator '${this.decoratorClass.name}' is out of targets, expect '${targets.join(',')}' bug got '${decoType}'`);
      return
    }
    ins.created(comp, ...this.metadata)

    this.instanceMap.set(comp, ins)
  }

  beforeMount(comp: CompElem, setReactive: (key: string, value: any) => any) {
    let ins = this.instanceMap.get(comp)!
    ins.beforeMount(comp, setReactive, ...this.metadata)
  }

  mounted(comp: CompElem, setReactive: (key: string, value: any) => any) {
    let ins = this.instanceMap.get(comp)!
    ins.mounted(comp, setReactive, ...this.metadata)
  }

  updated(comp: CompElem, changed: Record<string, any>) {
    this.instanceMap.get(comp)!.updated(comp, changed)
  }
}
//每个装饰器类中不同组件类中的重复key
const DecoKeyMap = new WeakMap<Constructor<Decorator>, WeakMap<Constructor<CompElem>, Record<string, DecoratorWrapper>>>()
/**
 * 该函数用于创建一个装饰器
 * @param decoClass 装饰器构造
 * @returns 装饰器函数
 */
export function decorator<T extends Array<any>>(decoClass: Constructor<Decorator>) {
  let fn = (...args: T) => {
    return (...metadata: any[]): any => {
      let ctor = metadata[0].constructor

      let ary: DecoratorWrapper[] | undefined = ctor[_DecoratorsKey]
      if (!has(ctor, _DecoratorsKey)) {
        //继承父类
        let proto = Object.getPrototypeOf(ctor)
        ary = proto ? concat(proto[_DecoratorsKey] ?? []) : []

        Reflect.defineProperty(ctor, _DecoratorsKey, {
          configurable: false,
          enumerable: false,
          value: ary
        })
      }
      let kMap: Record<string, DecoratorWrapper> = {}
      let k
      let getKey = (decoClass as any)[GetKeyFnName] as Function
      if (getKey) {
        let compMap = DecoKeyMap.get(decoClass)
        if (!compMap) {
          compMap = new WeakMap
          DecoKeyMap.set(decoClass, compMap)
        }
        kMap = compMap.get(ctor)!
        if (!kMap) {
          kMap = {}
          compMap.set(ctor, kMap)
        }
        k = getKey(...args)
        if (kMap[k]) return kMap[k]
      }
      let dw = new DecoratorWrapper(args, metadata, decoClass)
      kMap[k] = dw
      ary?.push(dw)
      return dw
    };
  }
  _DecoratorMap.set(fn, true)
  return fn;
}
