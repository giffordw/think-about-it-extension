/**
 * Walmart product parser for Think About It extension
 * Extracts product information from Walmart product pages using site-specific selectors
 */

/**
 * Main function to extract product data from Walmart
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
 * Extract product title from Walmart page
 * @returns {string} Product title
 */
function extractTitle() {
  const titleElement = document.querySelector('h1.prod-ProductTitle') ||
                      document.querySelector('[data-testid="product-title"]');
  return titleElement ? titleElement.textContent.trim() : "";
}

/**
 * Extract price information from Walmart page
 * @returns {Object} Price information including value and currency
 */
function extractPrice() {
  // Try several known Walmart price selectors in order of reliability
  const priceSelectors = [
    '[data-testid="price"]',
    '.prod-PriceSection .price-group',
    '[itemprop="price"]',
    '.price-characteristic',
    '.price',
    '.product-price'
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
 * Extract category breadcrumb path from Walmart page
 * @returns {Array} Category path as array of strings
 */
function extractCategoryPath() {
  const breadcrumbContainer = document.querySelector('.breadcrumb');
  if (!breadcrumbContainer) return [];
  
  const breadcrumbItems = breadcrumbContainer.querySelectorAll('li a');
  return Array.from(breadcrumbItems).map(item => item.textContent.trim());
}

/**
 * Extract main product image from Walmart page
 * @returns {string} Product image URL
 */
function extractImage() {
  // Try main product image selectors
  const imageElement = document.querySelector('.prod-HeroImage img') || 
                      document.querySelector('[data-testid="hero-image"]');
  
  if (imageElement) {
    return imageElement.src || "";
  }
  
  return "";
}

/**
 * Extract product features from Walmart page
 * @returns {Array} Product features as array of strings
 */
function extractFeatures() {
  const featuresContainer = document.querySelector('.prod-ProductHighlights');
  if (!featuresContainer) return [];
  
  const featureItems = featuresContainer.querySelectorAll('li');
  return Array.from(featureItems).map(item => item.textContent.trim());
}

/**
 * Extract product rating from Walmart page
 * @returns {number} Product rating (0-5)
 */
function extractRating() {
  const ratingElement = document.querySelector('[itemprop="ratingValue"]') ||
                       document.querySelector('.stars-container');
  if (!ratingElement) return 0;
  
  const ratingText = ratingElement.textContent || ratingElement.getAttribute('aria-label');
  if (ratingText) {
    const match = ratingText.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
  }
  
  return 0;
}

/**
 * Extract number of reviews from Walmart page
 * @returns {number} Number of reviews
 */
function extractReviewCount() {
  const reviewElement = document.querySelector('[itemprop="reviewCount"]') ||
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
