// 元宝助手 - 内容脚本
(function () {
  // 为当前标签页生成唯一标识符
  const tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`元宝助手: 标签页ID = ${tabId}`);

  // 存储设置和状态
  const settings = {
    dockWidth: 350,
    isVisible: false,
    showOnlyStarred: false,
    starredItems: {},
  };

  // DOM 元素引用
  let toggleButton = null;
  let dockWindow = null;
  let dockContent = null;
  let resizer = null;
  let isResizing = false;

  // 初始化函数
  function init() {
    console.log("元宝助手: 开始初始化");

    // 检查是否已经初始化
    if (document.querySelector(".yuanbao-toggle-button")) {
      console.log("元宝助手: 已存在，跳过初始化");
      return;
    }

    // 加载保存的设置
    loadSettings().then(() => {
      // 创建开关按钮
      createToggleButton();

      // 创建dock窗口
      createDockWindow();

      // 设置 MutationObserver 监听页面变化
      setupMutationObserver();

      // 延迟扫描页面，确保DOM已完全加载
      // 延迟扫描页面，确保DOM已完全加载
      setTimeout(() => {
        // 先进行一次扫描，检查是否有对话内容
        scanPageForConversations();

        // 如果没有找到对话，再尝试几次
        let retryCount = 0;
        const maxRetries = 5;
        const retryInterval = 1000;

        function retryScanning() {
          const hasConversations =
            document.querySelectorAll(
              '.agent-chat__list__item--human, [data-conv-speaker="human"]'
            ).length > 0;

          if (!hasConversations && retryCount < maxRetries) {
            console.log(
              `元宝助手: 重试扫描页面 (${retryCount + 1}/${maxRetries})`
            );
            retryCount++;
            scanPageForConversations();
            setTimeout(retryScanning, retryInterval);
          }
        }

        retryScanning();
      }, 1000);

      console.log("元宝助手: 初始化完成");
    });
  }

  // 加载保存的设置
  function loadSettings() {
    return new Promise((resolve) => {
      // 为标签页特定的设置添加前缀
      const keys = [
        "dockWidth", // 全局设置
        "isVisible", // 全局设置
        `showOnlyStarred_${tabId}`, // 标签页特定
        `starredItems_${tabId}`, // 标签页特定
      ];

      chrome.storage.local.get(keys, (result) => {
        if (result.dockWidth) settings.dockWidth = result.dockWidth;
        if (result.isVisible !== undefined)
          settings.isVisible = result.isVisible;
        if (result[`showOnlyStarred_${tabId}`] !== undefined) {
          settings.showOnlyStarred = result[`showOnlyStarred_${tabId}`];
        }
        if (result[`starredItems_${tabId}`]) {
          settings.starredItems = result[`starredItems_${tabId}`];
        }
        resolve();
      });
    });
  }

  // 保存设置
  function saveSettings(key, value) {
    const data = {};

    // 为标签页特定的设置添加前缀
    if (key === "showOnlyStarred" || key === "starredItems") {
      const prefixedKey = `${key}_${tabId}`;
      data[prefixedKey] = value;
      chrome.storage.local.set(data);
    } else {
      // 全局设置保持原样
      data[key] = value;
      chrome.storage.local.set(data);
    }

    settings[key] = value;
  }

  // 创建开关按钮
  function createToggleButton() {
    // 查找工具栏容器
    const toolbarContainer = document.querySelector(
      ".agent-dialogue__tool__download"
    );
    if (!toolbarContainer) {
      console.log("元宝助手: 未找到工具栏容器，稍后重试");
      return false;
    }

    toggleButton = document.createElement("div");
    toggleButton.className = "yuanbao-toggle-button";

    // 创建按钮内容
    const buttonContent = document.createElement("div");
    buttonContent.className = "yuanbao-toggle-content";
    buttonContent.innerHTML = `
      <div class="yuanbao-toggle-text">目录</div>
    `;

    toggleButton.appendChild(buttonContent);
    toggleButton.title = "显示对话目录";

    if (settings.isVisible) {
      toggleButton.classList.add("active");
    }

    toggleButton.addEventListener("click", toggleDock);

    // 将按钮添加到工具栏容器的最后
    toolbarContainer.appendChild(toggleButton);

    console.log("元宝助手: 开关按钮创建完成");
    return true;
  }

  // 显示开关按钮
  function showToggleButton() {
    if (toggleButton) {
      toggleButton.style.display = "block";
      console.log("元宝助手: 显示开关按钮");
    }
  }

  // 隐藏开关按钮
  function hideToggleButton() {
    if (toggleButton) {
      toggleButton.style.display = "none";
      // 如果按钮隐藏，同时隐藏dock
      if (settings.isVisible) {
        hideDock();
      }
      console.log("元宝助手: 隐藏开关按钮");
    }
  }

  // 创建dock窗口
  function createDockWindow() {
    dockWindow = document.createElement("div");
    dockWindow.className = "yuanbao-dock";
    if (settings.isVisible) {
      dockWindow.classList.add("show");
      document.body.classList.add("yuanbao-dock-active");
      document.body.style.marginRight = `${settings.dockWidth}px`;
    }

    // 设置dock宽度
    dockWindow.style.width = `${settings.dockWidth}px`;

    // 创建调整大小控制条
    resizer = document.createElement("div");
    resizer.className = "yuanbao-dock-resizer";

    // 创建窗口头部
    const header = document.createElement("div");
    header.className = "yuanbao-dock-header";

    const title = document.createElement("h2");
    title.className = "yuanbao-dock-title";
    title.textContent = "元宝助手";

    // 创建星标过滤器（放在头部）
    const starFilter = document.createElement("div");
    starFilter.className = "yuanbao-star-filter";

    const filterLabel = document.createElement("label");
    filterLabel.innerHTML =
      '只显示星标 <input type="checkbox" id="yuanbao-star-filter-toggle">';

    const checkbox = filterLabel.querySelector("#yuanbao-star-filter-toggle");
    checkbox.checked = settings.showOnlyStarred;
    checkbox.addEventListener("change", function () {
      const showOnlyStarred = this.checked;
      saveSettings("showOnlyStarred", showOnlyStarred);
      applyStarFilter();
    });

    starFilter.appendChild(filterLabel);

    const controls = document.createElement("div");
    controls.className = "yuanbao-dock-controls";

    // 只保留关闭按钮
    const closeBtn = document.createElement("button");
    closeBtn.className = "yuanbao-dock-control-btn yuanbao-close-btn";
    closeBtn.innerHTML = "×";
    closeBtn.title = "关闭";
    closeBtn.addEventListener("click", hideDock);

    controls.appendChild(closeBtn);

    header.appendChild(title);
    header.appendChild(starFilter);
    header.appendChild(controls);

    // 创建内容区域
    dockContent = document.createElement("div");
    dockContent.className = "yuanbao-dock-content";

    // 组装dock窗口
    dockWindow.appendChild(resizer);
    dockWindow.appendChild(header);
    dockWindow.appendChild(dockContent);

    // 添加到页面
    document.body.appendChild(dockWindow);

    // 设置调整大小功能
    setupResizing();

    console.log("元宝助手: Dock窗口创建完成");
  }

  // 切换dock显示/隐藏
  function toggleDock() {
    if (settings.isVisible) {
      hideDock();
    } else {
      showDock();
    }
  }

  // 显示dock
  function showDock() {
    settings.isVisible = true;
    saveSettings("isVisible", true);

    dockWindow.classList.add("show");
    toggleButton.classList.add("active");
    document.body.classList.add("yuanbao-dock-active");
    document.body.style.marginRight = `${settings.dockWidth}px`;

    // 扫描页面内容
    scanPageForConversations();

    console.log("元宝助手: Dock已显示");
  }

  // 隐藏dock
  function hideDock() {
    settings.isVisible = false;
    saveSettings("isVisible", false);

    dockWindow.classList.remove("show");
    toggleButton.classList.remove("active");
    document.body.classList.remove("yuanbao-dock-active");
    document.body.style.marginRight = "";

    console.log("元宝助手: Dock已隐藏");
  }

  // 设置调整大小功能
  function setupResizing() {
    let startX, startWidth, startBodyMargin;

    resizer.addEventListener("mousedown", function (e) {
      isResizing = true;
      startX = e.clientX;
      startWidth = parseInt(getComputedStyle(dockWindow).width, 10);
      startBodyMargin =
        parseInt(getComputedStyle(document.body).marginRight, 10) || 0;

      // 添加resizing类，禁用过渡效果
      dockWindow.classList.add("resizing");
      document.body.classList.add("yuanbao-dock-resizing");

      document.addEventListener("mousemove", handleResize);
      document.addEventListener("mouseup", stopResize);

      e.preventDefault();
    });

    function handleResize(e) {
      if (!isResizing) return;

      // 计算新宽度（向左拖拽增加宽度）
      const deltaX = startX - e.clientX;
      const newWidth = startWidth + deltaX;

      // 限制宽度范围
      if (newWidth >= 250 && newWidth <= 600) {
        dockWindow.style.width = newWidth + "px";

        // 同时调整body的margin
        if (settings.isVisible) {
          document.body.style.marginRight = newWidth + "px";
        }

        // 保存设置
        settings.dockWidth = newWidth;
        saveSettings("dockWidth", newWidth);
      }
    }

    function stopResize() {
      isResizing = false;

      // 移除resizing类，恢复过渡效果
      dockWindow.classList.remove("resizing");
      document.body.classList.remove("yuanbao-dock-resizing");

      document.removeEventListener("mousemove", handleResize);
      document.removeEventListener("mouseup", stopResize);
    }
  }

  // 扫描页面寻找对话内容
  function scanPageForConversations() {
    console.log("元宝助手: 开始扫描页面对话");

    // 清空当前目录内容
    dockContent.innerHTML = "";

    // 只选择用户的问题，过滤掉元宝的回答
    let conversations = [];

    // 首先尝试使用元宝特定的选择器，只选择用户消息
    const userMessageSelector =
      '.agent-chat__list__item--human, [data-conv-speaker="human"]';
    const userElements = document.querySelectorAll(userMessageSelector);

    if (userElements.length > 0) {
      console.log(`元宝助手: 找到 ${userElements.length} 个用户问题`);
      conversations = Array.from(userElements);
    } else {
      // 备用方案：查找所有对话项，然后过滤出用户消息
      const allItems = document.querySelectorAll(".agent-chat__list__item");
      if (allItems.length > 0) {
        conversations = Array.from(allItems).filter((item) => {
          // 检查是否是用户消息
          return (
            item.classList.contains("agent-chat__list__item--human") ||
            item.getAttribute("data-conv-speaker") === "human" ||
            // 排除AI消息
            (!item.classList.contains("agent-chat__list__item--ai") &&
              item.getAttribute("data-conv-speaker") !== "ai")
          );
        });
        console.log(
          `元宝助手: 从 ${allItems.length} 个对话项中过滤出 ${conversations.length} 个用户问题`
        );
      } else {
        // 最后的备用方案：使用通用选择器
        console.log("元宝助手: 使用备用选择器查找对话");
        const selectors = [
          ".hyc-content-text",
          ".conversation-item",
          ".chat-message",
          ".message-item",
          '[class*="message"]',
          '[class*="conversation"]',
          '[class*="chat"]',
        ];

        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            conversations = Array.from(elements).filter((el) => {
              const text = el.textContent.trim();
              const rect = el.getBoundingClientRect();
              return text.length > 20 && rect.width > 200 && rect.height > 30;
            });
            if (conversations.length > 0) {
              console.log(
                `元宝助手: 使用选择器 ${selector} 找到 ${conversations.length} 个元素`
              );
              break;
            }
          }
        }
      }
    }

    // 去重，避免重复的对话项
    conversations = conversations.filter(
      (item, index, self) => self.indexOf(item) === index
    );

    console.log(`元宝助手: 处理 ${conversations.length} 个对话元素`);

    if (conversations.length === 0) {
      const noConversationsMsg = document.createElement("div");
      noConversationsMsg.className = "yuanbao-no-conversations";
      noConversationsMsg.innerHTML = `
        <div>未检测到对话内容</div>
        <div>
          请确认您在元宝对话页面，<br>
          或点击刷新按钮重试
        </div>
      `;
      dockContent.appendChild(noConversationsMsg);
      return;
    }

    conversations.forEach((conversation, index) => {
      try {
        const tocItem = document.createElement("div");
        tocItem.className = "yuanbao-toc-item";

        // 使用元宝的唯一ID作为星标的key，但不依赖它来匹配目录项
        const conversationId =
          conversation.getAttribute("data-conv-id") || `conversation-${index}`;

        // 添加星标图标
        const starIcon = document.createElement("span");
        starIcon.className = "yuanbao-star-icon";
        starIcon.innerHTML = settings.starredItems[conversationId] ? "★" : "☆";
        if (settings.starredItems[conversationId]) {
          starIcon.classList.add("starred");
        }

        starIcon.addEventListener("click", function (e) {
          e.stopPropagation();
          const isStarred = this.classList.toggle("starred");
          this.innerHTML = isStarred ? "★" : "☆";

          const newStarredItems = { ...settings.starredItems };
          if (isStarred) {
            newStarredItems[conversationId] = true;
          } else {
            delete newStarredItems[conversationId];
          }
          saveSettings("starredItems", newStarredItems);

          if (settings.showOnlyStarred) {
            applyStarFilter();
          }
        });

        // 提取对话内容文本
        const itemText = extractConversationText(conversation, index);

        const textSpan = document.createElement("span");
        textSpan.className = "yuanbao-toc-item-text";
        textSpan.textContent = itemText;

        tocItem.appendChild(starIcon);
        tocItem.appendChild(textSpan);

        // 添加点击事件
        tocItem.addEventListener("click", () => {
          conversation.scrollIntoView({ behavior: "smooth", block: "start" });
        });

        dockContent.appendChild(tocItem);

        console.log(
          `元宝助手: 创建目录项 ${index}: ${itemText.substring(0, 20)}...`
        );
      } catch (error) {
        console.error("元宝助手: 处理对话元素时出错", error);
      }
    });

    // 应用星标过滤
    if (settings.showOnlyStarred) {
      applyStarFilter();
    }

    console.log(`元宝助手: 成功创建 ${dockContent.children.length} 个目录项`);
  }

  // 提取对话内容文本
  function extractConversationText(conversation, index) {
    try {
      let itemText = "";

      // 元宝特定的文本提取选择器，按优先级排序
      const selectors = [
        // 元宝特定的文本内容
        ".hyc-content-text",
        // 对话气泡内容
        ".agent-chat__bubble__content",
        // 其他可能的元宝类名
        '[class*="hyc-content"]',
        '[class*="agent-chat__bubble"]',
        // 备用选择器
        ".question-content",
        ".user-message",
        ".query",
        '[class*="user"]',
        '[class*="question"]',
        "h1, h2, h3, h4, h5, h6",
        "p",
        ".markdown-body",
        "div > strong",
        "div > b",
      ];

      // 尝试使用特定选择器提取文本
      for (const selector of selectors) {
        const element = conversation.querySelector(selector);
        if (element) {
          itemText = element.textContent.trim();
          if (itemText.length > 0) {
            console.log(
              `元宝助手: 使用选择器 ${selector} 提取到文本: ${itemText.substring(
                0,
                30
              )}...`
            );
            break;
          }
        }
      }

      // 如果没有找到特定元素，使用整个对话容器的文本
      if (!itemText) {
        itemText = conversation.textContent.trim();
        console.log(
          `元宝助手: 使用整个容器文本: ${itemText.substring(0, 30)}...`
        );
      }

      // 清理文本
      itemText = itemText
        .replace(/\s+/g, " ") // 替换多个空白字符为单个空格
        .replace(/^[^a-zA-Z\u4e00-\u9fa5]+/, "") // 移除开头的非字母和非中文字符
        .trim();

      // 截断过长的文本
      if (itemText.length > 60) {
        itemText = itemText.substring(0, 57) + "...";
      } else if (itemText.length === 0) {
        itemText = `对话 ${index + 1}`;
      }

      return itemText;
    } catch (error) {
      console.error("元宝助手: 提取对话文本时出错", error);
      return `对话 ${index + 1}`;
    }
  }

  // 应用星标过滤
  function applyStarFilter() {
    const allItems = dockContent.querySelectorAll(".yuanbao-toc-item");
    const conversations = document.querySelectorAll(
      ".agent-chat__list__item--human"
    );

    allItems.forEach((item, index) => {
      // 获取对应对话的ID
      const conversation = conversations[index];
      if (conversation) {
        const conversationId =
          conversation.getAttribute("data-conv-id") || `conversation-${index}`;
        const isStarred = settings.starredItems[conversationId];

        if (settings.showOnlyStarred && !isStarred) {
          item.style.display = "none";
        } else {
          item.style.display = "";
        }
      }
    });
  }

  // 设置 MutationObserver 监听页面变化
  function setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      if (!settings.isVisible) return;

      let hasNewConversations = false;

      for (const mutation of mutations) {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // 检查是否有新的用户问题（只关注用户消息，不关注AI回答）
              if (
                node.querySelector(
                  '.agent-chat__list__item--human, [data-conv-speaker="human"]'
                ) ||
                node.classList.contains("agent-chat__list__item--human") ||
                node.getAttribute("data-conv-speaker") === "human" ||
                // 检查是否包含用户问题的文本内容
                (node.querySelector(".hyc-content-text") &&
                  !node.querySelector(".agent-chat__list__item--ai") &&
                  !node.querySelector('[data-conv-speaker="ai"]')) ||
                // 备用检查（排除明确的AI消息）
                (node.querySelector(
                  '.conversation-item, .chat-message, .message-item, [class*="message"], [class*="conversation"]'
                ) &&
                  !node.className.includes("ai") &&
                  !node.className.includes("assistant"))
              ) {
                hasNewConversations = true;
                console.log("元宝助手: 检测到新的用户问题");
                break;
              }
            }
          }
        }

        if (hasNewConversations) break;
      }

      if (hasNewConversations) {
        debounce(scanPageForConversations, 500)();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // 辅助函数：防抖
  function debounce(func, wait) {
    let timeout;
    return function () {
      const context = this;
      const args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        func.apply(context, args);
      }, wait);
    };
  }

  // 检测元宝Web版页面
  function isYuanbaoWebPage() {
    const isYuanbaoURL = window.location.hostname === "yuanbao.tencent.com";
    const hasYuanbaoContent =
      document.body.textContent.includes("元宝") ||
      document.title.includes("元宝");
    const hasYuanbaoElements =
      document.querySelector(
        '[class*="yuanbao"], [id*="yuanbao"], [class*="chat"], [class*="conversation"]'
      ) !== null;

    const result = isYuanbaoURL && (hasYuanbaoContent || hasYuanbaoElements);
    console.log(`元宝助手: 页面检测结果 = ${result}`, {
      isYuanbaoURL,
      hasYuanbaoContent,
      hasYuanbaoElements,
      url: window.location.href,
      title: document.title,
    });

    return result;
  }

  // 当页面加载完成后初始化
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(() => {
        if (isYuanbaoWebPage()) {
          init();
        }
      }, 1000);
    });
  } else {
    setTimeout(() => {
      if (isYuanbaoWebPage()) {
        init();
      }
    }, 1000);
  }

  // 监听URL变化，以便在SPA应用中重新初始化
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      setTimeout(() => {
        if (isYuanbaoWebPage()) {
          // 如果组件已存在，先移除
          if (toggleButton) {
            document.body.removeChild(toggleButton);
            toggleButton = null;
          }
          if (dockWindow) {
            document.body.removeChild(dockWindow);
            dockWindow = null;
          }
          // 重置body样式
          document.body.classList.remove("yuanbao-dock-active");
          document.body.style.marginRight = "";

          init();
        }
      }, 1000);
    }
  }).observe(document, { subtree: true, childList: true });

  // 监听来自popup的消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("收到消息:", message);

    switch (message.action) {
      case "toggleDock":
        toggleDock();
        sendResponse({ success: true });
        break;

      case "toggleStarredFilter":
        toggleStarredFilter();
        sendResponse({ success: true });
        break;

      case "clearAllStars":
        clearAllStars();
        sendResponse({ success: true });
        break;

      case "getStats":
        const stats = getConversationStats();
        sendResponse(stats);
        break;

      default:
        sendResponse({ success: false, error: "Unknown action" });
    }

    return true; // 保持消息通道开放
  });

  // 切换星标筛选
  function toggleStarredFilter() {
    const dock = document.querySelector(".yuanbao-dock");
    if (!dock) return;

    const checkbox = dock.querySelector(
      '.yuanbao-star-filter input[type="checkbox"]'
    );
    if (checkbox) {
      checkbox.checked = !checkbox.checked;
      checkbox.dispatchEvent(new Event("change"));
    }
  }

  // 清除所有星标
  function clearAllStars() {
    const dock = document.querySelector(".yuanbao-dock");
    if (!dock) return;

    // 清除所有星标标记
    const starredItems = dock.querySelectorAll(".yuanbao-star-icon.starred");
    starredItems.forEach((star) => {
      star.classList.remove("starred");
      star.textContent = "☆";
    });

    // 清除存储的星标数据
    saveSettings("starredItems", {});

    // 如果当前是筛选模式，刷新显示
    const checkbox = dock.querySelector(
      '.yuanbao-star-filter input[type="checkbox"]'
    );
    if (checkbox && checkbox.checked) {
      checkbox.dispatchEvent(new Event("change"));
    }

    console.log("已清除所有星标");
  }

  // 获取对话统计信息
  function getConversationStats() {
    const items = document.querySelectorAll(".agent-chat__list__item--human");
    let starredCount = 0;

    items.forEach((item) => {
      const conversationId = item.getAttribute("data-conv-id");
      if (conversationId && settings.starredItems[conversationId]) {
        starredCount++;
      }
    });

    return {
      totalConversations: items.length,
      starredConversations: starredCount,
    };
  }
})();
