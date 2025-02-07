import { View } from "../render/RenderContext";
import { Template } from "../render/Template";
import { DirectiveUpdateTag } from "../types";
import { EnterPoint, EnterPointType } from "./index";
/**
 * 用于解析HTML模板
 * @author holyhigh2
 */
export abstract class Directive extends View(Object) {
  //render参数，仅保存上次指令所在context变更时的数据，用于指令内部context更新时
  _renderArgs: any[]
  /**
   * 指令使用范围，超出范围会报错
   */
  static get scopes(): Array<EnterPointType> {
    return []
  }
  /**
   * 更新时调用
   * @param point 
   */
  abstract update(point: EnterPoint, newArgs: any[], oldArgs: any[]): DirectiveUpdateTag
  /**
   * 渲染HTML内容，该回调内无法访问DOM
   */
  abstract render(...args: any): Template | void
  /**
   * 指令所在DOM创建后渲染前调用，可以访问插入点信息
   * 此时可对DOM进行操作
   */
  abstract created(point: EnterPoint, ...args: any): void
  /**
   * 指令渲染参数变量链
   */
  renderParams: Array<string[]>

  //////////////////////////////////// methods
}
