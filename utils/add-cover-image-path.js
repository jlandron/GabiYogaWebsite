/**
 * Add cover_image_path column to blog_posts table
 * This utility ensures the column exists and migrates existing data
 */

const { query } = require('../database/db-config');
const logger = require('./logger');
const path = require('path');

// Get the DB_TYPE from process.env or based on NODE_ENV
const NODE_ENV = process.env.NODE_ENV || 'development';
const DEFAULT_DB_TYPE = NODE_ENV === 'production' ? 'mysql' : 'sqlite';
const DB_TYPE = process.env.DB_TYPE || DEFAULT_DB_TYPE;

console.log(`Using database type: ${DB_TYPE} (${NODE_ENV} environment)`);

// Function to extract file path from URL (same as in fix-blog-images.js)
const extractFilePath = (url) => {
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
    if (url.includes('/')) {
      const filename = url.split('/').pop();
      if (filename) {
        return `gallery/${filename}`;
      }
    }
    
    return null;
  } catch (error) {
    logger.error('Error extracting file path from URL:', { url, error: error.message });
    return null;
  }
};

// Ensure the cover_image_path column exists in the blog_posts table
const ensureCoverImagePathColumn = async () => {
  try {
    // Check if column already exists
    let columnExists = false;
    
    if (DB_TYPE === 'sqlite') {
      // For SQLite
      const result = await query(`PRAGMA table_info(blog_posts)`);
      console.log('SQLite table_info result:', JSON.stringify(result, null, 2));
      
      // Check structure and find column
      if (Array.isArray(result)) {
        // Check first item for structure
        if (result.length > 0) {
          console.log('First column structure:', JSON.stringify(result[0], null, 2));
          // Common SQLite column name properties
          const possibleNameProps = ['name', 'Name', 'column_name', 'COLUMN_NAME'];
          for (const prop of possibleNameProps) {
            if (result[0][prop]) {
              console.log(`Using '${prop}' as the column name property`);
              columnExists = result.some(column => column[prop] === 'cover_image_path');
              break;
            }
          }
        }
      }
    } else {
      // For MySQL
      try {
        const result = await query(`
          SELECT COUNT(*) as count 
          FROM information_schema.columns 
          WHERE table_schema = DATABASE() 
          AND table_name = 'blog_posts'
          AND column_name = 'cover_image_path'
        `);
        
        columnExists = result && result[0] && result[0].count > 0;
      } catch (error) {
        logger.warn('Error checking for cover_image_path column:', { error: error.message });
      }
    }
    
    if (!columnExists) {
      logger.info('Adding cover_image_path column to blog_posts table');
      
      if (DB_TYPE === 'sqlite') {
        await query(`ALTER TABLE blog_posts ADD COLUMN cover_image_path TEXT`);
      } else {
        await query(`ALTER TABLE blog_posts ADD COLUMN cover_image_path TEXT`);
      }
      
      logger.info('cover_image_path column added successfully');
      
      // Extract file paths from existing URLs and update records
      await migrateCoverImageUrls();
    } else {
      logger.info('cover_image_path column already exists in blog_posts table');
    }
    
    return true;
  } catch (error) {
    logger.error('Error ensuring cover_image_path column exists:', { error: error.message, stack: error.stack });
    // Don't throw - let the app continue even if this fails
    return false;
  }
};

// Migrate existing cover image URLs to have file_path values
const migrateCoverImageUrls = async () => {
  try {
    logger.info('Starting migration of existing cover image URLs to file_path values...');
    
    // Get all cover images without file_path
    const posts = await query(`
      SELECT id, cover_image_url 
      FROM blog_posts 
      WHERE cover_image_url IS NOT NULL AND cover_image_url != ''
      AND (cover_image_path IS NULL OR cover_image_path = '')
    `);
    
    if (!posts || posts.length === 0) {
      logger.info('No cover images need migration');
      return;
    }
    
    logger.info(`Found ${posts.length} cover images to migrate`);
    
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const post of posts) {
      try {
        const filePath = extractFilePath(post.cover_image_url);
        
        if (filePath) {
          await query(`
            UPDATE blog_posts 
            SET cover_image_path = ? 
            WHERE id = ?
          `, [filePath, post.id]);
          
          logger.debug(`Migrated cover image for post ${post.id}, extracted path: ${filePath}`);
          updatedCount++;
        } else {
          logger.warn(`Could not extract file path for cover image of post ${post.id} with URL: ${post.cover_image_url}`);
          errorCount++;
        }
      } catch (updateError) {
        logger.error(`Error updating file_path for cover image of post ${post.id}:`, { error: updateError.message });
        errorCount++;
      }
    }
    
    logger.info('Cover image URL migration completed', { total: posts.length, updated: updatedCount, errors: errorCount });
  } catch (error) {
    logger.error('Error migrating existing cover image URLs:', { error: error.message, stack: error.stack });
  }
};

// Run the migration
const run = async () => {
  try {
    await ensureCoverImagePathColumn();
    console.log('Cover image path column migration completed.');
    process.exit(0);
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
};

run();
