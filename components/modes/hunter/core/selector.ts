/**
 * CSS选择器生成工具
 * 优先级：ID > 唯一Class > nth-child路径
 */

import { generateXPath } from '~utils/xpath'
import type { ElementInfo } from '~types'

/**
 * 生成元素的唯一CSS选择器
 *
 * @remarks
 * 策略：
 * 1. 优先使用ID（如果存在）
 * 2. 查找唯一class
 * 3. 生成nth-child完整路径
 *
 * @param element - 目标元素
 * @returns CSS选择器字符串
 */
export function generateSelector(element: HTMLElement): string {
  // 1. 优先使用 ID
  if (element.id) {
    return `#${CSS.escape(element.id)}`
  }

  // 2. 查找唯一 class
  const classes = Array.from(element.classList)
  for (const cls of classes) {
    const selector = `.${CSS.escape(cls)}`
    if (document.querySelectorAll(selector).length === 1) {
      return selector
    }
  }

  // 3. 生成 nth-child 路径
  const path: string[] = []
  let current: HTMLElement | null = element

  while (current && current !== document.body) {
    const parent = current.parentElement
    if (!parent) break

    const siblings = Array.from(parent.children)
    const index = siblings.indexOf(current) + 1
    const tagName = current.tagName.toLowerCase()

    path.unshift(`${tagName}:nth-child(${index})`)
    current = parent
  }

  return path.join(' > ')
}

/**
 * 提取元素完整信息
 *
 * @param element - 目标元素
 * @returns 元素信息对象
 */
export function extractElementInfo(element: HTMLElement): ElementInfo {
  return {
    tagName: element.tagName.toLowerCase(),
    id: element.id || undefined,
    classes: Array.from(element.classList),
    selector: generateSelector(element),
    xpath: generateXPath(element)
  }
}

/**
 * 验证选择器有效性
 *
 * @param selector - CSS选择器
 * @returns 是否有效
 */
export function validateSelector(selector: string): boolean {
  try {
    document.querySelector(selector)
    return true
  } catch (e) {
    console.error('[Hunter] 无效选择器:', selector, e)
    return false
  }
}
