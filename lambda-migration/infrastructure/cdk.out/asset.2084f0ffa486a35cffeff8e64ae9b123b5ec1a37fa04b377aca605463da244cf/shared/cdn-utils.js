'use strict';

/**
 * Utilities for CloudFront asset URLs
 */

// Get the environment stage
const stage = process.env.STAGE || 'dev';

// Set the CloudFront domain based on environment
// Production and development will have separate custom domains:
// - static.gabi.yoga (production)
// - static-dev.gabi.yoga (development)
// The STATIC_DOMAIN is set during deployment to avoid circular dependencies
const CLOUDFRONT_DOMAIN = process.env.STATIC_DOMAIN || (
  stage === 'prod'
    ? 'static.gabi.yoga'           // Production custom domain
    : stage === 'dev'
      ? 'static-dev.gabi.yoga'     // Development custom domain
      : 'd4zemfu4barbq.cloudfront.net' // Default fallback (CloudFront default domain)
);

// The actual CloudFront URL structure used for serving assets
const CLOUDFRONT_URL = `https://${CLOUDFRONT_DOMAIN}`;

console.log(`Using CloudFront domain: ${CLOUDFRONT_DOMAIN}`);

// Map file extensions to content types for proper serving
const CONTENT_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

/**
 * Convert a local asset path to a CloudFront URL
 * 
 * @param {string} localPath - The local path to the asset
 * @param {boolean} [useHttps=true] - Whether to use HTTPS (defaults to true)
 * @returns {string} The CloudFront URL for the asset
 */
function getAssetUrl(localPath, useHttps = true) {
  // Remove leading slash if present
  const cleanPath = localPath.replace(/^\//, '');
  
  // Remove 'static/' prefix if present
  const finalPath = cleanPath.replace(/^static\//, '');
  
  // Construct the CloudFront URL
  const protocol = useHttps ? 'https' : 'http';
  return `${protocol}://${CLOUDFRONT_DOMAIN}/${finalPath}`;
}

/**
 * Check if an asset is available in CloudFront
 * This helps with determining if we should try to fetch from CloudFront
 * 
 * @param {string} localPath - The local path to the asset
 * @returns {boolean} True if the asset should be available in CloudFront
 */
function isAssetInCloudFront(localPath) {
  // Static assets that should be in CloudFront
  const cloudFrontExtensions = [
    '.css', '.js', '.png', '.jpg', '.jpeg', '.gif', 
    '.svg', '.ico', '.webp', '.woff', '.woff2', 
    '.ttf', '.eot', '.pdf', '.mp4', '.mp3'
  ];
  
  const ext = localPath.substring(localPath.lastIndexOf('.'));
  return cloudFrontExtensions.includes(ext);
}

/**
 * Convert HTML content to use CloudFront URLs for assets
 * 
 * @param {string} htmlContent - The HTML content to transform
 * @returns {string} HTML with assets pointing to CloudFront
 */
function transformHtmlToUseCdn(htmlContent) {
  // Replace CSS, JS, and image references
  return htmlContent
    // Replace stylesheet references
    .replace(/(href=["'])\/static\/(.*?["'])/g, `$1https://${CLOUDFRONT_DOMAIN}/$2`)
    
    // Replace script sources
    .replace(/(src=["'])\/static\/(.*?["'])/g, `$1https://${CLOUDFRONT_DOMAIN}/$2`)
    
    // Replace image sources
    .replace(/(src=["'])\/images\/(.*?["'])/g, `$1https://${CLOUDFRONT_DOMAIN}/images/$2`)
    
    // Replace favicons
    .replace(/(href=["'])\/images\/favicon\/(.*?["'])/g, `$1https://${CLOUDFRONT_DOMAIN}/images/favicon/$2`);
}

module.exports = {
  CLOUDFRONT_DOMAIN,
  CONTENT_TYPES,
  getAssetUrl,
  transformHtmlToUseCdn
};
