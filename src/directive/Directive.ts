import { Template } from "../render/render";
import { RenderContext } from "../render/RenderContext";
import { DirectiveUpdateTag, TmplFn } from "../types";
import { EnterPointType } from "./index";
/**
 * 用于解析HTML模板
 * @author holyhigh2
 */
export abstract class Directive extends RenderContext(Object) {
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
  abstract update(nodes: Node[], newArgs: any[], oldArgs: any[]): DirectiveUpdateTag
  /**
   * 调用实现
   * 如果返回tmplFn则表示异步渲染
   */
  abstract render(...args: any): Template | Template[] | void | TmplFn
  /**
   * 指令渲染参数变量链
   */
  renderParams: Array<string[]>

  //////////////////////////////////// methods
}
