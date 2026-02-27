/**
 * 事件监听器自动清理Hook
 * 防止内存泄漏，确保组件卸载时移除监听器
 */

import { useEffect, useRef } from 'react'

/**
 * 自动管理事件监听器的生命周期
 *
 * @remarks
 * - 自动添加和移除事件监听器
 * - 使用useRef保证handler引用稳定
 * - 组件卸载时自动清理
 *
 * @param eventName - DOM事件名称
 * @param handler - 事件处理函数
 * @param element - 监听目标（默认document）
 * @param options - 事件监听器选项（支持 capture、passive 等）
 *
 * @example
 * ```typescript
 * // 监听鼠标点击
 * useEventListener('click', (e) => {
 *   console.log('点击位置:', e.clientX, e.clientY)
 * })
 *
 * // 监听特定元素
 * useEventListener('scroll', handleScroll, containerRef.current)
 *
 * // 捕获阶段拦截
 * useEventListener('click', handler, document, { capture: true })
 * ```
 */
export function useEventListener<K extends keyof DocumentEventMap>(
  eventName: K,
  handler: (event: DocumentEventMap[K]) => void,
  element: Document | HTMLElement | null = document,
  options?: boolean | AddEventListenerOptions
): void {
  // 使用ref保存handler，避免重复添加监听器
  const savedHandler = useRef(handler)
  // 使用ref保存options，避免对象引用变化导致重新监听
  const savedOptions = useRef(options)

  useEffect(() => {
    savedHandler.current = handler
  }, [handler])

  useEffect(() => {
    savedOptions.current = options
  }, [options])

  useEffect(() => {
    // 如果element未挂载，跳过
    if (!element) return

    // 创建事件监听器（调用最新的handler）
    const eventListener = (event: Event) => {
      savedHandler.current(event as DocumentEventMap[K])
    }

    console.log(`[Hook] 注册事件监听器: ${eventName}, capture: ${(savedOptions.current as any)?.capture}`)
    element.addEventListener(eventName, eventListener, savedOptions.current)

    // 清理函数：移除监听器
    return () => {
      element.removeEventListener(eventName, eventListener, savedOptions.current)
      console.log(`[Hook] 已清理事件监听器: ${eventName}`)
    }
  }, [eventName, element])  // 移除 options 依赖，使用 ref 代替
}
