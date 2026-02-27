/**
 * GOGO 阅读标注模式类型定义
 */

/**
 * 标注类型
 * - agree: 认可（绿色高亮）
 * - question: 质疑（黄色高亮）
 */
export type AnnotationType = 'agree' | 'question'

/**
 * 文本引用选择器（Web Annotation 标准）
 * 用于在动态内容中精确定位文本
 *
 * @remarks
 * 结合 XPath 提供双重定位保障
 * - XPath 用于结构化定位
 * - TextQuote 用于内容匹配（应对DOM变化）
 */
export interface TextQuote {
  /** 选中的完整文本 */
  exact: string
  /** 前置上下文（32字符） */
  prefix: string
  /** 后置上下文（32字符） */
  suffix: string
}

/**
 * GOGO 标注数据结构
 * 持久化到 chrome.storage.local
 */
export interface GOGOAnnotation {
  /** 唯一标识符 (UUID v4) */
  id: string

  /** 标注所在页面的完整URL */
  url: string

  /** 页面唯一标识符 (origin + pathname，用于页面隔离) */
  pageId: string

  /** 标注类型（认可/质疑） */
  type: AnnotationType

  /** 用户反馈建议（可选） */
  suggestion: string

  /** 选中的原文片段 */
  quote: string

  /** 元素的绝对XPath路径 */
  xpath: string

  /** 文本引用选择器（备选定位方案） */
  textQuote: TextQuote

  /** 创建时间戳（毫秒） */
  createdAt: number
}
