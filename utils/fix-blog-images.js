/**
 * Fix Blog Images Utility
 * 
 * This script updates blog post images to use file paths for URL generation
 * instead of storing presigned URLs directly in the database.
 * 
 * Usage: node utils/fix-blog-images.js
 */

const db = require('../database/db-config');
const imageStorage = require('./image-storage');
const logger = require('./logger');

// Function to fix blog images by ensuring all images have file_path values
async function fixBlogImages() {
  try {
    logger.info('Starting blog image fix utility...');
    
    // First, ensure the file_path column exists in the blog_post_images table
    await ensureFilePathColumnExists();
    
    // 1. Count total blog images
    const countResult = await db.query('SELECT COUNT(*) as total FROM blog_post_images');
    const totalImages = countResult[0].total;
    
    logger.info(`Found ${totalImages} blog images to process`);
    
    // 2. Get all images from the database
    const images = await db.query(`
      SELECT id, post_id, url, file_path, alt, caption 
      FROM blog_post_images
    `);
    
    let updatedCount = 0;
    let errorCount = 0;
    
    // 3. Process each image
    for (const image of images) {
      try {
        if (!image.file_path) {
          // Extract file path from URL if missing
          const filePath = extractFilePath(image.url);
          
          if (filePath) {
            logger.info(`Updating image ${image.id} with file path: ${filePath}`);
            
            // Update the database with the file path
            await db.query(`
              UPDATE blog_post_images 
              SET file_path = ? 
              WHERE id = ?
            `, [filePath, image.id]);
            
            updatedCount++;
          } else {
            logger.warn(`Could not extract file path for image ${image.id} with URL: ${image.url}`);
            errorCount++;
          }
        } else {
          // Validate that the file_path works by attempting to generate a presigned URL
          try {
            const presignedUrl = await imageStorage.getPresignedUrl(image.file_path);
            logger.debug(`Successfully generated presigned URL for image ${image.id}: ${presignedUrl.substring(0, 100)}...`);
          } catch (presignError) {
            logger.warn(`Error generating presigned URL for image ${image.id} with path ${image.file_path}:`, presignError);
            errorCount++;
          }
        }
      } catch (imageError) {
        logger.error(`Error processing image ${image.id}:`, imageError);
        errorCount++;
      }
    }
    
    logger.info(`Blog image fix completed. Updated: ${updatedCount}, Errors: ${errorCount}, Total: ${totalImages}`);
    
    // 4. Verify results
    const verifyResult = await db.query(`
      SELECT COUNT(*) as count FROM blog_post_images
      WHERE file_path IS NULL OR file_path = ''
    `);
    
    const remainingNullPaths = verifyResult[0].count;
    if (remainingNullPaths > 0) {
      logger.warn(`There are still ${remainingNullPaths} images without file paths`);
    } else {
      logger.info('All images now have file paths assigned');
    }
    
    return {
      total: totalImages,
      updated: updatedCount,
      errors: errorCount,
      remaining: remainingNullPaths
    };
  } catch (error) {
    logger.error('Error fixing blog images:', error);
    throw error;
  }
}

/**
 * Ensure the file_path column exists in the blog_post_images table
 */
async function ensureFilePathColumnExists() {
  try {
    logger.info('Checking if file_path column exists in blog_post_images table...');
    
    // Rather than checking if the column exists, which varies between SQLite versions,
    // we'll just try to add it and handle any errors if it already exists
    try {
      await db.query(`ALTER TABLE blog_post_images ADD COLUMN file_path TEXT`);
      logger.info('Successfully added file_path column to blog_post_images table');
    } catch (error) {
      if (error.message && error.message.includes('duplicate column name')) {
        logger.info('Column file_path already exists in blog_post_images table');
      } else {
        throw error;
      }
    }
  } catch (error) {
    logger.error('Error ensuring file_path column exists:', error);
    throw error;
  }
}

// Function to extract file path from URL
function extractFilePath(url) {
  try {
    if (!url) return null;
    
    // Handle S3 URLs
    if (url.includes('.s3.amazonaws.com/')) {
      // Extract the path after the bucket name
      const pathMatch = url.match(/\.s3\.amazonaws\.com\/(.+)$/);
      if (pathMatch && pathMatch[1]) {
        return decodeURIComponent(pathMatch[1]);
      }
    }
    
    // Handle CloudFront URLs
    if (url.includes('.cloudfront.net/')) {
      const pathMatch = url.match(/\.cloudfront\.net\/(.+)$/);
      if (pathMatch && pathMatch[1]) {
        return decodeURIComponent(pathMatch[1]);
      }
    }
    
    // Handle local URLs (relative paths)
    if (url.startsWith('/uploads/')) {
      return url.substring(1); // Remove leading slash
    }
    
    // Last resort - use the URL's filename as a path in gallery directory
    const filename = require('path').basename(url);
    if (filename) {
      return `gallery/${filename}`;
    }
    
    return null;
  } catch (error) {
    logger.error('Error extracting file path from URL:', { url, error: error.message });
    return null;
  }
}

// Run the script if executed directly
if (require.main === module) {
  fixBlogImages()
    .then(result => {
      logger.info('Blog image fix utility finished successfully', result);
      process.exit(0);
    })
    .catch(error => {
      logger.error('Blog image fix utility failed:', error);
      process.exit(1);
    });
} else {
  // Export for use as a module
  module.exports = fixBlogImages;
}
