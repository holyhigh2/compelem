import {
  camelCase,
  concat,
  each,
  get,
  isArray,
  isBlank,
  isDefined,
  isEqual,
  isFunction,
  isObject,
  isString,
  isSymbol,
  join,
  kebabCase,
  map,
  replace,
  replaceAll,
  set,
  size,
  snakeCase,
  split,
  startsWith,
  toArray,
  toString
} from "myfx";
import { CompElem } from "../CompElem";
import { DefinitionTagMap, PATH_SEPARATOR } from "../constants";
import {
  DI_COMMENT_START_NODE_MAP,
  TextOrSlotDirectiveExecutorMap,
  updateDirective
} from "../directive/index";
import { Collector } from "../reactive";
import { DirectiveInstance, EnterPointType, UpdatePoint } from "../types";
import { DomUtil, getSlotComponent, showError, showTagError } from "../utils";
import { CssTemplate } from "./CssTemplate";
import { Template } from "./Template";

export const ATTR_PREFIX_EVENT = "@";
export const ATTR_PREFIX_PROP = ".";
export const ATTR_PREFIX_BOOLEAN = "?";
export const ATTR_PREFIX_REF = "*";
export const ATTR_PROP_DELIMITER = ":";
export const ATTR_REF = "ref";
export const ATTR_KEY = "key";

const EXP_TAG_CONVERT = /(<\/?)\s*([A-Z][A-Za-z0-9]*)([\s>])/gm
const EXP_ATTR_CONVERT = /\s+([\.?@*])?((?:[a-zA-Z]*[A-Z][^\s<>="']+))(?=[\s=>])/gm
const EXP_ATTR_CHECK = /[.?-a-z]+\s*=\s*(['"])\s*([^='"]*<\!--c_ui-pl_df-->){2,}.*?\1/ims;
const EXP_PLACEHOLDER = /<\s*[a-z0-9-]+([^>]*<\!--c_ui-pl_df-->)*[^>]*?(?<!-)>/imgs;
const SLOT_KEY_PROPS = 'slot-props'
const HTML_TMPL_CACHE: Record<string, string> = {}

/**
 * 提供渲染函数相关操作
 * @author holyhigh2
 */

export function buildHTML(
  component: CompElem,
  tmpl: Template
): [string, any[]] {
  let html = "";
  let vars = concat(tmpl.vars)
  let l = tmpl.strings.length - 1;
  let vl = tmpl.vars.length - 1
  let varIndex = 0
  for (let i = 0; i <= l; i++) {
    const str = tmpl.strings[i];
    let val = get<any>(vars, varIndex, '');

    if (val instanceof Template) {
      let [h, v] = buildHTML(component, val)
      val = h

      vars.splice(varIndex, 1, ...v)
      varIndex += v.length - 1
    }
    else {
      val = i > vl ? "" : PLACEHOLDER;
    }

    varIndex++
    html = html + str + val;
  }

  if (process.env.DEV) {
    //attr check
    let rs = html.match(EXP_ATTR_CHECK)
    if (rs) {
      let errorMsg = replaceAll(rs![0], PLACEHOLDER, '${...}')
      showError(`Parse error: attribute value can be set only one interpolation —— \n ${errorMsg}`)
      return ['', vars];
    }
  }

  let i = 0;
  html = html.replace(EXP_PLACEHOLDER, (a: string, b: string) => {
    let rs = replaceAll(a, PLACEHOLDER, () => PLACEHOLDER.replace('-->', '') + (i++))
    return rs
  })
  html = html.replace(EXP_STR, '$1><').trim()

  html = convertHTML(html)

  return [html, vars];
}
export function convertHTML(html: string) {
  if (!isString(html)) return html + ''
  //attr convert
  html = html.replace(EXP_ATTR_CONVERT, (a: string, b: string, c: string) => {
    return ` ${b ?? ''}${kebabCase(c)}`
  })
  //tag convert
  html = html.replace(EXP_TAG_CONVERT, (a: string, b: string, c: string, d: string) => {
    let tag = DefinitionTagMap[c]
    return b + tag + d
  })
  return html
}
function buildVars(
  component: CompElem,
  tmpl: Template) {
  let vars = concat(tmpl.vars)
  let l = tmpl.strings.length - 1;
  for (let i = 0; i <= l; i++) {
    let val = get<any>(tmpl.vars, i, '');
    if (val instanceof Template) {
      // let [h, v] = buildHTML(component, val)
      let vs = buildVars(component, val)

      vars.splice(i, 1, ...vs)
    }
  }
  return vars
}

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
  renderComponent: CompElem,
  isDirective = false
): NodeListOf<ChildNode> {
  const container = document.createElement("div");
  container.innerHTML = html
  let NodeSn = 0
  let evList: Array<[string, Function, Node, Function?]> | undefined = renderComponent._eventList
  if (!evList) {
    evList = renderComponent._eventList = []
  }

  //遍历dom
  const nodeIterator = document.createNodeIterator(
    container,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT
  );
  let currentNode: any;
  let varIndex = 0;
  let slotComponent: CompElem | undefined;

  let keyNode: Element | null = null
  let keyVal = ''
  while ((currentNode = nodeIterator.nextNode())) {
    NodeSn++
    if (slotComponent && !slotComponent.contains(currentNode)) {
      slotComponent = undefined;
    }
    if (currentNode instanceof HTMLElement || currentNode instanceof SVGElement) {
      if (currentNode instanceof CompElem) {
        slotComponent = currentNode
      }
      let props: Record<string, any> = {};
      let attrs = toArray<Attr>(currentNode.attributes);

      for (let i = 0; i < attrs.length; i++) {
        const attr = attrs[i];
        let { name, value } = attr;
        //todo 这里需要修改为 data-slot-xx
        if (name === SLOT_KEY_PROPS) {
          // let slotName = currentNode.getAttribute('name') || 'default'
          if (slotComponent) {
            // let ary = slotComponent._slotsPropMap[slotName]
            // if (!ary) {
            //   ary = slotComponent._slotsPropMap[slotName] = []
            // }
            // ary.push(currentNode)
          }
          // varCacheQueue && varCacheQueue.push({ type: VarType.AttrSlot, name: slotName, attrName: name })
          continue
        }//endif
        if (startsWith(name, PLACEHOLDER_PREFFIX)) {
          let val = vars[varIndex];
          //support directive only for now
          if (isArray(val) && isSymbol(val[0])) {
            let [, args, executor, checker, varChain] = val as DirectiveInstance
            checker(EnterPointType.TAG)

            let po = new UpdatePoint(varIndex, new WeakRef(currentNode))
            po.isDirective = true;
            po.value = val;
            po.isComponent = !!slotComponent
            updatePoints.push(po)

            if (keyNode && keyNode?.contains(currentNode)) {
              po.key = keyVal
            }

            varIndex++;

            executor(currentNode, args, undefined, { renderComponent, slotComponent, varChain })
          }
          currentNode.removeAttribute(name)
          continue;
        }//endif
        //@event.stop.prevent.debounce
        if (name[0] === ATTR_PREFIX_EVENT) {

          let val;
          let hasValue = false
          if (PLACEHOLDER_EXP.test(value)) {
            let po = new UpdatePoint(varIndex)
            po.isPlaceholder = true;
            if (keyNode && keyNode?.contains(currentNode)) {
              po.key = keyVal
            }
            updatePoints.push(po)

            val = vars[varIndex];
            if (process.env.DEV && !isFunction(val)) {
              showTagError(currentNode.tagName,
                `Event '${name}' must be a function`
              );
              continue;
            }

            varIndex++;
            hasValue = true
          }
          let evName = name.substring(1)
          evList.push([evName, val!, currentNode])

          currentNode.removeAttribute(name)
          continue;
        }//endif
        if (name === ATTR_REF) {
          if (PLACEHOLDER_EXP.test(value)) {
            let val = vars[varIndex];
            if (process.env.DEV && !(val instanceof RefObject)) {
              showTagError(currentNode.tagName,
                `Ref must be a RefObject`
              );
              continue;
            }

            let po = new UpdatePoint(varIndex)
            po.isPlaceholder = true;
            if (keyNode && keyNode?.contains(currentNode)) {
              po.key = keyVal
            }
            updatePoints.push(po)

            varIndex++;
            val.__setRef(new WeakRef(currentNode))
          }
          currentNode.removeAttribute(name)
          continue;
        }//endif
        if (name === ATTR_KEY) {
          let val = vars[varIndex];
          currentNode.setAttribute(name, val)

          let po = new UpdatePoint(varIndex)
          po.isPlaceholder = true;
          if (keyNode && keyNode?.contains(currentNode)) {
            po.key = keyVal
          }
          updatePoints.push(po)

          varIndex++;
          keyNode = currentNode
          keyVal = val

          if (updatePoints.length > 0) {
            updatePoints.forEach(up => {
              up.key = up.key ?? val
            })
          }
          continue
        }//endif
        //校验变量必须是表达式
        if (process.env.DEV && name[0] === ATTR_PREFIX_PROP && !PLACEHOLDER_EXP.test(value)) {
          showTagError(currentNode.tagName,
            `Prop '${name}' must be an interpolation`
          );
          continue;
        }

        if (PLACEHOLDER_EXP.test(value)) {
          let val = vars[varIndex];
          let po = new UpdatePoint(varIndex, new WeakRef(currentNode), name.replace(/\.|\?|@/, ''), value)
          po.isComponent = !!slotComponent
          if (keyNode && keyNode?.contains(currentNode)) {
            po.key = keyVal
          }
          let varCacheObj: Record<string, any> | null = null
          if (
            name[0] === ATTR_PREFIX_PROP ||
            name[0] === ATTR_PREFIX_BOOLEAN ||
            name[0] === ATTR_PREFIX_REF
          ) {
            if (isArray(val) && isSymbol(val[0])) {
              let [, args, executor, checker, varChain] = val as DirectiveInstance
              checker(EnterPointType.PROP)

              let attrName = name.substring(1)
              executor(currentNode, args, undefined, { renderComponent, slotComponent, varChain, attrName })

              po.value = val;
              po.isDirective = true;
            } else if (name[0] === ATTR_PREFIX_BOOLEAN) {
              po.isToggleProp = true;
              po.value = !!val;
              let attrName = name.substring(1)
              if (po.value)
                currentNode.setAttribute(attrName, val)
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
              if (process.env.DEV && !(currentNode instanceof CompElem) && currentNode.tagName !== 'SLOT') {
                showTagError(currentNode.tagName, `Prop '${name}' can only be set on a CompElem or a slot`)
              } else {
                let propName = camelCase(name.substring(1));
                if (process.env.DEV && !(propName in currentNode) && currentNode.tagName !== 'SLOT') {
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
            let executor
            let args

            if (isArray(val) && isSymbol(val[0])) {
              let type = EnterPointType.ATTR;
              if (name === "class") {
                type = EnterPointType.CLASS;
              } else if (name === "style") {
                type = EnterPointType.STYLE;
              }

              let [, ags, exec, checker] = val as DirectiveInstance
              if (process.env.DEV) {
                checker(type)
              }

              po.isDirective = true;
              po.attrName = name

              args = ags
              executor = exec

              val = ''

            }
            value = replace(value, PLACEHOLDER_EXP, val)
            //回填
            attr.value = value;
            if (isDefined(value)) {
              currentNode.setAttribute(name, value)
            }

            executor && executor(currentNode, args!, undefined, { renderComponent, slotComponent })
          }

          updatePoints.push(po)
          varIndex++;
        }//endif
      }//endfor
      if (currentNode instanceof CompElem) {
        currentNode._regWrapper(renderComponent)
        if (size(props) > 0)
          currentNode._initProps(props)
      } else if (currentNode instanceof HTMLSlotElement) {
        renderComponent._bindSlot(currentNode, currentNode.name || 'default', props)
      }
    } else {
      let comment = currentNode as Comment;
      let ph = `<!--${comment.nodeValue}-->`

      if (ph !== PLACEHOLDER) {
        continue;
      }
      let po = new UpdatePoint(varIndex, new WeakRef(currentNode))
      if (keyNode && keyNode?.contains(currentNode)) {
        po.key = keyVal
      }
      updatePoints.push(po)

      po.isComponent = !!slotComponent
      po.isText = true;

      let val = vars[varIndex];

      let varCacheObj: Record<string, any> | null = null
      if (isArray(val) && isSymbol(val[0])) {
        const diName = Symbol.keyFor(val[0] as symbol)
        //插入start占位符
        let startComment: Comment;
        startComment = document.createComment(
          `compelem-${renderComponent.tagName}-${diName}-start`
        );
        comment.parentNode!.insertBefore(startComment, comment);
        comment.nodeValue = `compelem-${renderComponent.tagName}-${diName}-end`;
        (comment as any)._diName = diName

        DI_COMMENT_START_NODE_MAP.set(comment, startComment)

        po.isDirective = true;
        po.value = val;

        let pType = slotComponent ? EnterPointType.SLOT : EnterPointType.TEXT

        let [, args, executor, checker, varChain] = val as DirectiveInstance
        checker(pType)

        po.directiveOldValue = [args, varChain]
        Collector.start()
        let tmpl = executor(comment, args, undefined, { renderComponent, slotComponent, varChain })!
        Collector.end(renderComponent, po)

        //render
        if (tmpl) {
          let nodes = buildSubView(comment, tmpl[1]!, renderComponent, po)
          let len = nodes.length
          if (nodes && len > 0) {
            DomUtil.insertBefore(comment, Array.from(nodes))
          }
        }

        val = undefined

      } else {
        po.value = val
        po.node = null as any

      }
      varIndex++;

      if (!po.isDirective) {
        let text = toString(val ?? '')
        let textDom = document.createTextNode(text);
        comment.parentNode!.insertBefore(textDom, comment);
        comment.remove()
        currentNode = textDom
        po.node = new WeakRef(textDom)
      }
    }
    if (keyNode && !keyNode.contains(currentNode) && keyNode !== currentNode) {
      keyNode = null
      keyVal = ''
    }
  }
  return container.childNodes;
}

export function buildView(
  tmpl: Template,
  component: CompElem<any>): NodeListOf<ChildNode> {

  let updatePoints: UpdatePoint[] = []
  let nodes
  if (HTML_TMPL_CACHE[component.tagName]) {
    let htmlTmpl = HTML_TMPL_CACHE[component.tagName]
    let vars = buildVars(component, tmpl)
    nodes = buildTmplate(updatePoints, htmlTmpl, vars, component);
  } else {
    let [html, vars] = buildHTML(component, tmpl);
    HTML_TMPL_CACHE[component.tagName] = html
    nodes = buildTmplate(updatePoints, html, vars, component);
  }

  component.__updateTree = updatePoints
  return nodes
}
export function buildSubView(pointNode: Comment, tmpl: Template, component: CompElem<any>, po: UpdatePoint, bindEvent = false) {
  let [html, vars] = buildHTML(component, tmpl!);
  let updatePoints: UpdatePoint[] = []
  let nodes = buildTmplate(updatePoints, html, vars, component, true);

  if (bindEvent)
    component.__bindEvents()

  updatePoints.forEach(up => {
    po.insert(up)
  })
  return nodes
}

export function updateView(tmpl: Template, renderComponent: CompElem<any>, updatePoints: UpdatePoint[], changedKeys?: string[]): void {
  if (isBlank(join(tmpl.strings))) return;
  let vars = tmpl.flatVars(renderComponent)
  for (let i = 0; i < updatePoints.length; i++) {
    const up = updatePoints[i];
    let varIndex = up.varIndex;
    if (varIndex < 0) continue;
    if (up.isPlaceholder) continue
    if (up.__destroyed) continue
    let oldValue = up.value;
    let newValue: any = vars;
    let node = up.node.deref();
    if (!node) continue

    let indexSegs = split(varIndex, PATH_SEPARATOR)
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
      //指令
      let [, oldArgs, executor, , varChain] = up.value

      if (!isArray(newValue)) continue
      let slotComponent = getSlotComponent(node!, renderComponent)

      let [, newArgs] = newValue

      const tsUp = null//renderComponent.__subScopes?.get(node!)
      if (tsUp) {
        // tsUp.value = newValue
        up.directiveOldValue![0] = newArgs
      }

      updateDirective(node!, newArgs as any[], oldArgs, executor, renderComponent, slotComponent, varChain, up)
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
        renderComponent._updateSlot(node.getAttribute('name') || 'default', up.attrName, newValue)
      }
    } else if (up.attrName) {
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
    }
    else if (up.isText) {
      let textNode = up.node!
      textNode.deref()!.textContent = toString(newValue ?? '')
    }
    up.value = newValue
  }//endfor
  // tmpl.destroy()
}

export function updateSubScopeView(subScopeUpdatePoint: UpdatePoint, renderComponent: CompElem<any>, tmpl?: Template, changedKeys?: string[]): void {
  if (!subScopeUpdatePoint) return
  let node = subScopeUpdatePoint.node.deref()

  const executor = TextOrSlotDirectiveExecutorMap.get((node as any)._diName)!

  let slotComponent = getSlotComponent(node!, renderComponent)
  const [oldArgs, varChain] = subScopeUpdatePoint.directiveOldValue!
  if (!tmpl) {
    let rs = executor(node!, subScopeUpdatePoint.value[1], oldArgs, { renderComponent, slotComponent, varChain })!
    if (!rs) return
    tmpl = rs[1]
  }

  if (!tmpl) return
  //合并
  if (tmpl.vars[0] instanceof Template) {
    let tStrAry = []
    let tVarAry: any[] = []
    each(tmpl.vars, v => {
      tVarAry.push(...v.vars)
      tStrAry.push(...map(v.vars, v => '1'))
    })
    tStrAry.push('1')
    tmpl = new Template(tStrAry, tVarAry)
  }

  updateView(tmpl, renderComponent, subScopeUpdatePoint.children!, changedKeys)
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

/**
 * 标签函数，用于构建样式
 * @param strings
 * @param vars
 */
export function css(
  strings: TemplateStringsArray,
  ...vars: any
): CssTemplate {
  return new CssTemplate(
    isString(strings) ? ([strings] as any) : strings,
    vars
  );
}

const EXP_STR = /([a-z0-9"'])\s*>\s*</img

class RefObject<T extends Node> {
  #ref: WeakRef<T>

  get current(): T | undefined {
    return this.#ref?.deref()
  }

  __setRef(ref: WeakRef<T>) {
    this.#ref = ref
  }
}
/**
 * 使用初始值创建一个引用对象
 * @param initValue 
 * @returns 
 */
export function createRef<T extends Node>() {
  return new RefObject<T>()
}