/**
 * 元素信息提取工具
 * 用于生成悬停预览的显示文本
 */

/**
 * 获取元素的显示文本（用于悬停预览）
 *
 * @remarks
 * 格式：标签名.类名: 文本内容
 * 例如：
 * - BUTTON: 保存
 * - A: 点击这里查看详情
 * - IMG: [图片] avatar.png
 * - DIV.card: 这是卡片内容...
 *
 * @param element - 目标元素
 * @returns 显示文本
 */
export function getElementDisplayText(element: HTMLElement): string {
  const tagName = element.tagName
  const id = element.id ? `#${element.id}` : ''
  const className = element.className
    ? `.${element.className.split(' ')[0]}`
    : ''

  // 基础标识：标签名 + id + 第一个类名
  const baseLabel = `${tagName}${id}${className}`

  // 获取元素的描述性文本
  const contentText = getElementContentText(element)

  // 组合：标签名 + 内容
  if (contentText) {
    return `${baseLabel}: ${contentText}`
  }

  return baseLabel
}

/**
 * 获取元素的内容文本
 *
 * @remarks
 * 根据元素类型，返回最合适的描述性文本：
 * - 文本元素：返回文本内容（截断到 30 字符）
 * - 图片：返回 [图片] + alt 或 src
 * - 输入框：返回 [输入框] + placeholder
 * - 空容器：返回 [空容器]
 *
 * @param element - 目标元素
 * @returns 内容文本
 */
function getElementContentText(element: HTMLElement): string {
  const tagName = element.tagName.toLowerCase()

  // 特殊元素处理
  switch (tagName) {
    case 'img': {
      const img = element as HTMLImageElement
      const alt = img.alt || extractFileName(img.src) || 'image'
      return `[图片] ${truncateText(alt, 20)}`
    }

    case 'input': {
      const input = element as HTMLInputElement
      const type = input.type || 'text'
      const placeholder = input.placeholder || input.value || ''

      const typeMap: Record<string, string> = {
        text: '[文本框]',
        password: '[密码框]',
        email: '[邮箱]',
        number: '[数字]',
        checkbox: '[复选框]',
        radio: '[单选框]',
        submit: '[提交按钮]',
        button: '[按钮]',
        search: '[搜索框]'
      }

      const typeLabel = typeMap[type] || `[${type}]`

      if (placeholder) {
        return `${typeLabel} ${truncateText(placeholder, 20)}`
      }

      return typeLabel
    }

    case 'textarea': {
      const textarea = element as HTMLTextAreaElement
      const placeholder = textarea.placeholder || textarea.value || ''
      return placeholder
        ? `[文本域] ${truncateText(placeholder, 20)}`
        : '[文本域]'
    }

    case 'select': {
      const select = element as HTMLSelectElement
      const selected = select.options[select.selectedIndex]?.text || ''
      return selected
        ? `[下拉框] ${truncateText(selected, 20)}`
        : '[下拉框]'
    }

    case 'button': {
      const text = getTextContent(element)
      return text || '[按钮]'
    }

    case 'a': {
      const text = getTextContent(element)
      return text || '[链接]'
    }

    case 'svg': {
      return '[SVG图标]'
    }

    case 'canvas': {
      return '[画布]'
    }

    case 'video': {
      return '[视频]'
    }

    case 'audio': {
      return '[音频]'
    }

    case 'iframe': {
      return '[嵌入框架]'
    }

    default: {
      // 普通元素：获取文本内容
      const text = getTextContent(element)
      return text || ''
    }
  }
}

/**
 * 获取元素的文本内容
 *
 * @remarks
 * - 只获取直接子文本节点，不包括子元素的文本
 * - 清理空格、换行
 * - 截断到 30 字符
 *
 * @param element - 目标元素
 * @returns 文本内容
 */
function getTextContent(element: HTMLElement): string {
  // 获取元素的所有文本内容（包括子元素）
  let text = element.textContent || ''

  // 清理：去除多余空格和换行
  text = text.replace(/\s+/g, ' ').trim()

  // 截断
  return truncateText(text, 30)
}

/**
 * 截断文本
 *
 * @param text - 原始文本
 * @param maxLength - 最大长度
 * @returns 截断后的文本
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }

  return text.substring(0, maxLength) + '...'
}

/**
 * 从 URL 中提取文件名
 *
 * @param url - URL 字符串
 * @returns 文件名
 */
function extractFileName(url: string): string {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const parts = pathname.split('/')
    return parts[parts.length - 1] || ''
  } catch (e) {
    return ''
  }
}
