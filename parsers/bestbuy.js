/**
 * Best Buy product parser for Think About It extension
 * Extracts product information from Best Buy product pages using site-specific selectors
 */

/**
 * Main function to extract product data from Best Buy
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
 * Extract product title from Best Buy page
 * @returns {string} Product title
 */
function extractTitle() {
  const titleElement = document.querySelector('.sku-title h1') ||
                      document.querySelector('.heading-5.v-fw-regular');
  return titleElement ? titleElement.textContent.trim() : "";
}

/**
 * Extract price information from Best Buy page
 * @returns {Object} Price information including value and currency
 */
function extractPrice() {
  // Try several known Best Buy price selectors in order of reliability
  const priceSelectors = [
    '.priceView-customer-price span',
    '.priceView-hero-price span[aria-hidden="true"]',
    '.pricing-price__current-price',
    '.sr-only[data-automation="current-price"]',
    '.current-price',
    '.price-box',
    '[data-testid="customer-price"]'
  ];
  
  for (const selector of priceSelectors) {
    const priceElement = document.querySelector(selector);
    if (priceElement && priceElement.textContent.trim()) {
      const priceText = priceElement.textContent.trim();
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
  
  return { value: 0, displayValue: "Price not found", currency: "$" };
}

/**
 * Extract category breadcrumb path from Best Buy page
 * @returns {Array} Category path as array of strings
 */
function extractCategoryPath() {
  const breadcrumbContainer = document.querySelector('.container-v3 .breadcrumb-list') ||
                             document.querySelector('[data-track="Breadcrumb"]');
  if (!breadcrumbContainer) return [];
  
  const breadcrumbItems = breadcrumbContainer.querySelectorAll('a');
  return Array.from(breadcrumbItems).map(item => item.textContent.trim());
}

/**
 * Extract main product image from Best Buy page
 * @returns {string} Product image URL
 */
function extractImage() {
  // Try main product image selectors
  const imageElement = document.querySelector('.primary-image') || 
                      document.querySelector('[data-testid="carousel-main-image"]');
  
  if (imageElement) {
    return imageElement.src || "";
  }
  
  return "";
}

/**
 * Extract product features from Best Buy page
 * @returns {Array} Product features as array of strings
 */
function extractFeatures() {
  const featuresContainer = document.querySelector('.features-list') ||
                           document.querySelector('.product-data-value');
  if (!featuresContainer) return [];
  
  const featureItems = featuresContainer.querySelectorAll('li');
  return Array.from(featureItems).map(item => item.textContent.trim());
}

/**
 * Extract product rating from Best Buy page
 * @returns {number} Product rating (0-5)
 */
function extractRating() {
  const ratingElement = document.querySelector('.c-review-average') ||
                       document.querySelector('[data-testid="customer-rating"]');
  if (!ratingElement) return 0;
  
  const ratingText = ratingElement.textContent;
  if (ratingText) {
    const match = ratingText.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
  }
  
  return 0;
}

/**
 * Extract number of reviews from Best Buy page
 * @returns {number} Number of reviews
 */
function extractReviewCount() {
  const reviewElement = document.querySelector('.c-review-count') ||
                       document.querySelector('[data-testid="review-count"]');
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
