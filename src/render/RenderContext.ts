import { compact, get, isArray, isBlank, isEmpty, isEqual, isObject, join, replace, set, size, split, toArray } from "myfx";
import { CompElem } from "../CompElem";
import { Directive } from "../directive/Directive";
import { DirectiveWrapper } from "../directive/index";
import { ExpPos } from "../types";
import { DomUtil, PLACEHOLDER_EXP, Template, buildHTML, buildTmplate } from "./render";

//todo 接口需要暴露出去
export interface IRenderContext {
  render(...args: any): Template | Template[] | void | ((...args: any[]) => (Template | Template[]))
  slotComponent: CompElem;
  renderComponent: CompElem;
  renderContext(...args: any): [NodeListOf<ChildNode>, Record<string, ExpPos>, Record<string, typeof this.__expPos | null>];
  updateContext(...args: any): void
}

/**
 * 为组件/指令提供渲染接口
 * @author holyhigh2
 */
export function RenderContext<T extends new (...args: any[]) => any>(spuerClass: T) {
  //mixin class
  return class extends spuerClass implements IRenderContext {
    /**
   * 渲染实现
   */
    render(...args: any): Template | Template[] | void | ((...args: any[]) => (Template | Template[])) { }
    //模板中变量位置信息
    __expPos: Record<string, ExpPos> = {};
    //对于each指令存在多个context，每个context需要单独更新 {contextKey:expPos}
    __expPosMap: Record<string, typeof this.__expPos | null> = {};
    //组件内所有的指令
    __directives: Record<string, Directive> = {};/**
    * 指令/组件所在的插槽所属组件
    */
    slotComponent: CompElem;
    /**
     * 渲染上下文所属组件
     */
    renderComponent: CompElem;
    //////////////////////////////////// methods
    renderContext(...args: any): [NodeListOf<ChildNode>, Record<string, ExpPos>, Record<string, typeof this.__expPos | null>] {
      return renderContext.call(this, ...args)
    }
    updateContext(...args: any) {
      let tmpl = size(args) == 1 && ((isArray<Template>(args[0]) && args[0][0] instanceof Template) || (args[0] instanceof Template)) ? args[0] : this.render(...args);

      if (tmpl instanceof Template) {
        this.__updateExpPos(tmpl, this.__expPos)
      } else if (isArray<Template>(tmpl) && tmpl[0] instanceof Template) {
        tmpl.forEach((tmp, i) => {
          this.__updateExpPos(tmp, this.__expPosMap[tmp.key ?? tmp.getKey()]!)
        })
      }
    }
    __updateExpPos(tmpl: Template, _expPos: Record<string, ExpPos>) {
      if (isBlank(join(tmpl.strings))) return;

      let { vars } = tmpl;

      _expPos && Object.values(_expPos).forEach(expPos => {
        let varIndex = expPos.index;
        let oldValue = expPos.value;
        let newValue: any = vars;
        let node = expPos.node;
        let indexSegs = split(varIndex, '-')
        indexSegs.forEach((seg, i) => {
          newValue = get(newValue, seg)
          if (newValue && newValue.vars && i < indexSegs.length - 1) {
            newValue = newValue.vars
          }
        })

        //check
        if (!isObject(oldValue) && oldValue === newValue) return;

        let elNode = node as HTMLElement
        if (expPos.isDirective) {
          //指令
          newValue.di = oldValue.di;
          newValue.di.renderParams = newValue.varChain;
          newValue.di._renderArgs = newValue.args;
          newValue.point = oldValue.point;
          newValue.varPath = oldValue.varPath;

          let nodes = getDirectiveNodes(newValue.point.startNode, newValue.point.endNode)

          newValue.update(nodes, newValue.args, oldValue.args);
        } else if (expPos.isToggleProp) {
          //布尔特性
          if ((!!newValue) === oldValue) return

          elNode.toggleAttribute(expPos.attrName, !!newValue)
          set(elNode, expPos.attrName, !!newValue)

        } else if (expPos.isProp) {
          //子组件属性
          if (!isObject(newValue) && newValue === oldValue) return;
          if (isObject(newValue) && isEqual(newValue, oldValue)) return;
          //如果node是slot则触发组件的slot更新
          if (node instanceof CompElem) {
            node._updateProps({ [expPos.attrName]: newValue });
          } else if (node instanceof HTMLSlotElement) {
            this.renderComponent._updateSlot(node.getAttribute('name') || 'default', expPos.attrName, newValue)
          }
        } else if (expPos.attrName && !expPos.isEvent) {
          //特性
          if (!isEqual(oldValue, newValue)) {
            switch (expPos.attrName) {
              case 'value':
                if (node instanceof HTMLInputElement) {
                  node.value = newValue

                  break;
                }

              default:
                (node as HTMLElement).setAttribute(expPos.attrName, replace(expPos.attrTmpl, PLACEHOLDER_EXP, newValue + ''))
            }
          }
        } else if (expPos.isTmpl) {
          //这里一定是子视图更新，子视图仅更新内部__expose
          if (!isEqual(newValue, oldValue)) {
            let [subNodes, subExpPos, subExpPosMap] = renderContext.call(this, newValue/*newValue */)

            if (isEmpty(subExpPos)) {
              DomUtil.remove(expPos.textNode, expPos.node);
              DomUtil.insertBefore(expPos.node, subNodes)
            } else {
              this.__updateExpPos(newValue, subExpPos)
            }
          }
        } else if (expPos.isText) {
          let textNode = expPos.textNode.nextSibling
          if (textNode && textNode === expPos.node.previousSibling) {
            textNode.textContent = newValue
          } else {
            DomUtil.remove(expPos.textNode, expPos.node);
            DomUtil.insertBefore(expPos.node, [newValue])
          }
        }

        expPos.value = newValue
      })
    }
  }
}

function renderContext(...args: any) {
  let tmpl = args.length === 1 && args[0] instanceof Template ? args[0] : this.render(...args);
  let domTree;
  let diWrappers: DirectiveWrapper[] = [];
  let expPos = undefined
  let expPosMap: Record<string, any> | undefined = undefined
  if (tmpl instanceof Template) {
    let html = buildHTML(tmpl);
    // this.__expPos = {}
    expPos = {}
    domTree = buildTmplate(expPos, diWrappers, html, tmpl.vars, this.renderComponent);
  } if (isArray<Template>(tmpl) && tmpl[0] instanceof Template) {
    // this.__expPosMap = {}
    let doms: any[] = []
    expPosMap = {}
    tmpl.forEach(tmp => {
      let html = buildHTML(tmp);
      let __expPos = {}
      domTree = buildTmplate(__expPos, diWrappers, html, tmp.vars, this.renderComponent);
      doms.push(...domTree)
      expPosMap![tmp.key ?? tmp.getKey()] = __expPos
      // this.__expPosMap[tmp.key ?? tmp.getKey()] = __expPos
    })

    domTree = doms
  } else if (tmpl instanceof Function) {
    //todo 目前仅支持slot，后续如有异步指令再行重构
    this.slotComponent._asyncDirectives.set(tmpl, this)
  }

  if (diWrappers.length < 1) return [domTree, expPos, expPosMap];

  diWrappers.forEach(diWrapper => {
    let nodes = compact(toArray<Node>(diWrapper.render(this.renderComponent)))
    if (!isEmpty(nodes)) {
      let fragment = document.createDocumentFragment();
      fragment.append(...nodes);
      diWrapper.point.endNode.parentNode!.insertBefore(fragment, diWrapper.point.endNode);
    }
  })

  return [domTree, expPos, expPosMap]
}

function getDirectiveNodes(startNode: Node, endNode: Node) {
  let nextNode = startNode.nextSibling
  if (!endNode) return [nextNode]
  let rs = []
  while (nextNode && nextNode !== endNode) {
    rs.push(nextNode)
    nextNode = nextNode?.nextSibling
  }
  return rs;
}