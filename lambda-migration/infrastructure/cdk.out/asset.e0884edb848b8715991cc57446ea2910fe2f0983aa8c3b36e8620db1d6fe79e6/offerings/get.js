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
 * List active offerings with optional filters
 */
async function listOfferings(queryParams = {}) {
  try {
    // Default to only showing active offerings for public API
    const status = queryParams.status || 'Active';
    const type = queryParams.type || null;
    
    let offerings = [];
    
    // If type filter is provided, use the OfferingTypeIndex and filter by status
    if (type) {
      // Use the OfferingTypeIndex GSI
      const params = {
        TableName: process.env.OFFERINGS_TABLE,
        IndexName: 'OfferingTypeIndex',
        KeyConditionExpression: '#type = :type',
        FilterExpression: '#status = :status',
        ExpressionAttributeValues: {
          ':type': type,
          ':status': status
        },
        ExpressionAttributeNames: {
          '#type': 'type',
          '#status': 'status'
        }
      };
      
      const result = await dynamoDB.query(params).promise();
      offerings = result.Items || [];
    } else {
      // Use the OfferingStatusIndex GSI directly with a query
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
      if (offering.imageUrl) {
        // In the database, imageUrl is always an S3 path (never a full URL)
        // Extract key from path
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
