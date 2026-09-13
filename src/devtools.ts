import {
  ComputedMapCache,
  ComputedUpdateDepsMap,
  CssUpdateDepsMap,
  DefinitionComputedMap,
  DefinitionPropMap,
  DefinitionStateMap,
  ViewDepMap,
  WatchKeyRootMap,
} from "./constants";

/**
 * CompElem DevTools 接入点
 *
 * 仅供浏览器扩展（compelem-devtools）在页面世界读取组件元数据使用。
 * 设计约束：
 *  1. 零运行时开销 —— install 只挂载函数引用，不做任何遍历/计算；
 *     所有数据在被 devtools 调用时才现算。
 *  2. 零公开 API 面 —— 本模块不从 index.ts 导出，只挂到 globalThis。
 *  3. 只读 —— 全部返回副本或新数组，调用方无法改写框架内部 WeakMap。
 */

export interface CompElemCoreMeta {
  /** 契约版本，扩展据此判断可用能力 */
  version: number
  /** 类上声明的 computed 键名（含继承链） */
  computedKeys(ctor: Function): string[]
  /** computed 键 -> 它依赖的 prop/state 路径（含继承链） */
  computedDeps(ctor: Function): Record<string, string[]>
  /** @watch 监听的变量路径（含继承链，已去重） */
  watchKeys(ctor: Function): string[]
  /** render() 收集到的视图依赖路径 */
  viewDeps(ctor: Function): string[]
  /** css 模板里用到的变量路径 */
  cssDeps(ctor: Function): string[]
  /** @prop 声明的键名（含继承链） */
  propKeys(ctor: Function): string[]
  /** @state 声明的键名（含继承链） */
  stateKeys(ctor: Function): string[]
}

function superOf(ctor: any): any {
  try {
    return Object.getPrototypeOf(ctor);
  } catch (e) {
    return undefined;
  }
}

// 沿继承链收集所有命中值（子类在前）
function allOnChain<T>(ctor: any, read: (c: any) => T | undefined | null): T[] {
  const out: T[] = [];
  let c = ctor;
  const guard = 32;
  for (let i = 0; i < guard && c; i++) {
    if (c === Function.prototype) break;
    let v: any;
    try { v = read(c); } catch (e) { v = undefined; }
    if (v) out.push(v);
    c = superOf(c);
  }
  return out;
}

function unique(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (let i = 0; i < list.length; i++) {
    if (!seen.has(list[i])) {
      seen.add(list[i]);
      out.push(list[i]);
    }
  }
  return out;
}

function computedKeys(ctor: Function): string[] {
  const fromCache = allOnChain(ctor, c => ComputedMapCache.get(c));
  const fromDef = fromCache.length ? [] : allOnChain(ctor, c => DefinitionComputedMap.get(c));
  const keys: string[] = [];
  fromCache.concat(fromDef).forEach(m => {
    Object.keys(m).forEach(k => keys.push(k));
  });
  return unique(keys);
}

// ComputedUpdateDepsMap 是「数据路径 -> computed getter 集合」的正向索引，
// 反推即得到「computed 键 -> 依赖路径」。getter 上的 key 由 CompElem 首次实例化时写入。
function computedDeps(ctor: Function): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  allOnChain(ctor, c => ComputedUpdateDepsMap.get(c)).forEach(depMap => {
    depMap.forEach((getters, dep) => {
      getters.forEach((g: any) => {
        const k = g && g.key;
        if (typeof k !== "string") return;
        (out[k] || (out[k] = [])).push(dep);
      });
    });
  });
  Object.keys(out).forEach(k => { out[k] = unique(out[k]); });
  return out;
}

function watchKeys(ctor: Function): string[] {
  const out: string[] = [];
  allOnChain(ctor, c => WatchKeyRootMap.get(c)).forEach(rootMap => {
    rootMap.forEach(list => {
      for (let i = 0; i < list.length; i++) out.push(list[i]);
    });
  });
  return unique(out);
}

function viewDeps(ctor: Function): string[] {
  const out: string[] = [];
  allOnChain(ctor, c => ViewDepMap.get(c)).forEach(set => {
    set.forEach(p => out.push(p));
  });
  return unique(out);
}

function cssDeps(ctor: Function): string[] {
  const out: string[] = [];
  allOnChain(ctor, c => CssUpdateDepsMap.get(c)).forEach(set => {
    set.forEach(p => out.push(p));
  });
  return unique(out);
}

function propKeys(ctor: Function): string[] {
  const out: string[] = [];
  allOnChain(ctor, c => DefinitionPropMap.get(c)).forEach(m => {
    Object.keys(m).forEach(k => out.push(k));
  });
  return unique(out);
}

function stateKeys(ctor: Function): string[] {
  const out: string[] = [];
  allOnChain(ctor, c => DefinitionStateMap.get(c)).forEach(m => {
    Object.keys(m).forEach(k => out.push(k));
  });
  return unique(out);
}

const CORE_META: CompElemCoreMeta = {
  version: 1,
  computedKeys,
  computedDeps,
  watchKeys,
  viewDeps,
  cssDeps,
  propKeys,
  stateKeys,
};

// ---------------- 页面标记与「未安装扩展」提示 ----------------

/** 扩展 content script 在 document_start 写的标记，格式 `<状态>:<版本>` */
const DEVTOOLS_MARK = "data-compelem-devtools";
/** 库侧反向标记：扩展据此判断「本页用了 compelem」，用于按需注入与图标点亮 */
const LIB_MARK = "data-compelem";
const HINT_URL = "https://github.com/holyhigh2/compelem-devtools";

function docEl(): any {
  try {
    const g = globalThis as any;
    return g && g.document ? g.document.documentElement : null;
  } catch (e) {
    return null;
  }
}

/**
 * 扩展是否已安装。
 * 浏览器没有「查询扩展是否安装」的 API，只能靠扩展自己打标 —— 这与 Vue DevTools
 * 依赖 __VUE_DEVTOOLS_GLOBAL_HOOK__ 是同一思路。标记由 content script 在
 * document_start 同步写入，早于任何页面脚本，因此模块加载期即可读到。
 * bridge 兜底是为了兼容旧版本扩展（不打标但会挂 window.__COMPELEM_DEVTOOLS__）。
 */
function devtoolsInstalled(): boolean {
  try {
    const de = docEl();
    if (de && de.getAttribute(DEVTOOLS_MARK)) return true;
    return !!(globalThis as any).__COMPELEM_DEVTOOLS__;
  } catch (e) {
    return true; // 判定不了就当已装，宁可不提示也不误报
  }
}

/** 页面打标：供扩展探测「本页使用了 compelem」 */
function stampPage(): void {
  try {
    const de = docEl();
    if (de && !de.hasAttribute(LIB_MARK)) {
      de.setAttribute(LIB_MARK, String(CORE_META.version));
    }
  } catch (e) {
    /* noop */
  }
}

let hintScheduled = false;

/**
 * 仅开发构建生效：`process.env.DEV` 在生产构建被 rollup 替换为 false，
 * 整段被 terser 消除；生产构建另有 drop_console 兜底。与 Vue DevTools 行为一致。
 */
export function notifyDevtoolsMissing(): void {
  if (!process.env.DEV) return;
  if (hintScheduled) return;
  hintScheduled = true;
  try {
    const g = globalThis as any;
    if (!g || typeof g.document === "undefined") return;
    if (g.__COMPELEM_DEVTOOLS_NO_HINT__) return;
    if (devtoolsInstalled()) return;
    // 宏任务兜底：给迟到的 content script 一次机会（document_start 时
    // documentElement 尚未建立的极端场景会退到 readystatechange 打标）
    setTimeout(function () {
      if (devtoolsInstalled()) return;
      const c = g.console;
      if (!c) return;
      const out = c.info ? c.info : c.log;
      out.call(
        c,
        "%c Compelem %c 本页使用了开发版 compelem，但未检测到 Compelem DevTools 扩展。\n" +
        "安装后可获得组件树、状态检查、依赖分析与更新追踪：\n" +
        HINT_URL,
        "background:#4C6EF5;color:#fff;padding:2px 6px;border-radius:3px 0 0 3px;font-weight:bold",
        "color:#4C6EF5"
      );
    }, 0);
  } catch (e) {
    /* noop */
  }
}

/**
 * 在模块加载期调用：把核心库元数据挂到 __COMPELEM_ECOSYSTEM__.core。
 * 与 store / router / i18n 共用同一命名空间，但 core 不参与 provider 探测。
 */
export function installCompElemDevtools(): CompElemCoreMeta | undefined {
  try {
    const g = globalThis as any;
    if (!g) return undefined;
    const ns = g.__COMPELEM_ECOSYSTEM__ || (g.__COMPELEM_ECOSYSTEM__ = {});
    if (!ns.core) ns.core = CORE_META;
    stampPage();
    notifyDevtoolsMissing();
    return ns.core;
  } catch (e) {
    return undefined;
  }
}
