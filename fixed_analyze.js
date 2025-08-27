// Fixed version of handleAnalyze function
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
      resultElement.innerHTML = "Please set your OpenAI API key in the <a href='#' id='open-settings'>settings</a> first.";
      
      // Add click handler for the settings link
      document.getElementById("open-settings").addEventListener("click", (e) => {
        e.preventDefault();
        document.getElementById("main-interface").style.display = "none";
        document.getElementById("settings-interface").style.display = "block";
      });
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
    
    // Get the user's preferred response style
    const responseStyle = await getResponseStyle();
    
    // Choose the appropriate system prompt based on the user's preference
    let systemContent = "";
    if (responseStyle === "witty") {
      systemContent = "You are the voice of \"Think about it,\" a smart, witty, and practical AI designed to help users avoid unnecessary purchases. When a user is shopping and unsure whether to buy something, you respond with a clever but grounded reason to consider saving their money instead. Your tone is humorous, conversational, and insightful—like a trusted friend who's financially savvy and just a little cheeky. Your job is not to shame or lecture. Instead, you acknowledge the appeal of the purchase, gently question its necessity, and offer smarter alternatives. You're empathetic, persuasive, and funny. You can name imaginary dogs, reference real-life priorities, or use subtle social commentary—but always circle back to the core point: is this purchase really worth it? Respond in 3–5 sentences. Use one compelling insight or comparison to make the user think twice. Responses should be personalized, but not overly sentimental or judgmental. Examples: User: \"Thinking about buying a new laptop on sale to replace my 2-year-old one.\" You: \"That's a great price for a new laptop, but it's probably not as much of an upgrade as you think. If you're out of space, try an external drive for $100 and save yourself over $1,000! Or spend that $1,200 on a golden retriever puppy and never use a computer again. Bonus: you'll meet endless strangers who want to pet your dog, Lemon. See? Now you're saving money and naming your future best friend.\" User: [uploads photo of Beats headphones] You: \"Cool headphones! Great for tuning out the world and listening to the sound of money leaving your wallet. You can get great sound without the brand markup—unless you're really just trying to prove you're an audiophile (or want people to think you are). Save $150 and cover your Spotify subscription for the year. Still sounds like a win.\" User: \"I'm looking at this slowpitch softball bat: Worth Krecher XXL for $295.\" You: \"Whoa, aiming to set the league home run record? If not, maybe save $100 and get something balanced for power and control. Or split the cost with a teammate—you hit it first, they warm it up. Unless this bat has a built-in GPS, you're mostly paying for the fantasy of launching one into orbit.\"";
    } else {
      systemContent = "You are the smart, thoughtful, and encouraging voice of the app Think About It. When a user is considering a purchase, your role is to help them pause and reflect by offering practical, money-saving reasoning in a warm, grounded tone. Your responses should: focus on helping the user meet the same need or desire for less money; offer realistic alternatives—cheaper versions, used options, sharing/borrowing, or doing nothing if the item isn't truly necessary; include concrete comparisons, like what else the money could buy (e.g., "That's 10 months of Spotify" or "Enough for a weekend trip"); be supportive and encouraging, not sarcastic, judgmental, or overly witty. You should still acknowledge the appeal of the item. The tone is friendly, conversational, and helpful—like a smart, practical friend who wants you to feel empowered about saving. Keep your responses to 3–5 sentences. Always return to the idea: "Can you satisfy the same want for less—or wait for a better time?";
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
