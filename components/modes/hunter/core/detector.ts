/**
 * DOM Hunter 元素检测核心算法
 * 实现高性能碰撞检测
 */

import type { SelectionRect } from '~types'
import { measurePerformance } from '~utils/performance'

/**
 * 检测选框内的核心元素
 *
 * @remarks
 * 算法：中心点定位法（O(1) 复杂度）
 * 1. 计算选框几何中心
 * 2. 使用 elementFromPoint 获取中心元素
 * 3. 验证元素边界在选框内
 *
 * @performance 目标 < 2ms
 *
 * @param rect - 选框坐标
 * @returns 匹配的元素，未找到返回null
 */
/**
 * 检测选框内的核心元素
 *
 * @remarks
 * 算法：中心点定位法（O(1) 复杂度）
 * 1. 计算选框几何中心
 * 2. 使用 elementFromPoint 获取中心元素
 * 3. 验证元素边界在选框内（放宽容差到 50px）
 *
 * @performance 目标 < 2ms
 *
 * @param rect - 选框坐标
 * @returns 匹配的元素，未找到返回null
 */
export function detectElementAtPoint(rect: SelectionRect): HTMLElement | null {
  return measurePerformance(
    () => {
      // 1. 计算中心点
      const centerX = (rect.startX + rect.endX) / 2
      const centerY = (rect.startY + rect.endY) / 2

      console.log('[Detector] 检测中心点:', { centerX, centerY })

      // 2. 获取中心元素
      const element = document.elementFromPoint(centerX, centerY) as HTMLElement
      if (!element) {
        console.warn('[Detector] elementFromPoint 返回 null')
        return null
      }

      console.log('[Detector] elementFromPoint 找到元素:', element.tagName, element.className)

      // 过滤扩展自身元素
      if (
        element.closest('#gogo-console-root') ||
        element.closest('#gogo-hunter-root') ||
        element.closest('.hunter-canvas') ||
        element.closest('.hunter-edit-panel')
      ) {
        console.warn('[Detector] 检测到扩展自身元素，过滤')
        return null
      }

      // 3. 边界验证（放宽容差到 50px）
      const bounds = element.getBoundingClientRect()
      const minX = Math.min(rect.startX, rect.endX)
      const maxX = Math.max(rect.startX, rect.endX)
      const minY = Math.min(rect.startY, rect.endY)
      const maxY = Math.max(rect.startY, rect.endY)

      const tolerance = 50 // 容差从 10px 增加到 50px

      const isInside =
        bounds.left >= minX - tolerance &&
        bounds.right <= maxX + tolerance &&
        bounds.top >= minY - tolerance &&
        bounds.bottom <= maxY + tolerance

      console.log('[Detector] 边界验证:', {
        bounds: {
          left: bounds.left,
          right: bounds.right,
          top: bounds.top,
          bottom: bounds.bottom
        },
        selection: { minX, maxX, minY, maxY },
        tolerance,
        isInside
      })

      if (!isInside) {
        console.warn('[Detector] 元素边界不在选框内，返回 null')
        return null
      }

      return element
    },
    'Hunter碰撞检测',
    2 // 2ms性能预算
  )
}

/**
 * 高亮选中的元素
 *
 * @param element - 目标元素
 */
export function highlightElement(element: HTMLElement): void {
  element.style.outline = '2px solid #4A90E2'
  element.style.outlineOffset = '2px'
}

/**
 * 移除元素高亮
 *
 * @param element - 目标元素
 */
export function removeElementHighlight(element: HTMLElement): void {
  element.style.outline = ''
  element.style.outlineOffset = ''
}

/**
 * 检测矩形框内的所有元素（v1.3 新增）
 *
 * @remarks
 * 用于拖拽框选模式，找到所有在框选范围内的元素
 *
 * 算法：
 * 1. 遍历 DOM 树中的所有可见元素
 * 2. 判断元素的 bounding box 是否在选框内
 * 3. 过滤插件自身元素
 *
 * @param rect - 选框坐标
 * @returns 元素数组
 */
export function findElementsInRect(rect: SelectionRect): HTMLElement[] {
  console.log('[Detector] 开始查找框内所有元素')

  const elements: HTMLElement[] = []
  const minX = Math.min(rect.startX, rect.endX)
  const maxX = Math.max(rect.startX, rect.endX)
  const minY = Math.min(rect.startY, rect.endY)
  const maxY = Math.max(rect.startY, rect.endY)

  const selectionWidth = maxX - minX
  const selectionHeight = maxY - minY
  const selectionArea = selectionWidth * selectionHeight

  console.log('[Detector] 选框范围:', { minX, maxX, minY, maxY })
  console.log('[Detector] 选框尺寸:', { width: selectionWidth, height: selectionHeight, area: selectionArea })

  // 遍历所有元素（性能优化：只遍历可见元素）
  const allElements = document.querySelectorAll('*')
  let filteredBySize = 0
  let filteredByOverlap = 0

  allElements.forEach((el) => {
    const htmlEl = el as HTMLElement

    // 过滤不可见元素
    const style = window.getComputedStyle(htmlEl)
    if (style.display === 'none' || style.visibility === 'hidden') {
      return
    }

    // 过滤插件自身元素
    if (
      htmlEl.closest('#gogo-console-root') ||
      htmlEl.closest('.floating-console') ||
      htmlEl.closest('.hunter-canvas') ||
      htmlEl.closest('.hunter-edit-panel') ||
      htmlEl.closest('.hunter-hover-preview') ||
      htmlEl.closest('.hunter-highlight-overlay') ||
      htmlEl.closest('.record-overlay') ||
      htmlEl.closest('.record-badge')
    ) {
      return
    }

    // 过滤根元素
    if (htmlEl === document.body || htmlEl === document.documentElement) {
      return
    }

    // 获取元素边界
    const bounds = htmlEl.getBoundingClientRect()

    // 判断元素是否完全在选框内（严格模式）
    const isFullyInside =
      bounds.left >= minX &&
      bounds.right <= maxX &&
      bounds.top >= minY &&
      bounds.bottom <= maxY

    // 判断元素是否部分在选框内（宽松模式）
    const isPartiallyInside =
      bounds.right >= minX &&
      bounds.left <= maxX &&
      bounds.bottom >= minY &&
      bounds.top <= maxY

    // 【关键修复】计算元素与选框的交集面积比例
    const intersectLeft = Math.max(bounds.left, minX)
    const intersectRight = Math.min(bounds.right, maxX)
    const intersectTop = Math.max(bounds.top, minY)
    const intersectBottom = Math.min(bounds.bottom, maxY)

    const intersectWidth = Math.max(0, intersectRight - intersectLeft)
    const intersectHeight = Math.max(0, intersectBottom - intersectTop)
    const intersectArea = intersectWidth * intersectHeight

    const elementArea = bounds.width * bounds.height
    const overlapRatio = elementArea > 0 ? intersectArea / elementArea : 0

    // 【新策略】元素必须满足以下条件之一：
    // 1. 完全在选框内
    // 2. 至少 50% 的面积在选框内
    // 3. 元素面积不能超过选框面积的 3 倍（过滤掉大容器）
    const isReasonableSize = elementArea <= selectionArea * 3
    const hasSignificantOverlap = overlapRatio >= 0.5

    if (
      bounds.width > 5 &&
      bounds.height > 5 &&
      isPartiallyInside &&
      isReasonableSize &&
      (isFullyInside || hasSignificantOverlap)
    ) {
      elements.push(htmlEl)
    } else if (isPartiallyInside) {
      // 记录被过滤的原因
      if (!isReasonableSize) {
        filteredBySize++
      } else if (!isFullyInside && !hasSignificantOverlap) {
        filteredByOverlap++
      }
    }
  })

  console.log('[Detector] 过滤统计:', {
    filteredBySize,
    filteredByOverlap
  })
  console.log('[Detector] ✅ 找到', elements.length, '个元素')

  // 调试：打印前 5 个元素的信息
  console.log('[Detector] 前 5 个元素:', elements.slice(0, 5).map(el => ({
    tag: el.tagName,
    className: el.className,
    bounds: {
      width: el.getBoundingClientRect().width.toFixed(0),
      height: el.getBoundingClientRect().height.toFixed(0)
    }
  })))

  // 按照 DOM 树深度排序，优先选择叶子节点
  elements.sort((a, b) => {
    const depthA = getDepth(a)
    const depthB = getDepth(b)
    return depthB - depthA // 深度大的在前（叶子节点）
  })

  return elements
}

/**
 * 判断元素是否为“有效”可标注元素（文本、图片或交互元素）
 *
 * @remarks
 * 用于空选处理：若框选区域内不包含任何有效元素，释放后取消框选。
 */
export function isMeaningfulElement(el: HTMLElement): boolean {
  const tag = el.tagName.toLowerCase()
  if (tag === 'img' || tag === 'svg' || tag === 'canvas') return true
  if (['a', 'button', 'input', 'select', 'textarea'].includes(tag)) return true
  const text = (el.textContent || '').trim()
  if (text.length > 0) return true
  return false
}

/**
 * 获取元素在 DOM 树中的深度
 */
function getDepth(element: HTMLElement): number {
  let depth = 0
  let current: HTMLElement | null = element
  while (current && current !== document.body) {
    depth++
    current = current.parentElement
  }
  return depth
}

/**
 * 检测鼠标位置的元素（v1.3 新增）
 *
 * @remarks
 * 用于鼠标悬停预览功能
 * 使用 elementsFromPoint 获取最底层、最具体的元素
 *
 * @param x - 鼠标 X 坐标
 * @param y - 鼠标 Y 坐标
 * @returns 元素，未找到返回 null
 */
export function detectElementAtPosition(x: number, y: number): HTMLElement | null {
  // 使用 elementsFromPoint 获取坐标上的所有元素（从顶层到底层）
  const allElements = document.elementsFromPoint(x, y) as HTMLElement[]

  console.log('[Detector] elementsFromPoint 返回元素数量:', allElements.length)
  console.log('[Detector] 前 5 个元素:', allElements.slice(0, 5).map(el => el.tagName))

  // 遍历，找到第一个有效的元素
  for (const element of allElements) {
    // 过滤插件自身元素
    if (
      element.closest('#gogo-console-root') ||
      element.closest('.floating-console') ||
      element.closest('.hunter-canvas') ||
      element.closest('.hunter-edit-panel') ||
      element.closest('.hunter-hover-preview') ||
      element.closest('.hunter-highlight-overlay') ||
      element.closest('.record-overlay') ||
      element.closest('.record-badge')
    ) {
      console.log('[Detector] 过滤插件元素:', element.tagName)
      continue
    }

    // 过滤 Plasmo Shadow Host（PLASMO-CSUI）
    if (element.tagName === 'PLASMO-CSUI' || element.tagName.startsWith('PLASMO-')) {
      console.log('[Detector] 过滤 Plasmo 元素:', element.tagName)
      continue
    }

    // 过滤根元素
    if (element === document.body || element === document.documentElement) {
      console.log('[Detector] 过滤根元素:', element.tagName)
      continue
    }

    // 找到第一个有效元素，返回（最底层、最具体的元素）
    console.log('[Detector] ✅ 找到有效元素:', element.tagName, element.className)
    return element
  }

  console.warn('[Detector] ⚠️ 未找到有效元素')
  return null
}
