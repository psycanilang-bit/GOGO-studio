/**
 * GOGO 标注菜单组件
 * 文本选中后弹出的操作菜单
 */

import { createPortal } from 'react-dom'
import type { Position } from '~types'

interface Props {
  position: Position
  onAnnotate: (type: 'agree' | 'question') => void
  onClose: () => void
}

/**
 * 标注菜单
 *
 * @remarks
 * - 显示在选中文本下方
 * - 提供"认可"和"质疑"两个按钮
 * - 点击外部或ESC键关闭
 * - 使用Portal渲染到body，使用fixed定位
 *
 * @design
 * - 简约风格：白色背景、圆角阴影
 * - 按钮带图标：✓ 认可、? 质疑
 */
export default function AnnotationMenu({ position, onAnnotate, onClose }: Props) {
  console.log('[AnnotationMenu] 组件渲染，位置:', position)
  console.log('[AnnotationMenu] window尺寸:', window.innerWidth, window.innerHeight)

  // 使用fixed定位，不需要加scrollY
  const menu = (
    <div
      className="gogo-annotation-menu"
      style={{
        position: 'fixed',
        top: `${position.y + 10}px`,
        left: `${position.x}px`,
        background: 'white',
        border: '2px solid #4A90E2',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        padding: '8px',
        zIndex: 2147483647, // 最大z-index
        display: 'flex',
        gap: '6px',
        minWidth: '200px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '13px',
        pointerEvents: 'auto' // 确保可以点击
      }}
    >
      <button
        onClick={(e) => {
          console.log('[AnnotationMenu] 认可按钮被点击')
          e.stopPropagation()
          onAnnotate('agree')
        }}
        style={{
          padding: '6px 12px',
          border: '1px solid #28a745',
          borderRadius: '4px',
          background: 'white',
          color: '#28a745',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 500,
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          whiteSpace: 'nowrap'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#28a745'
          e.currentTarget.style.color = 'white'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'white'
          e.currentTarget.style.color = '#28a745'
        }}
      >
        <span>✓</span>
        <span>认可</span>
      </button>

      <button
        onClick={(e) => {
          console.log('[AnnotationMenu] 质疑按钮被点击')
          e.stopPropagation()
          onAnnotate('question')
        }}
        style={{
          padding: '6px 12px',
          border: '1px solid #ffc107',
          borderRadius: '4px',
          background: 'white',
          color: '#ffc107',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 500,
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          whiteSpace: 'nowrap'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#ffc107'
          e.currentTarget.style.color = 'white'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'white'
          e.currentTarget.style.color = '#ffc107'
        }}
      >
        <span>?</span>
        <span>质疑</span>
      </button>

      <button
        onClick={(e) => {
          console.log('[AnnotationMenu] 关闭按钮被点击')
          e.stopPropagation()
          onClose()
        }}
        style={{
          padding: '6px 10px',
          border: '1px solid #e0e0e0',
          borderRadius: '4px',
          background: 'white',
          color: '#666',
          cursor: 'pointer',
          fontSize: '13px',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#f5f5f5'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'white'
        }}
      >
        ✕
      </button>
    </div>
  )

  // 使用Portal渲染到document.body，确保不被页面CSS影响
  return createPortal(menu, document.body)
}
