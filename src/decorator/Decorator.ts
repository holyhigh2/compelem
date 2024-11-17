import { isFunction } from "myfx";
import { _DecoratorMap } from ".";
import { CompElem } from "../CompElem";

//装饰器类型
export enum DecoratorType {
  CLASS = 'class',
  FIELD = 'field',
  METHOD = 'method'
}

/**
 * 用于构造装饰器
 * @author holyhigh2
 */
export abstract class Decorator {
  /**
   * 通过函数方式进行装饰器调用
   * @param target 所在类
   * @param deco 装饰器函数
   * @param fieldName 装饰器应用的字段名/函数名/函数
   * @param args 不定参数
   */
  static call(target: any, deco: Function, fieldName: string | Function, ...args: any[]) {
    let isDeco = _DecoratorMap.get(deco)
    if (isDeco) {
      let dw = deco(...args)(target, fieldName, isFunction(fieldName) ? { configurable: true } : null)
      dw.create(target)
    } else {
      deco(target, fieldName, ...args)
    }
  }
  /**
   * 装饰器使用范围，超出范围会报错
   */
  abstract get targets(): Array<DecoratorType>
  /**
   * 构造会传递自定义参数
   * @param args 自定义参数
   */
  // constructor(...args: any[]) { }

  /**
   * 返回用于识别唯一实例的key，比如@watch(a.b.c)中的变量路径就会作为唯一key
   * @param args 
   */
  // static getKey(...args: any[]): string

  abstract created(component: CompElem, ...args: any[]): any
  /**
   * 执行时机与组件一致
   * @param component 组件实例
   * @param setReactive 为实例设置响应属性，注意，仅是设置到了instance.reactiveData中并非this.key。如需实现this访问，可自行定义组件的properties
   * @param args 装饰器函数参数
   */
  abstract propsReady(component: CompElem, setReactive: (key: string, value: any) => any, ...args: any[]): any
  abstract mounted(component: CompElem, setReactive: (key: string, value: any) => any, ...args: any[]): any
  abstract updated(component: CompElem, changed: Record<string, any>): any
}
