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
  // Handle request to open the popup without auto-running analysis
  if (message.action === 'openPopup') {
    try {
      if (chrome.action && chrome.action.openPopup) {
        try {
          chrome.action.openPopup();
        } catch (e) {
          console.error('Could not open popup programmatically:', e);
        }
      }
    } catch (e) {
      // ignore
    }
    sendResponse({ status: 'requested' });
  }
  
  // Handle request to run site parser inside page context to avoid CSP issues
  if (message.action === 'runSiteParser') {
    const siteName = message.siteName;
    // Sender should be the content script; get its tab id
    const tabId = sender?.tab?.id;

    if (!tabId) {
      sendResponse({ error: 'No tab id available' });
      return;
    }

    // First inject the parser JS into the tab
    const parserPath = `parsers/${siteName}.js`;
    // In Manifest V3 service workers the recommended pattern is to return a Promise
    // from the onMessage listener so the worker stays alive until the async work
    // completes. Wrap the callback-based scripting APIs in Promises and resolve
    // with the final response object.
    return new Promise((resolve) => {
      chrome.scripting.executeScript({
        target: { tabId },
        files: [parserPath]
      }, (injectionResults) => {
        if (chrome.runtime.lastError) {
          console.error('Error injecting parser:', chrome.runtime.lastError);
          resolve({ error: chrome.runtime.lastError.message });
          return;
        }

        // After injection, run a small script in the page to call getProduct()
        chrome.scripting.executeScript({
          target: { tabId },
          func: () => {
            try {
              // Prefer named parser object if present
              if (window.walmartParser && typeof window.walmartParser.getProduct === 'function') {
                return { parsedBy: 'walmart', data: window.walmartParser.getProduct() };
              }

              // Some parser files export a getProduct function globally
              if (typeof window.getProduct === 'function') {
                // Try to infer parsedBy from hostname
                const hostname = window.location.hostname.toLowerCase();
                const site = hostname.includes('walmart') ? 'walmart' : (hostname.includes('amazon') ? 'amazon' : 'site');
                return { parsedBy: site, data: window.getProduct() };
              }

              return { parsedBy: 'unknown', data: null };
            } catch (e) {
              return { error: e?.message || String(e) };
            }
          }
        }, (results) => {
          if (chrome.runtime.lastError) {
            console.error('Error running parser function:', chrome.runtime.lastError);
            resolve({ error: chrome.runtime.lastError.message });
            return;
          }

          if (!results || !results[0] || !results[0].result) {
            resolve({ error: 'No result from parser execution' });
            return;
          }

          const res = results[0].result;
          if (res.error) {
            resolve({ error: res.error });
          } else {
            resolve({ parsedBy: res.parsedBy || siteName, data: res.data });
          }
        });
      });
    });
  }
  // Only return true from inside branches that call sendResponse asynchronously.
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