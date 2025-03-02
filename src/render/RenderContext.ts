import { get, isBlank, isEqual, isObject, isPlainObject, join, replace, set, split } from "myfx";
import { CompElem } from "../CompElem";
import { UpdatePoint } from "../types";
import { DomUtil, PLACEHOLDER_EXP, buildHTML, buildTmplate } from "./render";
import { Template } from "./Template";

export interface IView {
  /**
   * 对比新的模板数据，更新变化点
   * @param tmpl 
   */
  updateView(tmpl: Template): void
  /**
   * 构建模板返回nodes并更新 __updatePoints 属性
   * @param tmpl 
   */
  buildView(tmpl: Template): NodeListOf<ChildNode>
}
/**
 * 视图基类 为组件视图及指令子视图提供统一服务
 * @param spuerClass 
 * @returns 
 */
export function View<T extends new (...args: any[]) => any>(spuerClass: T) {
  //mixin class
  return class extends spuerClass implements IView {
    __updatePoints: Array<UpdatePoint>
    /**
     * 渲染上下文所属组件，仅用于指令
     */
    renderComponent: CompElem;

    buildView(tmpl: Template) {
      let comp = this instanceof CompElem ? this : this.renderComponent
      let [html, vars] = buildHTML(comp, tmpl);
      let updatePoints: UpdatePoint[] = []
      let nodes = buildTmplate(updatePoints, html, vars, comp, this);
      this.__updatePoints = updatePoints
      return nodes
    }
    updateView(tmpl: Template): void {
      if (isBlank(join(tmpl.strings))) return;
      if (!this.__updatePoints) return;
      let { vars } = tmpl;
      let comp = this instanceof CompElem ? this : this.renderComponent;

      for (let i = 0; i < this.__updatePoints.length; i++) {
        const up = this.__updatePoints[i];
        let varIndex = up.varIndex;
        let oldValue = up.value;
        let newValue: any = vars;
        let node = up.node;
        let indexSegs = split(varIndex, '-')
        for (let l = 0; l < indexSegs.length; l++) {
          const seg = indexSegs[l];
          newValue = get(newValue, seg)
          if (newValue && newValue.vars && i < indexSegs.length - 1) {
            newValue = newValue.vars
          }
        }

        //check
        if (!isObject(oldValue) && oldValue === newValue) continue;

        let elNode = node as HTMLElement
        if (up.isDirective) {
          if (!oldValue.di) continue;//指令还在异步执行中，不更新
          //指令
          newValue.di = oldValue.di;
          newValue.di.renderParams = newValue.varChain;
          newValue.di._renderArgs = newValue.args;
          newValue.point = oldValue.point;
          newValue.varPath = oldValue.varPath;

          oldValue.update(oldValue.point, newValue.args, oldValue.args);
        } else if (up.isToggleProp) {
          //布尔特性
          if ((!!newValue) === oldValue) continue

          elNode.toggleAttribute(up.attrName, !!newValue)
          set(elNode, up.attrName, !!newValue)

        } else if (up.isProp) {
          //子组件属性
          if (!isObject(newValue) && newValue === oldValue) continue;
          //如果node是slot则触发组件的slot更新
          if (node instanceof CompElem) {
            node._updateProps({ [up.attrName]: newValue });
          } else if (node instanceof HTMLSlotElement) {
            comp._updateSlot(node.getAttribute('name') || 'default', up.attrName, newValue)
          }
        } else if (up.attrName && !up.isEvent) {
          //特性
          if (!isEqual(oldValue, newValue)) {
            switch (up.attrName) {
              case 'value':
                if (node instanceof HTMLInputElement) {
                  node.value = newValue

                  break;
                }

              default:
                (node as HTMLElement).setAttribute(up.attrName, replace(up.attrTmpl, PLACEHOLDER_EXP, newValue + ''))
            }
          }
        } else if (up.isTmpl) {
          //这里一定是子视图更新，子视图仅更新内部__expose
          if (newValue.strings.join() !== oldValue.tmpl.strings.join()) {
            up.value.updateView(newValue)
          } else if (newValue.vars.some((v: any) => isObject(v) && !isPlainObject(v)) || oldValue.tmpl.vars.some((v: any) => isObject(v) && !isPlainObject(v)) || !isEqual(newValue.vars, oldValue.tmpl.vars)) {
            up.value.updateView(newValue)
          }

          oldValue.tmpl = newValue
          newValue = oldValue//new SubView(newValue)
        } else if (up.isText) {
          let textNode = up.textNode.nextSibling
          if (textNode && textNode === up.node.previousSibling) {
            textNode.textContent = newValue
          } else {
            DomUtil.remove(up.textNode, up.node);
            DomUtil.insertBefore(up.node, [newValue])
          }
        }

        up.value = newValue
      }//endfor

    }
  }
}

/**
 * 子视图，用于组件视图模板中的非指令子模版
 */
export class SubView extends View(Object) {
  tmpl: Template
  constructor(tmpl: Template) {
    super();
    this._renderVars = get(tmpl, '_renderVars')
    this.tmpl = tmpl
  }
}