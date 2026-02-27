/**
 * DOM 树祖先算法
 * 用于计算多个元素的最小公共祖先容器
 */

/**
 * 查找多个元素的最小公共祖先
 *
 * @remarks
 * 算法：
 * 1. 获取第一个元素的所有祖先路径
 * 2. 从最近的祖先开始，检查是否包含所有元素
 * 3. 返回第一个包含所有元素的祖先
 *
 * @param elements - 元素数组
 * @returns 最小公共祖先元素
 */
export function findCommonAncestor(elements: HTMLElement[]): HTMLElement {
  console.log('[Ancestor] 开始查找公共祖先，元素数量:', elements.length)

  // 边界情况
  if (elements.length === 0) {
    console.warn('[Ancestor] 元素数组为空，返回 body')
    return document.body
  }

  if (elements.length === 1) {
    console.log('[Ancestor] 只有一个元素，返回自身')
    return elements[0]
  }

  // 获取第一个元素的所有祖先（从近到远）
  const ancestors: HTMLElement[] = []
  let current: HTMLElement | null = elements[0]

  while (current && current !== document.documentElement) {
    ancestors.push(current)
    current = current.parentElement
  }

  console.log('[Ancestor] 第一个元素的祖先链长度:', ancestors.length)

  // 从最近的祖先开始查找
  for (let i = 0; i < ancestors.length; i++) {
    const ancestor = ancestors[i]

    // 检查是否所有元素都在这个祖先内
    const containsAll = elements.every((el) => ancestor.contains(el))

    if (containsAll) {
      console.log('[Ancestor] ✅ 找到公共祖先:', ancestor.tagName, ancestor.className)
      console.log('[Ancestor] 祖先深度:', i + 1)
      return ancestor
    }
  }

  // 如果没找到，返回 body（理论上不应该发生）
  console.warn('[Ancestor] ⚠️ 未找到公共祖先，返回 body')
  return document.body
}

/**
 * 计算元素在 DOM 树中的深度
 *
 * @param element - 目标元素
 * @returns 深度（body = 0）
 */
export function getElementDepth(element: HTMLElement): number {
  let depth = 0
  let current: HTMLElement | null = element

  while (current && current !== document.body) {
    depth++
    current = current.parentElement
  }

  return depth
}

/**
 * 检查公共祖先是否合理
 *
 * @remarks
 * 判断标准：
 * - 如果祖先是 body 或 html，视为不合理（选区太分散）
 * - 如果深度 < 3，视为不合理（太接近根元素）
 * - 如果深度 > 10，视为不合理（选区太深）
 * - 如果祖先尺寸过大（超过视口 80%），视为不合理
 *
 * @param ancestor - 公共祖先元素
 * @returns 是否合理
 */
export function isReasonableAncestor(ancestor: HTMLElement): boolean {
  // 检查是否为根元素
  if (
    ancestor === document.body ||
    ancestor === document.documentElement ||
    ancestor.tagName === 'BODY' ||
    ancestor.tagName === 'HTML'
  ) {
    console.warn('[Ancestor] ⚠️ 公共祖先是根元素，不合理')
    return false
  }

  // 检查深度
  const depth = getElementDepth(ancestor)
  if (depth < 3) {
    console.warn('[Ancestor] ⚠️ 公共祖先深度过小（太接近根元素）:', depth)
    return false
  }

  if (depth > 10) {
    console.warn('[Ancestor] ⚠️ 公共祖先深度过大:', depth)
    return false
  }

  // 检查尺寸是否过大（过滤掉页面级容器）
  const bounds = ancestor.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const widthRatio = bounds.width / viewportWidth
  const heightRatio = bounds.height / viewportHeight

  if (widthRatio > 0.8 || heightRatio > 0.8) {
    console.warn('[Ancestor] ⚠️ 公共祖先尺寸过大:', {
      width: bounds.width,
      height: bounds.height,
      widthRatio: widthRatio.toFixed(2),
      heightRatio: heightRatio.toFixed(2)
    })
    return false
  }

  console.log('[Ancestor] ✅ 公共祖先合理，深度:', depth, '尺寸:', {
    width: bounds.width,
    height: bounds.height
  })
  return true
}

/**
 * 框选嵌套逻辑：仅保留最外层元素
 *
 * @remarks
 * 若框选范围同时包含父容器及其内部所有子元素，默认仅锁定最外层容器。
 * 返回的列表中，任意元素不被列表中其他元素包含。
 *
 * @param elements - 框选得到的元素数组
 * @returns 最外层元素数组（无包含关系）
 */
export function getOutermostElements(elements: HTMLElement[]): HTMLElement[] {
  if (elements.length <= 1) return elements

  return elements.filter((el) => {
    const isContainedByOther = elements.some(
      (other) => other !== el && other.contains(el)
    )
    return !isContainedByOther
  })
}

/**
 * 获取公共祖先的摘要信息
 *
 * @param ancestor - 公共祖先元素
 * @param childCount - 包含的子元素数量
 * @returns 摘要信息字符串
 */
export function getAncestorSummary(
  ancestor: HTMLElement,
  childCount: number
): string {
  const tagName = ancestor.tagName.toLowerCase()
  const id = ancestor.id ? `#${ancestor.id}` : ''
  const className = ancestor.className
    ? `.${ancestor.className.split(' ').join('.')}`
    : ''
  const depth = getElementDepth(ancestor)

  return `${tagName}${id}${className} (深度: ${depth}, 包含: ${childCount} 个元素)`
}
