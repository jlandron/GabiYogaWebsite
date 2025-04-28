#!/usr/bin/env node

/**
 * Setup Script for Image Storage System
 * 
 * This script:
 * 1. Creates necessary directory structure
 * 2. Ensures proper AWS credentials are set up
 * 3. Tests storage access
 * 
 * Usage:
 *   node setup-image-storage.js
 */

require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const imageStorage = require('./utils/image-storage');
const logger = require('./utils/logger');

const NODE_ENV = process.env.NODE_ENV || 'development';
const LOCAL_STORAGE_PATH = process.env.LOCAL_STORAGE_PATH || path.join(process.cwd(), 'uploads', 'images');
const S3_BUCKET = process.env.S3_BUCKET || 'gabi-yoga-uploads';

async function ensureDirectoryStructure() {
  logger.info('Ensuring directory structure exists...');
  
  try {
    // Create uploads directory if it doesn't exist
    await fs.mkdir('./uploads', { recursive: true });
    logger.info('Created uploads directory');
    
    // Create uploads/images directory if it doesn't exist
    await fs.mkdir(LOCAL_STORAGE_PATH, { recursive: true });
    logger.info(`Created ${LOCAL_STORAGE_PATH} directory`);
    
    // Create a .gitkeep file in the uploads/images directory
    await fs.writeFile(path.join(LOCAL_STORAGE_PATH, '.gitkeep'), '');
    logger.info('Created .gitkeep file to maintain directory structure in git');
    
    return true;
  } catch (error) {
    logger.error('Failed to create directory structure:', { error: error.message, stack: error.stack });
    return false;
  }
}

async function testStorageAccess() {
  logger.info(`Testing storage access in ${NODE_ENV} environment...`);
  
  try {
    // Create a test image (1x1 transparent pixel in PNG format)
    const testImageData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAQMAAAAl21bKAAAAA1BMVEX///+nxBvIAAAACklEQVR4nGNiAAAABgADNjd8qAAAAABJRU5ErkJggg==', 'base64');
    const testFilename = 'test-image.png';
    
    // Store the test image
    const { filePath, url } = await imageStorage.storeImage(testImageData, testFilename, 'image/png');
    logger.info(`Test image stored successfully at: ${filePath}`);
    
    // Retrieve the test image
    const retrievedImage = await imageStorage.retrieveImage(filePath);
    logger.info(`Test image retrieved successfully (${retrievedImage.length} bytes)`);
    
    // Delete the test image
    await imageStorage.deleteImage(filePath);
    logger.info(`Test image deleted successfully`);
    
    return true;
  } catch (error) {
    logger.error('Failed to test storage access:', { error: error.message, stack: error.stack });
    return false;
  }
}

async function checkAwsCredentials() {
  if (NODE_ENV === 'production') {
    logger.info('Checking AWS credentials...');
    
    if (!process.env.AWS_REGION) {
      logger.warn('AWS_REGION environment variable not set. Using default region.');
    }
    
    try {
      const aws = require('aws-sdk');
      const sts = new aws.STS();
      
      // Test AWS credentials
      const result = await sts.getCallerIdentity().promise();
      logger.info(`AWS credentials valid. Account: ${result.Account}`);
      
      // Test S3 bucket access
      const s3 = new aws.S3();
      await s3.headBucket({ Bucket: S3_BUCKET }).promise();
      logger.info(`Successfully connected to S3 bucket: ${S3_BUCKET}`);
      
      return true;
    } catch (error) {
      logger.error('AWS credential check failed:', { error: error.message, stack: error.stack });
      logger.info('Make sure AWS credentials are properly configured');
      logger.info('For local development with production storage, you need valid AWS credentials.');
      return false;
    }
  } else {
    logger.info('Skipping AWS credentials check in development environment');
    return true;
  }
}

async function main() {
  logger.info('Starting image storage setup...');
  
  const directorySuccess = await ensureDirectoryStructure();
  if (!directorySuccess) {
    logger.error('Failed to set up directory structure');
    process.exit(1);
  }
  
  const awsSuccess = await checkAwsCredentials();
  if (!awsSuccess && NODE_ENV === 'production') {
    logger.error('Failed to verify AWS credentials - this is critical for production');
    process.exit(1);
  }
  
  const storageSuccess = await testStorageAccess();
  if (!storageSuccess) {
    logger.error('Failed to test storage access');
    process.exit(1);
  }
  
  logger.info('Image storage setup completed successfully');
  logger.info(`
Next steps:
1. Run the migration script to move images from database:
   node migrate-images-cli.js
2. Update your .env file with any necessary configuration:
   - NODE_ENV=${NODE_ENV}
   - S3_BUCKET=${S3_BUCKET}
   - LOCAL_STORAGE_PATH=${LOCAL_STORAGE_PATH}
3. Restart your application to use the new storage system
  `);
}

// Run the setup
main();
