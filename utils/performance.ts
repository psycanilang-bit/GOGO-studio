/**
 * 性能监控工具
 * 用于确保关键操作符合性能预算
 */

/**
 * 性能预算常量
 * 基于60FPS目标（16.67ms/帧）
 */
export const PERFORMANCE_BUDGET_MS = 16

/**
 * 测量函数执行时间并输出警告
 *
 * @remarks
 * - 用于关键路径的性能监控
 * - 超预算时输出警告日志，不阻塞执行
 *
 * @param fn - 要测量的函数
 * @param label - 性能日志标签
 * @param budget - 性能预算（毫秒），默认16ms
 * @returns 函数执行结果
 *
 * @example
 * ```typescript
 * const element = measurePerformance(
 *   () => detectElementAtPoint(rect),
 *   'Hunter碰撞检测',
 *   2  // 2ms预算
 * )
 * ```
 */
export function measurePerformance<T>(
  fn: () => T,
  label: string,
  budget: number = PERFORMANCE_BUDGET_MS
): T {
  const startTime = performance.now()
  const result = fn()
  const elapsed = performance.now() - startTime

  if (elapsed > budget) {
    console.warn(
      `⚠️ [性能] ${label} 超预算: ${elapsed.toFixed(2)}ms (预算: ${budget}ms)`
    )
  } else {
    console.log(`✓ [性能] ${label}: ${elapsed.toFixed(2)}ms`)
  }

  return result
}

/**
 * 性能监控装饰器（异步版本）
 *
 * @param fn - 要测量的异步函数
 * @param label - 性能日志标签
 * @param budget - 性能预算（毫秒）
 * @returns Promise包装的函数结果
 */
export async function measurePerformanceAsync<T>(
  fn: () => Promise<T>,
  label: string,
  budget: number = PERFORMANCE_BUDGET_MS
): Promise<T> {
  const startTime = performance.now()
  const result = await fn()
  const elapsed = performance.now() - startTime

  if (elapsed > budget) {
    console.warn(
      `⚠️ [性能] ${label} 超预算: ${elapsed.toFixed(2)}ms (预算: ${budget}ms)`
    )
  } else {
    console.log(`✓ [性能] ${label}: ${elapsed.toFixed(2)}ms`)
  }

  return result
}
