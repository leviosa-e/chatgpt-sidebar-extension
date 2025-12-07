/**
 * ChatGPT 对话目录 - Content Script
 * 用于在 ChatGPT 对话界面中添加侧边栏功能
 */
class ChatGPTSidebar {
  constructor() {
    // DOM 元素引用
    this.sidebar = null;

    this.isResizing = false;
    this.isCollapsed = false;
    this.questions = [];
    this.observer = null;
    this.currentURL = window.location.href;

    this.init();
  }

  /**
   * 生成唯一ID
   */
  generateUniqueId() {
    const uniqueId = `ybq-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    // console.log('🚀 ~ generateUniqueId uniqueId', uniqueId)
    return uniqueId;
  }

  /**
   * 初始化侧边栏
   */
  async init() {
    // 等待页面加载完成
    // 在我自己的 mac air 上依然会有水合 dismatch 的问题，所以先延时 3s 作为临时解决方案
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () =>
        setTimeout(() => this.createSidebar(), 3000)
      );
    } else {
      setTimeout(() => this.createSidebar(), 3000);
    }
  }

  /**
   * 创建侧边栏DOM结构
   */
  async createSidebar() {
    // 防止重复创建
    if (document.getElementById("yuanbao-sidebar")) {
      return;
    }

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
      <div class="sidebar-resizer"></div>
      <div class="sidebar-header h-header-height">
        <h3 class="sidebar-title text-token-text-primary">
          <span class="sidebar-icon">📝</span>
          ${chrome.i18n.getMessage("sidebarTitle")}
        </h3>
        <div class="sidebar-controls">
          <label class="star-filter-label">
            <input type="checkbox" class="star-filter-checkbox" />
            ${chrome.i18n.getMessage("filterStarred")}
          </label>
          <button class="sidebar-toggle text-token-text-primary no-draggable hover:bg-token-surface-hover keyboard-focused:bg-token-surface-hover touch:h-10 touch:w-10 flex h-9 w-9 items-center justify-center rounded-lg focus:outline-none disabled:opacity-50" title="收起/展开">
            <span class="toggle-icon">◀</span>
          </button>
        </div>
      </div>
      <div class="sidebar-content">
        <div class="questions-list" id="questions-list">
          <div class="empty-state">
            <p>${chrome.i18n.getMessage("emptyStateHeader")}</p>
            <small>${chrome.i18n.getMessage("emptyStateDescription")}</small>
          </div>
        </div>
         
      </div>
    `;

    // 插入侧边栏
    this.insertSidebar(mainContainer);

    // --- 初始化流程开始 ---

    // 1. 加载设置和数据
    await this.loadSidebarSettings();
    await this.loadQuestions();

    // 2. 绑定事件
    this.bindEvents();

    // 3. 设置调整大小功能
    this.setupResizing();

    // 4. 启动自动提取和监听
    this.waitForContentAndExtract();
    this.initDOMObserver();
    this.startObserving();

    window.addEventListener("resize", () => {
      const mainContainer = this.findMainContainer();
      this.updateLayoutSpacing(mainContainer);
    });

    console.log("侧边栏已成功创建和初始化");
  }

  initDOMObserver() {
    const observer = new MutationObserver(
      this.debounce(() => {
        this.ensureElements();
      }, 500)
    );

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  ensureElements() {
    if (window.location.href !== this.currentURL) {
      this.currentURL = window.location.href;
      this.handleConversationSwitch();
    }

    // 确保侧边栏存在
    if (this.sidebar && !document.body.contains(this.sidebar)) {
      const mainContainer = this.findMainContainer();
      if (mainContainer) {
        this.insertSidebar(mainContainer);
      }
    }

    // 确保目录按钮存在
    const header = document.getElementById("conversation-header-actions");
    if (header && !header.querySelector(".directory-toggle-btn")) {
      const button = document.createElement("button");
      button.textContent = chrome.i18n.getMessage("toggleButton");
      button.className =
        "directory-toggle-btn btn relative btn-ghost text-token-text-primary mx-2";
      button.addEventListener("click", () => this.toggleSidebar());
      header.prepend(button);
    }
  }

  async handleConversationSwitch() {
    this.questions = [];
    this.renderQuestions();
    await this.loadQuestions();
    this.waitForContentAndExtract();
  }

  waitForContentAndExtract() {
    const maxRetries = 10;
    let retryCount = 0;

    const intervalId = setInterval(() => {
      // Use a selector that indicates the chat is loaded.
      const chatLoadedIndicator = document.querySelector(
        '[class*="hyc-content-text"], [class*="whitespace-pre-wrap"]'
      );

      if (chatLoadedIndicator) {
        clearInterval(intervalId);
        console.log("对话内容已加载，自动提取问题...");
        this.extractQuestionsFromPage(false); // false for silent extraction
      } else {
        retryCount++;
        if (retryCount >= maxRetries) {
          clearInterval(intervalId);
          console.log("等待对话内容超时，未自动提取问题。");
        }
      }
    }, 1000); // Check every second
  }

  debounce(func, wait) {
    let timeout;
    return function (...args) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
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
    document.body.appendChild(this.sidebar);
    this.updateLayoutSpacing(mainContainer);
  }

  updateLayoutSpacing(mainContainer) {
    if (!mainContainer) return;
    const isMobile = window.innerWidth <= 768;
    if (this.isCollapsed || isMobile) {
      mainContainer.style.marginRight = "";
      document.documentElement.classList.remove("ybq-sidebar-open");
      return;
    }
    const width =
      parseInt(window.getComputedStyle(this.sidebar).width, 10) || 320;
    mainContainer.style.marginRight = width + "px";
    document.documentElement.classList.add("ybq-sidebar-open");
  }

  /**
   * 绑定事件监听器
   */
  bindEvents() {
    // 切换展开/收起
    const toggleBtn = this.sidebar.querySelector(".sidebar-toggle");
    toggleBtn.addEventListener("click", () => this.toggleSidebar());

    // “只显示星标”筛选
    const starFilterCheckbox = this.sidebar.querySelector(
      ".star-filter-checkbox"
    );
    starFilterCheckbox.addEventListener("change", () => {
      this.renderQuestions();
      chrome.storage.local.set({
        chatgpt_show_only_starred: starFilterCheckbox.checked,
      });
    });

    // 监听问题列表点击（事件委托）
    const questionsList = this.sidebar.querySelector("#questions-list");
    questionsList.addEventListener("click", (e) => {
      const questionItem = e.target.closest(".question-item");
      if (!questionItem) return;

      const actionBtn = e.target.closest(".action-btn");
      if (!actionBtn) {
        // 点击问题本身，滚动到对应位置
        const dataMessageId = questionItem.dataset.messageId;
        this.scrollToQuestion(dataMessageId);
        return;
      }

      const questionId = questionItem.dataset.messageId;
      const action = actionBtn.dataset.action;

      switch (action) {
        case "star":
          this.toggleStar(questionId);
          break;
        case "copy":
        case "reuse":
        case "delete":
          this.handleQuestionAction(action, questionId);
          break;
      }
    });
  }

  handleQuestionAction(action, questionId) {
    const question = this.questions.find((q) => q.dataMessageId === questionId);
    if (!question) return;

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
  }

  async toggleStar(questionId) {
    const question = this.questions.find((q) => q.dataMessageId === questionId);
    if (!question) return;

    question.isStarred = !question.isStarred;
    await this.saveQuestions();

    const showOnlyStarred = this.sidebar.querySelector(
      ".star-filter-checkbox"
    )?.checked;

    // 如果在“只显示星标”模式下取消星标，则需要重绘以移除该项
    if (showOnlyStarred && !question.isStarred) {
      this.renderQuestions();
    } else {
      // 否则，只更新DOM元素以避免闪烁
      const questionItem = this.sidebar.querySelector(
        `.question-item[data-message-id="${questionId}"]`
      );
      if (questionItem) {
        const starBtn = questionItem.querySelector(".star-btn");
        if (starBtn) {
          starBtn.classList.toggle("starred", question.isStarred);
          starBtn.title = question.isStarred
            ? chrome.i18n.getMessage("removeStarTitle")
            : chrome.i18n.getMessage("addStarTitle");
          starBtn.innerHTML = question.isStarred ? "★" : "☆";
        }
      }
    }
  }

  /**
   * 切换侧边栏展开/收起状态
   */
  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
    this.sidebar.classList.toggle("collapsed", this.isCollapsed);

    if (this.isCollapsed) {
      this.sidebar.style.display = "none";
    } else {
      this.sidebar.style.display = ""; // 或者恢复为 'flex' 等
    }

    const toggleIcon = this.sidebar.querySelector(".toggle-icon");
    if (toggleIcon) {
      toggleIcon.textContent = this.isCollapsed ? "▶" : "◀";
    }

    const mainContainer = this.findMainContainer();
    this.updateLayoutSpacing(mainContainer);

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
      // '[class*="whitespace-pre-wrap"]',
      '[data-message-author-role="user"]',
    ];

    const foundQuestions = new Set();
    let newQuestionsCount = 0;

    messageSelectors.forEach((selector) => {
      const messages = document.querySelectorAll(selector);
      Array.from(messages).forEach((msg) => {
        const questionData = this.extractQuestionFromElement(msg);

        if (
          questionData &&
          !this.questions.some((q) => q.text === questionData.text)
        ) {
          // 如果提取到有效问题，并且未被记录过，则添加到问题列表里
          if (this.addQuestion(questionData.text, msg.dataset.messageId)) {
            newQuestionsCount++;
          }
        } else if (
          questionData &&
          this.questions.some(
            (q) => q.text === questionData.text && !q.dataMessageId
          )
        ) {
          // 如果问题已存在但没有dataMessageId，则更新它
          const existingQuestion = this.questions.find(
            (q) => q.text === questionData.text
          );
          if (existingQuestion) {
            existingQuestion.dataMessageId = msg.dataset.messageId;
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
    // if (!element.id) {
    //   element.id = this.generateUniqueId();
    // }
    // const domId = element.id;

    // 尝试多种方式提取文本
    const textSelectors = [
      ".whitespace-pre-wrap",
      "div",
      // ".message-text",
      // ".content",
      // "p",
      // "span",
      // "pre",
      // "code",
    ];

    for (const selector of textSelectors) {
      const textEl = element.querySelector(selector);
      if (textEl) {
        const text = (textEl.textContent || textEl.innerText || "").trim();
        if (text && text.length > 0 && text.length < 500) {
          return { text };
        }
      }
    }

    // 如果没有找到子元素，直接使用元素本身的文本
    const text = (element.textContent || element.innerText || "").trim();
    if (text && text.length > 0 && text.length < 500) {
      return { text };
    }

    return null;
  }

  /**
   * 添加新问题
   * @param {string} questionText
   * @param {string | null} dataMessageId
   * @returns {boolean} - 是否成功添加了新问题
   */
  async addQuestion(questionText, dataMessageId = null) {
    if (!questionText || questionText.trim().length === 0) return false;

    const trimmedText = questionText.trim();

    // 避免重复添加
    if (this.questions.some((q) => q.text === trimmedText)) {
      // 如果问题已存在，但dataMessageId没有，则更新
      const existingQuestion = this.questions.find(
        (q) => q.text === trimmedText
      );
      if (
        existingQuestion &&
        !existingQuestion.dataMessageId &&
        dataMessageId
      ) {
        existingQuestion.dataMessageId = dataMessageId;
        await this.saveQuestions();
        this.renderQuestions(); // 更新UI以包含dataMessageId
      }
      return false;
    }

    const question = {
      id: dataMessageId,
      text: trimmedText,
      timestamp: new Date().toLocaleString("zh-CN"),
      dataMessageId: dataMessageId,
      isStarred: false, // 添加星标属性
    };

    this.questions.push(question);

    // 限制历史记录数量
    if (this.questions.length > 50) {
      this.questions = this.questions.slice(-50); // 保留最新的50条
    }

    await this.saveQuestions();
    this.renderQuestions();

    // console.log("新问题已添加:", question.text);
    return true;
  }

  /**
   * 渲染问题列表
   */
  renderQuestions() {
    const questionsList = this.sidebar.querySelector("#questions-list");
    const showOnlyStarred =
      this.sidebar.querySelector(".star-filter-checkbox")?.checked || false;

    const questionsToRender = showOnlyStarred
      ? this.questions.filter((q) => q.isStarred)
      : this.questions;

    if (questionsToRender.length === 0) {
      questionsList.innerHTML = `
        <div class="empty-state">
          <p>${
            showOnlyStarred
              ? chrome.i18n.getMessage("emptyStateStarredHeader")
              : chrome.i18n.getMessage("emptyStateHeader")
          }</p>
          <small>${
            showOnlyStarred
              ? chrome.i18n.getMessage("emptyStateStarredDescription")
              : chrome.i18n.getMessage("emptyStateDescription")
          }</small>
        </div>
      `;
      return;
    }

    questionsList.innerHTML = questionsToRender
      .map(
        (question) => `
      <div class="question-item" data-message-id="${
        question.dataMessageId
      }" data-id="${question.id}" title="${chrome.i18n.getMessage(
          "scrollToConversationTitle"
        )}">
        <div class="question-content-wrapper space-between">
          <div class="question-text">
            ${this.escapeHtml(question.text)}
          </div>
          <div class="flex-column">
           <button class="action-btn star-btn ${
             question.isStarred ? "starred" : ""
           }" title="${
          question.isStarred
            ? chrome.i18n.getMessage("removeStarTitle")
            : chrome.i18n.getMessage("addStarTitle")
        }" data-action="star">
             ${question.isStarred ? "★" : "☆"}
           </button>
           <button class="action-btn copy-btn" title="复制对话" data-action="copy">
              📋
            </button>
            </div>
         </div>
        </div>
    `
      )
      .join("");
    // <div class="question-meta">
    //       <div class="question-actions">
    //         <button class="action-btn copy-btn" title="复制对话" data-action="copy">
    //           📋
    //         </button>
    //         <button class="action-btn reuse-btn" title="重新提问" data-action="reuse">
    //           🔄
    //         </button>
    //         <button class="action-btn delete-btn" title="删除" data-action="delete">
    //           ❌
    //         </button>
    //       </div>
    //     </div>
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
   * @param {string} dataMessageId
   */
  scrollToQuestion(dataMessageId) {
    if (!dataMessageId) {
      this.showToast("该问题在当前页面没有对应的位置");
      return;
    }

    const element = document.querySelector(
      `[data-message-id="${dataMessageId}"]`
    );

    // console.log('🚀 ~ scrollToQuestion dataMessageId', dataMessageId)
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
   * 加载侧边栏设置（宽度和折叠状态）
   */
  async loadSidebarSettings() {
    try {
      const result = await chrome.storage.local.get([
        "sidebar_collapsed",
        "chatgpt_sidebar_width",
        "chatgpt_show_only_starred",
      ]);
      this.isCollapsed = result.sidebar_collapsed || false;
      const savedWidth = result.chatgpt_sidebar_width;
      const showOnlyStarred = result.chatgpt_show_only_starred || false;

      if (this.sidebar) {
        if (this.isCollapsed) {
          this.sidebar.classList.add("collapsed");
          this.sidebar.style.display = "none";
          const toggleIcon = this.sidebar.querySelector(".toggle-icon");
          if (toggleIcon) toggleIcon.textContent = "▶";
        }
        if (savedWidth) {
          this.sidebar.style.width = `${savedWidth}px`;
        }
        const starFilterCheckbox = this.sidebar.querySelector(
          ".star-filter-checkbox"
        );
        if (starFilterCheckbox) {
          starFilterCheckbox.checked = showOnlyStarred;
        }
        const mainContainer = this.findMainContainer();
        this.updateLayoutSpacing(mainContainer);
      }
    } catch (err) {
      console.warn("加载侧边栏设置失败:", err);
    }
  }

  /**
   * 加载历史问题
   */
  async loadQuestions() {
    const conversationId = this.getConversationId();
    if (!conversationId) {
      this.questions = [];
      this.renderQuestions();
      return;
    }
    const storageKey = `chatgpt_history_${conversationId}`;

    try {
      const result = await chrome.storage.local.get([storageKey]);
      this.questions = result[storageKey] || [];
      this.renderQuestions();
    } catch (err) {
      console.warn("加载历史记录失败:", err);
      this.questions = [];
    }
  }

  /**
   * 保存问题到存储
   */
  async saveQuestions() {
    const conversationId = this.getConversationId();
    if (!conversationId) {
      return; // Don't save if not in a conversation
    }
    const storageKey = `chatgpt_history_${conversationId}`;

    try {
      await chrome.storage.local.set({
        [storageKey]: this.questions,
      });
    } catch (err) {
      console.warn("保存历史记录失败:", err);
    }
  }

  getConversationId() {
    const match = window.location.href.match(/\/c\/([a-zA-Z0-9-]+)/);
    return match ? match[1] : null;
  }

  /**
   * 设置调整大小功能
   */
  setupResizing() {
    const resizer = this.sidebar.querySelector(".sidebar-resizer");
    if (!resizer) {
      return;
    }

    const handleMouseMove = (e) => {
      if (!this.isResizing) return;
      const deltaX = startX - e.clientX;
      const newWidth = startWidth + deltaX;

      if (newWidth >= 250 && newWidth <= 800) {
        this.sidebar.style.width = newWidth + "px";
        const mainContainer = this.findMainContainer();
        this.updateLayoutSpacing(mainContainer);
      }
    };

    const handleMouseUp = () => {
      if (!this.isResizing) return;
      this.isResizing = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);

      this.sidebar.classList.remove("resizing");
      document.body.classList.remove("chatgpt-dock-resizing");

      const finalWidth = parseInt(this.sidebar.style.width, 10);
      if (!isNaN(finalWidth)) {
        chrome.storage.local.set({ chatgpt_sidebar_width: finalWidth });
      }
    };

    let startX, startWidth;
    resizer.addEventListener("mousedown", (e) => {
      e.preventDefault();
      this.isResizing = true;
      startX = e.clientX;
      startWidth = parseInt(window.getComputedStyle(this.sidebar).width, 10);

      this.sidebar.classList.add("resizing");
      document.body.classList.add("chatgpt-dock-resizing");

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    });
  }
}

// 初始化侧边栏
if (typeof window !== "undefined") {
  new ChatGPTSidebar();
}
