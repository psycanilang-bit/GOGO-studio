/**
 * 通用类型定义
 * 包含跨模块共享的基础类型
 */

/**
 * 扩展模式枚举
 * - GOGO: 文本阅读标注模式
 * - HUNTER: DOM元素猎手模式
 * - OFF: 关闭状态
 */
export type Mode = 'GOGO' | 'HUNTER' | 'OFF'

/**
 * 屏幕坐标位置
 * 用于UI元素定位（菜单、Tooltip等）
 */
export interface Position {
  x: number
  y: number
}
