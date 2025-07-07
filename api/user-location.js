/**
 * User Location API
 * 
 * Detects user's country based on CloudFlare headers, IP geolocation,
 * and other available methods for optimal image serving.
 */

const logger = require('../utils/logger');

/**
 * Get user's country code from various sources
 */
const getUserLocation = (req) => {
  // Method 1: CloudFlare headers (most reliable if using CloudFlare)
  if (req.headers['cf-ipcountry']) {
    return req.headers['cf-ipcountry'].toUpperCase();
  }

  // Method 2: AWS CloudFront headers
  if (req.headers['cloudfront-viewer-country']) {
    return req.headers['cloudfront-viewer-country'].toUpperCase();
  }

  // Method 3: Standard geographic headers
  if (req.headers['x-country-code']) {
    return req.headers['x-country-code'].toUpperCase();
  }

  // Method 4: Parse from x-forwarded-for with IP geolocation services
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const clientIp = forwardedFor.split(',')[0].trim();
    // Note: For production, you might want to integrate with a paid IP geolocation service
    logger.debug('Client IP detected:', { ip: clientIp });
  }

  // Method 5: Parse from Accept-Language header as fallback
  const acceptLanguage = req.headers['accept-language'];
  if (acceptLanguage) {
    const languages = acceptLanguage.split(',');
    for (const lang of languages) {
      const langCode = lang.trim().split(';')[0];
      if (langCode.includes('-')) {
        const country = langCode.split('-')[1];
        if (country && country.length === 2) {
          logger.debug('Country inferred from Accept-Language:', { country: country.toUpperCase() });
          return country.toUpperCase();
        }
      }
    }
  }

  return null;
};

/**
 * Validate country code format
 */
const isValidCountryCode = (code) => {
  return code && typeof code === 'string' && code.length === 2 && /^[A-Z]{2}$/i.test(code);
};

/**
 * Get user location endpoint
 */
const handleGetUserLocation = async (req, res) => {
  try {
    const country = getUserLocation(req);
    const isValid = isValidCountryCode(country);
    
    // Log detection method for debugging
    const detectionMethod = req.headers['cf-ipcountry'] ? 'CloudFlare' :
                           req.headers['cloudfront-viewer-country'] ? 'CloudFront' :
                           req.headers['x-country-code'] ? 'X-Country-Code' :
                           req.headers['accept-language'] ? 'Accept-Language' : 'Unknown';

    logger.debug('User location detection:', {
      country,
      isValid,
      detectionMethod,
      userAgent: req.headers['user-agent'],
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    });

    if (isValid) {
      res.json({
        success: true,
        country: country.toUpperCase(),
        detectionMethod,
        timestamp: new Date().toISOString()
      });
    } else {
      res.json({
        success: false,
        country: null,
        detectionMethod,
        message: 'Could not detect user country',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    logger.error('Error detecting user location:', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get region recommendation based on country
 */
const handleGetRegionRecommendation = async (req, res) => {
  try {
    const { country } = req.query;
    const detectedCountry = country || getUserLocation(req);
    
    if (!detectedCountry || !isValidCountryCode(detectedCountry)) {
      return res.json({
        success: false,
        message: 'No valid country code provided or detected',
        recommendedRegion: 'us' // Default fallback
      });
    }

    // EU country codes
    const euCountries = [
      'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
      'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
      'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'GB', 'IS', 'NO', 'CH'
    ];

    const recommendedRegion = euCountries.includes(detectedCountry.toUpperCase()) ? 'eu' : 'us';

    res.json({
      success: true,
      country: detectedCountry.toUpperCase(),
      recommendedRegion,
      isEuCountry: recommendedRegion === 'eu',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting region recommendation:', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      recommendedRegion: 'us' // Safe fallback
    });
  }
};

module.exports = {
  handleGetUserLocation,
  handleGetRegionRecommendation,
  getUserLocation,
  isValidCountryCode
};
