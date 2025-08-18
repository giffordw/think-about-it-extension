
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
  return true;
});

// Reload content scripts when navigating to a new page
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // You could add logic here in the future to determine if 
    // this is a product page worth analyzing
  }
});

console.log("Think About It background script loaded");