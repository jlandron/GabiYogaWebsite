/**
 * Script to add file_path column to gallery_images table
 * 
 * This script adds the file_path column to the gallery_images table
 * for both new and existing installations.
 * 
 * Usage:
 *   node database/add-file-path-column.js
 */

require('dotenv').config();
const { query } = require('./db-config');
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
      logger.debug(`PRAGMA result structure: ${JSON.stringify(result, null, 2).substring(0, 200)}...`);
      
      // Check if column exists using various methods for different SQLite drivers
      if (Array.isArray(result)) {
        columnExists = result.some(column => column && column.name === 'file_path');
      } else if (result && typeof result === 'object') {
        if ('length' in result) {
          for (let i = 0; i < result.length; i++) {
            if (result[i] && result[i].name === 'file_path') {
              columnExists = true;
              break;
            }
          }
        } else if (result.name === 'file_path') {
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
      logger.info('file_path column added successfully');
    } else {
      logger.info('file_path column already exists - no action needed');
    }
    
    return true;
  } catch (error) {
    logger.error('Error adding file_path column:', { error: error.message, stack: error.stack });
    throw error;
  }
};

// Run the script if executed directly
if (require.main === module) {
  addFilePathColumn()
    .then(() => {
      logger.info('Column addition completed successfully');
      process.exit(0);
    })
    .catch(error => {
      logger.error('Error:', { error: error.message, stack: error.stack });
      process.exit(1);
    });
}

module.exports = { addFilePathColumn };
