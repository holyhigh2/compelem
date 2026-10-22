# compelem — AI 速查手册

> 本文件面向 AI 编码助手。内容依据 `src/` 源码逐条核实（对应 **v0.30.0-beta.4** working tree），**读取本文件即可获得完整公开 API，无需扫描包源码**。
> 信息不足时按文末「深入阅读」指引查阅，不要盲目 grep 整个包。

## 概览

- **compelem** v0.30.0-beta.4（MIT，作者 holyhigh2）：现代化、响应式、轻量的 WebComponent 开发库，基于 Class + 装饰器构建。
- TypeScript 编写；发布入口由 `package.json` `exports` 条件映射：`development` → `dist-dev/`，`production`/默认 → `dist/index.esm.js` / `index.cjs.js`，类型 `dist/index.d.ts`。**`myfx` 是 peerDependency（`^2.0.0-beta.4`），构建时作 external 处理、不打包进产物**——宿主工程必须自装，切勿假设 compelem 已内联它。配套编译插件 `@compelem/compiler` 同样把 `myfx` 声明为 peerDependency（源码 `codegen/template-dom.ts`、`codegen/attr-name.ts` 直接 `from 'myfx'` 导入），宿主工程也需自装。
- 使用前提：TypeScript 需开启 `experimentalDecorators: true`；**必须挂载编译插件 `@compelem/compiler`（`compelemCompiler()` Vite 插件，仓库 `F:\github\compelem-compiler`）**——装饰器语义全部由编译期前移，运行时装饰器是 no-op 存根，约定违规仅由编译期报错。
- 本仓库脚本：`npm run build`（= `build:prod` 压缩 + `build:dev` 未压缩，产物 `dist/` 与 `dist-dev/`）· `npm run typecheck`（tsc --noEmit）。**本仓库不依赖 `@compelem/compiler`，也没有 dev 页/探针页**——`dev/` 与 Vite 调试配置已外移到兄弟仓库 `F:\github\compelem-harness`（private 项目，`npm run dev` 起 :8818，别名 `compelem` → `../compelem/src/index.ts`）。⚠️ `npm run lint` 的 eslint 配置是旧格式（会报 config migration 错误），不要依赖。
- 构建产物差异：prod 出 `index.esm.js` + `index.cjs.js`（terser 压缩、drop `debug/info/log`）；dev 额外产出 UMD `compelem.umd.js`（挂 `window.compelem`，myfx 全局名 `myff`）。
- 验证手段：headless Chrome + CDP 探针，脚本在 harness（`compelem-harness/dev/_round4_probe.mjs`、`_slot_probe.mjs`，可复用于任意探针页 URL）。改过本库或编译器 dist 后，先在 harness 里 `rm -rf node_modules/.vite` 再起服务，避免依赖重新优化的瞬时假失败。仓库根的 `test/` 是空目录。
- 类型权威以 `src/index.ts`、`src/types.ts` 和本文件为准；`dist/*.d.ts` 仅作参考。

## 心智模型

1. 组件 = `CompElem` 子类 + `@tag("x-foo")` 注册 → HTML 中直接 `<x-foo>` 使用（或调 `defineComponents()` / `defineComponentsSubset(names[])` 注册）。
2. `render()` 返回 `h` 模板；返回 `null` 或不定义 = 无视图组件（不创建 Shadow DOM，仅支持 HOST/GLOBAL 样式）。**运行时没有 render 回退路径**——`__ce_static__.buildTemplate` 是视图唯一来源（见下「编译契约」）。
3. 数据流：`@prop`（外部传入、组件内只读）→ `@state`（内部可变）→ `@computed`（缓存 getter）→ `@watch`（监视）→ 模板自动响应。
4. 样式：`@csscope(...)` + 静态 getter + `css` 模板；动态样式走 `cssVars` getter（自动转 `--kebab-case` CSS 变量）。
5. `@prop/@state/@computed` 的定义表由编译器沿构造器原型链**浅替换合并**后写进每个类自己的 `__ce_static__`（子类重声明同名 key 整体替换父类选项对象，不逐字段深合并）；`@watch/@emits` 各有独立产物表。

## 模板系统

```ts
render(): Template | null {
  return h`<div @click="${this.onClick}" .value="${v}" ?disabled="${d}">...</div>`
}
```

| 表达式位置 | 类型 | 说明 |
|---|---|---|
| 特性值内 `attr="${...}"` | ATTR | 可内嵌多个插值 |
| 属性 `.value="${...}"` | PROP | 仅组件标签（`CompElem` 或 `<slot>`），传类型参数，单个插值 |
| 标签体内 `${...}` | TEXT | 文本/结构指令，可多个 |
| 组件标签体内 `${...}` | SLOT | 同 TEXT，但宿主必须是组件 |
| 标签上 `<div ${show(x)}>` | TAG | 指令直接挂在标签上 |

属性前缀：`@`=事件、`.`=组件 prop、`?`=toggle 类布尔特性。`*` 前缀（求值后才设置，支持 `:camel/:kebab/:snake` 格式转换，如 `*view-box:camel`）由**编译器**在 `codegen/template-dom.ts` 处理，运行时无此前缀概念。

其他：`key=${id}` 用于 `forEach` 项；`ref="${refObj}"` 配合 `createRef`（用于 DOM 被移出仍需访问的场景）。

## 装饰器（全部从包根导出，运行时均为 no-op 存根，语义由编译器前移）

| 装饰器 | 签名 | 说明 |
|---|---|---|
| `@tag` | `(name: string, immediate = false)` | 注册组件标签名；`immediate=true` 立即 `customElements.define`，否则等 `defineComponents()` |
| `@prop` | `(options?: PropOption)` 或无参 | 外部传入属性，组件内**不可直接赋值**。无默认值必须显式 `type`。不支持 3 参命令式形态 |
| `@state` | 无参或 `(options?: StateOption)` | 组件内部响应状态，仅组件内修改 |
| `@computed` | 用于**非静态 getter** | 缓存计算属性，依赖的 prop/state 变化才重算 |
| `@watch` | `(source: string \| string[], options?: WatchOptions)` | 监视 prop/state；handler `(nv, ov, source, subNv?, subOv?)` |
| `@query` / `@queryAll` | `@query(selector, cache?: QueryCache)` / `@queryAll(selector)` | ShadowDOM 内 CSS 查询，结果为响应式字段，访问器门控 `isMounted`（`mounted()` 前读到 `undefined`）；`QueryCache.ONCE` 仅查一次。`@queryAll` **没有** cache 参数 |
| `@csscope` | `(...scopes: Csscope[])` | 用于 **static getter**，返回 `css`\`\` / CSSStyleSheet / 数组 |
| `@event` | `(eventName: string, eventTarget?: (comp) => HTMLElement \| Promise<HTMLElement> \| Window)` | 绑定非视图事件（window/document/自身元素），事件名支持修饰符；登记进 `DefinitionCompEventMap`（沿父类链继承） |
| `@emits` | `(...names: string[])` | 声明组件事件（必须先声明才能 `emit`），支持通配 `'update:*'` |
| `@debounced` | `(wait: number, immediate = false)` | 方法防抖（编译期前移，同时保留原函数）；运行时无防抖 |
| `@throttled` | `(wait: number)` | 方法节流（编译期前移）；运行时无节流 |
| `@onced` | 无参（也支持 `@onced()`） | 方法只执行一次（编译期前移）；运行时无一次性 |

选项类型（均已导出，权威定义在 `src/types.ts`）：

- `PropOption`: `{ type?, required?, model?, attribute?(默认 true), shallow?, hasChanged?(nv, ov, chain, subNv, subOv), converter?(stringValue => any), isValid?(value, props?) }`
  - `model: true` → 赋值走 `writeModelProp`（`events/event.ts`，包根导出）按宿主三路分派：①父端接了 `update:xxx`（已登记 `_subComponentEventMap`）⇒ 只 emit 不写本地；②没人接 ⇒ 本地兜底；③没人接但有 `emit-native` 特性 ⇒ 本地兜底 + 发原生 CustomEvent。判据是「有没有人注册监听」而非「有没有父组件」
- `StateOption`: `{ shallow?, hasChanged?(...) }`。**`{prop: 'x'}` 已废弃**——用初始化器播种：`@state page = this.pageSize`（播种发生在 props 落定之后）；写 `@state({prop})` 会被编译期报 `E-STATE-ARG`。`options` 里也不支持 `type` / `defaultValue`（`E-FIELD-ARG`）
- `WatchOptions`: `{ immediate?, deep?, once? }`
- `Csscope`: `INNER`('inner' 组件内/shadowDOM) | `HOST`('host' 宿主) | `GLOBAL`('global' document)

低层扩展：自定义指令用 `directive(fn, scopes: EnterPointType[])`（`EnterPointType`: `TEXT/SLOT/TAG`），executor 第 4 参 meta 为 `{ pointType?, renderComponent?, slotComponent?, varChain?, attrName?, up?: UpdatePoint }`。

## 内置指令（11 个，普通函数调用，返回值插入模板；括号内为允许的插入位置）

| 指令 | 位置 | 签名 | 说明 |
|---|---|---|---|
| `bind` | TAG | `(obj: Record<string, any>)` | 组件标签自动区分 prop/attr |
| `show` | TAG | `(visible: boolean, cbk?: (el, visible) => void)` | 基于 display 切换 |
| `model` | TAG | `(value: any, updateProp = 'value', modelProp?: string)` | 双向绑定；监听 `update:xxx`，input/textarea/select/checkbox 自动适配。**仅支持静态路径** |
| `classes` | TAG | `(cls: Record<string, boolean\|string> \| string[] \| string)` | 可与静态 class 混写 |
| `styles` | TAG | `(style: Record<string, string> \| string \| Array<...>)` | 值支持 `{value, important}`；可与静态 style 混写 |
| `forEach` | TEXT/SLOT | `(value: any[] \| Record, keyFn: KeyFn, tmpl: TplFn)` | keyed diff；**key 重复/nil 时该项被跳过并 showError**（nil 仅 DEV 下报） |
| `ifTrue` | TEXT/SLOT | `(cond: boolean, tplFn: TplFn)` | 条件渲染 |
| `ifElse` | TEXT/SLOT | `(cond: boolean, ifTmpl: TplFn, elseTmpl: TplFn)` | 二分支 |
| `when` | TEXT/SLOT | `(value: string \| number, cases: Array<[(v)=>boolean, TplFn]> \| Record<key, TplFn>)` | switch 模式时 `'default'` 是关键字 key |
| `slot` | SLOT | `(cbk: TplFn, slotName?: string)` | 函数型插槽，见下「插槽与 provenance」 |
| `html` | TAG/TEXT/SLOT | `(htmlStr?: string)` | 插入原始 HTML；同文件模块级 `const` 字符串可被编译器折进建树序列（零运行期开销），否则走运行期 `convertHTML` |

**没有 transition 指令 / `<transition>` 伪标签 / 动画运行时**——旧文档相关内容已随 `src/animate/` 的移除全部失效。

## 渲染 / 响应式原语

- `h(strings, ...vars): Template` — HTML 模板标签函数（`render/render.ts`）
- `css(strings, ...vars): CssTemplate` — CSS 模板（按 strings 缓存，`CssTemplateCacheMap`）
- `createRef<T extends Node>(): RefObject<T>` — `{ current?: T }`
- 信号原语（`src/signal.ts`，包根导出）：`signal(initial)` · `computed(fn)`（包根导出名为 `signalComputed`，避免与装饰器 `@computed` 撞名）· `effect(fn, opts?: { asChild?: boolean })` → `EffectNode`（`node.run()` 手动重跑、`node.dispose()`、`node.disposed`）· `batch(fn)` · `onCleanup(fn)` · `flushSync()` · `untrack(fn)` · `onEffectError(cb: (err, effect?) => void)`（登记 effect 运行期异常的全局处理器；异常被隔离不中断本轮其余 effect，未登记任何处理器时 `console.error` 兜底）
- `defineComponents()` — 注册所有 `@tag`（非 immediate）组件；`defineComponentsSubset(names: string[])` — 按需注册子集（宿主只用少部分组件时省启动开销）
- `writeModelProp(key, v, comp)` / `hasEmitListener(comp, node, evName)` / `hasModelListener(key, comp)` — model 三路分派原语（编译注入的 prop setter 直调）
- `slotOriginOf(fn): SlotOrigin \| undefined` / `type SlotOrigin { owner, subId, fx?, bv? }` — 插槽钩子出处查询（见下）
- **DevTools**：`src/devtools.ts` 在模块加载期自动 `installCompElemDevtools()`——零公开 API 面，挂 `globalThis`、给 `documentElement` 打 `data-compelem` 标记；DEV 下扩展未安装时 `notifyDevtoolsMissing()` 出提示（可用 `__COMPELEM_DEVTOOLS_NO_HINT__` 关闭）

内部导出（面向框架/编译产物，业务代码勿直接使用）：`render/render.ts` 的 `buildStaticView`/`renderTemplate`/`convertTemplateMeta`/`buildSubTemplateView`/`resolveSubTemplateMeta` 等；`render/write.ts` 的 `wText/wAttr/wAttrT/wToggleProp/wProp/wCssVars/t2s`（编译产物直调的 DOM 写入器；`wClass/wStyle/wShow` 仍导出但编译器已不再 emit，属 legacy）；`directive/index.ts` 的 `execEach/execCond/execDir` 与 `directive()`；`utils.ts` 的 `showError/showTagError/_queryGet/_observedAttrs/convertValue/getCssVarKey/memo` 等；`helpers.ts` 的 `CssHelper/CompElemHelper`；`utils.ts` 的 `applyClassDiff/applyStyleDiff`（class/style diff 写入门，Bind 与 Classes/Styles 共用）；`config.ts` 的 `getBaseSheets/getDefaultCss/getDefaultComponentProps`。CompElem 实例另有编译产物调用的 `_bindSlot/_updateSlot/_regViewEffect/walk` 等。

### 指令点的运行期分派（三入口，`directive/index.ts`）

| 入口 | 覆盖指令 | 处理哪些 tag |
|---|---|---|
| `execEach` | `forEach` | `UPDATE`（keyed diff）/ `REFRESH` / `REMOVE` |
| `execCond` | `ifTrue`/`ifElse`/`when` | `REFRESH` / `REMOVE` / `REPLACE` |
| `execDir` | `slot()` + TAG 位指令 + 第三方自定义指令 | `REFRESH` / `REMOVE` / `REPLACE` |

`DirectiveUpdateTag` 枚举：`NONE / REFRESH / REMOVE / REPLACE / UPDATE（forEach 独占）/ INIT（首次渲染）`。

## CompElem 内置成员（`src/CompElem.ts`）

只读 getter：`cid` · `attrs` · `props` · `renderRoot` / `renderRoots`（WeakRef 快照）· `parentComponent` · `wrapperComponent` · `rootComponent` · `slotHooks` · `cssSheets` · `isMounted` · `isDestroyed` · `cssVars`（返回 `{ c: v }` 自动生成 `--c` 类变量并建 effect）

`slots`（`Record<string, Node[]>`，无名插槽为 `default`）由**构造器装到具体子类的原型**上（读内部 `__s.slots` 信号，模板里 `this.slots.xxx` 可作依赖源）；基类只留 `declare slots` 类型声明。**子类类体自己声明 `get slots()` 会顶掉框架实现、恒读空桩**——不要在子类写 slots 访问器。

方法：`emit(evName, arg?, event?)` · `nextTick(cbk)` · `forceUpdate()` · `updateProps(props, force?)` · `insertStyleSheet(sheet): CSSStyleSheet \| null` · `getSubViewNodes(tmplFn, ...args): Node[]`（把已编译子模板回调渲染成节点；回调必须带 provenance——经 `slot()` 登记，否则 DEV 报错返回 `[]`）· `destroy()`

生命周期（按序）：`propsReady(props)` → `render()`（**运行时为存根**，视图唯一来源是编译产物 `__ce_static__.buildTemplate`；源码里仍写 `render()` 返回 `h` 模板）→ `beforeMount()` → `mounted()`；更新时**没有** `shouldUpdate(changed)`/`updated(changed)` 钩子——一轮 flush 结束后、且本组件有视图 effect 真的跑过时触发 `afterUpdate()`（`@watch`/`cssVars` 变化不触发；无视图组件永不触发）；`<slot>` 变动时 `slotChange(slot, name)`；外部属性变更时 `attributeChangedCallback(name, oldValue, newValue)`；销毁时 `beforeDestroyed()` → `destroyed()`。

### setup 三分支（`setup()` 首屏）

1. `__ce_static__.noView` → 无视图组件，不建 Shadow DOM，仅装 `watchEffects`/`cssEffect`（`setupViewIndependentEffects`）
2. `__ce_static__.buildTemplate` → `attachShadow` + `buildStaticView` + 装 watch/css effects
3. 两者皆无 → **throw `Component is not compiled @compelem/compiler plugin is required`**

基类自带 `static __ce_static__ = { noView: true }`：为 skipInjection 类（mixin 工厂 / 跨文件基类，编译器看不见 super 链的视图）的 `{...Reflect.getPrototypeOf(this).__ce_static__}` 继承兜底。副作用是未编译类也会经原型链继承到 `noView`，故 noView 分支额外要求 `isCompilerTouched(ctor)`（沿原型链找自有 `__ce_static__`）——**不要删基类这个字段**（见 `CompElem.ts:99-122` 注释的实测记录）。

## 事件

1. **原生事件**：`<div @click>` → 回调收原生 Event
2. **扩展原生事件**（`events/extends.ts`）：`resize`（ResizeObserver）· `outside[.mousedown/mouseup/click/dblclick]`（默认 click）· `mutate[.attr/child/char/tree]`（MutationObserver，必须带修饰符，裸 `@mutate` 报 `E-MUTATE-MODIFIER`）
3. **组件事件**：`emit()` 运行期**不校验** `@emits`；`@emits` 决定的是「父端能否用 `@xxx` 绑定」——未声明的名字会被 `registerEvent` 当原生事件监听（`matchEmit` 沿父类链查 `DefinitionCompEmitMap`，支持通配 `update:*`）。`emit()` 无 `wrapperComponent` 时直接 `return`（事件丢弃）；宿主带 `emit-native` 特性时改走 `dispatchEvent(new CustomEvent(...))`（`bubbles:false, composed:false, cancelable:true`，载荷在 `detail`）

事件修饰符（`.` 连接，可组合）：通用 `debounce:100/throttle:100/once/capture/passive`；原生 `stop/prevent/self`；鼠标 `left/right/middle`；键盘 `ctrl/alt/shift/meta`（可组合）+ `esc/字母...`（并列可选、不可组合）。跨框架（React/Vue）时给标签加 `emit-native` 属性把组件事件转 CustomEvent。

委托机制（`events/event.ts`）：`focus/blur/visibilitychange/wheel` 恒走捕获（`CAPTURE_EVENTS`）；`mouseenter/mouseleave/pointerenter/pointerleave` 不委托（`NO_DELEGATE_EVENTS`）；`scroll` 等元素级事件独立注册（`ELEMENT_EVENTS`）；其余在 `renderRoot` 上做委托，捕获/冒泡分桶（`::c` / `::b`）以免同节点混写时重复派发。

## 样式

- `@csscope(Csscope.INNER, Csscope.GLOBAL) static get anyName()` + `css` 模板，3 层域可任意组合；INNER 走 shadowRoot `adoptedStyleSheets`，HOST 注入最近宿主 shadowRoot（无宿主则 document）
- 全局配置：`setDefaults({ css: [sheet...], '组件tag名': {默认props} })`（`config.ts`）。组件级默认 props 的键必须是**含连字符的小写 tag 名**（自定义元素命名约束；`css`/`global` 为保留键），由 `#initProps` 消费，优先级：外部传入 props/attributes > setDefaults 组件默认 > 类字段默认值。`global` 键目前仅存在于类型声明，运行时未消费

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

## 插槽与 provenance（`render/slot-provenance.ts`）

- **函数型插槽**：父模板里 `${slot(cbk, name)}` 写进子组件标签。`slot()` 指令 executor（`directives/Slot.ts`）**必先** `registerSlotOrigin(cbk.bind(renderComponent), { owner, subId, fx, bv })` 再把绑定后的钩子放进 `ComponentUninitializedSlotFunctionMap`；子组件 `setup()` 从该 Map 一次性取走 `#slotHooks`，逐名跑 `#updateSlot`。
- **渲染归属**：钩子的 DOM 结构挂在**写回调的那个类**的 `__ce_static__.subViews[subId]` 上，必须用 provenance.owner（回调所属组件）查表，**不能用插槽所在组件**——撞上对方的 subId 会静默渲染错内容。`#updateSlot` 依赖此不变量（钩子恒带 provenance，无判空）。
- **subId 的双来源**（`render.ts` `subIdOf`）：slot 钩子查 provenance；同一模板内结构指令（`forEach`/`ifTrue` 等）的字面量回调不走 slot()，靠编译器内联在函数对象上的 `__subId`/`__fx`/`__bv` 字段。
- **props 传递**：回调形参 `ctx` 来自子模板 `<slot>` 元素上的 attribute（`_bindSlot` 存进 `#slotPropsMap`）；`<slot>` 上没绑属性则 `ctx` 为 `undefined`。首屏内容以带 `slot="xxx"` 属性的节点放进 child 的 light DOM、由原生 `<slot name>` 分发——**断言插槽内容要查 `assignedNodes()`，不是 shadowRoot.innerHTML**。
- `registerSlotOrigin` 不在公开导出面（`index.ts` 只导出读端 `slotOriginOf`）。

## 结构指令的惰性依赖（重要）

`ifTrue`/`ifElse`/`when` 等结构指令模板函数中的依赖是**惰性的**：只有分支首次被渲染执行时才建立监听。初始条件为 `false` 的分支里读取的变量，在条件变 true 前不会被追踪。**应对**：在根模板上下文读取该变量，或用 `@watch` 显式监视。

**结构指令回调必须字面出现在 render() 模板内**——prop/运行时构造的回调（`when(v, this.cases)`）编译器无法静态分配 `__subId`。

| 分类 | 指令 | 特征 |
|---|---|---|
| **结构指令** | `forEach` `ifTrue` `ifElse` `when` `slot` | 产生/删除 DOM 子树，模板函数必须返回创建函数而非直接返回模板 |
| **非结构指令** | `show` `bind` `classes` `styles` `model` | 仅修改已有 DOM 属性，依赖在外部收集 |

## 常见坑

- **prop 不可在组件内赋值**（编译期 E-PROP-ASSIGN）；修改请 `model: true` 或 `emit('update:xxx', ...)`
- **非指令中的普通表达式变量无法被追踪**——只在普通插值（非指令返回值）中使用的变量变化不触发更新
- `model` 指令只支持静态属性路径
- `render()` 返回 `null` 的组件没有 Shadow DOM，`@query` 查不到内容
- 组件事件监听名用 kebab-case；未 `@emits` 声明的事件不能 emit
- **`myfx` 是 peerDependency**（`^2.0.0-beta.4`，compelem 与 `@compelem/compiler` 都是），构建时作 external，不内联进 compelem 产物——宿主工程必须自己 `npm i myfx`
- `@state({ prop: 'x' })` 已废弃，用初始化器 `@state y = this.x` 播种
- **`render()` 内不能写 `super`**（编译器 `E-SUPER-IN-TEMPLATE` 阻断）；基类只保留 prop/state/computed/@watch/样式，视图下沉到叶子组件。render() 之外的 `super.xxx()` 普通方法调用正常
- **基类要复用一段静态视图**：定义模块级 `const` 字符串，模板里 `${html(CONST)}`（同文件时编译器折进建树序列，跨文件走运行期 `html`，语义相同）
- 组件有多种「基类视图」需求时，优先**独立子组件 + slot/prop 组合**而不是视图继承
- 子类不要自己声明 `get slots()`（顶掉框架原型安装，恒读空桩）

## 编译契约 `__ce_static__`（权威定义：`src/types.ts` `CompiledStatic`）

配套编译插件向 CompElem 子类注入 `static __ce_static__`。**运行时消费的字段**：

| 字段 | 类型 | 消费点 |
|---|---|---|
| `buildTemplate` | `(this: CompElem) => { fragment, ups, emptyEvents?, nodes?, updateSns?, updatePaths? }` | `buildStaticView`：**首实例**调 `buildTemplate.call(component)` 现建并把结构 hydrate 进 `TMPL_META_CACHE`；**后续实例走 `cloneBuiltTemplate(缓存)`**。`updateSns/updatePaths` 是快速路径（跳过全量节点扫描） |
| `subViews` | `Record<number, { buildTemplate?, pointEffects?, fx? }>` | 结构指令子模板（`__subId` → 独立产物）；`resolveSubTemplateMeta`/`buildSubTemplateView` 消费；缺失 = DEV 报错 "Structural sub-template is not compiled" |
| `props` / `states` / `computedGetters` | 定义表 | `#initProps`/`#initStates` 读默认值与选项；沿原型链浅替换合并后的完整表 |
| `watchEffects` | `((comp) => () => void)[]` | setup 期逐条 `effect(factory(this))` |
| `cssEffect` | `(comp) => () => void` | `cssVars` 的响应式 effect 工厂 |
| `pointEffects` | `(number \| FxFn)[]` | 值点 per-point effect 工厂表；**数值条目 = `fx` 下标**（`resolvePointFactories` 解引用），取值表达式已内联进工厂体 |
| `fx` | `FxFn[]` | 逐实例产物工厂表（指令实例/事件 handler/ref 等），下标 = `up.ux` |
| `noView` | `boolean` | 无视图标记 |

取值表达式内联在 `fx`/`pointEffects` 工厂里，依赖在 effect 运行期建立（读 `rc.__s.<k>.value` / `signalComputed`）。`accessors` 注入段、`directiveVarChain` 等其余产物细节以编译器仓库（`F:\github/compelem-compiler/src`）为准。

### 降级与错误码（编译期唯一出口，运行时无报错路径）

- **D 系列**（放弃注入、阻断构建）：D0 无 render 且非 CompElem 子类 · D1 动态成员访问 `this[expr]` · D2 非响应式 getter · D3 未知自由标识符（指令回调形参已词法追踪，不触发）· D4/D5 顶层 return 缺失/多个 · D6 跨文件继承 render 且不可见 · D7 插值内嵌套 `h\`\`` · D8 render() 顶层 return 为条件/短路/逗号/函数包装（会静默丢条件） · `E-SUPER-IN-TEMPLATE` render() 内出现 super
- **skipInjection**：无 own render 且同文件链上有 render → 继承父类 `__ce_static__`（视图字段整体 spread，own 一律覆盖）；super 链不可知（mixin 形参/跨文件基类）且被家族装饰器准入者一律 skipInjection，**绝不判 noView**（`@tag` 不豁免）
- **组件准入三选一**：同文件 super 链解析到 CompElem / `@tag` / 类体带家族装饰器（`@prop/@state/@computed/@query/@queryAll`——运行时全 no-op，带它们必是组件；覆盖 mixin 工厂内类与跨文件基类）
- **E 码系列**（阻断构建，编译器 `analyze/` 各模块）：`E-PROP-TYPE/ASSIGN/CASE/ARG/INTERP/TARGET`、`E-STATE-ARG`（含 `@state({prop})` 已废弃）、`E-FIELD-ARG`（`@prop`/`@state` 的 options 不支持 `defaultValue`/`type`）、`E-COMPUTED-NOT-GETTER/ARG`、`E-CSSCOPE-TARGET`、`E-QUERY-ARG`、`E-DECO-COEXIST`（多族/族外装饰器须拆独立成员）、`E-EMIT-UNDECLARED/ARG/EMITS-ARG`、`E-EVENT-FN`、`E-REF-TYPE`、`E-DIRECTIVE-SCOPE`、`E-CONST-KEY`、`E-METHOD-DECO-ARG/HOOK`、`E-MUTATE-MODIFIER`（裸 `@mutate` 缺 attr/child/char/tree）、`E-SUPER-IN-TEMPLATE`。五族提取 all-or-nothing：出错的族不删不注（运行时 no-op 无兜底）
- **W 码系列**（提示级，`ConventionError.severity:'warn'`，恒 `console.warn` 不随 `conventions` 档位阻断）：`W-PROP-CUSTOM-CTOR`（prop `type` 含自定义构造器且无 `converter`、属性通道未关——属性字符串将作单参传给构造器）。对应运行时 DEV 告警已删（`utils.ts` convertValue / `events/extends.ts` addMutation 只留防崩守卫）
- 提取失败诊断：`DEPS_TRACE=1`（compiler `deps-extract.ts`，stderr `[deps-fail] <原因>`）

## 深入阅读（按需，勿全量扫描）

- `README.md` / `README_ZH.md` — 完整教程
- `_SPEC.md`、`_Algo.md` 等下划线文件 — 内部设计规格（注意可能滞后于 working tree）
- `F:\github\compelem-compiler` — 配套编译插件仓库（D/E 码、`__ce_static__` 注入、前移逻辑的权威）
- `F:\github\compelem-harness` — 探针页与 demo 宿主（private，不发布；`dev/index.html` 主入口，`dev/_*_probe.mjs` 是 CDP 探针 runner，经别名直接消费本仓库 `src/`）
- `src/index.ts` — 导出总入口；`src/types.ts` — 全部选项类型与 `CompiledStatic` 契约
- `dist/index.d.ts` — ⚠️ 可能滞后于 src，仅作参考

## 维护约定

**修改 `src/` 中任何公开 API（新增/改名/删除导出、装饰器与指令签名、选项字段、`CompiledStatic` 契约字段）时，必须同步更新本文件与概览中的版本号。** 本文件是 AI 与开发者的首要 API 参考，滞后比没有更危险。
