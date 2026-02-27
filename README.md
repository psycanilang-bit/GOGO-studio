# GOGO Studio互斥双模式网页交互工具：阅读标注 + 元素猎手

---

## 📖 项目简介

**GOGO Studio** 是一个强大的 Chrome 浏览器扩展，通过一个浮动控制台入口，为用户提供两种专业的网页交互模式：

- **GOGO 阅读标注模式** - 在与LLM交流后深度阅读时标注文本、表达观点、沉淀思考
- **DOM Hunter 元素猎手模式** - 快速选择DOM Selector + XPath，辅助前端开发

无论你是深度阅读者、内容创作者，还是前端工程师、测试工程师，GOGO Studio 都能让你的网页交互更高效。

---

## ✨ 主要功能

### 🎯 GOGO 阅读标注模式

专为解决“长篇 AI 回复难以精准追问”的痛点而生：

- **双态标注系统**
  - 🟢 **认可**（绿色高亮）- 标记你认同的观点
  - 🟡 **质疑**（黄色高亮）- 标记你质疑的内容

- **智能持久化**
  - 基于 XPath + TextQuote 双重定位，刷新页面自动恢复标注
  - 应对动态网页结构变化，精准定位原文
  - 像素级捕获你在网页或 LLM 聊天界面中划选的任意目标文本

- **侧边栏管理**
  - 查看当前页面所有标注
  - 搜索和筛选（按标注类型、时间）
  - 点击标注快速滚动定位到原文
  - 添加个人反馈和想法

- **一键组装复制**
  - 写完反馈后，点击一键复制，即可将“引用的 LLM 原文 + 你的反馈”完美组合拼装，直接粘贴回聊天框发送，大幅提升 Prompt 沟通效率！

**适用场景**：与LLM交流，网页阅读

---

### 🔍 DOM Hunter 元素猎手模式

为前端开发和自动化测试提供强大的元素选择工具：

- **灵活选择方式**
  - **点击模式** - 单击任意元素，蓝色虚线边框标识
  - **框选模式** - Shift + 拖拽，绿色框选多个元素，自动计算公共祖先

- **智能信息提取**
  - 标签名称（Tag Name）
  - 元素 ID
  - Class 列表
  - CSS 选择器（自动生成，优先级：ID > Class > nth-child）
  - XPath 路径

- **一键操作**
  - 快速复制选择器到剪贴板
  - Toast 提示操作状态
  - 清洗后的 HTML 结构导出（防止过大）

- **开发友好**
  - 结构完整度检测（熔断机制）
  - 悬停预览显示元素信息
  - 支持 Playwright / Selenium 脚本编写

**适用场景**：前端开发、UI 自动化测试、网页爬虫、页面分析

---

### 🎛️ 统一浮动控制台

- **模式切换** - OFF → GOGO → HUNTER → OFF（循环切换）
- **位置持久化** - 拖拽到任意位置，自动记忆
- **展开/收起** - 完整视图和迷你视图切换
- **状态提示** - 实时显示当前模式

---

## 🎬 功能演示

### GOGO 阅读标注模式

![GOGO 阅读标注模式演示](assets/阅读标注preview.gif)

```text
1. 选中网页上的任意文本
2. 弹出标注菜单，选择"认可"或"质疑"
3. 文本自动高亮（绿色/黄色）
4. 侧边栏打开，可添加你的想法
5. 刷新页面，标注自动恢复

```

### DOM Hunter 元素猎手模式

![GOGO Hunter 元素猎手模式](assets/猎手模式preview.gif)

```text
1. 通过浮动控制台切换到 Hunter 模式
2. 点击页面元素或 Shift+拖拽框选区域
3. 自动显示元素信息面板
4. 点击复制按钮，选择器已在剪贴板
5. 粘贴到代码编辑器使用

```

---

## 🚀 快速开始

### 方式一：Chrome 应用商店安装（即将上线）

🚧 正在审核中，敬请期待...

---

### 方式二：开发者模式手动安装

#### 1. 克隆项目

```bash
git clone [https://github.com/psycanilang-bit/gogo-studio.git](https://github.com/psycanilang-bit/gogo-studio.git)
cd gogo-studio

```

#### 2. 安装依赖

```bash
npm install

```

> **遇到错误？** 尝试使用 `npm install --legacy-peer-deps`

#### 3. 启动开发模式

```bash
npm run dev

```

#### 4. 加载到 Chrome

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角的 **"开发者模式"**
4. 点击 **"加载已解压的扩展程序"**
5. 选择项目目录中的 `build/chrome-mv3-dev` 文件夹

#### 5. 开始使用

* 访问任意网页，右下角会出现浮动控制台
* 点击控制台切换模式
* 享受强大的网页交互功能

---

## 📖 使用方法

### 基本操作

| 操作 | 说明 |
| --- | --- |
| **点击浮动控制台** | 切换模式（OFF → GOGO → HUNTER → OFF） |
| **拖拽控制台** | 移动到任意位置（位置会自动保存） |
| **Ctrl + 双击控制台** | 展开/收起控制台 |

---

### GOGO 模式操作

| 操作 | 说明 |
| --- | --- |
| **选中文本** | 鼠标拖拽选择文字 |
| **点击"认可"** | 绿色高亮标注，表达认同 |
| **点击"质疑"** | 黄色高亮标注，表达质疑 |
| **查看侧边栏** | 点击浏览器扩展图标打开侧边栏 |
| **定位标注** | 在侧边栏点击标注，自动滚动到原文 |
| **删除标注** | 在侧边栏点击删除按钮 |

---

### Hunter 模式操作

| 操作 | 说明 |
| --- | --- |
| **单击元素** | 选中单个元素（蓝色边框） |
| **Shift + 拖拽** | 框选多个元素（绿色边框） |
| **查看信息** | 自动弹出元素信息面板 |
| **复制选择器** | 点击"复制"按钮或相应的选择器文本 |
| **清除选择** | 点击ESC 键 |

---

## 🛠️ 开发指南

### 环境要求

* **Node.js**: 16.x 或更高版本
* **npm**: 7.x 或更高版本
* **Chrome**: 114+ (需要 sidePanel API 支持)

---

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器（支持热重载）
npm run dev

# 在 Chrome 中加载扩展
# 打开 chrome://extensions/
# 加载 build/chrome-mv3-dev 目录

```

开发模式下，代码修改会自动编译，刷新扩展即可看到效果。

---

### 构建和打包

```bash
# 生产环境构建
npm run build

# 打包为 .zip（用于发布）
npm run package

```

构建产物：

* 开发版：`build/chrome-mv3-dev/`
* 生产版：`build/chrome-mv3-prod/`
* 打包文件：`build/chrome-mv3-prod.zip`

---

## 📁 项目结构

```
gogo-studio/
├── background/                 # 后台服务脚本
│   └── index.ts               # 侧边栏打开、消息转发
├── contents/                   # 内容脚本（注入到网页）
│   ├── index.tsx              # 主协调器（模式管理）
│   ├── console.tsx            # 浮动控制台
│   └── styles.css             # 全局样式
├── components/                 # React UI 组件
│   ├── modes/
│   │   ├── gogo/              # GOGO 模式组件
│   │   │   ├── GOGOMode.tsx
│   │   │   ├── core/          # 核心逻辑
│   │   │   │   ├── highlighter.ts  # 文本高亮
│   │   │   │   └── locator.ts      # 标注定位
│   │   │   └── ui/            # UI 组件
│   │   │       ├── AnnotationMenu.tsx
│   │   │       └── HighlightTooltip.tsx
│   │   └── hunter/            # Hunter 模式组件
│   │       ├── HunterMode.tsx
│   │       ├── core/          # 核心逻辑
│   │       │   ├── selector.ts     # 选择器生成
│   │       │   ├── detector.ts     # 元素检测
│   │       │   └── ancestor.ts     # 祖先分析
│   │       └── ui/            # UI 组件
│   │           ├── Canvas.tsx
│   │           ├── EditPanel.tsx
│   │           └── HoverPreview.tsx
│   └── shared/                # 共享组件
│       ├── FloatingConsole.tsx
│       └── Toast.tsx
├── hooks/                      # 自定义 React Hooks
│   ├── useMode.ts             # 模式状态管理
│   ├── useStorage.ts          # Storage 封装
│   └── useEventListener.ts    # 事件监听
├── utils/                      # 工具函数
│   ├── elementInfo.ts         # 元素信息提取
│   ├── htmlCleaner.ts         # HTML 清洗
│   ├── xpath.ts               # XPath 生成
│   ├── clipboard.ts           # 剪贴板操作
│   └── message.ts             # 消息通信
├── types/                      # TypeScript 类型定义
│   ├── common.ts              # 通用类型
│   ├── gogo.ts                # GOGO 相关类型
│   └── hunter.ts              # Hunter 相关类型
├── sidepanel/                  # 侧边栏面板
│   └── index.tsx              # 侧边栏 UI
├── assets/                     # 静态资源
│   └── icon.png
├── package.json
├── tsconfig.json
└── README.md

```

---

## 🔧 技术栈

| 技术 | 版本 | 用途 |
| --- | --- | --- |
| **Plasmo** | 0.90.5 | Chrome 扩展开发框架 |
| **React** | 18.2.0 | UI 框架 |
| **TypeScript** | 5.3.3 | 类型检查 |
| **Chrome Extension** | MV3 | 扩展标准 |
| **@plasmohq/messaging** | ^0.6.2 | 消息通信 |
| **@plasmohq/storage** | ^1.9.3 | 本地存储 |
| **Sharp** | ^0.34.5 | 图像处理 |

### 核心浏览器 API

* `chrome.storage.local` - 数据持久化
* `chrome.runtime.onMessage` - 消息通信
* `chrome.sidePanel` - 侧边栏面板
* `chrome.tabs` - 标签页操作
* `Range / Selection API` - 文本选择
* `XPath` - 元素定位

---

## 📋 浏览器兼容性

| 浏览器 | 最低版本 | 支持状态 |
| --- | --- | --- |
| Chrome | 114+ | ✅ 完全支持 |
| Edge | 114+ | ✅ 完全支持 |
| Firefox | - | 🚧 计划中 |
| Safari | - | 🚧 计划中 |

> **注意**：需要 Chrome 114+ 版本以支持 `sidePanel` API

---

## 🔒 隐私与安全

* **本地存储**：所有数据存储在本地 Chrome Storage，不上传到任何服务器
* **最小权限**：仅申请必要的扩展权限
* **开源透明**：代码完全开源，欢迎审查

### 权限说明

| 权限 | 用途 |
| --- | --- |
| `storage` | 保存标注和配置数据 |
| `sidePanel` | 显示侧边栏面板 |
| `tabs` | 获取当前标签页信息 |
| `clipboardWrite` | 复制选择器到剪贴板 |
| `<all_urls>` | 在任意网页上使用扩展功能 |

---

## 🤝 贡献指南

我们欢迎所有形式的贡献！

### 如何贡献

1. **Fork 本仓库**
2. **创建特性分支** (`git checkout -b feature/AmazingFeature`)
3. **提交更改** (`git commit -m 'Add some AmazingFeature'`)
4. **推送到分支** (`git push origin feature/AmazingFeature`)
5. **开启 Pull Request**

### 报告问题

如果你发现了 bug 或有功能建议：

1. 访问 [Issues 页面](https://www.google.com/search?q=https://github.com/psycanilang-bit/gogo-studio/issues)
2. 搜索是否已有相似问题
3. 创建新 Issue，提供详细描述

### 代码规范

* 遵循 TypeScript 严格模式
* 组件使用函数式写法
* 工具函数添加 JSDoc 注释
* 提交前运行 `npm run build` 确保编译通过

---

## 🐛 常见问题

### 安装问题

**Q: 安装依赖时报错？**

```bash
npm install --legacy-peer-deps

```

**Q: @parcel/watcher 错误？**

```bash
npm install
npm run dev

```

### 使用问题

**Q: 浮动控制台不显示？**

* 刷新页面
* 检查扩展是否启用
* 查看浏览器控制台是否有错误

**Q: 标注没有自动恢复？**

* 确保页面 URL 没有变化
* 动态网页可能导致 DOM 结构变化，尝试重新标注

**Q: Hunter 模式无法选择元素？**

* 确保已切换到 Hunter 模式
* 检查是否有其他扩展冲突
* 尝试刷新页面重新加载扩展

---

## 📄 许可证

本项目基于 **MIT 许可证** 开源。详见 [LICENSE](https://www.google.com/search?q=LICENSE) 文件。

---

## 📞 联系方式

* **作者**: 汤集
* **Email**: 17727107916@163.com
* **GitHub**: [@psycanilang-bit](https://www.google.com/search?q=https://github.com/psycanilang-bit)
* **问题反馈**: [GitHub Issues](https://www.google.com/search?q=https://github.com/psycanilang-bit/gogo-studio/issues)

---

## 💖 鸣谢

感谢以下开源项目：

* [Plasmo](https://www.plasmo.com/) - 优秀的浏览器扩展开发框架
* [React](https://react.dev/) - 强大的 UI 库
* [TypeScript](https://www.typescriptlang.org/) - JavaScript 的超集

---

<div align="center">

**如果这个项目对你有帮助，请给个 ⭐️ Star！**

Made with ❤️ by GOGO Studio Team

</div>
