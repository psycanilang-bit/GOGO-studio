/**
 * XPath 生成与元素定位工具
 * 用于标注的持久化和恢复
 */

/**
 * 生成元素的绝对XPath路径
 *
 * @remarks
 * 算法：从目标节点向上遍历到根节点，记录每层的标签名和位置索引
 * 格式示例：/html[1]/body[1]/div[2]/p[3]/span[1]
 *
 * @performance
 * - 时间复杂度：O(depth) - depth为DOM树深度
 * - 典型耗时：< 1ms (深度20层以内)
 *
 * @param node - 目标DOM节点（支持元素节点和文本节点）
 * @returns XPath字符串，失败返回空字符串
 */
export function generateXPath(node: Node): string {
  // 如果是文本节点，使用其父元素
  let current: Node | null = node
  if (current.nodeType === Node.TEXT_NODE) {
    console.log('[XPath] 检测到文本节点，使用其父元素')
    current = current.parentElement
  }

  // 验证节点是否为元素节点
  if (!current || current.nodeType !== Node.ELEMENT_NODE) {
    console.warn('[XPath] 节点不是有效的元素节点，无法生成 XPath')
    return ''
  }

  const path: string[] = []

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    const element = current as Element
    const parent = element.parentElement

    if (!parent) break

    // 计算当前元素在父元素中的位置（1-based index）
    const siblings = Array.from(parent.children)
    const index = siblings.indexOf(element) + 1
    const tagName = element.tagName.toLowerCase()

    path.unshift(`${tagName}[${index}]`)
    current = parent
  }

  const xpath = path.length > 0 ? '/' + path.join('/') : ''
  console.log('[XPath] 生成的 XPath:', xpath)
  return xpath
}

/**
 * 根据XPath定位DOM节点
 *
 * @remarks
 * 使用原生document.evaluate API进行高效查询
 *
 * @performance
 * - 时间复杂度：O(depth)
 * - 典型耗时：< 2ms
 *
 * @param xpath - XPath字符串
 * @returns 匹配的节点，未找到返回null
 */
export function locateByXPath(xpath: string): Node | null {
  if (!xpath) return null

  try {
    const result = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    )
    return result.singleNodeValue
  } catch (e) {
    console.error('[XPath] 定位失败:', e)
    return null
  }
}
