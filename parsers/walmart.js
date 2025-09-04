/**
 * Walmart product parser for Think About It extension
 * Extracts product information from Walmart product pages
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

/** ---------------- Title ---------------- */
function extractTitle() {
  const titleElement =
    document.querySelector('#main-title') ||
    document.querySelector('[data-fs-element="name"]') ||
    document.querySelector('[data-testid="product-title"]') ||
    document.querySelector('h1[itemprop="name"]') ||
    document.querySelector('h1.prod-ProductTitle');

  return titleElement ? titleElement.textContent.trim() : "";
}

/** ---------------- Price ---------------- */
function extractPrice() {
  // 1) Structured content attribute
  const attrNode = document.querySelector('[itemprop="price"][content]');
  if (attrNode) {
    const raw = attrNode.getAttribute('content');
    const value = safeParseFloat(raw);
    const currAttr = document.querySelector('[itemprop="priceCurrency"][content]');
    const currencyISO = currAttr?.getAttribute('content') || null;
    return {
      value,
      displayValue: formatDisplay(currencyISO ? isoToSymbol(currencyISO) : '$', value),
      currency: currencyISO ? isoToSymbol(currencyISO) : '$'
    };
  }

  // 2) Visible candidates
  const candidates = [
    '[itemprop="price"]',
    '[data-seo-id="hero-price"]',
    '[data-fs-element="price"]',
    '[data-testid="price"]',
    '.price-characteristic',
    '.prod-PriceSection .price-group',
    '.price'
  ];

  let nodes = [];
  for (const sel of candidates) {
    document.querySelectorAll(sel).forEach(el => {
      const txt = (el.textContent || '').trim();
      if (txt) nodes.push({ txt });
    });
  }

  // Drop "was $…" and strikethroughs
  nodes = nodes.filter(n => !/was\s*\$/i.test(n.txt));

  if (nodes.length) {
    // Score: prefer "Now"/"current"
    const scored = nodes.map(n => {
      let score = 0;
      if (/now\b|current\b/i.test(n.txt)) score += 2;
      if (/\$\s*\d/.test(n.txt)) score += 1;
      return { ...n, score };
    }).sort((a, b) => b.score - a.score);

    for (const cand of scored) {
      const parsed = parsePriceFromText(cand.txt);
      if (parsed) return parsed;
    }
  }

  // 3) JSON-LD fallback
  const jsonLd = parsePriceFromJsonLd();
  if (jsonLd) return jsonLd;

  return { value: 0, displayValue: "Price not found", currency: "$" };
}

/** ---------------- Category ---------------- */
function extractCategoryPath() {
  const breadcrumbContainer = document.querySelector('.breadcrumb');
  if (!breadcrumbContainer) return [];
  const items = breadcrumbContainer.querySelectorAll('li a');
  return Array.from(items).map(i => i.textContent.trim());
}

/** ---------------- Image ---------------- */
function extractImage() {
  const imageElement =
    document.querySelector('.prod-HeroImage img') ||
    document.querySelector('[data-testid="hero-image"]') ||
    document.querySelector('img[itemprop="image"]');
  return imageElement ? imageElement.src || "" : "";
}

/** ---------------- Features ---------------- */
function extractFeatures() {
  const container = document.querySelector('.prod-ProductHighlights');
  if (!container) return [];
  const items = container.querySelectorAll('li');
  return Array.from(items).map(i => i.textContent.trim());
}

/** ---------------- Rating ---------------- */
function extractRating() {
  const el =
    document.querySelector('[itemprop="ratingValue"]') ||
    document.querySelector('[aria-label*="stars"]') ||
    document.querySelector('[data-testid="rating"]');
  const txt = el?.textContent || el?.getAttribute('aria-label') || '';
  const m = txt.match(/(\d+(?:\.\d+)?)(?=\s*stars)/i);
  return m ? parseFloat(m[1]) : 0;
}

/** ---------------- Reviews ---------------- */
function extractReviewCount() {
  const el =
    document.querySelector('[itemprop="reviewCount"]') ||
    document.querySelector('[data-testid="review-count"]') ||
    document.querySelector('[aria-label*="reviews"]');
  const txt = el?.textContent || el?.getAttribute('aria-label') || '';
  const m = txt.match(/(\d[\d,]*)\s*reviews/i);
  return m ? parseInt(m[1].replace(/,/g, ''), 10) : 0;
}

/** ---------------- Helpers ---------------- */
function safeParseFloat(s) {
  if (!s) return 0;
  const norm = String(s).replace(/[^\d.,]/g, '');
  if (norm.includes(',') && norm.includes('.')) {
    return parseFloat(norm.replace(/,/g, '')); // comma thousands
  }
  if (norm.includes(',') && !norm.includes('.')) {
    return parseFloat(norm.replace(',', '.')); // comma decimal
  }
  return parseFloat(norm);
}

function isoToSymbol(iso) {
  const map = { USD: '$', EUR: '€', GBP: '£', JPY: '¥', INR: '₹', KRW: '₩', RUB: '₽', CNY: '¥', CAD: '$', AUD: '$' };
  return map[iso.toUpperCase()] || '$';
}

function formatDisplay(symbol, value) {
  if (!value) return `${symbol}0.00`;
  return `${symbol}${value.toFixed(2)}`;
}

function parsePriceFromText(text) {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  const currencyMatch = cleaned.match(/[$€£¥₹₽₩¢]/);
  const currency = currencyMatch ? currencyMatch[0] : '$';
  const matches = cleaned.match(/\d[\d,]*(?:\.\d{1,2})?/g);
  if (!matches) return null;

  if (/now\b/i.test(cleaned)) {
    const afterNow = cleaned.slice(cleaned.toLowerCase().indexOf('now'));
    const nowMatches = afterNow.match(/\d[\d,]*(?:\.\d{1,2})?/g);
    if (nowMatches && nowMatches.length) {
      const v = safeParseFloat(nowMatches[0]);
      return { value: v, displayValue: formatDisplay(currency, v), currency };
    }
  }

  const v = safeParseFloat(matches[0]);
  return { value: v, displayValue: formatDisplay(currency, v), currency };
}

function parsePriceFromJsonLd() {
  try {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const s of scripts) {
      const txt = s.textContent?.trim();
      if (!txt) continue;
      let data;
      try { data = JSON.parse(txt); } catch { continue; }
      const arr = Array.isArray(data) ? data : [data];
      for (const obj of arr) {
        const offers = obj?.offers || obj?.Offers;
        if (offers) {
          const offer = Array.isArray(offers) ? offers[0] : offers;
          const price = offer?.price || offer?.Price;
          const currency = offer?.priceCurrency || offer?.PriceCurrency;
          if (price) {
            const v = safeParseFloat(price);
            return {
              value: v,
              displayValue: formatDisplay(currency ? isoToSymbol(currency) : '$', v),
              currency: currency ? isoToSymbol(currency) : '$'
            };
          }
        }
      }
    }
  } catch (_) {}
  return null;
}

// Export
if (typeof module !== 'undefined') {
  module.exports = { getProduct };
}
