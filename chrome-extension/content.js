/**
 * 腾讯元宝侧边栏助手 - Content Script
 * 用于在腾讯元宝对话界面中添加侧边栏功能
 */

class YuanbaoSidebar {
  constructor() {
    this.sidebar = null;
    this.isCollapsed = false;
    this.questions = [];
    this.observer = null;
    this.storageKey = "yuanbao_questions_history";

    this.init();
  }

  /**
   * 生成唯一ID
   */
  generateUniqueId() {
    return `ybq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 初始化侧边栏
   */
  async init() {
    // 等待页面加载完成
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.createSidebar());
    } else {
      this.createSidebar();
    }

    // 加载历史记录
    await this.loadQuestions();

    // 开始监听对话变化
    this.startObserving();
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
          问题历史12
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
          <button class="extract-questions-btn" title="提取已有问题">
            <span>🔄</span> 提取问题
          </button>
          <button class="clear-history-btn" title="清空历史记录">
            <span>🗑️</span> 清空记录
          </button>
        </div>
      </div>
    `;

    // 插入侧边栏
    this.insertSidebar(mainContainer);

    // 绑定事件
    this.bindEvents();

    // 渲染历史问题
    this.renderQuestions();

    console.log("腾讯元宝侧边栏已成功创建");
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
   * 插入侧边栏到主容器
   */
  insertSidebar(mainContainer) {
    // 确保主容器使用flex布局
    const computedStyle = window.getComputedStyle(mainContainer);
    if (computedStyle.display !== "flex") {
      mainContainer.style.display = "flex";
    }

    // 插入侧边栏
    mainContainer.appendChild(this.sidebar);

    // 调整主容器的其他子元素
    const otherChildren = Array.from(mainContainer.children).filter(
      (child) => child !== this.sidebar
    );

    otherChildren.forEach((child) => {
      if (!child.style.flex) {
        child.style.flex = "1";
      }
    });
  }

  /**
   * 绑定事件监听器
   */
  bindEvents() {
    // 切换展开/收起
    const toggleBtn = this.sidebar.querySelector(".sidebar-toggle");
    toggleBtn.addEventListener("click", () => this.toggleSidebar());

    // 提取已有问题
    const extractBtn = this.sidebar.querySelector(".extract-questions-btn");
    extractBtn.addEventListener("click", () => {
      this.extractQuestionsFromPage();
      this.showToast("已尝试提取当前页面问题");
    });

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

    // 监听问题列表点击
    const questionsList = this.sidebar.querySelector("#questions-list");
    questionsList.addEventListener("click", (e) => {
      const questionItem = e.target.closest(".question-item");
      if (!questionItem) return;

      const actionBtn = e.target.closest(".action-btn");
      const questionId = parseInt(questionItem.dataset.id);
      const question = this.questions.find((q) => q.id === questionId);

      if (!question) return;

      if (actionBtn) {
        // 点击的是操作按钮
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
      } else {
        // 点击的是问题本身
        this.scrollToQuestion(question.domId);
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
    chrome.storage.local.set({ sidebar_collapsed: this.isCollapsed });
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
      '[data-testid*="send"]',
      '[class*="icon-send"]',
    ];

    for (const selector of buttonSelectors) {
      if (element.matches && element.matches(selector)) {
        return true;
      }
    }

    // Check parents for button-like behavior
    let parent = element.parentElement;
    for (let i = 0; i < 3 && parent; i++) {
      for (const selector of buttonSelectors) {
        if (parent.matches && parent.matches(selector)) {
          return true;
        }
      }
      parent = parent.parentElement;
    }

    return false;
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
      '[class*="whitespace-pre-wrap"]',
      '[class*="user"]',
      '[class*="message"]',
      '[class*="question"]',
      '[class*="query"]',
      '[class*="prompt"]',
      '[data-role="user"]',
      '[data-from="user"]',
      '[data-testid*="user-message"]',
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
        // Clear the input after capturing, if possible and desired
        // if (input.value) input.value = '';
        // else if (input.textContent) input.textContent = '';
        break;
      }
    }

    // 也尝试从页面上最新的用户消息元素获取
    setTimeout(() => this.extractQuestionsFromPage(true), 1000);
  }

  /**
   * 从页面提取所有用户问题
   * @param {boolean} isManual - 是否为手动触发
   */
  extractQuestionsFromPage(isManual = false) {
    const messageSelectors = [
      '[class*="hyc-content-text"]',
      '[class*="whitespace-pre-wrap"]',
      // '[class*="user-message"]',
      // '[class*="human-message"]',
      // '[class*="user"]',
      // '[class*="human"]',
      // '[data-role="user"]',
      // '[data-from="user"]',
      // '[class*="question"]',
      // '[class*="query"]',
      // '[class*="prompt"]',
      // '[data-testid*="user-message"]',
    ];

    const foundQuestions = new Set();
    let newQuestionsCount = 0;

    messageSelectors.forEach((selector) => {
      const messages = document.querySelectorAll(selector);
      messages.forEach((msg) => {
        const questionData = this.extractQuestionFromElement(msg);
        if (
          questionData &&
          !this.questions.some((q) => q.text === questionData.text)
        ) {
          if (this.addQuestion(questionData.text, questionData.domId)) {
            newQuestionsCount++;
          }
        } else if (
          questionData &&
          this.questions.some((q) => q.text === questionData.text && !q.domId)
        ) {
          // 如果问题已存在但没有domId，则更新它
          const existingQuestion = this.questions.find(
            (q) => q.text === questionData.text
          );
          if (existingQuestion) {
            existingQuestion.domId = questionData.domId;
            this.saveQuestions();
          }
        }
      });
    });

    if (isManual) {
      if (newQuestionsCount > 0) {
        this.showToast(`成功提取了 ${newQuestionsCount} 个新问题`);
      } else {
        this.showToast("未在当前页面上发现新的问题");
      }
    }
  }

  /**
   * 从DOM元素提取问题文本
   */
  extractQuestionFromElement(element) {
    if (!element || element.closest(".yuanbao-sidebar")) return null; // 忽略侧边栏内的内容

    // 如果元素没有ID，则分配一个
    if (!element.id) {
      element.id = this.generateUniqueId();
    }
    const domId = element.id;

    // 尝试多种方式提取文本
    const textSelectors = [
      ".text-content",
      ".message-text",
      ".content",
      "p",
      "span",
      "div",
      "pre",
      "code",
    ];

    for (const selector of textSelectors) {
      const textEl = element.querySelector(selector);
      if (textEl) {
        const text = (textEl.textContent || textEl.innerText || "").trim();
        if (text && text.length > 0 && text.length < 500) {
          return { text, domId };
        }
      }
    }

    // 如果没有找到子元素，直接使用元素本身的文本
    const text = (element.textContent || element.innerText || "").trim();
    if (text && text.length > 0 && text.length < 500) {
      return { text, domId };
    }

    return null;
  }

  /**
   * 添加新问题
   * @param {string} questionText
   * @param {string | null} domId
   * @returns {boolean} - 是否成功添加了新问题
   */
  async addQuestion(questionText, domId = null) {
    if (!questionText || questionText.trim().length === 0) return false;

    const trimmedText = questionText.trim();

    // 避免重复添加
    if (this.questions.some((q) => q.text === trimmedText)) {
      // 如果问题已存在，但domId没有，则更新
      const existingQuestion = this.questions.find(
        (q) => q.text === trimmedText
      );
      if (existingQuestion && !existingQuestion.domId && domId) {
        existingQuestion.domId = domId;
        await this.saveQuestions();
        this.renderQuestions(); // 更新UI以包含domId
      }
      return false;
    }

    const question = {
      id: Date.now(),
      text: trimmedText,
      timestamp: new Date().toLocaleString("zh-CN"),
      domId: domId,
    };

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
    return true;
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
      <div class="question-item" data-id="${question.id}" ${
          question.domId ? `data-dom-id="${question.domId}"` : ""
        } title="点击定位问题位置">
        <div class="question-text">
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

    // 绑定问题项事件 (事件委托已移至bindEvents)
    // this.bindQuestionEvents();
  }

  /**
   * 绑定问题项的事件
   */
  bindQuestionEvents() {
    // 此方法的内容已移至 bindEvents 中，使用事件委托实现
    // 保留此空方法以避免破坏现有调用结构，或在未来用于其他目的
  }

  /**
   * 滚动到指定问题
   * @param {string} domId
   */
  scrollToQuestion(domId) {
    if (!domId) {
      this.showToast("该问题在当前页面没有对应的位置");
      return;
    }

    const element = document.getElementById(domId);

    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      // 添加高亮效果
      element.style.transition = "background-color 0.3s ease";
      element.style.backgroundColor = "rgba(255, 255, 0, 0.5)";
      setTimeout(() => {
        element.style.backgroundColor = "";
      }, 1500);
    } else {
      this.showToast("无法在当前页面找到该问题的位置");
    }
  }

  /**
   * 复制问题到剪贴板
   */
  async copyQuestion(questionText) {
    try {
      await navigator.clipboard.writeText(questionText);
      this.showToast("问题已复制到剪贴板");
    } catch (err) {
      // 降级方案
      const textArea = document.createElement("textarea");
      textArea.value = questionText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      this.showToast("问题已复制到剪贴板");
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
      setTimeout(() => document.body.removeChild(toast), 300);
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
      const result = await chrome.storage.local.get([
        this.storageKey,
        "sidebar_collapsed",
      ]);
      this.questions = result[this.storageKey] || [];
      this.isCollapsed = result.sidebar_collapsed || false;

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
      await chrome.storage.local.set({
        [this.storageKey]: this.questions,
      });
    } catch (err) {
      console.warn("保存历史记录失败:", err);
    }
  }
}

// 初始化侧边栏
if (typeof window !== "undefined") {
  new YuanbaoSidebar();
}
