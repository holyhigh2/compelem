import { cloneDeep, has, isEmpty } from "myfx";

export type StateOption = {
  /**
   * 指定prop进行初始化，如果时对象类型时
   */
  prop?: string,
  /**
   * 是否发生变更，如果未指定使用严格相等
   * @param newValue 
   * @param oldValue 
   * @returns 
   */
  hasChanged?:(newValue:any,oldValue:any)=>boolean
};

/**
 * 声明一个可双向变动的属性
 * @param options 可选参数 {prop从prop获取初始值}，如果type未定义则根据默认值自动推断类型
 */
export function state(target: any, stateKey: any): void;
export function state(
  options: StateOption
): (target: any, stateKey: any) => void;
export function state(options: StateOption) {
  if (arguments.length === 1) {
    return (target: any, stateKey: string) => {
      defineState(target, stateKey, options);
    };
  }

  let target = arguments[0],
    stateKey = arguments[1];
  defineState(target, stateKey, { prop: "" });
}

function defineState(target: any, stateKey: string, options?: StateOption) {
  if (!has(target.constructor, "__deco_states")) {
    target.constructor.__deco_states = isEmpty(target.constructor.__deco_states) ? {} : cloneDeep(target.constructor.__deco_states)
  }
  target.constructor.__deco_states[stateKey] = options;
}
