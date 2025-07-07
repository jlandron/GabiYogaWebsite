/**
 * Utility functions for CloudFront CDN integration
 */

const { logWithContext } = require('./public-utils');

/**
 * Generates a CloudFront URL for an asset based on its S3 key
 * 
 * @param {string} s3Key - The S3 key of the asset
 * @param {string} [prefix='gallery'] - The S3 prefix to remove (default: 'gallery')
 * @param {Object} [context={}] - Optional logging context info
 * @returns {string|null} The CloudFront URL or null if CDN is not configured
 */
function generateCdnUrl(s3Key, context = {}) {
  if (!s3Key) return null;
  
  // Check if we have a CDN domain configured
  const cdnDomain = process.env.IMAGE_CDN_DOMAIN;
  
  if (!cdnDomain) {
    logWithContext('debug', 'No CDN domain configured, falling back to S3 URL', context);
    return null; // No CDN configured, return null
  }
  
  // Clean the S3 key (remove leading slash if present)
  let cleanKey = s3Key.startsWith('/') ? s3Key.substring(1) : s3Key;
  
  // Return the CDN URL
  const url = `https://${cdnDomain}/${cleanKey}`;
  logWithContext('debug', `Generated CDN URL for asset`, { 
    ...context, 
    cdnDomain, 
    originalKey: s3Key, 
    processedKey: cleanKey, 
    cdnUrl: url 
  });
  
  return url;
}

module.exports = {
  generateCdnUrl
};
