/**
 * DOM Hunter 元素猎手模式类型定义
 */

/**
 * DOM 元素信息结构
 * 用于展示和复制元素定位信息
 */
export interface ElementInfo {
  /** 标签名（小写） */
  tagName: string

  /** 元素ID（如果存在） */
  id?: string

  /** Class列表 */
  classes: string[]

  /** CSS选择器（优先级：ID > 唯一Class > nth-child） */
  selector: string

  /** 绝对XPath路径 */
  xpath: string
}

/**
 * 框选矩形坐标
 * 用于Canvas绘制和碰撞检测
 */
export interface SelectionRect {
  /** 起始点X坐标 */
  startX: number

  /** 起始点Y坐标 */
  startY: number

  /** 结束点X坐标 */
  endX: number

  /** 结束点Y坐标 */
  endY: number
}

/**
 * 结构完整度状态
 * - full: HTML 完整保留
 * - truncated: HTML 被截断（触发了结构熔断）
 */
export type StructureState = 'full' | 'truncated'

/**
 * 选择方式类型
 * - single: 点击选择单个元素
 * - area: 拖拽框选多个元素（保存公共祖先）
 */
export type SelectionType = 'single' | 'area'

/**
 * DOM 采集记录（v1.1 新增，用于 LLM 辅助编程）
 *
 * @remarks
 * 设计目标：为 LLM 提供最佳的 HTML 上下文
 * - 包含清洗压缩后的 HTML 片段
 * - 包含用户的修改需求备注
 * - 包含定位所需的 CSS 选择器
 */
export interface DomRecord {
  /** 唯一标识符（自增 ID） */
  id: number

  /** 用户输入的修改需求备注（如：把背景改成红色） */
  userNote: string

  /** CSS 选择器（用于定位元素） */
  selector: string

  /** 标签名（如：DIV, TABLE, BUTTON） */
  tagName: string

  /** 清洗压缩后的 HTML 片段 */
  snippetHTML: string

  /** 结构完整度状态 */
  structureState: StructureState

  /** 来源页面 URL */
  pageUrl: string

  /** 页面唯一标识（用于页面隔离，格式：origin + pathname） */
  pageId: string

  /** 创建时间戳（毫秒） */
  createdAt: number

  /** 选择方式（v1.3 新增） */
  selectionType: SelectionType

  /** 包含的元素数量（仅 area 模式，v1.3 新增） */
  elementCount?: number
}
