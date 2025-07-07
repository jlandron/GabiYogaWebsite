const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const { 
    getUserFromToken, 
    isAdmin, 
    createSuccessResponse, 
    createErrorResponse 
} = require('../shared/utils');

const s3 = new AWS.S3();

/**
 * Generates a CloudFront URL for an image based on its S3 key
 * 
 * @param {string} s3Key - The S3 key of the image
 * @returns {string} The CloudFront URL
 */
const generateCdnUrl = (s3Key) => {
    // Check if we have a CDN domain configured
    const cdnDomain = process.env.IMAGE_CDN_DOMAIN;
    
    if (!cdnDomain) {
        return null; // No CDN configured, return null
    }
    
    // The S3 key includes 'gallery/' prefix, but our CloudFront is already
    // configured with /gallery as the origin path, so we need to remove the prefix
    const imageKey = s3Key.startsWith('gallery/') 
        ? s3Key.substring(8) // Remove 'gallery/' prefix
        : s3Key;
    
    // Return the CDN URL
    return `https://${cdnDomain}/${imageKey}`;
};

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    try {
        // Handle CORS preflight
        if (event.httpMethod === 'OPTIONS') {
            return createSuccessResponse({}, 200);
        }

        // Check if this is a direct image URL request
        const queryParams = event.queryStringParameters || {};
        if (event.httpMethod === 'GET' && queryParams.key) {
            // GET requests for presigned URLs are public - no authentication required
            try {
                const bucket = process.env.ASSETS_BUCKET;
                const s3Key = queryParams.key;
                
        // Generate the presigned URL
        const presignedUrl = await s3.getSignedUrlPromise('getObject', {
            Bucket: bucket,
            Key: s3Key,
            Expires: 3600 // 1 hour
        });
        
        // Generate CDN URL if available
        const cdnUrl = generateCdnUrl(s3Key);
        
        return createSuccessResponse({ 
            url: presignedUrl, // Keep original URL for backward compatibility
            cdnUrl: cdnUrl, // New CDN URL that doesn't expire
            key: s3Key 
        });
            } catch (error) {
                console.error('Error generating presigned URL:', error);
                return createErrorResponse('Error generating image URL', 500);
            }
        } 
        
        // For upload operations, verify admin role
        const user = await getUserFromToken(event);
        if (!user || !isAdmin(user)) {
            return createErrorResponse('Unauthorized - Admin access required', 403);
        }

        const { filename, contentType } = JSON.parse(event.body);
        if (!filename || !contentType) {
            return createErrorResponse('Filename and content type are required', 400);
        }

        // Generate unique S3 key
        const fileExtension = filename.split('.').pop().toLowerCase();
        const s3Key = `gallery/${uuidv4()}.${fileExtension}`;
        const bucket = process.env.ASSETS_BUCKET;

        // Generate presigned URL for upload
        const presignedUrl = await s3.getSignedUrlPromise('putObject', {
            Bucket: bucket,
            Key: s3Key,
            ContentType: contentType,
            Expires: 3600, // URL expires in 1 hour
            Metadata: {
                originalname: filename
            }
        });

        // Generate the final image URL
        const imageUrl = `https://${bucket}.s3.amazonaws.com/${s3Key}`;
        
        // Generate CDN URL if available
        const cdnUrl = generateCdnUrl(s3Key);

        return createSuccessResponse({
            uploadUrl: presignedUrl,
            imageUrl: cdnUrl || imageUrl, // Prefer CDN URL if available
            s3Key: s3Key,
            bucket: bucket,
            cdnUrl: cdnUrl // Also include the CDN URL separately
        });

    } catch (error) {
        console.error('Error:', error);
        return createErrorResponse('Error generating upload URL', 500);
    }
};
