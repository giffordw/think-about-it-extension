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
  // Try several known Target price selectors in order of reliability
  const priceSelectors = [
    '[data-test="product-price"]',
    '.style__PriceFontSize-sc-__sc-6j89pi-3',
    '.h-text-bs',
    '.style__CurrentPriceFontSize-sc-__sc-6j89pi-0',
    '.styles__StyledPricePromoContainer-sc-1n5dwo9-0'
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

// Export the main function
if (typeof module !== 'undefined') {
  module.exports = { getProduct };
}
