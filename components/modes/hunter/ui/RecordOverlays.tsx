/**
 * 反馈记录覆盖层组件（方案2：独立覆盖层）
 * 1. 使用独立的固定定位 div 绘制边框（不修改页面元素 style）
 * 2. 创建圆圈编号标签
 * - single 类型：蓝色虚线框 + 左上角蓝色圆圈
 * - area 类型：绿色虚线框 + 左上角绿色圆圈
 */

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useStorage } from '~hooks/useStorage'
import { getPageId } from '~utils/pageId'
import type { DomRecord } from '~types'

interface RecordBadge {
  record: DomRecord
  element: HTMLElement
  rect: DOMRect
  x: number
  y: number
  color: string
}

/**
 * 为已保存的记录元素绘制覆盖层和圆圈标签
 */
export default function RecordOverlays() {
  const [records, setRecords] = useStorage<DomRecord[]>('hunter-records', [])
  const [badges, setBadges] = useState<RecordBadge[]>([])
  const [hoveredBadgeId, setHoveredBadgeId] = useState<number | null>(null)
  const [currentPageId, setCurrentPageId] = useState<string>('')

  /**
   * 获取当前页面 ID
   */
  useEffect(() => {
    const pageId = getPageId(window.location.href)
    setCurrentPageId(pageId)
    console.log('[RecordOverlays] 当前页面 PageId:', pageId)
  }, [])

  /**
   * 计算所有记录的边框和圆圈位置（仅当前页面）
   */
  const updateBadges = () => {
    if (!currentPageId) return

    const newBadges: RecordBadge[] = []

    // 只处理当前页面的记录
    const pageRecords = records.filter((r) => r.pageId === currentPageId)

    pageRecords.forEach((record) => {
      try {
        const element = document.querySelector(record.selector) as HTMLElement

        if (element) {
          const rect = element.getBoundingClientRect()
          const color = record.selectionType === 'single' ? '#4A90E2' : '#34A853'

          // 圆圈显示在左上角
          const x = rect.left - 12 // 圆圈半径
          const y = rect.top - 12

          newBadges.push({
            record,
            element,
            rect,
            x,
            y,
            color
          })
        }
      } catch (e) {
        console.error('[RecordOverlays] 计算位置失败:', e)
      }
    })

    setBadges(newBadges)
  }

  /**
   * 删除标注
   */
  const handleDelete = async (recordId: number) => {
    // 从 storage 中删除
    const newRecords = records.filter((r) => r.id !== recordId)
    await setRecords(newRecords)

    // 显示提示
    chrome.runtime.sendMessage({
      type: 'SHOW_TOAST',
      payload: {
        message: `✓ 已删除标注 #${recordId}`,
        duration: 1500,
        color: 'green'
      }
    })
  }

  /**
   * 初始化和监听 records 变化
   */
  useEffect(() => {
    // 【数据清洗】检查并修复所有记录
    const cleanedRecords = records.map((record) => {
      let needsUpdate = false
      const updatedRecord = { ...record }

      // 1. 修复 selectionType
      if (
        !record.selectionType ||
        (record.selectionType !== 'single' && record.selectionType !== 'area')
      ) {
        console.warn(
          '[RecordOverlays] 发现无效的 selectionType，修复为 single:',
          record.id,
          '原值:',
          record.selectionType
        )
        updatedRecord.selectionType = 'single' as const
        needsUpdate = true
      }

      // 2. 为旧记录生成 pageId（兼容历史数据）
      if (!record.pageId && record.pageUrl) {
        const pageId = getPageId(record.pageUrl)
        console.warn(
          '[RecordOverlays] 为旧记录生成 pageId:',
          record.id,
          'pageUrl:',
          record.pageUrl,
          '→ pageId:',
          pageId
        )
        updatedRecord.pageId = pageId
        needsUpdate = true
      }

      return needsUpdate ? updatedRecord : record
    })

    // 如果有数据被修复，保存清洗后的数据
    if (JSON.stringify(cleanedRecords) !== JSON.stringify(records)) {
      console.log('[RecordOverlays] 保存清洗后的数据')
      setRecords(cleanedRecords)
      return // 等待下次渲染使用清洗后的数据
    }

    // 延迟计算位置，确保页面加载完成
    const timer = setTimeout(() => {
      updateBadges()
    }, 500)

    return () => {
      clearTimeout(timer)
    }
  }, [records, currentPageId])

  /**
   * 监听滚动和窗口大小变化，更新位置
   */
  useEffect(() => {
    const handleScroll = () => {
      updateBadges()
    }

    const handleResize = () => {
      updateBadges()
    }

    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleResize)
    }
  }, [records, currentPageId])

  // 渲染边框覆盖层和圆圈标签（仅当前页面）
  const pageRecords = records.filter((r) => r.pageId === currentPageId)
  const singleRecords = pageRecords.filter((r) => r.selectionType === 'single')
  const areaRecords = pageRecords.filter((r) => r.selectionType === 'area')

  return createPortal(
    <>
      {badges.map((badge) => {
        // 计算当前记录在同类型中的序号（防御性编程，防止出现编号0）
        let displayNumber: number

        if (badge.record.selectionType === 'single') {
          const index = singleRecords.findIndex((r) => r.id === badge.record.id)
          displayNumber = index === -1 ? badge.record.id : index + 1
        } else if (badge.record.selectionType === 'area') {
          const index = areaRecords.findIndex((r) => r.id === badge.record.id)
          displayNumber = index === -1 ? badge.record.id : index + 1
        } else {
          console.warn('[RecordOverlays] 发现无效的 selectionType:', badge.record.selectionType, 'recordId:', badge.record.id)
          displayNumber = badge.record.id
        }

        const isHovered = hoveredBadgeId === badge.record.id

        return (
          <div key={badge.record.id}>
            {/* 边框覆盖层（独立 div，不修改页面元素 style） */}
            <div
              className="hunter-record-border"
              style={{
                position: 'fixed',
                top: `${badge.rect.top}px`,
                left: `${badge.rect.left}px`,
                width: `${badge.rect.width}px`,
                height: `${badge.rect.height}px`,
                border: `2px dashed ${badge.color}`,
                pointerEvents: 'none',
                zIndex: 999995,
                transition: 'all 0.1s ease-out'
              }}
            />

            {/* 圆圈标签 */}
            <div
              className="record-badge"
              onMouseDown={(e) => {
                e.stopPropagation()
              }}
              onMouseUp={(e) => {
                e.stopPropagation()
              }}
              onClick={(e) => {
                e.stopPropagation()
                handleDelete(badge.record.id)
              }}
              onMouseEnter={() => setHoveredBadgeId(badge.record.id)}
              onMouseLeave={() => setHoveredBadgeId(null)}
              style={{
                position: 'fixed',
                left: `${badge.x}px`,
                top: `${badge.y}px`,
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: isHovered ? '#dc3545' : badge.color,
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isHovered ? '14px' : '13px',
                fontWeight: 600,
                fontFamily: 'system-ui, -apple-system, sans-serif',
                cursor: 'pointer',
                zIndex: 999996,
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
                transition: 'all 0.2s ease-out',
                transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                userSelect: 'none'
              }}
              title={`点击删除标注 #${badge.record.id}${badge.record.userNote ? `\n备注: ${badge.record.userNote}` : ''}`}
            >
              {isHovered ? '✕' : displayNumber}
            </div>
          </div>
        )
      })}
    </>,
    document.body
  )
}
