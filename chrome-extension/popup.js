/**
 * 腾讯元宝侧边栏助手 - Popup脚本
 * 处理插件弹窗的交互逻辑
 */

class PopupController {
  constructor() {
    this.init();
  }

  async init() {
    // 检查当前页面状态
    await this.checkCurrentPage();
    
    // 加载历史记录统计
    await this.loadHistoryCount();
    
    // 绑定事件监听器
    this.bindEvents();
    
    // 定期更新状态
    this.startStatusUpdater();
  }

  /**
   * 检查当前页面是否为腾讯元宝
   */
  async checkCurrentPage() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentPageEl = document.getElementById('current-page');
      const sidebarStatusEl = document.getElementById('sidebar-status');
      
      if (tab && tab.url) {
        if (tab.url.includes('yuanbao.tencent.com')) {
          currentPageEl.textContent = '腾讯元宝';
          currentPageEl.className = 'status-value active';
          
          // 检查侧边栏状态
          try {
            const results = await chrome.tabs.sendMessage(tab.id, { action: 'getSidebarStatus' });
            if (results && results.sidebarExists) {
              sidebarStatusEl.textContent = results.isCollapsed ? '已收起' : '已展开';
              sidebarStatusEl.className = 'status-value active';
            } else {
              sidebarStatusEl.textContent = '未加载';
              sidebarStatusEl.className = 'status-value inactive';
            }
          } catch (err) {
            sidebarStatusEl.textContent = '未检测到';
            sidebarStatusEl.className = 'status-value inactive';
          }
        } else {
          currentPageEl.textContent = '非目标页面';
          currentPageEl.className = 'status-value inactive';
          sidebarStatusEl.textContent = '不适用';
          sidebarStatusEl.className = 'status-value inactive';
        }
      } else {
        currentPageEl.textContent = '未知';
        currentPageEl.className = 'status-value inactive';
        sidebarStatusEl.textContent = '未知';
        sidebarStatusEl.className = 'status-value inactive';
      }
    } catch (err) {
      console.error('检查页面状态失败:', err);
      document.getElementById('current-page').textContent = '检测失败';
      document.getElementById('sidebar-status').textContent = '检测失败';
    }
  }

  /**
   * 加载历史记录数量
   */
  async loadHistoryCount() {
    try {
      const result = await chrome.storage.local.get(['yuanbao_questions_history']);
      const questions = result.yuanbao_questions_history || [];
      const countEl = document.getElementById('history-count');
      
      countEl.textContent = `${questions.length} 条记录`;
      countEl.className = 'status-value';
    } catch (err) {
      console.error('加载历史记录失败:', err);
      document.getElementById('history-count').textContent = '加载失败';
    }
  }

  /**
   * 绑定事件监听器
   */
  bindEvents() {
    // 切换侧边栏按钮
    document.getElementById('toggle-sidebar').addEventListener('click', () => {
      this.toggleSidebar();
    });

    // 刷新页面按钮
    document.getElementById('refresh-page').addEventListener('click', () => {
      this.refreshPage();
    });

    // 清空历史按钮
    document.getElementById('clear-history').addEventListener('click', () => {
      this.clearHistory();
    });

    // 帮助链接
    document.getElementById('help-link').addEventListener('click', (e) => {
      e.preventDefault();
      this.showHelp();
    });
  }

  /**
   * 切换侧边栏显示状态
   */
  async toggleSidebar() {
    try {
      this.showLoading(true);
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab || !tab.url.includes('yuanbao.tencent.com')) {
        this.showMessage('请先打开腾讯元宝网站', 'error');
        return;
      }

      // 发送消息给content script
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'toggleSidebar' });
      
      if (response && response.success) {
        this.showMessage('侧边栏状态已切换', 'success');
        // 更新状态显示
        setTimeout(() => this.checkCurrentPage(), 500);
      } else {
        this.showMessage('切换失败，请刷新页面重试', 'error');
      }
    } catch (err) {
      console.error('切换侧边栏失败:', err);
      this.showMessage('操作失败，请确保页面已加载完成', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * 刷新当前页面
   */
  async refreshPage() {
    try {
      this.showLoading(true);
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab) {
        await chrome.tabs.reload(tab.id);
        this.showMessage('页面已刷新', 'success');
        
        // 延迟更新状态
        setTimeout(() => {
          this.checkCurrentPage();
          this.loadHistoryCount();
        }, 2000);
      }
    } catch (err) {
      console.error('刷新页面失败:', err);
      this.showMessage('刷新失败', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * 清空历史记录
   */
  async clearHistory() {
    try {
      const confirmed = confirm('确定要清空所有历史记录吗？此操作不可撤销。');
      if (!confirmed) return;

      this.showLoading(true);
      
      // 清空本地存储
      await chrome.storage.local.remove(['yuanbao_questions_history']);
      
      // 通知content script更新显示
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.url.includes('yuanbao.tencent.com')) {
          await chrome.tabs.sendMessage(tab.id, { action: 'clearHistory' });
        }
      } catch (err) {
        // 忽略通信错误，因为页面可能没有加载content script
      }
      
      this.showMessage('历史记录已清空', 'success');
      await this.loadHistoryCount();
    } catch (err) {
      console.error('清空历史记录失败:', err);
      this.showMessage('清空失败', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * 显示帮助信息
   */
  showHelp() {
    const helpContent = `
腾讯元宝侧边栏助手使用说明：

🎯 功能特性：
• 自动记录您在腾讯元宝中的提问历史
• 支持一键复制或重新提问
• 响应式设计，适配不同屏幕尺寸
• 本地存储，保护您的隐私

⌨️ 快捷键：
• Ctrl+Shift+S：切换侧边栏显示/隐藏

🔧 使用方法：
1. 打开腾讯元宝网站 (yuanbao.tencent.com)
2. 侧边栏会自动出现在页面右侧
3. 开始对话后，您的问题会自动记录
4. 点击问题项可以复制或重新提问

💡 提示：
• 如果侧边栏没有出现，请刷新页面
• 历史记录保存在本地，不会上传到服务器
• 支持最多保存50条历史记录

如有问题，请检查是否已正确安装插件并授予必要权限。
    `;
    
    alert(helpContent.trim());
  }

  /**
   * 显示加载状态
   */
  showLoading(show) {
    const loadingEl = document.getElementById('loading');
    const contentEl = document.querySelector('.content');
    
    if (show) {
      loadingEl.style.display = 'block';
      contentEl.style.opacity = '0.5';
    } else {
      loadingEl.style.display = 'none';
      contentEl.style.opacity = '1';
    }
  }

  /**
   * 显示消息提示
   */
  showMessage(message, type = 'info') {
    // 创建消息元素
    const messageEl = document.createElement('div');
    messageEl.className = `message message-${type}`;
    messageEl.textContent = message;
    
    // 添加样式
    Object.assign(messageEl.style, {
      position: 'fixed',
      top: '10px',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '8px 16px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '500',
      zIndex: '1000',
      transition: 'all 0.3s ease'
    });
    
    // 根据类型设置颜色
    switch (type) {
      case 'success':
        messageEl.style.background = '#10b981';
        messageEl.style.color = 'white';
        break;
      case 'error':
        messageEl.style.background = '#ef4444';
        messageEl.style.color = 'white';
        break;
      default:
        messageEl.style.background = '#3b82f6';
        messageEl.style.color = 'white';
    }
    
    document.body.appendChild(messageEl);
    
    // 自动移除
    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.parentNode.removeChild(messageEl);
      }
    }, 3000);
  }

  /**
   * 开始状态更新器
   */
  startStatusUpdater() {
    // 每5秒更新一次状态
    setInterval(() => {
      this.checkCurrentPage();
      this.loadHistoryCount();
    }, 5000);
  }
}

// 当DOM加载完成时初始化
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});

// 监听存储变化，实时更新历史记录数量
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.yuanbao_questions_history) {
    const questions = changes.yuanbao_questions_history.newValue || [];
    const countEl = document.getElementById('history-count');
    if (countEl) {
      countEl.textContent = `${questions.length} 条记录`;
    }
  }
});