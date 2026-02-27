/**
 * Hunter 编辑浮层组件
 * 框选元素后显示，用于输入修改需求
 */

import { useState, useEffect, useRef } from 'react'
import type { Position, SelectionType } from '~types'

interface Props {
  /** 浮层位置 */
  position: Position
  /** 选择类型（v1.3 新增） */
  selectionType: SelectionType
  /** 元素数量（v1.3 新增） */
  elementCount?: number
  /** 取消回调 */
  onCancel: () => void
  /** 确定回调（传入用户输入的备注） */
  onConfirm: (userNote: string) => void
}

/**
 * 编辑浮层组件
 *
 * @remarks
 * 用户框选元素后显示此浮层：
 * - 输入框：输入修改需求（自动聚焦）
 * - 取消按钮：清除选区，关闭浮层
 * - 确定按钮：保存数据，恢复十字光标
 *
 * @design
 * - 白色背景、圆角阴影
 * - 输入框自动聚焦
 * - 支持回车键确认
 */
export default function EditPanel({ position, selectionType, elementCount, onCancel, onConfirm }: Props) {
  const [userNote, setUserNote] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // 计算后的实际展示位置（基于元素位置 + 视口边界做修正）
  const [computedPosition, setComputedPosition] = useState<Position>(position)

  // 根据选择类型确定提示文字
  const titleText = selectionType === 'single'
    ? '✏️ 输入修改需求'
    : `✏️ 输入整体修改需求 (${elementCount || 0} 个元素)`

  const placeholderText = selectionType === 'single'
    ? '例如：把背景改成红色，文字加粗'
    : '例如：统一调整这些元素的样式和间距'

  const hintText = selectionType === 'single'
    ? '💡 提示：输入后按回车或点击确定'
    : '💡 提示：将对选中的所有元素提供整体反馈'

  /**
   * 自动聚焦输入框
   */
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  /**
   * 根据面板尺寸和视口边界，计算安全的展示位置
   *
   * 需求：
   * - 不撑开页面布局（使用 fixed 悬浮）
   * - 默认贴近元素一侧展示
   * - 若在页面底部，则优先放在元素上方；若在顶部，则优先放在元素下方
   * - 同时做左右边界收缩，避免超出屏幕
   */
  useEffect(() => {
    const updatePosition = () => {
      const panel = panelRef.current
      if (!panel) {
        setComputedPosition(position)
        return
      }

      const rect = panel.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const margin = 12 // 与视口边缘的最小间距

      // 垂直方向：优先放在元素下方，若放不下则尝试放在上方
      const belowTop = position.y + 8
      const aboveTop = position.y - rect.height - 8
      let finalTop: number

      if (belowTop + rect.height <= viewportHeight - margin) {
        // 下方空间足够 → 放在下方
        finalTop = belowTop
      } else if (aboveTop >= margin) {
        // 下方放不下，但上方空间足够 → 放在上方
        finalTop = aboveTop
      } else {
        // 上下空间都有限 → 尽量塞在可见区域内
        finalTop = Math.max(margin, viewportHeight - margin - rect.height)
      }

      // 水平方向：以元素左侧为基准，超出则向左收缩
      let finalLeft = position.x
      if (finalLeft + rect.width > viewportWidth - margin) {
        finalLeft = viewportWidth - margin - rect.width
      }
      finalLeft = Math.max(margin, finalLeft)

      setComputedPosition({ x: finalLeft, y: finalTop })
    }

    // 初次挂载后计算一次
    updatePosition()

    // 仅在 position 变更（用户重新选择元素）时重新计算
    // 不监听滚动，避免频繁重算；锚点固定在选中时的位置
  }, [position])

  /**
   * 回车键确认
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleConfirm()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  /**
   * 确认保存
   */
  const handleConfirm = () => {
    if (!userNote.trim()) {
      // 如果没有输入内容，提示用户
      alert('请输入修改需求')
      return
    }
    onConfirm(userNote.trim())
  }

  return (
    <div
      className="hunter-edit-panel"
      ref={panelRef}
      style={{
        position: 'fixed',
        top: `${computedPosition.y}px`,
        left: `${computedPosition.x}px`,
        background: 'white',
        border: '2px solid #4A90E2',
        borderRadius: '8px',
        padding: '16px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        zIndex: 1000000,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '14px',
        minWidth: '350px'
      }}
      onClick={(e) => e.stopPropagation()} // 阻止事件冒泡
    >
      {/* 标题 */}
      <div
        style={{
          marginBottom: '12px',
          fontSize: '15px',
          fontWeight: 600,
          color: '#333',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <span>{titleText}</span>
      </div>

      {/* 输入框 */}
      <input
        ref={inputRef}
        type="text"
        value={userNote}
        onChange={(e) => setUserNote(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholderText}
        style={{
          width: '100%',
          padding: '10px 12px',
          border: '1px solid #e0e0e0',
          borderRadius: '6px',
          fontSize: '14px',
          outline: 'none',
          transition: 'border-color 0.2s',
          marginBottom: '12px',
          boxSizing: 'border-box'
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = '#4A90E2')}
        onBlur={(e) => (e.currentTarget.style.borderColor = '#e0e0e0')}
      />

      {/* 提示文字 */}
      <div
        style={{
          fontSize: '12px',
          color: '#999',
          marginBottom: '12px'
        }}
      >
        {hintText}
      </div>

      {/* 按钮组 */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            padding: '10px',
            border: '1px solid #e0e0e0',
            borderRadius: '6px',
            background: 'white',
            color: '#666',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f5f5f5'
            e.currentTarget.style.borderColor = '#999'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'white'
            e.currentTarget.style.borderColor = '#e0e0e0'
          }}
        >
          ✕ 取消
        </button>

        <button
          onClick={handleConfirm}
          style={{
            flex: 1,
            padding: '10px',
            border: '1px solid #4A90E2',
            borderRadius: '6px',
            background: '#4A90E2',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#357ABD'
            e.currentTarget.style.borderColor = '#357ABD'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#4A90E2'
            e.currentTarget.style.borderColor = '#4A90E2'
          }}
        >
          ✓ 确定
        </button>
      </div>
    </div>
  )
}
