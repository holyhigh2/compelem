import { debounce } from "myfx";

/**
 * 定义防抖函数
 * 
 * @param wait 抖动间隔，单位ms
 */
export function debounced(wait: number) {
  return (target: any, name: string, descriptor: PropertyDescriptor) => {
    descriptor.value = debounce(target[name], wait);
  };
}