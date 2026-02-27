/**
 * 模式状态管理Hook
 * 管理GOGO/HUNTER/OFF三种互斥模式的切换
 */

import { useStorage } from './useStorage'
import type { Mode } from '~types'

/**
 * 模式状态管理
 *
 * @remarks
 * - 模式持久化到chrome.storage.local
 * - 切换模式时自动触发清理逻辑（由调用方处理）
 * - 初始状态为OFF
 *
 * @returns 模式状态和切换函数
 *
 * @example
 * ```typescript
 * const { currentMode, switchMode } = useMode()
 *
 * // 切换到GOGO模式
 * switchMode('GOGO')
 *
 * // 关闭扩展
 * switchMode('OFF')
 * ```
 */
export function useMode() {
  const [currentMode, setCurrentMode, isModeLoaded] = useStorage<Mode>('mode', 'OFF')

  const switchMode = async (newMode: Mode) => {
    if (newMode === currentMode) {
      console.log(`[Mode] 已处于${newMode}模式，忽略切换`)
      return
    }

    console.log(`[Mode] 切换模式: ${currentMode} -> ${newMode}`)
    await setCurrentMode(newMode)
  }

  return {
    currentMode,
    switchMode,
    isModeLoaded
  }
}
