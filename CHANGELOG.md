# Changelog

## 0.30.x 
基于signal模型的编译架构

### 过渡（transition）

- 新增 DOM 级过渡：结构指令（`ifTrue` / `ifElse` / `when` / `forEach`）可带 `{ enter, leave, move }`，`show` 可带 `{ transition }`，函数型插槽用 `<slot transition="…">`。
- 离场：`commitRemove` 支持延后摘除——先冻结订阅与子组件，动画结束后才移除并销毁。
- 入场：`insertSubView` / `reconcileEach` 新增入场钩子，首屏不播放；全批共用一次强制重排。
- 列表重排：`forEach` 的 `move` 实现 FLIP（读写分离），用 Web Animations API 播放（`fill: 'none'`，不写内联 `transform/transition`；新一次重排直接 `cancel()` 上一段动画）。字符串 spec 只表示启用（默认 200ms），不再映射预设名。
- 离场批处理：同帧内的多条离场共用一个 drain，**全批只强制一次重排**（批量删除 1000 项：15.2ms → 5.5ms）。
- enter/leave 合并为同一个运行时（`src/transition/core.ts`），共用队列、双 rAF 起跑与结束判定。
- 修正过渡结束判定：等**全部**过渡属性结束（`propCount`，而不是第一个 `transitionend`）、换到 `-to` **之后**才读 computed style、`delay` 计入超时预算、多根子视图逐元素计时、`duration: 0` 的入场不再挂类。
- 修正 `delay`：现在写进元素内联 `transition-delay` / `animation-delay`，**真的延后播放**；此前只加超时预算，视觉上没有任何延迟。落定时按写入前的基线恢复，`cancelEnter` 同步清理；`getAnimations` 路径的兜底超时不再重复叠加 `delay`（`effect.getTiming()` 已含）。
- 新增 `--ce-i`（`INDEX_VAR`）：过渡期间元素上带本批序号，结构指令按批内下标、`forEach` 按本批第几个（`prepareEnter` / `runLeave` / `commitRemove` 新增可选 `index` 参数）。配合 `transition-delay: calc(var(--ce-i, 0) * 70ms)` 即可做排队入场/离场，不需要 `nth-child`、也不需要知道总数。
- 修正插槽离场：按节点（`WeakSet`）而不是插槽名标记，多次换代重叠时各代只清自己的标记。
- 修正离场冻结覆盖面：新增 `quiesceSubComponents()`（遍历整棵离场子树并穿透 `shadowRoot`），`commitRemove` 与 `#updateSlot` 的离场分支统一走它。此前只冻结离场根节点上的组件，**shadow 内嵌套的子组件不被冻结**，离场动画期间其内部 `@state` / `@computed` / `@watch` / `@resource` 仍在改写这棵正在淡出的子树。
- 修正单批次异常隔离：`settle()` 内对取消器与 `finalize` 分别 try/catch，异常经 `showError` 透出。此前 `destroyed()` 等用户钩子抛错会中断 `drain` 的读阶段循环，同帧其余批次既已 `splice` 出队列又未进 `running`，**永久泄漏在文档里**（`data-ce-leaving` 与过渡类一并残留）；从动画 `finished` 的异步回调进入时还会变成 unhandled rejection。
- 修正 `withViewTransition`：`ready` / `updateCallbackDone` 的拒绝不再产生 unhandled rejection；`update` 抛错透传给调用方；并发调用按代次接管 `data-ce-vt`。
- 插槽：`#updateSlot` 的离场延后到动画之后，`#swapSlotNodes` 让路。
- `CompElem.destroy()` 拆为 `__quiesce()` + `__finalize()`；`isDestroyed` 在冻结后即为 true。
- `TRANSITION_CSS` 以 `css` 模板导出（`CssTemplate`，与 `?tmpl` 导入的样式同形），可直接放进静态 `css` getter 或 `setDefaults({ css: [...] })`；`setDefaults` 相应支持 `CssTemplate` 入参（转表复用同一张 sheet）。
- 新增导出：`withViewTransition`、`supportsViewTransition`、`installViewTransitionStyles`、`TRANSITION_CSS`、`VIEW_TRANSITION_CSS`，类型 `ViewTransitionOptions`、`TransitionSpec`、`MoveSpec`、`StructureTransitionOptions`。运行时内部符号（`runLeave`、`prepareEnter`、`cancelEnter`、`playMove`、`captureRects`、`whenTransitionEnds`、`transitionInfoOf`、`nextFrame`、`transitionOptsOf`、`stripViewKeyMarkers`、`normalizeSpec`）不进包根出口，只供框架内部与探针按 `./transition/*` 深路径引用。
- `show(v, { transition })` 简写：第二参是对象时按选项处理（不必再写 `undefined` 占位）。
- 修正列表重排的连续快速重排：`playMove` 改为**先 `cancel()` 上一段位移、再读新位置**。此前先读 rect（读到的是动画中间位置）后取消，旧动画的当前偏移被算进位移量，`fill:'none'` 取消后元素会先跳一下再动画到目标（实测单帧跳变 34～52px）。`captureRects` 保持不变——它读到的动画中间位置正是新动画要接上的起点；在那里也取消会让元素先跳回旧布局位，实测跳变更大（52～73px）。
- 修正 `nextFrame` 的超时兜底：兜底改为只按页面可见性触发（`visibilityState === 'hidden'`，另加 3s 上限），不再固定 100ms。此前在长帧 / 低端机上定时器会抢在第二帧 rAF 之前触发，`-from` 状态一次都没被绘制就换到 `-to`，过渡静默不播（表现为「瞬间切换」）。
- 修正 `drain` 的多根批次判定：起点从只看 `job.els[0].isConnected` 改为「有没有任一元素在文档里」，强制重排也改成取第一个仍在文档里的元素（对脱线元素读 `offsetHeight` 不产生布局）。
- 修正 `insertStyleSheet(CssTemplate)` 与静态 `css` getter 各自建表：统一走 `sheetOfCssTemplate()`，删除 `CssTemplateSheetMap`。此前同一份 `css` 模板会产生两张 sheet（双份内存 + 两处缓存），`devtools` 里的双表回查即其化石证据。
- 修正 `show()` 快速反转竞态：离场落定（`display:none`）改为按「显示代次」守卫，状态在动画期间翻转时旧落定作废——此前会把已重新打开的元素永久藏起来。
- 修正 `forEach` 的 move 判定未扣除删除偏移：比对「旧下标 vs 新下标」时只折算了新增（`edgeOffset`），纯删除会让其后所有存活项的旧下标整体后移，于是**整段存活项被误判为需要移动**。带 `leave` 时离场节点留在原位等动画，存活项却被挪到它前面 —— 删头部两项，看起来像删了尾部两项（离场节点出现在列表末尾）。现在按每个旧下标之前被删除的项数折算后再比对；纯删除/纯新增完全不再产生 move。
- 修正 `AFTER_BEGIN` 的锚点：从 `oldKeys[0]` 改为**第一个存活旧键**（首项新增的 fallback 同源）。带 `leave` 时 `oldKeys[0]` 往往正是本轮离场的节点，它仍在原位占着位置，把存活项插到它前面会把离场节点一路挤到列表后面（如 `a b c d e f` → `f b c d e`，离场节点 `a` 从 0 掉到末位）。
- 新增 `cancelEnter(nodes)`：取消进行中的入场（状态翻转时由 `show` 调用），避免入场类与离场类互相打架。
- 修正 `forEach` / `ifElse` 的声明文件缺过渡参数（此前运行时可用、TS 报 arity 错误）。
- 破坏性变更：无（不传过渡选项时行为与之前一致）。
