/**
 * Images API
 * Provides endpoints for accessing images with presigned URLs for S3 bucket objects
 */

const express = require('express');
const router = express.Router();
const imageStorage = require('../utils/image-storage');
const logger = require('../utils/logger');

// Cache to store presigned URLs (key: path, value: { url, expiresAt })
const urlCache = new Map();
const CACHE_DURATION = 3600; // 1 hour in seconds
const PRESIGNED_URL_EXPIRY = 3600; // 1 hour in seconds

/**
 * Helper to check if a cached URL is still valid
 */
const isCacheValid = (cacheEntry) => {
  if (!cacheEntry || !cacheEntry.expiresAt) return false;
  return Date.now() < cacheEntry.expiresAt;
};

/**
 * @route GET /api/images/presigned
 * @description Get a presigned URL for an image stored in S3
 * @access Public
 */
router.get('/presigned', async (req, res) => {
  try {
    const { path } = req.query;
    
    if (!path) {
      return res.status(400).json({ 
        success: false, 
        message: 'Image path is required' 
      });
    }

    // Normalize path (remove leading slash if present)
    const normalizedPath = path.startsWith('/') ? path.substring(1) : path;
    
    // Check cache first
    const cacheKey = normalizedPath;
    const cachedUrl = urlCache.get(cacheKey);
    
    if (isCacheValid(cachedUrl)) {
      logger.debug('Using cached presigned URL for:', { path: normalizedPath });
      return res.json({
        success: true,
        presignedUrl: cachedUrl.url
      });
    }

    // Generate new presigned URL if not in cache or expired
    logger.debug('Generating presigned URL for:', { path: normalizedPath });
    const presignedUrl = await imageStorage.getPresignedUrl(normalizedPath, PRESIGNED_URL_EXPIRY);
    
    // Cache the URL
    urlCache.set(cacheKey, {
      url: presignedUrl,
      expiresAt: Date.now() + (CACHE_DURATION * 1000)
    });

    res.json({
      success: true,
      presignedUrl
    });
  } catch (error) {
    logger.error('Error generating presigned URL:', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to generate presigned URL',
      error: error.message
    });
  }
});

module.exports = router;
