/**
 * Amazon product parser for Think About It extension
 * Extracts product information from Amazon product pages using site-specific selectors
 */

/**
 * Main function to extract product data from Amazon
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
 * Extract product title from Amazon page
 * @returns {string} Product title
 */
function extractTitle() {
  const titleElement = document.querySelector('#productTitle');
  return titleElement ? titleElement.textContent.trim() : "";
}

/**
 * Extract price information from Amazon page
 * @returns {Object} Price information including value and currency
 */
function extractPrice() {
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
}

/**
 * Extract category breadcrumb path from Amazon page
 * @returns {Array} Category path as array of strings
 */
function extractCategoryPath() {
  const breadcrumbContainer = document.querySelector('#wayfinding-breadcrumbs_container');
  if (!breadcrumbContainer) return [];
  
  const breadcrumbItems = breadcrumbContainer.querySelectorAll('a');
  return Array.from(breadcrumbItems).map(item => item.textContent.trim());
}

/**
 * Extract main product image from Amazon page
 * @returns {string} Product image URL
 */
function extractImage() {
  // Try main product image selectors
  const imageElement = document.querySelector('#imgTagWrapperId img') || 
                      document.querySelector('#landingImage');
  
  if (imageElement) {
    return imageElement.src || imageElement.getAttribute('data-old-hires') || "";
  }
  
  return "";
}

/**
 * Extract product features from Amazon page
 * @returns {Array} Product features as array of strings
 */
function extractFeatures() {
  const featuresContainer = document.querySelector('#feature-bullets');
  if (!featuresContainer) return [];
  
  const featureItems = featuresContainer.querySelectorAll('li:not(.aok-hidden)');
  return Array.from(featureItems).map(item => item.textContent.trim());
}

/**
 * Extract product rating from Amazon page
 * @returns {number} Product rating (0-5)
 */
function extractRating() {
  const ratingElement = document.querySelector('#acrPopover');
  if (!ratingElement) return 0;
  
  const ratingText = ratingElement.getAttribute('title');
  if (ratingText) {
    const match = ratingText.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
  }
  
  return 0;
}

/**
 * Extract number of reviews from Amazon page
 * @returns {number} Number of reviews
 */
function extractReviewCount() {
  const reviewElement = document.querySelector('#acrCustomerReviewText');
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

// Export the main function
if (typeof module !== 'undefined') {
  module.exports = { getProduct };
}
