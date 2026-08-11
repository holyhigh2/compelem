import {
  camelCase,
  concat,
  each,
  get,
  isArray,
  isBlank,
  isEmpty,
  isEqual,
  isFunction,
  isObject,
  isString,
  kebabCase,
  last,
  map,
  noop,
  range,
  replace,
  set,
  size,
  snakeCase,
  split,
  toArray,
  toString,
  trim
} from "myfx";
import { CompElem } from "../CompElem";
import { ComponentUninitializedWrapperComponentMap, CssTemplateCacheMap, DefinitionComponentMap, DefinitionPropMap, DefinitionTagMap, DirectiveScopeMap, PATH_SEPARATOR, PLACEHOLDER } from "../constants";
import {
  directiveScopeChecker,
  updateDirective
} from "../directive/index";
import { Collector } from "../reactive";
import { DirectiveInstance, DirectiveUpdateTag, EnterPointType, KeyFn, TplFn, UpdatedSource } from "../types";
import { addUninitializedSubComponentProp, getSlotComponent, isCompElemNode, showTagError } from "../utils";
import { CssTemplate } from "./CssTemplate";
import { Template } from "./Template";
import { TemplateMeta } from "./TemplateMeta";
import { UpdatePoint } from "./UpdatePoint";
import { UpdatePointMeta } from "./UpdatePointMeta";

export const ATTR_PREFIX_EVENT = "@";
export const ATTR_PREFIX_PROP = ".";
export const ATTR_PREFIX_BOOLEAN = "?";
export const ATTR_PREFIX_REF = "*";
export const ATTR_PROP_DELIMITER = ":";
export const ATTR_REF = "ref";

const EXP_TAG = new RegExp(`${PLACEHOLDER}\\d+`)
const EXP_TAG_CONVERT = /(<\/?)\s*([A-Z][A-Za-z0-9]*)([\s>])/gm
const EXP_ATTR_CONVERT = /\s+([\.?@*])?((?:[a-zA-Z]*[A-Z][^\s<>="']+))(?=[\s=>])/gm
const SLOT_KEY_PROPS = 'slot-props'
const TMPL_META_CACHE: Map<Function, TemplateMeta> = new Map()

let SubViewSn = 0
/**
 * 提供渲染函数相关操作
 * @author holyhigh2
 */

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

export function buildVars(tmpl: Template) {
  let vars = concat(tmpl.vars)
  let l = tmpl.strings.length - 1;
  for (let i = 0; i <= l; i++) {
    let val = get<any>(tmpl.vars, i, '');
    if (val instanceof Template) {
      let vs = buildVars(val)

      vars.splice(i, 1, ...vs)
    }
  }
  return vars
}

/**
 * 构建模板DOM
 * @param html
 */
export function createTemplate(
  updatePoints: Array<UpdatePointMeta>,
  html: string,
  vars: any[],
  renderComponent: CompElem,
  emptyEvent‌s: Record<number, string[]>
): DocumentFragment {
  const container = document.createElement("template");
  container.innerHTML = html

  //遍历dom
  const nodeIterator = document.createNodeIterator(
    container.content,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT
  );
  let currentNode: any;
  let varIndex = 0;
  let slotComponent: CompElem | undefined;

  let nodeSn = -1
  let slotNodeSn = -1
  while ((currentNode = nodeIterator.nextNode())) {
    nodeSn++

    if (slotComponent && !slotComponent.contains(currentNode)) {
      slotComponent = undefined;
      slotNodeSn = -1
    }
    if (currentNode instanceof HTMLElement || currentNode instanceof SVGElement) {
      if (isCompElemNode(currentNode)) {
        slotComponent = currentNode as CompElem
        slotNodeSn = nodeSn
      }

      let props: Record<string, any> = {};
      let attrs = map(currentNode.attributes, item => ({ name: item.name, value: item.value }))

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

        if (EXP_TAG.test(name)) {
          let val = vars[varIndex];
          //support directive only for now
          if (isArray(val) && isFunction(val[0])) {
            let [, , diFn, varChain] = val as DirectiveInstance
            directiveScopeChecker(diFn, EnterPointType.TAG, renderComponent.tagName)

            let po = new UpdatePointMeta(varIndex)
            po.isDirective = true;
            po.directiveType = EnterPointType.TAG
            po.nodeSn = nodeSn
            po.directiveVarChain = varChain
            if (slotComponent) {
              po.slotNodeSn = slotNodeSn
            }
            updatePoints.push(po)
            varIndex++;
          }
          currentNode.removeAttribute(name)
          continue;
        }//endif
        //@event.stop.prevent.debounce
        if (name[0] === ATTR_PREFIX_EVENT) {
          let val;
          let evName = name.substring(1)
          if (EXP_TAG.test(value)) {
            let po = new UpdatePointMeta(varIndex)
            po.isEvent = true
            po.attrName = evName
            po.nodeSn = nodeSn

            updatePoints.push(po)

            val = vars[varIndex];
            if (process.env.DEV && !isFunction(val)) {
              showTagError(currentNode.tagName,
                `Event '${name}' must be a function`
              );
              continue;
            }

            varIndex++;
          } else if (isBlank(value)) {
            let evList = emptyEvent‌s[nodeSn]
            if (!evList) {
              evList = emptyEvent‌s[nodeSn] = []
            }
            evList.push(evName)
          }

          currentNode.removeAttribute(name)
          continue;
        }//endif
        if (name === ATTR_REF) {
          if (EXP_TAG.test(value)) {
            let val = vars[varIndex];
            if (process.env.DEV && !(val instanceof RefObject)) {
              showTagError(currentNode.tagName,
                `Ref must be a RefObject`
              );
              continue;
            }

            let po = new UpdatePointMeta(varIndex)
            po.isRef = true;
            po.nodeSn = nodeSn

            updatePoints.push(po)

            varIndex++;
          }
          currentNode.removeAttribute(name)
          continue;
        }//endif
        //校验变量必须是表达式
        if (process.env.DEV && name[0] === ATTR_PREFIX_PROP && !EXP_TAG.test(value)) {
          showTagError(currentNode.tagName,
            `Prop '${name}' must be an interpolation`
          );
          continue;
        }
        //用于兼容其他框架会自动移除属性的场景
        if (last(name) === ATTR_PREFIX_PROP) {
          props[name.substring(0, name.length - 1)] = value;
          currentNode.removeAttribute(name)

          let po = new UpdatePointMeta(varIndex)
          po.attrName = name.substring(0, name.length - 1)
          po.nodeSn = nodeSn
          po.isPropPerfix = true
          continue;
        }

        if (value.includes(PLACEHOLDER)) {
          let po = new UpdatePointMeta(varIndex)
          po.attrName = name.replace(/\.|\?|@/, '')
          po.nodeSn = nodeSn
          if (slotComponent) {
            po.slotNodeSn = slotNodeSn
          }

          if (
            name[0] === ATTR_PREFIX_PROP ||
            name[0] === ATTR_PREFIX_BOOLEAN ||
            name[0] === ATTR_PREFIX_REF
          ) {
            if (name[0] === ATTR_PREFIX_BOOLEAN) {
              po.isToggleProp = true;
              po.attrName = name.substring(1)
            } else if (name[0] === ATTR_PREFIX_REF) {
              po.isRefAttr = true
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
            } else {
              let ctor = DefinitionComponentMap[currentNode.tagName.toLowerCase()]
              let props = DefinitionPropMap.get(ctor) ?? {}
              if (process.env.DEV && !ctor && currentNode.tagName !== 'SLOT' && !ctor) {
                showTagError(currentNode.tagName, `Prop '${name}' can only be set on a CompElem or a slot`)
              } else {
                let propName = camelCase(name.substring(1));
                if (process.env.DEV && !(propName in props) && currentNode.tagName !== 'SLOT') {
                  showTagError(currentNode.tagName, `Prop '${name}' is not defined in ${currentNode.tagName}`)
                }

                po.isProp = true
                po.attrName = propName
              }
            }
            currentNode.removeAttribute(name)
          } else {
            po.attrTmpl = value
          }

          updatePoints.push(po)
          varIndex++;
        }//endif
      }//endfor

    } else {
      let textParts = trim(currentNode.nodeValue).split(EXP_TAG)
      if (textParts.length < 2) {
        continue
      }
      each(range(textParts.length - 1), i => {
        let tp = trim(textParts[i])
        if (!isBlank(tp)) {
          let tpDom = document.createTextNode(tp);
          currentNode.parentNode!.insertBefore(tpDom, currentNode);
          nodeSn++
        }

        //插入占位符
        let diPlaceholder = document.createTextNode('');
        currentNode.parentNode!.insertBefore(diPlaceholder, currentNode);

        let po = new UpdatePointMeta(varIndex)
        po.isText = true;
        po.nodeSn = nodeSn
        updatePoints.push(po)

        let val = vars[varIndex];

        if (isArray(val) && isFunction(val[0])) {
          let pType = slotComponent ? EnterPointType.SLOT : EnterPointType.TEXT

          po.isDirective = true;
          po.directiveType = pType

          if (slotComponent) {
            po.slotNodeSn = slotNodeSn
          }

          let [, , diFn] = val as DirectiveInstance
          directiveScopeChecker(diFn, pType, renderComponent.tagName)

          val = undefined
        }
        varIndex++;
        nodeSn++
      })
      nodeSn--

      let lastTextPart = trim(last(textParts))
      if (!isBlank(lastTextPart)) {
        currentNode.nodeValue = lastTextPart
        nodeSn++
      } else {
        let prevNode = currentNode.previousSibling
        currentNode.parentNode.removeChild(currentNode)
        currentNode = prevNode
      }
    }
  }
  return container.content;
}
export function renderTemplate(component: CompElem<any>, tmplM: TemplateMeta, vars: any[]): [DocumentFragment, UpdatePoint[]] {
  const { fragment, updatePointMetas, emptyEvent‌s } = tmplM
  let rs = fragment.cloneNode(true) as DocumentFragment
  let upAry: UpdatePoint[] = []

  let currentNode: any
  let textDirectives: any[] = []
  let direcitves: any[] = []
  let evList: Array<[string, Function, Node, Function?]> | undefined = component._eventBindList
  if (!evList) {
    evList = component._eventBindList = []
  }
  //遍历dom
  const nodeIterator = document.createNodeIterator(
    rs,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT
  );
  let upmMap: Record<number, UpdatePointMeta[]> = {}
  let slotNodeMap: Record<number, Node | null> = {}
  updatePointMetas.forEach((upm, i) => {
    if (!upmMap[upm.nodeSn]) upmMap[upm.nodeSn] = []
    upmMap[upm.nodeSn].push(upm)
    if (upm.slotNodeSn > -1) {
      slotNodeMap[upm.slotNodeSn] = null
    }
  })
  let nodeSn = -1
  let varIndex = 0
  if (process.env.DEV && size(vars) != size(updatePointMetas)) {
    showTagError(component.tagName,
      `Dynamic root elements are not supported in component view, please checker the 'render()' function`
    );
    return [rs, upAry]
  }
  while ((currentNode = nodeIterator.nextNode())) {
    nodeSn++
    if (slotNodeMap[nodeSn] === null) {
      slotNodeMap[nodeSn] = currentNode
    }
    let emptyEvs = emptyEvent‌s[nodeSn]
    if (emptyEvs) {
      emptyEvs.forEach(evName => {
        evList.push([evName, noop, currentNode])
      })
    }
    let props: Record<string, any> | undefined = {};
    const upms = upmMap[nodeSn]
    upms && upms.forEach(upm => {
      let val = vars[varIndex++]

      let newUp = UpdatePoint.createFrom(upm)
      newUp.node = new WeakRef(currentNode)
      newUp.value = val

      if (upm.isProp || upm.isPropPerfix) {
        props[upm.attrName] = val;
      } else if (upm.isRef) {
        val.__setRef(new WeakRef(currentNode))
      } else if (upm.isEvent) {
        evList.push([upm.attrName, val!, currentNode])
      } else if (upm.isToggleProp) {
        newUp.value = !!val;
        currentNode.toggleAttribute(upm.attrName, newUp.value)
      } else if (upm.isRefAttr) {
        currentNode.setAttribute(upm.attrName, val)
      } else if (upm.isText) {
        if (upm.isDirective) {
          let attrName = upm.attrName
          let slotComponent = slotNodeMap[upm.slotNodeSn] as CompElem<HTMLElement>
          let [executor, args, , varChain] = val as DirectiveInstance
          textDirectives.push([currentNode, attrName, slotComponent, executor, args, varChain, newUp])
        } else {
          currentNode.textContent = val
        }
      } else if (upm.isDirective) {
        let slotComponent = slotNodeMap[upm.slotNodeSn] as CompElem<HTMLElement>
        let [executor, args, , varChain] = val as DirectiveInstance
        let attrName = upm.attrName

        if (isEmpty(varChain) && size(upm.directiveVarChain) > 0) {
          varChain = upm.directiveVarChain
        }
        direcitves.push([currentNode, attrName, slotComponent, executor, args, varChain, upm.directiveType])
      } else {//attr
        currentNode.setAttribute(upm.attrName, upm.attrTmpl.replace(EXP_TAG, val))
      }

      upAry.push(newUp)
    })
    if (currentNode instanceof HTMLSlotElement) {
      component._bindSlot(currentNode, currentNode.name || 'default', props)
    } else if (currentNode instanceof HTMLElement) {
      if (isCompElemNode(currentNode)) {
        ComponentUninitializedWrapperComponentMap.set(currentNode, component)
        addUninitializedSubComponentProp(component, currentNode, props)
      }
    }
  }

  textDirectives.forEach(([currentNode, attrName, slotComponent, executor, args, varChain, newUp]) => {
    set(currentNode, '__anchor__', SubViewSn++)
    Collector.start()
    let tmpl = executor(currentNode, args, undefined, { renderComponent: component, slotComponent, varChain, attrName, pointType: newUp.directiveType })
    Collector.end(component, newUp)
    if (tmpl && tmpl.length > 1) {
      let [, tmplFn, tmplM, newAry, keyFn] = tmpl
      insertSubView(currentNode, newUp, tmplFn, tmplM, component, newAry, keyFn)
    }
  })
  direcitves.forEach(([currentNode, attrName, slotComponent, executor, args, varChain, pointType]) => {
    executor(currentNode, args, undefined, { renderComponent: component, slotComponent, varChain, attrName, pointType })
  })
  return [rs, upAry]
}
export function buildView(
  tmpl: Template,
  component: CompElem<any>): DocumentFragment {

  let tmplM: TemplateMeta
  let vars: any[] = []

  if (TMPL_META_CACHE.has(component.constructor)) {
    tmplM = TMPL_META_CACHE.get(component.constructor)!
    vars = buildVars(tmpl)
  } else {
    tmplM = new TemplateMeta(tmpl, component, vars)
    TMPL_META_CACHE.set(component.constructor, tmplM)
  }
  let [rs, upAry] = renderTemplate(component, tmplM, vars)

  component.__updateTree = upAry

  return rs
}
export function insertSubView(node: Node, point: UpdatePoint, tmplFn: TplFn, tmplM: TemplateMeta, component: CompElem<any>, valueAry?: any[], keyFn?: KeyFn) {
  let upList: any = []
  let rootNodes = keyFn ? {} as Record<string, any> : undefined
  valueAry = valueAry ?? [0]
  let fragment = document.createDocumentFragment()
  let subViewId = get(node, '__anchor__')
  each(valueAry, (v, k, c, i) => {
    Collector.start()
    let vars = buildVars(tmplFn.call(component, v, k, i))
    Collector.end(component)
    let [rs, upAry] = renderTemplate(component, tmplM, vars)
    let roots = toArray(rs.childNodes).map((n: any) => new WeakRef(n))
    if (keyFn) {
      let key = keyFn.call(component, v, k, i) + ''
      roots.forEach(n => {
        let dom = n.deref()
        set(dom, '__c-' + subViewId, key)
      })
      rootNodes![key] = roots
      upAry.forEach(up => {
        up.key = key
      })
      upList.push(...upAry)
      fragment.append(rs)
    } else {
      fragment = rs
      point.subViewRootNodes = roots
      upAry.forEach((up: UpdatePoint) => {
        point.insert(up)
      })
    }
  })

  if (rootNodes) {
    point.subViewRootNodes = rootNodes
    upList.forEach((up: UpdatePoint, i: number) => {
      up.varIndex = i
      point.insert(up)
    })
  }

  let len = fragment!.childNodes.length
  if (len > 0) {
    component.__bindEvents()
    node.parentNode!.insertBefore(fragment, node);
  }
}

export function updateView(vars: any[], renderComponent: CompElem<any>, updatePoints: UpdatePoint[], renderedUps?: Set<UpdatePoint>, changed?: Record<string, UpdatedSource>): void {
  if (isBlank(vars)) return;
  if (!updatePoints) return

  for (let i = 0; i < updatePoints.length; i++) {
    const up = updatePoints[i];
    let varIndex = up.varIndex;
    if (varIndex < 0) continue;
    let upm = up.metaInfo
    if (upm.isPlaceholder || upm.isPropPerfix || upm.isRef || upm.isEvent || upm.isRefAttr || upm.isKey) continue
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
    if (upm.isDirective) {
      // renderedUps?.delete(up)

      //指令
      let [executor, oldArgs, diFn, varChain] = up.value

      if (!isArray(newValue)) continue
      let slotComponent = getSlotComponent(node!, renderComponent)

      let [, newArgs] = newValue

      let updated = updateDirective(diFn, node!, newArgs as any[], oldArgs, executor, renderComponent, slotComponent, varChain, up, changed)
      if (updated) {
        renderedUps?.delete(up)
      }
    } else if (upm.isToggleProp) {
      //布尔特性
      if ((!!newValue) === oldValue) continue

      elNode.toggleAttribute(upm.attrName, !!newValue)
      if (elNode instanceof CompElem) {
        elNode.updateProps({ [upm.attrName]: !!newValue })
      }
    } else if (upm.isProp) {
      //子组件属性
      if (!isObject(newValue) && newValue === oldValue) continue;
      //如果node是slot则触发组件的slot更新
      if (node instanceof CompElem) {
        node.updateProps({ [upm.attrName]: newValue });
      } else if (node instanceof HTMLSlotElement) {
        renderComponent._updateSlot(node.getAttribute('name') || 'default', upm.attrName, newValue)
      }
    } else if (upm.attrName) {
      //特性
      if (!isEqual(oldValue, newValue)) {
        switch (upm.attrName) {
          case 'value':
            if (node instanceof HTMLInputElement) {
              node.value = newValue
              break;
            }
          default:
            (node as HTMLElement).setAttribute(upm.attrName, replace(upm.attrTmpl, EXP_TAG, newValue + ''))
        }
      }
    }
    else if (upm.isText) {
      let textNode = up.node!
      let newTxt = toString(newValue ?? '')
      let oldTxt = textNode.deref()!.textContent
      if (newTxt !== oldTxt)
        textNode.deref()!.textContent = newTxt
    }
    up.value = newValue
  }//endfor
  // tmpl.destroy()
}

export function updateSubScopeView(subScopeUpdatePoint: UpdatePoint, renderComponent: CompElem<any>, tmpl?: Template, updatedMap?: Record<string, UpdatedSource>): void {
  if (!subScopeUpdatePoint || subScopeUpdatePoint.__destroyed) return
  let node = subScopeUpdatePoint.node.deref()

  const [executor, oldArgs, diFn, varChain] = subScopeUpdatePoint.value

  let slotComponent = getSlotComponent(node!, renderComponent)
  let newArgs
  if (!tmpl) {
    let rs = executor(node!, subScopeUpdatePoint.value[1], oldArgs, { renderComponent, slotComponent, varChain, updatedMap, pointType: get(DirectiveScopeMap.get(diFn), [0], EnterPointType.TEXT) })!
    if (!rs) return
    if (rs[0] !== DirectiveUpdateTag.REFRESH) return
    if (isFunction(rs[1])) {
      newArgs = buildVars(rs[1].call(renderComponent, subScopeUpdatePoint.value[1][0]))
    } else {
      newArgs = rs[1]
    }
  }

  if (!newArgs) return

  updateView(newArgs, renderComponent, subScopeUpdatePoint.children!, undefined, updatedMap)
}

//////////////////////////////////////////////////// interfaces
/**
 * HTML模板函数，用于构建模板
 * @param strings
 * @param vars
 */
export function h(
  strings: TemplateStringsArray,
  ...vars: any
): Template {
  return new Template(
    isString(strings) ? ([strings] as any) : strings,
    vars
  );
}

/**
 * CSS模板函数，用于构建模板
 * @param strings
 * @param vars
 */
export function css(
  strings: TemplateStringsArray,
  ...vars: any
): CssTemplate {
  if (CssTemplateCacheMap.has(strings)) {
    return CssTemplateCacheMap.get(strings)!
  }
  let tmpl = new CssTemplate(
    strings,
    vars
  );

  let strVal = strings.join('')
  if (!isEmpty(strVal))
    CssTemplateCacheMap.set(strings, tmpl)
  return tmpl
}


class RefObject<T extends Node> {
  __ref: WeakRef<T> | undefined

  get current(): T | undefined {
    return this.__ref?.deref()
  }

  __setRef(ref: WeakRef<T>) {
    this.__ref = ref
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