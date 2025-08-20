// Function to load the API key from storage
async function getApiKey() {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.sync.get("openaiApiKey", (data) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(data.openaiApiKey || "");
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

// Function to save the API key to storage
function saveApiKey(apiKey) {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.sync.set({ "openaiApiKey": apiKey }, () => {
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
  const apiKeyInput = document.getElementById("api-key");
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
  safeLog(`- API Key input: ${apiKeyInput ? "Found" : "Not found"}`);
  safeLog(`- Reset usage button: ${resetUsageBtn ? "Found" : "Not found"}`);
  
  // Load saved API key
  const savedApiKey = await getApiKey();
  apiKeyInput.value = savedApiKey;
  
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
        
        // Get and save API key
        if (apiKeyInput) {
          const apiKey = apiKeyInput.value.trim();
          await saveApiKey(apiKey);
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
  
  // Add debug button functionality
  if (debugLink) {
    debugLink.addEventListener("click", async (e) => {
      e.preventDefault();
      
      // Get debug status element or create one
      let statusElement = document.getElementById("debug-status");
      if (!statusElement) {
        statusElement = document.createElement("div");
        statusElement.id = "debug-status";
        statusElement.style.marginTop = "10px";
        statusElement.style.fontSize = "12px";
        statusElement.style.color = "#666";
        document.querySelector(".footer").appendChild(statusElement);
      }
      
      statusElement.innerHTML = "Initializing debug...";
      
      try {
        // Get the active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab || !tab.id) {
          console.error("No active tab found");
          statusElement.innerHTML = "Error: No active tab found";
          return;
        }
        
        statusElement.innerHTML = "Checking if content script is loaded...";
        
        // First try to check if content script is already loaded using chrome.runtime.lastError properly
        chrome.tabs.sendMessage(tab.id, { action: "debugParser" }, (response) => {
          // Check for runtime errors
          if (chrome.runtime.lastError) {
            console.error("Error sending message:", chrome.runtime.lastError.message);
            statusElement.innerHTML = "Content script not found, attempting to inject...";
            
            // If content script isn't available, inject it
            chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['content.js']
            }, () => {
              if (chrome.runtime.lastError) {
                console.error("Error injecting content script:", chrome.runtime.lastError.message);
                statusElement.innerHTML = "Error: Could not inject content script. Site may be restricted.";
                return;
              }
              
              statusElement.innerHTML = "Content script injected, initializing...";
              
              // Try again after injecting with increased timeout
              setTimeout(() => {
                chrome.tabs.sendMessage(tab.id, { action: "debugParser" }, (response) => {
                  if (chrome.runtime.lastError) {
                    console.error("Error on retry:", chrome.runtime.lastError.message);
                    statusElement.innerHTML = "Error: Could not connect to content script after injection.";
                    return;
                  }
                  console.log("Debug parser response after injection:", response);
                  statusElement.innerHTML = "Debug successful! Check the webpage for debug overlay.";
                });
              }, 500);
            });
          } else {
            // If we get here without an error, the content script responded
            console.log("Debug parser response:", response);
            statusElement.innerHTML = "Debug successful! Check the webpage for debug overlay.";
          }
        });
      } catch (outerError) {
        console.error("Outer error in debug functionality:", outerError);
        statusElement.innerHTML = "Error: " + outerError.message;
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
    
    // Get the API key
    const apiKey = await getApiKey();
    
    // Check if API key is available
    if (!apiKey) {
      resultElement.innerText = "Please set your OpenAI API key in the settings first.";
      return;
    }
    
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Request product info from the content script
    const productData = await new Promise((resolve) => {
      if (!tab || !tab.id) {
        resolve({ error: "No active tab found. Please make sure you're on a product page." });
        return;
      }

      // Function to send the message with proper error handling
      const sendMessage = (afterInjection = false) => {
        try {
          chrome.tabs.sendMessage(tab.id, { action: "getProductInfo" }, (response) => {
            // Check for runtime errors
            if (chrome.runtime.lastError) {
              console.error("Error sending message:", chrome.runtime.lastError.message);
              
              // Add more detailed logging for connection issues
              const errorMsg = chrome.runtime.lastError.message;
              if (errorMsg.includes("could not establish connection") || errorMsg.includes("receiving end does not exist")) {
                console.log("Connection issue detected - content script may not be loaded");
              }
              
              if (!afterInjection) {
                // First attempt failed, try injecting the content script
                console.log("Attempting to inject content script...");
                chrome.scripting.executeScript({
                  target: { tabId: tab.id },
                  files: ['content.js']
                }, (injectionResults) => {
                  if (chrome.runtime.lastError) {
                    console.error("Script injection error:", chrome.runtime.lastError.message);
                    resolve({ error: "Could not inject content script. Please reload the page and try again." });
                    return;
                  }
                  
                  console.log("Content script injected successfully, waiting for initialization...");
                  // Wait a bit longer for the script to initialize - increased timeout
                  setTimeout(() => sendMessage(true), 500);
                });
              } else {
                // Still failed after injection
                resolve({ error: "Could not establish connection with the page. Please reload the page and try again." });
              }
              return;
            }
            
            // Check for empty response
            if (!response) {
              resolve({ error: "No product data received. The site might not be compatible." });
              return;
            }
            
            // Success!
            resolve(response);
          });
        } catch (error) {
          console.error("Exception in message sending:", error);
          resolve({ error: "Error communicating with the page: " + error.message });
        }
      };
      
      // Start the process
      sendMessage();
    });
    
    // Check if we got product data
    if (productData.error) {
      // Format the error message with some helpful information
      let errorMsg = productData.error;
      
      // Provide more context for connection-related errors
      if (errorMsg.includes("establish connection") || errorMsg.includes("connection with the page")) {
        resultElement.innerHTML = `<strong>Error:</strong> ${errorMsg}<br><br>
        <small>This usually happens because the content script couldn't load properly. Try refreshing the page and making sure you're on a product page.</small>`;
      } else {
        resultElement.innerText = "Error: " + errorMsg;
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
    
    // Get the user's preferred response style
    const responseStyle = await getResponseStyle();
    
    // Choose the appropriate system prompt based on the user's preference
    let systemContent = "";
    if (responseStyle === "witty") {
      systemContent = "You are the voice of \"Think about it,\" a smart, witty, and practical AI designed to help users avoid unnecessary purchases. When a user is shopping and unsure whether to buy something, you respond with a clever but grounded reason to consider saving their money instead. Your tone is humorous, conversational, and insightful—like a trusted friend who's financially savvy and just a little cheeky. Your job is not to shame or lecture. Instead, you acknowledge the appeal of the purchase, gently question its necessity, and offer smarter alternatives. You're empathetic, persuasive, and funny. You can name imaginary dogs, reference real-life priorities, or use subtle social commentary—but always circle back to the core point: is this purchase really worth it? Respond in 3–5 sentences. Use one compelling insight or comparison to make the user think twice. Responses should be personalized, but not overly sentimental or judgmental. Examples: User: \"Thinking about buying a new laptop on sale to replace my 2-year-old one.\" You: \"That's a great price for a new laptop, but it's probably not as much of an upgrade as you think. If you're out of space, try an external drive for $100 and save yourself over $1,000! Or spend that $1,200 on a golden retriever puppy and never use a computer again. Bonus: you'll meet endless strangers who want to pet your dog, Lemon. See? Now you're saving money and naming your future best friend.\" User: [uploads photo of Beats headphones] You: \"Cool headphones! Great for tuning out the world and listening to the sound of money leaving your wallet. You can get great sound without the brand markup—unless you're really just trying to prove you're an audiophile (or want people to think you are). Save $150 and cover your Spotify subscription for the year. Still sounds like a win.\" User: \"I'm looking at this slowpitch softball bat: Worth Krecher XXL for $295.\" You: \"Whoa, aiming to set the league home run record? If not, maybe save $100 and get something balanced for power and control. Or split the cost with a teammate—you hit it first, they warm it up. Unless this bat has a built-in GPS, you're mostly paying for the fantasy of launching one into orbit.\"";
    } else {
      systemContent = "You are the smart, thoughtful, and encouraging voice of the app Think About It. When a user is considering a purchase, your role is to help them pause and reflect by offering practical, money-saving reasoning in a warm, grounded tone. Your responses should: focus on helping the user meet the same need or desire for less money; offer realistic alternatives—cheaper versions, used options, sharing/borrowing, or doing nothing if the item isn't truly necessary; include concrete comparisons, like what else the money could buy (e.g., “That’s 10 months of Spotify” or “Enough for a weekend trip”); be supportive and encouraging, not sarcastic, judgmental, or overly witty. You should still acknowledge the appeal of the item. The tone is friendly, conversational, and helpful—like a smart, practical friend who wants you to feel empowered about saving. Keep your responses to 3–5 sentences. Always return to the idea: “Can you satisfy the same want for less—or wait for a better time?";
    }
    
    // Make OpenAI API call
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { 
            role: "system", 
            content: systemContent
          },
          { 
            role: "user", 
            content: `I'm considering buying this product:\n
            Title: ${productData.title}\n
            Price: ${productData.price}\n
            Description: ${productData.description}\n
            Features: ${productData.features}\n
            Website: ${productData.siteName}\n
            URL: ${productData.url}\n
            
            Should I buy it? Give me your thoughtful analysis.`
          }
        ]
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
        <div>${data.choices[0].message.content}</div>
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
        
        // Create product HTML
        productEl.innerHTML = `
          <div class="product-title" title="${product.title}">${product.title}</div>
          <div class="product-price">${product.price.original}</div>
          <div class="product-timestamp">Added on ${formattedDate}</div>
          <div class="product-actions">
            <button class="action-button bought-button" data-id="${product.id}">I bought it</button>
            <button class="action-button saved-button" data-id="${product.id}">I saved the money</button>
            <button class="action-button trash-button" data-id="${product.id}" title="Remove from list">Remove</button>
          </div>
        `;
        
        // Add the product element to the list
        productsList.appendChild(productEl);
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