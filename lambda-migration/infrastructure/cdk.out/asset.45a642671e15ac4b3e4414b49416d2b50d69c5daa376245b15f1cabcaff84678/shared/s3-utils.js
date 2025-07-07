/**
 * S3 utilities for Lambda functions
 */

const AWS = require('aws-sdk');
const s3 = new AWS.S3();

const s3Utils = {
  /**
   * Generate a presigned URL for uploading to S3
   */
  async getUploadUrl(bucket, key, contentType, expiresIn = 3600) {
    try {
      const params = {
        Bucket: bucket,
        Key: key,
        ContentType: contentType,
        Expires: expiresIn
      };

      const uploadUrl = await s3.getSignedUrlPromise('putObject', params);
      return {
        uploadUrl,
        key
      };
    } catch (error) {
      console.error('Error generating upload URL:', error);
      throw error;
    }
  },

  /**
   * Delete an object from S3
   */
  async deleteObject(bucket, key) {
    try {
      await s3.deleteObject({
        Bucket: bucket,
        Key: key
      }).promise();
      return true;
    } catch (error) {
      console.error('Error deleting object from S3:', error);
      throw error;
    }
  },

  /**
   * Generate a presigned URL for downloading from S3
   */
  async getDownloadUrl(bucket, key, expiresIn = 3600) {
    try {
      const params = {
        Bucket: bucket,
        Key: key,
        Expires: expiresIn
      };

      return await s3.getSignedUrlPromise('getObject', params);
    } catch (error) {
      console.error('Error generating download URL:', error);
      throw error;
    }
  },

  /**
   * Check if an object exists in S3
   */
  async objectExists(bucket, key) {
    try {
      await s3.headObject({
        Bucket: bucket,
        Key: key
      }).promise();
      return true;
    } catch (error) {
      if (error.code === 'NotFound') {
        return false;
      }
      throw error;
    }
  },

  /**
   * Generate a unique key for S3 objects
   */
  generateKey(prefix, fileName) {
    const timestamp = new Date().getTime();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = fileName.split('.').pop();
    return `${prefix}/${timestamp}-${randomString}.${extension}`;
  }
};

module.exports = s3Utils;
