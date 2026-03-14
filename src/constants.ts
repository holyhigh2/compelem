import { CompElem } from "./CompElem";
import { DecoratorWrapper } from "./decorator";
import { Getter, PropOption, StateOption } from "./types";

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
export const DefinitionCompEventMap = new Map<Function, Array<Record<string, any>>>()
export const DefinitionTagMap = {} as Record<string, string>;
export const DefinitionComputedMap = new WeakMap<Function, Record<string, Getter>>()
export const DefinitionStateMap = new WeakMap<Function, Record<string, StateOption>>()
export const DefinitionPropMap = new WeakMap<Function, Record<string, PropOption>>()
export const DefinitionDecoratorMap = new Map<Function, DecoratorWrapper[]>()
export const ObservedAttrsMap = new Map<Function, Set<string>>()

export const WatchKeysOnceMap = new WeakMap<Function, Map<string, boolean>>()
export const WatchKeysDeepListMap = new WeakMap<Function, string[]>()
export const WatchKeysListMap = new WeakMap<Function, string[]>()
export const WatchUpdateMap = new WeakMap<Function, Record<string, Set<Function>>>()
export const WatchDeepUpdateMap = new WeakMap<Function, Record<string, Set<Function>>>()
export const WatchImmediateListMap = new WeakMap<Function, Record<string, Set<Function>>>()

export const PropSyncKeySetMap = new WeakMap<Function, Set<string>>()
export const StateShallowKeySetMap = new WeakMap<Function, Set<string>>()
export const HasChangedPropOrStateMap = new WeakMap<Function, Map<string, Function>>()

export const ComputedUpdateDepsMap = new WeakMap<Function, Map<string, Set<Function>>>()
export const CssUpdateDepsMap = new WeakMap<Function, Set<string>>()

export const ComponentDynamicCssUpdaterMap = new WeakMap<CompElem<any>, Map<Function, CSSStyleSheet>>()


export const PATH_SEPARATOR = '-'

export const PROP_NAME_SLOTS = 'slots'
export const DATA_KEY = '__data_'