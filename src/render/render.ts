import {
  camelCase,
  concat,
  each,
  get,
  has,
  isArray,
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
  toString,
  trim,
  trimEnd,
  trimStart
} from "myfx";
import { CompElem } from "../CompElem";
import {
  DirectiveWrapper,
  EnterPoint,
  EnterPointType,
} from "../directive/index";
import { addEvent } from "../events/event";
import { ExpPos } from "../types";
import { showError, showTagError } from "../utils";

export const ATTR_PREFIX_EVENT = "@";
export const ATTR_PREFIX_PROP = ".";
export const ATTR_PREFIX_BOOLEAN = "?";
export const ATTR_PREFIX_REF = "*";
export const ATTR_PROP_DELIMITER = ":";
export const ATTR_REF = "ref";

const EXP_ATTR_CHECK = /[.?-a-z]+\s*=\s*(['"])\s*([^='"]*<\!--l_ui-pl_df-->){2,}.*?\1/ims;
const EXP_PLACEHOLDER = /<\s*[a-z0-9-]+([^>]*<\!--l_ui-pl_df-->)*[^>]*?(?<!-)>/imgs;
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
 * @param tmpl
 * @param slotArgs
 * @returns
 */
export function buildHTML(
  tmpl: Template | Template[]
) {
  let html = "";
  let tmplList = isArray(tmpl) ? tmpl : [tmpl];
  tmplList.forEach(({ strings, vars }) => {
    let strList = toArray<string>(strings);
    strList[0] = trimStart(strList[0]);
    strList[strList.length - 1] = trimEnd(strList[strList.length - 1]);

    let l = strList.length - 1;
    strList.forEach((str, i: number) => {
      let val = get<any>(vars, i, "");
      val = l === i ? "" : PLACEHOLDER;

      html += str + val;
    });
  });

  //attr check
  let rs = html.match(EXP_ATTR_CHECK)
  if (rs) {
    let errorMsg = replaceAll(rs[0], PLACEHOLDER, '${...}')
    showError(`Parse error: attribute value can be set only one interpolation —— \n ${errorMsg}`)
    return '';
  }

  let i = 0;
  html = html.replace(EXP_PLACEHOLDER, (a: string, b: string) => {
    let rs = replaceAll(a, PLACEHOLDER, () => PLACEHOLDER.replace('-->', '') + (i++))
    return rs
  })

  return html;
}
const PLACEHOLDER = "<!--l_ui-pl_df-->";
const PLACEHOLDER_PREFFIX = "<!--l_ui-pl_df";
export const PLACEHOLDER_EXP = /<!--l_ui-pl_df\d*(-->)?/
/**
 * 构建模板为DOM结构
 * @param html
 */
export function buildTmplate(
  expPos: Record<string, ExpPos>,
  directives: Array<DirectiveWrapper>,
  html: string,
  vars: any[],
  component: CompElem,
  slotArgs?: Record<string, any>,
  level = 0,
  expressionChain = ''
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
      each(attrs, (attr) => {
        let { name, value } = attr;
        if (name === SLOT_KEY_PROPS) {
          let slotName = currentNode.name || 'default'
          if (slotComponent) {
            let ary = slotComponent._slotsPropMap[slotName]
            if (!ary) {
              ary = slotComponent._slotsPropMap[slotName] = []
            }
            ary.push(currentNode)
          }
        }
        if (startsWith(name, PLACEHOLDER_PREFFIX)) {
          let val = vars[varIndex];
          //support directive only for now
          if (val instanceof DirectiveWrapper) {
            val.checkScope(EnterPointType.TAG)
            let point = new EnterPoint(
              level,
              currentNode,
              name.substring(1),
              EnterPointType.TAG
            );
            val.point = point
            val.varPath = expressionChain + varIndex;
            val.slotComponent = slotComponent!;
            directives.push(val)
            let pos = expPos[expressionChain + varIndex] = new ExpPos(expressionChain + varIndex, currentNode);
            pos.isDirective = true;
            pos.value = val;
            pos.isComponent = !!slotComponent
            varIndex++;
          }
          currentNode.removeAttribute(name)
          return;
        }
        //@event.stop.prevent.debounce
        if (name[0] === ATTR_PREFIX_EVENT) {
          let cbk: (ev: Event) => any = (e: Event) => {/* Do nothing */ }
          let pos = null
          if (PLACEHOLDER_EXP.test(value)) {
            let val = vars[varIndex];
            if (!isFunction(val)) {
              showTagError(currentNode.tagName,
                `Event '${name}' must be a function`
              );
              return;
            }
            cbk = val.bind(component)

            pos = expPos[expressionChain + varIndex] = new ExpPos(expressionChain + varIndex, currentNode, name.replace(/\.|\?|@/, ''), value);
            pos.isComponent = !!slotComponent

            varIndex++;
          }
          let parts = name.substring(1).split('.');
          let evName = parts.shift()!;
          cbk = addEvent(name.substring(1), cbk, currentNode, component)
          currentNode.removeAttribute(name)

          if (pos) {
            pos.eventName = evName!;
            pos.value = cbk
          }
          return;
        }
        if (name === ATTR_REF) {
          if (PLACEHOLDER_EXP.test(value)) {
            let val = vars[varIndex];
            if (!has(val, 'current')) {
              showTagError(currentNode.tagName,
                `Ref must be a RefObject`
              );
              return;
            }
            varIndex++;
            val.current = currentNode
          }
          currentNode.removeAttribute(name)
          return;
        }
        //校验变量必须是表达式
        if (name[0] === ATTR_PREFIX_PROP && !PLACEHOLDER_EXP.test(value)) {
          showTagError(currentNode.tagName,
            `Prop '${name}' must be an interpolation`
          );
          return;
        }

        if (PLACEHOLDER_EXP.test(value)) {
          let val = vars[varIndex];
          let pos = expPos[expressionChain + varIndex] = new ExpPos(expressionChain + varIndex, currentNode, name.replace(/\.|\?|@/, ''), value);
          pos.isComponent = !!slotComponent
          if (
            name[0] === ATTR_PREFIX_PROP ||
            name[0] === ATTR_PREFIX_BOOLEAN ||
            name[0] === ATTR_PREFIX_REF
          ) {
            if (val instanceof DirectiveWrapper) {
              val.checkScope(EnterPointType.PROP)
              directives.push(val)
              let point = new EnterPoint(
                level,
                currentNode,
                name.substring(1),
                EnterPointType.PROP
              );
              val.varPath = expressionChain + varIndex;
              val.point = point
              val.slotComponent = slotComponent!;
              pos.value = val;
              pos.isDirective = true;
            } else if (name[0] === ATTR_PREFIX_BOOLEAN) {
              pos.isToggleProp = true;
              pos.value = !!val;
              if (pos.value)
                currentNode.setAttribute(name.substring(1), '')
            } else if (name[0] === ATTR_PREFIX_REF) {
              pos.value = val;
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
              pos.attrName = refName
              currentNode.setAttribute(refName, val)

            } else {
              if (!(currentNode instanceof CompElem) && currentNode.tagName !== 'SLOT') {
                showTagError(currentNode.tagName, `Prop '${name}' can only be set on a CompElem or a slot`)
                delete expPos[expressionChain + varIndex]
              } else {
                let propName = camelCase(name.substring(1));
                if (!(propName in currentNode) && currentNode.tagName !== 'SLOT') {
                  showTagError(currentNode.tagName, `Prop '${name}' is not defined in ${currentNode.tagName}`)
                }

                pos.value = val;
                pos.isProp = true;
                props[propName] = val;
              }
            }

            currentNode.removeAttribute(name)
            val = ''
          } else {
            pos.value = val;
            if (val instanceof DirectiveWrapper) {
              let type = EnterPointType.ATTR;
              if (name === "class") {
                type = EnterPointType.CLASS;
              } else if (name === "style") {
                type = EnterPointType.STYLE;
              }
              val.checkScope(type)
              directives.push(val)
              pos.isDirective = true;
              let point = new EnterPoint(
                level,
                currentNode,
                name,
                type
              );
              val.point = point
              val.slotComponent = slotComponent!;
              val.varPath = expressionChain + varIndex;
              val = ''
            }
            value = replace(value, PLACEHOLDER_EXP, val)
            //回填
            attr.value = value;
          }

          varIndex++;
        }

      });

      if (currentNode instanceof CompElem) {
        // currentNode._setParentProps(props)
        currentNode._initProps(props)
      } else if (currentNode instanceof HTMLSlotElement) {
        component._bindSlot(currentNode, currentNode.name || 'default', props)
      }
    } else {
      let comment = currentNode as Comment;
      if (`<!--${comment.nodeValue}-->` !== PLACEHOLDER) {
        continue;
      }
      let pos = expPos[expressionChain + varIndex] = new ExpPos(expressionChain + varIndex, currentNode);
      pos.isComponent = !!slotComponent
      pos.isText = true;

      let val = vars[varIndex];
      let startComment: Comment;
      //插入start占位符
      startComment = document.createComment(
        `compelem-ui-${level}-${varIndex}-child-start`
      );
      comment.parentNode!.insertBefore(startComment, comment);
      comment.nodeValue = `compelem-ui-${level}-${varIndex}-child-end`;
      pos.textNode = startComment
      if (val instanceof DirectiveWrapper) {
        pos.isDirective = true;
        pos.value = val;

        let pType = slotComponent ? EnterPointType.SLOT : EnterPointType.TEXT
        directives.push(val)
        let point = new EnterPoint(
          level,
          startComment,
          "",
          pType
        );
        point.endNode = comment;
        val.point = point
        val.slotComponent = slotComponent!;
        val.varPath = expressionChain + varIndex;
        val = ''
      } else if (val instanceof Template) {
        pos.isTmpl = true;
        pos.value = val;
        let html = buildHTML(val)
        val = buildTmplate(expPos, directives, html, val.vars, component, slotArgs, level, expressionChain + `${varIndex}-`)

      } else {
        pos.value = val
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
    let fragment = document.createDocumentFragment();
    fragment.append(...newNodes);
    node.parentNode!.insertBefore(fragment, node);
  },
  remove: function (startNode: Node, endNode: Node) {
    let nextNode = startNode.nextSibling
    while (nextNode !== endNode) {
      nextNode?.parentNode?.removeChild(nextNode)
      nextNode = startNode.nextSibling
    }
  }
}

const EXP_KEY = /\s+\.?key\s*=/;
export class Template {
  strings: Array<string>;
  vars: Array<any>;
  //如果模板仅有一个root节点且含有key属性
  key: string;
  constructor(strings: Array<string>, vars: Array<any>) {
    this.strings = concat(strings);
    this.vars = vars;
  }
  //解析模板中的key
  getKey() {
    let vars = this.vars
    let k = ''
    each(this.strings, (str, i) => {
      if (EXP_KEY.test(str)) {
        k = toString(vars[i])
        return false
      }
    })
    this.key = k
    return k
  }
  /**
   * 追加tmpl
   * 交接处模板进行合并
   * @param tmpl
   */
  append(tmpl: Template) {
    let lastStr = last(this.strings);

    tmpl.strings.forEach((str, i) => {
      if (i == 0) {
        this.strings[this.strings.length - 1] = lastStr + str;
        return;
      }
      this.strings.push(str);
    });
    this.vars = concat(this.vars, tmpl.vars);
    return this;
  }
  /**
   * 获取html字符串
   */
  getHTML() {
    let html = '';
    let strList = toArray<string>(this.strings);
    strList[0] = trimStart(strList[0]);
    strList[strList.length - 1] = trimEnd(strList[strList.length - 1]);

    let l = strList.length - 1;
    strList.forEach((str, i: number) => {
      let val = get<any>(this.vars, i, "");
      if (val instanceof Template) {
        val = val.getHTML();
      } else {
        val = l === i ? "" : val;
      }

      html += str + val;
    });
    return html;
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