/**
 * Chrome Storage 本地持久化Hook
 * 封装chrome.storage.local API，提供React状态管理接口
 */

import { useState, useEffect, useCallback } from 'react'

/**
 * 检测扩展context是否失效
 */
function isExtensionContextValid(): boolean {
  try {
    return chrome.runtime?.id !== undefined
  } catch {
    return false
  }
}

/**
 * 使用Chrome本地存储的状态Hook
 *
 * @remarks
 * - 数据持久化到chrome.storage.local
 * - 跨标签页自动同步
 * - API类似useState但支持异步
 *
 * @param key - 存储键名
 * @param initialValue - 默认值（键不存在时使用）
 * @returns [当前值, 更新函数, 是否已加载]
 *
 * @example
 * ```typescript
 * const [annotations, setAnnotations, isLoaded] = useStorage<GOGOAnnotation[]>('annotations', [])
 *
 * // 等待加载完成
 * if (!isLoaded) return <div>Loading...</div>
 *
 * // 添加标注
 * await setAnnotations([...annotations, newAnnotation])
 * ```
 */
export function useStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T) => Promise<void>, boolean] {
  const [storedValue, setStoredValue] = useState<T>(initialValue)
  const [isLoaded, setIsLoaded] = useState(false)

  // 初始化：从storage读取数据
  useEffect(() => {
    const loadValue = async () => {
      if (!isExtensionContextValid()) {
        console.warn('[Storage] Extension context invalidated')
        setIsLoaded(true) // 即使失败也标记为已加载
        return
      }

      try {
        const result = await chrome.storage.local.get(key)
        console.log(`[Storage] 读取 ${key}:`, result[key])
        if (result[key] !== undefined) {
          setStoredValue(result[key])
        }
      } catch (e) {
        console.error(`[Storage] 读取失败 (${key}):`, e)
      } finally {
        setIsLoaded(true)
        console.log(`[Storage] ${key} 加载完成`)
      }
    }

    loadValue()
  }, [key])

  // 监听其他标签页的修改
  useEffect(() => {
    if (!isExtensionContextValid()) return

    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === 'local' && changes[key]) {
        setStoredValue(changes[key].newValue)
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [key])

  // 更新函数：写入storage并更新state
  const setValue = useCallback(
    async (value: T) => {
      if (!isExtensionContextValid()) {
        console.warn('[Storage] Extension context invalidated, 无法写入')
        return
      }

      try {
        await chrome.storage.local.set({ [key]: value })
        setStoredValue(value)
        console.log(`[Storage] 已写入 ${key}:`, value)
      } catch (e) {
        console.error(`[Storage] 写入失败 (${key}):`, e)
        throw e
      }
    },
    [key]
  )

  return [storedValue, setValue, isLoaded]
}
