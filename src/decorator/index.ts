import { concat, get, has, isDefined, isEmpty, isObject, isUndefined, set } from 'myfx';
import { Constructor } from './../types';
/*************************************************************
 * 装饰器
 * @author holyhigh2
 *************************************************************/
import { CompElem } from "../CompElem";
import { showError } from '../utils';
import { DecoratorType, Decorator } from "./Decorator";

export const GetKeyFnName = 'getKey'
export const DecoratorsKey = '__decorators'
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

  constructor(args: any[], metadata: any[], decoratorClass: Constructor<Decorator>) {
    this.args = args;
    this.metadata = metadata;
    this.decoratorClass = decoratorClass;
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

  propsReady(comp: CompElem, setReactive: (key: string, value: any) => any) {
    let ins = this.instanceMap.get(comp)!
    ins.propsReady(comp, setReactive, ...this.metadata)
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
const DecoKeyMap = new WeakMap<Constructor<Decorator>, WeakMap<Constructor<CompElem>, Record<string, boolean>>>()
/**
 * 该函数用于创建一个装饰器
 * @param decoClass 装饰器构造
 * @returns 装饰器函数
 */
export function decorator<T extends Array<any>>(decoClass: Constructor<Decorator>) {
  return (...args: T) => {
    return (...metadata: any[]) => {
      let constr = metadata[0].constructor

      let ary: DecoratorWrapper[] | undefined = get(constr, DecoratorsKey)
      if (!has(constr, DecoratorsKey)) {
        //继承父类
        let parentAry = get(Object.getPrototypeOf(constr), DecoratorsKey)
        ary = parentAry ? concat(parentAry) : []
        set(constr, DecoratorsKey, ary)
      }
      let getKey = get<Function>(decoClass, GetKeyFnName)
      if (getKey) {
        let compMap = DecoKeyMap.get(decoClass)
        if (!compMap) {
          compMap = new WeakMap
          DecoKeyMap.set(decoClass, compMap)
        }
        let kMap = compMap.get(constr)
        if (!kMap) {
          kMap = {}
          compMap.set(constr, kMap)
        }
        let k = getKey(...args)
        if (kMap[k]) return
        kMap[k] = true
      }
      ary?.push(new DecoratorWrapper(args, metadata, decoClass))
    };
  };
}
