#!/usr/bin/env node

/**
 * CLI Script to migrate gallery images from database to file storage
 * 
 * For development: Images are stored in the local file system
 * For production: Images are stored in S3
 * 
 * Usage:
 *   node migrate-images-cli.js
 */

require('dotenv').config();
const { runMigration } = require('./database/migrate-images');
const logger = require('./utils/logger');

async function main() {
  try {
    logger.info('Starting image migration process');
    await runMigration();
    logger.info('Image migration completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

// Run the migration
main();
