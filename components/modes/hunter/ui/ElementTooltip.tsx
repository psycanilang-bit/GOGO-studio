/**
 * Hunter 元素信息Tooltip
 * 显示元素详细信息并提供复制功能
 */

import type { Position, ElementInfo } from '~types'
import { copyToClipboard } from '~utils/clipboard'

interface Props {
  element: HTMLElement
  position: Position
  onClose: () => void
}

/**
 * 元素信息Tooltip
 *
 * @remarks
 * - 显示标签名、ID、Class、选择器
 * - 复制选择器到剪贴板
 * - 点击外部关闭
 *
 * @design
 * - 白色背景、圆角阴影
 * - 代码样式显示技术信息
 * - 悬停效果提升交互体验
 */
export default function ElementTooltip({ element, position, onClose }: Props) {
  const { extractElementInfo } = require('../core/selector')
  const info: ElementInfo = extractElementInfo(element)

  /**
   * 复制选择器
   */
  const handleCopy = async () => {
    try {
      await copyToClipboard(info.selector)

      // 显示成功提示
      chrome.runtime.sendMessage({
        type: 'SHOW_TOAST',
        payload: { message: '✓ 选择器已复制', duration: 2000 }
      })
    } catch (e) {
      console.error('[Hunter] 复制失败:', e)

      chrome.runtime.sendMessage({
        type: 'SHOW_TOAST',
        payload: { message: '✗ 复制失败', duration: 2000 }
      })
    }
  }

  /**
   * 复制XPath
   */
  const handleCopyXPath = async () => {
    try {
      await copyToClipboard(info.xpath)

      chrome.runtime.sendMessage({
        type: 'SHOW_TOAST',
        payload: { message: '✓ XPath已复制', duration: 2000 }
      })
    } catch (e) {
      console.error('[Hunter] 复制XPath失败:', e)
    }
  }

  return (
    <div
      className="hunter-tooltip"
      style={{
        position: 'absolute',
        top: `${position.y + 10}px`,
        left: `${position.x}px`,
        background: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '12px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        zIndex: 1000000,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '13px',
        minWidth: '300px',
        maxWidth: '500px'
      }}
    >
      {/* 标题 */}
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
        <span style={{ fontWeight: 600, color: '#4A90E2' }}>🔍 元素信息</span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            color: '#999',
            fontSize: '16px'
          }}
        >
          ✕
        </button>
      </div>

      {/* 信息列表 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <InfoRow label="标签" value={`<${info.tagName}>`} />

        {info.id && <InfoRow label="ID" value={`#${info.id}`} />}

        {info.classes.length > 0 && (
          <InfoRow label="Classes" value={info.classes.join(', ')} />
        )}

        <InfoRow
          label="选择器"
          value={info.selector}
          isCode
          onCopy={handleCopy}
        />

        <InfoRow label="XPath" value={info.xpath} isCode onCopy={handleCopyXPath} />
      </div>
    </div>
  )
}

/**
 * 信息行组件
 */
interface InfoRowProps {
  label: string
  value: string
  isCode?: boolean
  onCopy?: () => void
}

function InfoRow({ label, value, isCode, onCopy }: InfoRowProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <span style={{ fontWeight: 500, fontSize: '12px', color: '#666' }}>
        {label}:
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <code
          style={{
            flex: 1,
            padding: isCode ? '6px 8px' : '4px',
            background: '#f5f5f5',
            borderRadius: '4px',
            fontSize: '12px',
            fontFamily: 'Monaco, Consolas, monospace',
            wordBreak: 'break-all',
            maxHeight: '60px',
            overflowY: 'auto'
          }}
        >
          {value}
        </code>
        {onCopy && (
          <button
            onClick={onCopy}
            style={{
              padding: '6px 10px',
              border: '1px solid #4A90E2',
              borderRadius: '4px',
              background: 'white',
              color: '#4A90E2',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 500,
              whiteSpace: 'nowrap',
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
            📋 复制
          </button>
        )}
      </div>
    </div>
  )
}
