/**
 * 浮动控制台 Content Script UI
 * 使用Plasmo CSUI在页面中注入控制台组件
 */

import type { PlasmoCSConfig, PlasmoGetStyle } from 'plasmo'
import FloatingConsole from '~components/shared/FloatingConsole'
import { useMode } from '~hooks/useMode'

/**
 * Content Script 配置
 * 在所有页面上运行
 */
export const config: PlasmoCSConfig = {
  matches: ['<all_urls>'],
  all_frames: false
}

/**
 * Shadow DOM 样式注入
 * 确保样式隔离，不受页面CSS影响
 */
export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement('style')
  style.textContent = `
    :host {
      all: initial;
    }

    * {
      box-sizing: border-box;
    }

    button {
      font-family: inherit;
    }

    button:active {
      transform: scale(0.98);
    }

    .console-header:active {
      cursor: grabbing !important;
    }
  `
  return style
}

/**
 * Shadow Host ID
 */
export const getShadowHostId = () => 'gogo-console-root'

/**
 * 控制台组件入口
 */
export default function ConsoleRoot() {
  const { currentMode, switchMode } = useMode()

  return <FloatingConsole currentMode={currentMode} onSwitch={switchMode} />
}
