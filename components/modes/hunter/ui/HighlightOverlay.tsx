/**
 * Hunter 高亮覆盖层组件
 * 显示选中元素的边框（蓝色单选 / 绿色容器或群组）
 *
 * @remarks
 * - single: 蓝色虚线边框
 * - area 容器态: 绿色虚线边框，标签 "XXX 区域"
 * - area 群组态: 1px 绿色细实线外框 + 内部元素淡绿色填充，标签 "Group (X items)"
 */

import { useEffect, useState } from 'react'
import type { SelectionType } from '~types'

interface Props {
  /** 要高亮的元素（容器或公共祖先） */
  element: HTMLElement
  /** 选择类型 */
  type: SelectionType
  /** 框选/群组时的元素数量（用于 Group (X items)） */
  elementCount?: number
  /** 群组态时多个最外层元素（用于各自淡绿填充） */
  selectedElements?: HTMLElement[] | null
  /** 关闭回调 */
  onDismiss?: () => void
}

/**
 * 高亮覆盖层组件
 *
 * @remarks
 * - single: 蓝色虚线边框
 * - area: 绿色虚线边框
 * - 跟随元素位置，滚动时实时更新
 * - 不阻挡鼠标事件
 */
export default function HighlightOverlay({
  element,
  type,
  elementCount = 0,
  selectedElements = null,
  onDismiss
}: Props) {
  const [bounds, setBounds] = useState(element.getBoundingClientRect())
  const isGroup = type === 'area' && selectedElements != null && selectedElements.length > 1
  const [groupBounds, setGroupBounds] = useState<DOMRect[]>(
    () => (selectedElements ?? []).map((el) => el.getBoundingClientRect())
  )

  /**
   * 更新边框位置（主元素 + 群组态时各子元素）
   */
  const updatePosition = () => {
    if (!element || !element.isConnected) {
      console.warn('[HighlightOverlay] 元素已失效')
      onDismiss?.()
      return
    }

    setBounds(element.getBoundingClientRect())
    if (isGroup && selectedElements?.length) {
      setGroupBounds(selectedElements.map((el) => el.getBoundingClientRect()))
    }
  }

  /**
   * 监听滚动和窗口大小变化
   */
  useEffect(() => {
    updatePosition()

    // 监听滚动事件
    const handleScroll = () => {
      updatePosition()
    }

    // 监听窗口大小变化
    const handleResize = () => {
      updatePosition()
    }

    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleResize)
    }
  }, [element, isGroup, selectedElements])

  const borderColor = type === 'single' ? '#4A90E2' : '#34A853'
  const labelBgColor = type === 'single' ? '#4A90E2' : '#34A853'

  // 群组态：Group (X items)；容器态：XXX 区域；单选：标签名
  const labelText = isGroup
    ? `Group (${elementCount} items)`
    : type === 'single'
      ? element.tagName
      : `${element.tagName} 区域`

  // 群组态：整个框选区域外框 1px 绿色细实线；否则 2px 虚线
  const outerBorder = isGroup
    ? `1px solid ${borderColor}`
    : `2px dashed ${borderColor}`

  return (
    <>
      {/* 外框（群组态为 1px 绿实线） */}
      <div
        className="hunter-highlight-overlay"
        style={{
          position: 'fixed',
          top: `${bounds.top}px`,
          left: `${bounds.left}px`,
          width: `${bounds.width}px`,
          height: `${bounds.height}px`,
          border: outerBorder,
          pointerEvents: 'none',
          zIndex: 999997,
          transition: 'all 0.1s ease-out'
        }}
      />

      {/* 群组态：内部元素各自淡绿色填充（原子态） */}
      {isGroup &&
        groupBounds.map((rect, i) => (
          <div
            key={i}
            className="hunter-highlight-group-item"
            style={{
              position: 'fixed',
              top: `${rect.top}px`,
              left: `${rect.left}px`,
              width: `${rect.width}px`,
              height: `${rect.height}px`,
              background: 'rgba(52, 168, 83, 0.15)',
              pointerEvents: 'none',
              zIndex: 999996
            }}
          />
        ))}

      {/* 标签 */}
      <div
        className="hunter-highlight-label"
        style={{
          position: 'fixed',
          top: `${Math.max(bounds.top - 24, 5)}px`,
          left: `${bounds.left}px`,
          background: labelBgColor,
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 600,
          fontFamily: 'monospace',
          pointerEvents: 'none',
          zIndex: 999998,
          whiteSpace: 'nowrap'
        }}
      >
        {labelText}
      </div>
    </>
  )
}
