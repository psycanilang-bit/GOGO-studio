/**
 * DOM Hunter 元素猎手模式主入口（v1.3）
 * 支持点击选择和拖拽框选两种模式
 */

import { useState, useEffect, useRef } from 'react'
import { useStorage } from '~hooks/useStorage'
import { useEventListener } from '~hooks/useEventListener'
import { getPageId } from '~utils/pageId'
import HunterCanvas from './ui/Canvas'
import EditPanel from './ui/EditPanel'
import HoverPreview from './ui/HoverPreview'
import HighlightOverlay from './ui/HighlightOverlay'
import { generateSelector } from './core/selector'
import { cleanHTML } from '~utils/htmlCleaner'
import {
  detectElementAtPosition,
  isMeaningfulElement
} from './core/detector'
import {
  findCommonAncestor,
  isReasonableAncestor,
  getAncestorSummary,
  getOutermostElements
} from './core/ancestor'
import type { Position, DomRecord, SelectionType } from '~types'

/**
 * Hunter模式组件（v1.3 - DOM 智能吸附模式）
 *
 * @remarks
 * 支持两种选择模式：
 * 1. 点击选择 → 蓝色虚线边框 → 单个元素
 * 2. 拖拽框选 → 绿色虚线边框 → 公共祖先容器
 *
 * 核心交互：
 * - 鼠标移动 → 悬停预览元素名
 * - 点击元素 → 单选模式（移动距离 < 5px）
 * - 拖拽框选 → 多选模式（移动距离 >= 5px，计算公共祖先）
 */
export default function HunterMode() {
  // 悬停状态
  const [hoverElement, setHoverElement] = useState<HTMLElement | null>(null)
  const [hoverPosition, setHoverPosition] = useState<Position>({ x: 0, y: 0 })

  // 选中状态
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null)
  /** 群组态时多个最外层元素（用于 Group (X items) 展示） */
  const [selectedElements, setSelectedElements] = useState<HTMLElement[] | null>(null)
  const [selectionType, setSelectionType] = useState<SelectionType>('single')
  const [elementCount, setElementCount] = useState<number>(0)

  // UI 状态
  const [showEditPanel, setShowEditPanel] = useState(false)
  const [panelPosition, setPanelPosition] = useState<Position>({ x: 0, y: 0 })

  // 拖拽状态（v1.3 新增 - 仅 Shift+拖拽 进入框选）
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartPos, setDragStartPos] = useState<Position | null>(null)
  const mouseDownPos = useRef<Position | null>(null)
  const hasMoved = useRef(false)

  // 数据存储
  const [records, setRecords] = useStorage<DomRecord[]>('hunter-records', [])

  /**
   * 组件卸载时清理
   */
  useEffect(() => {
    return () => {
      setHoverElement(null)
      setSelectedElement(null)
    }
  }, [])

  /**
   * 鼠标移动事件 - 悬停预览
   */
  useEventListener('mousemove', (e) => {
    // 如果正在编辑，不显示悬停预览
    if (showEditPanel) return

    // 如果正在拖拽，不更新悬停预览
    if (isDragging) return

    const element = detectElementAtPosition(e.clientX, e.clientY)

    setHoverElement(element)
    setHoverPosition({ x: e.clientX, y: e.clientY })
  })

  /** 按下时是否按住 Shift（仅 Shift+拖拽 进入框选） */
  const shiftKeyOnDown = useRef(false)

  /**
   * 点击事件拦截器（捕获阶段）- 阻止页面元素的默认点击行为
   *
   * @remarks
   * 在猎手模式下，点击页面元素应该只选中，不触发原本功能
   * 白名单元素允许正常点击：控制台、编辑面板、记录徽章等
   */
  useEventListener(
    'click',
    (e) => {
      // 使用 composedPath 获取真实的事件目标（穿透 Shadow DOM）
      const path = e.composedPath()
      const realTarget = path[0] as HTMLElement

      console.log('[Hunter] 捕获到点击事件:', {
        target: e.target,
        realTarget: realTarget,
        targetTag: (e.target as HTMLElement)?.tagName,
        realTargetTag: realTarget?.tagName,
        path: path.slice(0, 5).map(el => (el as HTMLElement)?.tagName || el)
      })

      // 确保 target 是 Element 类型（处理文本节点情况）
      let element = realTarget
      if (element.nodeType === Node.TEXT_NODE) {
        element = element.parentElement as HTMLElement
      }

      // 白名单：这些元素允许正常点击
      const allowedSelectors = [
        '.floating-console',      // 控制台
        '#gogo-console-root',     // 控制台根元素
        '.record-badge',          // 记录徽章（删除按钮）
        '.hunter-edit-panel',     // 编辑面板（确定/取消按钮）
        '.hunter-highlight-overlay', // 高亮覆盖层
        'plasmo-csui',            // Plasmo 容器（如果点击的是内部元素）
      ]

      // 检查是否在白名单中（使用 closest 向上查找父元素）
      const isAllowed = element && allowedSelectors.some(selector => {
        try {
          return element.closest?.(selector) !== null
        } catch {
          return false
        }
      })

      console.log('[Hunter] 白名单检查:', {
        element: element?.tagName,
        className: element?.className,
        isAllowed,
        closestEditPanel: element?.closest?.('.hunter-edit-panel'),
        closestPlasmo: element?.closest?.('plasmo-csui')
      })

      if (!isAllowed) {
        console.log('[Hunter] ❌ 阻止点击事件')
        // 阻止默认行为（如按钮点击、链接跳转）
        e.preventDefault()
        // 阻止事件冒泡
        e.stopPropagation()
        // 阻止其他监听器执行
        e.stopImmediatePropagation()
      } else {
        console.log('[Hunter] ✅ 允许点击事件')
      }
    },
    document,
    { capture: true } // ⚠️ 关键：在捕获阶段拦截，优先级最高
  )

  /**
   * 鼠标按下事件 - 记录起始位置与 Shift 状态
   */
  useEventListener('mousedown', (e) => {
    // 如果正在编辑，不处理
    if (showEditPanel) return

    // 如果点击的是控制台，不处理
    const target = e.target as HTMLElement
    if (
      target.closest('.floating-console') ||
      target.closest('#gogo-console-root')
    ) {
      return
    }

    // 【新增】如果点击的是圆圈，不处理
    if (target.closest('.record-badge')) {
      return
    }

    mouseDownPos.current = { x: e.clientX, y: e.clientY }
    hasMoved.current = false
    shiftKeyOnDown.current = e.shiftKey
  })

  /**
   * 鼠标移动事件 - 判断是否为拖拽
   */
  useEventListener('mousemove', (e) => {
    if (!mouseDownPos.current) return
    if (showEditPanel) return

    // 计算移动距离
    const deltaX = e.clientX - mouseDownPos.current.x
    const deltaY = e.clientY - mouseDownPos.current.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    // 仅当按下时按住 Shift 且移动距离 >= 5px 时进入框选
    if (distance >= 5 && !hasMoved.current && shiftKeyOnDown.current) {
      hasMoved.current = true
      setDragStartPos(mouseDownPos.current ? { ...mouseDownPos.current } : null)
      setIsDragging(true)
    }
  })

  /**
   * 鼠标抬起事件 - 判断是点击还是拖拽
   */
  useEventListener('mouseup', (e) => {
    if (!mouseDownPos.current) return
    if (showEditPanel) return

    // 【新增】如果点击的是圆圈，不处理
    const target = e.target as HTMLElement
    if (target.closest('.record-badge')) {
      // 重置状态
      mouseDownPos.current = null
      hasMoved.current = false
      setDragStartPos(null)
      setIsDragging(false)
      return
    }

    // 如果没有移动，视为点击
    if (!hasMoved.current) {
      handleClick(e.clientX, e.clientY)
    }

    // 重置状态
    mouseDownPos.current = null
    hasMoved.current = false
    setDragStartPos(null)
    setIsDragging(false)
  })

  /**
   * 处理点击选择
   */
  const handleClick = (x: number, y: number) => {
    // 检测点击的元素
    const element = detectElementAtPosition(x, y)

    if (!element) {
      return
    }

    // 设置为单选模式
    setSelectedElement(element)
    setSelectionType('single')
    setElementCount(1)

    // 计算编辑浮层位置
    const rect = element.getBoundingClientRect()
    setPanelPosition({
      x: rect.right + 10,
      y: rect.top
    })

    setShowEditPanel(true)
  }

  /**
   * 处理拖拽框选回调（多选/容器模式）
   *
   * @remarks
   * - 空选：无有效文本/图片/交互元素 → 取消框选回到巡查态
   * - 框选嵌套：仅保留最外层元素；若仅剩一个则容器态，多个则群组态
   */
  const handleDragSelect = (elements: HTMLElement[]) => {
    const meaningful = elements.filter(isMeaningfulElement)
    if (meaningful.length === 0) {
      return
    }

    const outermost = getOutermostElements(meaningful)

    // 若仅一个最外层 → 容器态
    if (outermost.length === 1) {
      const el = outermost[0]
      setSelectedElement(el)
      setSelectedElements(null)
      setSelectionType('area')
      setElementCount(1)
      setPanelPosition({ x: el.getBoundingClientRect().right + 10, y: el.getBoundingClientRect().top })
      setShowEditPanel(true)
      return
    }

    // 多个最外层 → 群组态
    const ancestor = findCommonAncestor(outermost)
    if (!isReasonableAncestor(ancestor)) {
      chrome.runtime.sendMessage({
        type: 'SHOW_TOAST',
        payload: {
          message: '⚠️ 选区过大或过于分散，请缩小选择范围',
          duration: 2000,
          color: 'yellow'
        }
      })
      return
    }

    setSelectedElement(ancestor)
    setSelectedElements(outermost)
    setSelectionType('area')
    setElementCount(outermost.length)
    setPanelPosition({
      x: ancestor.getBoundingClientRect().right + 10,
      y: ancestor.getBoundingClientRect().top
    })
    setShowEditPanel(true)
  }

  /**
   * 取消操作
   */
  const handleCancel = () => {
    setSelectedElement(null)
    setSelectedElements(null)
    setShowEditPanel(false)
    setSelectionType('single')
    setElementCount(0)
  }

  /**
   * 确认保存
   */
  const handleConfirm = async (userNote: string) => {
    if (!selectedElement) {
      console.error('[Hunter] 未选中元素')
      return
    }

    try {
      // 1. 生成 CSS 选择器
      const selector = generateSelector(selectedElement)

      // 2. 清洗 HTML
      const { html, structureState } = cleanHTML(selectedElement)

      // 3. 生成 DomRecord（确保 selectionType 必填，防止脏数据）
      const record: DomRecord = {
        id: records.length + 1,
        userNote,
        selector,
        tagName: selectedElement.tagName,
        snippetHTML: html,
        structureState,
        pageUrl: window.location.href,
        pageId: getPageId(window.location.href), // 新增：页面唯一标识
        createdAt: Date.now(),
        selectionType: selectionType || 'single', // 确保有默认值
        elementCount: selectionType === 'area' ? elementCount : undefined
      }

      // 4. 保存到 storage
      await setRecords([...records, record])

      // 5. 显示成功提示
      const message = selectionType === 'single'
        ? `✓ 已采集 #${record.id}`
        : `✓ 已采集 #${record.id} (${elementCount} 个元素)`

      chrome.runtime.sendMessage({
        type: 'SHOW_TOAST',
        payload: {
          message,
          duration: 1500,
          color: 'green'
        }
      })

      // 6. 清理状态，恢复悬停模式
      setSelectedElement(null)
      setSelectedElements(null)
      setShowEditPanel(false)
      setSelectionType('single')
      setElementCount(0)
    } catch (e) {
      console.error('[Hunter] 保存失败:', e)

      chrome.runtime.sendMessage({
        type: 'SHOW_TOAST',
        payload: {
          message: '✗ 保存失败',
          duration: 2000,
          color: 'red'
        }
      })
    }
  }

  return (
    <>
      {/* Canvas 拖拽框选层（仅 Shift+拖拽时启用，从起点绘制） */}
      <HunterCanvas
        onSelect={handleDragSelect}
        disabled={showEditPanel}
        isDragging={isDragging}
        dragStartPos={dragStartPos}
      />

      {/* 悬停预览标签（编辑时隐藏） */}
      {!showEditPanel && hoverElement && (
        <HoverPreview element={hoverElement} position={hoverPosition} />
      )}

      {/* 高亮覆盖层（选中元素时显示，群组态显示 Group (X items) + 淡绿填充） */}
      {showEditPanel && selectedElement && (
        <HighlightOverlay
          element={selectedElement}
          type={selectionType}
          elementCount={elementCount}
          selectedElements={selectedElements}
          onDismiss={handleCancel}
        />
      )}

      {/* 编辑浮层 */}
      {showEditPanel && selectedElement && (
        <EditPanel
          position={panelPosition}
          selectionType={selectionType}
          elementCount={elementCount}
          onCancel={handleCancel}
          onConfirm={handleConfirm}
        />
      )}
    </>
  )
}
