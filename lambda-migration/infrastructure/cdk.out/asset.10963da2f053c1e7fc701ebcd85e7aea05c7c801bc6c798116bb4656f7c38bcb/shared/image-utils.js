/**
 * Shared Image Utilities
 * Provides consistent handling of image references across the application
 */

const AWS = require('aws-sdk');
const s3 = new AWS.S3();

/**
 * Generate a presigned URL for an image
 * 
 * @param {string} key - The S3 key of the image
 * @param {number} expiry - URL expiry time in seconds (default: 3600)
 * @returns {string} - The presigned URL
 */
function getImageUrl(key, expiry = 3600) {
    try {
        // Return null for empty keys
        if (!key) return null;
        
        // If the key is already a full URL, return it
        if (key.startsWith('http')) return key;
        
        // Generate a presigned URL for the image
        const url = s3.getSignedUrl('getObject', {
            Bucket: process.env.ASSETS_BUCKET,
            Key: key,
            Expires: expiry
        });
        
        return url;
    } catch (error) {
        console.error('Error generating presigned URL:', error);
        
        // Return a path that the frontend can use (e.g. /dev/assets/key)
        return `/dev/${key}`;
    }
}

module.exports = {
    getImageUrl
};
