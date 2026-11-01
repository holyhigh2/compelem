<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/logo-dark.svg">
    <img src="./assets/logo.svg" alt="compelem" width="120" height="120">
  </picture>
</p>

<h1 align="center">compelem</h1>

<p align="center">
  <em>Component + Element · A Web Components MVVM library</em>
</p>
<p align="center">
  <img src="https://img.shields.io/npm/v/compelem" alt="npm">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="license">
  <img src="https://img.shields.io/badge/TypeScript-ready-3178C6" alt="ts">
</p>
一个现代化、响应式、快速、轻量的WebComponent开发库。为开发者提供丰富、灵活、可扩展的声明式接口

## 概览  
CompElem 基于 Class 进行构建，该模型允许开发者使用装饰器进行声明式编码并可使用继承、扩展等高级特性，其核心特性包括：
- 类JSX的原生模板系统
- 丰富的装饰器及指令
- 可选的生命周期
- 原生插槽系统
- 响应式域样式
- ...

## 环境要求

compelem 的装饰器语义**全部在编译期完成**：运行时从包中导出的装饰器只是 no-op 存根，组件视图的唯一来源是编译器注入的 `static __ce_static__.buildTemplate`。因此**必须挂载编译插件**，否则组件实例化时直接抛错：

```
[compelem] <x-foo> Component is not compiled @compelem/compiler plugin is required
```

### 1. TypeScript

```json
{
  "compilerOptions": {
    "experimentalDecorators": true
  }
}
```

### 2. 构建插件

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { compelemCompiler } from '@compelem/compiler'

export default defineConfig({
  plugins: [compelemCompiler()],
  // 压缩时保留类名：@tag 用 target.name 注册，类名被 mangle 会让 <XFoo> 找不回 x-foo
  esbuild: { keepNames: true },
})
```

> `experimentalDecorators` 不能漏。Vite 8 用 Oxc 转译 TS，装饰器语义由它决定：关掉后产物里会保留
> `export @tag(...) class` 原样语法，浏览器直接报 `Unexpected token 'export'`。

### 3. 注册组件

`@tag("x-foo")` 默认只把类写进注册表 `DefinitionComponentMap`，**不会**自动 `customElements.define`。需在应用入口统一注册一次：

```ts
import { defineComponents, defineComponentsSubset } from 'compelem'

defineComponents()                     // 注册全部 @tag 组件
// defineComponentsSubset(['x-foo'])   // 或按需注册子集（省启动开销）
```

或者给 `@tag` 传 `immediate = true` 立即注册：

```ts
@tag('x-foo', true)
export class XFoo extends CompElem { ... }
```

> 漏掉这一步，页面上所有组件都是**未升级的空壳**：DOM 里有元素，但无行为、无内容。

### 4. myfx

`myfx` 是 **peerDependency**（构建时作为 external 处理，不打进 compelem 产物）。宿主工程需自行安装 `myfx ^2.0.0-beta.4`（即 2.x；`@compelem/compiler` 同样以 peerDependency 方式依赖它）。

## 快速开始

创建一个WebComponent总会从声明一个组件元素(CompElem子类)开始
```ts
const Slogan = ['complete', 'componentize', 'compact', 'companion']

@tag("page-test")
export class PageTest extends CompElem {
  //////////////////////////////////// props
  @prop({ type: Object }) arg: any   // 无默认值必须显式 type

  @state colorR = Math.random() * 255 % 255 >> 0;
  @state colorG = Math.random() * 255 % 255 >> 0;
  @state colorB = Math.random() * 255 % 255 >> 0;
  @state rotation = 0

  //////////////////////////////////// computed
  @computed
  get color() {
    return `linear-gradient(90deg,rgb(${this.colorR},${this.colorG},${this.colorB}), rgb(${255 - this.colorR},${255 - this.colorG},${255 - this.colorB}))`
  }

  //////////////////////////////////// watch
  @watch('rotation')
  onRotation(nv: number) {
    console.log(nv)
  }

  //////////////////////////////////// styles
  //样式表通过样式装饰器 + 静态getter函数实现
  @csscope(Csscope.INNER)
  static get css(): Array<CssTemplate | CSSStyleSheet> {
    return [css`:host{
        font-size:16px;
      }
      h2,p,i,h3{
        background-image:var(--test-color);
        filter:hue-rotate(var(--test-hue-rotate));
      }`];
  }
  //动态样式变量
  get cssVars() {
    return {
      testColor: this.color,
      testHueRotate: `${this.rotation}deg`
    }
  }

  @query('i[name="text"]')
  text: HTMLElement
  sloganIndex = 0

  //////////////////////////////////// lifecycles
  mounted(): void {
    // @query 结果是响应式字段，访问器门控 isMounted，mounted 时才可用
    setInterval(() => {
      this.rotation += 1
    }, 24);

    setInterval(() => {
      this.text.classList.add('hide')
      setTimeout(() => {
        this.text.innerHTML = Slogan[this.sloganIndex % 4]
        this.sloganIndex++
        this.text.classList.remove('hide')
      }, 500);
    }, 5000);
  }
  render(): Template {
    return h`<div>
            <i>Welcome to</i>
            <br>
            <h2>CompElem</h2>
            <br>
            <i>A modern, reactive, fast and lightweight library</i>
            <br>
            <i>for building</i>
            <h3>Web Components</h3>
            <p>
              &lt;comp-element&gt; <i name="text">...</i> &lt;/comp-element&gt;
            </p>
            ${this.arg}
        </div>`
  }
}
```
而后即可在HTML中直接使用，与使用一个原生元素如DIV没有任何区别
```html
<body>
    <page-test arg="args..."></page-test>
</body>
```
当然,也可以直接嵌入其他UI库中只要引入编译后的js即可

## APIs  
- ### 视图模板
  使用`render()`函数定义组件视图模板
  ```ts
  render(): Template{
    return h`<div>Hello CompElem</div>`
  }
  //对于无需内部样式的组件（如容器类）可返回null（或跳过定义该方法），此时不会创建Shadow DOM
  render(){
    return null
  }
  ```
  > 运行时 `render()` 是**存根**：视图由编译器在编译期从 `render()` 的返回值静态生成 `buildTemplate`。因此 `render()` 内不能出现 `super`，回调也必须字面出现在模板中（见「结构指令」）。

- ### 视图模板-属性表达式

  通过再视图模板中插入表达式可以实现动态视图，表达式通过在不同位置使用分为不同类型见（#### 指令类型）。其中属性表达式根据前缀分为

  | 前缀 | 描述                                                          | 示例                                   |
  | ---- | ------------------------------------------------------------- | -------------------------------------- |
  | @    | 事件属性，可用于任何标签                                      | `<div @click="${this.onClick}">`       |
  | .    | 参数属性，仅用于给组件标签传递参数                            | `<l-input .value="${this.text}">`      |
  | ?    | 可选属性，用于 disabled/readonly 等 toggle 类属性             | `<input ?disabled="${this.disabled}">` |
  | \*   | 引用属性，表达式求值后才会设置该属性。常用于 SVG 相关属性设置 | `<circle *r="${this.r}">`              |

  > 引用属性可通过属性参数进行格式转换，如

  ```ts
  render(): Template{
    return h`<svg *view-box:camel="">...</svg>`// <svg viewBox="">
  }
  ```

  支持格式包括:

  - camel 驼峰式
  - kebab 短横线
  - snake 下划线

  **属性名归一化**：模板中含大写字母的属性名会被转成 kebab-case（`dataType` → `data-type`），该转换由编译器在编译期完成，且**只对自定义/组件标签生效**（原生标签保持浏览器行为）。因此组件的 camelCase prop 既可用 `.headerHeight="${...}"` 传，也可用 `header-height="..."` 特性传。

- ### 无视图
  对于无体组件无需定义渲染函数，常用于layout、grid等结构控制相关组件。无视图组件仅支持global及host样式，如
  ```ts
  @csscope(Csscope.HOST, Csscope.GLOBAL)
  static get css() {
    return css`
      l-main{
        display: block;
        flex: 1;
        overflow: hidden;
      }
    `;
  }
  ```
  同样，无视图组件的renderRoot/renderRoots/...等属性都为空

- ### 样式

  通过样式域装饰器和css模板函数可以构建3层样式应用域
  ```ts
  @csscope(Csscope.INNER, Csscope.GLOBAL)
  static get anyName(): Array<CssTemplate | CSSStyleSheet> | CssTemplate | CSSStyleSheet{
    return css`...`;
  }
  ```
  对于需要响应组件状态变化并动态更新样式时可以通过css变量进行变更，该方法会自动追踪内部所有响应状态
  ```ts
  get cssVars() {
    return {
      testColor: this.color,//会生成 --test-color 变量
      testHueRotate: `${this.rotation}deg`//会生成 --test-hue-rotate 变量
    }
  }
  ```
  使用 `classes` 和 `styles` 指令设置元素样式
  ```html
  <div class="c-class1" ${classes({...})}>
  </div>
  ```
  动态样式类支持对象/数组/字符串格式，支持静态样式混写
  ```html
  <div style="..." ${styles('cursor:pointer;...',{...})}>
  </div>
  ```
  动态内联样式支持字符串/对象两种格式
- ### 样式域
  - `Csscope.INNER` 组件内部样式，通过组件shadowDOM设置
  - `Csscope.HOST` 组件外部样式，通过父组件shadowDOM / 全局设置
  - `Csscope.GLOBAL` 全局样式，通过document设置

- ### 属性

  属性是由组件外部提供参数的响应变量，可通过`@prop`注解定义。为了确保属性值仅来源于组件外部，属性无法直接进行赋值，仅支持在父组件视图中传递属性值

  ```ts
  @prop({ type: Boolean }) loading = false;//显式定义属性类型
  @prop round = true;//通过默认值自动推断属性类型
  @prop({ type: [Boolean,String] }) round = true;//多种类型使用数组定义
  @prop({ type: Array }) datalist: Array<string>;//没有默认值必须显式指定属性类型
  @prop({ type: [String, Number], model: true }) value;//model为true时，对该属性赋值按宿主类型自动处理（见下）
  ```

  想要修改属性值可以通过 emit `update:xxx` 事件 通知父组件进行更新或显示声明某个属性为model，然后通过赋值自动触发 emit `update:xxx`
  全部注解参数见 `PropOption`

  > 组件内对 `this.<非model prop>` 赋值会被**编译期**拦截并报 `E-PROP-ASSIGN`，构建直接失败（而不是运行期静默丢弃）。

  **`model: true` 的 prop 赋值语义按宿主类型三路分派**（`writeModelProp`）：

  | 宿主 | 行为 | 理由 |
  |---|---|---|
  | 父端接了 `update:xxx`（`model` 指令 / `@update:value`） | **只 emit，不写本地** | 父端是权威，可能对值做校验/clamp/格式化。抢先写本地会白渲染一次，用户还会看到中间值闪烁（子写 15 → 显示 15 → 父 clamp 到 10 → 回灌 → 又变 10）。值由父端回写后落回本地，`Object.is` 去重使其不会重复渲染 |
  | 没人接 | **本地兜底** | 只 emit 会让值彻底蒸发：`CompElem#emit` 在无 `wrapperComponent` 时直接 return，事件丢弃且本地不落值 |
  | 没人接，但宿主声明了 `emit-native` | **本地兜底 + 发原生 `CustomEvent`** | 该宿主用 `addEventListener` 接，走的不是组件事件通道，但通知必须真的发出去 |

  判据是「**有没有人注册监听**」而不是「有没有父组件」。宿主是 compelem 之外的代码时，
  组件内赋值应当让值留在自己身上 —— 否则纯 HTML 页面里 `<my-input>` 的用户输入会凭空消失。

- ### 状态
  状态是仅由组件内部初始化的响应变量，可通过`@state`注解定义
  ```ts
  @state hasLeft = false;//定义状态
  @state({//自定义变化判断：返回 true 表示"发生了变化"
    hasChanged(nv: any[], ov: any[]) {
      return !isEqual(nv, ov)
    }
  }) private nodes: Array<Record<string, any>>;
  ```
  状态仅能在组件内修改
  全部注解参数见 `StateOption`

  > **用 prop 初始化 state** 用初始化器表达，不要用 `@state({ prop: 'x' })`（该写法已废弃并被编译期报 `E-STATE-ARG`）：
  > ```ts
  > @prop({ type: Number }) pageSize = 20
  > @state page = this.pageSize   // ✅ 播种发生在 props 落定之后
  > ```

- ### 属性/状态监视

  使用`@watch`注解可以对属性/状态进行变化监视

  ```ts
  @prop width = "auto";

  @watch("width", { immediate: true })
  watchWidth(nv: string, ov: string, sourceName: string) {
    this.style.width = nv;
  }
  ```

  对于同类属性共享处理逻辑的监视，可批量处理

  ```ts
  @watch(['height', 'minHeight', 'maxHeight'], { immediate: true })
  watchHeight(nv: string, ov: string, sourceName: string) {
    this.style[sourceName] = nv;
  }
  ```
  handler 完整签名为 `(nv, ov, sourceName, subNv?, subOv?)`；`source` 支持多级路径（`'a.b.c'`）；`@watch` 回调执行在 `untrack()` 中，不会把回调内部的读取记成本组件的视图依赖。

- ### 计算状态
  计算状态会缓存计算结果，只有当内部使用的响应属性/状态发生变化时才会重新计算。创建计算状态使用`@computed`注解的 Getter，如
  ```ts
  @computed
  get hasHeader() {
    return !isEmpty(this.slots.header) || !!this.header
  }
  ```

- ### 异步资源

  远程读取（可能失败、可被取消、可能重来）用 `@resource` 声明。它把「请求在飞、值不确定」这一维接进响应式图 ——
  视图读 `busy` / `data` / `error` 就自动跟着变，不必再手写 `loading` 字段：

  ```ts
  @state keyword = ''

  @resource<Row[]>(
    (self, sig) => fetch(`/api/rows?q=${self.keyword}`, { signal: sig }).then(r => r.json()),
    { timeout: 3000, immediate: false },
  )
  rows!: ResourceView<Row[]>
  ```

  > 第一个形参必须是**组件实例**：装饰器实参位置的 `this` 是 `globalThis`（TS7041），所以实例由编译器显式传入。
  > 第二个形参是 `AbortSignal`，要透传给底层请求，否则取消只能丢弃结果、不能真正中止连接。

  被装饰的**字段**在编译期被删掉，运行期由组件基类按定义表装上同名 getter，所以 `this.rows` 的运行期形态与 TS 类型完全一致，没有派生名要记。视图成员：

  | 成员 | 说明 |
  |---|---|
  | `data` | 最近一次成功的数据；还没有成功过一次时（`idle` / `loading`）为 `undefined` |
  | `status` | `idle` / `loading` / `refreshing` / `ok` / `error` |
  | `error` | 最近一次失败原因；超时是 `RESOURCE_TIMEOUT`（symbol，文案由业务写） |
  | `busy` | `loading \|\| refreshing`。**不是** `status === 'loading'` —— 刷新期按钮也该禁用 |
  | `load()` | 触发一次取数，首拉与刷新同一个入口；返回结算 promise，不 reject |

  ```ts
  render() {
    return h`
      <button ?disabled="${this.rows.busy}" @click="${() => this.rows.load()}">
        ${this.rows.busy ? '拉取中…' : '刷新'}
      </button>
      ${forEach(this.rows.data ?? [], r => r.id, r => h`<div>${r.name}</div>`)}
    `
  }
  ```

  三条必须知道的语义：

  1. **依赖只从 loader 的同步段收集。** `self.keyword` 一改自动重取；但 `await` 之后的读取不登记依赖（那时依赖收集上下文已退出）——
     **不报错、不警告，只是不重取**。async loader 把读取全部提到第一个 `await` 之前，或用 `{ source: (self) => self.keyword }` 显式声明。
  2. **换参自动取消旧请求，并丢弃迟到响应。** 即使底层接口不理会 `AbortSignal`（`import()`、不支持取消的 SDK），
     先发后到的响应也不会覆盖最新结果 —— 这段判断在框架内部，业务侧没有 `#seq` 要写。
  3. **`refreshing` 期保留旧值**，不闪回骨架屏；但那个旧值属于**上一次成功的参数**。
     要判过期就把参数塞进返回值（如 `{ q, items }`）再和当前参数比。

  组件之外、或多个组件共享同一份数据时用命令式的 `createResource`：

  ```ts
  import { createResource } from 'compelem'

  const rows = createResource(
    (sig) => fetch('/api/rows', { signal: sig }).then(r => r.json()),
    () => params.id || undefined,   // source：返回空值时不发请求
  )
  rows.status.value                 // idle / loading / refreshing / ok / error
  await rows.load()
  rows.dispose()
  ```

  > 定位是**原语**：只做状态机 + abort + source 驱动。缓存、in-flight 去重、重试、stale-while-revalidate 都不在其中，需要时在它之上组合。

- ### 元素引用
  使用`@query/all`注解及`ref`属性
  ```ts
  //query
  @query('l-icon')
  iconEl: HTMLElement
  @queryAll('l-icon')
  iconEls: HTMLElement[]
  //仅查一次（首次命中后缓存）
  @query('l-popup', QueryCache.ONCE)
  popupEl: HTMLElement
  //ref
  refNode: RefObject
  ```
  > `@query` / `@queryAll` 的结果是**响应式字段**，访问器门控 `isMounted`——在 `mounted()` 之前读取得到 `undefined`。

  ref可用于内部DOM被移出但仍需访问的场景，比如tooltip、toast、overlay等
  ```ts
  divRef = createRef<HTMLDivElement>();
  //视图片段
  return h` <l-icon></l-icon>
    <div ref="${divRef}"></div>`;
  ```
- ### 内置属性及函数
  - `readonly` rootComponent 根组件引用
  - `readonly` parentComponent 父组件引用，可能为空
  - `readonly` wrapperComponent 包装(组件所在视图归属)组件引用，可能为空
  - `readonly` renderRoot/renderRoots 渲染根元素/渲染根元素列表，可能为空
  - `readonly` shadowRoot 阴影DOM，可能为空
  - `readonly` slots 插槽元素映射（无名插槽为 `default`）
  - `readonly` slotHooks 动态插槽钩子映射
  - `readonly` cssSheets 组件内部(INNER)样式对象列表
  - `readonly` cssVars 动态 CSS 变量映射
  - `readonly` attrs 组件特性
  - `readonly` props 组件属性
  - `readonly` isMounted 组件是否已挂载
  - `readonly` isDestroyed 组件是否已销毁
  - `readonly` cid 组件实例序号
  - emit(evName: string, arg: Record<string, any>, event?: Event) 抛出自定义事件
  - nextTick(cbk: () => void) 下一帧执行函数
  - forceUpdate() 强制重跑本组件全部视图 effect（不触发 `@watch` / `cssVars`）
  - updateProps(props: Record<string, any>, force?: boolean) 批量更新属性（触发 `@watch`）
  - insertStyleSheet(sheet: CssTemplate | CSSStyleSheet): CSSStyleSheet 向组件ShadowDOM插入样式表，仅影响组件实例
  - getSubViewNodes(tmplFn: TplFn, ...args: any[]): Node[] 把已编译的子模板回调渲染成节点（回调须经 `slot()` 登记 provenance）
  - destroy() 销毁组件

> `slots` 的访问器由基类构造期装到**具体子类的原型**上。子类类体里自己写 `get slots()` 会顶掉框架实现、恒读空桩——不要在子类声明 slots 访问器。

## 组件渲染流程 Lifecycle

CompElem 组件既可以在 CompElem 环境内调用，也可以直接在原生环境调用，区别只是原生环境无法像组件传`递类型参数`。流程如下：

> 创建流程

| 功能                                                         |  生命周期    |
| ------------------------------------------------------------ | ----------- |
| 1. 创建组件实例，读取 `__ce_static__` 定义表，安装 `slots` 访问器 |      constructor    |
| 2. 元素连接文档 → `setup()`（幂等，重连可重试）              |              |
| 3. 初始化 props：外部传入 > `setDefaults` 组件默认 > 字段默认值 |      propsReady |
| 4. 初始化 states（含 prop 播种）                              |       |
| 5. `propsReady(props)` 回调                                   |    |
| 6. 创建 shadowRoot 并挂载样式表（`getBaseSheets`）            |     render      |
| 7. `buildStaticView` 建视图：首实例调 `buildTemplate` 现建并缓存，后续实例走 `cloneBuiltTemplate` |  |
| 8. 装 `@watch` effects 与 `cssVars` effect                   |                 |
| 9. 取走 `slotHooks` 并逐名 `#updateSlot` 初始化动态插槽        |                 |
| 10. `beforeMount()` 回调                                     |    beforeMount      |
| 11. 标记 `isMounted`，视图片段挂进 shadowRoot                 |         mounted        |
| 12. `mounted()` 回调                                         |                 |

> 更新流程【数据驱动】—— signal 架构：没有「组件级重渲染」这一步，更新单位是 effect

| 功能                                                  | 生命周期      |
| ----------------------------------------------------- | ------------- |
| 1. 写 prop / state / computed 信号                    |               |
| 2. setter → notify，只推给**直接订阅该信号**的 effect |               |
| 3. 逐个 effect 重跑，各自写自己那几个 DOM 位点         |               |
| 4. 结构性指令（forEach / ifElse 等）在自己的 scope 内处理 |               |
| 5. `@watch` 回调在 `untrack()` 中触发                 |               |
| 6. 一轮 flush 结束 → 本轮**跑过视图 effect** 的组件触发   | `afterUpdate` |

> 更新流程【强制】

| 功能                                                   | 生命周期      |
| ------------------------------------------------------ | ------------- |
| 1. `forceUpdate()` 重跑本组件全部**视图 effect**（跳过 @watch / cssVars） |               |
| 2. 刷新待更新插槽                                       |               |
| 3. 触发 `afterUpdate`                                  | `afterUpdate` |

> ⚠️ `shouldUpdate` / `updated` 已移除：信号架构下不存在「组件更新完了」这个时刻。
> 「某字段变了要做事」用 `@watch('field')`；「按条件决定这块 UI 更不更新」把闸门放进
> `@computed`（依赖被 `untrack` 掉即不订阅）或用 `ifElse` 包住子树。

## 插槽 Slot

#### 定义插槽

使用原生 `<slot></slot>` 标签来嵌入插槽

```html
<slot></slot>
<!-- 命名插槽 -->
<slot name="content"></slot>
```

#### 插入节点(静态)

```html
<l-tooltip>
  <l-button>默认插槽内容</l-button>
  <div slot="content">命名插槽内容</div>
</l-tooltip>
```

#### 插入节点(动态)
1. 通过`slot`指令
仅可在 CompElem 组件中编码，可使用所有CompElem指令并可通过`args`接收插槽参数

```ts
//仅可用于CompElem组件中
return h` <l-tooltip>
  ${slot(
    (args: Record<string, any>) => h`
      <div>我是动态内容-${args.data.id}</div>
    `,
    "content"
  )}
</l-tooltip>`;
```             
2. 通过元素注入
可在非CompElem环境中使用，比如将组件嵌入到React/Vue环境中使用
```html
<!-- 在 .vue 中 -->
...
<l-column>
  <!-- CompElem 会赋值组件的data属性为 data -->
  <VueComp slot="cell" data-slot-data/>
</l-column>
...
<!-- 对于驼峰变量可通过短横线分隔，下例会向组件注入 dataList 变量 -->
...
<!-- CompElem 会赋值组件的dataList属性为 data -->
<VueComp slot="cell" data-slot-data-list="data"/>
...
```

动态插槽的参数可在组件内的 `slot` 标签上通过 *视图模板-参数表达式*  `.xx` 注入参数

```html
<slot .data="${this.row}"></slot>
```

> 断言插槽内容要看 `slotEl.assignedNodes()`（原生分发），不是 `shadowRoot.innerHTML`。


## 指令 Directive

指令用于分支/循环/动态插槽等结构及隐藏显示等

#### 指令类型

不同的指令类型限制了指令仅能用于对应的插入点
|指令|插入位置|描述|示例|  
|-------|-------|-------|-------|
|ATTR|特性|可用于任何特性值之中，仅能插入一个|`attr="${xxx}"`|
|PROP|属性|可用于任何属性值之中，必须是组件标签，仅能插入一个|`.value="${xxx}"`|
|TEXT|文本|标签体内，可插入多个|`<div>${xx1}${xx2}${...}</div>`|
|SLOT|插槽|与 TEXT 类似，但标签必须是组件||
|TAG|标签|直接插入在节点标签上|`<div a="b" ${show(..)}>`|

> 上表是**模板插值位置**的分类；而内置指令注册时使用的**指令作用域**（`EnterPointType`）只有 `TEXT` / `SLOT` / `TAG` 三种——`ATTR` / `PROP` 位置只能放普通值表达式，不能挂指令。

#### 内置指令

| 指令    | 类型      | 描述                                                        | 示例                                                   |
| ------- | --------- | ----------------------------------------------------------- | ------------------------------------------------------ |
| bind    | TAG       | 绑定属性/特性到标签上，根据标签类型及组件 prop 定义自动判断 | `<div a="b" ${bind(obj)}>`                             |
| show    | TAG       | 隐藏/显示标签（基于 display）                               | `<div a="b" ${show(visible)}>`                         |
| model   | TAG       | 双向绑定                                                    | `<div a="b" ${model(xx,modelPath?)}>`    
| classes | TAG     | 绑定样式类属性，支持对象/数组/字符串。可以和静态字符混用    | `<div class="otherClass" ${classes(obj)}>`             |
| styles  | TAG     | 绑定样式规则属性，支持对象/字符串。可以和静态字符混用       | `<div style="a:b" ${styles(obj)}>`                     |
| forEach | TEXT/SLOT | 输出循环结构                                                | `...>${forEach(ary, item=>item.id, (item)=>h`...`)}<...`            |
| ifTrue  | TEXT/SLOT | 当条件为 true 时输出模板内容                                | `...>${ifTrue(condition,()=>h`...`)}<...`           |
| ifElse  | TEXT/SLOT | 当条件为 true/false 时输出对应模板内容                      | ` ...>${ifElse(condition,()=>h``,()=>h``)}<... ` |
| when    | TEXT/SLOT | 多条件分支，支持 switch/ifelse 两种模式                     | ` ...>${when(condition,{c1:()=>h``,c2:...})}<... `  |
| slot    | SLOT      | 动态插槽                                                    | ` ...>${slot((args) => h``)}<... `                  |
| html    | TAG/TEXT/SLOT      | 向指定元素/文本位置插入HTML内容                                                    | `<div a="b" ${html('<b>1</b>')}> ...>${html('<b>1</b>')}<...`                  |

#### 结构指令的约束

| 分类 | 指令 | 特征 |
|---|---|---|
| **结构指令** | `forEach` `ifTrue` `ifElse` `when` `slot` | 产生/删除 DOM 子树，模板回调必须**字面出现在 render() 模板内**（编译器据此静态分配子视图 id） |
| **非结构指令** | `show` `bind` `classes` `styles` `model` `html` | 仅修改已有 DOM，依赖在外部收集 |

结构指令的模板回调里读取的依赖是**惰性的**：只有该分支首次被渲染执行时才建立订阅。初始条件为 `false` 的分支里读取的变量，在条件变 true 前不会被追踪——需要提前感知就在根模板上下文读一次，或用 `@watch` 显式监视。

> 同一 `${}` 插槽的「形态」（文本点 / 内联静态 HTML / 指令点）由**首次渲染**时的值决定，此后不再改变。因此不要在同一个插值位置用三元式在 `h\`\`` 子模板与指令之间切换；空态与列表要写成两个并列插槽（`ifTrue` + `forEach`）。

## 装饰器 Decorator

- `@state` 定义组件内状态属性。用初始化器播种 prop 值（`@state page = this.pageSize`）
- `@prop` 定义父组件参数，默认不可修改。选项见 `PropOption`：`{type, required, model, attribute, shallow, hasChanged, converter, isValid}`
- `@query` / `@queryAll` 定义 CssSelector 查询结果（`QueryCache.ONCE` 仅查一次）
- `@tag` 自定义组件的标签名
- `@watch` 监控 state/prop 变更
- `@computed` 计算属性，仅在响应变量变更时更新缓存值
- `@debounced` 定义函数防抖
- `@throttled` 定义函数节流
- `@onced` 定义只执行一次的函数
- `@event` 绑定非视图事件（window/document/组件自身元素）
- `@emits` 声明组件事件
- `@csscope` 定义样式作用域（仅用于 static getter）
- `@resource` 声明式异步资源（远程读取 + loading/error 状态 + 竞态处理），装饰字段，见「异步资源」

> 全部装饰器在运行时都是 no-op 存根，语义由编译器前移；参数写错、用在错误的 target 上（如 `@csscope` 放到实例 getter）会在**编译期**报错阻断构建，运行期没有兜底。

### 继承
  部分装饰器可由子类继承不会覆盖，包括@state/@prop/@watch/@computed/@emits/@resource

## 事件 Event
在CompElem中有三类不同事件，分别返回原生事件对象或自定义对象

1. 原生事件 —— `<div @click="..."` 在原生元素上可以监听原生事件，监听器回调参数返回原生事件对象
2. 扩展原生事件 —— `<div @resize="..."` 在原生元素/组件元素上都可以监听扩展原生事件，监听器回调参数返回自定义数据对象
3. 组件事件 —— `<l-select @change="..."` 在组件元素上默认仅可监听组件事件，监听器回调参数返回自定义数据对象

### 组件事件
  组件通过`emit`接口触发的事件必须提前通过`@emits`进行注册，如
  ```ts
  @emits('update:value','update:*','change1')
  @tag("page-test")
  export class PageTest extends CompElem {
    ...
    onChange(){
      this.emit('change1',...)
    }
  }
  ```
  非组件事件都会作为原生事件进行监听，如
```html
<l-select @change1="${...}" @click="..."></l-select>
```
  其中click事件会当作原生事件进行监听

  > `@emits` 同时决定「组件能 emit 什么」与「父端能绑什么」：未声明的事件，父端写 `@xxx` 会被当作**原生事件**监听，从而永远收不到 `emit` 派发的数据。

### 跨框架事件监听
如果组件要用于非 `CompElem` 框架时，需要为组件添加 `emit-native`属性，此时 `emit()` 会直接派发原生 `CustomEvent`（`bubbles:false, composed:false, cancelable:true`，载荷在 `detail`）
```html
<l-select @change="${...}" emit-native></l-select>
```

### 事件修饰符
通过`.`号可使用修饰符修饰事件如 `@scroll.throttle:100="${...}"`
- 全部通用 —— `debounce/throttle/once/capture/passive` 可组合
- 原生通用 —— `stop/prevent/self` 可组合
- 鼠标 —— `left/right/middle` 不可组合
- 键盘 —— `ctrl/alt/shift/meta` 可组合 `esc/a/b/c/d...` 不可组合,多个key并列表示可选
- mutate —— `attr/child/char/tree` 可组合
> 部分修饰符支持参数，可使用冒号传参 —— `throttle:100 / debounce:100`。支持列表如下
  - throttle:wait
  - debounce:wait
  ```html
  <!-- 示例 -->
  <div @mutate.child.throttle:100="...">
  <div @click.left.once="...">
  <div @mousedown.stop.prevent="...">
  <div @input.capture="...">    <!-- 捕获阶段（focus/blur/wheel 等默认即走捕获） -->
  <div @touchmove.passive="..."> <!-- passive 监听 -->
  ```
### 扩展原生事件
可直接用于DOM元素的扩展事件（非组件事件），支持列表如下
- resize 元素尺寸变化时触发
- outside 鼠标点击元素外部时触发，可通过修饰符限制鼠标点击类型`outside.[mousedown/up/click/dblclick]`，默认click
- mutate 内容变化时触发。基于  Mutation Observer API，必须带至少一个 `attr/child/char/tree` 修饰符

> 注：`outside` 使用 `outside.click` 形式（事件名为 `outside`，点击类型作为**同名修饰符**而非子事件）。

### 无视图组件事件
当组件无内部视图或想要监听组件自身元素时，可使用`@event`装饰器
```ts
@tag('my-button')
export class CustomButton extends CompElem {
  ...
  @event('click', (comp) => comp)
  onClick() {
    this.emit('myclick')
  }
}
```

## 信号 Signal

组件内部的响应式由独立的信号运行时驱动（`src/signal.ts`）。它同样作为公开 API 导出，可用于组件之外的状态编排（store、路由、跨组件共享状态）：

| API | 说明 |
|---|---|
| `signal(initial)` | 创建可读写信号，读 `.value` / 写 `.value` |
| `signalComputed(fn)` | 派生信号，自动追踪 fn 内读取的信号。包根导出名为 `signalComputed`，避免与装饰器 `@computed` 撞名 |
| `effect(fn, opts?)` | 立即执行一次并订阅依赖，返回 `EffectNode`（`run()` 手动重跑 / `dispose()` / `disposed`）；`{ asChild: true }` 表示归属当前上下文 |
| `batch(fn)` | 合并同步批次内的写操作，退出时统一 flush |
| `flushSync()` | 立即结算挂起的 flush |
| `untrack(fn)` | fn 内的读取不建立依赖（`@watch` 回调就是这样执行的） |
| `onCleanup(fn)` | 登记当前 effect 的清理函数 |
| `onEffectError(cb)` | 登记 effect 运行期异常的全局处理器；异常被隔离、不中断本轮其余 effect，未登记时 `console.error` 兜底 |

```ts
import { signal, signalComputed, effect, batch } from 'compelem'

const count = signal(0)
const doubled = signalComputed(() => count.value * 2)

const stop = effect(() => console.log(count.value, doubled.value))
batch(() => { count.value++; count.value++ })   // 只 flush 一次
stop.dispose()
```

> 信号只有**同步**语义，模型里没有「还没有返回」这个状态。异步读取由「异步资源」那一节补上：`createResource` / `@resource` 就是把时间这一维接进信号图。

## 全局注入
### 样式
对于依赖外部样式表或第三方样式库如 TailwindCSS 可通过`setDefaults`接口进行注入
```ts
//main.ts
import tailwindStyle from "./tailwind.css?inline";
...
setDefaults({
  css: [tailwindStyle]
});
```
然后就可以在组件中直接使用样式名书写
```ts
  return h`
      <button
        class="
          inline-flex items-center justify-center
          font-medium rounded-md" ...>
          ...
      </button>
  `
```

### 组件默认属性
`setDefaults` 还可为组件指定默认 prop，键必须是**含连字符的小写 tag 名**（`css` / `global` 为保留键）：

```ts
setDefaults({
  'l-input': { size: 'small', clearable: true }
})
```
优先级：外部传入 props/attributes > `setDefaults` 组件默认 > 类字段默认值。


## 扩展
- [VSCode](https://marketplace.visualstudio.com/items?itemName=holyhigh2.compelem-vscode) - 为h函数和css片段提供语法加亮/智能提示/诊断等功能
- [Vite-css](https://www.npmjs.com/package/vite-plugin-compelem-css) - 用于在导入scss/css文件时直接转换为CssTemplate
- [Vite-scss](https://www.npmjs.com/package/vite-plugin-compelem-scss) - 用于在css``模板中支持scss语法
- [Vite-comments](https://www.npmjs.com/package/vite-plugin-compelem-strip-comments) - 用于支持h``模板中的html注释
