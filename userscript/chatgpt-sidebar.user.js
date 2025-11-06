// ==UserScript==
// @name         腾讯元宝侧边栏助手
// @namespace    https://github.com/yuanbao-sidebar
// @version      1.0.0
// @description  为腾讯元宝对话界面添加侧边栏，显示历史问题记录
// @author       YuanbaoSidebar Team
// @match        https://chatgpt.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/your-repo/yuanbao-sidebar/main/yuanbao-sidebar.user.js
// @downloadURL  https://raw.githubusercontent.com/your-repo/yuanbao-sidebar/main/yuanbao-sidebar.user.js
// ==/UserScript==

/**
 * 腾讯元宝侧边栏助手 - 油猴脚本版本
 * 用于在腾讯元宝对话界面中添加侧边栏功能
 */

(function () {
  "use strict";

  // 添加CSS样式
  GM_addStyle(`
        /* 侧边栏主容器 */
        .yuanbao-sidebar {
            position: fixed;
            top: 0;
            right: 0;
            width: 320px;
            height: 100vh;
            background: #ffffff;
            border-left: 1px solid #e5e7eb;
            box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
            z-index: 10000;
            display: flex;
            flex-direction: column;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
            transition: transform 0.3s ease-in-out, width 0.3s ease-in-out;
        }

        /* 收起状态 */
        .yuanbao-sidebar.collapsed {
            transform: translateX(280px);
            width: 40px;
        }

        .yuanbao-sidebar.collapsed .sidebar-content {
            display: none;
        }

        .yuanbao-sidebar.collapsed .sidebar-title {
            display: none;
        }

        /* 侧边栏头部 */
        .sidebar-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-bottom: 1px solid #e5e7eb;
            min-height: 60px;
        }

        .sidebar-title {
            font-size: 16px;
            font-weight: 600;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .sidebar-icon {
            font-size: 18px;
        }

        .sidebar-toggle {
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background-color 0.2s;
            font-size: 14px;
        }

        .sidebar-toggle:hover {
            background: rgba(255, 255, 255, 0.3);
        }

        /* 侧边栏内容区域 */
        .sidebar-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        /* 问题列表容器 */
        .questions-list {
            flex: 1;
            overflow-y: auto;
            padding: 8px;
        }

        /* 自定义滚动条 */
        .questions-list::-webkit-scrollbar {
            width: 6px;
        }

        .questions-list::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 3px;
        }

        .questions-list::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 3px;
        }

        .questions-list::-webkit-scrollbar-thumb:hover {
            background: #a1a1a1;
        }

        /* 空状态 */
        .empty-state {
            text-align: center;
            padding: 40px 20px;
            color: #6b7280;
        }

        .empty-state p {
            margin: 0 0 8px 0;
            font-size: 16px;
            font-weight: 500;
        }

        .empty-state small {
            font-size: 14px;
            opacity: 0.8;
        }

        /* 问题项 */
        .question-item {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            margin-bottom: 8px;
            padding: 12px;
            transition: all 0.2s ease;
            cursor: pointer;
        }

        .question-item:hover {
            background: #f3f4f6;
            border-color: #d1d5db;
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        /* 问题文本 */
        .question-text {
            font-size: 14px;
            line-height: 1.5;
            color: #374151;
            margin-bottom: 8px;
            word-wrap: break-word;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        /* 问题元信息 */
        .question-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 8px;
        }

        .question-time {
            font-size: 12px;
            color: #9ca3af;
        }

        /* 操作按钮组 */
        .question-actions {
            display: flex;
            gap: 4px;
        }

        .action-btn {
            background: none;
            border: none;
            padding: 4px 6px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: background-color 0.2s;
            opacity: 0.7;
        }

        .action-btn:hover {
            opacity: 1;
            background: rgba(0, 0, 0, 0.1);
        }

        .copy-btn:hover {
            background: rgba(59, 130, 246, 0.1);
        }

        .reuse-btn:hover {
            background: rgba(16, 185, 129, 0.1);
        }

        .delete-btn:hover {
            background: rgba(239, 68, 68, 0.1);
        }

        /* 侧边栏底部 */
        .sidebar-footer {
            padding: 16px;
            border-top: 1px solid #e5e7eb;
            background: #f9fafb;
        }

        .clear-history-btn {
            width: 100%;
            padding: 8px 12px;
            background: #ef4444;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            cursor: pointer;
            transition: background-color 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }

        .clear-history-btn:hover {
            background: #dc2626;
        }

        /* Toast 提示 */
        .yuanbao-toast {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #1f2937;
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            font-size: 14px;
            z-index: 10001;
            transform: translateX(100%);
            transition: transform 0.3s ease-in-out;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .yuanbao-toast.show {
            transform: translateX(0);
        }

        /* 响应式设计 */
        @media (max-width: 1200px) {
            .yuanbao-sidebar {
                width: 280px;
            }
            
            .yuanbao-sidebar.collapsed {
                transform: translateX(240px);
            }
        }

        @media (max-width: 768px) {
            .yuanbao-sidebar {
                width: 100%;
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                height: 100vh;
                border-left: none;
                border-bottom: 1px solid #e5e7eb;
            }
            
            .yuanbao-sidebar.collapsed {
                transform: translateY(-100%);
                width: 100%;
            }
            
            .sidebar-header {
                padding: 12px 16px;
            }
            
            .sidebar-title {
                font-size: 14px;
            }
            
            .question-item {
                padding: 10px;
            }
            
            .question-text {
                font-size: 13px;
            }
        }

        /* 暗色主题适配 */
        @media (prefers-color-scheme: dark) {
            .yuanbao-sidebar {
                background: #1f2937;
                border-left-color: #374151;
                color: #f9fafb;
            }
            
            .sidebar-header {
                background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            }
            
            .question-item {
                background: #374151;
                border-color: #4b5563;
                color: #f9fafb;
            }
            
            .question-item:hover {
                background: #4b5563;
                border-color: #6b7280;
            }
            
            .question-text {
                color: #e5e7eb;
            }
            
            .question-time {
                color: #9ca3af;
            }
            
            .sidebar-footer {
                background: #374151;
                border-top-color: #4b5563;
            }
            
            .empty-state {
                color: #9ca3af;
            }
        }

        /* 动画效果 */
        @keyframes slideIn {
            from {
                transform: translateX(100%);
            }
            to {
                transform: translateX(0);
            }
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
            }
            to {
                opacity: 1;
            }
        }

        .yuanbao-sidebar {
            animation: slideIn 0.3s ease-out;
        }

        .question-item {
            animation: fadeIn 0.2s ease-out;
        }
    `);

  class YuanbaoSidebarUserScript {
    constructor() {
      this.sidebar = null;
      this.isCollapsed = false;
      this.questions = [];
      this.observer = null;
      this.storageKey = "yuanbao_questions_history";

      this.init();
    }

    /**
     * 初始化侧边栏
     */
    async init() {
      // 等待页面加载完成
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () =>
          this.createSidebar()
        );
      } else {
        this.createSidebar();
      }

      // 加载历史记录
      await this.loadQuestions();

      // 开始监听对话变化
      this.startObserving();

      // 注册油猴菜单命令
      this.registerMenuCommands();
    }

    /**
     * 注册油猴菜单命令
     */
    registerMenuCommands() {
      GM_registerMenuCommand("切换侧边栏", () => this.toggleSidebar());
      GM_registerMenuCommand("清空历史记录", () => this.clearHistory());
      GM_registerMenuCommand("导出历史记录", () => this.exportHistory());
      GM_registerMenuCommand("导入历史记录", () => this.importHistory());
    }

    /**
     * 创建侧边栏DOM结构
     */
    createSidebar() {
      // 查找主容器
      const mainContainer = this.findMainContainer();
      if (!mainContainer) {
        console.warn("未找到合适的主容器，延迟重试...");
        setTimeout(() => this.createSidebar(), 1000);
        return;
      }

      // 创建侧边栏容器
      this.sidebar = document.createElement("div");
      this.sidebar.id = "yuanbao-sidebar";
      this.sidebar.className = "yuanbao-sidebar";

      // 创建侧边栏内容
      this.sidebar.innerHTML = `
                <div class="sidebar-header">
                    <h3 class="sidebar-title">
                        <span class="sidebar-icon">📝</span>
                        问题历史
                    </h3>
                    <button class="sidebar-toggle" title="收起/展开">
                        <span class="toggle-icon">◀</span>
                    </button>
                </div>
                <div class="sidebar-content">
                    <div class="questions-list" id="questions-list">
                        <div class="empty-state">
                            <p>暂无历史问题</p>
                            <small>开始对话后，您的问题将显示在这里</small>
                        </div>
                    </div>
                    <div class="sidebar-footer">
                        <button class="clear-history-btn" title="清空历史记录">
                            <span>🗑️</span> 清空记录
                        </button>
                    </div>
                </div>
            `;

      // 插入侧边栏
      document.body.appendChild(this.sidebar);

      // 绑定事件
      this.bindEvents();

      // 渲染历史问题
      this.renderQuestions();

      console.log("腾讯元宝侧边栏已成功创建（油猴脚本版本）");
    }

    /**
     * 查找合适的主容器
     */
    findMainContainer() {
      // 尝试多种选择器来找到主容器
      const selectors = [
        '[class*="main"]',
        '[class*="container"]',
        '[class*="layout"]',
        '[class*="content"]',
        "main",
        "#app > div",
        "body > div:first-child",
      ];

      for (const selector of selectors) {
        const container = document.querySelector(selector);
        if (container && container.offsetWidth > 800) {
          return container;
        }
      }

      // 如果都没找到，使用body
      return document.body;
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
      // 切换展开/收起
      const toggleBtn = this.sidebar.querySelector(".sidebar-toggle");
      toggleBtn.addEventListener("click", () => this.toggleSidebar());

      // 清空历史记录
      const clearBtn = this.sidebar.querySelector(".clear-history-btn");
      clearBtn.addEventListener("click", () => this.clearHistory());

      // 监听键盘事件
      document.addEventListener("keydown", (e) => {
        // Ctrl/Cmd + Shift + S 切换侧边栏
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "S") {
          e.preventDefault();
          this.toggleSidebar();
        }
      });
    }

    /**
     * 切换侧边栏展开/收起状态
     */
    toggleSidebar() {
      this.isCollapsed = !this.isCollapsed;
      this.sidebar.classList.toggle("collapsed", this.isCollapsed);

      const toggleIcon = this.sidebar.querySelector(".toggle-icon");
      toggleIcon.textContent = this.isCollapsed ? "▶" : "◀";

      // 保存状态
      GM_setValue("sidebar_collapsed", this.isCollapsed);
    }

    /**
     * 开始监听页面变化
     */
    startObserving() {
      // 监听DOM变化，检测新的用户消息
      this.observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === "childList") {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                this.checkForNewQuestions(node);
              }
            });
          }
        });
      });

      // 开始观察
      this.observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      // 也监听输入框的提交事件
      this.monitorInputSubmission();
    }

    /**
     * 监听输入框提交
     */
    monitorInputSubmission() {
      // 监听可能的提交按钮点击
      document.addEventListener("click", (e) => {
        const target = e.target;
        if (this.isSubmitButton(target)) {
          setTimeout(() => this.extractLatestQuestion(), 500);
        }
      });

      // 监听回车键提交
      document.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          const target = e.target;
          if (this.isInputElement(target)) {
            setTimeout(() => this.extractLatestQuestion(), 500);
          }
        }
      });
    }

    /**
     * 判断是否为提交按钮
     */
    isSubmitButton(element) {
      if (!element) return false;

      const buttonSelectors = [
        'button[type="submit"]',
        '[class*="send"]',
        '[class*="submit"]',
        '[title*="发送"]',
        '[aria-label*="发送"]',
      ];

      return buttonSelectors.some(
        (selector) => element.matches && element.matches(selector)
      );
    }

    /**
     * 判断是否为输入元素
     */
    isInputElement(element) {
      if (!element) return false;

      return (
        element.tagName === "TEXTAREA" ||
        element.tagName === "INPUT" ||
        element.contentEditable === "true"
      );
    }

    /**
     * 检查新添加的节点是否包含用户问题
     */
    checkForNewQuestions(node) {
      // 查找可能包含用户消息的元素
      const messageSelectors = [
        '[class*="user"]',
        '[class*="message"]',
        '[class*="question"]',
        '[data-role="user"]',
      ];

      messageSelectors.forEach((selector) => {
        const messages = node.querySelectorAll
          ? node.querySelectorAll(selector)
          : [];

        messages.forEach((msg) => this.extractQuestionFromElement(msg));
      });
    }

    /**
     * 提取最新的问题
     */
    extractLatestQuestion() {
      // 尝试从输入框获取刚提交的内容
      const inputElements = document.querySelectorAll(
        'textarea, input[type="text"], [contenteditable="true"]'
      );

      for (const input of inputElements) {
        const value = input.value || input.textContent || input.innerText;
        if (value && value.trim() && value.trim().length > 0) {
          this.addQuestion(value.trim());
          break;
        }
      }

      // 也尝试从页面上最新的用户消息元素获取
      setTimeout(() => this.extractQuestionsFromPage(), 1000);
    }

    /**
     * 从页面提取所有用户问题
     */
    extractQuestionsFromPage() {
      const messageSelectors = [
        '[class*="user-message"]',
        '[class*="user"]',
        '[data-role="user"]',
        '[class*="question"]',
      ];

      const foundQuestions = new Set();

      messageSelectors.forEach((selector) => {
        const messages = document.querySelectorAll(selector);
        messages.forEach((msg) => {
          const question = this.extractQuestionFromElement(msg);
          if (question) {
            foundQuestions.add(question);
          }
        });
      });

      // 添加新发现的问题
      foundQuestions.forEach((question) => {
        if (!this.questions.some((q) => q.text === question)) {
          this.addQuestion(question);
        }
      });
    }

    /**
     * 从DOM元素提取问题文本
     */
    extractQuestionFromElement(element) {
      if (!element) return null;

      // 尝试多种方式提取文本
      const textSelectors = [
        ".text-content",
        ".message-text",
        ".content",
        "p",
        "span",
        "div",
      ];

      for (const selector of textSelectors) {
        const textEl = element.querySelector(selector);
        if (textEl) {
          const text = (textEl.textContent || textEl.innerText || "").trim();
          if (text && text.length > 0 && text.length < 500) {
            return text;
          }
        }
      }

      // 如果没有找到子元素，直接使用元素本身的文本
      const text = (element.textContent || element.innerText || "").trim();
      if (text && text.length > 0 && text.length < 500) {
        return text;
      }

      return null;
    }

    /**
     * 添加新问题
     */
    async addQuestion(questionText) {
      if (!questionText || questionText.trim().length === 0) return;

      const question = {
        id: Date.now(),
        text: questionText.trim(),
        timestamp: new Date().toLocaleString("zh-CN"),
      };

      // 避免重复添加
      if (this.questions.some((q) => q.text === question.text)) {
        return;
      }

      this.questions.unshift(question); // 新问题添加到开头

      // 限制历史记录数量
      if (this.questions.length > 50) {
        this.questions = this.questions.slice(0, 50);
      }

      // 保存到存储
      await this.saveQuestions();

      // 重新渲染
      this.renderQuestions();

      console.log("新问题已添加:", question.text);
    }

    /**
     * 渲染问题列表
     */
    renderQuestions() {
      const questionsList = this.sidebar.querySelector("#questions-list");

      if (this.questions.length === 0) {
        questionsList.innerHTML = `
                    <div class="empty-state">
                        <p>暂无历史问题</p>
                        <small>开始对话后，您的问题将显示在这里</small>
                    </div>
                `;
        return;
      }

      questionsList.innerHTML = this.questions
        .map(
          (question) => `
                <div class="question-item" data-id="${question.id}">
                    <div class="question-text" title="${question.text}">
                        ${this.escapeHtml(question.text)}
                    </div>
                    <div class="question-meta">
                        <span class="question-time">${question.timestamp}</span>
                        <div class="question-actions">
                            <button class="action-btn copy-btn" title="复制问题" data-action="copy">
                                📋
                            </button>
                            <button class="action-btn reuse-btn" title="重新提问" data-action="reuse">
                                🔄
                            </button>
                            <button class="action-btn delete-btn" title="删除" data-action="delete">
                                ❌
                            </button>
                        </div>
                    </div>
                </div>
            `
        )
        .join("");

      // 绑定问题项事件
      this.bindQuestionEvents();
    }

    /**
     * 绑定问题项的事件
     */
    bindQuestionEvents() {
      const questionsList = this.sidebar.querySelector("#questions-list");

      questionsList.addEventListener("click", (e) => {
        const actionBtn = e.target.closest(".action-btn");
        if (!actionBtn) return;

        const questionItem = actionBtn.closest(".question-item");
        const questionId = parseInt(questionItem.dataset.id);
        const question = this.questions.find((q) => q.id === questionId);

        if (!question) return;

        const action = actionBtn.dataset.action;

        switch (action) {
          case "copy":
            this.copyQuestion(question.text);
            break;
          case "reuse":
            this.reuseQuestion(question.text);
            break;
          case "delete":
            this.deleteQuestion(questionId);
            break;
        }
      });
    }

    /**
     * 复制问题到剪贴板
     */
    async copyQuestion(questionText) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(questionText);
        } else {
          // 降级方案
          const textArea = document.createElement("textarea");
          textArea.value = questionText;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand("copy");
          document.body.removeChild(textArea);
        }
        this.showToast("问题已复制到剪贴板");
      } catch (err) {
        console.error("复制失败:", err);
        this.showToast("复制失败，请手动复制");
      }
    }

    /**
     * 重新使用问题（填入输入框）
     */
    reuseQuestion(questionText) {
      // 查找输入框
      const inputSelectors = [
        "textarea",
        'input[type="text"]',
        '[contenteditable="true"]',
      ];

      for (const selector of inputSelectors) {
        const input = document.querySelector(selector);
        if (input && input.offsetParent !== null) {
          // 确保元素可见
          if (input.tagName === "TEXTAREA" || input.tagName === "INPUT") {
            input.value = questionText;
            input.dispatchEvent(new Event("input", { bubbles: true }));
          } else if (input.contentEditable === "true") {
            input.textContent = questionText;
            input.dispatchEvent(new Event("input", { bubbles: true }));
          }

          input.focus();
          this.showToast("问题已填入输入框");
          return;
        }
      }

      this.showToast("未找到输入框");
    }

    /**
     * 删除问题
     */
    async deleteQuestion(questionId) {
      this.questions = this.questions.filter((q) => q.id !== questionId);
      await this.saveQuestions();
      this.renderQuestions();
      this.showToast("问题已删除");
    }

    /**
     * 清空历史记录
     */
    async clearHistory() {
      if (confirm("确定要清空所有历史记录吗？")) {
        this.questions = [];
        await this.saveQuestions();
        this.renderQuestions();
        this.showToast("历史记录已清空");
      }
    }

    /**
     * 导出历史记录
     */
    exportHistory() {
      if (this.questions.length === 0) {
        this.showToast("暂无历史记录可导出");
        return;
      }

      const data = {
        version: "1.0.0",
        exportTime: new Date().toISOString(),
        questions: this.questions,
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `yuanbao-questions-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showToast("历史记录已导出");
    }

    /**
     * 导入历史记录
     */
    importHistory() {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json";

      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target.result);
            if (data.questions && Array.isArray(data.questions)) {
              if (
                confirm(
                  `确定要导入 ${data.questions.length} 条历史记录吗？这将覆盖现有记录。`
                )
              ) {
                this.questions = data.questions;
                this.saveQuestions();
                this.renderQuestions();
                this.showToast(`已导入 ${data.questions.length} 条记录`);
              }
            } else {
              this.showToast("文件格式不正确");
            }
          } catch (err) {
            console.error("导入失败:", err);
            this.showToast("导入失败，请检查文件格式");
          }
        };
        reader.readAsText(file);
      };

      input.click();
    }

    /**
     * 显示提示消息
     */
    showToast(message) {
      // 创建toast元素
      const toast = document.createElement("div");
      toast.className = "yuanbao-toast";
      toast.textContent = message;

      document.body.appendChild(toast);

      // 显示动画
      setTimeout(() => toast.classList.add("show"), 100);

      // 自动隐藏
      setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => {
          if (toast.parentNode) {
            document.body.removeChild(toast);
          }
        }, 300);
      }, 2000);
    }

    /**
     * 转义HTML
     */
    escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }

    /**
     * 加载历史问题
     */
    async loadQuestions() {
      try {
        const questionsData = GM_getValue(this.storageKey, "[]");
        const collapsed = GM_getValue("sidebar_collapsed", false);

        this.questions = JSON.parse(questionsData);
        this.isCollapsed = collapsed;

        if (this.sidebar && this.isCollapsed) {
          this.sidebar.classList.add("collapsed");
          const toggleIcon = this.sidebar.querySelector(".toggle-icon");
          if (toggleIcon) toggleIcon.textContent = "▶";
        }
      } catch (err) {
        console.warn("加载历史记录失败:", err);
        this.questions = [];
      }
    }

    /**
     * 保存问题到存储
     */
    async saveQuestions() {
      try {
        GM_setValue(this.storageKey, JSON.stringify(this.questions));
      } catch (err) {
        console.warn("保存历史记录失败:", err);
      }
    }
  }

  // 初始化侧边栏
  new YuanbaoSidebarUserScript();
})();
