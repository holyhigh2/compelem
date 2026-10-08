import { CompElem } from "./CompElem";
import { CssTemplate } from "./render/CssTemplate";
import { Constructor, TplFn } from "./types";

export const SLOT_NAME_DEFAULT = 'default'
export const PropTypeMap: Record<string, Constructor<any>> = {
    boolean: Boolean,
    string: String,
    number: Number,
    object: Object,
    array: Array,
    function: Function,
    undefined: Object
}
export const DefinitionCompEventMap = new Map<Function, Array<Record<string, any>>>()
export const DefinitionCompEmitMap = new WeakMap<Function, Set<string>>()
export const DefinitionTagMap = {} as Record<string, string>;
export const DefinitionComponentMap = {} as Record<string, Function>;
export const CssTemplateCacheMap = new WeakMap<TemplateStringsArray, CssTemplate>()
export const CssStyleSheetCacheMap = new WeakMap<TemplateStringsArray, CSSStyleSheet>()
export const CssScopeCacheMap = new WeakMap<Function, Map<string, CSSStyleSheet[]>>()
export const CssTemplateSheetMap = new WeakMap<CssTemplate, CSSStyleSheet>()
export const CssVarKeyCacheMap = new WeakMap<Function, Map<string, string>>()

export const DirectiveScopeMap = new Map<Function, string[]>()

export const ComponentUninitializedSubComponentPropMap = new WeakMap<CompElem<any>, Map<Node, Record<string, any>>>()
export const ComponentUninitializedSlotFunctionMap = new WeakMap<Node, Record<string, TplFn>>()
export const ComponentUninitializedWrapperComponentMap = new WeakMap<Node, CompElem<any>>()
export const DATA_KEY = '__data_'
export const PLACEHOLDER = "⟬Ċ⟭";