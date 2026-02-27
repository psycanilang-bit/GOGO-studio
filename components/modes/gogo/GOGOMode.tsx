/**
 * GOGO 阅读标注模式主入口
 * 处理文本选择、标注创建、持久化
 */

import { useState, useEffect, useRef } from 'react'
import { useEventListener } from '~hooks/useEventListener'
import { useStorage } from '~hooks/useStorage'
import { safeSendMessage } from '~utils/message'
import { getPageId } from '~utils/pageId'
import AnnotationMenu from './ui/AnnotationMenu'
import HighlightTooltip from './ui/HighlightTooltip'
import {
  captureTextSelection,
  highlightRange,
  restoreHighlight,
  removeHighlight,
  clearAllHighlights
} from './core/highlighter'
import { createLocationInfo, scrollToAnnotation } from './core/locator'
import type { GOGOAnnotation, Position } from '~types'

/**
 * GOGO模式组件
 *
 * @remarks
 * 此组件不应作为独立的content script运行
 * 而是由主协调器（contents/index.tsx）条件渲染
 */
export default function GOGOMode() {
  const [menuVisible, setMenuVisible] = useState(false)
  const [menuPosition, setMenuPosition] = useState<Position>({ x: 0, y: 0 })
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState<Position>({ x: 0, y: 0 })
  const [selectedAnnotation, setSelectedAnnotation] =
    useState<GOGOAnnotation | null>(null)
  const [annotations, setAnnotations, isAnnotationsLoaded] = useStorage<GOGOAnnotation[]>(
    'annotations',
    []
  )

  // 使用 ref 确保在恢复时访问到最新的 annotations
  const annotationsRef = useRef(annotations)
  useEffect(() => {
    annotationsRef.current = annotations
  }, [annotations])

  // 调试：组件挂载和卸载
  useEffect(() => {
    console.log('[GOGO] ✅ GOGOMode组件已挂载')
    return () => {
      console.log('[GOGO] 🧹 GOGOMode组件已卸载，清理所有高亮标注')
      clearAllHighlights()
    }
  }, [])

  /**
   * 页面加载时恢复所有高亮（带轮询重试机制）
   * 等待 annotations 从 storage 加载完成后再执行
   * 只在组件挂载后执行一次，不依赖 annotations 变化
   */
  useEffect(() => {
    if (!isAnnotationsLoaded) {
      console.log('[GOGO] 等待annotations加载...')
      return
    }

    // 轮询参数配置
    const RETRY_INTERVAL = 500 // 每次重试间隔 500ms
    const MAX_RETRIES = 20 // 最多重试 20 次（总共 10 秒）

    /**
     * 带重试机制的高亮恢复函数
     * @param annotation - 标注对象
     * @param retryCount - 当前重试次数
     */
    const tryRestoreWithRetry = (
      annotation: GOGOAnnotation,
      retryCount: number = 0
    ) => {
      // 检查页面内容是否已加载（通过检测精确文本是否存在）
      const pageText = document.body.textContent || ''
      const textExists = pageText.includes(annotation.textQuote.exact)

      if (!textExists) {
        if (retryCount < MAX_RETRIES) {
          // 内容还未加载，继续等待重试
          console.log(
            `[GOGO] 🔄 标注 ${annotation.id.substring(0, 8)}... 的内容未加载，` +
            `${RETRY_INTERVAL}ms 后重试 (${retryCount + 1}/${MAX_RETRIES})`
          )
          setTimeout(() => {
            tryRestoreWithRetry(annotation, retryCount + 1)
          }, RETRY_INTERVAL)
        } else {
          // 超时放弃
          console.warn(
            `[GOGO] ⏱️ 标注 ${annotation.id.substring(0, 8)}... 恢复超时，` +
            `页面内容可能未加载或已改变`
          )
        }
        return
      }

      // 内容已加载，尝试恢复高亮
      console.log(
        `[GOGO] ✓ 标注 ${annotation.id.substring(0, 8)}... 的内容已加载，` +
        `开始恢复 (重试了 ${retryCount} 次)`
      )
      const success = restoreHighlight(
        annotation.id,
        annotation.xpath,
        annotation.textQuote,
        annotation.type
      )

      if (success) {
        console.log(`[GOGO] ✅ 标注 ${annotation.id.substring(0, 8)}... 恢复成功`)
      } else {
        console.warn(`[GOGO] ⚠️ 标注 ${annotation.id.substring(0, 8)}... 恢复失败`)
      }
    }

    // 确保 DOM 完全加载后再开始恢复
    const restoreWhenReady = () => {
      // 检查 document.body 是否存在且已渲染
      if (!document.body || document.readyState === 'loading') {
        console.log('[GOGO] DOM 未准备好，等待...')
        return
      }

      const currentPageId = getPageId(window.location.href)
      const currentAnnotations = annotationsRef.current // 使用 ref 获取最新值
      const pageAnnotations = currentAnnotations.filter((a) => a.pageId === currentPageId)

      console.log(`[GOGO] annotations已加载，当前PageId: ${currentPageId}`)
      console.log(`[GOGO] 总共${currentAnnotations.length}个标注，当前页面${pageAnnotations.length}个`)

      if (pageAnnotations.length === 0) {
        console.log('[GOGO] 当前页面没有标注需要恢复')
        return
      }

      console.log(`[GOGO] 开始恢复 ${pageAnnotations.length} 个高亮（带轮询重试）...`)

      // 为每个标注启动独立的轮询恢复
      pageAnnotations.forEach((annotation, index) => {
        console.log(
          `[GOGO] [${index + 1}/${pageAnnotations.length}] 尝试恢复标注:`,
          annotation.id.substring(0, 8) + '...',
          annotation.quote.substring(0, 30)
        )
        tryRestoreWithRetry(annotation, 0)
      })

      // 验证：定期检查 DOM 中的高亮元素数量
      const checkInterval = setInterval(() => {
        const marks = document.querySelectorAll('[data-gogo-id]')
        console.log(`[GOGO] 📊 当前已恢复 ${marks.length}/${pageAnnotations.length} 个高亮`)

        // 如果全部恢复成功，停止检查
        if (marks.length === pageAnnotations.length) {
          console.log('[GOGO] 🎉 所有高亮恢复完成！')
          clearInterval(checkInterval)
        }
      }, 1000)

      // 最多检查 15 秒后停止
      setTimeout(() => {
        clearInterval(checkInterval)
        const marks = document.querySelectorAll('[data-gogo-id]')
        console.log(
          `[GOGO] 高亮恢复结束，最终恢复 ${marks.length}/${pageAnnotations.length} 个`
        )
      }, 15000)
    }

    // 如果 DOM 已经准备好，立即执行
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      console.log('[GOGO] DOM 已准备好，立即开始恢复流程')
      // 稍微延迟一下，确保页面完全渲染
      setTimeout(restoreWhenReady, 100)
    } else {
      // 否则等待 DOMContentLoaded
      console.log('[GOGO] 等待 DOMContentLoaded 事件')
      document.addEventListener('DOMContentLoaded', restoreWhenReady, { once: true })
    }

    return () => {
      document.removeEventListener('DOMContentLoaded', restoreWhenReady)
    }
  }, [isAnnotationsLoaded]) // 只依赖 isAnnotationsLoaded，不依赖 annotations

  /**
   * 监听消息（侧边栏操作）
   */
  useEffect(() => {
    const handleMessage = (message: any) => {
      switch (message.type) {
        case 'SCROLL_TO_ANNOTATION':
          scrollToAnnotation(message.payload)
          break

        case 'REMOVE_ANNOTATION':
          removeHighlight(message.payload)
          break

        case 'CLEAR_ALL_ANNOTATIONS':
          console.log('[GOGO] 收到清空全部标注消息，清除页面高亮')
          clearAllHighlights()
          break
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage)

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage)
    }
  }, [])

  /**
   * 监听文本选择和高亮标记点击
   */
  useEventListener('mouseup', (e) => {
    const target = e.target as HTMLElement
    console.log('[GOGO] mouseup 事件触发, target:', target.tagName)

    // 检查是否点击了高亮标记
    const mark = target.closest('mark[data-gogo-id]') as HTMLElement
    if (mark) {
      console.log('[GOGO] 点击了高亮标记:', mark.dataset.gogoId)
      const annotationId = mark.dataset.gogoId
      const annotation = annotations.find((a) => a.id === annotationId)

      if (annotation) {
        // 显示tooltip
        const rect = mark.getBoundingClientRect()
        setTooltipPosition({
          x: rect.left, // fixed定位
          y: rect.bottom // fixed定位
        })
        setSelectedAnnotation(annotation)
        setTooltipVisible(true)
        setMenuVisible(false) // 关闭标注菜单
        return
      }
    }

    // 处理文本选择
    const range = captureTextSelection()
    console.log('[GOGO] 获取到的range:', range)

    if (!range || range.collapsed) {
      console.log('[GOGO] 无有效选择，关闭菜单')
      setMenuVisible(false)
      return
    }

    console.log('[GOGO] 选中文本:', range.toString())

    // 忽略在菜单内的点击
    if (target.closest('.gogo-annotation-menu')) {
      console.log('[GOGO] 点击在菜单内，忽略')
      return
    }

    // 忽略在tooltip内的点击
    if (target.closest('.gogo-highlight-tooltip')) {
      console.log('[GOGO] 点击在tooltip内，忽略')
      return
    }

    // 显示标注菜单
    const rect = range.getBoundingClientRect()
    const menuPos = {
      x: rect.left, // fixed定位，不需要加scrollX
      y: rect.bottom // fixed定位，不需要加scrollY
    }
    console.log('[GOGO] 显示标注菜单，位置:', menuPos, 'rect:', rect)
    setMenuPosition(menuPos)
    setMenuVisible(true)
    setTooltipVisible(false) // 关闭tooltip
  })

  /**
   * 点击页面其他地方关闭菜单和tooltip
   */
  useEventListener('mousedown', (e) => {
    const target = e.target as HTMLElement
    if (
      !target.closest('.gogo-annotation-menu') &&
      !target.closest('.gogo-highlight-tooltip') &&
      !target.closest('mark[data-gogo-id]')
    ) {
      setMenuVisible(false)
      setTooltipVisible(false)
    }
  })

  /**
   * ESC键关闭菜单和tooltip
   */
  useEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      setMenuVisible(false)
      setTooltipVisible(false)
    }
  })

  /**
   * 创建标注
   */
  const handleAnnotate = async (type: 'agree' | 'question') => {
    console.log('[GOGO] 开始创建标注，类型:', type)
    const range = captureTextSelection()
    if (!range) {
      console.warn('[GOGO] 无法获取选择范围')
      return
    }

    console.log('[GOGO] 选中的文本:', range.toString())

    try {
      // 1. 先生成定位信息（在 DOM 被修改之前）
      console.log('[GOGO] 步骤1: 生成定位信息')
      const { xpath, textQuote } = createLocationInfo(range)
      console.log('[GOGO] XPath:', xpath)
      console.log('[GOGO] TextQuote:', textQuote)

      // 验证定位信息
      if (!xpath) {
        console.error('[GOGO] ❌ XPath 生成失败')
        throw new Error('XPath 生成失败')
      }
      if (!textQuote.exact) {
        console.error('[GOGO] ❌ TextQuote 生成失败')
        throw new Error('TextQuote 生成失败')
      }

      // 2. 创建高亮（会修改 DOM）
      console.log('[GOGO] 步骤2: 创建高亮标记')
      const mark = highlightRange(range, type)

      if (!mark || !mark.dataset.gogoId) {
        console.error('[GOGO] ❌ 高亮标记创建失败')
        throw new Error('高亮标记创建失败')
      }

      console.log('[GOGO] 高亮标记已创建, ID:', mark.dataset.gogoId)

      // 3. 构建标注对象
      const annotation: GOGOAnnotation = {
        id: mark.dataset.gogoId!,
        url: window.location.href,
        pageId: getPageId(window.location.href),
        type,
        suggestion: '', // 初始为空，用户稍后在侧边栏填写
        quote: textQuote.exact, // 使用 textQuote.exact 确保文本完整
        xpath,
        textQuote,
        createdAt: Date.now()
      }

      console.log('[GOGO] 步骤3: 标注对象已构建:', annotation)

      // 4. 保存到storage
      console.log('[GOGO] 步骤4: 保存到storage')
      await setAnnotations([...annotations, annotation])

      console.log('[GOGO] 标注已创建:', annotation)

      // 5. 通知侧边栏更新
      safeSendMessage({
        type: 'NEW_ANNOTATION',
        payload: annotation
      })

      // 6. 显示成功提示
      safeSendMessage({
        type: 'SHOW_TOAST',
        payload: { message: '标注成功', duration: 2000 }
      })

      // 清除选择
      window.getSelection()?.removeAllRanges()
      setMenuVisible(false)
    } catch (e) {
      console.error('[GOGO] 创建标注失败:', e)

      safeSendMessage({
        type: 'SHOW_TOAST',
        payload: { message: '标注失败，请重试', duration: 2000 }
      })
    }
  }

  /**
   * 定位到侧边栏
   */
  const handleNavigateToSidebar = () => {
    if (!selectedAnnotation) return

    // 打开侧边栏
    safeSendMessage({ type: 'OPEN_SIDEPANEL' })

    // 发送滚动消息（侧边栏接收后会滚动到对应标注）
    setTimeout(() => {
      safeSendMessage({
        type: 'SCROLL_TO_SIDEBAR_ANNOTATION',
        payload: selectedAnnotation.id
      })
    }, 500)

    setTooltipVisible(false)
  }

  /**
   * 删除标注
   */
  const handleDeleteAnnotation = async () => {
    if (!selectedAnnotation) return

    console.log('[GOGO] 删除标注:', selectedAnnotation.id)

    try {
      // 1. 从storage中删除
      await setAnnotations(annotations.filter((a) => a.id !== selectedAnnotation.id))
      console.log('[GOGO] 已从storage删除标注')

      // 2. 移除DOM中的高亮
      removeHighlight(selectedAnnotation.id)
      console.log('[GOGO] 已移除DOM高亮')

      // 3. 通知侧边栏更新
      safeSendMessage({
        type: 'REMOVE_ANNOTATION',
        payload: selectedAnnotation.id
      })

      safeSendMessage({
        type: 'SHOW_TOAST',
        payload: { message: '标注已删除', duration: 2000 }
      })

      setTooltipVisible(false)
      setSelectedAnnotation(null)
    } catch (e) {
      console.error('[GOGO] 删除标注失败:', e)
    }
  }

  return (
    <>
      {menuVisible && (
        <>
          {console.log('[GOGO] 渲染标注菜单, 位置:', menuPosition)}
          <AnnotationMenu
            position={menuPosition}
            onAnnotate={handleAnnotate}
            onClose={() => setMenuVisible(false)}
          />
        </>
      )}

      {tooltipVisible && selectedAnnotation && (
        <HighlightTooltip
          annotation={selectedAnnotation}
          position={tooltipPosition}
          onClose={() => setTooltipVisible(false)}
          onNavigateToSidebar={handleNavigateToSidebar}
          onDelete={handleDeleteAnnotation}
        />
      )}
    </>
  )
}
