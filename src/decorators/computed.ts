/**
 * 定义计算属性
 * 计算属性会自动跟踪get函数内的state/prop，并在变动时自动变更
 * 只能应用在一个非静态get属性上
 * @param source 变量名(数组)，支持访问链
 * @param immediate 立即执行
 * @param deep 深度监控
 */
export function computed(...args: any[]): void
export function computed(target: any, propertyKey: string, descriptor: PropertyDescriptor): void {
  // Implemented by the compiler
}
