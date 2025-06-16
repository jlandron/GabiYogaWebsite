/**
 * Fix for blog_post_images table - adds missing file_path column
 * Run this script with: node utils/fix-blog-images.js
 */

const db = require('../database/db-config');
const logger = require('../utils/logger');

const fixBlogImagesTable = async () => {
  try {
    console.log('Starting fix for blog_post_images table...');

    // Check if column already exists
    let columnExists = false;
    
    try {
      // For SQLite
      const result = await db.query(`PRAGMA table_info(blog_post_images)`);
      columnExists = result.some(column => column.name === 'file_path');
      
      if (columnExists) {
        console.log('file_path column already exists. No changes needed.');
        return;
      }
    } catch (error) {
      console.error('Error checking for file_path column:', error);
    }
    
    // Add the column
    console.log('Adding file_path column to blog_post_images table');
    await db.query(`ALTER TABLE blog_post_images ADD COLUMN file_path TEXT`);
    
    console.log('Successfully added file_path column to blog_post_images table');
    
    // Extract file paths from existing URLs and update records
    console.log('Migrating existing image URLs to file_path values...');
    
    const images = await db.query(`
      SELECT id, url FROM blog_post_images 
      WHERE file_path IS NULL OR file_path = ''
    `);
    
    console.log(`Found ${images.length} images to migrate`);
    
    for (const image of images) {
      try {
        const filePath = extractFilePath(image.url);
        
        if (filePath) {
          await db.query(`
            UPDATE blog_post_images 
            SET file_path = ? 
            WHERE id = ?
          `, [filePath, image.id]);
          
          console.log(`Migrated image ${image.id}, extracted path: ${filePath}`);
        } else {
          console.log(`Could not extract file path for image ${image.id} with URL: ${image.url}`);
        }
      } catch (updateError) {
        console.error(`Error updating file_path for image ${image.id}:`, updateError);
        // Continue with next image
      }
    }
    
    console.log('Migration completed');
  } catch (error) {
    console.error('Error fixing blog_post_images table:', error);
    throw error;
  } finally {
    // Close the database connection
    if (db.close) {
      await db.close();
    }
  }
};

// Function to extract file path from URL (copied from api/blog.js)
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
    const path = require('path');
    const filename = path.basename(url);
    if (filename) {
      return `gallery/${filename}`;
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting file path from URL:', url, error);
    return null;
  }
};

// Run the fix
fixBlogImagesTable()
  .then(() => {
    console.log('Blog images table fix completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error fixing blog images table:', error);
    process.exit(1);
  });
