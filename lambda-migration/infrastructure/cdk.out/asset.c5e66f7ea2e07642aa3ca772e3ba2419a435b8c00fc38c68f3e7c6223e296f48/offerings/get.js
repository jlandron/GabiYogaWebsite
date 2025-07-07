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
    
    let filterExpression = 'status = :status';
    let expressionAttributeValues = {
      ':status': status
    };
    
    // Add type filter if provided
    if (type) {
      filterExpression += ' AND #type = :type';
      expressionAttributeValues[':type'] = type;
    }
    
    const params = {
      TableName: process.env.OFFERINGS_TABLE,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: expressionAttributeValues
    };
    
    // Add ExpressionAttributeNames if type filter is used
    if (type) {
      params.ExpressionAttributeNames = {
        '#type': 'type' // 'type' is a reserved keyword in DynamoDB
      };
    }
    
    // Execute the query
    const result = await dynamoDB.scan(params).promise();
    
    return createSuccessResponse({
      offerings: result.Items || [],
      count: result.Count,
      scannedCount: result.ScannedCount
    });
  } catch (error) {
    logWithContext('error', 'Error listing offerings', { error: error.message });
    throw error;
  }
}
