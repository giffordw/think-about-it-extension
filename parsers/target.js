/**
 * Target product parser for Think About It extension
 * Extracts product information from Target product pages using site-specific selectors
 */

/**
 * Main function to extract product data from Target
 * @returns {Object} Product information object
 */
function getProduct() {
  return {
    title: extractTitle(),
    priceInfo: extractPrice(),
    categoryPath: extractCategoryPath(),
    image: extractImage(),
    url: window.location.href,
    features: extractFeatures(),
    rating: extractRating(),
    reviews: extractReviewCount()
  };
}

/**
 * Extract product title from Target page
 * @returns {string} Product title
 */
function extractTitle() {
  const titleElement = document.querySelector('h1[data-test="product-title"]') ||
                      document.querySelector('[data-test="product-title"]') ||
                      document.querySelector('.Heading__StyledHeading-sc-1mp23s9-0');
  return titleElement ? titleElement.textContent.trim() : "";
}

/**
 * Extract price information from Target page
 * @returns {Object} Price information including value and currency
 */
function extractPrice() {
  // First, try to extract price from JSON data in the HTML source
  try {
    const htmlContent = document.documentElement.innerHTML;
    
    // Primary approach: Focus on specific price pattern in Target's HTML structure
    // We're looking for the current_retail key followed by a number, then formatted_current_price
    const pricePattern = /\"price\":\s*\{\s*\"current_retail\":(\d+(?:\.\d+)?)\s*,\s*\"display_was_now\":(?:true|false)\s*,\s*\"formatted_current_price\":\"(\$\d+\.\d+)\"/;
    const mainPriceMatch = htmlContent.match(pricePattern);
    
    if (mainPriceMatch) {
      const numericPrice = parseFloat(mainPriceMatch[1]);
      const formattedPrice = mainPriceMatch[2];
      
      console.log("Found Target price in main product data:", { numericPrice, formattedPrice });
      
      return {
        value: numericPrice,
        displayValue: formattedPrice,
        currency: "$"
      };
    }
    
    // Fallback pattern: Look for a more general structure but try to get the most relevant price
    // Step 1: Find ALL price objects
    const allPriceMatches = [];
    const priceRegex = /\"price\":\s*\{\s*\"current_retail\":(\d+(?:\.\d+)?)[^}]*\"formatted_current_price\":\"(\$\d+\.\d+)\"/g;
    let match;
    
    while ((match = priceRegex.exec(htmlContent)) !== null) {
      allPriceMatches.push({
        numericPrice: parseFloat(match[1]),
        formattedPrice: match[2],
        index: match.index // Store the position to help determine which is most relevant
      });
    }
    
    if (allPriceMatches.length > 0) {
      // Look for price objects that are near other product-related keywords
      const relevantMatches = allPriceMatches.filter(match => {
        // Check if this price is near relevant context
        const contextStart = Math.max(0, match.index - 1000);
        const contextEnd = Math.min(htmlContent.length, match.index + 1000);
        const context = htmlContent.substring(contextStart, contextEnd);
        
        // Check if price appears near product data by looking for relevant keywords
        return context.includes("tcin") || 
               context.includes("product_description") || 
               context.includes("item") || 
               context.includes("primaryBarcode");
      });
      
      if (relevantMatches.length > 0) {
        // Take the first relevant match
        const bestMatch = relevantMatches[0];
        console.log("Found Target price in relevant context:", bestMatch);
        
        return {
          value: bestMatch.numericPrice,
          displayValue: bestMatch.formattedPrice,
          currency: "$"
        };
      }
      
      // If we can't determine relevance, use the first match
      console.log("Using first price match:", allPriceMatches[0]);
      return {
        value: allPriceMatches[0].numericPrice,
        displayValue: allPriceMatches[0].formattedPrice,
        currency: "$"
      };
    }
    
    // Special case handling for the $35 pattern you specifically mentioned
    const specificPattern = /\"price\":\s*{\"current_retail\":(\d+),\"display_was_now\":false,\"formatted_current_price\":\"(\$\d+\.\d+)\"/;
    const specificMatch = htmlContent.match(specificPattern);
    if (specificMatch) {
      const numericPrice = parseFloat(specificMatch[1]);
      const formattedPrice = specificMatch[2];
      
      console.log("Found Target price using specific pattern:", { numericPrice, formattedPrice });
      
      return {
        value: numericPrice,
        displayValue: formattedPrice,
        currency: "$"
      };
    }
    
    // Try finding price elements in the DOM if the JSON approach fails
    const priceElements = [
      document.querySelector('[data-test="product-price"]'),
      document.querySelector('.merchandising-price'),
      document.querySelector('[data-test="current-price"]'),
      document.querySelector('[class*="price"]')
    ].filter(Boolean);
    
    for (const priceElement of priceElements) {
      if (priceElement) {
        const priceText = priceElement.textContent.trim();
        const priceMatch = priceText.match(/\$(\d+\.\d{2})/);
        if (priceMatch) {
          const numericPrice = parseFloat(priceMatch[1]);
          console.log("Found Target price in DOM:", { numericPrice, formattedPrice: priceText });
          
          return {
            value: numericPrice,
            displayValue: priceText,
            currency: "$"
          };
        }
      }
    }
    
    // Try using the product object directly if available in window scope
    if (window.__TGT_DATA__ && 
        window.__TGT_DATA__.__PRELOADED_QUERIES__ && 
        window.__TGT_DATA__.__PRELOADED_QUERIES__.queries) {
      
      // Look through the preloaded data for price information
      const queries = window.__TGT_DATA__.__PRELOADED_QUERIES__.queries;
      for (let i = 0; i < queries.length; i++) {
        const query = queries[i];
        if (query && query[1]) {
          // Look for price information in different possible locations
          if (query[1].data && query[1].data.product && query[1].data.product.price) {
            const price = query[1].data.product.price;
            if (price.current_retail && price.formatted_current_price) {
              console.log("Found Target price in window.__TGT_DATA__:", price);
              return {
                value: parseFloat(price.current_retail),
                displayValue: price.formatted_current_price,
                currency: "$"
              };
            }
          }
          
          // Check for alternative data structure
          if (query[1].price) {
            const price = query[1].price;
            if (price.current_retail && price.formatted_current_price) {
              console.log("Found Target price in alternative TGT_DATA structure:", price);
              return {
                value: parseFloat(price.current_retail),
                displayValue: price.formatted_current_price,
                currency: "$"
              };
            }
          }
        }
      }
    }
    
    // Last resort - look for any price-like string in the document
    const pricePatterns = htmlContent.match(/[\$€£¥](\d+\.\d{2})/g);
    if (pricePatterns && pricePatterns.length > 0) {
      // Find prices near product-related terms to improve accuracy
      for (const priceStr of pricePatterns) {
        const priceIndex = htmlContent.indexOf(priceStr);
        if (priceIndex >= 0) {
          const contextStart = Math.max(0, priceIndex - 300);
          const contextEnd = Math.min(htmlContent.length, priceIndex + 300);
          const context = htmlContent.substring(contextStart, contextEnd);
          
          // If this price appears near product-related terms, it's likely the right one
          if (context.includes("current_retail") || 
              context.includes("product") || 
              context.includes("price") || 
              context.includes("formatted_current_price")) {
            
            const numericPrice = parseFloat(priceStr.replace(/[^\d.]/g, ''));
            console.log("Found Target price using context analysis:", { numericPrice, formattedPrice: priceStr });
            
            return {
              value: numericPrice,
              displayValue: priceStr,
              currency: "$"
            };
          }
        }
      }
      
      // If no contextual match, use the first price found
      const firstPrice = pricePatterns[0];
      const numericPrice = parseFloat(firstPrice.replace(/[^\d.]/g, ''));
      console.log("Using first price pattern found as last resort:", { numericPrice, formattedPrice: firstPrice });
      
      return {
        value: numericPrice,
        displayValue: firstPrice,
        currency: "$"
      };
    }
  } catch (e) {
    console.log("Error extracting price from Target page:", e);
  }
  
  // Try several known Target price selectors in order of reliability
  const priceSelectors = [
    // Most common selectors
    '[data-test="product-price"]',
    '[data-test="current-price"]',
    '[data-test="price-value"]',
    // Sale price selectors
    '[data-test="product-price"] .h-text-bs',
    '[data-test="product-price"] span[data-test="current-price"]',
    // Specific class-based selectors
    '.style__PriceFontSize-sc-__sc-6j89pi-3',
    '.h-text-bs',
    '.style__CurrentPriceFontSize-sc-__sc-6j89pi-0',
    '.styles__StyledPricePromoContainer-sc-1n5dwo9-0',
    '.merchandising-price h2',
    '.styles__CurrentPriceValue-sc-1eckydb-1',
    // Generic price classes
    '[class*="price"]',
    '[class*="Price"]'
  ];
  
  // Try each selector
  for (const selector of priceSelectors) {
    const priceElement = document.querySelector(selector);
    if (priceElement && priceElement.textContent.trim()) {
      const priceText = priceElement.textContent.trim();
      // Only process if it looks like a price (contains a currency symbol)
      if (/[$€£¥₹₽₩¢]/.test(priceText)) {
        const currencySymbol = priceText.match(/[$€£¥₹₽₩¢]/)?.[0] || "$";
        
        // Extract numeric value
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
  }
  
  // If specific selectors fail, try to find any element containing a price pattern
  const allElements = document.querySelectorAll('*');
  for (const element of allElements) {
    const text = element.textContent?.trim();
    if (text && /\$\d+\.\d{2}/.test(text) && text.length < 15) {
      // This looks like a price with $ symbol
      const match = text.match(/\$(\d+\.\d{2})/);
      if (match) {
        return {
          value: parseFloat(match[1]),
          displayValue: text,
          currency: "$"
        };
      }
    }
  }
  
  // Last resort - look for structured data
  try {
    const jsonLdElements = document.querySelectorAll('script[type="application/ld+json"]');
    for (const element of jsonLdElements) {
      try {
        const data = JSON.parse(element.textContent);
        if (data.offers?.price) {
          return {
            value: parseFloat(data.offers.price),
            displayValue: `$${data.offers.price}`,
            currency: data.offers.priceCurrency || "$"
          };
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }
  } catch (e) {
    // Ignore structured data errors
  }
  
  // Add debug information to help troubleshoot
  console.log("Target price extraction failed. Adding debug info...");
  
  // Return default when all attempts fail
  return { value: 0, displayValue: "Price not found", currency: "$" };
}

/**
 * Extract category breadcrumb path from Target page
 * @returns {Array} Category path as array of strings
 */
function extractCategoryPath() {
  const breadcrumbContainer = document.querySelector('[data-test="breadcrumb"]') ||
                             document.querySelector('.Breadcrumb__BCWrapper-sc-1s3fz3w-0');
  if (!breadcrumbContainer) return [];
  
  const breadcrumbItems = breadcrumbContainer.querySelectorAll('a');
  return Array.from(breadcrumbItems).map(item => item.textContent.trim());
}

/**
 * Extract main product image from Target page
 * @returns {string} Product image URL
 */
function extractImage() {
  // Try main product image selectors
  const imageElement = document.querySelector('[data-test="product-image"] img') || 
                      document.querySelector('.styles__StyledImageZoomContainer-sc-1lp110x-0 img');
  
  if (imageElement) {
    return imageElement.src || "";
  }
  
  return "";
}

/**
 * Extract product features from Target page
 * @returns {Array} Product features as array of strings
 */
function extractFeatures() {
  const featuresContainer = document.querySelector('[data-test="item-details-specifications"]') ||
                           document.querySelector('.h-padding-h-default');
  if (!featuresContainer) return [];
  
  const featureItems = featuresContainer.querySelectorAll('li');
  return Array.from(featureItems).map(item => item.textContent.trim());
}

/**
 * Extract product rating from Target page
 * @returns {number} Product rating (0-5)
 */
function extractRating() {
  const ratingElement = document.querySelector('[data-test="reviews-rating"]') ||
                       document.querySelector('.RatingsReviewsAggregate__RatingCount-sc-1qr1ubs-0');
  if (!ratingElement) return 0;
  
  const ratingText = ratingElement.textContent;
  if (ratingText) {
    const match = ratingText.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
  }
  
  return 0;
}

/**
 * Extract number of reviews from Target page
 * @returns {number} Number of reviews
 */
function extractReviewCount() {
  const reviewElement = document.querySelector('[data-test="reviews-count"]') ||
                       document.querySelector('.RatingsReviewsAggregate__ReviewCount-sc-1qr1ubs-1');
  if (!reviewElement) return 0;
  
  const reviewText = reviewElement.textContent;
  if (reviewText) {
    const match = reviewText.match(/[\d,]+/);
    if (match) {
      return parseInt(match[0].replace(/,/g, ''), 10);
    }
  }
  
  return 0;
}

// Add this function to help debug price extraction issues
function debugPriceExtraction() {
  // Capture relevant HTML sections for debugging
  const priceContainers = [
    document.querySelector('[data-test="product-price"]'),
    document.querySelector('.merchandising-price'),
    document.querySelector('[data-test="current-price"]')
  ].filter(Boolean);
  
  // Check for price JSON data - try multiple approaches
  let priceData = {
    attemptedExtractions: []
  };
  
  try {
    const htmlContent = document.documentElement.innerHTML;
    
    // Find ALL price objects in the HTML (to determine if there are multiple prices)
    const allPriceMatches = [];
    const priceRegex = /\"price\":\s*\{\s*\"current_retail\":(\d+(?:\.\d+)?)[^}]*\"formatted_current_price\":\"(\$\d+\.\d+)\"/g;
    let match;
    
    while ((match = priceRegex.exec(htmlContent)) !== null) {
      // For each match, capture surrounding context to help determine relevance
      const contextStart = Math.max(0, match.index - 100);
      const contextEnd = Math.min(htmlContent.length, match.index + 200);
      const context = htmlContent.substring(contextStart, contextEnd);
      
      allPriceMatches.push({
        numericPrice: parseFloat(match[1]),
        formattedPrice: match[2],
        index: match.index,
        context: context
      });
    }
    
    priceData.allPriceMatches = allPriceMatches;
    
    // Attempt 1: Look for the most specific price pattern
    try {
      const pricePattern = /\"price\":\s*\{\s*\"current_retail\":(\d+(?:\.\d+)?)\s*,\s*\"display_was_now\":(?:true|false)\s*,\s*\"formatted_current_price\":\"(\$\d+\.\d+)\"/;
      const mainPriceMatch = htmlContent.match(pricePattern);
      
      if (mainPriceMatch) {
        // Capture surrounding context
        const contextStart = Math.max(0, mainPriceMatch.index - 100);
        const contextEnd = Math.min(htmlContent.length, mainPriceMatch.index + 200);
        const context = htmlContent.substring(contextStart, contextEnd);
        
        priceData.attemptedExtractions.push({
          method: "exact_pattern",
          numericPrice: parseFloat(mainPriceMatch[1]),
          formattedPrice: mainPriceMatch[2],
          index: mainPriceMatch.index,
          context: context,
          success: true
        });
      } else {
        priceData.attemptedExtractions.push({
          method: "exact_pattern",
          success: false
        });
      }
    } catch (e) {
      priceData.attemptedExtractions.push({
        method: "exact_pattern",
        error: e.message,
        success: false
      });
    }
    
    // Attempt 2: Look for window.__TGT_DATA__ which often has the price directly
    try {
      if (window.__TGT_DATA__ && 
          window.__TGT_DATA__.__PRELOADED_QUERIES__ && 
          window.__TGT_DATA__.__PRELOADED_QUERIES__.queries) {
        
        // Look through the preloaded data for price information
        const queries = window.__TGT_DATA__.__PRELOADED_QUERIES__.queries;
        let foundTGTDataPrice = false;
        
        for (let i = 0; i < queries.length; i++) {
          const query = queries[i];
          if (query && query[1] && query[1].data) {
            // Check different data structures
            if (query[1].data.product && query[1].data.product.price) {
              const price = query[1].data.product.price;
              priceData.attemptedExtractions.push({
                method: "tgt_data_product",
                numericPrice: parseFloat(price.current_retail || price.reg_retail),
                formattedPrice: price.formatted_current_price,
                priceObject: JSON.parse(JSON.stringify(price)), // Clone to avoid circular references
                success: true
              });
              foundTGTDataPrice = true;
              break;
            }
          }
        }
        
        if (!foundTGTDataPrice) {
          priceData.attemptedExtractions.push({
            method: "tgt_data_product",
            success: false,
            reason: "Price not found in TGT_DATA"
          });
        }
      } else {
        priceData.attemptedExtractions.push({
          method: "tgt_data_product",
          success: false,
          reason: "TGT_DATA not available"
        });
      }
    } catch (e) {
      priceData.attemptedExtractions.push({
        method: "tgt_data_product",
        error: e.message,
        success: false
      });
    }
    
    // Attempt 3: Look for price elements in the DOM
    try {
      if (priceContainers.length > 0) {
        for (const container of priceContainers) {
          const priceText = container.textContent.trim();
          const priceMatch = priceText.match(/\$(\d+\.\d{2})/);
          
          if (priceMatch) {
            priceData.attemptedExtractions.push({
              method: "dom_element",
              element: container.outerHTML,
              numericPrice: parseFloat(priceMatch[1]),
              formattedPrice: priceText,
              success: true
            });
          }
        }
      } else {
        priceData.attemptedExtractions.push({
          method: "dom_element",
          success: false,
          reason: "No price containers found in DOM"
        });
      }
    } catch (e) {
      priceData.attemptedExtractions.push({
        method: "dom_element",
        error: e.message,
        success: false
      });
    }
    
    // Attempt 4: Search for specific price structure (for $35 case)
    try {
      // This is very specific to the example you provided
      const specificPriceMatch = htmlContent.match(/\"price\":\s*{\"current_retail\":(\d+),\"display_was_now\":false,\"formatted_current_price\":\"(\$\d+\.\d+)\"/);
      
      if (specificPriceMatch) {
        // Capture surrounding context
        const contextStart = Math.max(0, specificPriceMatch.index - 100);
        const contextEnd = Math.min(htmlContent.length, specificPriceMatch.index + 200);
        const context = htmlContent.substring(contextStart, contextEnd);
        
        priceData.attemptedExtractions.push({
          method: "specific_pattern_for_35_example",
          numericPrice: parseFloat(specificPriceMatch[1]),
          formattedPrice: specificPriceMatch[2],
          index: specificPriceMatch.index,
          context: context,
          success: true
        });
      } else {
        priceData.attemptedExtractions.push({
          method: "specific_pattern_for_35_example",
          success: false
        });
      }
    } catch (e) {
      priceData.attemptedExtractions.push({
        method: "specific_pattern_for_35_example",
        error: e.message,
        success: false
      });
    }
    
  } catch (e) {
    priceData.overallError = e.message;
  }
  
  // Add any price-like strings found in the page
  try {
    const allPriceStrings = htmlContent.match(/[\$€£¥]\d+\.\d{2}/g) || [];
    priceData.allPriceStrings = [...new Set(allPriceStrings)].slice(0, 20); // Deduplicate and limit output
  } catch (e) {
    priceData.priceStringsError = e.message;
  }
  
  const debugInfo = {
    url: window.location.href,
    pageTitle: document.title,
    priceData: priceData,
    priceElements: priceContainers.map(el => ({
      outerHTML: el.outerHTML,
      innerText: el.innerText.trim()
    }))
  };
  
  console.log("Target price debugging info:", debugInfo);
  return debugInfo;
}

// Export the main function
if (typeof module !== 'undefined') {
  module.exports = { getProduct, debugPriceExtraction };
}
