/**
 * Multi-Region Image Loader - Client Side
 * 
 * Handles intelligent image loading with regional optimization
 * and progressive loading with fallbacks for optimal performance.
 */

class MultiRegionImageLoader {
  constructor() {
    this.userCountry = null;
    this.globalCloudFrontUrl = window.GLOBAL_CLOUDFRONT_URL || null;
    this.isProduction = window.NODE_ENV === 'production';
    this.imageCache = new Map();
    this.loadingPromises = new Map();
    
    // EU country codes (same as server-side)
    this.euCountries = [
      'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
      'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
      'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'GB', 'IS', 'NO', 'CH'
    ];

    this.initializeUserLocation();
  }

  /**
   * Initialize user location detection
   */
  async initializeUserLocation() {
    try {
      // Try to get user's country from various sources
      await this.detectUserCountry();
    } catch (error) {
      console.warn('Could not detect user location, defaulting to US region:', error);
      this.userCountry = 'US';
    }
  }

  /**
   * Detect user's country code using multiple methods
   */
  async detectUserCountry() {
    // Method 1: Check if country is stored in localStorage
    const storedCountry = localStorage.getItem('userCountry');
    if (storedCountry && this.isValidCountryCode(storedCountry)) {
      this.userCountry = storedCountry;
      console.debug('Using stored country:', this.userCountry);
      return;
    }

    // Method 2: Try to get from CloudFlare headers (if available)
    try {
      const response = await fetch('/api/get-user-location', {
        method: 'GET',
        cache: 'no-cache'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.country) {
          this.userCountry = data.country.toUpperCase();
          localStorage.setItem('userCountry', this.userCountry);
          console.debug('Detected country from API:', this.userCountry);
          return;
        }
      }
    } catch (error) {
      console.debug('API location detection failed:', error);
    }

    // Method 3: Use a free IP geolocation service as fallback
    try {
      const response = await fetch('https://ipapi.co/country_code/', {
        method: 'GET',
        timeout: 5000
      });
      
      if (response.ok) {
        const countryCode = await response.text();
        if (this.isValidCountryCode(countryCode)) {
          this.userCountry = countryCode.toUpperCase();
          localStorage.setItem('userCountry', this.userCountry);
          console.debug('Detected country from IP service:', this.userCountry);
          return;
        }
      }
    } catch (error) {
      console.debug('IP geolocation service failed:', error);
    }

    // Method 4: Try to infer from browser language
    const browserLang = navigator.language || navigator.languages[0];
    if (browserLang) {
      const countryFromLang = this.getCountryFromLanguage(browserLang);
      if (countryFromLang) {
        this.userCountry = countryFromLang;
        console.debug('Inferred country from browser language:', this.userCountry);
        return;
      }
    }

    // Fallback to US
    this.userCountry = 'US';
    console.debug('Using fallback country: US');
  }

  /**
   * Validate country code format
   */
  isValidCountryCode(code) {
    return code && typeof code === 'string' && code.length === 2 && /^[A-Z]{2}$/i.test(code);
  }

  /**
   * Extract country from browser language
   */
  getCountryFromLanguage(language) {
    const langCountryMap = {
      'de': 'DE', 'fr': 'FR', 'es': 'ES', 'it': 'IT', 'pt': 'PT',
      'nl': 'NL', 'pl': 'PL', 'ru': 'RU', 'ja': 'JP', 'ko': 'KR',
      'zh': 'CN', 'ar': 'SA', 'hi': 'IN'
    };

    // Try to extract from full locale (e.g., 'en-GB' -> 'GB')
    if (language.includes('-')) {
      const parts = language.split('-');
      const countryPart = parts[1];
      if (this.isValidCountryCode(countryPart)) {
        return countryPart.toUpperCase();
      }
    }

    // Try language mapping
    const langCode = language.toLowerCase().split('-')[0];
    return langCountryMap[langCode] || null;
  }

  /**
   * Determine the best region for the user
   */
  getBestRegion() {
    if (!this.userCountry) return 'us';
    return this.euCountries.includes(this.userCountry.toUpperCase()) ? 'eu' : 'us';
  }

  /**
   * Get optimized image URL based on user location
   */
  getOptimizedImageUrl(imagePath) {
    // Debug logging
    console.log('[MultiRegion Debug] getOptimizedImageUrl called with:', {
      imagePath,
      isProduction: this.isProduction,
      globalCloudFrontUrl: this.globalCloudFrontUrl,
      userCountry: this.userCountry,
      preferredRegion: this.getBestRegion()
    });

    if (!this.isProduction || !this.globalCloudFrontUrl) {
      // Development mode or no CloudFront - return as-is
      const localUrl = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
      console.log('[MultiRegion Debug] Using local URL:', localUrl);
      return localUrl;
    }

    const preferredRegion = this.getBestRegion();
    
    // Remove leading slash if present
    const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
    
    let optimizedUrl;
    if (preferredRegion === 'eu') {
      // Route EU users through eu/ path to get EU bucket content
      optimizedUrl = `${this.globalCloudFrontUrl}/eu/${cleanPath}`;
    } else {
      // Route other users to default (US) bucket
      optimizedUrl = `${this.globalCloudFrontUrl}/${cleanPath}`;
    }
    
    console.log('[MultiRegion Debug] Using optimized URL:', optimizedUrl);
    return optimizedUrl;
  }

  /**
   * Preload an image with progressive enhancement
   */
  async preloadImage(imagePath, options = {}) {
    const {
      fallbackUrls = [],
      timeout = 10000,
      retries = 2
    } = options;

    const cacheKey = imagePath;
    
    // Return cached promise if already loading
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey);
    }

    // Return cached image if already loaded
    if (this.imageCache.has(cacheKey)) {
      return this.imageCache.get(cacheKey);
    }

    const loadPromise = this._loadImageWithFallbacks(imagePath, fallbackUrls, timeout, retries);
    this.loadingPromises.set(cacheKey, loadPromise);

    try {
      const result = await loadPromise;
      this.imageCache.set(cacheKey, result);
      return result;
    } finally {
      this.loadingPromises.delete(cacheKey);
    }
  }

  /**
   * Load image with fallback URLs and retry logic
   */
  async _loadImageWithFallbacks(imagePath, fallbackUrls, timeout, retries) {
    const optimizedUrl = this.getOptimizedImageUrl(imagePath);
    const urlsToTry = [optimizedUrl, ...fallbackUrls];

    for (let i = 0; i < urlsToTry.length; i++) {
      const url = urlsToTry[i];
      
      for (let retry = 0; retry <= retries; retry++) {
        try {
          const imageData = await this._loadSingleImage(url, timeout);
          
          // Log performance information
          if (i === 0) {
            console.debug(`Image loaded from optimal URL: ${url}`);
          } else {
            console.warn(`Image loaded from fallback URL #${i}: ${url}`);
          }
          
          return {
            url,
            data: imageData,
            isOptimal: i === 0,
            fallbackUsed: i > 0,
            retryCount: retry
          };
        } catch (error) {
          console.debug(`Failed to load ${url} (attempt ${retry + 1}):`, error);
          
          // If this is the last retry for the last URL, throw the error
          if (i === urlsToTry.length - 1 && retry === retries) {
            throw new Error(`Failed to load image after trying ${urlsToTry.length} URLs with ${retries + 1} attempts each`);
          }
        }
      }
    }
  }

  /**
   * Load a single image with timeout
   */
  _loadSingleImage(url, timeout) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const timeoutId = setTimeout(() => {
        reject(new Error(`Image load timeout: ${url}`));
      }, timeout);

      img.onload = () => {
        clearTimeout(timeoutId);
        resolve({
          element: img,
          width: img.naturalWidth,
          height: img.naturalHeight,
          url: url
        });
      };

      img.onerror = () => {
        clearTimeout(timeoutId);
        reject(new Error(`Image load error: ${url}`));
      };

      img.src = url;
    });
  }

  /**
   * Smart image loading for gallery items
   */
  async loadGalleryImages(imageSelector = 'img[data-src]', options = {}) {
    const {
      lazyLoad = true,
      batchSize = 3,
      intersectionThreshold = 0.1
    } = options;

    const images = document.querySelectorAll(imageSelector);
    
    if (lazyLoad && 'IntersectionObserver' in window) {
      this._setupLazyLoading(images, intersectionThreshold, batchSize);
    } else {
      // Load all images immediately if lazy loading is not supported
      await this._loadImageBatch(Array.from(images), batchSize);
    }
  }

  /**
   * Set up intersection observer for lazy loading
   */
  _setupLazyLoading(images, threshold, batchSize) {
    const observer = new IntersectionObserver((entries) => {
      const visibleImages = entries
        .filter(entry => entry.isIntersecting)
        .map(entry => entry.target);

      if (visibleImages.length > 0) {
        this._loadImageBatch(visibleImages, batchSize);
        
        // Stop observing loaded images
        visibleImages.forEach(img => observer.unobserve(img));
      }
    }, {
      threshold,
      rootMargin: '50px'
    });

    images.forEach(img => observer.observe(img));
  }

  /**
   * Load a batch of images
   */
  async _loadImageBatch(images, batchSize) {
    for (let i = 0; i < images.length; i += batchSize) {
      const batch = images.slice(i, i + batchSize);
      const loadPromises = batch.map(img => this._loadAndSetImage(img));
      
      try {
        await Promise.allSettled(loadPromises);
      } catch (error) {
        console.error('Error loading image batch:', error);
      }
    }
  }

  /**
   * Load and set image source
   */
  async _loadAndSetImage(imgElement) {
    try {
      const originalSrc = imgElement.dataset.src;
      if (!originalSrc) return;

      // Skip if image is already loaded (e.g., by profile-loader.js)
      if (imgElement.classList.contains('loaded') || imgElement.src !== imgElement.dataset.src) {
        console.debug('Skipping already loaded image:', originalSrc);
        return;
      }

      // Show loading state
      imgElement.classList.add('loading');

      const result = await this.preloadImage(originalSrc, {
        fallbackUrls: [
          originalSrc, // Original URL
          originalSrc.replace('/eu/', '/'), // Remove EU prefix if present
        ]
      });

      // Set the loaded image
      imgElement.src = result.url;
      imgElement.classList.remove('loading');
      imgElement.classList.add('loaded');

      // Add performance indicators
      if (result.fallbackUsed) {
        imgElement.classList.add('fallback-used');
      }

    } catch (error) {
      console.error('Failed to load image:', imgElement.dataset.src, error);
      imgElement.classList.remove('loading');
      imgElement.classList.add('error');
      
      // Set a placeholder or error image
      imgElement.src = '/images/placeholder.jpg';
    }
  }

  /**
   * Alias for preloadImage to maintain compatibility
   */
  async loadOptimizedImage(imagePath, options = {}) {
    const result = await this.preloadImage(imagePath, options);
    return result.url; // Return just the URL for simpler usage
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    let totalImages = 0;
    let optimalLoads = 0;
    let fallbackLoads = 0;
    let errorLoads = 0;

    this.imageCache.forEach(result => {
      totalImages++;
      if (result.isOptimal) {
        optimalLoads++;
      } else if (result.fallbackUsed) {
        fallbackLoads++;
      } else {
        errorLoads++;
      }
    });

    return {
      totalImages,
      optimalLoads,
      fallbackLoads,
      errorLoads,
      cacheSize: this.imageCache.size,
      userCountry: this.userCountry,
      preferredRegion: this.getBestRegion()
    };
  }
}

// Initialize global instance
window.MultiRegionImageLoader = new MultiRegionImageLoader();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.MultiRegionImageLoader.loadGalleryImages();
  });
} else {
  // DOM is already ready
  window.MultiRegionImageLoader.loadGalleryImages();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MultiRegionImageLoader;
}
