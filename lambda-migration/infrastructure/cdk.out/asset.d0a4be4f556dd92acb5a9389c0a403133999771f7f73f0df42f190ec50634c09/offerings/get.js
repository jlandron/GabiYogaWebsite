/**
 * GET /offerings API endpoint
 * 
 * Public endpoint that:
 * - Lists all active offerings when no ID is provided
 * - Returns a specific offering when ID is provided
 */

const AWS = require('aws-sdk');
const { createSuccessResponse, createErrorResponse, dynamoUtils, logWithContext } = require('../shared/public-utils');

// Initialize DynamoDB client
const dynamoDB = new AWS.DynamoDB.DocumentClient();

// Initialize S3 client for presigned URLs
const s3 = new AWS.S3();

/**
 * Lambda handler
 */
exports.handler = async (event) => {
  try {
    logWithContext('info', 'GET offerings request', { 
      requestId: event.requestContext?.requestId,
      path: event.path,
      queryParams: event.queryStringParameters
    });

    // Check if an ID was provided
    const offerId = event.pathParameters?.id;
    
    if (offerId) {
      // Get a specific offering
      return await getOffering(offerId);
    } else {
      // List all active offerings
      return await listOfferings(event.queryStringParameters || {});
    }
  } catch (error) {
    logWithContext('error', 'Error handling GET offerings', { 
      error: error.message, 
      stack: error.stack,
      requestId: event.requestContext?.requestId
    });
    
    return createErrorResponse('Failed to retrieve offerings', 500);
  }
};

/**
 * Get specific offering by ID
 */
async function getOffering(id) {
  try {
    const offering = await dynamoUtils.getItem(process.env.OFFERINGS_TABLE, { id });
    
    if (!offering) {
      return createErrorResponse('Offering not found', 404);
    }
    
    // Process image URLs if present
    await processImageUrls([offering]);
    
    return createSuccessResponse({ offering });
  } catch (error) {
    logWithContext('error', `Error getting offering with ID ${id}`, { error: error.message });
    throw error;
  }
}

/**
 * List offerings with optional filters
 */
async function listOfferings(queryParams = {}) {
  try {
    const includeAll = queryParams.includeAll === 'true';
    const type = queryParams.type || null;
    
    // Default to only showing active offerings for public API unless includeAll is true
    const status = includeAll ? null : (queryParams.status || 'Active');
    
    let offerings = [];
    
    // If type filter is provided, use the OfferingTypeIndex
    if (type) {
      // Use the OfferingTypeIndex GSI
      const params = {
        TableName: process.env.OFFERINGS_TABLE,
        IndexName: 'OfferingTypeIndex',
        KeyConditionExpression: '#type = :type',
        ExpressionAttributeValues: {
          ':type': type
        },
        ExpressionAttributeNames: {
          '#type': 'type'
        }
      };
      
      // Add status filter if not including all statuses
      if (status) {
        params.FilterExpression = '#status = :status';
        params.ExpressionAttributeValues[':status'] = status;
        params.ExpressionAttributeNames['#status'] = 'status';
      }
      
      const result = await dynamoDB.query(params).promise();
      offerings = result.Items || [];
    } else if (status) {
      // Use the OfferingStatusIndex GSI directly with a query when filtering by status
      const params = {
        TableName: process.env.OFFERINGS_TABLE,
        IndexName: 'OfferingStatusIndex',
        KeyConditionExpression: '#status = :status',
        ExpressionAttributeValues: {
          ':status': status
        },
        ExpressionAttributeNames: {
          '#status': 'status'
        }
      };
      
      const result = await dynamoDB.query(params).promise();
      offerings = result.Items || [];
    } else {
      // If includeAll is true and no type filter, scan the table to get all offerings
      const params = {
        TableName: process.env.OFFERINGS_TABLE
      };
      
      const result = await dynamoDB.scan(params).promise();
      offerings = result.Items || [];
    }
    
    // Process image URLs for all offerings
    await processImageUrls(offerings);
    
    return createSuccessResponse({
      offerings,
      count: offerings.length
    });
  } catch (error) {
    logWithContext('error', 'Error listing offerings', { error: error.message });
    throw error;
  }
}

/**
 * Process image URLs for offerings to generate presigned URLs if needed
 */
async function processImageUrls(offerings) {
  try {
    // Generate presigned URLs for S3 images
    for (const offering of offerings) {
      // Use coverImage as the source for the S3 key if available, otherwise try imageUrl
      if (offering.coverImage) {
        const key = offering.coverImage;
        
        // Generate presigned URL
        const presignedUrl = await s3.getSignedUrlPromise('getObject', {
          Bucket: process.env.ASSETS_BUCKET,
          Key: key,
          Expires: 3600 // URL expires in 1 hour
        });
        
        // Set the imageUrl to the presigned URL for client display
        offering.imageUrl = presignedUrl;
      } else if (offering.imageUrl) {
        // Legacy support for imageUrl if coverImage is not available
        const key = offering.imageUrl;
        
        // Generate presigned URL
        const presignedUrl = await s3.getSignedUrlPromise('getObject', {
          Bucket: process.env.ASSETS_BUCKET,
          Key: key,
          Expires: 3600 // URL expires in 1 hour
        });
        
        // Replace the S3 path with presigned URL
        offering.imageUrl = presignedUrl;
      }
    }
  } catch (error) {
    logWithContext('error', 'Error processing image URLs', { error: error.message });
    // Don't throw here, we'll just return offerings with original imageUrls
    console.error('Failed to generate presigned URLs:', error);
  }
}
