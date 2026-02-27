/**
 * GOGO 元素定位与标注持久化
 * 提供XPath生成和TextQuote选择器
 */

import { generateXPath } from '~utils/xpath'
import type { TextQuote } from '~types'

/**
 * 为Range生成完整定位信息
 *
 * @remarks
 * 结合XPath和TextQuote双重定位，提高恢复成功率
 *
 * @param range - 文本选择Range
 * @returns 定位信息对象
 */
export function createLocationInfo(range: Range): {
  xpath: string
  textQuote: TextQuote
} {
  return {
    xpath: generateXPath(range.startContainer),
    textQuote: createTextQuote(range)
  }
}

/**
 * 创建文本引用选择器
 *
 * @remarks
 * Web Annotation Data Model 标准
 * - exact: 选中的完整文本
 * - prefix: 前置上下文（32字符）
 * - suffix: 后置上下文（32字符）
 *
 * @algorithm
 * 1. 获取选中文本
 * 2. 提取startContainer的前32字符
 * 3. 提取endContainer的后32字符
 *
 * @param range - 文本选择Range
 * @returns TextQuote对象
 */
export function createTextQuote(range: Range): TextQuote {
  const exact = range.toString()

  // 获取起始节点的文本内容
  const startContainer = range.startContainer
  const startText = startContainer.textContent || ''
  const startOffset = range.startOffset

  // 提取前置上下文
  const prefixStart = Math.max(0, startOffset - 32)
  const prefix = startText.substring(prefixStart, startOffset)

  // 获取结束节点的文本内容
  const endContainer = range.endContainer
  const endText = endContainer.textContent || ''
  const endOffset = range.endOffset

  // 提取后置上下文
  const suffix = endText.substring(endOffset, endOffset + 32)

  return {
    exact,
    prefix,
    suffix
  }
}

/**
 * 滚动到指定标注位置
 *
 * @remarks
 * 用于侧边栏点击定位功能
 *
 * @param id - 标注ID
 */
export function scrollToAnnotation(id: string): void {
  const element = document.querySelector(`[data-gogo-id="${id}"]`)

  if (!element) {
    console.warn(`[GOGO] 未找到标注: ${id}`)
    return
  }

  // 平滑滚动到元素
  element.scrollIntoView({
    behavior: 'smooth',
    block: 'center'
  })

  // 添加闪烁效果
  element.classList.add('gogo-highlight-flash')
  setTimeout(() => {
    element.classList.remove('gogo-highlight-flash')
  }, 1000)
}
