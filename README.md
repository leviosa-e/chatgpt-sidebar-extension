# ChatGPT 对话目录

一个为 ChatGPT 对话界面添加侧边栏功能的浏览器插件和油猴脚本，帮助您管理和回顾对话历史。

## 🌟 功能特性

- **📝 自动记录对话历史** - 自动捕获您在 ChatGPT 中的每个对话
- **⭐ 收藏重要对话** - 标记和收藏重要的问答，方便快速回顾
- **🖱️ 滚动到对话** - 点击问题，页面会自动滚动到对应的对话位置
- **💾 本地存储** - 所有数据保存在本地，保护您的隐私
- **🎨 美观界面** - 现代化设计，支持明暗主题自动切换
- **🔄 一键复制（已实现）/重新提问（待实现）** - 点击历史问题即可快速复制或重新填入输入框
- **🔍 快速搜索（待实现）** - 在历史记录中快速搜索您需要的内容
- **📤 数据导入导出（待实现）** - 支持历史记录的备份和恢复（油猴脚本版本）
- **📱 响应式设计（待实现）** - 完美适配桌面端和移动端设备

## 📦 安装方式

### Chrome 浏览器插件

#### 方法一：开发者模式安装（推荐）

1.  下载项目文件到本地
2.  打开 Chrome 浏览器，进入扩展程序页面：
    - 在地址栏输入 `chrome://extensions/`
    - 或者点击右上角三点菜单 → 更多工具 → 扩展程序
3.  开启右上角的"开发者模式"
4.  点击"加载已解压的扩展程序"
5.  选择 `chrome-extension` 文件夹
6.  插件安装完成，访问 [ChatGPT](https://chatgpt.com) 即可使用

#### 方法二：打包安装

1.  在扩展程序页面点击"打包扩展程序"
2.  选择 `chrome-extension` 文件夹
3.  生成 `.crx` 文件后拖拽到扩展程序页面安装

### 油猴脚本（待实现）

#### 前置要求

首先需要安装油猴脚本管理器：

- [Tampermonkey](https://www.tampermonkey.net/) （推荐）
- [Greasemonkey](https://www.greasespot.net/)
- [Violentmonkey](https://violentmonkey.github.io/)

#### 安装步骤

1.  安装油猴脚本管理器后，点击其图标
2.  选择"添加新脚本"或"创建新脚本"
3.  复制 `userscript/yuanbao-sidebar.user.js` 文件的全部内容
4.  粘贴到脚本编辑器中，保存
5.  访问 [ChatGPT](https://chatgpt.com/) 即可使用

## 🚀 使用说明

### 基本使用

1.  **安装完成后访问 ChatGPT**

    - 打开 [https://chatgpt.com](https://chatgpt.com)
    - 侧边栏会自动出现在页面右侧
    - 同时对话框顶部右上角会出现「目录」按钮，用于打开/关闭侧边栏

2.  **开始对话**

    - 正常使用 ChatGPT 进行对话
    - 您的每个问题都会自动记录在侧边栏中

3.  **管理历史问题**
    - 点击问题项可滚动到对话位置
    - 使用 ⭐ 按钮收藏问题
    - 使用 📋 按钮复制问题到剪贴板

### 高级功能

#### Chrome 插件版本

- **插件弹窗**：点击浏览器工具栏中的插件图标，可以进行快捷操作。
- **快捷操作**：
  - **使用说明**: 点击打开项目的 GitHub 仓库，查看详细使用说明。
  - **反馈建议**: 点击发送邮件，向开发者提供宝贵的反馈和建议。
  - **清除本地缓存**: 一键清除所有本地存储的历史记录。

#### 油猴脚本版本（待实现）

- **菜单命令**：右键点击油猴图标，使用快捷菜单命令
- **数据导出**：将历史记录导出为 JSON 文件备份
- **数据导入**：从备份文件恢复历史记录

## 🎨 界面预览

### 桌面端界面

- 侧边栏位于页面右侧，宽度 320px
- 收起状态下仅显示 40px 宽的切换按钮
- 支持明暗主题自动切换

### 移动端适配（待实现）

- 小屏幕设备上侧边栏占满整个屏幕宽度
- 收起时从顶部滑出屏幕
- 触摸友好的按钮和交互设计

## ⚙️ 配置选项

### 存储设置

- **最大记录数量**：默认保存最近 50 条问题记录
- **数据存储**：Chrome 插件使用 `chrome.storage.local`，油猴脚本使用 `GM_setValue`
- **自动清理**：超出限制时自动删除最旧的记录

### 个性化设置

- **主题适配**：自动检测系统主题偏好
- **动画效果**：支持减少动画模式
- **高对比度**：支持高对比度显示模式

## 🔧 开发说明

### 项目结构

```
chatgpt-sidebar-extension/
├── chrome-extension/          # Chrome 插件文件
│   ├── manifest.json         # 插件配置文件
│   ├── content.js           # 内容脚本
│   ├── sidebar.css          # 样式文件
│   ├── popup.html           # 弹窗页面
│   ├── popup.js             # 弹窗脚本
│   └── icons/               # 图标文件
├── userscript/              # 油猴脚本文件
│   └── chatgpt-sidebar.user.js
├── docs/                    # 文档目录
└── README.md               # 项目说明
```

### 技术实现

#### 核心功能

1.  **DOM 监听**：使用 `MutationObserver` 监听页面变化
2.  **问题提取**：通过多种选择器策略识别用户消息
3.  **事件监听**：监听输入框提交和按钮点击事件
4.  **数据持久化**：本地存储问题历史记录

#### 兼容性处理

- **选择器适配**：使用多种 CSS 选择器确保兼容性
- **事件处理**：兼容不同的提交方式（点击、回车键）
- **存储 API**：Chrome 插件和油猴脚本使用不同的存储 API
- **样式隔离**：使用唯一类名避免样式冲突

### 自定义开发

#### 修改样式

编辑 `chrome-extension/sidebar.css` 或油猴脚本中的 `GM_addStyle` 部分：

```css
.chatgpt-sidebar {
  /* Class name might differ */
  /* 修改侧边栏宽度 */
  width: 350px;

  /* 修改背景色 */
  background: #f0f0f0;

  /* 修改位置 */
  left: 0; /* 改为左侧显示 */
  right: auto;
}
```

#### 添加新功能

在 `content.js` 或油猴脚本中添加新方法：

```javascript
// 添加新的问题处理逻辑
processCustomQuestion(questionText) {
    // 自定义处理逻辑
    console.log('处理问题:', questionText);
}
```

### 压缩方式

```
cd chrome-extension/ # where the extension stored
zip -r chrome-extension.zip \*
```

## 🐛 故障排除

### 常见问题

#### 侧边栏没有显示

1.  **检查页面 URL**：确保在 `chatgpt.com` 域名下
2.  **刷新页面**：按 F5 或 Ctrl+R 刷新页面
3.  **检查控制台**：按 F12 查看是否有错误信息
4.  **重新安装**：卸载后重新安装插件或脚本

#### 问题没有被记录

1.  **检查输入方式**：确保使用标准的输入框提交
2.  **等待加载**：提交后等待 1-2 秒让脚本处理

#### 历史记录丢失

1.  **检查存储权限**：确保插件有存储权限
2.  **浏览器设置**：检查是否禁用了本地存储
3.  **数据备份**：使用油猴脚本版本的导出功能定期备份

### 调试模式

开启浏览器开发者工具（F12），在控制台中输入：

```javascript
// 查看当前问题列表
console.log("当前问题:", localStorage.getItem("chatgpt_questions_history")); // Key may differ

// 手动触发问题提取
document.dispatchEvent(new CustomEvent("chatgpt-extract-questions")); // Event name may differ
```

## 📄 更新日志

### v1.1.0 (最近更新)

- ✨ 新增插件弹窗，提供快捷操作
- 🚀 增加“使用说明”和“反馈建议”按钮
- 💄 优化了弹窗 UI

### v1.0.0

- ✨ 首次发布
- 🎯 支持 ChatGPT 问题历史记录
- 📱 响应式设计适配
- 🔧 Chrome 插件和油猴脚本双版本
- 💾 本地数据存储

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发环境

1.  Clone 项目到本地
2.  在 Chrome 中加载插件进行测试
3.  修改代码后重新加载插件

### 提交规范

- 🐛 Bug 修复
- ✨ 新功能
- 📝 文档更新
- 🎨 样式改进
- ♻️ 代码重构

## 📜 许可证

本项目采用 MIT 许可证，详见 [LICENSE](LICENSE) 文件。

## 🙏 致谢

- 感谢 OpenAI 提供的优秀 AI 对话服务
- 感谢开源社区提供的技术支持和灵感

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 📧 Email: zhoupeng.levi@gmail.com
- 🐛 Issues: [https://github.com/leviosa-e/chatgpt-sidebar-extension/issues](https://github.com/leviosa-e/chatgpt-sidebar-extension/issues)

---

**⭐ 如果这个项目对您有帮助，请给个 Star 支持一下！**
