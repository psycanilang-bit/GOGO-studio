/**
 * 页面唯一标识符工具
 * 用于区分不同页面，忽略 query 参数和 hash
 */

/**
 * 生成页面唯一标识符
 *
 * @remarks
 * 使用 origin + pathname 作为页面 ID
 * 这样可以忽略 query 参数（如 ?v=1）和 hash（如 #section1）的变化
 *
 * @example
 * ```typescript
 * getPageId('https://gemini.google.com/app/123?v=1')
 * // 返回: 'https://gemini.google.com/app/123'
 *
 * getPageId('https://gemini.google.com/app/123?v=2#top')
 * // 返回: 'https://gemini.google.com/app/123'
 * ```
 *
 * @param url - 完整的 URL
 * @returns 页面唯一标识符（origin + pathname）
 */
export function getPageId(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.origin + urlObj.pathname
  } catch (e) {
    console.error('[PageId] 无效 URL:', url, e)
    // 如果 URL 解析失败，返回原始 URL
    return url
  }
}

/**
 * 获取当前页面的 ID
 *
 * @returns 当前页面的唯一标识符
 */
export function getCurrentPageId(): string {
  return getPageId(window.location.href)
}
