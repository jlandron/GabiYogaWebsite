'use strict';

/**
 * Utilities for CloudFront asset URLs
 */

// Get the environment stage
const stage = process.env.STAGE || 'dev';

// Set the CloudFront domain based on stage
const CLOUDFRONT_DOMAIN = stage === 'prod'
  ? 'static.gabi.yoga'
  : `static-${stage}.gabi.yoga`;

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
