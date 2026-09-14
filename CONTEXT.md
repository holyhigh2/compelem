# CONTEXT.md - 项目上下文

## 项目背景

compelem 是一个现代化、响应式、轻量的 WebComponent 开发库，基于 Class + 装饰器构建。旨在为开发者提供丰富、灵活、可扩展的声明式接口，用于构建 Web Components。

## 核心概念

### 组件模型
- **CompElem**: 所有组件的基类，提供生命周期、响应式系统和 Shadow DOM 支持
- **装饰器系统**: @tag、@prop、@state、@computed、@watch、@emits 等声明式装饰器
- **模板系统**: h 模板标签函数，支持属性前缀（@事件、.prop、?布尔、*求值）

### 响应式系统
- **@prop**: 外部传入属性，组件内不可直接赋值
- **@state**: 组件内部响应状态，仅组件内修改
- **@computed**: 缓存计算属性，依赖的 prop/state 变化才重算
- **@watch**: 监视 prop/state 变化

### 指令系统
- **结构指令**: forEach、ifTrue、ifElse、when、slot
- **属性指令**: show、model、bind、classes、styles
- **其他指令**: html、transition

## 架构设计

### 渲染流程
1. `render()` 返回 `h` 模板标签函数
2. 解析模板，创建含占位符的 HTML 字符串
3. 遍历 DOM，建立变量与 DOM 位置的映射
4. 创建响应式更新点
5. 应用样式和事件绑定

### 依赖收集
- 字符串模板在变量被读取时获取依赖
- 必须使用指令来定位并收集依赖
- 普通表达式无法准确确定变量位置，无法绑定响应式更新
- 每个变量记录自己所在的 context（组件根 context 或指令 context）
- 变量变更时仅通知所在 context 进行局部 re-render，不会触发整棵组件树更新

### 结构指令 vs 非结构指令
- **结构指令**（forEach/ifTrue/ifElse/when/slot）：产生/删除 DOM 子树，创建独立的依赖上下文，模板函数**必须**返回创建函数而非直接返回模板
- **非结构指令**（show/bind/classes/styles/model）：仅修改已有 DOM 属性，依赖在指令外部收集

### 惰性依赖（重要）
- 结构指令（ifTrue/ifElse/when）的模板函数中的 state/prop 依赖是**惰性的**
- 只有在该分支首次被渲染执行时，框架才会收集并监听其中的变量
- 如果初始条件为 false，则分支内的变量在首次渲染时不会被监听
- 应对：确保变量在根模板上下文中被读取，或使用 @watch 显式监视

### 更新机制
- 状态变更触发 `requestUpdate`
- 批量更新按 tick 合并
- 仅更新受影响的组件和指令

## 文件结构

```
src/
├── CompElem.ts          # 组件基类
├── index.ts             # 主入口
├── types.ts             # 类型定义
├── config.ts            # 配置
├── constants.ts         # 常量
├── decorator/           # 装饰器系统
│   ├── Decorator.ts
│   └── index.ts
├── decorators/          # 具体装饰器实现
│   ├── computed.ts
│   ├── csscope.ts
│   ├── debounced.ts
│   ├── emits.ts
│   ├── event.ts
│   ├── onced.ts
│   ├── prop.ts
│   ├── query.ts
│   ├── state.ts
│   ├── tag.ts
│   ├── throttled.ts
│   └── watch.ts
├── directives/          # 指令系统
│   ├── bind.ts
│   ├── classes.ts
│   ├── forEach.ts
│   ├── html.ts
│   ├── ifElse.ts
│   ├── ifTrue.ts
│   ├── model.ts
│   ├── show.ts
│   ├── slot.ts
│   ├── styles.ts
│   ├── transition.ts
│   └── when.ts
├── animate/             # 动画系统
├── helpers/             # 辅助工具
├── utils/               # 工具函数
└── render/              # 渲染引擎
```

## 设计决策

### 为什么必须使用指令
- 字符串模板的特性要求通过指令来定位并收集依赖
- 普通表达式无法准确确定变量位置，无法绑定响应式更新
- 指令可以获取同一个级别的执行顺序（varsIndex），便于与新的 render() 结果进行比对

### 为什么 prop 不可在组件内赋值
- 保持数据流的单向性
- 避免循环依赖
- 修改请使用 `model: true` 或 `emit('update:xxx', ...)` 通知父级

### 为什么组件事件必须先声明
- 确保事件类型安全
- 避免拼写错误导致的 bug
- 支持通配符事件名

## 扩展性

- 支持自定义装饰器
- 支持自定义指令
- 支持 CSS 作用域
- 支持过渡动画
- 零运行时依赖

## 测试覆盖

测试应覆盖：
- 组件生命周期
- 响应式更新
- 指令功能
- 事件系统
- 样式作用域
- 边界情况（null 渲染、嵌套组件等）
