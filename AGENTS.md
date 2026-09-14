# compelem — AI 速查手册

> 本文件面向 AI 编码助手。内容依据 `src/` 源码整理，**读取本文件即可获得完整公开 API，无需扫描包源码**。
> 信息不足时按文末「深入阅读」指引查阅，不要盲目 grep 整个包。

## 概览

- **compelem** v0.27.0（MIT，作者 holyhigh2）：现代化、响应式、轻量的 WebComponent 开发库，基于 Class + 装饰器构建。
- TypeScript 编写；发布入口为 `dist/index.js`（`main`/`module`），类型 `dist/index.d.ts`。**零运行时依赖**（内部工具库 myfx 已打包）。
- 使用前提：TypeScript 需开启 `experimentalDecorators: true`。
- 本仓库构建：rollup（`npm run build`），产物在 `dist/`。
- ⚠️ **`dist/index.d.ts` 落后于 `src/`**（缺 `Transition`/`animate`/`viewTransition`/`defineComponents` 等新导出）。类型信息以 `src/index.ts` 和本文件为准，重新 build 前**不要**引用 dist 的 .d.ts 下结论。

## 心智模型

1. 组件 = `CompElem` 子类 + `@tag("x-foo")` 注册 → HTML 中直接 `<x-foo>` 使用（或调 `defineComponents()` 批量注册）。
2. `render()` 返回 `h` 模板标签函数；返回 `null` 或不定义 = 无视图组件（不创建 Shadow DOM，仅支持 HOST/GLOBAL 样式）。
3. 数据流：`@prop`（外部传入、组件内只读）→ `@state`（内部可变）→ `@computed`（缓存 getter）→ `@watch`（监视）→ 模板自动响应。
4. 样式：`@csscope(...)` + 静态 getter + `css` 模板；动态样式走 `cssVars` getter（自动转 `--kebab-case` CSS 变量）。
5. `@state/@prop/@watch/@computed/@emits` 可被子类继承且不会互相覆盖。

## 模板系统

```ts
render(): Template | null {
  return h`<div @click="${this.onClick}" .value="${v}" ?disabled="${d}" *r="${r}">...</div>`
}
```

| 表达式位置 | 类型 | 说明 |
|---|---|---|
| 特性值内 `attr="${...}"` | ATTR | 可内嵌多个插值 |
| 属性 `.value="${...}"` | PROP | 仅组件标签，传类型参数，单个插值 |
| 标签体内 `${...}` | TEXT | 文本/结构指令，可多个 |
| 组件标签体内 `${...}` | SLOT | 同 TEXT，但宿主必须是组件 |
| 标签上 `<div ${show(x)}>` | TAG | 指令直接挂在标签上 |

属性前缀：`@`=事件、`.`=组件 prop、`?`=toggle 类布尔特性、`*`=求值后才设置（SVG 等，支持 `:camel/:kebab/:snake` 格式转换，如 `*view-box:camel`）。

其他：`key=${id}` 用于 `forEach` 项；`ref="${refObj}"` 配合 `createRef`（用于 DOM 被移出仍需访问的场景，如 tooltip/overlay）。

## 装饰器（全部从包根导出）

| 装饰器 | 签名 | 说明 |
|---|---|---|
| `@tag` | `(name: string, immediate = false)` | 注册组件标签名；`immediate=true` 立即 `customElements.define`，否则等 `defineComponents()` |
| `@prop` | `(options?: PropOption)` 或无参 | 外部传入属性，组件内**不可直接赋值**。无默认值时必须给 `type` |
| `@state` | 无参或 `(options?: StateOption)` | 组件内部响应状态，仅组件内修改 |
| `@computed` | 用于**非静态 getter** | 缓存计算属性，依赖的 prop/state 变化才重算 |
| `@watch` | `(source: string \| string[], options?: WatchOptions)` | 监视 prop/state；handler `(nv, ov, source, subNv?, subOv?)` |
| `@query` / `@queryAll` | `(selector: string, cache?: QueryCache)` | ShadowDOM 内 CSS 查询，结果为响应式字段；`QueryCache.ONCE` 仅查一次 |
| `@csscope` | `(...scopes: Csscope[])` | 用于 **static getter**，返回 `css`\`\` / CSSStyleSheet / 数组 |
| `@event` | `(eventName: string, eventTarget?: (comp) => HTMLElement \| Promise<HTMLElement> \| Window)` | 绑定非视图事件（window/document/自身元素），事件名支持修饰符 |
| `@emits` | `(...names: string[])` | 声明组件事件（必须先声明才能 `emit`），支持通配 `'update:*'` |
| `@debounced` | `(wait: number, immediate = false)` | 方法防抖；同时生成原函数 `fn_$__` |
| `@throttled` | `(wait: number)` | 方法节流；原函数 `fn_$__` |
| `@onced` | 无参 | 方法只执行一次；原函数 `fn_$__` |

选项类型（均已导出）：

- `PropOption`: `{ type: Constructor | Constructor[], required?, model?, attribute?, shallow?, hasChanged?(nv, ov, chain, subNv, subOv), converter?(string), isValid?(value, props?) }`
  - `model: true` → 对该 prop 赋值自动触发 `update:xxx` 事件（配合 `model` 指令双向绑定）
- `StateOption`: `{ shallow?, prop?(用指定 prop 初始化), hasChanged?(...) }`
- `WatchOptions`: `{ immediate?, deep?, once? }`
- `Csscope`: `INNER`(组件内/shadowDOM) | `HOST`(宿主) | `GLOBAL`(document)

低层扩展：`Decorator` 抽象类 + `decorator(decoClass)` / `decoratorWithNoArgs(decoClass)` 可自定义装饰器；`makeState(ctor, key, options?)` 可在构造器内声明 state；自定义指令用 `directive(fn, scopes: EnterPointType[])`。

## 内置指令

指令是普通函数调用，返回值插入模板。括号内为允许的插入位置。

| 指令 | 位置 | 签名 | 示例 |
|---|---|---|---|
| `bind` | TAG | `(obj: Record<string, any>)` | `<div ${bind(obj)}>`；组件标签自动区分 prop/attr |
| `show` | TAG | `(visible: boolean, cbk?: (el, visible) => void)` | 基于 display 切换 |
| `model` | TAG | `(value: any, updateProp = 'value', modelProp?: string)` | 双向绑定；组件监听 `update:xxx`，input/textarea/select/checkbox 自动适配。**仅支持静态路径** |
| `classes` | TAG | `(cls: Record<string, boolean\|string> \| string[] \| string)` | 可与静态 class 混写 |
| `styles` | TAG | `(style: Record<string, string> \| string \| Array<...>)` | 值支持 `{value, important}`；可与静态 style 混写 |
| `forEach` | TEXT/SLOT | `(value: any[] \| Record, keyFn: KeyFn, tmpl: TplFn)` | `${forEach(list, it => it.id, it => h`<li key=${it.id}>...`)}`；key 必须唯一 |
| `ifTrue` | TEXT/SLOT | `(cond: boolean, tplFn: TplFn)` | 条件渲染 |
| `ifElse` | TEXT/SLOT | `(cond: boolean, ifTmpl: TplFn, elseTmpl: TplFn)` | 二分支 |
| `when` | TEXT/SLOT | `(value, cases: Array<[(v)=>boolean, TplFn]> \| Record<key, TplFn>)` | switch 模式时 `'default'` 是关键字 key |
| `slot` | SLOT | `(tplFn: TplFn, slotName?: string)` | 动态插槽（仅 CompElem 环境可用，`tplFn(args)` 接收插槽参数） |
| `html` | TAG/TEXT/SLOT | `(htmlStr?: string)` | 插入原始 HTML |
| `transition` | TEXT/SLOT | `(name: string, inner: DirectiveInstance, options?: TransitionOptions)` | 为内层结构指令切换加过渡；与 `<transition>` 伪标签等价，额外支持 JS 钩子 |

## 渲染 / 响应式原语

- `h(strings, ...vars): Template` — HTML 模板标签函数
- `css(strings, ...vars): CssTemplate` — CSS 模板（按 strings 缓存）
- `createRef<T extends Node>(): RefObject<T>` — `{ current?: T }`
- `createReactiveState(obj, context, rootProp?)` — `reactive` 的别名，创建响应式代理
- `getCurrentRenderComponent()` — 模板渲染期间取当前渲染组件
- `startViewTransition(callback): Promise<void> | undefined` — View Transitions API 封装（不支持时直接执行回调），适合整页路由过渡
- `defineComponents()` — 将所有 `@tag`（非 immediate）组件注册到 customElements
- `<transition>` 伪标签：仅静态属性 `name`(必填)/`mode`(`out-in`|`in-out`)/`appear`/`duration`；CSS 类名协议同 Vue（`{name}-enter-from/-enter-active/-enter-to/-leave-*/-move`）；JS 钩子见 `TransitionOptions`（`onEnter/onLeave` 有 `done` 回调）

其他已导出但面向内部的名称（一般无需使用）：动画运行时（`runTransition`/`buildTransitionCfg`/`playEnter`/`playMove`/`removeNodesAnimated` 等，位于 `src/animate/index.ts`）、`updateDirective`/`directiveScopeChecker`（指令调度）、`config` 的 `getBaseSheets` 等 getter、`utils` 的 `showError`/`DomUtil`/`isCompElemNode` 等工具、`helpers.CssHelper`、枚举 `EnterPointType`/`DirectiveUpdateTag`（自定义指令/装饰器时才需要）。

## CompElem 内置成员

只读：`rootComponent` `parentComponent` `wrapperComponent` `renderRoot`/`renderRoots` `shadowRoot` `slots` `slotHooks` `cssSheets` `globalCssSheet` `attrs` `props` `isMounted` `isDestroyed`

方法：`emit(evName, arg?, event?)` · `nextTick(cbk)` · `forceUpdate()` · `updateProps(props, force?)` · `insertStyleSheet(sheet)` · `destroy()`

生命周期（按序）：`propsReady(props)` → `render()` → `beforeMount()` → `mounted()`；更新时 `shouldUpdate(changed): boolean`；销毁时 `beforeDestroyed()` → `destroyed()`。

动态样式：实例 getter `cssVars` 返回 `{ testColor: v }` → 自动生成 `--test-color` 变量并追踪内部响应状态。

## 事件

1. **原生事件**：`<div @click>` → 回调收原生 Event
2. **扩展原生事件**：`resize`（元素尺寸）、`outside`（点击元素外部，可修饰 `outside.mousedown` 等）、`mutate`（MutationObserver，可修饰 `mutate.attr/child/char/tree`）
3. **组件事件**：`<l-select @change>` → 回调收自定义数据对象；**必须先 `@emits` 声明**，否则 `emit` 报错

事件修饰符（`.` 连接，可组合）：通用 `debounce:100/throttle:100/once`；原生 `stop/prevent/self`；鼠标 `left/right/middle`；键盘 `ctrl/alt/shift/meta` + `esc/a/b...`；监听用 kebab-case（`state-ready`）。跨框架（React/Vue）使用时给标签加 `emit-native` 属性将组件事件转 CustomEvent。

## 样式

- `@csscope(Csscope.INNER, Csscope.GLOBAL) static get anyName()` + `css` 模板，3 层域可任意组合
- 全局注入第三方样式：`setDefaults({ css: [tailwindStyle], global: {...}, 组件名: {默认props} })`（`config.ts` 导出）
- 无视图组件仅支持 HOST/GLOBAL 样式

## 最小完整示例

```ts
import { CompElem, tag, prop, state, computed, watch, emits, csscope, Csscope, css, h, forEach, ifElse } from "compelem";

@emits('change')
@tag("my-counter")
export class MyCounter extends CompElem {
  @prop({ type: Number, model: true }) value = 0;
  @prop label: string;                       // 无默认值必须显式 type
  @prop items: Array<{ id: number, name: string }>;
  @state count = 0;

  @computed
  get doubled() { return this.count * 2 }

  @watch('count', { immediate: true })
  onCount(nv: number, ov: number) { console.log(nv, ov) }

  @csscope(Csscope.INNER)
  static get css() {
    return css`button{ color: var(--c, black); }`
  }
  get cssVars() { return { c: this.count > 9 ? 'red' : 'black' } }

  mounted() {
    this.emit('change', { value: this.count })
  }

  render(): Template {
    return h`<div>
      <span>${this.label}: ${this.count}</span>
      <button @click="${() => this.count++}">+1</button>
      ${forEach(this.items, it => it.id, it => h`<li key=${it.id}>${it.name}</li>`)}
      ${ifElse(this.count > 5, () => h`<b>big</b>`, () => h`<i>small</i>`)}
    </div>`
  }
}
```

## 结构指令的惰性依赖（重要）

`ifTrue`/`ifElse`/`when` 等结构指令的模板函数中的 state/prop 依赖是**惰性的**：只有在该分支首次被渲染执行时，框架才会收集并监听其中的变量。

**影响**：如果初始条件为 `false`，则 `ifTrue(false, ()=>h`...${this内部变量}...`)` 中的 `this内部变量` 在首次渲染时不会被监听。只有当条件变为 `true`、模板函数被调用后，该变量的变化才能触发更新。

**原理**：模板字符串的依赖只能在变量被读取时收集（JS Proxy 特性），而结构指令的模板函数在条件不满足时不会执行，因此依赖无法提前建立。update 阶段执行模板函数时会同步启动变量监控，从而捕获延迟分支中的依赖。

**应对**：如需确保某个变量始终被监听，应在根模板上下文中读取它（如赋给一个非条件渲染的表达式），或使用 `@watch` 装饰器显式监视。

## 结构指令 vs 非结构指令

| 分类 | 指令 | 特征 |
|---|---|---|
| **结构指令** | `forEach` `ifTrue` `ifElse` `when` `slot` | 产生/删除 DOM 子树，创建独立的依赖上下文（context），模板函数**必须**返回创建函数而非直接返回模板 |
| **非结构指令** | `show` `bind` `classes` `styles` `model` | 仅修改已有 DOM 属性，不产生新视图，依赖在指令外部收集 |

结构指令的模板函数如果直接返回模板实例（而非函数），内部指令将无法获取变量路径进行绑定监控，导致依赖丢失。

## 依赖收集上下文（Context）

- 每个变量记录自己所在的 context（组件根 context 或指令 context）
- 变量变更时仅通知所在 context 进行局部 re-render，不会触发整棵组件树更新
- 结构指令创建的子 context 中的变量变更，只触发该指令的 update，不影响父级 context
- 变量必须通过 `@state` 或 `@prop` 声明才能被监控；未声明的变量变更不会触发任何更新

## 常见坑

- **prop 不可在组件内赋值**（DEV 下报错）；修改请 `model: true` 或 `emit('update:xxx', ...)` 通知父级
- `@prop` 字段名必须小写字母开头；无默认值必须显式 `type`
- `@csscope`/`@computed` 对 getter 有静态/非静态要求，用错位置 DEV 下会报错
- 组件事件监听名用 kebab-case；未 `@emits` 声明的事件不能 emit
- `model` 指令只支持静态属性路径；`forEach` 的 key 重复会告警且该项不渲染
- `render()` 返回 `null` 的组件没有 Shadow DOM，`@query` 将查不到内容
- `h` 模板中的 HTML 注释需要 `vite-plugin-compelem-strip-comments` 插件支持
- 本包零运行时依赖但内部使用 myfx；不要假设使用者环境里有 myfx
- **非指令中的普通表达式变量无法被追踪**——如果变量仅在模板的普通插值中使用（非指令返回值），该变量变化不会触发更新。需要确保变量在指令表达式中被读取，或使用 `@watch` 显式绑定

## 深入阅读（按需，勿全量扫描）

- `README.md` — 完整中文教程（渲染流程表、插槽、事件、过渡动画细节都在这里）
- `_SPEC.md`、`_Algo.md` 等下划线文件 — 内部设计规格
- `test/` — 官方用法示例（找某个 API 的真实用法先看这里）
- `src/index.ts` — 导出总入口；`src/types.ts` — 全部选项类型定义
- `dist/index.d.ts` — ⚠️ 可能滞后于 src，仅作参考

## 维护约定

**修改 `src/` 中任何公开 API（新增/改名/删除导出、装饰器与指令签名、选项字段）时，必须同步更新本文件与概览中的版本号。** 本文件是 AI 与开发者的首要 API 参考，滞后比没有更危险。
