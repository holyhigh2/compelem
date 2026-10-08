# compelem — AI 速查手册

> 本文件面向 AI 编码助手。内容依据 `src/` 源码整理，**读取本文件即可获得完整公开 API，无需扫描包源码**。
> 信息不足时按文末「深入阅读」指引查阅，不要盲目 grep 整个包。

## 概览

- **compelem** v0.33.0（MIT，作者 holyhigh2）：现代化、响应式、轻量的 WebComponent 开发库，基于 Class + 装饰器构建。
- TypeScript 编写；发布入口为 `dist/index.esm.js` / `dist/index.cjs.js`（`package.json` `exports` 映射），类型 `dist/index.d.ts`。**零运行时依赖**（内部工具库 myfx 已打包）。
- 使用前提：TypeScript 需开启 `experimentalDecorators: true`；**必须挂载编译插件 `@compelem/compiler`（`compelemCompiler()` Vite 插件）**——约定违规仅由编译期报错，不挂插件时没有报错出口。
- 本仓库构建：Vite 8 双构建（`npm run build` = `build:prod` 压缩 + `build:dev` 未压缩 debug），产物在 `dist/`。
- 类型产物 `dist/*.d.ts` 随 `npm run build` 重新生成、与 `src/` 同步；类型权威仍以 `src/index.ts` 和本文件为准。

## 心智模型

1. 组件 = `CompElem` 子类 + `@tag("x-foo")` 注册 → HTML 中直接 `<x-foo>` 使用（或调 `defineComponents()` 批量注册）。
2. `render()` 返回 `h` 模板标签函数；返回 `null` 或不定义 = 无视图组件（不创建 Shadow DOM，仅支持 HOST/GLOBAL 样式）。
3. 数据流：`@prop`（外部传入、组件内只读）→ `@state`（内部可变）→ `@computed`（缓存 getter）→ `@watch`（监视）→ 模板自动响应。
4. 样式：`@csscope(...)` + 静态 getter + `css` 模板；动态样式走 `cssVars` getter（自动转 `--kebab-case` CSS 变量）。
5. `@state/@prop/@watch/@computed/@emits` 可被子类继承。`@prop/@state/@computed` 的定义表由编译器沿构造器原型链**浅替换合并**后写进每个类自己的 `__ce_static__`（覆盖语义=浅替换：子类重声明同名 key 整体替换父类选项对象，不逐字段深合并）；`@watch/@emits` 各自另有注册表/产物表。

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
| `@prop` | `(options?: PropOption)` 或无参 | 外部传入属性，组件内**不可直接赋值**。无默认值时必须给 `type`。运行时为 no-op（编译插件提取；不支持 3 参命令式形态） |
| `@state` | 无参或 `(options?: StateOption)` | 组件内部响应状态，仅组件内修改 |
| `@computed` | 用于**非静态 getter** | 缓存计算属性，依赖的 prop/state 变化才重算 |
| `@watch` | `(source: string \| string[], options?: WatchOptions)` | 监视 prop/state；handler `(nv, ov, source, subNv?, subOv?)` |
| `@query` / `@queryAll` | `(selector: string, cache?: QueryCache)` | ShadowDOM 内 CSS 查询，结果为响应式字段；`QueryCache.ONCE` 仅查一次 |
| `@csscope` | `(...scopes: Csscope[])` | 用于 **static getter**，返回 `css`\`\` / CSSStyleSheet / 数组 |
| `@event` | `(eventName: string, eventTarget?: (comp) => HTMLElement \| Promise<HTMLElement> \| Window)` | 绑定非视图事件（window/document/自身元素），事件名支持修饰符 |
| `@emits` | `(...names: string[])` | 声明组件事件（必须先声明才能 `emit`），支持通配 `'update:*'` |
| `@debounced` | `(wait: number, immediate = false)` | 方法防抖（**编译期前移**）；同时生成原函数 `fn_$__`。运行时为 no-op —— 未编译组件无防抖 |
| `@throttled` | `(wait: number)` | 方法节流（**编译期前移**）；原函数 `fn_$__`。运行时为 no-op —— 未编译组件无节流 |
| `@onced` | 无参（也支持 `@onced()`） | 方法只执行一次（**编译期前移**）；原函数 `fn_$__`。运行时为 no-op —— 未编译组件无一次性 |

选项类型（均已导出）：

- `PropOption`: `{ type: Constructor | Constructor[], required?, model?, attribute?, shallow?, hasChanged?(nv, ov, chain, subNv, subOv), converter?(string), isValid?(value, props?) }`
  - `model: true` → 赋值语义由 `events/writeModelProp` 按宿主三路分派：①父端接了 `update:xxx`（`model` 指令 / `@update:value`，已登记 `_subComponentEventMap`）⇒ 只 emit 不写本地（父端是权威，可能 clamp/校验）；②没人接 ⇒ 本地兜底（否则 emit 在无 `wrapperComponent` 时 return，值蒸发）；③没人接但有 `emit-native` ⇒ 本地兜底 + 发原生 CustomEvent。判据是「有没有人注册监听」而非「有没有父组件」
- `StateOption`: `{ shallow?, prop?(用指定 prop 初始化), hasChanged?(...) }`
- `WatchOptions`: `{ immediate?, deep?, once? }`
- `Csscope`: `INNER`(组件内/shadowDOM) | `HOST`(宿主) | `GLOBAL`(document)

低层扩展：`makeState(ctor, key, options?)` 可在构造器内声明 state；自定义指令用 `directive(fn, scopes: EnterPointType[])`，executor 第4参 meta 为 `{ pointType?, renderComponent?, slotComponent?, varChain?, attrName?, updatedMap?, up? }`（`up?: UpdatePoint` = 本指令更新点，可用于读取 `up.__depSegs` 等点位状态）。

compelem 不允许降级：装饰器语义一律由编译器在构建期前移，运行时没有任何装饰器计划表 / 注册表。
方法类内置装饰器（`@debounced` / `@throttled` / `@onced`）的包装语句由编译器注入类构造体（见 `@compelem/compiler` 的 `analyze/method-deco-extract.ts`），运行时导出仅为**标记用的 no-op**。

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

其他已导出但面向内部的名称（一般无需使用）：动画运行时（`runTransition`/`buildTransitionCfg`/`playEnter`/`playMove`/`removeNodesAnimated` 等，位于 `src/animate/index.ts`）、`updateDirective`/`directiveScopeChecker`（指令调度）、`config` 的 `getBaseSheets` 等 getter、`utils` 的 `showError`/`DomUtil`/`isCompElemNode` 等工具、`helpers.CssHelper`、枚举 `EnterPointType`/`DirectiveUpdateTag`（自定义指令时才需要）。CompElem 实例另有编译期点位更新辅助 `_t2s`/`_updateDir`/`_setToggleProp`/`_setProp`（生成代码经 `rc` 调用，业务代码勿直接使用）；注入的 `accessors` 访问器：prop/state/computed 的 getter/setter 直接读写 `this.__s.<name>.value`，model prop setter 走 `writeModelProp`，query 走 `_queryGet`（均经编译注入 import 直调，业务代码勿直接使用）。

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

- **prop 不可在组件内赋值**（编译期报错 E-PROP-ASSIGN，不挂插件时无报错）；修改请 `model: true` 或 `emit('update:xxx', ...)` 通知父级
- `@prop` 字段名必须小写字母开头；无默认值必须显式 `type`；**五族 options/selector 只支持对象字面量或文件内 `const`**——import/`let`/动态拼接、`super` computed、族外装饰器同居 → E 码阻断（E-PROP-ARG 等），运行时 `@prop` 已是 no-op 无兜底
- `@csscope`/`@computed` 对 getter 有静态/非静态要求，用错位置编译期报错（E-CSSCOPE-TARGET / E-COMPUTED-NOT-GETTER）
- 组件事件监听名用 kebab-case；未 `@emits` 声明的事件不能 emit
- `model` 指令只支持静态属性路径；`forEach` 的 key 重复会告警且该项不渲染
- `render()` 返回 `null` 的组件没有 Shadow DOM，`@query` 将查不到内容
- `h` 模板中的 HTML 注释需要 `vite-plugin-compelem-strip-comments` 插件支持
- 本包零运行时依赖但内部使用 myfx；不要假设使用者环境里有 myfx
- **非指令中的普通表达式变量无法被追踪**——如果变量仅在模板的普通插值中使用（非指令返回值），该变量变化不会触发更新。需要确保变量在指令表达式中被读取，或使用 `@watch` 显式绑定
- **结构指令回调必须字面出现在 render() 模板内**——来自 prop/运行时构造的回调（如 `when(v, this.cases)`、`ifTrue(c, this.method)`）不可用

## 编译期优化与 `__ce_static__` 契约

配套编译插件 `@compelem/compiler` 识别 CompElem 子类后，向 class 注入 `static __ce_static__` 字段。**准入判据 = `buildTemplate` 存在：存在即走静态路径（取值表达式内联在 `fx`/`pointEffects` 工厂里），缺失即按未编译组件处理（DEV 报错，见下「强制编译插件模式」）。`version` 恒为 `3`，其余字段可选**：

| 字段 | 类型 | 作用 |
|---|---|---|
| `version` | `3` | 注入格式版本（`COMPILED_STATIC_VERSION`；运行时要求严格等于 `3`，否则报错） |
| `buildTemplate` | `() => { fragment, ups, emptyEvents, nodes, visit?, paths? }` | 编译期生成的纯 `document` API 建 DOM 函数（唯一建 DOM 路径）；`ups` 与运行时 `UpdatePointMeta` 同序；`nodes` 为文档序元素+文本（与 nodeSn 对齐，运行时 O(1) 定位、免 collectNodes）。**每实例调用现建现用**（`buildStaticView` 直通 `renderTemplate(..., built)`，仅首实例 hydrate 结构入 `TMPL_META_CACHE`） |
| `subs` | `Record<number, { buildTemplate?, pointEffects?, fx? }>` | **子模板 codegen**：结构指令回调 `fn.__subId` → 独立 `buildTemplate` + `fx`/`pointEffects`（children 经 `insertSubView` 挂到指令 UpdatePoint 的 `__childUpdaters`）；结构指令经 `resolveSubTemplateMeta` 消费，**取值一律走 `fx`** —— 自洽子模板读 `subs[id].fx`，跨层内联子模板（引用祖先形参，如 forEach 项内 ifTrue）提升到回调实例上的 `__fx.fx`；**`subs`/`__subId` 缺失 = DEV 报错**。**子模板表达式内联失败（`usedGet`）不导致整组件降级**（自洽子模板内联进该 sub 的 `fx`、跨层者闭包提升到 `__fx`）；仅 buildTemplate 结构提取失败才整组件降级 |
| `pointEffects` | `(number \| FxFn)[]` | 值点（属性/文本/指令）per-point effect 工厂表：数值条目 = `fx` 下标（同一工厂源码在产物里只 emit 一份），其余为工厂本体。签名 `(rc, nodes, ...params) => () => void`；**取值表达式已内联进工厂体**（`rc.__s.<k>.value` 等），依赖在 effect 运行期动态建立 |
| `fx` | `FxFn[]` | 逐实例产物工厂表（指令实例 / 事件 handler / ref 等；下标 = `up.ux`）；`pointEffects` 的数值条目按下标引用本表 |
| `watchEffects` | `((comp) => () => void)[]` | `@watch` 产物：每个 watch 一个 effect 工厂，setup 期逐条 `effect(factory(this))` 建订阅 |
| `cssEffect` | `(comp) => () => void` | `cssVars` 的响应式 effect 工厂：工厂体内直接读 `rc.__s.<k>.value` 建立依赖，setup 期 `effect(cssEffect(this))` |
| `props` / `states` | `Record<string, PropOption \| StateOption>` | **五族前移**（见下）携带的定义元数据（`@prop`/`@state` 装饰器被剥离时注入；含 `model`/`attribute:false`/`shallow`/`hasChanged` 标志）。**是沿构造器原型链浅替换合并后的完整表**（编译器在类体 emit `...Reflect.getPrototypeOf(this).__ce_static__?.props`），运行时单次读取即全量 |
| `computedGetters` | `Record<string, Getter>` | `@computed` getter 函数外提（装饰器与成员被剥离）；同样参与浅替换合并。仅 devtools 元数据消费（实际求值走构造体注入的 `signalComputed` + 访问器读 `__s`） |
| `noView` | `boolean` | 无视图组件标记（render() 不存在 / 返回 null / 继承链终点为 CompElem）→ 不创建 Shadow DOM |
| `accessors` | `string` | **类体注入段（不是 `__ce_static__` 字段）**：注入的纯 JS 访问器源码（`get/set <name>`、`static get observedAttributes`——kebab 键、经 `Reflect.getPrototypeOf(this)` 链式合并父类），拼在 `__ce_static__` 之后；prop/state/computed 的 getter/setter 直读写 `this.__s.<name>.value`，model prop setter 直调 `writeModelProp`，query 走模块级 `_queryGet`（均经编译注入 import 直调） |
| `directiveVarChain` | `string[]` | TAG 位置指令（bind/show/model/classes/styles/html）的静态 this 链（如 `model(this.form.name)` → `['form','form.name']`）；**不是顶层字段**，而是写在 `buildTemplate` 产出的 `ups[i]`（运行时 `UpdatePointMeta.directiveVarChain`）上，运行时 `varChain` 为空时回退使用 |

**静态路径准入 = `buildTemplate` 存在**（`CompElem.setup()` 首屏走 `buildStaticView`；更新由 per-point effect 订阅信号直接驱动 —— 取值表达式已内联进 `pointEffects`/`fx` 工厂，依赖在 effect 运行期动态建立；见 `CompElem.ts` ~501/~517）。`buildTemplate` 缺失时按未编译组件处理（DEV 报错）。`buildStaticView` **每实例调 `buildTemplate` 现建现用**（免 cloneNode + collectNodes 回扫）；结构指令子模板经 `buildSubTemplate` 每次插入现建。transition 动态属性仍取首实例 hydrate 的 `upm.transitionCfg`（首实例冻结语义）。

**五族访问器前移（@prop/@state/@computed/@query/@queryAll）**：编译插件默认执行。五族装饰器从类体**剥离**，定义改由 `props/states/computedGetters` 元数据 + 注入的 `accessors` 承载。**继承链在编译期合并完毕（家族表合并语义）**：每个类的 `__ce_static__` 里 `props`/`states`/`computedGetters` 一律 emit 为 `...Reflect.getPrototypeOf(this).__ce_static__?.<name>` 叠加 own 条目（无 own 条目时直接别名父表）——own 静态字面量会遮蔽父类整张表，故**必须一律 emit**，漏 emit 即丢祖先定义。覆盖语义为**浅替换**（重声明 key 整体替换父类选项对象，不逐字段深合并）。用 `Reflect.getPrototypeOf(this)` 而非 `super.__ce_static__`：静态字段初始化器里无 `extends` 时 `super` 是 SyntaxError，且重放 extends 源码会在 `extends Mixin(X)` 上二次调用 mixin 工厂；构造器原型链是跨文件/mixin/node_modules 预构建包的唯一共同通道。**编译期无需解析继承链**（`compileFile` 保持单文件纯函数）。`#propDefs/#stateDefs` 构造期单次读 `ctor.__ce_static__`；`static get observedAttributes`（编译器生成，已链式并集）是属性列表唯一来源，浏览器只对该列表内的属性触发 `attributeChangedCallback`。`attribute` 的缺省 true 由读取端兜底（`propDef.attribute !== false`）；`required` 读作真值、`shallow` 无运行时消费者。注入 `model: true` 的 prop setter 直调模块级 `writeModelProp(key, v, this)`（`events/event.ts` 定义、`index.ts` 导出，经编译注入 import）：按宿主三路分派赋值语义（父端装了 `update:xxx` ⇒ 只 emit 不落值；否则本地兜底，`emit-native` 时再补发原生 CustomEvent，见上文 `model: true`）；其余 prop/state 的 getter 与 setter、以及 computed，一律直读写信号 `this.__s.<name>.value`，query 为模块级 `_queryGet`——均经编译注入 import 直调。prop/state 字段声明整体删除，初始值改由构造体注入 `this.__s.<key> = signal(init)`（无构造则合成 `constructor(...a){super(...a);...}`），`#initProps/#initStates` 以 `this.__s[key].value` 作默认值。**逐族 all-or-nothing + 失败即 E 码报错**（error 级阻断构建）：options/selector 只做**文件内静态分析**——对象字面量或模块级 `const` 内联支持，import/`let`/运行时拼接、computed 体内 `super`、族外或多族装饰器同居 → `E-PROP-ARG`/`E-STATE-ARG`/`E-COMPUTED-ARG`/`E-QUERY-ARG`/`E-DECO-COEXIST`（同居须把其他装饰器拆分到独立成员）；出错的族不删不注（运行时 `@prop` 已是 no-op，无兜底），但家族键仍 emit 父表别名以保住继承来的定义。与降级/noView **正交**（族码照常注入）；`skipInjection` 类**照常提取并注入**：视图字段以 `...Reflect.getPrototypeOf(this).__ce_static__` 整体继承（own 一律覆盖，**不参与合并**），家族字段同上逐表叠加。query 访问器门控 `this.isMounted`（镜像运行时装饰器 mounted 钩子时序），`QueryCache.ONCE` 走 per-实例 `QueryCacheMap`。**注入产物必须纯 JS**（无 TS 注解语法——探针直接 `new Function` eval 产物；模板插值内也不得出现 `as`/非空断言）。**已知边界**：视图依赖分析（`deps-extract`）仍解析不出 mixin / 跨文件基类**继承来的普通 getter**——模板里拿它当根时首屏正确但无信号订阅；继承来的 **prop** 不受影响（走 `observedAttributes` + `updateProps`）。根治需跨文件符号表。

**组件准入三选一**：① `isSub`（super 链能在本文件内解析到 `CompElem`）② `@tag` ③ **类体带 compelem 家族装饰器**（`@prop/@state/@computed/@query/@queryAll`）。第 ③ 条是精确判别器——这些装饰器运行时全是 no-op，只在编译期有意义，故带它们的类必然是组件（`class LiveFieldMap extends Map` 不带，自动排除）。它覆盖两类易漏编译的类：**mixin 工厂内的类**（super 是形参 ⇒ 必须写成函数内 class **声明**；TS 禁止在 class 表达式上写装饰器 TS1206）与**跨文件基类**（super 在别的文件且无 `@tag`）。配套：`collectMixinClasses` 收顶层函数体内的 `ClassDeclaration` 并**单独成列表**（不混进按类名索引的 `localClasses`，否则污染 `deps-extract`/`conventions` 的同文件 super 链解析）；`ComponentAnalysis.cls` 随结果下发 class 节点本体（各 analyze 模块直接用 `ComponentAnalysis.cls`，不靠 class 名反查——后者只覆盖顶层 class，会让 mixin 类**静默不提取**）；`defaultInclude` 放宽到「`.ts` 且含家族装饰器」（保持排除 `.js`，IIFE 产物会触发 D3 误报）。这两类 super 链不可知 ⇒ 无 own `render()` 时一律 `skipInjection` 继承基类视图，**绝不判 `noView`**（否则基类有视图时静默白屏），也不报 D6/D0 阻断构建。

**运行时无依赖收集**：`CompElem` computed 段与 cssVars 段的依赖由编译器生成的 `cssEffect` / `pointEffects` 闭包在**生成期**直接读 `rc.__s.<k>.value` 建立，订阅在 effect 运行期生效；子视图依赖由子模板 `fx`/`pointEffects` 直连信号。家族表全量信息由 `__ce_static__.props/states/computedGetters` 单次读取提供（供 devtools 与 `#initProps` 等）。**保留的收集窗**：ForEach keyFn INIT、`directive/index.ts` 更新期、CompElem 首屏 `pointEffects` 挂载、reactive end 配对。静态提取失败原因可用 `DEPS_TRACE=1` 打印（compiler `deps-extract.ts`，stderr `[deps-fail] <原因标签>`）。

**强制编译插件模式**：`__ce_static__` 是视图唯一来源，运行时无 render() 回退路径。未挂插件的组件在 DEV 下显式报错，生产下属未定义行为。

### 降级规则（D 系列：放弃注入，编译插件默认报错阻断构建）

| 规则 | 触发条件 |
|---|---|
| D0 | 无 render() 且非 CompElem 子类（基类不在本文件） |
| D1 | render() 内出现动态成员访问 `this[expr]` |
| D2 | render() 内访问非响应式 getter |
| D3 | render() 内出现未知自由标识符（`forEach`/`ifElse` 等回调的**形参与局部变量**已有词法绑定追踪，见 compiler `analyze/render-body.ts` `withBound`，不触发 D3） |
| D4 / D5 | render() 没有 / 有多个顶层 return |
| D6 | 跨文件继承 render（基类不在本文件，无法判断是否有 render） |
| D7 | 模板插值内直接嵌套 `h\`\``（硬错误） |

**D0 拆分**：无 own render() 时——同文件继承链上有 render → `skipInjection`（继承父类 `__ce_static__`）；链终于 CompElem → `noView: true` 注入；链终于未知跨文件基类 → D6；`@tag` 非 CompElem 类 → D0。

### 约定错误（E 系列：error 级，阻断构建）

- 装饰器/成员层（compiler `analyze/conventions.ts`）：`E-PROP-TYPE`、`E-PROP-CASE`、`E-PROP-ASSIGN`、`E-COMPUTED-NOT-GETTER`、`E-CSSCOPE-TARGET`、`E-EMIT-UNDECLARED`、`E-EMIT-ARG`、`E-EMITS-ARG`、`E-CONST-KEY`、`E-DECO-TARGET`（内置装饰器目标校验：debounced/onced/throttled→METHOD，query/queryAll→FIELD）
- 方法装饰器前移层（compiler `analyze/method-deco-extract.ts`）：`E-METHOD-DECO-ARG`（`@debounced`/`@throttled` 的 wait、`@debounced` 的 immediate 无法静态解析；`@onced` 带参）、`E-METHOD-DECO-HOOK`（组件自带 `beforeDestroyed()` 与清理注入冲突）
- 五族提取层（compiler `analyze/field-extract.ts`）：`E-PROP-ARG`（options 静态解析失败/参数个数/动态 attribute·model/非字段成员）、`E-STATE-ARG`（同前）、`E-COMPUTED-ARG`（体内含 super/调用形态/非非 static getter）、`E-QUERY-ARG`（selector/cache 静态解析失败/bare 调用/静态字段）、`E-DECO-COEXIST`（族外装饰器或多族装饰器同居——须拆分独立成员声明）
- 模板层（compiler `analyze/template-rules.ts`）：`E-PROP-INTERP`（`.prop` 值必须是插值）、`E-EVENT-FN`（事件处理器必须是函数/成员）、`E-REF-TYPE`（`ref` 必须绑定 `createRef()`）、`E-DIRECTIVE-SCOPE`（指令插入位置校验）、`E-PROP-TARGET`（`.prop` 只能设在 CompElem 或 `<slot>` 上）

### 仅编译期校验（运行时无报错出口）

以下错误在框架源码中无运行时报错出口，唯一校验入口是编译插件：

- `@prop` 无默认值且无 `type`（E-PROP-TYPE）；组件内给 prop 赋值（E-PROP-ASSIGN）
- `@computed` 用在非 getter（E-COMPUTED-NOT-GETTER）；`@csscope` 用在非 static getter（E-CSSCOPE-TARGET）
- transition 的 `name` 必填、`duration` 非负、anchor 子元素合法性
- 事件处理器必须是函数（E-EVENT-FN）；`ref` 必须是 RefObject（E-REF-TYPE）
- `.prop` 值必须是插值（E-PROP-INTERP）；render() 根级动态结构（dynamic root，由 D 系列降级兜底）
- **emit 未声明检查（E-EMIT-UNDECLARED）**——编译期为唯一入口
- **`.prop` 目标/prop 存在性检查**——编译期为唯一入口

## 深入阅读（按需，勿全量扫描）

- `README.md` — 完整中文教程（渲染流程表、插槽、事件、过渡动画细节都在这里）
- `_SPEC.md`、`_Algo.md` 等下划线文件 — 内部设计规格
- `../compelem-test/test/` — 全部测试套件与官方用法示例（找某个 API 的真实用法先看这里）。测试已迁出为独立工程 `F:\github\compelem-test`（mirror 布局，`node_modules`/`dev` 为指向本仓库的 junction，src 经 alias 引用）：脚本在该目录下执行——`npm run test`（bench+integrity）/ `npm run test:features(:check)` / `npm run test:ui-bench` / `npm run test:ui`，集成验证 `node test/verify-ui.mjs`，链接冒烟 `node url-check.mjs`；UI 组件性能交叉对比见其 `test/bench/ui-report.md`（board/table/tree 三组件）
- `src/index.ts` — 导出总入口；`src/types.ts` — 全部选项类型定义
- `dist/index.d.ts` — ⚠️ 可能滞后于 src，仅作参考

## 维护约定

**修改 `src/` 中任何公开 API（新增/改名/删除导出、装饰器与指令签名、选项字段）时，必须同步更新本文件与概览中的版本号。** 本文件是 AI 与开发者的首要 API 参考，滞后比没有更危险。
