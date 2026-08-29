import { each } from "myfx";
import { DefinitionComponentMap } from "./constants";
import { createRef, css, h } from "./render/render";
import { Template } from './render/Template';

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

export { createRef, css, h, Template };
export function defineComponents() {
    each(DefinitionComponentMap, (clz, name) => {
        if (!customElements.get(name)) customElements.define(name, clz as any)
    })
}

export * from './CompElem';
export * from './config';
export * from './types';

export * from './utils';

export * from './helpers';

