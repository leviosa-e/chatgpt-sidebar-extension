# 安装指南

本文档详细介绍如何安装和配置腾讯元宝侧边栏助手。

## 📋 系统要求

### Chrome 浏览器插件版本
- Chrome 浏览器 88+ 或基于 Chromium 的浏览器（Edge、Opera、Brave 等）
- 支持 Manifest V3 的浏览器版本

### 油猴脚本版本
- 任意现代浏览器（Chrome、Firefox、Safari、Edge）
- 油猴脚本管理器（Tampermonkey、Greasemonkey、Violentmonkey）

## 🔧 Chrome 插件安装

### 方法一：开发者模式安装（推荐）

#### 步骤 1：下载项目文件
1. 从 GitHub 下载项目源码
2. 解压到本地目录（如 `D:\yuanbao-sidebar-extension\`）

#### 步骤 2：开启开发者模式
1. 打开 Chrome 浏览器
2. 在地址栏输入：`chrome://extensions/`
3. 在页面右上角开启"开发者模式"开关

![开发者模式](https://via.placeholder.com/600x200/4285f4/ffffff?text=开启开发者模式)

#### 步骤 3：加载插件
1. 点击"加载已解压的扩展程序"按钮
2. 选择项目中的 `chrome-extension` 文件夹
3. 点击"选择文件夹"

#### 步骤 4：确认安装
- 插件列表中出现"腾讯元宝侧边栏助手"
- 浏览器工具栏出现插件图标
- 状态显示为"已启用"

### 方法二：打包安装

#### 步骤 1：打包扩展程序
1. 在扩展程序页面点击"打包扩展程序"
2. 扩展程序根目录：选择 `chrome-extension` 文件夹
3. 点击"打包扩展程序"
4. 生成 `.crx` 文件和 `.pem` 私钥文件

#### 步骤 2：安装 CRX 文件
1. 将生成的 `.crx` 文件拖拽到扩展程序页面
2. 点击"添加扩展程序"确认安装

### 方法三：商店安装（未来支持）
> 注：目前插件尚未上架 Chrome Web Store，敬请期待

## 🐒 油猴脚本安装

### 步骤 1：安装脚本管理器

#### Tampermonkey（推荐）
- **Chrome/Edge**: [Chrome Web Store](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- **Firefox**: [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)
- **Safari**: [Mac App Store](https://apps.apple.com/us/app/tampermonkey/id1482490089)

#### Greasemonkey（Firefox）
- [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/)

#### Violentmonkey（开源替代）
- [Chrome Web Store](https://chrome.google.com/webstore/detail/violentmonkey/jinjaccalgkegednnccohejagnlnfdag)
- [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/violentmonkey/)

### 步骤 2：安装脚本

#### 方法一：直接安装
1. 点击浏览器工具栏中的 Tampermonkey 图标
2. 选择"添加新脚本"
3. 删除默认内容，粘贴 `yuanbao-sidebar.user.js` 的完整代码
4. 按 `Ctrl+S` 保存脚本

#### 方法二：从文件安装
1. 下载 `userscript/yuanbao-sidebar.user.js` 文件
2. 点击 Tampermonkey 图标 → "管理面板"
3. 点击"实用工具"标签
4. 在"从文件安装"区域选择下载的 `.user.js` 文件
5. 点击"安装"

#### 方法三：从 URL 安装（推荐）
```
https://raw.githubusercontent.com/your-repo/yuanbao-sidebar/main/userscript/yuanbao-sidebar.user.js
```

### 步骤 3：验证安装
1. 访问 [腾讯元宝](https://yuanbao.tencent.com)
2. 确认页面右侧出现侧边栏
3. Tampermonkey 图标显示脚本正在运行

## ⚙️ 权限配置

### Chrome 插件权限

插件需要以下权限：

```json
{
  "permissions": [
    "storage",        // 存储历史记录
    "activeTab"       // 访问当前标签页
  ],
  "host_permissions": [
    "https://yuanbao.tencent.com/*"  // 访问腾讯元宝网站
  ]
}
```

#### 权限说明
- **storage**: 用于保存问题历史记录到本地
- **activeTab**: 用于在腾讯元宝页面注入侧边栏
- **host_permissions**: 限制插件仅在腾讯元宝网站运行

### 油猴脚本权限

脚本使用以下 GM API：

```javascript
// @grant        GM_setValue      // 保存数据
// @grant        GM_getValue      // 读取数据
// @grant        GM_deleteValue   // 删除数据
// @grant        GM_addStyle      // 添加样式
// @grant        GM_registerMenuCommand  // 注册菜单命令
```

## 🔍 安装验证

### 功能检查清单

安装完成后，请验证以下功能：

#### ✅ 基础功能
- [ ] 访问腾讯元宝网站时侧边栏自动出现
- [ ] 侧边栏位于页面右侧，不遮挡主要内容
- [ ] 点击切换按钮可以展开/收起侧边栏

#### ✅ 问题记录功能
- [ ] 在对话框中输入问题并发送
- [ ] 问题自动出现在侧边栏历史列表中
- [ ] 问题显示正确的时间戳

#### ✅ 交互功能
- [ ] 点击复制按钮可以复制问题到剪贴板
- [ ] 点击重新提问按钮可以将问题填入输入框
- [ ] 点击删除按钮可以移除单个问题
- [ ] 清空按钮可以删除所有历史记录

#### ✅ 快捷键功能
- [ ] `Ctrl+Shift+S` 可以切换侧边栏显示状态

#### ✅ 响应式设计
- [ ] 在不同屏幕尺寸下侧边栏正常显示
- [ ] 移动设备上侧边栏适配良好

## 🚨 常见安装问题

### Chrome 插件问题

#### 问题：插件无法加载
**症状**: 提示"无法加载扩展程序"
**解决方案**:
1. 确保选择的是 `chrome-extension` 文件夹，不是整个项目文件夹
2. 检查 `manifest.json` 文件格式是否正确
3. 确保所有必需文件都存在

#### 问题：插件图标不显示
**症状**: 工具栏中没有插件图标
**解决方案**:
1. 检查扩展程序页面中插件是否启用
2. 重新加载插件或重启浏览器
3. 检查图标文件是否存在

#### 问题：权限被拒绝
**症状**: 插件无法在腾讯元宝网站运行
**解决方案**:
1. 检查 `host_permissions` 配置
2. 在扩展程序详情中确认网站访问权限
3. 刷新腾讯元宝页面

### 油猴脚本问题

#### 问题：脚本不执行
**症状**: 访问腾讯元宝时侧边栏不出现
**解决方案**:
1. 检查脚本是否启用（Tampermonkey 面板中）
2. 确认 `@match` 规则是否正确
3. 查看浏览器控制台是否有错误信息

#### 问题：样式不生效
**症状**: 侧边栏显示但样式混乱
**解决方案**:
1. 检查 `GM_addStyle` 是否有权限
2. 确认 CSS 代码没有语法错误
3. 检查是否与其他脚本冲突

#### 问题：存储功能异常
**症状**: 历史记录不保存或丢失
**解决方案**:
1. 确认 `GM_setValue` 和 `GM_getValue` 权限
2. 检查浏览器是否禁用了本地存储
3. 尝试重新安装脚本管理器

## 📞 技术支持

如果遇到安装问题，请按以下步骤获取帮助：

### 1. 收集错误信息
- 浏览器版本和操作系统
- 错误截图或控制台错误信息
- 具体的操作步骤

### 2. 检查常见解决方案
- 查阅本文档的故障排除部分
- 搜索项目 Issues 中的相似问题

### 3. 提交问题报告
- 在 GitHub 项目中创建新的 Issue
- 详细描述问题和复现步骤
- 附上相关的错误信息和截图

### 4. 联系方式
- 📧 Email: support@example.com
- 🐛 GitHub Issues: [项目 Issues 页面](https://github.com/your-repo/issues)
- 💬 QQ 群: 123456789

## 🔄 更新说明

### 自动更新（油猴脚本）
油猴脚本支持自动更新，当有新版本时会自动提示更新。

### 手动更新
1. **Chrome 插件**: 重新下载并加载新版本
2. **油猴脚本**: 替换脚本内容或重新安装

### 版本检查
在插件弹窗或脚本菜单中可以查看当前版本号。

---

安装完成后，您就可以开始使用腾讯元宝侧边栏助手了！如有任何问题，请参考 [使用指南](user-guide.md) 或联系技术支持。