/**
 * Debug function to verify content script loading
 */
function debugContentScript() {
  safeContentLog("Think About It: Content script debug check");
  
  // Add a visible element to the page for debugging
  const debugElement = document.createElement('div');
  debugElement.style.position = 'fixed';
  debugElement.style.bottom = '10px';
  debugElement.style.right = '10px';
  debugElement.style.padding = '5px';
  debugElement.style.background = 'rgba(255, 255, 0, 0.5)';
  debugElement.style.zIndex = '9999';
  debugElement.style.fontSize = '10px';
  debugElement.textContent = 'Think About It: Content script loaded';
  debugElement.id = 'think-about-it-debug';
  document.body.appendChild(debugElement);
  
  // Remove after 5 seconds
  setTimeout(() => {
    const el = document.getElementById('think-about-it-debug');
    if (el) el.remove();
  }, 5000);
}

// Call this function when the script loads
debugContentScript();

/**
 * Try to identify the main product container
 * This function helps focus our extraction on the primary product
 * and avoid recommendation sections
 */
function findMainProductContainer() {
  // Common selectors for main product containers
  const containerSelectors = [
    // By semantic meaning
    '[itemtype*="Product"]',
    '[itemscope][itemtype*="Product"]',
    // By common class names
    '.product-main',
    '.product-container',
    '.product-detail',
    '.product-page',
    '.product-content',
    '.product-info',
    '#product-container',
    '#product-main',
    // More generic
    '[class*="product-detail"]',
    '[class*="productDetail"]',
    '[class*="ProductDetail"]',
  ];
  
  // Try each selector
  for (const selector of containerSelectors) {
    const container = document.querySelector(selector);
    if (container) {
      return container;
    }
  }
  
  // If no container found, try to infer one based on the location of the first h1
  const firstH1 = document.querySelector('h1');
  if (firstH1) {
    // Try to go up a few levels to find a container
    let parent = firstH1.parentElement;
    for (let i = 0; i < 3; i++) {
      if (parent && parent.tagName.toLowerCase() !== 'body') {
        parent = parent.parentElement;
      } else {
        break;
      }
    }
    return parent;
  }
  
  // Fallback to the main content area
  return document.querySelector('main') || document.body;
}

/**
 * Function to determine if an element is likely part of a recommendation carousel
 */
function isLikelyRecommendation(element) {
  if (!element) return true;
  
  // Check if element or any parent up to 4 levels has certain keywords in class or id
  function checkElementAndParents(el, depth = 0) {
    if (!el || depth > 4) return false;
    
    const classAndId = (el.className || '') + ' ' + (el.id || '');
    const keywords = ['recommendation', 'carousel', 'similar', 'also-bought', 'related', 
                     'suggestion', 'you-may-like', 'sponsored', 'also-viewed', 'accessory',
                     'upsell', 'slider', 'other-product', 'people-also'];
    
    for (const keyword of keywords) {
      if (classAndId.toLowerCase().includes(keyword)) {
        return true;
      }
    }
    
    return checkElementAndParents(el.parentElement, depth + 1);
  }
  
  return checkElementAndParents(element);
}

/**
 * Extract the product title using common selectors across e-commerce sites
 */
function extractTitle() {
  // Try various common selectors for product titles in priority order
  const titleSelectors = [
    // Primary product title selectors
    'h1.product-title',
    'h1.product_title',
    'h1.productTitle',
    'h1[itemprop="name"]',
    '.product-title h1',
    '.product-name h1',
    // More generic h1 selectors
    'h1',
    // Other common patterns
    '[data-testid="product-title"]',
    '[class*="product-title"]',
    '[class*="productTitle"]',
    '#product-title',
    '#productTitle',
    '.product-title',
    '.product-name',
  ];

  // Try each selector
  for (const selector of titleSelectors) {
    const element = document.querySelector(selector);
    if (element && element.innerText.trim()) {
      return element.innerText.trim();
    }
  }

  // Fallback to document title (often contains the product name)
  const docTitle = document.title.trim();
  // Try to remove site name from document title
  const siteName = extractSiteName();
  if (siteName && docTitle.includes(siteName)) {
    return docTitle.replace(siteName, '').replace('|', '').replace('-', '').trim();
  }
  return docTitle;
}

/**
 * Extract the product price using common selectors across e-commerce sites
 */
function extractPrice() {
  // First try to extract from structured data if available
  const structuredPrice = extractStructuredPrice();
  if (structuredPrice) return structuredPrice;
  
  // Try various common selectors for prices
  const priceSelectors = [
    // Structured data - most reliable when available
    '[itemprop="price"]',
    '[property="product:price:amount"]',
    // ARIA attributes
    '[aria-label*="price" i]',
    '[aria-label*="cost" i]',
    // Common price selectors
    '.product-price',
    '.price-current',
    '.current-price',
    '.offer-price',
    '.sale-price',
    '.product__price',
    '[data-price]',
    '[class*="price"]',
    '[class*="Price"]',
    '.price',
    '#price',
    // More specific patterns that might appear
    '.a-price .a-offscreen',
    '.price-view-price',
    '.priceView-customer-price',
  ];

  // Focus on main product container to avoid capturing related products
  const mainContainer = findMainProductContainer();
  let priceText = null;
  
  if (mainContainer) {
    // Try to find price within the main container first
    for (const selector of priceSelectors) {
      const elements = mainContainer.querySelectorAll(selector);
      for (const element of elements) {
        // Skip if in a recommendation area
        if (isLikelyRecommendation(element)) continue;
        
        const text = element.innerText.trim();
        if (text && isPriceFormat(text)) {
          priceText = cleanPriceText(text);
          // If it looks like a main price (not "was" price), return it
          if (!isSecondaryPrice(element)) {
            return priceText;
          }
        }
        
        // Check for price in data attribute
        const dataPrice = element.getAttribute('data-price');
        if (dataPrice && isPriceFormat(dataPrice)) {
          return cleanPriceText(dataPrice);
        }
      }
    }
  }

  // If not found in main container, try general approach
  for (const selector of priceSelectors) {
    const elements = document.querySelectorAll(selector);
    for (const element of elements) {
      // Skip if in a recommendation area
      if (isLikelyRecommendation(element)) continue;
      
      const text = element.innerText.trim();
      if (text && isPriceFormat(text)) {
        priceText = cleanPriceText(text);
        // If it looks like a main price (not "was" price), return it
        if (!isSecondaryPrice(element)) {
          return priceText;
        }
      }
      
      // Check for price in data attribute
      const dataPrice = element.getAttribute('data-price');
      if (dataPrice && isPriceFormat(dataPrice)) {
        return cleanPriceText(dataPrice);
      }
    }
  }

  // Try to find the price near product title as a proximity heuristic
  const priceNearTitle = findPriceNearTitle();
  if (priceNearTitle) return priceNearTitle;

  // Last resort: regex search through visible text in product container
  const extractedPrice = extractPriceWithRegex();
  if (extractedPrice) return extractedPrice;

  return "Price not found";
}

/**
 * Determine if an element is likely a secondary price (like "was" or "original" price)
 */
function isSecondaryPrice(element) {
  if (!element) return false;
  
  // Check the element and its adjacent text for secondary price indicators
  const elementText = element.innerText.toLowerCase();
  const parentText = element.parentElement ? element.parentElement.innerText.toLowerCase() : '';
  
  const secondaryIndicators = ['was', 'original', 'regular', 'list', 'msrp', 'rrp', 'retail', 'before', 'old'];
  
  // Check current element and parent for secondary price indicators
  for (const indicator of secondaryIndicators) {
    if (elementText.includes(indicator) || parentText.includes(indicator)) {
      return true;
    }
  }
  
  // Check if element has strikethrough formatting
  if (window.getComputedStyle(element).textDecoration.includes('line-through')) {
    return true;
  }
  
  return false;
}

/**
 * Clean up price text by removing extraneous information
 */
function cleanPriceText(priceText) {
  if (!priceText) return "";
  
  // Remove "From", "Starting at", etc.
  priceText = priceText.replace(/^(from|starting at|as low as|only|just|now)/i, '').trim();
  
  // Extract the first price if there are multiple
  const priceMatch = priceText.match(/[$€£¥₹₽₩¢]?\s*\d+([.,]\d+)?/);
  return priceMatch ? priceMatch[0].trim() : priceText;
}

/**
 * Check if text format resembles a price
 */
function isPriceFormat(text) {
  // Simple price format validation
  const priceRegex = /[$€£¥₹₽₩¢]?\s*\d+([.,]\d+)?|\d+([.,]\d+)?\s*[$€£¥₹₽₩¢]/;
  return priceRegex.test(text);
}

/**
 * Extract price using regex as a fallback method
 */
function extractPriceWithRegex() {
  const mainContainer = findMainProductContainer();
  
  if (!mainContainer) return null;
  
  // Focus on the container's text
  const containerText = mainContainer.innerText;
  
  // Look for price patterns with currency symbols
  const currencyRegex = /[$€£¥₹₽₩¢]\s*\d+([.,]\d{1,2})?|\d+([.,]\d{1,2})?\s*[$€£¥₹₽₩¢]/g;
  const currencyMatches = containerText.match(currencyRegex);
  
  if (currencyMatches && currencyMatches.length > 0) {
    return currencyMatches[0].trim();
  }
  
  return null;
}

/**
 * Find price element near the product title using proximity heuristic
 */
function findPriceNearTitle() {
  const titleElement = document.querySelector('h1');
  if (!titleElement) return null;
  
  // Get elements that may contain price near the title
  const siblingsAndNearby = [];
  
  // Get next siblings
  let nextSibling = titleElement.nextElementSibling;
  for (let i = 0; i < 3 && nextSibling; i++) {
    siblingsAndNearby.push(nextSibling);
    nextSibling = nextSibling.nextElementSibling;
  }
  
  // Get parent's children
  if (titleElement.parentElement) {
    const parentChildren = titleElement.parentElement.children;
    for (let i = 0; i < parentChildren.length; i++) {
      if (parentChildren[i] !== titleElement && !siblingsAndNearby.includes(parentChildren[i])) {
        siblingsAndNearby.push(parentChildren[i]);
      }
    }
  }
  
  // Check each nearby element for price format
  for (const element of siblingsAndNearby) {
    const text = element.innerText;
    if (text && isPriceFormat(text) && !isSecondaryPrice(element)) {
      return cleanPriceText(text);
    }
  }
  
  return null;
}

/**
 * Extract price information from structured data (JSON-LD, microdata)
 */
function extractStructuredPrice() {
  // Try JSON-LD first
  const jsonLdScript = document.querySelector('script[type="application/ld+json"]');
  if (jsonLdScript) {
    try {
      const jsonData = JSON.parse(jsonLdScript.textContent);
      
      // Handle both single product and array of products
      const products = Array.isArray(jsonData) ? jsonData : [jsonData];
      
      for (const product of products) {
        // Check if this is a Product type
        if (product['@type'] === 'Product') {
          // Get offer price
          if (product.offers) {
            const offers = Array.isArray(product.offers) ? product.offers : [product.offers];
            for (const offer of offers) {
              if (offer.price) {
                return cleanPriceText(offer.price.toString());
              }
            }
          }
        }
      }
    } catch (e) {
      console.log('Error parsing JSON-LD:', e);
    }
  }
  
  // Try microdata
  const priceProps = document.querySelector('[itemprop="price"][content]');
  if (priceProps) {
    const price = priceProps.getAttribute('content');
    if (price) return cleanPriceText(price);
  }
  
  return null;
}

/**
 * Extract the product description
 */
function extractDescription() {
  // Try various common selectors for product descriptions
  const descriptionSelectors = [
    // Structured data
    '[itemprop="description"]',
    // Common description selectors
    '.product-description',
    '.product__description',
    '#description',
    '.description',
    '[class*="description"]',
    '[class*="Description"]',
    '[data-testid="product-description"]',
    // Common patterns for product details
    '#productDescription',
    '#product-description',
    '#product_description',
    // Feature lists often contain good descriptions
    '#feature-bullets',
    '.feature-bullets',
    '.product-features',
  ];

  // Focus on main content area
  const mainContainer = findMainProductContainer();
  
  if (mainContainer) {
    // Try to find description within the main container
    for (const selector of descriptionSelectors) {
      const element = mainContainer.querySelector(selector);
      if (element && element.innerText.trim()) {
        return element.innerText.trim();
      }
    }
  }

  // Try general approach
  for (const selector of descriptionSelectors) {
    const element = document.querySelector(selector);
    if (element && element.innerText.trim()) {
      return element.innerText.trim();
    }
  }

  return "No description found";
}

/**
 * Extract product features/specifications
 */
function extractFeatures() {
  // Try to find product features or specifications
  const featureSelectors = [
    // Feature lists
    '.product-features li',
    '.features li',
    '.specifications li',
    '.tech-specs li',
    '#feature-bullets ul li',
    '[class*="feature"] li',
    // Table-based specifications
    '.specifications tr',
    '.tech-specs tr',
    '.product-specs tr',
    '#productDetails tr',
    '[class*="specification"] tr',
  ];

  let features = [];
  const mainContainer = findMainProductContainer();
  
  // Try to find features within the main container first
  if (mainContainer) {
    for (const selector of featureSelectors) {
      const elements = mainContainer.querySelectorAll(selector);
      if (elements && elements.length > 0) {
        elements.forEach(el => {
          const text = el.innerText.trim();
          if (text) features.push(text);
        });
        
        if (features.length > 0) {
          return features.join('\n');
        }
      }
    }
  }
  
  // If not found in main container, try general approach
  for (const selector of featureSelectors) {
    const elements = document.querySelectorAll(selector);
    if (elements && elements.length > 0) {
      elements.forEach(el => {
        const text = el.innerText.trim();
        if (text && !isLikelyRecommendation(el)) {
          features.push(text);
        }
      });
      
      if (features.length > 0) {
        return features.join('\n');
      }
    }
  }

  return features.join('\n') || "No features found";
}

/**
 * Extract the main product image
 */
function extractMainImage() {
  // Try various common selectors for main product images
  const imageSelectors = [
    // Structured data
    '[itemprop="image"]',
    // Common image selectors
    '.product-image-main img',
    '.product-image img',
    '.main-image img',
    '.product__image img',
    '.gallery-image img',
    // More generic but still likely to be product images
    '[class*="product"] img',
    '[class*="gallery"] img:first-of-type',
    '[data-testid="product-image"] img',
    '#product-image img',
    '#productImage',
    '#main-image',
  ];

  // Focus on main content area
  const mainContainer = findMainProductContainer();
  
  if (mainContainer) {
    // Try to find image within the main container
    for (const selector of imageSelectors) {
      const element = mainContainer.querySelector(selector);
      if (element && element.src) {
        return element.src;
      }
    }
  }

  // Try general approach
  for (const selector of imageSelectors) {
    const element = document.querySelector(selector);
    if (element && element.src) {
      return element.src;
    }
  }

  // Try any large image on the page as a last resort
  const allImages = document.querySelectorAll('img');
  let largestImage = null;
  let largestArea = 0;
  
  for (const img of allImages) {
    if (img.naturalWidth && img.naturalHeight) {
      const area = img.naturalWidth * img.naturalHeight;
      if (area > largestArea && !isLikelyRecommendation(img)) {
        largestArea = area;
        largestImage = img;
      }
    }
  }
  
  return largestImage?.src || "";
}

/**
 * Check for an "Add to Cart" button, a strong indicator of a product page.
 */
function hasAddToCartButton() {
    const buttonSelectors = [
        'button[data-test*="add-to-cart"]',
        'button[id*="add-to-cart"]',
        'button[class*="add-to-cart"]',
        'button[aria-label*="add to cart" i]',
        'input[type="submit"][value*="Add to Cart" i]',
        'button:contains("Add to Cart")',
        'button:contains("Add to Basket")',
        'button:contains("Buy Now")'
    ];

    for (const selector of buttonSelectors) {
        try {
            if (document.querySelector(selector)) {
                return true;
            }
        } catch (e) {
            // Handle pseudo-selectors like :contains if they are not supported
        }
    }

    // Fallback to checking text content of all buttons
    const buttons = document.querySelectorAll('button, input[type="submit"], a[role="button"]');
    const addToCartRegex = /add to cart|add to basket|buy now/i;

    for (const button of buttons) {
        const buttonText = button.innerText || button.textContent || button.value || '';
        if (addToCartRegex.test(buttonText) && !isLikelyRecommendation(button)) {
            return true;
        }
    }

    return false;
}

/**
 * A more robust check to determine if the page is a single product detail page (PDP)
 * and not a search result or category page.
 */
function isProductDetailPage() {
    // Signal 1: A single, clear title.
    const title = extractTitle();
    if (!title) return false;

    // Quick Walmart shortcut: many Walmart product pages use '/ip/' in the URL.
    // Treat those as product pages if a title is present, even if price is dynamic.
    try {
      const siteNameEarly = detectSite();
      if (siteNameEarly === 'walmart') {
        const path = window.location.pathname.toLowerCase();
        if (path.includes('/ip/')) return true;
      }
    } catch (e) {
      // ignore
    }

    // Signal 2: A price is found.
    const price = extractPrice();
    if (!price || price === "Price not found") return false;

  // Site-specific relaxations: some sites (e.g. Walmart) use non-standard
  // Site-specific relaxations: some sites (e.g. Walmart) use non-standard markup.
  // For Walmart, require either JSON-LD Product structured data or a product-like
  // URL path segment to avoid showing CTA on the homepage.
  const siteName = detectSite();
  if (siteName === 'walmart') {
    const url = window.location.pathname.toLowerCase();
    const productPathIndicators = ['/ip/', '/product/', '/ip-', '/item/'];
    const looksLikeProductPath = productPathIndicators.some(seg => url.includes(seg));
    if (hasJsonLdProduct() || looksLikeProductPath) {
      return true;
    }
    return false;
  }

  // For other sites, require an add-to-cart button.
  if (!hasAddToCartButton()) return false;

    // Signal 4: Check for elements common on PDPs but not on search pages.
    // Presence of a product description or feature bullets is a strong positive signal.
    const description = document.querySelector('#productDescription, .product-description, #feature-bullets');
    if (!description) return false;

    // Signal 5: Count the number of items that look like products.
    // Search pages have many, PDPs should have one.
    const productItems = document.querySelectorAll('[itemtype*="Product"], .product-item, .s-result-item');
    if (productItems.length > 5) { // Threshold to avoid triggering on "related items" sections
        // If we see many items, let's check if there's a main product container to be sure.
        if (!findMainProductContainer()) {
            return false;
        }
    }
    
    // If all checks pass, it's very likely a product detail page.
    return true;
}


/**
 * Extract the site name
 */
function extractSiteName() {
  // Try to get site name from meta tags
  const metaElements = document.querySelectorAll('meta[property="og:site_name"], meta[name="author"]');
  for (const meta of metaElements) {
    if (meta.content) return meta.content;
  }
  
  // Fallback to hostname
  return window.location.hostname.replace('www.', '');
}

/**
 * Detect which e-commerce site we're currently on
 * @returns {string} Site name or null if not recognized
 */
function detectSite() {
  const hostname = window.location.hostname.toLowerCase();
  
  if (hostname.includes('amazon')) return 'amazon';
  if (hostname.includes('walmart')) return 'walmart';
  if (hostname.includes('target')) return 'target';
  if (hostname.includes('bestbuy')) return 'bestbuy';
  
  // Add more site detections as needed
  
  return null; // Not a recognized site
}

// Check if the page contains JSON-LD Product structured data
function hasJsonLdProduct() {
  try {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const s of scripts) {
      if (!s.textContent) continue;
      try {
        const data = JSON.parse(s.textContent);
        const arr = Array.isArray(data) ? data : [data];
        for (const obj of arr) {
          const t = obj['@type'] || obj['@type']?.toString?.() || '';
          if (!t) continue;
          if (typeof t === 'string' && t.toLowerCase().includes('product')) return true;
          if (Array.isArray(t) && t.some(x => String(x).toLowerCase().includes('product'))) return true;
        }
      } catch (e) {
        // ignore parse errors
      }
    }
  } catch (e) {
    // ignore
  }
  return false;
}

/**
 * Load a site-specific parser dynamically
 * @param {string} siteName The detected site name
 * @returns {Object|null} The site-specific parser or null if not available
 */
async function loadSiteParser(siteName) {
  if (!siteName) return null;
  
  // This will store the loaded parser code
  let parser = null;
  
  try {
    // Ask the background script to inject and run the parser inside the page
    // context (chrome.scripting.executeScript) to avoid CSP/unsafe-eval issues.
    parser = await new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ action: 'runSiteParser', siteName }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Error requesting background to run parser:', chrome.runtime.lastError);
            resolve(null);
            return;
          }

          if (!response) {
            resolve(null);
            return;
          }

          if (response.error) {
            console.error('Background parser run error:', response.error);
            resolve(null);
            return;
          }

          // The background returns { parsedBy, data }
          if (response.data) {
            resolve({ getProduct: () => response.data });
          } else {
            resolve(null);
          }
        });
      } catch (e) {
        console.error('Exception sending runSiteParser message:', e);
        resolve(null);
      }
    });
  } catch (error) {
    console.error(`Error loading parser for ${siteName}:`, error);
  }
  
  return parser;
}

/**
 * Main function to scrape all product information
 * Uses site-specific parsers when available, falls back to generic extraction
 */
async function scrapeProductInfo() {
  // First check if we're on a recognized site
  const siteName = detectSite();
  
  // If we have a site-specific parser available, use it
  if (siteName) {
    try {
      const globalParserName = `${siteName}Parser`;

      // 1) Prefer an attached window.<site>Parser if present
      if (window[globalParserName] && typeof window[globalParserName].getProduct === 'function') {
        const siteSpecificData = window[globalParserName].getProduct();
        console.log(`Used ${siteName} specific parser:`, siteSpecificData);
        return {
          title: siteSpecificData.title || "",
          price: siteSpecificData.priceInfo?.displayValue || "",
          description: (siteSpecificData.description || "").substring(0, 500),
          features: siteSpecificData.features || [],
          image: siteSpecificData.image || "",
          url: window.location.href,
          siteName: extractSiteName(),
          parsedBy: siteName
        };
      }

      // 2) Try to dynamically inject/load the parser file and use it
      const loadedParser = await loadSiteParser(siteName);
      if (loadedParser && typeof loadedParser.getProduct === 'function') {
        const siteSpecificData = loadedParser.getProduct();
        console.log(`Used dynamically loaded ${siteName} parser:`, siteSpecificData);
        return {
          title: siteSpecificData.title || "",
          price: siteSpecificData.priceInfo?.displayValue || "",
          description: (siteSpecificData.description || "").substring(0, 500),
          features: siteSpecificData.features || [],
          image: siteSpecificData.image || "",
          url: window.location.href,
          siteName: extractSiteName(),
          parsedBy: siteName
        };
      }

      // 3) If the parser exposes a global getProduct function (some parser files do), use it
      if (typeof window.getProduct === 'function') {
        const siteSpecificData = window.getProduct();
        console.log(`Used ${siteName} parser via global getProduct:`, siteSpecificData);
        return {
          title: siteSpecificData.title || "",
          price: siteSpecificData.priceInfo?.displayValue || siteSpecificData.priceInfo || "",
          description: (siteSpecificData.description || "").substring(0, 500),
          features: siteSpecificData.features || [],
          image: siteSpecificData.image || "",
          url: window.location.href,
          siteName: extractSiteName(),
          parsedBy: siteName
        };
      }
    } catch (error) {
      console.error(`Error using ${siteName} parser:`, error);
    }
  }
  
  // Fall back to generic extraction if site-specific parser failed or isn't available
  const productData = {
    title: extractTitle(),
    price: extractPrice(),
    description: extractDescription(),
    features: extractFeatures(),
    image: extractMainImage(),
    url: window.location.href,
    siteName: extractSiteName(),
    parsedBy: 'generic'
  };

  return productData;
}

// Safe logging function for content script
function safeContentLog(message) {
  try {
    console.log(message);
  } catch (e) {
    // Silent fail if console logging causes issues
  }
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  safeContentLog("Think About It: Message received in content script");
  
  if (message.action === "checkForProduct") {
    // Check if it's a product page and show the CTA if it is
    handlePageLoad();
  } else if (message.action === "getProductInfo") {
    // When the popup requests product info, scrape the page (async) and send it back
    (async () => {
      try {
        const data = await scrapeProductInfo();
        safeContentLog("Think About It: Product data scraped");
        sendResponse(data);
      } catch (err) {
        sendResponse({ error: err?.message || String(err) });
      }
    })();
  }
  else if (message.action === "debugParser") {
    // Show which parser was used and the extracted info (async)
    (async () => {
      try {
        const site = detectSite();
        const data = await scrapeProductInfo();

        // Create a debug overlay
        const debugElement = document.createElement('div');
        debugElement.style.position = 'fixed';
        debugElement.style.top = '10px';
        debugElement.style.right = '10px';
        debugElement.style.padding = '10px';
        debugElement.style.background = 'rgba(255, 255, 0, 0.9)';
        debugElement.style.zIndex = '9999';
        debugElement.style.fontSize = '14px';
        debugElement.style.fontWeight = 'bold';
        debugElement.style.border = '1px solid black';
        debugElement.style.borderRadius = '5px';
        debugElement.style.maxWidth = '400px';
        debugElement.style.maxHeight = '80vh';
        debugElement.style.overflow = 'auto';
        debugElement.id = 'think-about-it-debug';

        // Format the debug info
        const debugInfo = `
          <h3>Think About It: Parser Debug</h3>
          <p><strong>Site Detected:</strong> ${site || 'None (using generic parser)'}</p>
          <p><strong>Parser Used:</strong> ${data.parsedBy}</p>
          <p><strong>Title:</strong> ${data.title}</p>
          <p><strong>Price:</strong> ${data.price}</p>
          <hr>
          <p><strong>Site-specific parsers available:</strong></p>
          <p>Amazon: ${!!window.amazonParser}</p>
          <p>Walmart: ${!!window.walmartParser || !!window.getProduct}</p>
          <button id="close-debug">Close</button>
        `;

        debugElement.innerHTML = debugInfo;
        document.body.appendChild(debugElement);

        // Add close button functionality
        document.getElementById('close-debug').addEventListener('click', function() {
          document.getElementById('think-about-it-debug').remove();
        });

        sendResponse({status: "Debug info displayed"});
      } catch (err) {
        sendResponse({ error: err?.message || String(err) });
      }
    })();
  }
  
  return true; // Indicates that sendResponse will be called asynchronously
});

/**
 * Floating CTA functionality
 */
const wittyLines = [
  "Retail therapy is fun; debt therapy is not.",
  "Warning: this item may cause buyer’s remorse in 3–5 business days.",
  "If it doesn’t spark joy and cashback, maybe skip.",
  "Imagine explaining this purchase to Future You."
];

const practicalLines = [
  "Quick pause can save you $$$.",
  "Same outcome, less spend? Let’s check.",
  "What else could this money buy this month?",
  "Borrow, used, or wait? Let’s decide."
];

let ctaInterval;

function createFloatingCTA(style) {
  // If CTA already exists, don't create another one
  if (document.getElementById('think-about-it-cta')) {
    return;
  }

  const lines = style === 'witty' ? wittyLines : practicalLines;
  let currentLineIndex = Math.floor(Math.random() * lines.length);

  const cta = document.createElement('div');
  cta.id = 'think-about-it-cta';
  cta.style.position = 'fixed';
  cta.style.bottom = '20px';
  cta.style.right = '20px';
  cta.style.backgroundColor = '#3498db';
  cta.style.color = 'white';
  cta.style.padding = '15px';
  cta.style.borderRadius = '8px';
  cta.style.zIndex = '10000';
  cta.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
  cta.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
  cta.style.fontSize = '14px';
  cta.style.display = 'flex';
  cta.style.alignItems = 'center';
  cta.style.gap = '15px';

  const textElement = document.createElement('span');
  textElement.id = 'cta-text';
  textElement.innerText = lines[currentLineIndex];

  const button = document.createElement('button');
  button.innerText = 'Think About It';
  button.style.backgroundColor = 'white';
  button.style.color = '#3498db';
  button.style.border = 'none';
  button.style.padding = '8px 12px';
  button.style.borderRadius = '4px';
  button.style.cursor = 'pointer';
  button.style.fontWeight = 'bold';

  button.onclick = () => {
  // Request background to open the extension popup and trigger analysis
  chrome.runtime.sendMessage({ action: "openPopupAndAnalyze" });
  };

  cta.appendChild(textElement);
  cta.appendChild(button);
  document.body.appendChild(cta);

  // Rotate the text every 20 seconds
  ctaInterval = setInterval(() => {
    currentLineIndex = (currentLineIndex + 1) % lines.length;
    textElement.innerText = lines[currentLineIndex];
  }, 20000);
}

// Remove the floating CTA and clear its rotation interval
function removeCTA() {
  try {
    const el = document.getElementById('think-about-it-cta');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  } catch (e) {
    // ignore
  }
  try {
    if (ctaInterval) {
      clearInterval(ctaInterval);
      ctaInterval = null;
    }
  } catch (e) {
    // ignore
  }
}

// Watch for SPA navigation / back/forward
(function() {
  try {
    const _pushState = history.pushState;
    const _replaceState = history.replaceState;

    history.pushState = function() {
      const res = _pushState.apply(this, arguments);
      window.dispatchEvent(new Event('locationchange'));
      return res;
    };

    history.replaceState = function() {
      const res = _replaceState.apply(this, arguments);
      window.dispatchEvent(new Event('locationchange'));
      return res;
    };

    window.addEventListener('popstate', () => {
      window.dispatchEvent(new Event('locationchange'));
    });

    window.addEventListener('locationchange', () => {
      try {
        // Immediately remove CTA during navigation to avoid stale UI
        removeCTA();

        // Debounced re-check after SPA page content has had a chance to load
        if (typeof window.__think_location_change_timer !== 'undefined') {
          clearTimeout(window.__think_location_change_timer);
        }
        window.__think_location_change_timer = setTimeout(() => {
          try {
            // Re-run detection and show CTA if this is a product page
            handlePageLoad();
          } catch (e) {
            // ignore
          }
        }, 400);
      } catch (e) {
        // ignore
      }
    });
  } catch (e) {
    // ignore
  }
})();

// Observe DOM mutations (useful for SPA content that loads after URL changes)
try {
  const mutationObserver = new MutationObserver((mutations) => {
    try {
      // Debounce heavy checks
      if (typeof window.__think_mutation_timer !== 'undefined') {
        clearTimeout(window.__think_mutation_timer);
      }
      window.__think_mutation_timer = setTimeout(() => {
        try {
          // If CTA already present, no need to re-run
          if (document.getElementById('think-about-it-cta')) return;

          // If page now looks like a product page, run page load handling
          if (isProductPage()) {
            handlePageLoad();
          }
        } catch (e) {
          // ignore
        }
      }, 350);
    } catch (e) {
      // ignore
    }
  });

  mutationObserver.observe(document.documentElement || document.body, {
    childList: true,
    subtree: true
  });
} catch (e) {
  // ignore
}

function isProductPage() {
    // Use the more robust check now
    return isProductDetailPage();
}

async function handlePageLoad() {
  if (isProductPage()) {
    chrome.storage.sync.get("responseStyle", (data) => {
      const style = data.responseStyle || 'witty';
      createFloatingCTA(style);
    });
  }
}

safeContentLog("Think About It: Product scraper content script loaded");

// Amazon-specific parser - hardcoded for immediate availability
window.amazonParser = {
  getProduct: function() {
    return {
      title: (function() {
        const titleElement = document.querySelector('#productTitle');
        return titleElement ? titleElement.textContent.trim() : "";
      })(),
      
      priceInfo: (function() {
        // Try several known Amazon price selectors in order of reliability
        const priceSelectors = [
          '#corePrice_feature_div .a-offscreen',
          '#price_inside_buybox',
          '#priceblock_ourprice',
          '.a-price .a-offscreen',
          '#price',
          '.price',
          '.offer-price',
          '.deal-price'
        ];
        
        for (const selector of priceSelectors) {
          const priceElement = document.querySelector(selector);
          if (priceElement && priceElement.textContent.trim()) {
            const priceText = priceElement.textContent.trim();
            const currencySymbol = priceText.match(/[$€£¥₹₽₩¢]/)?.[0] || "$";
            // Extract numeric value - handle formats like $1,234.56
            const priceValue = parseFloat(
              priceText.replace(/[^\d.,]/g, '')
                     .replace(/,/g, '.')
                     .match(/\d+\.\d+|\d+/)?.[0]
            );
            
            return {
              value: priceValue || 0,
              displayValue: priceText,
              currency: currencySymbol
            };
          }
        }
        
        return { value: 0, displayValue: "Price not found", currency: "$" };
      })(),
      
      categoryPath: (function() {
        const breadcrumbContainer = document.querySelector('#wayfinding-breadcrumbs_container');
        if (!breadcrumbContainer) return [];
        
        const breadcrumbItems = breadcrumbContainer.querySelectorAll('a');
        return Array.from(breadcrumbItems).map(item => item.textContent.trim());
      })(),
      
      image: (function() {
        const imageElement = document.querySelector('#imgTagWrapperId img') || 
                            document.querySelector('#landingImage');
        
        if (imageElement) {
          return imageElement.src || imageElement.getAttribute('data-old-hires') || "";
        }
        
        return "";
      })(),
      
      features: (function() {
        const featuresContainer = document.querySelector('#feature-bullets');
        if (!featuresContainer) return [];
        
        const featureItems = featuresContainer.querySelectorAll('li:not(.aok-hidden)');
        return Array.from(featureItems).map(item => item.textContent.trim());
      })(),
      
      description: (function() {
        const descElement = document.querySelector('#productDescription');
        return descElement ? descElement.textContent.trim() : "";
      })()
    };
  }
};

/**
 * Debug function for price extraction
 * This helps diagnose if price extraction is working correctly
 */
function debugPriceExtraction() {
  console.group("Think About It: Price Extraction Debug");
  
  // Log all attempted methods
  const structuredPrice = extractStructuredPrice();
  console.log("Structured data price:", structuredPrice || "Not found");
  
  // Find main container
  const mainContainer = findMainProductContainer();
  console.log("Main product container found:", !!mainContainer);
  
  // Check common price selectors
  const priceSelectors = [
    '[itemprop="price"]',
    '[property="product:price:amount"]',
    '[aria-label*="price" i]',
    '.product-price',
    '.price-current',
    '.price',
    '#price'
  ];
  
  console.group("Common price selectors check:");
  priceSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      console.log(`${selector}: ${elements.length} found`, 
                  Array.from(elements).map(el => el.innerText.trim() || el.getAttribute('content')));
    }
  });
  console.groupEnd();
  
  // Try proximity heuristic
  const priceNearTitle = findPriceNearTitle();
  console.log("Price near title:", priceNearTitle || "Not found");
  
  // Try regex method
  const regexPrice = extractPriceWithRegex();
  console.log("Regex extracted price:", regexPrice || "Not found");
  
  // Final extracted price
  const finalPrice = extractPrice();
  console.log("Final extracted price:", finalPrice);
  
  console.groupEnd();
  
  // Add a visible element to the page for debugging
  const debugElement = document.createElement('div');
  debugElement.style.position = 'fixed';
  debugElement.style.bottom = '10px';
  debugElement.style.right = '10px';
  debugElement.style.padding = '10px';
  debugElement.style.background = 'rgba(255, 255, 0, 0.7)';
  debugElement.style.zIndex = '9999';
  debugElement.style.fontSize = '14px';
  debugElement.style.fontWeight = 'bold';
  debugElement.style.border = '1px solid black';
  debugElement.style.borderRadius = '5px';
  debugElement.textContent = `Price detected: ${finalPrice}`;
  debugElement.id = 'think-about-it-price-debug';
  document.body.appendChild(debugElement);
  
  // Remove after 10 seconds
  setTimeout(() => {
    const el = document.getElementById('think-about-it-price-debug');
    if (el) el.remove();
  }, 10000);
  
  return finalPrice;
}