import { concat, get, isDefined, isEmpty, isObject, isUndefined } from 'myfx';
import { Constructor } from './../types';
/*************************************************************
 * 装饰器
 * @author holyhigh2
 *************************************************************/
import { CompElem } from "../CompElem";
import { DefinitionDecoratorMap } from '../constants';
import { showError } from '../utils';
import { Decorator, DecoratorType } from "./Decorator";

/**
 * 装饰器包装类
 * 用于框架内部，表示class上的一个装饰器属性定义
 * 该定义在实例初始化时会产生装饰器实例属性
 */
export class DecoratorWrapper {
  //装饰器参数
  metadata: any[]
  decorator: Decorator
  key?: string //装饰器唯一key
  priority: number = 0

  constructor(args: any[], metadata: any[], decoratorClass: Constructor<Decorator>) {
    this.metadata = metadata;
    this.decorator = new decoratorClass(...args)
    this.priority = get(decoratorClass, 'priority', 0)
  }

  dispose() {
    //clean up
    this.metadata = null as any;
    this.decorator = null as any;
  }

  //在组件构造时调用
  create(comp: CompElem<any>) {
    //1. 校验targets
    let targets = this.decorator.targets
    let decoType: DecoratorType | undefined = undefined;
    let descriptor = this.metadata[1]
    if (isObject(descriptor) && isDefined(get(descriptor, 'configurable'))) {
      decoType = DecoratorType.METHOD
    } else if (isUndefined(this.metadata[1])) {
      decoType = DecoratorType.FIELD
    }

    if (isEmpty(targets) || !decoType || !targets.includes(decoType)) {
      showError(`Decorator '${this.decorator.constructor.name}' is out of targets, expect '${targets.join(',')}' bug got '${decoType}'`);
      return
    }
    this.decorator.created(comp, ...this.metadata)
  }

  beforeMount(comp: CompElem<any>, setReactive: (key: string, value: any) => any) {
    this.decorator.beforeMount(comp, setReactive, ...this.metadata)
  }

  mounted(comp: CompElem<any>, setReactive: (key: string, value: any) => any) {
    this.decorator.mounted(comp, setReactive, ...this.metadata)
  }

  updated(comp: CompElem<any>, changed: Record<string, any>) {
    this.decorator.updated(comp, changed)
  }

  destroy(comp: CompElem<any>) {
    this.decorator.beforeDestroy(comp, ...this.metadata)
  }
}

/**
 * 该函数用于创建一个装饰器
 * @param decoClass 装饰器构造
 * @returns 装饰器函数
 */
export function decorator<T extends Array<any>>(decoClass: Constructor<Decorator>): (...args: T) => (...metadata: any[]) => any {
  let fn = (...args: T) => {
    return (...metadata: any[]): any => {
      let ctor = metadata[0].constructor

      let ary: DecoratorWrapper[] | undefined = DefinitionDecoratorMap.get(ctor)//  ctor[_DecoratorsKey]
      if (!DefinitionDecoratorMap.has(ctor)) {
        //继承父类
        let proto = Object.getPrototypeOf(ctor)
        ary = proto ? concat(DefinitionDecoratorMap.get(proto) ?? []) : []

        DefinitionDecoratorMap.set(ctor, ary)
      }
      let dw = new DecoratorWrapper(args, metadata.splice(1), decoClass)
      ary?.push(dw)
      return dw
    };
  }
  return fn;
}

export function decoratorWithNoArgs(decoClass: Constructor<Decorator>): (...metadata: any[]) => any {
  let fn = (...metadata: any[]): any => {
    if (!metadata || metadata.length < 1) return;

    let ctor = metadata[0].constructor

    let ary: DecoratorWrapper[] | undefined = DefinitionDecoratorMap.get(ctor)//  ctor[_DecoratorsKey]
    if (!DefinitionDecoratorMap.has(ctor)) {
      //继承父类
      let proto = Object.getPrototypeOf(ctor)
      ary = proto ? concat(DefinitionDecoratorMap.get(proto) ?? []) : []

      DefinitionDecoratorMap.set(ctor, ary)
    }
    let dw = new DecoratorWrapper([], metadata.splice(1), decoClass)
    ary?.push(dw)
    return dw
  }
  return fn;
}