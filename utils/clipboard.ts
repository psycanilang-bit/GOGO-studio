/**
 * 剪贴板操作工具
 * 使用现代 Clipboard API
 */

/**
 * 复制文本到剪贴板
 *
 * @remarks
 * 使用 navigator.clipboard API（需要 HTTPS 或 localhost）
 * 降级方案：execCommand（已废弃但兼容性好）
 *
 * @param text - 要复制的文本内容
 * @throws 复制失败时抛出错误
 *
 * @example
 * ```typescript
 * try {
 *   await copyToClipboard('#my-button')
 *   console.log('复制成功')
 * } catch (e) {
 *   console.error('复制失败:', e)
 * }
 * ```
 */
export async function copyToClipboard(text: string): Promise<void> {
  // 优先使用现代 Clipboard API
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch (e) {
      console.warn('[Clipboard] 现代API失败，尝试降级方案:', e)
    }
  }

  // 降级方案：使用 execCommand
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)

  try {
    textarea.select()
    const success = document.execCommand('copy')
    if (!success) {
      throw new Error('execCommand返回false')
    }
  } finally {
    document.body.removeChild(textarea)
  }
}
