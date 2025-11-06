document.addEventListener("DOMContentLoaded", function () {
  const clearCacheBtn = document.getElementById("clear-cache-btn");
  const statusMessage = document.getElementById("status-message");
  const userGuideBtn = document.getElementById("user-guide-btn");
  const feedbackBtn = document.getElementById("feedback-btn");
  const contactAuthorBtn = document.getElementById("contact-author-btn");
  const modal = document.getElementById("myModal");
  const closeBtn = document.getElementsByClassName("close")[0];

  if (userGuideBtn) {
    userGuideBtn.addEventListener("click", function () {
      chrome.tabs.create({
        url: "https://github.com/leviosa-e/chatgpt-sidebar-extension",
      });
    });
  }

  if (feedbackBtn) {
    feedbackBtn.addEventListener("click", function () {
      chrome.tabs.create({
        url: "https://github.com/leviosa-e/chatgpt-sidebar-extension/issues/new",
      });
    });
  }

  if (clearCacheBtn) {
    clearCacheBtn.addEventListener("click", function () {
      // Clear all local storage data for the extension
      chrome.storage.local.clear(function () {
        if (chrome.runtime.lastError) {
          statusMessage.textContent = "清除失败！";
          statusMessage.style.color = "red";
        } else {
          statusMessage.textContent = "缓存已清除！请刷新 ChatGPT 页面。";
          statusMessage.style.color = "#10a37f";
          clearCacheBtn.disabled = true;
          clearCacheBtn.textContent = "已清除";
        }
        statusMessage.style.display = "block";

        // Hide the message after a few seconds
        setTimeout(() => {
          statusMessage.style.display = "none";
          window.close(); // Close the popup
        }, 3000);
      });
    });
  }

  if (contactAuthorBtn) {
    contactAuthorBtn.addEventListener("click", function () {
      modal.style.display = "block";
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", function () {
      modal.style.display = "none";
    });
  }

  window.addEventListener("click", function (event) {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  });
});
