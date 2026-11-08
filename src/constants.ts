import { CompElem } from "./CompElem";
import { CssTemplate } from "./render/CssTemplate";
import { Constructor, TplFn } from "./types";

export const SLOT_NAME_DEFAULT = 'default'
/** setup/插槽/视图 effect 的共用选项：不挂到当前 effect 的 children 上 */
export const NO_CHILD_EFFECT = { asChild: false } as const
export const PropTypeMap: Record<string, Constructor<any>> = {
    boolean: Boolean,
    string: String,
    number: Number,
    object: Object,
    array: Array,
    function: Function,
    undefined: Object
}
export const DefinitionCompEventMap = new WeakMap<Function, Array<Record<string, any>>>()
export const DefinitionCompEmitMap = new WeakMap<Function, Set<string>>()
export const DefinitionTagMap = {} as Record<string, string>;
export const DefinitionComponentMap = {} as Record<string, Function>;
export const CssTemplateCacheMap = new WeakMap<TemplateStringsArray, CssTemplate>()
export const CssStyleSheetCacheMap = new WeakMap<TemplateStringsArray, CSSStyleSheet>()
export const CssScopeCacheMap = new WeakMap<Function, Map<string, CSSStyleSheet[]>>()
export const CssVarKeyCacheMap = new WeakMap<Function, Map<string, string>>()

export const DirectiveScopeMap = new WeakMap<Function, string[]>()

export const ComponentUninitializedSubComponentPropMap = new WeakMap<CompElem<any>, Map<Node, Record<string, any>>>()
export const ComponentUninitializedSlotFunctionMap = new WeakMap<Node, Record<string, TplFn>>()
export const ComponentUninitializedWrapperComponentMap = new WeakMap<Node, CompElem<any>>()
export const PLACEHOLDER = "⟬Ċ⟭";