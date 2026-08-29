import { CompElem } from "./CompElem";
import { DecoratorWrapper } from "./decorator";
import { CssTemplate } from "./render/CssTemplate";
import { Constructor, Getter, PropOption, StateOption, TplFn } from "./types";

export const SLOT_NAME_DEFAULT = 'default'
/**
 * 共享内容
 */
export const EXP_KEY = /\s+\.?key\s*=/;
export enum CollectorType {
    RENDER = 1,
    COMPUTED = 2,
    DIRECTIVE = 3
}
export enum Mode {
    Prod = 'prod',
    Dev = 'dev'
}
export const PropTypeMap: Record<string, Constructor<any>> = {
    boolean: Boolean,
    string: String,
    number: Number,
    object: Object,
    array: Array,
    function: Function,
    undefined: Object
}
export interface CompiledWatchMeta {
    rootMap: Map<string, string[]>
    watchKeysDeep: string[] | undefined
    watchDeepUpdateMap: Record<string, Set<Function>>
    watchUpdateMap: Record<string, Set<Function>>
    onceMap: Map<string, boolean>
}
export const DefinitionCompEventMap = new Map<Function, Array<Record<string, any>>>()
export const DefinitionCompEmitMap = new WeakMap<Function, Set<string>>()
export const DefinitionTagMap = {} as Record<string, string>;
export const DefinitionComponentMap = {} as Record<string, Function>;
export const DefinitionComputedMap = new WeakMap<Function, Record<string, Getter>>()
export const DefinitionStateMap = new WeakMap<Function, Record<string, StateOption>>()
export const DefinitionPropMap = new WeakMap<Function, Record<string, PropOption>>()
export const DefinitionModelMap = new WeakMap<Function, string[]>()
export const DefinitionDecoratorMap = new Map<Function, DecoratorWrapper[]>()
export const ObservedAttrsMap = new Map<Function, Set<string>>()
export const ViewDepMap = new Map<Function, Set<string>>()

export const WatchKeysOnceMap = new WeakMap<Function, Map<string, boolean>>()
export const WatchKeysDeepListMap = new WeakMap<Function, string[]>()
export const WatchKeyRootMap = new WeakMap<Function, Map<string, string[]>>()
export const WatchUpdateMap = new WeakMap<Function, Record<string, Set<Function>>>()
export const WatchDeepUpdateMap = new WeakMap<Function, Record<string, Set<Function>>>()
export const WatchImmediateListMap = new WeakMap<Function, Record<string, Set<Function>>>()
export const CompiledWatchMetaMap = new WeakMap<Function, CompiledWatchMeta | null>()

export const StateShallowKeySetMap = new WeakMap<Function, Set<string>>()
export const PropShallowKeySetMap = new WeakMap<Function, Set<string>>()
export const HasChangedPropOrStateMap = new WeakMap<Function, Map<string, Function>>()

export const ComputedMapCache = new WeakMap<Function, Record<string, Getter>>()
export const ComputedUpdateDepsMap = new WeakMap<Function, Map<string, Set<Function>>>()
export const CssUpdateDepsMap = new WeakMap<Function, Set<string>>()
export const CssTemplateCacheMap = new WeakMap<TemplateStringsArray, CssTemplate>()
export const CssStyleSheetCacheMap = new WeakMap<TemplateStringsArray, CSSStyleSheet>()
export const CssScopeCacheMap = new WeakMap<Function, Map<string, CSSStyleSheet[]>>()
export const CssTemplateSheetMap = new WeakMap<CssTemplate, CSSStyleSheet>()
export const CssVarKeyCacheMap = new WeakMap<Function, Map<string, string>>()

export const DirectiveScopeMap = new Map<Function, string[]>()

export const ComponentDynamicCssUpdaterMap = new WeakMap<CompElem<any>, Map<Function, CSSStyleSheet>>()
export const ComponentUninitializedSubComponentPropMap = new WeakMap<CompElem<any>, Map<Node, Record<string, any>>>()
export const ComponentUninitializedSlotFunctionMap = new WeakMap<Node, Record<string, TplFn>>()
export const ComponentUninitializedWrapperComponentMap = new WeakMap<Node, CompElem<any>>()

export const PATH_SEPARATOR = '-'

export const PROP_NAME_SLOTS = 'slots'
export const DATA_KEY = '__data_'
export const PLACEHOLDER = "⟬Ċ⟭";