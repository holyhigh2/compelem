/**
 * 共享内容
 */
export const ChangedMap = new WeakMap
export const EXP_KEY = /\s+\.?key\s*=/;
export enum CollectorType {
    CSS = 1,
    COMPUTED = 2
}
export enum DecoratorKey {
    PROPS = '__deco_props',
    STATES = '__deco_states',
    COMPUTED = '__deco_computed',
    WATCH = '__deco_watch',
    EVENTS = '__deco_events',
}