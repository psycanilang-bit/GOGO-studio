/**
 * 安全的消息发送工具
 * 处理Extension context invalidated错误
 */

/**
 * 安全地发送Chrome runtime消息
 * 如果扩展context失效，返回false而不是抛出错误
 */
export async function safeSendMessage(message: any): Promise<boolean> {
  try {
    if (!chrome.runtime?.id) {
      console.warn('[Message] Extension context invalidated')
      return false
    }
    await chrome.runtime.sendMessage(message)
    return true
  } catch (e) {
    console.error('[Message] 发送失败:', e)
    return false
  }
}
