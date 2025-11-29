# CompElem
一个现代化、响应式、快速、轻量的WebComponent开发库。为开发者提供丰富、灵活、可扩展的声明式接口

## 概览  
CompElem 基于 Class 进行构建，该模型允许开发者使用装饰器进行声明式编码，核心特性包括：
- 类JSX的原生模板系统
- 丰富的装饰器及指令
- 可选的生命周期
- 原生插槽系统
- 响应式域样式
- ...

创建一个WebComponent总会从声明一个组件元素(CompElem子类)开始
```ts
const Slogan = ['complete', 'componentize', 'compact', 'companion']
@tag("page-test")
export class PageTest extends CompElem {
  //////////////////////////////////// props
  @prop arg:any

  @state colorR = Math.random() * 255 % 255 >> 0;
  @state colorG = Math.random() * 255 % 255 >> 0;
  @state colorB = Math.random() * 255 % 255 >> 0;
  @state rotation = 0

  //////////////////////////////////// computed
  @computed
  get color() {
    return `linear-gradient(90deg,rgb(${this.colorR},${this.colorG},${this.colorB}), rgb(${255 - this.colorR},${255 - this.colorG},${255 - this.colorB}));`
  }

  //////////////////////////////////// watch
  @watch('rotation')
  function(nv:number) {
    console.log(nv)
  }

  //////////////////////////////////// styles
  //静态样式
  static get styles(): Array<string | CSSStyleSheet> {
    return [`:host{
        font-size:16px;
      }...`];
  }
  //动态样式
  get styles() {
    return [
      () => `h2,p,i,h3{
        background-image:${this.color};
      }`,
      () => `h2,p,i,h3{
        filter:hue-rotate(${this.rotation}deg);
      }`,
    ]
  }

  @query('i[name="text"]')
  text: HTMLElement
  sloganIndex = 0

  //////////////////////////////////// lifecycles
  mounted(): void {
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
    return html`<div>
            <i>Welcome to</i>
            <br>
            <h2>CompElem</h2>
            <br>
            <i>A modern, reactive, fast and lightweight library</i>
            <br>
            <i>for building</i>
            <h3>Web Components</h3>
            <p>
              &lt;c-element&gt; <i name="text">...</i> &lt;/c-element&gt;
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
    return html`<div>Hello CompElem</div>`
  }
  ```
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
    return html`<svg *view-box:camel="">...</svg>`// <svg viewBox="">
  }
  ```

  支持格式包括:

  - camel 驼峰式
  - kebab 短横线
  - snake 下划线

- ### 样式
  使用静态函数定义组件样式或全局样式（如弹框）
  ```ts
  static get styles(): Array<string | CSSStyleSheet> {
    return [];
  }
  static get globalStyles(): Array<string> {
    return [];
  }
  ```
  对于需要动态控制 host 元素样式可以使用组件实例 getter
  ```ts
  get styles(){
    return [()=>`:host{
      ${this.border?'border: 1px solid rgb(var(--l-color-border-secondary)); ':''}
    }`]
  }
  ```
- ### 属性

  属性是由组件外部提供参数的响应变量，可通过`@prop`注解定义

  ```ts
  @prop({ type: Boolean }) loading = false;//显式定义属性类型
  @prop round = true;//通过默认值自动推断属性类型
  @prop({ type: [Boolean,String] }) round = true;//多种类型使用数组定义
  @prop({ type: Array }) datalist: Array<string>;//没有默认值必须显式指定属性类型
  @prop({ type: [String, Number], sync: true }) //通过get/set设置属性
  get value() {
    return this.__innerValue ?? ''
  }
  set value(v: any) {
    this.__innerValue = v
    if (isNil(v)) {
      this.__innerValue = '';
    }
  }
  ```

  属性可以在组件内修改但默认不会同步父组件，除非显式指定`sync`或自行 emit update 事件
  全部注解参数见 `PropOption`

- ### 状态
  状态是仅由组件内部初始化的响应变量，可通过`@state`注解定义
  ```ts
  @state hasLeft = false;//定义状态
  @state({//自定义变化判断
    hasChanged(nv: any[], ov: any[]) {
      return isEqual(nv , ov)
    }
  }) private nodes: Array<Record<string, any>>;
  ```
  状态仅能在组件内修改
  全部注解参数见 `StateOption`
- ### 状态监视

  使用`@watch`注解可以对属性/状态进行变化监视

  ```ts
  @prop width = "auto";

  @watch("width", { immediate: true })
  watchWidth(nv: string, ov: string, sourceName: string) {
    this.style.width = nv;
  }
  ```

  对于同类属性共享处理逻辑的监视，可以批量处理

  ```ts
  @watch(['height', 'minHeight', 'maxHeight'], { immediate: true })
  watchHeight(nv: string, ov: string, sourceName: string) {
    this.style[srcName] = nv;
  }
  ```

- ### 计算状态
  计算状态会缓存 return 结果，只有当内部使用的任意属性/状态发生变化时才会重新计算
  使用`@computed`注解的 Getter，如
  ```ts
  @computed
  get hasHeader() {
    return !isEmpty(this.slots.header) || !!this.header
  }
  ```
- ### 节点引用
  使用`@query/all`注解及`ref`属性
  ```ts
  //query
  @query('l-icon')
  iconEl: HTMLElement
  //ref
  refNode: HTMLElement
  ```
  ref可用于内部DOM被移出但仍需访问的场景，比如tooltip、toast、overlay等
  ```ts
  divRef = createRef<HTMLDivElement>();
  //视图片段
  return html` <l-icon></l-icon>
    <div ref="${divRef}"></div>`;
  ```
- ### 内置属性及函数
  - `readonly` rootComponent 根组件引用
  - `readonly` parentComponent 父组件引用，可能为空
  - `readonly` wrapperComponent 包装(组件所在视图归属)组件引用，可能为空
  - `readonly` renderRoot/renderRoots 渲染根元素/渲染根元素列表
  - `readonly` shadowRoot 阴影DOM
  - `readonly` slots 插槽元素映射
  - `readonly` slotHooks 动态插槽钩子映射
  - `readonly` css 组件样式对象列表
  - `readonly` attrs 组件特性
  - `readonly` props 组件属性
  - slotComponent 所在插槽组件
  - on(evName: string, hook: (e: Event) => void) 在root元素上绑定事件
  - emit(evName: string, arg: Record<string, any>, options?: {event?: Event;bubbles?: boolean;composed?: boolean;}) 抛出自定义事件
  - nextTick(cbk: () => void) 下一帧执行函数
  - forceUpdate() 强制更新一次视图
  - insertStyleSheet(sheet: string | CSSStyleSheet): CSSStyleSheet 向组件插入样式表

## 组件渲染流程

CompElem 组件既可以在 CompElem 环境内调用，也可以直接在原生环境调用，区别只是原生环境无法像组件传`递类型参数`。流程如下：

> 创建流程

| 功能                                                         |     | 生命周期    |
| ------------------------------------------------------------ | --- | ----------- |
| 1. 创建组件实例，完成类属性默认值设置（prop/state/...)       |     |             |
| 2. 初始化类全局样式（仅一次）及 实例样式(产生 styles 数组)   |     |             |
| 3. 创建 shadowRoot 并挂载组件样式                            |     |  |
| 4. 执行装饰器 create 回调                                      |     |    constructor         |
| 5. 绑定 parentComponent                                               |     |    |
| 6. 验证及初始化 props |     |  propsReady |
| 7. 初始化 states |     |   |
| 8. @computed                       |     |             |
| 9. @watch(immediate)                       |     |             |
| 10. 渲染 render 及依赖绑定                                    |     | render      |
| 11. 绑定 renderRoot 及 renderRoots                                            |     |             |
| 12. 初始化插槽 slots                                            |     |     |
| 13. 执行装饰器 beforeMount 回调 ，如 @query                                     |     |    beforeMount      |
| 14. 初始化动态 css                                                   |     |     mounted        |
| 15. 执行装饰器 mounted 回调                                |     |             |

> 更新流程【普通】

| 功能                           | 生命周期     |
| ------------------------------ | ------------ |
| 1. 父组件 props 变更【或】     | propsReady   |
| 1. 子组件 states 变更【或】     |              |
| 2. 执行@watch 注解             |              |
| 3. 合并变更内容并判断是否更新  | shouldUpdate |
| 4. 更新依赖域指令（非 render） |              |
| 5. 更新动态 slot               |              |
| 6. 执行 ref                    |              |
| 7. 执行@query 注解             | update       |

> 更新流程【强制】

| 功能               | 生命周期 |
| ------------------ | -------- |
| 1. forceUpdate     |          |
| 2. 渲染 render     | render   |
| 3. 执行@query 注解 | update   |

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
return html` <l-tooltip>
  ${slot(
    (args: Record<string, any>) => html`
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


## 指令 Directive

指令用于分支/循环/动态插槽等结构及隐藏显示等

#### 指令类型

不同的指令类型限制了指令仅能用于对应的插入点
|指令|插入位置|描述|示例|  
|-------|-------|-------|-------|
|ATTR|特性|可用于任何特性值之中，仅能插入一个|`attr="${xxx}"`|
|PROP|属性|可用于任何属性值之中，必须是组件标签，仅能插入一个|`.value="${xxx}"`|
|TEXT|文本|标签体内，可插入多个|`<div>${xx1}${xx2}${...}</div>`|
|CLASS|样式类|用于 class 属性值中，仅能插入一个|`class="a ${b}"`|
|STYLE|样式规则|用于 style 属性值中，仅能插入一个|`style="a:1;${b}"`|
|SLOT|插槽|与 TEXT 类似，但标签必须是组件||
|TAG|标签|直接插入在节点标签上|`<div a="b" ${show(..)}>`|

#### 内置指令

| 指令    | 类型      | 描述                                                        | 示例                                                   |
| ------- | --------- | ----------------------------------------------------------- | ------------------------------------------------------ |
| bind    | TAG       | 绑定属性/特性到标签上，根据标签类型及组件 prop 定义自动判断 | `<div a="b" ${bind(obj)}>`                             |
| show    | TAG       | 隐藏/显示标签（基于 display）                               | `<div a="b" ${show(visible)}>`                         |
| model   | TAG       | 双向绑定                                                    | `<div a="b" ${model(xx,modelPath?)}>`                             |
| classes | CLASS     | 绑定样式类属性，支持对象/数组/字符串。可以和静态字符混用    | `<div class="otherClass ${classes(obj)}>"`             |
| styles  | STYLE     | 绑定样式规则属性，支持对象/字符串。可以和静态字符混用       | `<div style="a:b;${styles(obj)}>"`                     |
| forEach | TEXT/SLOT | 输出循环结构                                                | `...>${forEach(ary,(item)=>html`...`)}<...`            |
| ifTrue  | TEXT/SLOT | 当条件为 true 时输出模板内容                                | `...>${ifTrue(condition,()=>html`...`)}<...`           |
| ifElse  | TEXT/SLOT | 当条件为 true/false 时输出对应模板内容                      | ` ...>${ifElse(condition,()=>html``,()=>html``)}<... ` |
| when    | TEXT/SLOT | 多条件分支，支持 switch/ifelse 两种模式                     | ` ...>${when(condition,{c1:()=>html``,c2:...})}<... `  |
| slot    | SLOT      | 动态插槽                                                    | ` ...>${slot((args) => html``)}<... `                  |
| htmlD    | TAG      | 向指定元素插入HTML内容                                                    | `<div a="b" ${htmlD('<b>1</b>')}>`                  |

## 装饰器 Decorator

- @state 定义组件内状态属性。可选参数{prop}，可指定 propName 初始化值
- @prop 定义父组件参数，默认不可修改。可选参数{type,required,sync,getter,setter}
  > 设置 getter/setter 后，该属性的`@watch` 将会失效
- @query/queryAll 定义 CssSelector 查询结果
- @tag 自定义组件的标签名
- @event 定义全局事件
- @watch 监控 state/prop 变更
- @computed 计算属性，仅在响应变量变更时更新缓存值
- @debounced 定义函数防抖

#### 继承
  部分指令可由子类继承不会覆盖，包括@state/@prop/@watch/@computed

## 事件

在CompElem中事件分为三类

1. 原生事件 —— `<div @click="..."`，监听器回调参数返回原生事件对象
2. 扩展原生事件 —— `<div @resize="..."`，监听器回调参数返回`CustomEvent`事件对象
3. 组件自定义事件 —— `<l-select @change="..."`，监听器回调参数返回`CustomEvent`事件对象

### 事件修饰符
通过`.`号可使用修饰符修饰事件如 `@scroll.throttle:100="${...}"`
- 全部通用 —— `debounce/throttle/once` 可组合
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
  ```
### 扩展原生事件
可直接用于DOM元素的扩展事件（非组件事件），支持列表如下
- resize 元素尺寸变化时触发
- outside 鼠标点击元素外部时触发，可通过修饰符限制鼠标点击类型`outside.[mousedown/up/click/dblclick]`，默认click
- mutate 内容变化时触发。基于  Mutation Observer API