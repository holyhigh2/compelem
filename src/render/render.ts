import {
  camelCase,
  clone,
  concat,
  each,
  get,
  has,
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
import { DEFINED_TAG_MAP } from "../constants";
import {
  EnterPoint,
  updateDirective
} from "../directive/index";
import { addEvent } from "../events/event";
import { Collector, notifyUpdate, OBJECT_VAR_PATH } from "../reactive";
import { DirectiveExecutor, DirectiveInstance, EnterPointType, PATH_SEPARATOR, UpdatePoint } from "../types";
import { showError, showTagError } from "../utils";
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
const HTML_CACHE = new Map<Function, string>()
const DOM_CACHE = new Map<Function, Node>()
const VAR_CACHE = new Map<Function, Record<number, Array<VarPoint>>>()
type VarPoint = { type: VarType, up: UpdatePoint, value?: any, name?: string, point?: EnterPoint, attrName?: string }
enum VarType {
  Event = 'event',
  Directive = 'directive',
  DirectiveTag = 'directiveTag',
  DirectiveAttr = 'directiveAttr',
  DirectiveProp = 'directiveProp',
  DirectiveText = 'directiveText',
  DirectiveSlot = 'directiveSlot',
  Attr = 'attr',
  AttrProp = 'attrProp',
  AttrBool = 'attrBool',
  AttrRef = 'attrRef',
  AttrSlot = 'attrSlot',
  AttrKey = 'key',
  Ref = 'ref',
  Text = 'text'
}
const ComponentUpdatePointsMap = new WeakMap<CompElem, UpdatePoint[]>()
export const DirectiveUpdatePointsMap = new WeakMap<Node, UpdatePoint[]>()
const TextOrSlotDirectiveExecutorMap = new WeakMap<Node, DirectiveExecutor>()
const TextOrSlotDirectiveArgsMap = new WeakMap<Node, Array<any>>()
const TextOrSlotDirectiveUpdatePointMap = new WeakMap<Node, UpdatePoint>()
const DirectiveArgsMap = new WeakMap<Node, Record<string, Array<any>>>()
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
    let tag = DEFINED_TAG_MAP[c]
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
      let [h, v] = buildHTML(component, val)

      vars.splice(i, 1, ...v)
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
  container.innerHTML = html;
  const hasVarChache = VAR_CACHE.has(renderComponent.constructor)
  if (!isDirective && hasVarChache && !DOM_CACHE.has(renderComponent.constructor)) {
    DOM_CACHE.set(renderComponent.constructor, container.cloneNode(true))
  }
  let NodeSn = 0

  //遍历dom
  const nodeIterator = document.createNodeIterator(
    container,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT
  );
  let currentNode: any;
  let varIndex = 0;
  let slotComponent: CompElem | undefined;

  let varCacheMap: Record<number, Array<any>> | undefined = hasVarChache ? undefined : {}
  let keyNode: Element | null = null
  let keyVal = ''
  while ((currentNode = nodeIterator.nextNode())) {
    NodeSn++
    let varCacheQueue: Record<string, any>[] | undefined = hasVarChache ? undefined : []
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
          let slotName = currentNode.getAttribute('name') || 'default'
          if (slotComponent) {
            // let ary = slotComponent._slotsPropMap[slotName]
            // if (!ary) {
            //   ary = slotComponent._slotsPropMap[slotName] = []
            // }
            // ary.push(currentNode)
          }
          varCacheQueue && varCacheQueue.push({ type: VarType.AttrSlot, name: slotName, attrName: name })
          continue
        }//endif
        if (startsWith(name, PLACEHOLDER_PREFFIX)) {
          let val = vars[varIndex];
          //support directive only for now
          if (isArray(val) && isSymbol(val[0])) {
            let [, args, executor, checker, varChain] = val as DirectiveInstance
            checker(EnterPointType.TAG)
            let point = new EnterPoint(
              currentNode,
              name.substring(1),
              EnterPointType.TAG
            );

            let attrMap = DirectiveArgsMap.get(currentNode)
            if (!attrMap) {
              attrMap = {}
              DirectiveArgsMap.set(currentNode, attrMap)
            }
            attrMap[Symbol.keyFor(val[0])!] = [point, renderComponent, slotComponent]

            let po = new UpdatePoint(varIndex, currentNode)
            po.isDirective = true;
            po.value = val;
            po.isComponent = !!slotComponent
            updatePoints.push(po)

            if (keyNode && keyNode?.contains(currentNode)) {
              po.key = keyVal
            }

            varIndex++;

            executor(point, args, undefined, { renderComponent, slotComponent, varChain })

            varCacheQueue && varCacheQueue.push({ type: VarType.DirectiveTag, point, up: po, name })
          }
          currentNode.removeAttribute(name)
          continue;
        }//endif
        //@event.stop.prevent.debounce
        if (name[0] === ATTR_PREFIX_EVENT) {
          let cbk: (ev: Event) => any = (e: Event) => {/* Do nothing */ }

          let po = null
          let hasValue = false
          if (PLACEHOLDER_EXP.test(value)) {
            po = new UpdatePoint(varIndex, currentNode)
            po.notUpdated = true;
            if (keyNode && keyNode?.contains(currentNode)) {
              po.key = keyVal
            }
            updatePoints.push(po)

            let val = vars[varIndex];
            if (process.env.DEV && !isFunction(val)) {
              showTagError(currentNode.tagName,
                `Event '${name}' must be a function`
              );
              continue;
            }
            cbk = val.bind(renderComponent)

            varIndex++;
            hasValue = true
          }
          let evName = name.substring(1)
          addEvent(evName, cbk, currentNode, renderComponent)
          currentNode.removeAttribute(name)

          varCacheQueue && varCacheQueue.push({ type: VarType.Event, up: po, name: evName, attrName: name, value: hasValue })
          continue;
        }//endif
        if (name === ATTR_REF) {
          if (PLACEHOLDER_EXP.test(value)) {
            let val = vars[varIndex];
            if (process.env.DEV && !has(val, 'current')) {
              showTagError(currentNode.tagName,
                `Ref must be a RefObject`
              );
              continue;
            }

            let po = new UpdatePoint(varIndex, currentNode)
            po.notUpdated = true;
            if (keyNode && keyNode?.contains(currentNode)) {
              po.key = keyVal
            }
            updatePoints.push(po)

            varIndex++;
            val.current = currentNode

            varCacheQueue && varCacheQueue.push({ type: VarType.Ref, up: po, attrName: name })
          }
          currentNode.removeAttribute(name)
          continue;
        }//endif
        if (name === ATTR_KEY) {
          let val = vars[varIndex];
          currentNode.setAttribute(name, val)

          let po = new UpdatePoint(varIndex, currentNode)
          po.notUpdated = true;
          if (keyNode && keyNode?.contains(currentNode)) {
            po.key = keyVal
          }
          updatePoints.push(po)

          varIndex++;
          keyNode = currentNode
          keyVal = val
          varCacheQueue && varCacheQueue.push({ up: po, type: VarType.AttrKey })

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
          let po = new UpdatePoint(varIndex, currentNode, name.replace(/\.|\?|@/, ''), value)
          po.isComponent = !!slotComponent
          if (keyNode && keyNode?.contains(currentNode)) {
            po.key = keyVal
          }
          if (
            name[0] === ATTR_PREFIX_PROP ||
            name[0] === ATTR_PREFIX_BOOLEAN ||
            name[0] === ATTR_PREFIX_REF
          ) {
            if (isArray(val) && isSymbol(val[0])) {

              let [, args, executor, checker, varChain] = val as DirectiveInstance
              checker(EnterPointType.PROP)

              let attrName = name.substring(1)
              let point = new EnterPoint(
                currentNode,
                attrName,
                EnterPointType.PROP
              )

              let attrMap = DirectiveArgsMap.get(currentNode)
              if (!attrMap) {
                attrMap = {}
                DirectiveArgsMap.set(currentNode, attrMap)
              }
              attrMap[attrName] = [point, renderComponent, slotComponent]

              executor(point, args, undefined, { renderComponent, slotComponent, varChain })

              po.value = val;
              po.isDirective = true;

              varCacheQueue && varCacheQueue.push({ type: VarType.DirectiveProp, up: po, point, name, attrName })
            } else if (name[0] === ATTR_PREFIX_BOOLEAN) {
              po.isToggleProp = true;
              po.value = !!val;
              let attrName = name.substring(1)
              if (po.value)
                currentNode.setAttribute(attrName, '')

              varCacheQueue && varCacheQueue.push({ type: VarType.AttrBool, name: attrName, up: po, attrName: name })
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

              varCacheQueue && varCacheQueue.push({ type: VarType.AttrRef, up: po, name, attrName: refName })
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

                varCacheQueue && varCacheQueue.push({ type: VarType.AttrProp, up: po, name: propName, attrName: name })
              }
            }
            currentNode.removeAttribute(name)
            val = ''
          } else {
            po.value = val;
            let executor
            let args
            let cache: Record<string, any> = { type: VarType.Attr, up: po, attrName: name }
            if (isArray(val) && isSymbol(val[0])) {
              let type = EnterPointType.ATTR;
              if (name === "class") {
                type = EnterPointType.CLASS;
              } else if (name === "style") {
                type = EnterPointType.STYLE;
              }

              let [, ags, exec, checker, varChain] = val as DirectiveInstance
              checker(type)

              po.isDirective = true;
              po.attrName = name
              let point = new EnterPoint(
                currentNode,
                name,
                type
              );

              let attrMap = DirectiveArgsMap.get(currentNode)
              if (!attrMap) {
                attrMap = {}
                DirectiveArgsMap.set(currentNode, attrMap)
              }
              attrMap[name] = [point, renderComponent, slotComponent]

              args = ags
              executor = exec

              val = ''
              cache.type = VarType.DirectiveAttr
              cache.point = point
            }
            value = replace(value, PLACEHOLDER_EXP, val)
            //回填
            attr.value = value;
            if (isDefined(value)) {
              currentNode.setAttribute(name, value)
            }

            executor && executor(cache.point, args!, undefined, { renderComponent, slotComponent })

            varCacheQueue && varCacheQueue.push(cache)
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
      let po = new UpdatePoint(varIndex, currentNode)
      if (keyNode && keyNode?.contains(currentNode)) {
        po.key = keyVal
      }
      updatePoints.push(po)

      po.isComponent = !!slotComponent
      po.isText = true;

      let val = vars[varIndex];

      if (isArray(val) && isSymbol(val[0])) {
        const diName = Symbol.keyFor(val[0] as symbol)
        //插入start占位符
        let startComment: Comment;
        startComment = document.createComment(
          `compelem-${renderComponent.tagName}-${diName}-start`
        );
        po.textNode = startComment
        comment.parentNode!.insertBefore(startComment, comment);
        comment.nodeValue = `compelem-${renderComponent.tagName}-${diName}-end`;
        (comment as any)._diName = diName

        po.isDirective = true;
        po.value = val;

        let pType = slotComponent ? EnterPointType.SLOT : EnterPointType.TEXT

        let [, args, executor, checker, varChain] = val as DirectiveInstance
        checker(pType)

        let point = new EnterPoint(
          startComment,
          "",
          pType
        );
        point.endNode = comment;

        TextOrSlotDirectiveArgsMap.set(comment, [point, renderComponent, slotComponent, args, varChain])
        TextOrSlotDirectiveExecutorMap.set(comment, executor)
        TextOrSlotDirectiveUpdatePointMap.set(comment, po)
        Collector.startRender(comment)
        let tmpl = executor(point, args, undefined, { renderComponent, slotComponent, varChain })!
        Collector.endRender(renderComponent)

        //render
        if (tmpl) {
          let nodes = buildDirectiveView(comment, tmpl[1]!, renderComponent)
          if (nodes && nodes.length > 0) {
            DomUtil.insertBefore(comment, Array.from(nodes))
          }
        }

        val = undefined

        varCacheQueue && varCacheQueue.push({ type: pType === EnterPointType.SLOT ? VarType.DirectiveSlot : VarType.DirectiveText, up: po, point })
      } else {
        po.value = val

        varCacheQueue && varCacheQueue.push({ type: VarType.Text, up: po })
      }
      varIndex++;

      let text = toString(val ?? '')
      let textDom = document.createTextNode(text);
      comment.parentNode!.insertBefore(textDom, comment);
      po.textNode = textDom
    }
    if (varCacheMap && varCacheQueue)
      varCacheMap[NodeSn] = varCacheQueue

    if (keyNode && !keyNode.contains(currentNode) && keyNode !== currentNode) {
      keyNode = null
      keyVal = ''
    }
  }
  if (!isDirective && varCacheMap)
    VAR_CACHE.set(renderComponent.constructor, varCacheMap)
  return container.childNodes;
}

export function buildTmplate2(updatePoints: Array<UpdatePoint>, vars: any[], component: CompElem) {
  let container = DOM_CACHE.get(component.constructor)?.cloneNode(true)!
  let varMap = VAR_CACHE.get(component.constructor)!

  //遍历dom
  const nodeIterator = document.createNodeIterator(
    container,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT
  );
  let currentNode: any;
  let slotComponent: CompElem | undefined;
  let varIndex = 0;
  let NodeSn = 0
  while ((currentNode = nodeIterator.nextNode())) {
    NodeSn++
    let po: UpdatePoint
    if (slotComponent && !slotComponent.contains(currentNode)) {
      slotComponent = undefined;
    }
    if (currentNode instanceof HTMLElement || currentNode instanceof SVGElement) {
      if (currentNode instanceof CompElem) {
        slotComponent = currentNode
      }

      let props: Record<string, any> = {};
      let varCacheQueue = varMap[NodeSn]
      varCacheQueue && varCacheQueue.forEach(vp => {
        let val = vars[varIndex++];
        switch (vp.type) {
          case VarType.Event:
            po = clone(vp.up)
            if (!vp.value) {
              varIndex--
            }
            if (vp.value)
              addEvent(vp.name!, val.bind(component), currentNode, component)
            currentNode.removeAttribute(vp.attrName)
            break
          case VarType.AttrSlot:
            if (slotComponent && vp.name) {
              // let ary = slotComponent._slotsPropMap[vp.name]
              // if (!ary) {
              //   ary = slotComponent._slotsPropMap[vp.name] = []
              // }
              // ary.push(currentNode)
            }
            currentNode.removeAttribute(vp.attrName)
            break
          case VarType.Ref:
            po = clone(vp.up)
            val.current = currentNode
            currentNode.removeAttribute(vp.attrName)
            break
          case VarType.AttrKey:
            po = clone(vp.up)
            currentNode.setAttribute(ATTR_KEY, val)
            break
          case VarType.AttrBool:
            po = clone(vp.up)
            po.value = !!val
            po.node = currentNode
            if (po.value)
              currentNode.setAttribute(vp.name, '')
            currentNode.removeAttribute(vp.attrName)
            break
          case VarType.AttrProp:
            po = clone(vp.up)
            po.value = val
            po.node = currentNode
            props[vp.name!] = val
            if (vp.attrName)
              currentNode.removeAttribute(vp.attrName)
            break
          case VarType.AttrRef:
          case VarType.Attr:
            po = clone(vp.up)
            po.value = val
            po.node = currentNode
            currentNode.setAttribute(vp.attrName, val)
            if (VarType.AttrRef === vp.type) currentNode.removeAttribute(vp.name)
            break
          case VarType.DirectiveAttr:
          case VarType.DirectiveTag:
          case VarType.DirectiveProp:
            po = clone(vp.up)
            po.value = val
            po.node = currentNode
            let point = clone(vp.point!)
            point.startNode = currentNode

            let [sym, args, executor, checker, varChain] = val as DirectiveInstance

            let attrMap = DirectiveArgsMap.get(currentNode)
            if (!attrMap) {
              attrMap = {}
              DirectiveArgsMap.set(currentNode, attrMap)
            }
            attrMap[vp.attrName ?? Symbol.keyFor(sym)!] = [point, component, slotComponent]

            executor(point, args, undefined, { renderComponent: component, slotComponent, varChain })

            if (VarType.DirectiveAttr === vp.type) {
              let attrValue = currentNode.getAttribute(vp.attrName)
              attrValue = replace(attrValue, PLACEHOLDER_EXP, '')
              currentNode.setAttribute(vp.attrName, attrValue)
            }
            if (vp.name)
              currentNode.removeAttribute(vp.name)
            break
        }
        if (po)
          updatePoints.push(po)
      })

      if (currentNode instanceof CompElem) {
        currentNode._regWrapper(component)
        if (size(props) > 0)
          currentNode._initProps(props)
      } else if (currentNode instanceof HTMLSlotElement) {
        component._bindSlot(currentNode, currentNode.name || 'default', props)
      }
    } else {
      let varCacheQueue = varMap[NodeSn]
      varCacheQueue && varCacheQueue.forEach(vp => {
        let val = vars[varIndex++]
        switch (vp.type) {
          case VarType.DirectiveSlot:
          case VarType.DirectiveText:
            po = clone(vp.up)
            po.value = val
            po.node = currentNode

            let [sym, args, executor, checker, varChain] = val as DirectiveInstance
            let diName = Symbol.keyFor(sym)
            let startComment = document.createComment(
              `compelem-${component.tagName}-${diName}-start`
            );
            po.textNode = startComment

            currentNode.parentNode!.insertBefore(startComment, currentNode)
            currentNode.nodeValue = `compelem-${component.tagName}-${diName}-end`

            let point = clone(vp.point!)
            point.startNode = startComment
            point.endNode = currentNode

            TextOrSlotDirectiveArgsMap.set(currentNode, [point, component, slotComponent, args, varChain])
            TextOrSlotDirectiveExecutorMap.set(currentNode, executor)
            TextOrSlotDirectiveUpdatePointMap.set(currentNode, po)
            Collector.startRender(currentNode)
            let tmpl = executor(point, args, undefined, { renderComponent: component, slotComponent, varChain })!
            Collector.endRender(component)

            //render
            let nodes = buildDirectiveView(currentNode, tmpl[1]!, component)
            if (nodes && nodes.length > 0) {
              DomUtil.insertBefore(currentNode, Array.from(nodes))
            }

            break
          case VarType.Text:
            po = clone(vp.up)
            po.node = currentNode
            let text = toString(val ?? '')
            let textDom = document.createTextNode(text);
            currentNode.replaceWith(textDom)
            // currentNode.parentNode!.insertBefore(textDom, currentNode);
            po.textNode = textDom
            break
        }
        if (po)
          updatePoints.push(po)
      })
      //todo...
    }
  }
  return container.childNodes;
}

export function buildView(
  tmpl: Template,
  component: CompElem): NodeListOf<ChildNode> {

  let updatePoints: UpdatePoint[] = []
  let nodes
  if (HTML_CACHE.has(component.constructor)) {
    let htmlTmpl = HTML_CACHE.get(component.constructor)!
    let vars = buildVars(component, tmpl)
    if (DOM_CACHE.has(component.constructor)) {
      nodes = buildTmplate2(updatePoints, vars, component)
    } else {
      nodes = buildTmplate(updatePoints, htmlTmpl, vars, component);
    }
  } else {
    let [html, vars] = buildHTML(component, tmpl);
    HTML_CACHE.set(component.constructor, html)
    nodes = buildTmplate(updatePoints, html, vars, component);
  }

  ComponentUpdatePointsMap.set(component, updatePoints)
  return nodes
}
export function buildDirectiveView(pointNode: Node, tmpl: Template, component: CompElem) {
  let [html, vars] = buildHTML(component, tmpl!);
  let updatePoints: UpdatePoint[] = []
  let nodes = buildTmplate(updatePoints, html, vars, component, true);
  DirectiveUpdatePointsMap.set(pointNode, updatePoints)
  return nodes
}

export function updateView(tmpl: Template, comp: CompElem, updatePoints?: UpdatePoint[], changedKeys?: string[]): void {
  if (isBlank(join(tmpl.strings))) return;
  if (!ComponentUpdatePointsMap.has(comp)) return;
  updatePoints = updatePoints ?? ComponentUpdatePointsMap.get(comp)!
  let vars = tmpl.flatVars(comp)
  for (let i = 0; i < updatePoints.length; i++) {
    const up = updatePoints[i];
    let varIndex = up.varIndex;
    if (varIndex < 0) continue;
    if (up.notUpdated) continue
    let oldValue = up.value;
    let newValue: any = vars;
    let node = up.node;
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
      let [sym, oldArgs, executor, , varChain] = up.value
      let args = TextOrSlotDirectiveArgsMap.get(node)!
      if (!args) {
        const argsMap = DirectiveArgsMap.get(node)!
        args = argsMap[up.attrName] || argsMap[Symbol.keyFor(sym)!]
      }

      if (!isArray(newValue)) continue

      let [point, renderComponent, slotComponent] = args
      let [, newArgs] = newValue

      const tsUp = TextOrSlotDirectiveUpdatePointMap.get(node)
      if (tsUp) {
        tsUp.value = newValue
        const tsdArgs = TextOrSlotDirectiveArgsMap.get(node)!
        tsdArgs[3] = newArgs
      }

      updateDirective(point, newArgs as any[], oldArgs, executor, renderComponent, slotComponent, varChain, point.type == EnterPointType.TEXT || point.type == EnterPointType.SLOT)
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
        if (isObject(newValue) && Object.is(newValue, oldValue)) {
          let targetVarName = camelCase(up.attrName)
          let path = [targetVarName]
          let subNewValue = newValue
          let subOldValue = undefined
          if (changedKeys && changedKeys.length > 0) {
            let kStr = ''
            let fromVarName = join(OBJECT_VAR_PATH.get(up.value)!, PATH_SEPARATOR)
            changedKeys.forEach(k => {
              if (k.startsWith(fromVarName) && k.length > kStr.length) {
                kStr = k
              }
            })
            path = concat(split(kStr.replace(fromVarName, targetVarName), PATH_SEPARATOR))
            subNewValue = get(node, path)
          }
          notifyUpdate(node, oldValue, path, subNewValue, subOldValue)
        } else {
          node._updateProps({ [up.attrName]: newValue });
        }
      } else if (node instanceof HTMLSlotElement) {
        comp._updateSlot(node.getAttribute('name') || 'default', up.attrName, newValue)
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
      let textNode = up.textNode
      textNode.textContent = toString(newValue ?? '')
    }

    up.value = newValue
  }//endfor

}

export function updateDirectiveView(node: Node, comp: CompElem, tmpl?: Template, updatePoints?: UpdatePoint[], changedKeys?: string[]): void {
  const render = TextOrSlotDirectiveExecutorMap.get(node)!
  const [point, renderComponent, slotComponent, oldArgs, varChain] = TextOrSlotDirectiveArgsMap.get(node)!
  const up = TextOrSlotDirectiveUpdatePointMap.get(node)!
  if (!tmpl) {
    let rs = render(point, up.value[1], oldArgs, { renderComponent, slotComponent, varChain })!
    if (!rs) return

    tmpl = rs[1]
  }

  //合并
  if (tmpl && tmpl.vars[0] instanceof Template) {
    let tStrAry = []
    let tVarAry: any[] = []
    each(tmpl.vars, v => {
      tVarAry.push(...v.vars)
      tStrAry.push(...map(v.vars, v => '1'))
    })
    tStrAry.push('1')
    tmpl = new Template(tStrAry, tVarAry)
  }
  if (updatePoints) {
    DirectiveUpdatePointsMap.set(node, updatePoints)
  }

  updatePoints = updatePoints ?? DirectiveUpdatePointsMap.get(node)
  updateView(tmpl!, comp, updatePoints, changedKeys)
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