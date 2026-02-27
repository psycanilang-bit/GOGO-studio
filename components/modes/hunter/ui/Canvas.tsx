/**
 * Hunter Canvas 绘制组件
 * 提供全屏透明画布用于框选
 */

import { useRef, useEffect, useState } from 'react'
import type { Position, SelectionRect } from '~types'
import { measurePerformance } from '~utils/performance'

interface Props {
  onSelect: (elements: HTMLElement[]) => void
  /** 是否禁用 Canvas（编辑浮层显示时禁用） */
  disabled?: boolean
  /** 是否正在拖拽（v1.3 新增） */
  isDragging?: boolean
  /** 框选起点（Shift+拖拽时由父组件传入，保证从点击处开始绘制） */
  dragStartPos?: Position | null
}

/**
 * Hunter模式透明画布
 *
 * @remarks
 * - 全屏覆盖，z-index最高
 * - 鼠标拖拽绘制虚线矩形
 * - 释放时检测元素
 *
 * @performance 绘制必须 < 16ms (60 FPS)
 */
export default function HunterCanvas({
  onSelect,
  disabled = false,
  isDragging = false,
  dragStartPos = null
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  /** 用 ref 同步标记「正在绘制」，避免 mousemove 因 state 未更新而漏掉矩形更新 */
  const isDrawingRef = useRef(false)
  const rectRef = useRef<SelectionRect>({
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0
  })
  const hasStartedFromParent = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    return () => {
      // 清空画布
      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
        }
      }
    }
  }, [])

  /**
   * 初始化Canvas
   */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // 设置Canvas尺寸
    const updateCanvasSize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)

    return () => {
      window.removeEventListener('resize', updateCanvasSize)
    }
  }, [])

  /**
   * 同步 disabled 属性到 Canvas DOM，并在 Shift+拖拽时从父组件起点开始绘制
   */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const shouldEnable = !disabled && isDragging

    if (shouldEnable) {
      canvas.style.pointerEvents = 'all'
      canvas.style.cursor = 'crosshair'
      // 从父组件传入的起点开始绘制（保证框选从点击处开始）
      if (dragStartPos && !hasStartedFromParent.current) {
        hasStartedFromParent.current = true
        isDrawingRef.current = true // 同步标记，确保 mousemove 能立即更新矩形
        setIsDrawing(true)
        rectRef.current = {
          startX: dragStartPos.x,
          startY: dragStartPos.y,
          endX: dragStartPos.x,
          endY: dragStartPos.y
        }
      }
    } else {
      canvas.style.pointerEvents = 'none'
      canvas.style.cursor = 'default'
      hasStartedFromParent.current = false
      isDrawingRef.current = false
    }
  }, [disabled, isDragging, dragStartPos])

  /**
   * 鼠标按下：开始绘制（仅在 Canvas 上直接按下时使用，Shift+拖拽由 dragStartPos 驱动）
   */
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled) return

    const clickedElement = document.elementFromPoint(e.clientX, e.clientY)
    if (
      clickedElement?.closest('.floating-console') ||
      clickedElement?.closest('[id^="gogo-console-root"]')
    ) {
      return
    }

    // 若已由父组件通过 dragStartPos 启动，不再重复设置起点
    if (hasStartedFromParent.current) return

    isDrawingRef.current = true
    setIsDrawing(true)
    rectRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      endX: e.clientX,
      endY: e.clientY
    }
  }

  /**
   * 鼠标移动：更新矩形（用 ref 判断，避免 state 未更新导致矩形不扩展）
   */
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return

    measurePerformance(
      () => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        rectRef.current.endX = e.clientX
        rectRef.current.endY = e.clientY

        // 清空并重绘
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // 绘制绿色虚线矩形（v1.3 变更：蓝色 → 绿色）
        ctx.strokeStyle = '#34A853'
        ctx.lineWidth = 2
        ctx.setLineDash([5, 5])

        const { startX, startY, endX, endY } = rectRef.current
        const width = endX - startX
        const height = endY - startY

        ctx.strokeRect(startX, startY, width, height)

        // 填充半透明绿色背景
        ctx.fillStyle = 'rgba(52, 168, 83, 0.1)'
        ctx.fillRect(startX, startY, width, height)
      },
      'Hunter Canvas绘制',
      16 // 16ms性能预算
    )
  }

  /**
   * 鼠标释放：检测元素
   */
  const handleMouseUp = () => {
    if (!isDrawingRef.current) return

    isDrawingRef.current = false
    setIsDrawing(false)
    hasStartedFromParent.current = false

    // 清空画布
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    ctx?.clearRect(0, 0, canvas.width, canvas.height)

    // 【关键修复】直接操作 DOM，禁用 Canvas 的 pointerEvents
    // 这样 elementFromPoint 才能穿透 Canvas 检测到下面的页面元素
    canvas.style.pointerEvents = 'none'
    canvas.style.cursor = 'default'

    // 检测元素（延迟 100ms，确保浏览器完成渲染）
    setTimeout(() => {
      const rect = rectRef.current
      const w = Math.abs(rect.endX - rect.startX)
      const h = Math.abs(rect.endY - rect.startY)
      // 面积过小视为无效框选（避免误选整页）
      if (w < 5 || h < 5) {
        if (canvas) {
          canvas.style.pointerEvents = 'all'
          canvas.style.cursor = 'crosshair'
        }
        return
      }

      const { findElementsInRect } = require('../core/detector')
      const elements = findElementsInRect(rect)

      if (elements.length > 0) {
        onSelect(elements)
        // 注意：找到元素后不恢复 Canvas，因为 HunterMode 会通过 disabled prop 控制
      } else {
        // 未找到元素时，恢复 Canvas
        canvas.style.pointerEvents = 'all'
        canvas.style.cursor = 'crosshair'
      }
    }, 100) // 增加延迟到 100ms
  }

  return (
    <canvas
      ref={canvasRef}
      className="hunter-canvas"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 999998,
        cursor: (disabled || !isDragging) ? 'default' : 'crosshair',
        pointerEvents: (disabled || !isDragging) ? 'none' : 'all'
      }}
    />
  )
}
