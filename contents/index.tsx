/**
 * GOGO Studio 主入口
 * 统一协调控制台、GOGO模式、Hunter模式的渲染和切换
 */

import { useState, useEffect } from 'react'
import type { PlasmoCSConfig } from 'plasmo'
import { useMode } from '~hooks/useMode'
import { useStorage } from '~hooks/useStorage'
import { safeSendMessage } from '~utils/message'
import { getPageId } from '~utils/pageId'
import Toast from '~components/shared/Toast'
import GOGOMode from '~components/modes/gogo/GOGOMode'
import HunterMode from '~components/modes/hunter/HunterMode'
import RecordOverlays from '~components/modes/hunter/ui/RecordOverlays'
import type { GOGOAnnotation } from '~types'

/**
 * 检测扩展context是否失效
 */
function isExtensionContextValid(): boolean {
  try {
    return chrome.runtime?.id !== undefined
  } catch {
    return false
  }
}

/**
 * 显示重载提示
 */
function showReloadNotice() {
  const notice = document.createElement('div')
  notice.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #ff4444;
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-family: system-ui, sans-serif;
    font-size: 14px;
    z-index: 9999999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `
  notice.textContent = '扩展已更新，请刷新页面 (F5)'
  document.body.appendChild(notice)
}

/**
 * Content Script 配置
 */
export const config: PlasmoCSConfig = {
  matches: ['<all_urls>'],
  all_frames: false
}

// 不使用 Shadow DOM，直接在主 DOM 中运行
// 这样才能正确操作页面元素（高亮、事件监听等）

/**
 * 主应用组件
 */
export default function ContentScript() {
  const { currentMode, switchMode, isModeLoaded } = useMode()
  const [annotations, , isAnnotationsLoaded] = useStorage<GOGOAnnotation[]>('annotations', [])
  const [toastPayload, setToastPayload] = useState<{
    message: string
    duration: number
    color: 'green' | 'red' | 'yellow' | 'default'
    position: 'top' | 'bottom'
  } | null>(null)

  // Toast 自动消失
  useEffect(() => {
    if (!toastPayload) return
    const t = setTimeout(() => setToastPayload(null), toastPayload.duration)
    return () => clearTimeout(t)
  }, [toastPayload])

  // 调试：监控模式加载状态
  useEffect(() => {
    console.log('[ContentScript] isModeLoaded:', isModeLoaded, 'currentMode:', currentMode)
  }, [isModeLoaded, currentMode])

  /**
   * 智能模式切换：如果当前是 OFF 模式，但页面有标注，自动切换到 GOGO 模式
   * 这样确保刷新页面后，有标注的页面会自动显示高亮
   */
  useEffect(() => {
    if (!isModeLoaded || !isAnnotationsLoaded) {
      console.log('[ContentScript] 等待模式和标注数据加载...')
      return
    }

    const currentPageId = getPageId(window.location.href)
    const hasAnnotations = annotations.some((a) => a.pageId === currentPageId)

    console.log(`[ContentScript] 智能模式检测 - PageId: ${currentPageId}`)
    console.log(`[ContentScript] 当前模式: ${currentMode}, 是否有标注: ${hasAnnotations}`)

    if (currentMode === 'OFF' && hasAnnotations) {
      console.log('[ContentScript] 🔄 检测到页面有标注，自动切换到 GOGO 模式')
      switchMode('GOGO')
    }
  }, [isModeLoaded, isAnnotationsLoaded, currentMode, annotations, switchMode])

  // 检测扩展context失效
  useEffect(() => {
    const checkInterval = setInterval(() => {
      if (!isExtensionContextValid()) {
        console.error('[GOGO Studio] Extension context invalidated - 请刷新页面')
        clearInterval(checkInterval)
        showReloadNotice()
      }
    }, 1000)

    return () => clearInterval(checkInterval)
  }, [])

  /**
   * 注入全局样式到页面
   */
  useEffect(() => {
    const styleId = 'gogo-studio-global-styles'

    // 检查是否已存在
    if (document.getElementById(styleId)) return

    const styleElement = document.createElement('style')
    styleElement.id = styleId
    styleElement.textContent = `
      /* Hunter模式光标 - 使用data-mode属性精确控制 */
      body[data-mode='hunter'] {
        cursor: crosshair !important;
      }

      body[data-mode='hunter'] * {
        cursor: crosshair !important;
      }

      /* 浮动控制台及其子元素不受Hunter光标影响 */
      body[data-mode='hunter'] .floating-console,
      body[data-mode='hunter'] .floating-console *,
      body[data-mode='hunter'] [id^="gogo-console-root"],
      body[data-mode='hunter'] [id^="gogo-console-root"] * {
        cursor: default !important;
      }

      body[data-mode='hunter'] .floating-console button,
      body[data-mode='hunter'] [id^="gogo-console-root"] button {
        cursor: pointer !important;
      }

      body[data-mode='hunter'] .console-header {
        cursor: grab !important;
      }

      body[data-mode='hunter'] .console-header:active {
        cursor: grabbing !important;
      }

      /* Hunter模式下的数字编号圆圈显示手势光标 */
      body[data-mode='hunter'] .record-badge {
        cursor: pointer !important;
      }

      /* Hunter模式下的编辑面板按钮显示手势光标 */
      body[data-mode='hunter'] .hunter-edit-panel button {
        cursor: pointer !important;
      }

      /* GOGO模式 - 不设置body光标，让浏览器自然处理 */
      /* 只给特定元素设置光标 */

      /* GOGO模式下高亮标记可点击 */
      body[data-mode='gogo'] mark[data-gogo-id] {
        cursor: pointer !important;
      }

      /* 标注菜单和tooltip内的按钮 */
      .gogo-annotation-menu button,
      .gogo-highlight-tooltip button {
        cursor: pointer !important;
      }

      /* GOGO高亮样式 */
      mark[data-gogo-id] {
        background: transparent;
        transition: all 0.2s;
      }

      mark.gogo-highlight-agree {
        background-color: #d4edda;
        border-bottom: 2px solid #28a745;
      }

      mark.gogo-highlight-agree:hover {
        background-color: #c3e6cb;
      }

      mark.gogo-highlight-question {
        background-color: #fff3cd;
        border-bottom: 2px solid #ffc107;
      }

      mark.gogo-highlight-question:hover {
        background-color: #ffeaa7;
      }

      mark.gogo-highlight-flash {
        animation: gogo-flash 1s ease-in-out;
      }

      @keyframes gogo-flash {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
      }

      /* Toast动画 */
      @keyframes gogo-toast-fade-in {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `
    document.head.appendChild(styleElement)

    return () => {
      // 清理：移除样式
      document.getElementById(styleId)?.remove()
    }
  }, [])

  /**
   * 监听消息
   */
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (!isExtensionContextValid()) return

      switch (message.type) {
        case 'SHOW_TOAST': {
          const p = message.payload
          setToastPayload({
            message: p.message,
            duration: p.duration ?? 2000,
            color: p.color ?? 'default',
            position: p.position ?? 'top'
          })
          break
        }

        case 'OPEN_SIDEPANEL':
          // 打开侧边栏（需要background script支持）
          safeSendMessage({ type: 'OPEN_SIDEPANEL' })
          break
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage)

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage)
    }
  }, [])

  /**
   * 模式切换时的通知和状态管理
   */
  useEffect(() => {
    console.log(`[ContentScript] 模式切换: ${currentMode}`)

    // 清理旧状态
    delete document.body.dataset.mode

    if (currentMode === 'OFF') {
      console.log(`[ContentScript] 清理所有模式`)
      return
    }

    // 设置当前模式
    const modeValue = currentMode.toLowerCase()
    document.body.dataset.mode = modeValue
    console.log(`[ContentScript] body.dataset.mode = "${modeValue}"`)

    // 显示切换提示（主页面顶部居中）
    const modeText = currentMode === 'GOGO' ? '🎯 GOGO阅读标注模式' : '🔍 DOM猎手模式'
    setToastPayload({
      message: `已切换至 ${modeText}`,
      duration: 2000,
      color: 'default',
      position: 'top'
    })

    return () => {
      console.log(`[ContentScript] 清理模式: ${currentMode}`)
      delete document.body.dataset.mode
    }
  }, [currentMode])

  /**
   * 根据模式渲染对应组件
   * 使用key属性强制React在模式切换时完全卸载旧组件
   * 等待模式加载完成后再渲染，避免默认值导致错误渲染
   */
  return (
    <>
      {/* 控制台始终显示 */}
      {/* 注意：控制台在单独的CSUI中渲染（contents/console.tsx） */}

      {/* 等待模式加载完成后再渲染模式组件 */}
      {/* GOGO 模式：只显示 GOGO 标注 */}
      {isModeLoaded && currentMode === 'GOGO' && <GOGOMode key="gogo-mode" />}

      {/* 猎手模式：只显示猎手记录和猎手功能 */}
      {isModeLoaded && currentMode === 'HUNTER' && (
        <>
          <RecordOverlays />
          <HunterMode key="hunter-mode" />
        </>
      )}

      {/* Toast提示（主页面顶部居中，支持颜色） */}
      {toastPayload && (
        <Toast
          message={toastPayload.message}
          color={toastPayload.color}
          position={toastPayload.position}
        />
      )}
    </>
  )
}
