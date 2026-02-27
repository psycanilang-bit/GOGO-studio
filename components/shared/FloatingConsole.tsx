/**
 * 浮动控制台组件
 * 提供模式切换和状态显示的统一入口
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import type { Mode, Position, DomRecord } from '~types'
import { useStorage } from '~hooks/useStorage'
import { safeSendMessage } from '~utils/message'
import { getPageId } from '~utils/pageId'

interface Props {
  currentMode: Mode
  onSwitch: (mode: Mode) => void
}

/**
 * 浮动控制台
 *
 * @remarks
 * - 可拖拽定位（位置持久化）
 * - 可展开/收起
 * - 显示当前模式状态
 * - 提供模式切换按钮
 *
 * @design
 * - 简约风格：纯白背景、圆角阴影
 * - 固定定位：z-index 999999
 * - 拖拽交互：鼠标按下移动
 */
export default function FloatingConsole({ currentMode, onSwitch }: Props) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [position, setPosition] = useStorage<Position>('console-position', {
    x: 20,
    y: 20
  })

  const [isDragging, setIsDragging] = useState(false)
  const dragStartPos = useRef({ x: 0, y: 0 })

  // Hunter 模式数据（v1.1 新增）
  const [hunterRecords, setHunterRecords] = useStorage<DomRecord[]>(
    'hunter-records',
    []
  )

  // 获取当前页面 ID 和当前页面的记录
  const currentPageId = getPageId(window.location.href)
  const currentPageRecords = hunterRecords.filter((r) => r.pageId === currentPageId)

  /**
   * 拖拽开始
   */
  const handleMouseDown = (e: React.MouseEvent) => {
    // 只在点击标题栏时触发拖拽
    if ((e.target as HTMLElement).closest('.console-header')) {
      setIsDragging(true)
      dragStartPos.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y
      }
      e.preventDefault()
    }
  }

  /**
   * 拖拽移动
   */
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const newX = e.clientX - dragStartPos.current.x
      const newY = e.clientY - dragStartPos.current.y
      const maxX = window.innerWidth - 250
      const maxY = window.innerHeight - 100
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      })
    },
    [setPosition]
  )

  /**
   * 拖拽结束（在 document 上监听，松手任意位置都能结束拖拽）
   */
  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // 仅在 isDragging 变化时注册/注销；避免在每次 mousemove 重渲染时反复移除导致 mouseup 丢失
  useEffect(() => {
    if (!isDragging) return
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  /**
   * 切换到下一个模式
   * 切换后通过自定义事件通知同页面的主 content script 同步模式，避免仅控制台更新而页面仍为猎手状态
   */
  const handleToggleMode = () => {
    const modes: Mode[] = ['OFF', 'GOGO', 'HUNTER']
    const currentIndex = modes.indexOf(currentMode)
    const nextMode = modes[(currentIndex + 1) % modes.length]
    onSwitch(nextMode)
    // 显式通知主 content script 同步模式（解决控制台与主脚本分属不同实例时 storage 同步滞后问题）
    try {
      document.dispatchEvent(
        new CustomEvent('gogo-studio-mode-changed', { detail: { mode: nextMode } })
      )
    } catch (e) {
      console.warn('[FloatingConsole] 派发模式同步事件失败', e)
    }
  }

  /**
   * 获取模式显示文本
   */
  const getModeText = (): string => {
    switch (currentMode) {
      case 'GOGO':
        return '🎯 GOGO阅读标注'
      case 'HUNTER':
        return '🔍 DOM猎手'
      case 'OFF':
        return '⚪ 已关闭'
    }
  }

  /**
   * 获取模式颜色
   */
  const getModeColor = (): string => {
    switch (currentMode) {
      case 'GOGO':
        return '#28a745'
      case 'HUNTER':
        return '#4A90E2'
      case 'OFF':
        return '#999'
    }
  }

  /**
   * 复制采集数据（Hunter 模式专用 - 仅当前页面）
   * 导出简化版本：selector, tagName, userNote, htmlPreview
   */
  const handleCopyRecords = async () => {
    try {
      if (currentPageRecords.length === 0) {
        safeSendMessage({
          type: 'SHOW_TOAST',
          payload: { message: '⚠️ 当前页面暂无采集数据', duration: 1500, color: 'default' }
        })
        return
      }

      // 提取用户需要的字段，并截断 HTML
      const simplifiedData = currentPageRecords.map(record => {
        // 截断 HTML 到 150 字符
        const maxLength = 150
        let htmlPreview = record.snippetHTML
        if (htmlPreview.length > maxLength) {
          htmlPreview = htmlPreview.substring(0, maxLength) + '...'
        }

        return {
          selector: record.selector,
          tagName: record.tagName,
          userNote: record.userNote,
          htmlPreview: htmlPreview
        }
      })

      const jsonString = JSON.stringify(simplifiedData, null, 2)
      await navigator.clipboard.writeText(jsonString)

      safeSendMessage({
        type: 'SHOW_TOAST',
        payload: {
          message: `✓ 已复制当前页面 ${currentPageRecords.length} 条记录`,
          duration: 2000,
          color: 'green'
        }
      })

      console.log('[Hunter] 已复制当前页面简化数据到剪贴板:', simplifiedData)
    } catch (e) {
      console.error('[Hunter] 复制失败:', e)
      safeSendMessage({
        type: 'SHOW_TOAST',
        payload: { message: '✗ 复制失败', duration: 1500, color: 'red' }
      })
    }
  }

  /**
   * 清空采集数据（Hunter 模式专用 - 仅当前页面）
   */
  const handleClearRecords = async () => {
    try {
      if (currentPageRecords.length === 0) {
        safeSendMessage({
          type: 'SHOW_TOAST',
          payload: { message: '⚠️ 当前页面暂无数据需要清空', duration: 1500, color: 'default' }
        })
        return
      }

      // 只删除当前页面的记录，保留其他页面的记录
      const remainingRecords = hunterRecords.filter((r) => r.pageId !== currentPageId)
      await setHunterRecords(remainingRecords)

      safeSendMessage({
        type: 'SHOW_TOAST',
        payload: {
          message: `✓ 已清空当前页面 ${currentPageRecords.length} 条记录`,
          duration: 1500,
          color: 'green'
        }
      })

      console.log('[Hunter] 已清空当前页面采集数据，保留其他页面记录')
    } catch (e) {
      console.error('[Hunter] 清空失败:', e)
      safeSendMessage({
        type: 'SHOW_TOAST',
        payload: { message: '✗ 清空失败', duration: 1500, color: 'red' }
      })
    }
  }

  return (
    <div
      className="floating-console"
      style={{
        position: 'fixed',
        top: `${position.y}px`,
        left: `${position.x}px`,
        zIndex: 9999999, // 极高z-index，确保在所有内容之上
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        minWidth: '220px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '14px',
        cursor: isDragging ? 'grabbing' : 'default',
        pointerEvents: 'auto' // 确保可以接收点击事件
      }}
      onMouseDown={handleMouseDown}
    >
      {/* 标题栏 */}
      <div
        className="console-header"
        style={{
          padding: '10px 12px',
          borderBottom: isExpanded ? '1px solid #e0e0e0' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'grab',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: getModeColor()
            }}
          />
          <span style={{ fontWeight: 600, fontSize: '13px' }}>
            GOGO Studio v0.1
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation()
            setIsExpanded(!isExpanded)
          }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            fontSize: '16px'
          }}
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>

      {/* 内容区 */}
      {isExpanded && (
        <div style={{ padding: '12px' }}>
          {/* 当前模式 */}
          <div
            style={{
              padding: '8px',
              background: '#f5f5f5',
              borderRadius: '4px',
              marginBottom: '10px',
              textAlign: 'center',
              fontWeight: 500,
              color: getModeColor()
            }}
          >
            {getModeText()}
          </div>

          {/* 按钮组 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button
              onClick={handleToggleMode}
              style={{
                padding: '8px 12px',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                background: 'white',
                cursor: 'pointer',
                fontSize: '13px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f5f5f5'
                e.currentTarget.style.borderColor = '#4A90E2'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white'
                e.currentTarget.style.borderColor = '#e0e0e0'
              }}
            >
              🔄 切换模式
            </button>

            {currentMode === 'GOGO' && (
              <button
                onClick={() => {
                  safeSendMessage({ type: 'OPEN_SIDEPANEL' })
                }}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  background: 'white',
                  cursor: 'pointer',
                  fontSize: '13px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f5f5f5'
                  e.currentTarget.style.borderColor = '#4A90E2'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white'
                  e.currentTarget.style.borderColor = '#e0e0e0'
                }}
              >
                📋 打开侧边栏
              </button>
            )}

            {/* Hunter 模式专属按钮（v1.1 新增） */}
            {currentMode === 'HUNTER' && (
              <>
                {/* 采集数量显示（仅当前页面） */}
                <div
                  style={{
                    padding: '8px 12px',
                    background: '#f0f8ff',
                    borderRadius: '4px',
                    textAlign: 'center',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#4A90E2'
                  }}
                >
                  已采集：{currentPageRecords.length} 条
                </div>

                {/* 复制数据按钮 */}
                <button
                  onClick={handleCopyRecords}
                  disabled={currentPageRecords.length === 0}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #28a745',
                    borderRadius: '4px',
                    background: 'white',
                    color: '#28a745',
                    cursor: currentPageRecords.length === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
                    transition: 'all 0.2s',
                    opacity: currentPageRecords.length === 0 ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (currentPageRecords.length > 0) {
                      e.currentTarget.style.background = '#28a745'
                      e.currentTarget.style.color = 'white'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white'
                    e.currentTarget.style.color = '#28a745'
                  }}
                >
                  📋 复制数据
                </button>

                {/* 清空数据按钮 */}
                <button
                  onClick={handleClearRecords}
                  disabled={currentPageRecords.length === 0}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #dc3545',
                    borderRadius: '4px',
                    background: 'white',
                    color: '#dc3545',
                    cursor: currentPageRecords.length === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
                    transition: 'all 0.2s',
                    opacity: currentPageRecords.length === 0 ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (currentPageRecords.length > 0) {
                      e.currentTarget.style.background = '#dc3545'
                      e.currentTarget.style.color = 'white'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white'
                    e.currentTarget.style.color = '#dc3545'
                  }}
                >
                  🗑️ 清空数据
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
