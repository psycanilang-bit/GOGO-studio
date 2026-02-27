/**
 * Background Service Worker
 * 处理侧边栏打开、消息转发等后台任务
 */

/**
 * 监听消息
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'OPEN_SIDEPANEL':
      handleOpenSidePanel(sender.tab?.id)
      break

    case 'NEW_ANNOTATION':
      // 转发给侧边栏（如果已打开）
      break

    case 'SHOW_TOAST':
      // 转发到当前活动标签页（侧边栏发来时 sender.tab 为空，需查当前标签）
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id
        if (tabId) chrome.tabs.sendMessage(tabId, message)
      })
      break
  }

  return true
})

/**
 * 打开侧边栏
 */
async function handleOpenSidePanel(tabId?: number) {
  if (!tabId) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    tabId = tab?.id
  }

  if (!tabId) {
    console.error('[Background] 无法获取当前标签页')
    return
  }

  try {
    // Chrome 114+ 支持 sidePanel API
    if (chrome.sidePanel) {
      await chrome.sidePanel.open({ tabId })
    } else {
      console.warn('[Background] 当前浏览器不支持 Side Panel API')
    }
  } catch (e) {
    console.error('[Background] 打开侧边栏失败:', e)
  }
}
