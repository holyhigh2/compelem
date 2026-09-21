import { each } from "myfx";
import { DefinitionComponentMap } from "./constants";
import { installCompElemDevtools } from "./devtools";
import { createRef, css, h } from "./render/render";
import { Template } from './render/Template';
export { reactive as createReactiveState, getCurrentRenderComponent } from "./reactive";

// DevTools 接入点：模块加载期即挂载（扩展据此判断核心库是否已加载）
installCompElemDevtools();

//decorators
export * from "./decorator/Decorator";
export * from "./decorator/index";
export * from "./decorators/computed";
export * from "./decorators/csscope";
export * from "./decorators/debounced";
export * from "./decorators/emits";
export * from "./decorators/event";
export * from "./decorators/onced";
export * from "./decorators/prop";
export * from "./decorators/query";
export * from "./decorators/state";
export * from "./decorators/tag";
export * from "./decorators/throttled";
export * from "./decorators/watch";
//directives
export * from "./directive/index";
export * from "./directives/Bind";
export * from "./directives/Classes";
export * from "./directives/ForEach";
export * from "./directives/Html";
export * from "./directives/IfElse";
export * from "./directives/IfTrue";
export * from "./directives/Model";
export * from "./directives/Show";
export * from "./directives/Slot";
export * from "./directives/Styles";
export * from "./directives/When";
//transition
export * from "./transition";
export * from "./viewTransition";

export { createRef, css, h, Template };
export function defineComponents() {
    each(DefinitionComponentMap, (clz, name) => {
        if (!customElements.get(name)) customElements.define(name, clz as any)
    })
}

/**
 * 按需注册组件子集：只注册 names 中列出的自定义元素。
 * 用于宿主应用只使用组件库一小部分时，避免注册全部组件带来的启动开销。
 * @param names 要注册的自定义元素名称列表（如 ["ce-button", "ce-select"]）
 */
export function defineComponentsSubset(names: string[]) {
    for (const name of names) {
        const clz = (DefinitionComponentMap as Record<string, Function>)[name];
        if (clz && !customElements.get(name)) {
            customElements.define(name, clz as any);
        }
    }
}

export * from './CompElem';
export * from './config';
export * from './types';

export * from './utils';

export * from './helpers';

