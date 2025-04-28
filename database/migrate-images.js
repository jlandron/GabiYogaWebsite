/**
 * Database Migration Script for Gallery Images
 * 
 * This script:
 * 1. Adds file_path field to gallery_images table
 * 2. Migrates existing images from BLOB storage to file storage
 * 3. Updates records in the database with new file paths
 */

require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { query } = require('./db-config');
const imageStorage = require('../utils/image-storage');
const logger = require('../utils/logger');

/**
 * Add file_path column to gallery_images table
 */
const addFilePathColumn = async () => {
  const NODE_ENV = process.env.NODE_ENV || 'development';
  const DB_TYPE = process.env.DB_TYPE || (NODE_ENV === 'production' ? 'mysql' : 'sqlite');
  
  try {
    // Check if column already exists
    let columnExists = false;
    
    if (DB_TYPE === 'sqlite') {
      // For SQLite
      const result = await query(`PRAGMA table_info(gallery_images)`);
      
      // Debug the result structure
      logger.debug(`PRAGMA result type: ${typeof result}`);
      logger.debug(`PRAGMA result is array: ${Array.isArray(result)}`);
      logger.debug(`PRAGMA result structure: ${JSON.stringify(result, null, 2).substring(0, 200)}...`);
      
      // SQLite will return an array of objects with column info
      // Each column object should have a 'name' property
      if (Array.isArray(result)) {
        columnExists = result.some(column => column && column.name === 'file_path');
        logger.debug(`Checking column exists using array method: ${columnExists}`);
      }
      // But if it's not an array, we need to find another approach
      else if (result && typeof result === 'object') {
        logger.debug('SQLite PRAGMA result is not an array, checking manually');
        
        // If it's an object with numeric keys
        if ('length' in result) {
          for (let i = 0; i < result.length; i++) {
            logger.debug(`Examining column ${i}: ${JSON.stringify(result[i])}`);
            if (result[i] && result[i].name === 'file_path') {
              columnExists = true;
              break;
            }
          }
        }
        // Check if the result itself is a single column object
        else if (result.name === 'file_path') {
          columnExists = true;
        }
      }
    } else {
      // For MySQL
      const [result] = await query(`
        SELECT COUNT(*) as count 
        FROM information_schema.columns 
        WHERE table_schema = DATABASE() 
        AND table_name = 'gallery_images'
        AND column_name = 'file_path'
      `);
      columnExists = result && result.count > 0;
    }
    
    if (!columnExists) {
      logger.info('Adding file_path column to gallery_images table');
      await query(`ALTER TABLE gallery_images ADD COLUMN file_path TEXT`);
      logger.info('Column added successfully');
    } else {
      logger.info('file_path column already exists');
    }
  } catch (error) {
    logger.error('Error adding file_path column:', { error: error.message, stack: error.stack });
    throw error;
  }
};

/**
 * Migrate images from BLOB storage to file storage
 */
const migrateImages = async () => {
  try {
    // Ensure uploads directory exists
    await imageStorage.ensureUploadDirExists();
    
    // Get all images that don't have a file_path set
    const imagesResult = await query(`
      SELECT image_id, image_data, mime_type, size, title, alt_text
      FROM gallery_images 
      WHERE image_data IS NOT NULL AND (file_path IS NULL OR file_path = '')
    `);
    
    // Ensure we have an array to work with
    const images = Array.isArray(imagesResult) ? imagesResult : (imagesResult && typeof imagesResult === 'object' ? [imagesResult] : []);
    
    logger.info(`Found ${images.length} images to migrate`);
    
    // Process each image
    for (const image of images) {
      try {
        if (!image.image_data) {
          logger.warn(`Image ${image.image_id} has no image_data, skipping`);
          continue;
        }
        
        // Determine a filename from title or alt_text, or use default with ID
        let filename = `image-${image.image_id}.jpg`;
        if (image.title) {
          // Convert title to filename-safe string
          filename = `${image.title.toLowerCase().replace(/[^a-z0-9]/gi, '-')}-${image.image_id}.jpg`;
        } else if (image.alt_text) {
          // Use alt_text if no title
          filename = `${image.alt_text.toLowerCase().replace(/[^a-z0-9]/gi, '-')}-${image.image_id}.jpg`;
        }
        
        // Buffer may already be a buffer or need conversion depending on DB driver
        const imageBuffer = Buffer.isBuffer(image.image_data) 
          ? image.image_data 
          : Buffer.from(image.image_data);
        
        // Store image using our utility
        const { filePath } = await imageStorage.storeImage(
          imageBuffer, 
          filename,
          image.mime_type || 'image/jpeg'
        );
        
        // Update database record with file path
        await query(`
          UPDATE gallery_images 
          SET file_path = ?, 
              image_data = NULL -- Remove BLOB data after successful migration
          WHERE image_id = ?
        `, [filePath, image.image_id]);
        
        logger.info(`Successfully migrated image ${image.image_id} to ${filePath}`);
      } catch (error) {
        logger.error(`Error migrating image ${image.image_id}:`, { 
          error: error.message, 
          stack: error.stack,
          imageId: image.image_id 
        });
        // Continue with next image rather than stopping the whole process
      }
    }
    
    logger.info('Image migration completed');
  } catch (error) {
    logger.error('Error in image migration:', { error: error.message, stack: error.stack });
    throw error;
  }
};

/**
 * Main migration function
 */
const runMigration = async () => {
  try {
    logger.info('Starting gallery images migration...');
    
    // Step 1: Add file_path column to the table
    await addFilePathColumn();
    
    // Step 2: Migrate existing images
    await migrateImages();
    
    logger.info('Migration completed successfully');
  } catch (error) {
    logger.error('Migration failed:', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

// Run the migration if executed directly
if (require.main === module) {
  runMigration().then(() => {
    logger.info('Migration script execution completed');
    process.exit(0);
  }).catch(error => {
    logger.error('Unhandled error in migration script:', { error: error.message, stack: error.stack });
    process.exit(1);
  });
}

module.exports = { runMigration };
