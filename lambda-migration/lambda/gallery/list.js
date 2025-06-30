/**
 * Gallery List Lambda Function
 * Handles retrieving gallery images with pagination and filtering
 */

const { 
  createSuccessResponse, 
  createErrorResponse,
  logWithContext,
  dynamoUtils
} = require('../shared/public-utils');

exports.handler = async (event, context) => {
  const requestId = context.awsRequestId;
  
  try {
    logWithContext('info', 'Gallery list request received', { requestId });

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return createSuccessResponse({}, 200);
    }

    // Parse query parameters
    const queryParams = event.queryStringParameters || {};
    const limit = Math.min(parseInt(queryParams.limit) || 20, 100); // Max 100 images per request
    const page = Math.max(parseInt(queryParams.page) || 1, 1);
    const category = queryParams.category; // e.g., 'class', 'retreat', 'studio'
    const featured = queryParams.featured === 'true';

    logWithContext('info', 'Processing gallery list request', { 
      requestId, 
      limit,
      page,
      category,
      featured
    });

    try {
      const AWS = require('aws-sdk');
      const dynamoDb = new AWS.DynamoDB.DocumentClient();
      
      // Build filter expression
      let filterExpression = '#status = :active';
      let expressionAttributeNames = { '#status': 'status' };
      let expressionAttributeValues = { ':active': 'active' };

      if (category) {
        filterExpression += ' AND category = :category';
        expressionAttributeValues[':category'] = category;
      }

      if (featured) {
        filterExpression += ' AND featured = :featured';
        expressionAttributeValues[':featured'] = true;
      }

      // Calculate pagination
      const startKey = page > 1 ? { 
        id: queryParams.lastEvaluatedKey 
      } : undefined;

      const scanParams = {
        TableName: process.env.GALLERY_TABLE,
        FilterExpression: filterExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        Limit: limit,
        ExclusiveStartKey: startKey
      };

      const result = await dynamoDb.scan(scanParams).promise();
      const images = result.Items || [];
      const lastEvaluatedKey = result.LastEvaluatedKey;

      // Sort images by display order, then by creation date (newest first)
      images.sort((a, b) => {
        if (a.displayOrder !== b.displayOrder) {
          return (a.displayOrder || 999) - (b.displayOrder || 999);
        }
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      // Transform images for response
      const transformedImages = images.map(image => ({
        id: image.id,
        title: image.title,
        description: image.description,
        imageUrl: image.imageUrl,
        thumbnailUrl: image.thumbnailUrl || image.imageUrl,
        altText: image.altText || image.title,
        category: image.category || 'general',
        tags: image.tags || [],
        featured: image.featured || false,
        displayOrder: image.displayOrder || 0,
        dimensions: image.dimensions || { width: 0, height: 0 },
        fileSize: image.fileSize || 0,
        uploadedAt: image.createdAt,
        updatedAt: image.updatedAt
      }));

      // Calculate pagination info
      const totalImages = images.length;
      const totalPages = Math.ceil(totalImages / limit);
      const hasNextPage = !!lastEvaluatedKey;
      const hasPrevPage = page > 1;

      logWithContext('info', 'Gallery list request successful', { 
        requestId, 
        imagesReturned: transformedImages.length,
        page,
        hasNextPage
      });

      return createSuccessResponse({
        images: transformedImages,
        pagination: {
          currentPage: page,
          totalPages,
          imagesPerPage: limit,
          hasNextPage,
          hasPrevPage,
          nextPage: hasNextPage ? page + 1 : null,
          prevPage: hasPrevPage ? page - 1 : null,
          lastEvaluatedKey: lastEvaluatedKey?.id || null
        },
        filters: {
          category,
          featured
        },
        categories: await getGalleryCategories()
      });

    } catch (dbError) {
      logWithContext('error', 'Database error in gallery list', { 
        requestId, 
        error: dbError.message 
      });
      throw dbError;
    }

  } catch (error) {
    logWithContext('error', 'Gallery list error', { 
      requestId, 
      error: error.message,
      stack: error.stack 
    });

    if (error.code === 'ResourceNotFoundException') {
      return createErrorResponse('Gallery service temporarily unavailable', 503);
    }

    return createErrorResponse('An error occurred while fetching gallery images', 500);
  }
};

/**
 * Get available gallery categories
 */
async function getGalleryCategories() {
  try {
    // This could be cached or stored in a separate config
    return [
      { id: 'class', name: 'Class Photos', description: 'Photos from yoga classes' },
      { id: 'retreat', name: 'Retreats', description: 'Yoga retreat experiences' },
      { id: 'studio', name: 'Studio', description: 'Studio space and atmosphere' },
      { id: 'workshop', name: 'Workshops', description: 'Special workshops and events' },
      { id: 'general', name: 'General', description: 'Other yoga-related photos' }
    ];
  } catch (error) {
    console.error('Error getting gallery categories:', error);
    return [];
  }
}
