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
export const DefinitionCompEventMap = new Map<string, Array<Record<string, any>>>()
export const DefinitionTagMap = {} as Record<string, string>;
export const DefinitionWatchMap = new Map<string, Record<string, Record<string, any>[]>>()
export const DefinitionComputedMap = new Map<string, Record<string, Getter>>()
export const DefinitionStateMap = new Map<string, Record<string, StateOption>>()
export const DefinitionPropMap = new Map<string, Record<string, PropOption>>()
export const DefinitionDecoratorMap = new Map<string, DecoratorWrapper[]>()
export const ObservedAttrsMap = new Map<string, Set<string>>()

export const ComponentDynamicCssUpdaterMap = new WeakMap<CompElem<any>, Map<Function, CSSStyleSheet>>()


export const PATH_SEPARATOR = '-'