/**
 * Toast 提示组件
 * 用于显示临时消息（操作成功、错误提示等）
 */

import { createPortal } from 'react-dom'

export type ToastColor = 'green' | 'red' | 'yellow' | 'default'
export type ToastPosition = 'top' | 'bottom'

interface Props {
  message: string
  color?: ToastColor
  position?: ToastPosition
}

const colorMap: Record<ToastColor, string> = {
  green: '#28a745',
  red: '#dc3545',
  yellow: '#ffc107',
  default: '#323232'
}

/**
 * Toast提示
 *
 * @remarks
 * - 支持顶部居中或底部右下角
 * - 支持绿色/红色/默认背景
 * - 由父组件控制显示时长
 */
export default function Toast({
  message,
  color = 'default',
  position = 'bottom'
}: Props) {
  const isTop = position === 'top'
  const toast = (
    <div
      className="gogo-toast"
      style={{
        position: 'fixed',
        ...(isTop
          ? { top: '20px', left: '50%', transform: 'translateX(-50%)' }
          : { bottom: '20px', right: '20px' }),
        background: colorMap[color],
        color: 'white',
        padding: '12px 24px',
        borderRadius: '6px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        zIndex: 2147483645,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '14px',
        animation: 'gogo-toast-fade-in 0.3s ease-in-out',
        maxWidth: '300px',
        wordWrap: 'break-word',
        pointerEvents: 'none'
      }}
    >
      {message}
    </div>
  )

  return createPortal(toast, document.body)
}
