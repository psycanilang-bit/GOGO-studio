/**
 * GOGO 文本高亮核心逻辑
 * 负责文本选择、Range处理、高亮标记创建
 */

/**
 * 捕获当前文本选择Range
 *
 * @remarks
 * - 获取用户选中的文本范围
 * - 空选择返回null
 *
 * @performance < 5ms
 *
 * @returns Range对象，无选择时返回null
 */
export function captureTextSelection(): Range | null {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return null

  const range = selection.getRangeAt(0)

  // 检查是否为空选择（collapsed range）
  if (range.collapsed) return null

  return range
}

/**
 * 创建高亮标记（拆分方案 - 不破坏 DOM 结构）
 *
 * @remarks
 * - 使用 <mark> 标签包裹 Range 内的文本
 * - 将跨元素的选择拆分成多个小 mark，避免破坏原有 DOM 层级
 * - 所有拆分的 mark 共享同一个 data-gogo-id，逻辑上是一个标注
 * - 添加对应的 CSS 类名
 *
 * @algorithm
 * 1. 生成唯一 ID（或使用传入的 ID）
 * 2. 获取 Range 内的所有文本节点及其偏移范围
 * 3. 为每个文本节点片段创建独立的 <mark> 元素
 * 4. 所有 mark 使用相同的 data-gogo-id
 *
 * @example
 * // 原始 DOM：<p>文本A<span>文本B</span>文本C</p>
 * // 选择："文本A文本B文本C"
 * // 结果：<p><mark id="123">文本A</mark><span><mark id="123">文本B</mark></span><mark id="123">文本C</mark></p>
 * // DOM 层级保持：p > mark, p > span > mark（而不是 p > mark > span）
 *
 * @param range - 文本选择 Range
 * @param type - 标注类型（agree/question）
 * @param customId - 可选的自定义 ID（用于恢复时保持原有 ID）
 * @returns 创建的第一个 mark 元素（用于获取 ID）
 */
export function highlightRange(
  range: Range,
  type: 'agree' | 'question',
  customId?: string
): HTMLElement {
  console.log('[Highlighter] 开始创建高亮标记（拆分方案）, 类型:', type)
  const id = customId || crypto.randomUUID()

  console.log('[Highlighter] 标注 ID:', id, customId ? '(恢复)' : '(新建)')
  console.log('[Highlighter] 选择的文本:', range.toString())

  // 获取 Range 内的所有文本节点及其相交范围
  const textNodeRanges = getTextNodesInRange(range)

  console.log(`[Highlighter] 找到 ${textNodeRanges.length} 个文本节点片段`)

  if (textNodeRanges.length === 0) {
    console.error('[Highlighter] ❌ 未找到文本节点，创建失败')
    // 降级到旧方案
    return highlightRangeLegacy(range, type, id)
  }

  // 为每个文本节点片段创建独立的 mark
  textNodeRanges.forEach(({ node, startOffset, endOffset }, index) => {
    try {
      const nodeRange = document.createRange()
      nodeRange.setStart(node, startOffset)
      nodeRange.setEnd(node, endOffset)

      const mark = document.createElement('mark')
      mark.className = `gogo-highlight-${type}`
      mark.dataset.gogoId = id // 所有 mark 共享同一个 ID

      nodeRange.surroundContents(mark)

      console.log(`[Highlighter] ✅ [${index + 1}/${textNodeRanges.length}] 创建 mark:`, {
        text: mark.textContent?.substring(0, 20),
        parent: mark.parentElement?.tagName
      })
    } catch (e) {
      console.error(`[Highlighter] ❌ [${index + 1}/${textNodeRanges.length}] 创建 mark 失败:`, e)
    }
  })

  // 返回第一个创建的 mark 元素
  const firstMark = document.querySelector(`[data-gogo-id="${id}"]`) as HTMLElement

  if (!firstMark) {
    console.error('[Highlighter] ❌ 未能创建任何 mark 元素')
  } else {
    console.log('[Highlighter] ✅ 高亮标记创建完成，共', textNodeRanges.length, '个片段')
  }

  return firstMark
}

/**
 * 获取 Range 内的所有文本节点及其相交范围
 *
 * @param range - 选择的 Range
 * @returns 文本节点数组，包含节点和在该节点内的起始/结束偏移
 */
function getTextNodesInRange(range: Range): Array<{
  node: Text
  startOffset: number
  endOffset: number
}> {
  const textNodes: Array<{
    node: Text
    startOffset: number
    endOffset: number
  }> = []

  // 使用 TreeWalker 遍历 Range 共同祖先下的所有文本节点
  const walker = document.createTreeWalker(
    range.commonAncestorContainer,
    NodeFilter.SHOW_TEXT,
    null
  )

  let currentNode: Node | null
  while ((currentNode = walker.nextNode())) {
    const textNode = currentNode as Text

    // 检查文本节点是否与 Range 相交
    if (!range.intersectsNode(textNode)) {
      continue
    }

    // 计算在当前文本节点内的起始和结束偏移
    let startOffset = 0
    let endOffset = textNode.length

    // 如果是 Range 的起始节点
    if (textNode === range.startContainer) {
      startOffset = range.startOffset
    }

    // 如果是 Range 的结束节点
    if (textNode === range.endContainer) {
      endOffset = range.endOffset
    }

    // 过滤空文本节点
    if (startOffset < endOffset) {
      textNodes.push({ node: textNode, startOffset, endOffset })
    }
  }

  return textNodes
}

/**
 * 降级方案：使用旧的 extractContents 方式
 * 仅在拆分方案失败时使用
 */
function highlightRangeLegacy(
  range: Range,
  type: 'agree' | 'question',
  id: string
): HTMLElement {
  console.warn('[Highlighter] 使用降级方案（可能破坏布局）')

  const mark = document.createElement('mark')
  mark.className = `gogo-highlight-${type}`
  mark.dataset.gogoId = id

  try {
    range.surroundContents(mark)
    console.log('[Highlighter] ✅ 降级方案: surroundContents 成功')
  } catch (e) {
    const fragment = range.extractContents()
    mark.appendChild(fragment)
    range.insertNode(mark)
    console.log('[Highlighter] ✅ 降级方案: extractContents 成功')
  }

  return mark
}

/**
 * 移除单个高亮标记（支持多片段）
 *
 * @remarks
 * - 由于拆分方案，一个标注 ID 可能对应多个 mark 元素
 * - 此函数会删除所有相同 ID 的 mark 片段
 *
 * @param id - 标注ID（data-gogo-id属性值）
 */
export function removeHighlight(id: string): void {
  console.log('[Highlighter] 移除高亮:', id)

  // 查找所有相同 ID 的 mark 元素（可能有多个片段）
  const elements = document.querySelectorAll(`[data-gogo-id="${id}"]`)

  if (elements.length === 0) {
    console.warn('[Highlighter] 未找到高亮元素:', id)
    return
  }

  console.log(`[Highlighter] 找到 ${elements.length} 个 mark 片段，开始移除`)

  // 删除所有片段
  elements.forEach((element, index) => {
    if (!element.parentNode) {
      console.warn(`[Highlighter] 片段 ${index + 1} 没有父节点，跳过`)
      return
    }

    // 用文本节点替换 mark 元素
    const textNode = document.createTextNode(element.textContent || '')
    element.parentNode.replaceChild(textNode, element)

    console.log(`[Highlighter] ✅ 已移除片段 ${index + 1}/${elements.length}`)
  })

  // 合并相邻文本节点（清理 DOM）
  document.body.normalize()

  console.log('[Highlighter] ✅ 已移除所有片段:', id)
}

/**
 * 清空页面所有GOGO高亮
 *
 * @remarks
 * 用于模式切换时清理或侧边栏"清空全部"操作
 */
export function clearAllHighlights(): void {
  console.log('[Highlighter] 开始清除所有高亮')
  const highlights = document.querySelectorAll('[data-gogo-id]')
  console.log('[Highlighter] 找到', highlights.length, '个高亮标记')

  highlights.forEach((el) => {
    if (el.parentNode) {
      const textNode = document.createTextNode(el.textContent || '')
      el.parentNode.replaceChild(textNode, el)
    }
  })

  // 合并文本节点
  document.body.normalize()

  console.log('[Highlighter] ✅ 已清除所有高亮')
}

/**
 * 恢复页面高亮（从持久化数据）
 *
 * @remarks
 * 页面加载时调用，根据XPath和TextQuote恢复高亮
 *
 * @param id - 标注ID
 * @param xpath - XPath路径
 * @param textQuote - 文本引用选择器
 * @param type - 标注类型
 * @returns 是否成功恢复
 */
export function restoreHighlight(
  id: string,
  xpath: string,
  textQuote: { exact: string; prefix: string; suffix: string },
  type: 'agree' | 'question'
): boolean {
  console.log('[Highlighter] 开始恢复高亮, ID:', id, 'Type:', type)
  console.log('[Highlighter] XPath:', xpath)
  console.log('[Highlighter] TextQuote:', textQuote)

  // 检查是否已经存在这个 ID 的高亮
  const existingMark = document.querySelector(`mark[data-gogo-id="${id}"]`)
  if (existingMark) {
    console.log('[Highlighter] ⏭️  高亮已存在，跳过重复恢复, ID:', id)
    return true
  }

  try {
    // 尝试XPath定位
    const result = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    )

    const node = result.singleNodeValue
    if (!node) {
      console.warn('[Highlighter] ⚠️ XPath定位失败，尝试TextQuote匹配')
      return restoreByTextQuote(id, textQuote, type)
    }

    console.log('[Highlighter] ✓ XPath定位成功, 节点:', node)

    // 在节点中查找匹配文本
    const textContent = node.textContent || ''
    const index = textContent.indexOf(textQuote.exact)

    console.log('[Highlighter] 节点文本长度:', textContent.length)
    console.log('[Highlighter] 查找文本:', textQuote.exact.substring(0, 50))
    console.log('[Highlighter] 查找结果index:', index)

    if (index === -1) {
      console.warn('[Highlighter] ⚠️ 文本内容不匹配，尝试TextQuote匹配')
      return restoreByTextQuote(id, textQuote, type)
    }

    // 创建完整的跨节点 Range
    const range = document.createRange()

    // 找到起始文本节点和偏移
    const startInfo = findTextNodeAtOffset(node, index)
    if (!startInfo) {
      console.error('[Highlighter] ❌ 找不到起始文本节点')
      return false
    }

    // 找到结束文本节点和偏移
    const endInfo = findTextNodeAtOffset(node, index + textQuote.exact.length)
    if (!endInfo) {
      console.error('[Highlighter] ❌ 找不到结束文本节点')
      return false
    }

    console.log('[Highlighter] ✓ 找到起始节点:', startInfo)
    console.log('[Highlighter] ✓ 找到结束节点:', endInfo)

    // 设置跨节点的完整 Range
    range.setStart(startInfo.node, startInfo.offset)
    range.setEnd(endInfo.node, endInfo.offset)

    console.log('[Highlighter] ✓ Range创建成功，文本:', range.toString())
    console.log('[Highlighter] ✓ Range 跨越节点:', range.startContainer === range.endContainer ? '单节点' : '多节点')

    const mark = highlightRange(range, type, id) // 传入原有 ID

    console.log('[Highlighter] ✅ 高亮恢复成功, mark元素:', mark)
    console.log('[Highlighter] mark已插入DOM, parentNode:', mark.parentNode)

    return true
  } catch (e) {
    console.error('[Highlighter] ❌ 恢复高亮异常:', e)
    return false
  }
}

/**
 * 使用TextQuote恢复高亮（备选方案）
 * 在 XPath 失败时使用
 */
function restoreByTextQuote(
  id: string,
  textQuote: { exact: string; prefix: string; suffix: string },
  type: 'agree' | 'question'
): boolean {
  console.log('[Highlighter] 尝试使用TextQuote匹配')

  const bodyText = document.body.textContent || ''

  // 构建搜索模式：前缀 + 精确文本 + 后缀
  const searchPattern = textQuote.prefix + textQuote.exact + textQuote.suffix
  const patternIndex = bodyText.indexOf(searchPattern)

  if (patternIndex === -1) {
    console.warn('[Highlighter] ❌ TextQuote 匹配失败：找不到完整模式')

    // 尝试只用精确文本匹配
    const exactIndex = bodyText.indexOf(textQuote.exact)
    if (exactIndex === -1) {
      console.warn('[Highlighter] ❌ 甚至找不到精确文本')
      return false
    }

    console.log('[Highlighter] ⚠️ 找到精确文本，但前后缀不匹配，尝试使用精确文本')
    return findAndHighlightText(textQuote.exact, id, type, exactIndex)
  }

  // 计算精确文本在 body 中的实际位置
  const textStartInBody = patternIndex + textQuote.prefix.length

  return findAndHighlightText(textQuote.exact, id, type, textStartInBody)
}

/**
 * 在 document.body 中查找并高亮指定位置的文本
 *
 * @remarks
 * 支持跨节点的文本高亮
 */
function findAndHighlightText(
  text: string,
  id: string,
  type: 'agree' | 'question',
  startOffset: number
): boolean {
  console.log('[Highlighter] 在 body 的偏移', startOffset, '处查找文本，长度:', text.length)

  try {
    const range = document.createRange()

    // 找到起始文本节点和偏移
    const startInfo = findTextNodeAtOffset(document.body, startOffset)
    if (!startInfo) {
      console.error('[Highlighter] ❌ 找不到起始文本节点')
      return false
    }

    // 找到结束文本节点和偏移
    const endInfo = findTextNodeAtOffset(document.body, startOffset + text.length)
    if (!endInfo) {
      console.error('[Highlighter] ❌ 找不到结束文本节点')
      return false
    }

    console.log('[Highlighter] ✓ 找到起始节点, 偏移:', startInfo.offset)
    console.log('[Highlighter] ✓ 找到结束节点, 偏移:', endInfo.offset)

    // 设置跨节点的完整 Range
    range.setStart(startInfo.node, startInfo.offset)
    range.setEnd(endInfo.node, endInfo.offset)

    console.log('[Highlighter] ✓ Range创建成功，文本:', range.toString().substring(0, 50))
    console.log('[Highlighter] ✓ Range 类型:', range.startContainer === range.endContainer ? '单节点' : '跨节点')

    const mark = highlightRange(range, type, id) // 传入自定义 ID

    if (mark) {
      console.log('[Highlighter] ✅ TextQuote 匹配成功并创建高亮')
      return true
    } else {
      console.error('[Highlighter] ❌ highlightRange 返回 null')
      return false
    }
  } catch (e) {
    console.error('[Highlighter] ❌ 创建高亮失败:', e)
    return false
  }
}

/**
 * 在节点树中查找指定偏移处的文本节点
 *
 * @param root - 根节点
 * @param targetOffset - 目标偏移（相对于根节点的文本内容）
 * @returns 文本节点和在该节点内的偏移，未找到返回 null
 */
interface TextNodePosition {
  node: Text
  offset: number
}

function findTextNodeAtOffset(
  root: Node,
  targetOffset: number
): TextNodePosition | null {
  let currentOffset = 0

  function traverse(node: Node): TextNodePosition | null {
    if (node.nodeType === Node.TEXT_NODE) {
      const textNode = node as Text
      const textLength = textNode.textContent?.length || 0

      // 检查目标偏移是否在当前文本节点内
      if (currentOffset <= targetOffset && targetOffset <= currentOffset + textLength) {
        return {
          node: textNode,
          offset: targetOffset - currentOffset
        }
      }

      currentOffset += textLength
    } else {
      // 递归遍历子节点
      for (const child of node.childNodes) {
        const result = traverse(child)
        if (result) return result
      }
    }

    return null
  }

  return traverse(root)
}

/**
 * 在节点树中查找文本节点及偏移（旧版本，保留用于兼容）
 * @deprecated 使用 findTextNodeAtOffset 替代
 */
interface TextNodeResult {
  node: Text
  offset: number
  length: number
}

function findTextNode(
  root: Node,
  startOffset: number,
  length: number
): TextNodeResult | null {
  let currentOffset = 0

  function traverse(node: Node): TextNodeResult | null {
    if (node.nodeType === Node.TEXT_NODE) {
      const textNode = node as Text
      const textLength = textNode.textContent?.length || 0

      if (
        currentOffset <= startOffset &&
        startOffset < currentOffset + textLength
      ) {
        return {
          node: textNode,
          offset: startOffset - currentOffset,
          length: Math.min(length, textLength - (startOffset - currentOffset))
        }
      }

      currentOffset += textLength
    } else {
      for (const child of node.childNodes) {
        const result = traverse(child)
        if (result) return result
      }
    }

    return null
  }

  return traverse(root)
}
