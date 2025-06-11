/**
 * Multi-Region Image Storage Utility
 * 
 * Provides intelligent image storage and retrieval across multiple AWS regions
 * for optimal performance based on user geolocation.
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const aws = require('aws-sdk');
const logger = require('./logger');

// Get environment variables and configuration
const NODE_ENV = process.env.NODE_ENV || 'development';
const PRIMARY_S3_BUCKET = process.env.S3_BUCKET || 'gabi-yoga-uploads';
const SECONDARY_S3_BUCKET = process.env.S3_BUCKET_EU || 'gabi-yoga-uploads-eu';
const GLOBAL_CLOUDFRONT_URL = process.env.GLOBAL_CLOUDFRONT_URL;
const LOCAL_STORAGE_PATH = process.env.LOCAL_STORAGE_PATH || path.join(process.cwd(), 'uploads', 'images');

// AWS regions configuration
const REGIONS = {
  PRIMARY: 'us-west-2',
  SECONDARY: 'eu-west-1'
};

// Create S3 clients for different regions
const s3Primary = new aws.S3({
  region: REGIONS.PRIMARY,
  signatureVersion: 'v4',
});

const s3Secondary = new aws.S3({
  region: REGIONS.SECONDARY,
  signatureVersion: 'v4',
});

// EU country codes for intelligent routing
const EU_COUNTRIES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'GB', 'IS', 'NO', 'CH'
];

/**
 * Determine the best region based on user's country code
 * @param {string} countryCode - ISO country code (e.g., 'US', 'DE', 'FR')
 * @returns {string} - 'eu' for EU countries, 'us' for others
 */
const getBestRegion = (countryCode) => {
  if (!countryCode) return 'us'; // Default to US
  return EU_COUNTRIES.includes(countryCode.toUpperCase()) ? 'eu' : 'us';
};

/**
 * Get the appropriate S3 client based on region
 * @param {string} region - 'us' or 'eu'
 * @returns {aws.S3} - S3 client instance
 */
const getS3Client = (region) => {
  return region === 'eu' ? s3Secondary : s3Primary;
};

/**
 * Get the appropriate bucket name based on region
 * @param {string} region - 'us' or 'eu'
 * @returns {string} - Bucket name
 */
const getBucketName = (region) => {
  return region === 'eu' ? SECONDARY_S3_BUCKET : PRIMARY_S3_BUCKET;
};

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
 * Store an image in the appropriate storage system with multi-region support
 * 
 * @param {Buffer} imageData Image data as buffer
 * @param {string} originalFilename Original filename
 * @param {string} mimeType MIME type of the image
 * @param {string} userCountry Optional user country code for region selection
 * @returns {Promise<{filePath: string, url: string, region: string}>} Path, URL, and region
 */
const storeImage = async (imageData, originalFilename, mimeType, userCountry = null) => {
  try {
    const filename = generateUniqueFilename(originalFilename || 'image.jpg');

    if (NODE_ENV === 'production') {
      // Determine the best region for this user
      const preferredRegion = getBestRegion(userCountry);
      const s3Client = getS3Client(preferredRegion);
      const bucketName = getBucketName(preferredRegion);
      
      // Store in the primary bucket (us-west-2) - replication will handle EU
      // We always store in primary bucket, and cross-region replication copies to EU
      const params = {
        Bucket: PRIMARY_S3_BUCKET,
        Key: `gallery/${filename}`,
        Body: imageData,
        ContentType: mimeType,
        Metadata: {
          'original-filename': originalFilename || 'image.jpg',
          'upload-region': preferredRegion,
          'user-country': userCountry || 'unknown'
        }
      };

      const uploadResult = await s3Primary.upload(params).promise();
      
      logger.debug('Image uploaded to S3:', { 
        key: params.Key, 
        location: uploadResult.Location,
        preferredRegion,
        userCountry 
      });
      
      return {
        filePath: `gallery/${filename}`,
        url: uploadResult.Location,
        region: preferredRegion,
        globalUrl: GLOBAL_CLOUDFRONT_URL ? `${GLOBAL_CLOUDFRONT_URL}/gallery/${filename}` : uploadResult.Location
      };
    } else {
      // Store locally for development
      await ensureUploadDirExists();
      const localFilePath = path.join(LOCAL_STORAGE_PATH, filename);
      
      await fs.writeFile(localFilePath, imageData);
      
      logger.debug('Image stored locally:', { path: localFilePath });
      
      return {
        filePath: `uploads/images/${filename}`,
        url: `/uploads/images/${filename}`,
        region: 'local',
        globalUrl: `/uploads/images/${filename}`
      };
    }
  } catch (error) {
    logger.error('Error storing image:', { error: error.message, stack: error.stack });
    throw new Error(`Failed to store image: ${error.message}`);
  }
};

/**
 * Get the optimal image URL based on user's location
 * 
 * @param {string} filePath Path to the stored image
 * @param {string} userCountry User's country code
 * @returns {string} Optimized image URL
 */
const getOptimizedImageUrl = (filePath, userCountry = null) => {
  if (NODE_ENV !== 'production') {
    return filePath.startsWith('/') ? filePath : `/${filePath}`;
  }

  if (!GLOBAL_CLOUDFRONT_URL) {
    // Fallback to direct S3 URL
    return `https://${PRIMARY_S3_BUCKET}.s3.${REGIONS.PRIMARY}.amazonaws.com/${filePath}`;
  }

  const preferredRegion = getBestRegion(userCountry);
  
  // Use CloudFront with regional path optimization
  if (preferredRegion === 'eu') {
    // For EU users, use the eu/ path prefix to route to EU bucket
    return `${GLOBAL_CLOUDFRONT_URL}/eu/${filePath}`;
  } else {
    // For other users, use default path (US bucket)
    return `${GLOBAL_CLOUDFRONT_URL}/${filePath}`;
  }
};

/**
 * Retrieve an image from the appropriate storage system
 * 
 * @param {string} filePath Path to the stored image
 * @param {string} preferredRegion Optional preferred region ('us' or 'eu')
 * @returns {Promise<Buffer>} Image data as buffer
 */
const retrieveImage = async (filePath, preferredRegion = 'us') => {
  try {
    if (NODE_ENV === 'production') {
      const s3Client = getS3Client(preferredRegion);
      const bucketName = getBucketName(preferredRegion);
      
      const params = {
        Bucket: bucketName,
        Key: filePath,
      };

      try {
        const data = await s3Client.getObject(params).promise();
        return data.Body;
      } catch (error) {
        if (error.code === 'NoSuchKey' && preferredRegion === 'eu') {
          // If image not found in EU bucket, try US bucket (fallback)
          logger.warn('Image not found in EU bucket, trying US bucket:', { filePath });
          return await retrieveImage(filePath, 'us');
        }
        throw error;
      }
    } else {
      // Retrieve from local storage
      const localPath = filePath.startsWith('/') 
        ? path.join(process.cwd(), filePath) 
        : path.join(process.cwd(), filePath);
      
      return await fs.readFile(localPath);
    }
  } catch (error) {
    logger.error('Error retrieving image:', { error: error.message, stack: error.stack, filePath, preferredRegion });
    throw new Error(`Failed to retrieve image: ${error.message}`);
  }
};

/**
 * Delete an image from all storage systems
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
      // Delete from both US and EU buckets
      const deletePromises = [
        s3Primary.deleteObject({ Bucket: PRIMARY_S3_BUCKET, Key: filePath }).promise(),
        s3Secondary.deleteObject({ Bucket: SECONDARY_S3_BUCKET, Key: filePath }).promise()
      ];

      await Promise.allSettled(deletePromises);
      logger.debug('Image deleted from both regions:', { key: filePath });
    } else {
      // Delete from local storage
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
 * Generate a presigned URL for an image with regional optimization
 * 
 * @param {string} filePath Path to the stored image
 * @param {number} expiresIn Expiration time in seconds (default 3600 = 1 hour)
 * @param {string} userCountry User's country code for region optimization
 * @returns {Promise<string>} Presigned URL
 */
const getPresignedUrl = async (filePath, expiresIn = 3600, userCountry = null) => {
  try {
    if (NODE_ENV === 'production') {
      const preferredRegion = getBestRegion(userCountry);
      const s3Client = getS3Client(preferredRegion);
      const bucketName = getBucketName(preferredRegion);
      
      const params = {
        Bucket: bucketName,
        Key: filePath,
        Expires: expiresIn,
      };

      try {
        return await s3Client.getSignedUrlPromise('getObject', params);
      } catch (error) {
        if (preferredRegion === 'eu') {
          // Fallback to US bucket if EU fails
          logger.warn('EU presigned URL failed, falling back to US:', { filePath });
          const usParams = {
            Bucket: PRIMARY_S3_BUCKET,
            Key: filePath,
            Expires: expiresIn,
          };
          return await s3Primary.getSignedUrlPromise('getObject', usParams);
        }
        throw error;
      }
    } else {
      // For local development, just return the relative path
      return filePath.startsWith('/') ? filePath : `/${filePath}`;
    }
  } catch (error) {
    logger.error('Error generating presigned URL:', { error: error.message, stack: error.stack, filePath, userCountry });
    throw new Error(`Failed to generate presigned URL: ${error.message}`);
  }
};

/**
 * Get image metadata including optimal URLs for different regions
 * 
 * @param {string} filePath Path to the stored image
 * @returns {Promise<{usUrl: string, euUrl: string, globalUrl: string}>}
 */
const getImageMetadata = async (filePath) => {
  if (NODE_ENV !== 'production') {
    const localUrl = filePath.startsWith('/') ? filePath : `/${filePath}`;
    return {
      usUrl: localUrl,
      euUrl: localUrl,
      globalUrl: localUrl,
      local: true
    };
  }

  const usUrl = `https://${PRIMARY_S3_BUCKET}.s3.${REGIONS.PRIMARY}.amazonaws.com/${filePath}`;
  const euUrl = `https://${SECONDARY_S3_BUCKET}.s3.${REGIONS.SECONDARY}.amazonaws.com/${filePath}`;
  const globalUrl = GLOBAL_CLOUDFRONT_URL ? `${GLOBAL_CLOUDFRONT_URL}/${filePath}` : usUrl;

  return {
    usUrl,
    euUrl,
    globalUrl,
    local: false
  };
};

module.exports = {
  storeImage,
  retrieveImage,
  deleteImage,
  getPresignedUrl,
  getOptimizedImageUrl,
  getImageMetadata,
  getBestRegion,
  ensureUploadDirExists,
  EU_COUNTRIES,
  REGIONS
};
