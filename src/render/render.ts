import {
  camelCase,
  concat,
  get,
  has,
  isFunction,
  isString,
  isUndefined,
  kebabCase,
  last,
  replace,
  replaceAll,
  snakeCase,
  startsWith,
  toArray,
  trim
} from "myfx";
import { CompElem } from "../CompElem";
import {
  DirectiveWrapper,
  EnterPoint,
  EnterPointType,
} from "../directive/index";
import { addEvent } from "../events/event";
import { UpdatePoint } from "../types";
import { showError, showTagError } from "../utils";
import { IView, SubView } from "./RenderContext";
import { Template } from "./Template";

export const ATTR_PREFIX_EVENT = "@";
export const ATTR_PREFIX_PROP = ".";
export const ATTR_PREFIX_BOOLEAN = "?";
export const ATTR_PREFIX_REF = "*";
export const ATTR_PROP_DELIMITER = ":";
export const ATTR_REF = "ref";

const EXP_ATTR_CHECK = /[.?-a-z]+\s*=\s*(['"])\s*([^='"]*<\!--c_ui-pl_df-->){2,}.*?\1/ims;
const EXP_PLACEHOLDER = /<\s*[a-z0-9-]+([^>]*<\!--c_ui-pl_df-->)*[^>]*?(?<!-)>/imgs;
const SLOT_KEY_PROPS = 'slot-props'
/**
 * 提供渲染函数相关操作
 * @author holyhigh2
 */

/**
 * 高性能dom生成及变量绑定算法
 * 1. 使用占位符拼接HTML字符串，占位符与变量需要按照顺序对应
 * 2. 插入dom片段，并遍历元素+注释节点, 搜索占位符
 *  1. 按顺序遍历所有attr，发现一个属性值含有占位符时，标记节点及属性名，以便变量可以进行绑定（ 如果key是事件/ref则内容仅允许一个占位符）
 *  2. 如果是注释节点
 *    1. 在后面追加同内容注释节点，标记两个节点，以便变量可以进行绑定
 *    2. 在中间插入变量内容
 * 3. 只有表达式是一个指令时才能绑定依赖
 * @param component
 * @param tmpl
 * @returns [html,vars]
 */
export function buildHTML(
  component: CompElem,
  tmpl: Template
): [string, any[]] {
  let html = "";
  let vars = concat(tmpl.vars)
  let l = tmpl.strings.length - 1;
  let vl = tmpl.vars.length - 1
  for (let i = 0; i <= l; i++) {
    const str = tmpl.strings[i];
    let val = get<any>(tmpl.vars, i, '');
    if (val && val.di) {
      let rs = val.render(component)
      if (rs instanceof Template) {
        let [h, v] = buildHTML(component, rs)
        Reflect.defineProperty(val, '_renderVars', { value: v })
        // set(val, '_renderVars', v)
        val = PLACEHOLDER_DI_START + h + PLACEHOLDER_DI_END
      } else {
        val = rs ?? PLACEHOLDER
      }
    }
    else if (val instanceof Template) {
      let [h, v] = buildHTML(component, val)
      Reflect.defineProperty(val, '_renderVars', { value: v })
      // set(val, '_renderVars', v)
      val = PLACEHOLDER_TMPL_START + h + PLACEHOLDER_TMPL_END
      // vars.splice(i + offset, 1, ...v)
      // offset += v.length
    }
    else {
      val = i > vl ? "" : PLACEHOLDER;
    }

    html += str + val;
  }

  //attr check
  let rs = html.match(EXP_ATTR_CHECK)
  if (rs) {
    let errorMsg = replaceAll(rs[0], PLACEHOLDER, '${...}')
    showError(`Parse error: attribute value can be set only one interpolation —— \n ${errorMsg}`)
    return ['', vars];
  }

  let i = 0;
  html = html.replace(EXP_PLACEHOLDER, (a: string, b: string) => {
    let rs = replaceAll(a, PLACEHOLDER, () => PLACEHOLDER.replace('-->', '') + (i++))
    return rs
  })
  html = html.replace(EXP_STR, '$1><').trim()

  return [html, vars];
}
const PLACEHOLDER_DI_START = "<!--c_ui-pl_di-start-->";
const PLACEHOLDER_DI_END = "<!--c_ui-pl_di-end-->";
const PLACEHOLDER_TMPL_START = "<!--c_ui-pl_tmpl-start-->";
const PLACEHOLDER_TMPL_END = "<!--c_ui-pl_tmpl-end-->";
const PLACEHOLDER = "<!--c_ui-pl_df-->";
const PLACEHOLDER_PREFFIX = "<!--c_ui-pl_df";
export const PLACEHOLDER_EXP = /<!--c_ui-pl_df\d*(-->)?/
/**
 * 构建模板为DOM结构
 * @param html
 */
export function buildTmplate(
  updatePoints: Array<UpdatePoint>,
  html: string,
  vars: any[],
  component: CompElem,
  viewContext: IView
): NodeListOf<ChildNode> {
  const container = document.createElement("div");
  container.innerHTML = html;

  //遍历dom
  const nodeIterator = document.createNodeIterator(
    container,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT
  );
  let currentNode: any;
  let varIndex = 0;
  let slotComponent: CompElem | null = null;
  let startDiCommentNode;
  let startDiCommentNodeStack: Comment[] = [];
  let startDiStack = [];
  let startDiUpdatePointStack = [];
  let updatePointsStack = [updatePoints]
  let varStack = []
  let varIndexStack = []
  while ((currentNode = nodeIterator.nextNode())) {
    if (currentNode instanceof HTMLElement || currentNode instanceof SVGElement) {
      if (currentNode instanceof CompElem) {
        slotComponent = currentNode
      } else {
        if (!slotComponent?.contains(currentNode)) {
          slotComponent = null;
        }
      }
      let props: Record<string, any> = {};
      let attrs = toArray<Attr>(currentNode.attributes);
      for (let i = 0; i < attrs.length; i++) {
        const attr = attrs[i];
        let { name, value } = attr;
        if (name === SLOT_KEY_PROPS) {
          let slotName = currentNode.getAttribute('name') || 'default'
          if (slotComponent) {
            let ary = slotComponent._slotsPropMap[slotName]
            if (!ary) {
              ary = slotComponent._slotsPropMap[slotName] = []
            }
            ary.push(currentNode)
          }
        }//endif
        if (startsWith(name, PLACEHOLDER_PREFFIX)) {
          let val = vars[varIndex];
          //support directive only for now
          if (val instanceof DirectiveWrapper) {
            val.checkScope(EnterPointType.TAG)
            let point = new EnterPoint(
              currentNode,
              name.substring(1),
              EnterPointType.TAG
            );
            val.point = point

            val.di.slotComponent = slotComponent!;
            val.di.renderComponent = component

            let po = new UpdatePoint(varIndex, currentNode)
            po.isDirective = true;
            po.value = val;
            po.isComponent = !!slotComponent

            updatePoints.push(po)

            varIndex++;

            val.di.created(point, ...val.args)
          }
          currentNode.removeAttribute(name)
          continue;
        }//endif
        //@event.stop.prevent.debounce
        if (name[0] === ATTR_PREFIX_EVENT) {
          let cbk: (ev: Event) => any = (e: Event) => {/* Do nothing */ }

          if (PLACEHOLDER_EXP.test(value)) {
            let val = vars[varIndex];
            if (!isFunction(val)) {
              showTagError(currentNode.tagName,
                `Event '${name}' must be a function`
              );
              continue;
            }
            cbk = val.bind(component)

            let po = new UpdatePoint(varIndex, currentNode, name.replace(/\.|\?|@/, ''), value)
            po.isComponent = !!slotComponent
            po.isEvent = true

            updatePoints.push(po)

            varIndex++;
          }
          addEvent(name.substring(1), cbk, currentNode, component)
          currentNode.removeAttribute(name)
          continue;
        }//endif
        if (name === ATTR_REF) {
          if (PLACEHOLDER_EXP.test(value)) {
            let val = vars[varIndex];
            if (!has(val, 'current')) {
              showTagError(currentNode.tagName,
                `Ref must be a RefObject`
              );
              continue;
            }
            varIndex++;
            val.current = currentNode
          }
          currentNode.removeAttribute(name)
          continue;
        }//endif
        //校验变量必须是表达式
        if (name[0] === ATTR_PREFIX_PROP && !PLACEHOLDER_EXP.test(value)) {
          showTagError(currentNode.tagName,
            `Prop '${name}' must be an interpolation`
          );
          continue;
        }

        if (PLACEHOLDER_EXP.test(value)) {
          let val = vars[varIndex];
          let po = new UpdatePoint(varIndex, currentNode, name.replace(/\.|\?|@/, ''), value)
          po.isComponent = !!slotComponent
          // let add2up = true;
          if (
            name[0] === ATTR_PREFIX_PROP ||
            name[0] === ATTR_PREFIX_BOOLEAN ||
            name[0] === ATTR_PREFIX_REF
          ) {
            if (val instanceof DirectiveWrapper) {
              val.checkScope(EnterPointType.PROP)

              let point = new EnterPoint(
                currentNode,
                name.substring(1),
                EnterPointType.PROP
              );

              val.point = point
              val.slotComponent = slotComponent!;
              po.value = val;
              po.isDirective = true;

              if (val) {
                val.di.created(val.point, ...val.args)
              }
            } else if (name[0] === ATTR_PREFIX_BOOLEAN) {
              po.isToggleProp = true;
              po.value = !!val;
              if (po.value)
                currentNode.setAttribute(name.substring(1), '')
            } else if (name[0] === ATTR_PREFIX_REF) {
              po.value = val;
              let refNames = name.substring(1);

              const [refNamec, prop] = refNames.split(ATTR_PROP_DELIMITER)
              let refName = refNamec
              switch (prop) {
                case 'camel':
                  refName = camelCase(refName)
                  break;
                case 'kebab':
                  refName = kebabCase(refName)
                  break;
                case 'snake':
                  refName = snakeCase(refName)
                  break;
              }
              po.attrName = refName
              currentNode.setAttribute(refName, val)
            } else {
              if (!(currentNode instanceof CompElem) && currentNode.tagName !== 'SLOT') {
                showTagError(currentNode.tagName, `Prop '${name}' can only be set on a CompElem or a slot`)
              } else {
                let propName = camelCase(name.substring(1));
                if (!(propName in currentNode) && currentNode.tagName !== 'SLOT') {
                  showTagError(currentNode.tagName, `Prop '${name}' is not defined in ${currentNode.tagName}`)
                }

                po.value = val;
                po.isProp = true;
                props[propName] = val;
              }
            }
            currentNode.removeAttribute(name)
            val = ''
          } else {
            po.value = val;
            let dw
            if (val instanceof DirectiveWrapper) {
              let type = EnterPointType.ATTR;
              if (name === "class") {
                type = EnterPointType.CLASS;
              } else if (name === "style") {
                type = EnterPointType.STYLE;
              }
              val.checkScope(type)

              po.isDirective = true;
              let point = new EnterPoint(
                currentNode,
                name,
                type
              );
              val.point = point

              val.di.slotComponent = slotComponent!;
              val.di.renderComponent = component

              dw = val
              // val.di.created(point, ...val.args)
              val = ''
            }
            value = replace(value, PLACEHOLDER_EXP, val)
            //回填
            attr.value = value;
            if (dw) {
              dw.di.created(dw.point, ...dw.args)
            }

          }
          // if (add2up)
          updatePoints.push(po)
          varIndex++;
        }//endif
      }//endfor
      if (currentNode instanceof CompElem) {
        currentNode._initProps(props)
      } else if (currentNode instanceof HTMLSlotElement) {
        component._bindSlot(currentNode, currentNode.name || 'default', props)
      }
    } else {
      let comment = currentNode as Comment;
      let ph = `<!--${comment.nodeValue}-->`
      if (ph === PLACEHOLDER_DI_START) {
        if (startDiCommentNode) {
          startDiCommentNodeStack.push(startDiCommentNode)
        }
        startDiCommentNode = comment

        let val = vars[varIndex];
        let po = new UpdatePoint(varIndex, currentNode)
        po.isComponent = !!slotComponent
        po.isDirective = true;
        po.value = val
        let pType = slotComponent ? EnterPointType.SLOT : EnterPointType.TEXT
        let point = new EnterPoint(
          startDiCommentNode,
          "",
          pType
        );
        val.point = point
        val.di.slotComponent = slotComponent!;
        val.di.renderComponent = component
        startDiStack.push(val)

        updatePoints.push(po)
        startDiUpdatePointStack.push(po)
        //stack updatePoints
        updatePoints = []
        updatePointsStack.push(updatePoints)

        varIndex++;
        //stack vars
        varIndexStack.push(varIndex)
        varStack.push(vars)
        vars = val._renderVars
        varIndex = 0

        continue;
      } else if (ph === PLACEHOLDER_DI_END) {
        startDiUpdatePointStack.pop()!.textNode = comment
        let startDi = startDiStack.pop()
        startDi.point.endNode = comment;
        //结束时调用created
        startDi.di.created(startDi.point, ...startDi.args)
        startDiCommentNode = startDiCommentNodeStack.pop()

        startDi.di.__updatePoints = updatePoints
        updatePointsStack.pop()
        updatePoints = last(updatePointsStack)
        //restore vars
        vars = varStack.pop()!
        varIndex = varIndexStack.pop()!
      } else if (ph === PLACEHOLDER_TMPL_START) {
        if (startDiCommentNode) {
          startDiCommentNodeStack.push(startDiCommentNode)
        }
        startDiCommentNode = comment

        let val = vars[varIndex];
        let po = new UpdatePoint(varIndex, currentNode)
        po.isComponent = !!slotComponent
        po.isTmpl = true;
        let parentDi = last(startDiStack)
        if (parentDi && get(parentDi, 'diClass.name') === 'ForEach') {
          po.key = val.getKey();
        } else if (viewContext.constructor.name == 'ForEach') {
          po.key = val.getKey();
        }

        val = po.value = new SubView(val)
        let pType = slotComponent ? EnterPointType.SLOT : EnterPointType.TEXT
        let point = new EnterPoint(
          startDiCommentNode,
          "",
          pType
        );
        val.point = point
        val.slotComponent = slotComponent!;
        val.renderComponent = component
        startDiStack.push(val)

        updatePoints.push(po)
        startDiUpdatePointStack.push(po)
        //stack updatePoints
        updatePoints = []
        updatePointsStack.push(updatePoints)

        varIndex++;
        //stack vars
        varIndexStack.push(varIndex)
        varStack.push(vars)
        vars = val._renderVars
        varIndex = 0

        continue;
      } else if (ph === PLACEHOLDER_TMPL_END) {
        startDiUpdatePointStack.pop()!.textNode = comment
        let startDi = startDiStack.pop()
        startDi.point.endNode = comment;
        startDiCommentNode = startDiCommentNodeStack.pop()
        startDi.__updatePoints = updatePoints
        updatePointsStack.pop()
        updatePoints = last(updatePointsStack)
        //restore vars
        vars = varStack.pop()!
        varIndex = varIndexStack.pop()!
      }
      if (ph !== PLACEHOLDER) {
        continue;
      }
      let po = new UpdatePoint(varIndex, currentNode)
      updatePoints.push(po)

      po.isComponent = !!slotComponent
      po.isText = true;

      let val = vars[varIndex];
      let startComment: Comment;
      //插入start占位符
      startComment = document.createComment(
        `compelem-ui-${varIndex}-child-start`
      );
      comment.parentNode!.insertBefore(startComment, comment);
      comment.nodeValue = `compelem-ui-${varIndex}-child-end`;
      po.textNode = startComment
      if (val instanceof DirectiveWrapper) {
        po.isDirective = true;
        po.value = val;

        let pType = slotComponent ? EnterPointType.SLOT : EnterPointType.TEXT
        // directives.push(val)
        let point = new EnterPoint(
          startComment,
          "",
          pType
        );
        point.endNode = comment;

        val.point = point
        val.di.slotComponent = slotComponent!;
        val.di.renderComponent = component

        val.di.created(point, ...val.args)
        val = ''
      } else if (val instanceof Template) {
        po.isTmpl = true;
        po.value = val;
        let [html, vars] = buildHTML(component, val)
        val = buildTmplate(updatePoints, html, vars, component, viewContext)

      } else {
        po.value = val
      }
      varIndex++;

      if (isUndefined(val)) continue;
      if (val instanceof NodeList) {
        let fragment = document.createDocumentFragment();
        fragment.append(...val);
        comment.parentNode!.insertBefore(fragment, comment);
      } else if (val instanceof Element) {
        comment.parentNode!.insertBefore(val, comment);
      } else if (trim(val)) {
        let text = document.createTextNode(val);
        comment.parentNode!.insertBefore(text, comment);
      }
    }
  }
  return container.childNodes;
}

export const DomUtil = {
  insertBefore: function (node: Node, newNodes: any[]) {
    if (!node.parentNode) return;

    let fragment = document.createDocumentFragment();
    fragment.append(...newNodes);
    node.parentNode!.insertBefore(fragment, node);
  },
  remove: function (startNode: Node, endNode: Node) {
    if (startNode === endNode) {
      startNode?.parentNode?.removeChild(startNode)
      return;
    }
    let nextNode = startNode.nextSibling
    while (nextNode && nextNode !== endNode) {
      nextNode?.parentNode?.removeChild(nextNode)
      nextNode = startNode.nextSibling
    }
  }
}

//////////////////////////////////////////////////// interfaces
/**
 * 标签函数，用于构建模板
 * @param strings
 * @param vars
 */
export function html(
  strings: TemplateStringsArray,
  ...vars: any
): Template {
  return new Template(
    isString(strings) ? ([strings] as any) : strings,
    vars
  );
}

const EXP_STR = /([a-z0-9"'])\s*>\s*</img
export interface RefObject<T> {
  current: T
}
/**
 * 使用初始值创建一个引用对象
 * @param initValue 
 * @returns 
 */
export function createRef<T>(initValue?: any) {
  return { current: initValue } as RefObject<T>
}