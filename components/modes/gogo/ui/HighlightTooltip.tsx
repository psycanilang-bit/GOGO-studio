/**
 * GOGO 高亮标记预览Tooltip
 * 点击或悬停高亮标记时显示内容预览
 */

import { createPortal } from 'react-dom'
import type { GOGOAnnotation, Position } from '~types'

interface Props {
  annotation: GOGOAnnotation
  position: Position
  onClose: () => void
  onNavigateToSidebar: () => void
  onDelete: () => void
}

/**
 * 高亮标记内容预览Tooltip
 *
 * @remarks
 * - 显示标注类型、原文、反馈内容、创建时间
 * - 提供"定位到侧边栏"和"删除"操作
 * - 点击外部关闭
 *
 * @design
 * - 白色背景、圆角阴影
 * - 类型标识：认可（绿色）/ 质疑（黄色）
 * - 操作按钮：定位、删除、关闭
 */
export default function HighlightTooltip({
  annotation,
  position,
  onClose,
  onNavigateToSidebar,
  onDelete
}: Props) {
  const typeConfig = {
    agree: {
      icon: '✓',
      label: '认可',
      color: '#28a745',
      bgColor: '#d4edda'
    },
    question: {
      icon: '?',
      label: '质疑',
      color: '#ffc107',
      bgColor: '#fff3cd'
    }
  }

  const config = typeConfig[annotation.type]

  // 格式化时间
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const tooltip = (
    <div
      className="gogo-highlight-tooltip"
      style={{
        position: 'fixed',
        top: `${position.y + 10}px`,
        left: `${position.x}px`,
        background: 'white',
        border: '2px solid ' + config.color,
        borderRadius: '8px',
        padding: '12px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        zIndex: 2147483646,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '13px',
        minWidth: '280px',
        maxWidth: '400px',
        pointerEvents: 'auto'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 标题栏 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px',
          paddingBottom: '8px',
          borderBottom: '1px solid #e0e0e0'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: config.bgColor,
              color: config.color,
              fontWeight: 'bold',
              fontSize: '12px'
            }}
          >
            {config.icon}
          </span>
          <span style={{ fontWeight: 600, color: config.color }}>
            {config.label}
          </span>
        </div>

        <button
          onClick={onClose}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: '#999',
            fontSize: '16px',
            padding: '0 4px',
            lineHeight: 1
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#666'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#999'
          }}
        >
          ✕
        </button>
      </div>

      {/* 原文引用 */}
      <div style={{ marginBottom: '10px' }}>
        <div
          style={{
            fontSize: '11px',
            color: '#999',
            marginBottom: '4px',
            fontWeight: 500
          }}
        >
          原文片段
        </div>
        <div
          style={{
            padding: '8px',
            background: '#f5f5f5',
            borderRadius: '4px',
            fontSize: '13px',
            lineHeight: '1.5',
            color: '#333',
            maxHeight: '80px',
            overflow: 'auto',
            wordBreak: 'break-word'
          }}
        >
          "{annotation.quote}"
        </div>
      </div>

      {/* 反馈内容 */}
      {annotation.suggestion && (
        <div style={{ marginBottom: '10px' }}>
          <div
            style={{
              fontSize: '11px',
              color: '#999',
              marginBottom: '4px',
              fontWeight: 500
            }}
          >
            我的反馈
          </div>
          <div
            style={{
              padding: '8px',
              background: '#fafafa',
              borderRadius: '4px',
              fontSize: '13px',
              lineHeight: '1.5',
              color: '#555',
              maxHeight: '60px',
              overflow: 'auto',
              wordBreak: 'break-word'
            }}
          >
            {annotation.suggestion}
          </div>
        </div>
      )}

      {/* 时间戳 */}
      <div
        style={{
          fontSize: '11px',
          color: '#999',
          marginBottom: '10px'
        }}
      >
        {formatTime(annotation.createdAt)}
      </div>

      {/* 操作按钮 */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          paddingTop: '8px',
          borderTop: '1px solid #e0e0e0'
        }}
      >
        <button
          onClick={onNavigateToSidebar}
          style={{
            flex: 1,
            padding: '6px 12px',
            border: '1px solid #4A90E2',
            borderRadius: '4px',
            background: 'white',
            color: '#4A90E2',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 500,
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#4A90E2'
            e.currentTarget.style.color = 'white'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'white'
            e.currentTarget.style.color = '#4A90E2'
          }}
        >
          📍 定位到侧边栏
        </button>

        <button
          onClick={() => {
            onDelete()
            onClose()
          }}
          style={{
            padding: '6px 12px',
            border: '1px solid #dc3545',
            borderRadius: '4px',
            background: 'white',
            color: '#dc3545',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 500,
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#dc3545'
            e.currentTarget.style.color = 'white'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'white'
            e.currentTarget.style.color = '#dc3545'
          }}
        >
          🗑️ 删除
        </button>
      </div>
    </div>
  )

  // 使用Portal渲染到document.body
  return createPortal(tooltip, document.body)
}
