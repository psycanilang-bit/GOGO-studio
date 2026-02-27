/**
 * HTML 智能清洗工具
 * 用于 Hunter 模式采集元素时清洗压缩 HTML
 *
 * @remarks
 * 实现 3 层过滤逻辑，防止 Token 爆炸：
 * 1. 第一层：去噪（移除无用标签和大体积属性）
 * 2. 第二层：文本截断（长文本截取首尾）
 * 3. 第三层：结构熔断（HTML 超长时触发骨架模式）
 */

import type { StructureState } from '~types'

/**
 * 清洗结果
 */
export interface CleanResult {
  /** 清洗后的 HTML 字符串 */
  html: string
  /** 结构完整度状态 */
  structureState: StructureState
}

/**
 * 清洗配置
 */
const CONFIG = {
  /** Base64 数据最大长度（超过则替换为占位符） */
  MAX_BASE64_LENGTH: 50,
  /** 文本最大长度（超过则截断） */
  MAX_TEXT_LENGTH: 100,
  /** HTML 最大长度（超过则触发结构熔断） */
  MAX_HTML_LENGTH: 2000,
  /** 无用标签列表 */
  NOISE_TAGS: ['SCRIPT', 'STYLE', 'SVG', 'NOSCRIPT']
}

/**
 * 智能清洗 HTML
 *
 * @param element - 要清洗的 DOM 元素
 * @returns 清洗结果（HTML + 状态）
 */
export function cleanHTML(element: HTMLElement): CleanResult {
  // 克隆元素，避免修改原始 DOM
  const cloned = element.cloneNode(true) as HTMLElement

  // 第一层：去噪
  removeNoise(cloned)

  // 第二层：文本截断
  truncateText(cloned)

  // 获取初步 HTML
  let html = cloned.outerHTML

  // 第三层：结构熔断
  if (html.length > CONFIG.MAX_HTML_LENGTH) {
    console.log(
      `[HTMLCleaner] HTML 超长 (${html.length} 字符)，触发结构熔断`
    )
    html = createSkeleton(cloned)
    return { html, structureState: 'truncated' }
  }

  console.log(`[HTMLCleaner] 清洗完成，HTML 长度: ${html.length} 字符`)
  return { html, structureState: 'full' }
}

/**
 * 第一层：去噪（Noise Removal）
 *
 * @remarks
 * - 移除无用标签：<script>, <style>, <svg>, <noscript>
 * - 移除大体积 Base64 数据
 */
function removeNoise(element: HTMLElement): void {
  // 移除无用标签
  CONFIG.NOISE_TAGS.forEach((tagName) => {
    const elements = element.querySelectorAll(tagName)
    elements.forEach((el) => el.remove())
  })

  // 移除大体积 Base64 数据
  const allElements = element.querySelectorAll('*')
  allElements.forEach((el) => {
    // 检查 src 属性
    const src = el.getAttribute('src')
    if (src && src.startsWith('data:') && src.length > CONFIG.MAX_BASE64_LENGTH) {
      el.setAttribute('src', '[BASE64_DATA]')
    }

    // 检查 style 属性中的 Base64
    const style = el.getAttribute('style')
    if (style && style.includes('data:') && style.length > CONFIG.MAX_BASE64_LENGTH) {
      el.setAttribute('style', '[BASE64_DATA]')
    }
  })

  console.log('[HTMLCleaner] 去噪完成')
}

/**
 * 第二层：文本截断（Text Truncation）
 *
 * @remarks
 * 对于长文本标签（如 <p>, <div>），若纯文本长度 > 100 字符，
 * 截取首尾，中间用 "...[省略]..." 代替
 */
function truncateText(element: HTMLElement): void {
  const textContainers = element.querySelectorAll('p, div, span, td, th, li')

  textContainers.forEach((el) => {
    // 只处理直接包含文本的元素（不包含子元素）
    if (el.children.length === 0) {
      const text = el.textContent || ''
      if (text.length > CONFIG.MAX_TEXT_LENGTH) {
        const head = text.substring(0, 40)
        const tail = text.substring(text.length - 40)
        el.textContent = `${head}...[省略]...${tail}`
      }
    }
  })

  console.log('[HTMLCleaner] 文本截断完成')
}

/**
 * 第三层：结构熔断（Structural Fuse）
 *
 * @remarks
 * 当 HTML 超过最大长度限制时，生成"骨架模式"：
 * - 保留最外层父元素
 * - 保留第一层子元素的标签名和类名
 * - 清空子元素内容，插入注释
 */
function createSkeleton(element: HTMLElement): string {
  const tagName = element.tagName.toLowerCase()
  const id = element.id ? ` id="${element.id}"` : ''
  const className = element.className ? ` class="${element.className}"` : ''

  // 构建骨架结构
  let skeleton = `<${tagName}${id}${className}>\n`

  // 遍历第一层子元素
  const children = Array.from(element.children)
  if (children.length > 0) {
    children.forEach((child) => {
      const childTag = child.tagName.toLowerCase()
      const childId = child.id ? ` id="${child.id}"` : ''
      const childClass = child.className ? ` class="${child.className}"` : ''

      skeleton += `  <${childTag}${childId}${childClass}><!-- 内容过长已省略 --></${childTag}>\n`
    })
  } else {
    skeleton += '  <!-- 内容过长已省略 -->\n'
  }

  skeleton += `</${tagName}>`

  console.log('[HTMLCleaner] 结构熔断完成，生成骨架模式')
  return skeleton
}
