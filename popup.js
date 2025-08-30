// Function to get or create a user ID
async function getUserId() {
  return new Promise((resolve) => {
    chrome.storage.local.get("userId", (data) => {
      if (chrome.runtime.lastError) {
        console.error("Error getting userId:", chrome.runtime.lastError);
        // In case of an error, create a temporary ID
        const tempUserId = 'temp-user-' + Date.now();
        resolve(tempUserId);
        return;
      }
      if (data.userId) {
        resolve(data.userId);
      } else {
        // Create a new unique user ID
        const newUserId = 'user-' + Date.now() + '-' + Math.random().toString(36).substring(2, 15);
        chrome.storage.local.set({ "userId": newUserId }, () => {
          if (chrome.runtime.lastError) {
            console.error("Error setting userId:", chrome.runtime.lastError);
            // Even if setting fails, resolve with the new ID for the current session
            resolve(newUserId); 
          } else {
            resolve(newUserId);
          }
        });
      }
    });
  });
}

// Function to get current monthly usage count
async function getMonthlyUsageCount() {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.sync.get(["thinksUsed", "thinksUsedMonth"], (data) => {
        if (chrome.runtime.lastError) {
          console.error("Error getting usage count:", chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }
        
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthKey = `${currentYear}-${currentMonth}`;
        
        // If we've moved to a new month, reset the counter
        if (data.thinksUsedMonth !== monthKey) {
          try {
            chrome.storage.sync.set({ 
              "thinksUsed": 0, 
              "thinksUsedMonth": monthKey 
            }, () => {
              if (chrome.runtime.lastError) {
                console.error("Error resetting month count:", chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
              } else {
                resolve(0);
              }
            });
          } catch (innerError) {
            console.error("Inner exception in getMonthlyUsageCount:", innerError);
            reject(innerError);
          }
        } else {
          resolve(data.thinksUsed || 0);
        }
      });
    } catch (error) {
      console.error("Exception in getMonthlyUsageCount:", error);
      reject(error);
    }
  });
}

// Function to increment the monthly usage count
async function incrementUsageCount() {
  const currentCount = await getMonthlyUsageCount();
  const newCount = currentCount + 1;
  
  return new Promise((resolve) => {
    chrome.storage.sync.set({ "thinksUsed": newCount }, () => {
      resolve(newCount);
    });
  });
}

// Function to reset the monthly usage count (for testing)
async function resetUsageCount() {
  return new Promise((resolve, reject) => {
    try {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthKey = `${currentYear}-${currentMonth}`;
      
      // Reset both usage count and month tracking
      chrome.storage.sync.set({ 
        "thinksUsed": 0,
        "thinksUsedMonth": monthKey
      }, () => {
        if (chrome.runtime.lastError) {
          try {
            console.error("Error in resetUsageCount:", chrome.runtime.lastError);
          } catch (e) {
            // Silently ignore console errors
          }
          reject(chrome.runtime.lastError);
        } else {
          resolve(true);
        }
      });
    } catch (error) {
      try {
        console.error("Exception in resetUsageCount:", error);
      } catch (e) {
        // Silently ignore console errors
      }
      reject(error);
    }
  });
}

// Function to save a product to storage
async function saveProduct(productData) {
  return new Promise((resolve, reject) => {
    try {
      // First retrieve existing saved products
      chrome.storage.sync.get("savedProducts", (data) => {
        if (chrome.runtime.lastError) {
          console.error("Error retrieving saved products:", chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }
        
        // Get existing products or create empty array if none
        const savedProducts = data.savedProducts || [];
        
        // Create new product entry
        const productEntry = {
          id: Date.now().toString(), // Unique ID based on timestamp
          title: productData.title,
          url: productData.url,
          price: {
            value: parseFloat(productData.price.replace(/[^0-9.]/g, '')), // Extract numeric value
            currency: productData.price.replace(/[0-9.]/g, '').trim(), // Extract currency symbol
            original: productData.price // Keep original string
          },
          timestamp: new Date().toISOString(),
          status: "thinking" // Initial status - "thinking", "bought", or "saved"
        };
        
        // Add to array
        savedProducts.push(productEntry);
        
        // Save back to storage
        chrome.storage.sync.set({ "savedProducts": savedProducts }, () => {
          if (chrome.runtime.lastError) {
            console.error("Error saving product:", chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            resolve(productEntry);
          }
        });
      });
    } catch (error) {
      console.error("Exception in saveProduct:", error);
      reject(error);
    }
  });
}

// Function to get all saved products
async function getSavedProducts() {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.sync.get("savedProducts", (data) => {
        if (chrome.runtime.lastError) {
          console.error("Error retrieving saved products:", chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }
        
        resolve(data.savedProducts || []);
      });
    } catch (error) {
      console.error("Exception in getSavedProducts:", error);
      reject(error);
    }
  });
}

// Function to update product status (bought or saved)
async function updateProductStatus(productId, newStatus) {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.sync.get("savedProducts", (data) => {
        if (chrome.runtime.lastError) {
          console.error("Error retrieving saved products:", chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }
        
        const savedProducts = data.savedProducts || [];
        const updatedProducts = savedProducts.map(product => {
          if (product.id === productId) {
            return { ...product, status: newStatus };
          }
          return product;
        });
        
        chrome.storage.sync.set({ "savedProducts": updatedProducts }, () => {
          if (chrome.runtime.lastError) {
            console.error("Error updating product status:", chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            resolve(true);
          }
        });
      });
    } catch (error) {
      console.error("Exception in updateProductStatus:", error);
      reject(error);
    }
  });
}

// Function to update product price
async function updateProductPrice(productId, newPrice) {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.sync.get("savedProducts", (data) => {
        if (chrome.runtime.lastError) {
          console.error("Error retrieving saved products:", chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }
        
        const savedProducts = data.savedProducts || [];
        const updatedProducts = savedProducts.map(product => {
          if (product.id === productId) {
            return { 
              ...product, 
              price: {
                value: parseFloat(newPrice.replace(/[^0-9.]/g, '')), // Extract numeric value
                currency: product.price.currency || "$", // Keep existing currency or default to $
                original: newPrice // Update original string
              }
            };
          }
          return product;
        });
        
        chrome.storage.sync.set({ "savedProducts": updatedProducts }, () => {
          if (chrome.runtime.lastError) {
            console.error("Error updating product price:", chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            resolve(true);
          }
        });
      });
    } catch (error) {
      console.error("Exception in updateProductPrice:", error);
      reject(error);
    }
  });
}

// Function to remove a product from the list
async function removeProduct(productId) {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.sync.get("savedProducts", (data) => {
        if (chrome.runtime.lastError) {
          console.error("Error retrieving saved products:", chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }
        
        const savedProducts = data.savedProducts || [];
        const updatedProducts = savedProducts.filter(product => product.id !== productId);
        
        chrome.storage.sync.set({ "savedProducts": updatedProducts }, () => {
          if (chrome.runtime.lastError) {
            console.error("Error removing product:", chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            resolve(true);
          }
        });
      });
    } catch (error) {
      console.error("Exception in removeProduct:", error);
      reject(error);
    }
  });
}

// Function to calculate total savings
async function calculateSavings() {
  try {
    const products = await getSavedProducts();
    let totalSavings = 0;
    
    // Sum up prices of all products with status "saved"
    products.forEach(product => {
      if (product.status === "saved" && product.price && product.price.value) {
        totalSavings += product.price.value;
      }
    });
    
    return totalSavings;
  } catch (error) {
    console.error("Error calculating savings:", error);
    return 0;
  }
}

// Function to reset all saved products (for development purposes)
async function resetAllSavedProducts() {
  return new Promise((resolve, reject) => {
    try {
      // Clear the savedProducts array in storage
      chrome.storage.sync.set({ "savedProducts": [] }, () => {
        if (chrome.runtime.lastError) {
          console.error("Error resetting saved products:", chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          console.log("All saved products have been reset");
          resolve(true);
        }
      });
    } catch (error) {
      console.error("Exception in resetAllSavedProducts:", error);
      reject(error);
    }
  });
}

// Function to check if user has reached the monthly usage limit
async function hasReachedUsageLimit() {
  const MONTHLY_LIMIT = 5; // Set your desired limit here
  const currentCount = await getMonthlyUsageCount();
  return currentCount >= MONTHLY_LIMIT;
}

// Function to show an upsell message when limit is reached
function showUpsellMessage() {
  const resultElement = document.getElementById("result");
  resultElement.innerHTML = `
    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #3498db; margin-top: 15px;">
      <h3 style="margin-top: 0; color: #2c3e50;">Monthly Limit Reached</h3>
      <p>You've used your 5 free product analyses this month.</p>
      <p>To continue using Think About It, please consider upgrading to our Premium plan.</p>
      <button id="learn-more-btn" style="background-color: #3498db; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; margin-top: 10px;">Learn More</button>
    </div>
  `;
  
  // Add event listener for the Learn More button
  document.getElementById("learn-more-btn").addEventListener("click", () => {
    // Open upgrade page in a new tab - replace with your actual upgrade URL
    chrome.tabs.create({ url: "https://www.thinkaboutit-extension.com/upgrade" });
  });
}

// Function to load the response style preference
async function getResponseStyle() {
  return new Promise((resolve) => {
    try {
      // Use an inline anonymous function as the callback
      chrome.storage.sync.get(["responseStyle"], (result) => {
        if (chrome.runtime.lastError) {
          console.error("Error in getResponseStyle:", chrome.runtime.lastError);
          resolve("witty");
        } else {
          resolve(result.responseStyle || "witty");
        }
      });
    } catch (error) {
      console.error("Exception in getResponseStyle:", error);
      // Default to "witty" if any error occurs
      resolve("witty");
    }
  });
}

// Function to save the response style preference
// Function to save the response style preference
function saveResponseStyle(style) {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.sync.set({ "responseStyle": style }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(true);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

// UI state management - Consolidated all event listeners here
document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOM content loaded - initializing UI elements");
  
  // Get all UI elements with null checks
  const settingsLink = document.getElementById("settings-link");
  const dashboardLink = document.getElementById("dashboard-link");
  const saveSettingsBtn = document.getElementById("save-settings");
  const backToMainBtn = document.getElementById("back-to-main");
  const backToMainFromDashboardBtn = document.getElementById("back-to-main-from-dashboard");
  const mainInterface = document.getElementById("main-interface");
  const settingsInterface = document.getElementById("settings-interface");
  const dashboardInterface = document.getElementById("dashboard-interface");
  const wittyStyleRadio = document.getElementById("witty-style");
  const practicalStyleRadio = document.getElementById("practical-style");
  const analyzeButton = document.getElementById("analyze");
  const debugLink = document.getElementById("debug-link");
  const resetUsageBtn = document.getElementById("reset-usage");
  const resetSavingsBtn = document.getElementById("reset-savings");
  const productsList = document.getElementById("products-list");
  const totalSavings = document.getElementById("total-savings");
  const noProducts = document.getElementById("no-products");
  
  // Create a debug log div to avoid console issues
  function safeLog(message) {
    try {
      console.log(message);
    } catch (e) {
      // Silent fail if console logging causes issues
    }
  }
  
  // Log which elements were found/not found
  safeLog("UI elements initialization status:");
  safeLog(`- Reset usage button: ${resetUsageBtn ? "Found" : "Not found"}`);
  
  // Load saved response style preference
  const savedResponseStyle = await getResponseStyle();
  if (savedResponseStyle === "witty") {
    wittyStyleRadio.checked = true;
  } else {
    practicalStyleRadio.checked = true;
  }
  
  // Display current usage stats
  const usageStatsElement = document.getElementById("usage-stats");
  if (usageStatsElement) {
    try {
      const currentUsage = await getMonthlyUsageCount();
      usageStatsElement.textContent = `Usage this month: ${currentUsage}/5 analyses`;
    } catch (error) {
      console.error("Error getting usage stats:", error);
      usageStatsElement.textContent = "Usage stats unavailable";
    }
  }
  
  // Make the entire radio option clickable
  try {
    document.querySelectorAll('.radio-option').forEach(option => {
      if (option) {
        option.addEventListener('click', function(e) {
          try {
            const radio = this.querySelector('input[type="radio"]');
            if (radio) {
              radio.checked = true;
            }
          } catch (error) {
            safeLog("Error handling radio option click: " + (error.message || "Unknown error"));
          }
        });
      }
    });
  } catch (error) {
    safeLog("Error setting up radio option listeners: " + (error.message || "Unknown error"));
  }
  
  // Settings toggle
  if (settingsLink && mainInterface && settingsInterface) {
    settingsLink.addEventListener("click", (e) => {
      try {
        e.preventDefault();
        mainInterface.style.display = "none";
        dashboardInterface.style.display = "none";
        settingsInterface.style.display = "block";
      } catch (error) {
        safeLog("Error toggling to settings: " + (error.message || "Unknown error"));
      }
    });
  } else {
    safeLog("Settings link or interface elements not found");
  }
  
  // Dashboard toggle
  if (dashboardLink && mainInterface && dashboardInterface) {
    dashboardLink.addEventListener("click", async (e) => {
      try {
        e.preventDefault();
        mainInterface.style.display = "none";
        settingsInterface.style.display = "none";
        dashboardInterface.style.display = "block";
        
        // Load saved products and display them
        await loadSavedProducts();
      } catch (error) {
        safeLog("Error toggling to dashboard: " + (error.message || "Unknown error"));
      }
    });
  } else {
    safeLog("Dashboard link or interface elements not found");
  }
  
  if (backToMainBtn && mainInterface && settingsInterface) {
    backToMainBtn.addEventListener("click", (e) => {
      try {
        e.preventDefault();
        settingsInterface.style.display = "none";
        dashboardInterface.style.display = "none";
        mainInterface.style.display = "block";
      } catch (error) {
        safeLog("Error returning to main: " + (error.message || "Unknown error"));
      }
    });
  } else {
    safeLog("Back button from settings not found");
  }
  
  if (backToMainFromDashboardBtn && mainInterface && dashboardInterface) {
    backToMainFromDashboardBtn.addEventListener("click", (e) => {
      try {
        e.preventDefault();
        dashboardInterface.style.display = "none";
        settingsInterface.style.display = "none";
        mainInterface.style.display = "block";
      } catch (error) {
        safeLog("Error returning to main from dashboard: " + (error.message || "Unknown error"));
      }
    });
  } else {
    safeLog("Back button from dashboard not found");
  }
  
  // Reset savings button for development
  if (resetSavingsBtn) {
    resetSavingsBtn.addEventListener("click", async (e) => {
      try {
        e.preventDefault();
        
        // Create a confirmation dialog using the DOM
        const confirmed = confirm("Are you sure you want to reset all saved products? This cannot be undone.");
        
        if (confirmed) {
          // Reset all saved products
          await resetAllSavedProducts();
          
          // Reload the dashboard
          await loadSavedProducts();
          
          // Show success message
          const statusMessage = document.createElement("div");
          statusMessage.textContent = "All saved products have been reset";
          statusMessage.style.marginTop = "10px";
          statusMessage.style.fontSize = "12px";
          statusMessage.style.color = "#27ae60";
          
          // Find the button group and insert after it
          const buttonGroup = resetSavingsBtn.closest(".button-group");
          buttonGroup.parentNode.insertBefore(statusMessage, buttonGroup.nextSibling);
          
          // Remove the message after a delay
          setTimeout(() => {
            if (statusMessage.parentNode) {
              statusMessage.parentNode.removeChild(statusMessage);
            }
          }, 2000);
        }
      } catch (error) {
        safeLog("Error resetting savings: " + (error.message || "Unknown error"));
        
        // Show error message
        const statusMessage = document.createElement("div");
        statusMessage.textContent = "Error resetting savings. Please try again.";
        statusMessage.style.marginTop = "10px";
        statusMessage.style.fontSize = "12px";
        statusMessage.style.color = "#e74c3c";
        
        // Find the button group and insert after it
        const buttonGroup = resetSavingsBtn.closest(".button-group");
        buttonGroup.parentNode.insertBefore(statusMessage, buttonGroup.nextSibling);
        
        // Remove the message after a delay
        setTimeout(() => {
          if (statusMessage.parentNode) {
            statusMessage.parentNode.removeChild(statusMessage);
          }
        }, 3000);
      }
    });
  } else {
    safeLog("Reset savings button not found");
  }
  
  // Reset usage counter (for testing purposes)
  // resetUsageBtn is already defined in the DOMContentLoaded event
  if (resetUsageBtn) {
    safeLog("Reset usage button found - attaching event listener");
    
    resetUsageBtn.addEventListener("click", async (e) => {
      e.preventDefault(); // Prevent any default action
      safeLog("Reset usage button clicked");
      
      // First display processing state
      const messageElement = document.getElementById("settings-message");
      if (messageElement) {
        messageElement.innerText = "Resetting usage count...";
      }
      
      try {
        // Reset the usage count
        await resetUsageCount();
        safeLog("Usage count reset successful");
        
        // Update UI elements
        if (messageElement) {
          messageElement.innerText = "Monthly usage count reset to 0";
          
          // Update the displayed usage stats
          const usageStatsElement = document.getElementById("usage-stats");
          if (usageStatsElement) {
            usageStatsElement.textContent = "Usage this month: 0/5 analyses";
          }
          
          // Clear the message after a delay
          setTimeout(() => {
            if (messageElement) {
              messageElement.innerText = "";
            }
          }, 2000);
        }
      } catch (error) {
        try {
          console.error("Error resetting usage count:", error);
        } catch (e) {
          // Silently fail if console logging causes issues
        }
        
        // Show error message
        if (messageElement) {
          // Check for specific error types
          if (error && error.message && error.message.includes("could not establish connection")) {
            messageElement.innerHTML = "Error: Could not establish connection.<br>This is likely a temporary issue.";
          } else {
            messageElement.innerText = "Error resetting usage count. Please try again.";
          }
          
          // Clear the message after a delay
          setTimeout(() => {
            if (messageElement) {
              messageElement.innerText = "";
            }
          }, 3000);
        }
      }
    });
  } else {
    safeLog("Reset usage button not found - could not attach event listener");
    
    // Create a hidden element to store this info for debugging
    const debugInfo = document.createElement('div');
    debugInfo.style.display = 'none';
    debugInfo.id = 'debug-info-reset-btn';
    debugInfo.textContent = 'Reset usage button not found';
    document.body.appendChild(debugInfo);
  }
  
  // Save settings - check if button exists before adding listener
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener("click", async (e) => {
      try {
        e.preventDefault(); // Prevent any default action
        
        // Show saving message
        const messageElement = document.getElementById("settings-message");
        if (messageElement) {
          messageElement.innerText = "Saving settings...";
        }
        
        // Save selected response style
        const selectedRadio = document.querySelector('input[name="response-style"]:checked');
        if (selectedRadio) {
          const responseStyle = selectedRadio.value;
          await saveResponseStyle(responseStyle);
        }
        
        // Show success message
        if (messageElement) {
          messageElement.innerText = "Settings saved successfully!";
          
          // Clear message after 2 seconds
          setTimeout(() => {
            if (messageElement) {
              messageElement.innerText = "";
            }
            if (settingsInterface && mainInterface) {
              settingsInterface.style.display = "none";
              mainInterface.style.display = "block";
            }
          }, 2000);
        }
      } catch (error) {
        // Show error message
        const messageElement = document.getElementById("settings-message");
        if (messageElement) {
          messageElement.innerText = "Error saving settings. Please try again.";
        }
        safeLog("Error saving settings: " + (error.message || "Unknown error"));
      }
    });
  } else {
    safeLog("Save settings button not found - could not attach event listener");
  }
  
  // Add the analyze button event listener
  if (analyzeButton) {
    analyzeButton.addEventListener("click", async (e) => {
      try {
        e.preventDefault(); // Prevent any default action
        await handleAnalyze();
      } catch (error) {
        // Handle error in UI
        const resultElement = document.getElementById("result");
        if (resultElement) {
          resultElement.innerText = "Error analyzing product. Please try again.";
        }
        safeLog("Error in analyze button handler: " + (error.message || "Unknown error"));
      }
    });
  } else {
    safeLog("Analyze button not found - could not attach event listener");
  }

  // If background requested the popup to auto-run analysis, do it now and clear flag
  try {
    chrome.storage.local.get(["autoRunAnalyze"], async (data) => {
      if (chrome.runtime.lastError) {
        console.error('Error reading autoRunAnalyze flag:', chrome.runtime.lastError);
        return;
      }

      if (data && data.autoRunAnalyze) {
        // Clear the flag so we don't auto-run again
        chrome.storage.local.remove(["autoRunAnalyze"], () => {
          if (chrome.runtime.lastError) {
            console.error('Error clearing autoRunAnalyze flag:', chrome.runtime.lastError);
          }
        });

        // Delay slightly to ensure UI is ready
        setTimeout(() => {
          try {
            handleAnalyze();
          } catch (e) {
            console.error('Error auto-running analysis:', e);
          }
        }, 150);
      }
    });
  } catch (e) {
    console.error('Exception checking autoRunAnalyze flag:', e);
  }
  
  // Add debug button functionality
  if (debugLink) {
    debugLink.addEventListener("click", async (e) => {
      e.preventDefault();
      
      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab || !tab.id) {
        console.error("No active tab found");
        return;
      }
      
      // Check if we're on a page where content scripts can run
      if (tab.url.startsWith("chrome://") || 
          tab.url.startsWith("edge://") || 
          tab.url.startsWith("about:") ||
          tab.url.startsWith("chrome-extension://")) {
        alert("This debug feature cannot be used on browser pages. Please navigate to a regular website.");
        return;
      }
      
      // Inject content script and send debug message
      try {
        // Inject the content script
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
        
        // Wait for the content script to initialize
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Send debug message
        chrome.tabs.sendMessage(tab.id, { action: "debugParser" }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("Error sending debug message:", chrome.runtime.lastError.message);
          } else {
            console.log("Debug response:", response);
            alert("Debug information sent to console. Check the console for details.");
          }
        });
      } catch (error) {
        console.error("Error in debug functionality:", error);
        alert("Error initializing debug feature. Please try again.");
      }
    });
  }
});

// Separate the analyze functionality into its own function for better organization
async function handleAnalyze() {
  // Display loading state
  const resultElement = document.getElementById("result");
  resultElement.innerText = "Analyzing product...";
  
  try {
    // Check if the user has reached their monthly usage limit
    const hasReachedLimit = await hasReachedUsageLimit();
    if (hasReachedLimit) {
      showUpsellMessage();
      return;
    }
    
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.id) {
      resultElement.innerText = "Error: No active tab found";
      return;
    }
    
    // Check if we're on a page where content scripts can run
    if (tab.url.startsWith("chrome://") || 
        tab.url.startsWith("edge://") || 
        tab.url.startsWith("about:") ||
        tab.url.startsWith("chrome-extension://")) {
      resultElement.innerText = "This extension cannot run on browser pages. Please navigate to a product website.";
      return;
    }
    
    // Helper function to inject content script
    async function injectContentScript() {
      return new Promise((resolve, reject) => {
        resultElement.innerText = "Loading product analyzer...";
        
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        }, (results) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError.message);
          } else {
            resolve(results);
          }
        });
      });
    }
    
    // Function to get product data from content script
    async function getProductData() {
      return new Promise((resolve) => {
        chrome.tabs.sendMessage(tab.id, { action: "getProductInfo" }, (response) => {
          if (chrome.runtime.lastError) {
            resolve({ error: chrome.runtime.lastError.message });
          } else if (!response) {
            resolve({ error: "No product data received. The site might not be compatible." });
          } else {
            resolve(response);
          }
        });
      });
    }
    
    // Try to get product data, inject content script if needed
    let productData;
    
    try {
      // First attempt to get data (content script might already be loaded)
      productData = await getProductData();
      
      // If there's an error, try injecting the content script
      if (productData.error) {
        try {
          // Inject the content script
          await injectContentScript();
          
          // Wait for the content script to initialize
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Try again to get product data
          productData = await getProductData();
        } catch (injectionError) {
          console.error("Content script injection error:", injectionError);
          productData = { error: `Could not analyze the product page: ${injectionError}` };
        }
      }
    } catch (error) {
      console.error("Error in product analysis:", error);
      productData = { error: error.message || "Unknown error occurred" };
    }
    
    // Handle errors in product data
    if (productData.error) {
      // Format the error message with helpful information
      let errorMsg = productData.error;
      
      // Provide more context for connection-related errors
      if (errorMsg.includes("establish connection") || errorMsg.includes("connection with the page")) {
        resultElement.innerHTML = `<strong>Error:</strong> ${errorMsg}<br><br>
        <small>This usually happens because the product analyzer couldn't load properly. Try refreshing the page and making sure you're on a product page.</small>`;
      } else {
        resultElement.innerHTML = `<strong>Error:</strong> ${errorMsg}`;
      }
      return;
    }
    
    // Save the product data for tracking
    try {
      await saveProduct(productData);
      console.log("Product saved for tracking:", productData.title);
    } catch (error) {
      console.error("Error saving product data:", error);
      // Continue with analysis even if saving fails
    }
    
    // Get the user's ID
    const userId = await getUserId();
    
    // Get the user's preferred response style
    const responseStyle = await getResponseStyle();

    // Parse price into value and currency
    const priceString = productData.price || "";
    const priceMatch = priceString.match(/([$€£¥₹₽₩¢])?\s*([\d,.]+)/);
    let priceValue = 0;
    let priceCurrency = '$';

    if (priceMatch) {
        priceCurrency = priceMatch[1] || '$';
        priceValue = parseFloat(priceMatch[2].replace(/,/g, ''));
    }
    
    // Make think-proxy api call
    const response = await fetch("https://think-proxy.vercel.app/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        product: {
          title: productData.title,
          priceValue: priceValue,
          priceCurrency: priceCurrency,
          categoryPath: productData.categoryPath || [],
          url: productData.url
        },
        responseStyle: responseStyle,
        userId: userId
      })
    });

    // Handle API response
    const data = await response.json();
    
    if (data.error) {
      resultElement.innerText = "API Error: " + data.error.message;
    } else {
      // Increment usage count on successful analysis
      await incrementUsageCount();
      
      // Show remaining analyses count
      const currentCount = await getMonthlyUsageCount();
      const remainingCount = 5 - currentCount; // 5 is the monthly limit
      
      // Format the response with remaining count info
      resultElement.innerHTML = `
        <div>${data.result}</div>
        <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
          You have ${remainingCount} free analyses remaining this month.
        </div>
      `;
    }
  } catch (error) {
    resultElement.innerText = "Error: " + error.message;
    console.error("Think About It extension error:", error);
  }
}

// Function to load and display saved products
async function loadSavedProducts() {
  try {
    // Get the products list element
    const productsList = document.getElementById("products-list");
    const noProducts = document.getElementById("no-products");
    const totalSavingsEl = document.getElementById("total-savings");
    
    if (!productsList || !noProducts || !totalSavingsEl) {
      console.error("Required DOM elements not found");
      return;
    }
    
    // Clear existing content
    productsList.innerHTML = "";
    
    // Get saved products
    const products = await getSavedProducts();
    
    // Check if there are any products
    if (products.length === 0) {
      noProducts.style.display = "block";
      totalSavingsEl.style.display = "none";
      return;
    }
    
    // Hide no products message and show total savings
    noProducts.style.display = "none";
    
    // Calculate and display total savings
    const totalSavings = await calculateSavings();
    totalSavingsEl.style.display = "block";
    totalSavingsEl.textContent = `Total Savings: $${totalSavings.toFixed(2)}`;
    
    // Sort products by timestamp, newest first
    const sortedProducts = [...products].sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    // Create and append elements for each product
    sortedProducts.forEach(product => {
      if (product.status === "thinking") {
        const productEl = document.createElement("div");
        productEl.className = "product-item";
        
        // Format timestamp
        const date = new Date(product.timestamp);
        const formattedDate = `${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
        
        // Create product HTML with price editing functionality
        productEl.innerHTML = `
          <div class="product-title" title="${product.title}">${product.title}</div>
          <div class="product-price-container">
            <span class="product-price-display">${product.price.original}</span>
            <button class="edit-price-button" title="Edit Price">Edit</button>
            <div class="price-edit-form" style="display: none;">
              <input type="text" class="price-edit-input" value="${product.price.original}">
              <button class="save-price-button">Save</button>
              <button class="cancel-price-button">Cancel</button>
            </div>
          </div>
          <div class="product-timestamp">Added on ${formattedDate}</div>
          <div class="product-actions">
            <button class="action-button bought-button" data-id="${product.id}">I bought it</button>
            <button class="action-button saved-button" data-id="${product.id}">I saved the money</button>
            <button class="action-button trash-button" data-id="${product.id}" title="Remove from list">Remove</button>
          </div>
        `;
        
        // Add the product element to the list
        productsList.appendChild(productEl);
        
        // Add event listeners for price editing
        const priceDisplay = productEl.querySelector(".product-price-display");
        const editButton = productEl.querySelector(".edit-price-button");
        const editForm = productEl.querySelector(".price-edit-form");
        const editInput = productEl.querySelector(".price-edit-input");
        const saveButton = productEl.querySelector(".save-price-button");
        const cancelButton = productEl.querySelector(".cancel-price-button");
        
        // Show edit form when edit button is clicked
        editButton.addEventListener("click", () => {
          priceDisplay.style.display = "none";
          editButton.style.display = "none";
          editForm.style.display = "flex";
          editInput.focus();
          // Select all text in the input
          editInput.select();
        });
        
        // Save edited price
        saveButton.addEventListener("click", async () => {
          const newPrice = editInput.value.trim();
          if (newPrice) {
            try {
              await updateProductPrice(product.id, newPrice);
              priceDisplay.textContent = newPrice;
              priceDisplay.style.display = "inline";
              editButton.style.display = "inline";
              editForm.style.display = "none";
            } catch (error) {
              console.error("Error saving price:", error);
              // Show error message
              alert("Error saving price. Please try again.");
            }
          }
        });
        
        // Cancel price editing
        cancelButton.addEventListener("click", () => {
          priceDisplay.style.display = "inline";
          editButton.style.display = "inline";
          editForm.style.display = "none";
        });
        
        // Also allow Enter key to save and Escape to cancel
        editInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            saveButton.click();
          } else if (e.key === "Escape") {
            cancelButton.click();
          }
        });
      }
    });
    
    // Add event listeners for action buttons
    document.querySelectorAll(".action-button").forEach(button => {
      button.addEventListener("click", async (e) => {
        try {
          const productId = button.getAttribute("data-id");
          
          // Handle trash button differently
          if (button.classList.contains("trash-button")) {
            // Remove the product
            await removeProduct(productId);
            console.log(`Product ${productId} removed from list`);
          } else {
            // Handle bought/saved actions
            const action = button.classList.contains("bought-button") ? "bought" : "saved";
            // Update product status
            await updateProductStatus(productId, action);
            console.log(`Product ${productId} marked as ${action}`);
          }
          
          // Reload the products list
          await loadSavedProducts();
        } catch (error) {
          console.error("Error handling product action:", error);
        }
      });
    });
  } catch (error) {
    console.error("Error loading saved products:", error);
  }
}

// Enhanced debugging for chrome.storage.sync.get
function handleResponseStyle(result) {
  try {
    if (chrome.runtime.lastError) {
      console.error("Error retrieving responseStyle:", chrome.runtime.lastError.message);
      resolve("witty"); // Default to "witty" in case of error
    } else {
      console.log("responseStyle retrieved successfully:", result.responseStyle);
      resolve(result.responseStyle || "witty");
    }
  } catch (error) {
    console.error("Unexpected error in handleResponseStyle:", error);
    resolve("witty");
  }
}

// Log the context before making the call
console.log("Executing chrome.storage.sync.get for responseStyle");
chrome.storage.sync.get(["responseStyle"], handleResponseStyle);