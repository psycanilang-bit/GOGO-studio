/**
 * Hunter 悬停预览组件
 * 显示鼠标悬停时的元素名称和内容
 */

import type { Position } from '~types'
import { getElementDisplayText } from '~utils/elementInfo'

interface Props {
  /** 悬停的元素 */
  element: HTMLElement | null
  /** 鼠标位置 */
  position: Position
}

/**
 * 悬停预览组件
 *
 * @remarks
 * - 显示元素的标签名 + 内容文本
 * - 跟随鼠标位置
 * - 小标签：黑色背景 + 白色文字
 * - 文本过长会自动截断
 *
 * @example
 * - BUTTON: 保存
 * - A: 点击这里查看详情
 * - IMG: [图片] avatar.png
 * - DIV.card: 这是卡片内容...
 */
export default function HoverPreview({ element, position }: Props) {
  if (!element) return null

  // 获取元素的显示文本
  const labelText = getElementDisplayText(element)

  return (
    <div
      className="hunter-hover-preview"
      style={{
        position: 'fixed',
        top: `${position.y + 15}px`, // 鼠标下方 15px
        left: `${position.x + 15}px`, // 鼠标右侧 15px
        background: 'rgba(0, 0, 0, 0.85)',
        color: 'white',
        padding: '6px 10px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 500,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        pointerEvents: 'none',
        zIndex: 9999999,
        whiteSpace: 'nowrap',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        maxWidth: '400px',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}
    >
      {labelText}
    </div>
  )
}
