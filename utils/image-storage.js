/**
 * Image Storage Utility
 * 
 * Provides abstraction for storing and retrieving images either:
 * - Locally (development environment)
 * - S3 (production environment)
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const aws = require('aws-sdk');
const logger = require('./logger');

// Get environment variables and configuration
const NODE_ENV = process.env.NODE_ENV || 'development';
const S3_BUCKET = process.env.S3_BUCKET || 'gabi-yoga-uploads';
const LOCAL_STORAGE_PATH = process.env.LOCAL_STORAGE_PATH || path.join(process.cwd(), 'uploads', 'images');

// Create S3 client
const s3 = new aws.S3({
  signatureVersion: 'v4',
});

/**
 * Ensures upload directory exists
 */
const ensureUploadDirExists = async () => {
  if (NODE_ENV !== 'production') {
    try {
      await fs.mkdir(LOCAL_STORAGE_PATH, { recursive: true });
    } catch (error) {
      logger.error('Error creating upload directory:', { error: error.message, stack: error.stack });
      throw error;
    }
  }
};

/**
 * Generate a unique filename for an image
 * 
 * @param {string} filename Original filename
 * @returns {string} Unique filename
 */
const generateUniqueFilename = (filename) => {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  const extension = path.extname(filename);
  return `${timestamp}-${randomString}${extension}`;
};

/**
 * Store an image in the appropriate storage system
 * 
 * @param {Buffer} imageData Image data as buffer
 * @param {string} originalFilename Original filename
 * @param {string} mimeType MIME type of the image
 * @returns {Promise<{filePath: string, url: string}>} Path and URL to the stored image
 */
const storeImage = async (imageData, originalFilename, mimeType) => {
  try {
    const filename = generateUniqueFilename(originalFilename || 'image.jpg');

    if (NODE_ENV === 'production') {
      // Store in S3
      const params = {
        Bucket: S3_BUCKET,
        Key: `gallery/${filename}`,
        Body: imageData,
        ContentType: mimeType,
      };

      const uploadResult = await s3.upload(params).promise();
      
      logger.debug('Image uploaded to S3:', { key: params.Key, location: uploadResult.Location });
      
      return {
        filePath: `gallery/${filename}`,
        url: uploadResult.Location,
      };
    } else {
      // Store locally
      await ensureUploadDirExists();
      const localFilePath = path.join(LOCAL_STORAGE_PATH, filename);
      
      await fs.writeFile(localFilePath, imageData);
      
      // For local development, the URL is a relative path
      logger.debug('Image stored locally:', { path: localFilePath });
      
      return {
        filePath: `uploads/images/${filename}`,
        url: `/uploads/images/${filename}`,
      };
    }
  } catch (error) {
    logger.error('Error storing image:', { error: error.message, stack: error.stack });
    throw new Error(`Failed to store image: ${error.message}`);
  }
};

/**
 * Retrieve an image from the appropriate storage system
 * 
 * @param {string} filePath Path to the stored image
 * @returns {Promise<Buffer>} Image data as buffer
 */
const retrieveImage = async (filePath) => {
  try {
    if (NODE_ENV === 'production') {
      // Retrieve from S3
      const params = {
        Bucket: S3_BUCKET,
        Key: filePath,
      };

      const data = await s3.getObject(params).promise();
      return data.Body;
    } else {
      // Retrieve from local storage - remove leading slash if present
      const localPath = filePath.startsWith('/') 
        ? path.join(process.cwd(), filePath) 
        : path.join(process.cwd(), filePath);
      
      return await fs.readFile(localPath);
    }
  } catch (error) {
    logger.error('Error retrieving image:', { error: error.message, stack: error.stack, filePath });
    throw new Error(`Failed to retrieve image: ${error.message}`);
  }
};

/**
 * Delete an image from the appropriate storage system
 * 
 * @param {string} filePath Path to the stored image
 * @returns {Promise<void>}
 */
const deleteImage = async (filePath) => {
  try {
    if (!filePath) {
      logger.warn('No file path provided for image deletion');
      return;
    }
    
    if (NODE_ENV === 'production') {
      // Delete from S3
      const params = {
        Bucket: S3_BUCKET,
        Key: filePath,
      };

      await s3.deleteObject(params).promise();
      logger.debug('Image deleted from S3:', { key: filePath });
    } else {
      // Delete from local storage
      // Handle both absolute and relative paths
      const localPath = filePath.startsWith('/') 
        ? path.join(process.cwd(), filePath) 
        : path.join(process.cwd(), filePath);
      
      await fs.unlink(localPath);
      logger.debug('Image deleted locally:', { path: localPath });
    }
  } catch (error) {
    // Don't throw error if file doesn't exist, just log it
    if (error.code === 'ENOENT' || error.code === 'NoSuchKey') {
      logger.warn('Image file not found during deletion attempt:', { filePath });
      return;
    }
    
    logger.error('Error deleting image:', { error: error.message, stack: error.stack, filePath });
    throw new Error(`Failed to delete image: ${error.message}`);
  }
};

/**
 * Generate a presigned URL for an image in S3
 * 
 * @param {string} filePath Path to the stored image
 * @param {number} expiresIn Expiration time in seconds (default 3600 = 1 hour)
 * @returns {Promise<string>} Presigned URL
 */
const getPresignedUrl = async (filePath, expiresIn = 3600) => {
  try {
    if (NODE_ENV === 'production') {
      // Generate S3 presigned URL
      const params = {
        Bucket: S3_BUCKET,
        Key: filePath,
        Expires: expiresIn,
      };

      return await s3.getSignedUrlPromise('getObject', params);
    } else {
      // For local development, just return the relative path
      return filePath.startsWith('/') ? filePath : `/${filePath}`;
    }
  } catch (error) {
    logger.error('Error generating presigned URL:', { error: error.message, stack: error.stack, filePath });
    throw new Error(`Failed to generate presigned URL: ${error.message}`);
  }
};

module.exports = {
  storeImage,
  retrieveImage,
  deleteImage,
  getPresignedUrl,
  ensureUploadDirExists,
};
