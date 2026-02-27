/**
 * GOGO Studio 侧边栏面板
 * 展示标注列表，支持筛选、搜索、定位、导出
 */

import { useState, useEffect, useRef } from 'react'
import { useStorage } from '~hooks/useStorage'
import { useMode } from '~hooks/useMode'
import { getPageId } from '~utils/pageId'
import type { GOGOAnnotation } from '~types'

/**
 * 侧边栏主组件
 */
export default function SidePanel() {
  const { currentMode, isModeLoaded } = useMode()
  const [annotations, setAnnotations] = useStorage<GOGOAnnotation[]>(
    'annotations',
    []
  )
  const [filter, setFilter] = useState<'all' | 'agree' | 'question'>('all')
  const [searchText, setSearchText] = useState('')
  const [currentPageId, setCurrentPageId] = useState<string>('')

  /**
   * 获取当前标签页的 pageId
   */
  useEffect(() => {
    const fetchCurrentPageId = async () => {
      try {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true
        })
        if (tab.url) {
          const pageId = getPageId(tab.url)
          setCurrentPageId(pageId)
          console.log('[SidePanel] 当前页面 PageId:', pageId)
        }
      } catch (e) {
        console.error('[SidePanel] 获取当前页面失败:', e)
      }
    }

    fetchCurrentPageId()

    // 监听标签页切换
    const handleTabChange = (activeInfo: chrome.tabs.TabActiveInfo) => {
      fetchCurrentPageId()
    }

    chrome.tabs.onActivated.addListener(handleTabChange)

    return () => {
      chrome.tabs.onActivated.removeListener(handleTabChange)
    }
  }, [])

  /**
   * 监听模式变化，当模式不是 GOGO 时自动关闭侧边栏
   */
  useEffect(() => {
    if (!isModeLoaded) {
      console.log('[SidePanel] 等待模式加载...')
      return
    }

    console.log('[SidePanel] 当前模式:', currentMode)

    // 如果切换到非 GOGO 模式，自动关闭侧边栏
    if (currentMode !== 'GOGO') {
      console.log('[SidePanel] 检测到模式切换为', currentMode, '，自动关闭侧边栏')
      // 延迟一点点，确保用户能看到模式切换的过程
      setTimeout(() => {
        window.close()
      }, 300)
    }
  }, [currentMode, isModeLoaded])

  /**
   * 过滤逻辑（页面隔离 + 类型筛选 + 搜索功能）
   */
  const filteredList = annotations
    .filter((a) => a.pageId === currentPageId) // 只显示当前页面的标注
    .filter((a) => filter === 'all' || a.type === filter)
    .filter((a) => {
      if (searchText === '') return true

      const searchLower = searchText.toLowerCase()

      // 搜索范围：选中的文本 + 用户的反馈建议
      return (
        a.quote.toLowerCase().includes(searchLower) ||
        (a.suggestion && a.suggestion.toLowerCase().includes(searchLower))
      )
    })
    .sort((a, b) => b.createdAt - a.createdAt)

  /**
   * 监听新标注消息
   */
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.type === 'NEW_ANNOTATION') {
        // Storage会自动同步，无需手动更新
      } else if (message.type === 'SCROLL_TO_SIDEBAR_ANNOTATION') {
        // 滚动到指定标注
        const annotationId = message.payload
        setTimeout(() => {
          const element = document.getElementById(`annotation-${annotationId}`)
          if (element) {
            // 滚动到视图中
            element.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            })

            // 添加闪烁效果
            element.classList.add('flash-border')
            setTimeout(() => {
              element.classList.remove('flash-border')
            }, 2000) // 2秒后移除闪烁类
          }
        }, 100)
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage)

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage)
    }
  }, [])

  /**
   * 定位到标注
   */
  const handleScrollToAnnotation = async (annotation: GOGOAnnotation) => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      })

      if (!tab.id || !tab.url) return

      // 检查pageId是否匹配，不同页则直接跳转
      const currentTabPageId = getPageId(tab.url)
      if (currentTabPageId !== annotation.pageId) {
        await chrome.tabs.update(tab.id, { url: annotation.url })
        setTimeout(() => {
          chrome.tabs.sendMessage(tab.id!, {
            type: 'SCROLL_TO_ANNOTATION',
            payload: annotation.id
          })
        }, 1000)
        return
      }

      // 同一页面直接滚动
      chrome.tabs.sendMessage(tab.id, {
        type: 'SCROLL_TO_ANNOTATION',
        payload: annotation.id
      })
    } catch (e) {
      console.error('[SidePanel] 定位失败:', e)
    }
  }

  /**
   * 删除标注
   */
  const handleDelete = async (id: string) => {
    try {
      const updated = annotations.filter((a) => a.id !== id)
      await setAnnotations(updated)

      // 通知Content Script移除高亮
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      })

      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'REMOVE_ANNOTATION',
          payload: id
        })
      }

      console.log('[SidePanel] 已删除标注:', id)
    } catch (e) {
      console.error('[SidePanel] 删除失败:', e)
    }
  }

  /**
   * 复制到剪贴板（新格式，仅当前页面）
   */
  const handleCopy = async () => {
    try {
      // 只导出当前页面的标注
      const pageAnnotations = annotations.filter((a) => a.pageId === currentPageId)

      // 转换为新的导出格式
      const exportData = pageAnnotations.map((annotation) => ({
        type: annotation.type,
        text: annotation.quote,
        suggestion: annotation.suggestion,
        textBefore: annotation.textQuote.prefix.slice(-10), // 取后10个字符
        textAfter: annotation.textQuote.suffix.slice(0, 10) // 取前10个字符
      }))

      const jsonString = JSON.stringify(exportData, null, 2)
      await navigator.clipboard.writeText(jsonString)
      chrome.runtime.sendMessage({
        type: 'SHOW_TOAST',
        payload: { message: '复制成功', duration: 1500, color: 'green', position: 'top' }
      })
    } catch (e) {
      console.error('[SidePanel] 复制失败:', e)
    }
  }

  /**
   * 清空全部（仅当前页面）
   */
  const handleClearAll = async () => {
    try {
      // 只清除当前页面的标注，保留其他页面的
      const remainingAnnotations = annotations.filter((a) => a.pageId !== currentPageId)
      await setAnnotations(remainingAnnotations)

      // 通知Content Script清除所有页面高亮
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      })

      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'CLEAR_ALL_ANNOTATIONS'
        })
      }

      chrome.runtime.sendMessage({
        type: 'SHOW_TOAST',
        payload: { message: '清空成功', duration: 1500, color: 'red', position: 'top' }
      })
    } catch (e) {
      console.error('[SidePanel] 清空失败:', e)
    }
  }

  return (
    <div
      data-gogo-sidepanel
      style={{
        padding: '16px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        minHeight: '100vh',
        boxSizing: 'border-box',
        background: '#fafafa',
        overflowY: 'auto',
        overflowX: 'hidden',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}
      className="hide-scrollbar"
    >
      <style>{`
        html, body { margin: 0; min-height: 100vh; }
        html::-webkit-scrollbar, body::-webkit-scrollbar { display: none !important; }
        html, body { -ms-overflow-style: none !important; scrollbar-width: none !important; }
        .hide-scrollbar::-webkit-scrollbar, [data-gogo-sidepanel]::-webkit-scrollbar { display: none !important; }
        .hide-scrollbar, [data-gogo-sidepanel] { -ms-overflow-style: none !important; scrollbar-width: none !important; }

        /* 闪烁动画 */
        @keyframes flash-border {
          0%, 100% {
            border-color: #e0e0e0;
            box-shadow: none;
          }
          25%, 75% {
            border-color: #4A90E2;
            box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.3);
          }
          50% {
            border-color: #4A90E2;
            box-shadow: 0 0 0 5px rgba(74, 144, 226, 0.5);
          }
        }

        .flash-border {
          animation: flash-border 0.5s ease-in-out 3;
        }
        /* 所有按钮（含带数字的筛选/操作按钮）悬停时显示小手 */
        button, [role="button"] {
          cursor: pointer;
        }
      `}</style>
      {/* 标题 */}
      <header style={{ marginBottom: '16px', flexShrink: 0 }}>
        <h2
          style={{
            margin: '0 0 12px',
            fontSize: '20px',
            fontWeight: 600,
            color: '#333'
          }}
        >
          🎯 我的标注
        </h2>

        {/* 筛选按钮 */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <FilterButton
            active={filter === 'all'}
            onClick={() => setFilter('all')}
          >
            全部 ({annotations.filter((a) => a.pageId === currentPageId).length})
          </FilterButton>
          <FilterButton
            active={filter === 'agree'}
            onClick={() => setFilter('agree')}
            color="#28a745"
          >
            ✓ 认可 ({annotations.filter((a) => a.pageId === currentPageId && a.type === 'agree').length})
          </FilterButton>
          <FilterButton
            active={filter === 'question'}
            onClick={() => setFilter('question')}
            color="#ffc107"
          >
            ? 质疑 ({annotations.filter((a) => a.pageId === currentPageId && a.type === 'question').length})
          </FilterButton>
        </div>

        {/* 搜索框 */}
        <input
          type="text"
          placeholder="搜索标注内容..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #e0e0e0',
            borderRadius: '6px',
            fontSize: '14px',
            outline: 'none',
            transition: 'border-color 0.2s'
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = '#4A90E2')}
          onBlur={(e) => (e.currentTarget.style.borderColor = '#e0e0e0')}
        />

        {/* 操作按钮 */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <ActionButton onClick={handleCopy} disabled={annotations.filter((a) => a.pageId === currentPageId).length === 0}>
            📋 复制
          </ActionButton>
          <ActionButton
            onClick={handleClearAll}
            disabled={annotations.filter((a) => a.pageId === currentPageId).length === 0}
            danger
          >
            🗑️ 清空全部
          </ActionButton>
        </div>
      </header>

      {/* 标注列表：自然高度，由整页滚动展示全部 */}
      <div style={{ paddingBottom: '16px' }}>
        {filteredList.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#999'
            }}
          >
            {searchText ? '未找到匹配的标注' : '暂无标注'}
          </div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {filteredList.map((annotation) => (
              <AnnotationItem
                key={annotation.id}
                annotation={annotation}
                onUpdate={(updated) => {
                  const newAnnotations = annotations.map((a) =>
                    a.id === updated.id ? updated : a
                  )
                  setAnnotations(newAnnotations)
                }}
                onLocate={() => handleScrollToAnnotation(annotation)}
                onDelete={() => handleDelete(annotation.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/**
 * 筛选按钮组件
 */
interface FilterButtonProps {
  active: boolean
  onClick: () => void
  color?: string
  children: React.ReactNode
}

function FilterButton({
  active,
  onClick,
  color = '#4A90E2',
  children
}: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 12px',
        border: `1px solid ${active ? color : '#e0e0e0'}`,
        borderRadius: '6px',
        background: active ? color : 'white',
        color: active ? 'white' : '#666',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: 500,
        transition: 'all 0.2s',
        flex: 1
      }}
    >
      {children}
    </button>
  )
}

/**
 * 操作按钮组件
 */
interface ActionButtonProps {
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  children: React.ReactNode
}

function ActionButton({
  onClick,
  disabled,
  danger,
  children
}: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '8px 12px',
        border: '1px solid #e0e0e0',
        borderRadius: '6px',
        background: 'white',
        color: danger ? '#dc3545' : '#666',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '13px',
        fontWeight: 500,
        transition: 'all 0.2s',
        opacity: disabled ? 0.5 : 1,
        flex: 1
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = danger ? '#dc3545' : '#f5f5f5'
          e.currentTarget.style.color = danger ? 'white' : '#333'
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'white'
        e.currentTarget.style.color = danger ? '#dc3545' : '#666'
      }}
    >
      {children}
    </button>
  )
}

/**
 * 标注项组件（重构版）
 */
interface AnnotationItemProps {
  annotation: GOGOAnnotation
  onUpdate: (updated: GOGOAnnotation) => void
  onLocate: () => void
  onDelete: () => void
}

function AnnotationItem({ annotation, onUpdate, onLocate, onDelete }: AnnotationItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(!annotation.suggestion) // 初始：如果没有 suggestion 则显示输入框
  const [inputValue, setInputValue] = useState(annotation.suggestion || '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 检查文本是否超过3行（估算：约150个字符 = 3行）
  const needsTruncate = annotation.quote.length > 150
  // 认可=绿色，质疑=黄色（用于外边框和反馈区）
  const typeColor = annotation.type === 'agree' ? '#28a745' : '#ffc107'

  // 根据文字长度自动伸缩输入框高度
  useEffect(() => {
    if (!isEditing) return
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 280) + 'px'
  }, [inputValue, isEditing])

  // 保存 suggestion
  const handleSave = () => {
    const updated = { ...annotation, suggestion: inputValue }
    onUpdate(updated)
    setIsEditing(false) // 保存后变为文本显示
  }

  // 修改：切换到编辑模式并聚焦输入框
  const handleEdit = () => {
    setIsEditing(true)
    // 延迟聚焦，等待 DOM 更新
    setTimeout(() => {
      const textarea = document.getElementById(
        `suggestion-${annotation.id}`
      ) as HTMLTextAreaElement
      if (textarea) {
        textarea.focus()
        textarea.selectionStart = textarea.value.length // 光标移到末尾
      }
    }, 0)
  }

  return (
    <li
      id={`annotation-${annotation.id}`}
      style={{
        padding: '12px',
        marginBottom: '8px',
        background: 'white',
        border: `2px solid ${typeColor}`,
        borderRadius: '8px',
        transition: 'all 0.2s'
      }}
    >
      {/* 文本内容区域 */}
      <div style={{ marginBottom: '12px' }}>
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: 500,
            color: '#333',
            lineHeight: '1.6',
            wordBreak: 'break-word',
            display: 'inline'
          }}
        >
          "
          {isExpanded
            ? annotation.quote
            : needsTruncate
            ? annotation.quote.substring(0, 150) + '...'
            : annotation.quote}
          "
          {/* 展开/收起文字链接 */}
          {needsTruncate && (
            <span
              onClick={() => setIsExpanded(!isExpanded)}
              style={{
                marginLeft: '6px',
                color: '#4A90E2',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                textDecoration: 'none',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#2a6ab0'
                e.currentTarget.style.textDecoration = 'underline'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#4A90E2'
                e.currentTarget.style.textDecoration = 'none'
              }}
            >
              {isExpanded ? '收起' : '展开'}
            </span>
          )}
        </p>
      </div>

      {/* 非编辑时显示「认可」/「质疑」+ 内容同一行；编辑时不显示标签 */}
      <div
        style={{
          marginBottom: '12px',
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'nowrap',
          alignItems: 'center',
          gap: '8px',
          minWidth: 0
        }}
      >
        {!isEditing && (
          <span
            style={{
              flexShrink: 0,
              fontSize: '13px',
              fontWeight: 600,
              color: typeColor,
              whiteSpace: 'nowrap'
            }}
          >
            {annotation.type === 'agree' ? '认可' : '质疑'}
          </span>
        )}
        {isEditing ? (
          <textarea
            ref={textareaRef}
            id={`suggestion-${annotation.id}`}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="输入您的反馈建议..."
            rows={1}
            className="hide-scrollbar"
            style={{
              flex: 1,
              minHeight: '40px',
              maxHeight: '280px',
              minWidth: 0,
              padding: '10px',
              border: '1px solid #e0e0e0',
              borderRadius: '6px',
              fontSize: '13px',
              fontFamily: 'inherit',
              resize: 'none',
              outline: 'none',
              overflowY: 'auto',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              transition: 'border-color 0.2s',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#b0b0b0')}
            onBlur={(e) => (e.currentTarget.style.borderColor = '#e0e0e0')}
          />
        ) : (
          <span
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: '13px',
              color: '#555',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: 'block'
            }}
            title={inputValue || undefined}
          >
            {inputValue || '（暂无反馈）'}
          </span>
        )}
      </div>

      {/* 操作按钮组（始终显示） */}
      <div
        style={{
          display: 'flex',
          gap: '8px'
        }}
      >
        {isEditing ? (
          // 编辑模式：显示保存按钮
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid #28a745',
              borderRadius: '6px',
              background: 'white',
              color: '#28a745',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              transition: 'all 0.2s'
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
            💾 保存
          </button>
        ) : (
          // 显示模式：显示修改按钮
          <button
            onClick={handleEdit}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid #4A90E2',
              borderRadius: '6px',
              background: 'white',
              color: '#4A90E2',
              cursor: 'pointer',
              fontSize: '13px',
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
            ✏️ 修改
          </button>
        )}

        {/* 定位按钮 */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onLocate()
          }}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: '1px solid #6c757d',
            borderRadius: '6px',
            background: 'white',
            color: '#6c757d',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#6c757d'
            e.currentTarget.style.color = 'white'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'white'
            e.currentTarget.style.color = '#6c757d'
          }}
        >
          🎯 定位
        </button>

        {/* 删除按钮 */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: '1px solid #dc3545',
            borderRadius: '6px',
            background: 'white',
            color: '#dc3545',
            cursor: 'pointer',
            fontSize: '13px',
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
    </li>
  )
}
