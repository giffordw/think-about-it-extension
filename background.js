// Listen for installation of the extension
chrome.runtime.onInstalled.addListener(() => {
  console.log("Think About It extension has been installed!");
});

// Handle messages from popup.js or content.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // If we need to handle specific background actions in the future
  if (message.action === "log") {
    console.log("Think About It log:", message.data);
    sendResponse({ success: true });
  }

  // Handle request from content script to open popup and immediately run analysis
  if (message.action === "openPopupAndAnalyze") {
    // Set a temporary flag in storage so the popup knows to auto-run analysis
    chrome.storage.local.set({ "autoRunAnalyze": true }, () => {
      // Try to open the action popup programmatically
      if (chrome.action && chrome.action.openPopup) {
        try {
          chrome.action.openPopup();
        } catch (e) {
          console.error('Could not open popup programmatically:', e);
        }
      }
    });
    sendResponse({ status: 'requested' });
  }
  return true;
});

// Listener for tab updates to inject content script
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Inject the content script when the page is fully loaded
  if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    }, () => {
      if (chrome.runtime.lastError) {
        console.error("Error injecting script: " + chrome.runtime.lastError.message);
      } else {
        // After injecting, send a message to the content script to check for a product
        chrome.tabs.sendMessage(tabId, { action: "checkForProduct" });
      }
    });
  }
});

console.log("Think About It background script loaded");