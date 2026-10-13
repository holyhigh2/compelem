import type { CompElem } from "../CompElem";

/**
 * 插槽钩子的「出处」（ provenance ）。
 *
 */
export interface SlotOrigin {
  /** 写回调的那个组件实例。`subViews` 挂在其 constructor 上，取用时必须用它 */
  owner: CompElem<any>;
  /** 编译器分配的 `subViews` 下标 */
  subId: number;
  /** 回调实例上的内联 fx（跨层内联时存在） */
  fx?: any;
  /** 回调实例上的内联 built-vars（跨层内联时存在） */
  bv?: any;
}

/**
 * provenance 登记表。用 WeakMap 而不是往函数上挂字段 —— 键就是回调对象本身，
 * 不影响其可枚举性 / 序列化，也不会与编译产物写入的字段互相污染。
 */
const ORIGIN_MAP: WeakMap<Function, SlotOrigin> = new WeakMap();

/**
 * 登记回调的 provenance。**仅供 `slot()` 指令调用**——它是唯一能静态确定
 * owner + subId 的捕获点。业务代码不要直接调用。
 */
export function registerSlotOrigin<T extends Function>(fn: T, origin: SlotOrigin): T {
  ORIGIN_MAP.set(fn, origin);
  return fn;
}

/**
 * 取回调的 provenance。没有登记过就返回 `undefined` ——
 * 调用方**不要**再退回「消费者组件」猜测，那会让来路不明的回调拿到别人的
 * `subViews`：轻则 DEV 报错，重则恰好撞上消费者自己的某个 subId 而静默渲染错内容。
 */
export function slotOriginOf(fn: Function | undefined | null): SlotOrigin | undefined {
  return fn ? ORIGIN_MAP.get(fn) : undefined;
}

/**
 * 解析「该回调属于哪个组件」。
 *
 * @param fn       子模板回调
 * @param fallback 仅用于**同一模板内的字面量回调**（结构指令 ForEach/IfTrue/IfElse/When
 *                 的模板实参）——它们不携带 provenance，owner 就是外层模板的渲染组件。
 */
export function resolveSubTemplateOwner(
  fn: Function | undefined | null,
  fallback?: CompElem<any>,
): CompElem<any> | undefined {
  return slotOriginOf(fn)?.owner ?? fallback;
}
