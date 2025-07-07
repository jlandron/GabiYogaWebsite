/**
 * PUT /offerings/{id} API endpoint
 * 
 * Admin endpoint to update existing offerings
 * Requires authentication and admin role
 */

const AWS = require('aws-sdk');
const { 
  createSuccessResponse, 
  createErrorResponse, 
  dynamoUtils, 
  logWithContext, 
  isAdminUser, 
  validateToken 
} = require('../shared/public-utils');

// Initialize DynamoDB client
const dynamoDB = new AWS.DynamoDB.DocumentClient();

/**
 * Lambda handler
 */
exports.handler = async (event) => {
  try {
    // Get auth token from header
    const authHeader = event.headers?.Authorization;
    
    // Validate token and get user
    const user = await validateToken(authHeader);
    
    if (!user) {
      return createErrorResponse('Authentication required', 401);
    }
    
    // Check if user is admin
    if (!isAdminUser(user)) {
      return createErrorResponse('Admin privileges required', 403);
    }
    
    // Get offering ID from path parameters
    const offerId = event.pathParameters?.id;
    
    if (!offerId) {
      return createErrorResponse('Offering ID is required', 400);
    }
    
    // Parse request body
    let requestBody;
    try {
      requestBody = JSON.parse(event.body);
    } catch (error) {
      return createErrorResponse('Invalid request body', 400);
    }
    
    // Update the offering
    const result = await updateOffering(offerId, requestBody, user);
    
    return createSuccessResponse({
      message: 'Offering updated successfully',
      offering: result
    });
  } catch (error) {
    logWithContext('error', 'Error updating offering', {
      error: error.message,
      stack: error.stack,
      requestId: event.requestContext?.requestId
    });
    
    return createErrorResponse('Failed to update offering', 500);
  }
};

/**
 * Update an existing offering in DynamoDB
 */
async function updateOffering(id, data, user) {
  try {
    // First check if the offering exists
    const existingOffering = await dynamoUtils.getItem(process.env.OFFERINGS_TABLE, { id });
    
    if (!existingOffering) {
      throw new Error('Offering not found');
    }
    
    // Get current timestamp
    const now = new Date().toISOString();
    
    // Create update expression and attribute values
    let updateExpression = 'SET updatedAt = :updatedAt';
    let expressionAttributeValues = {
      ':updatedAt': now
    };
    let expressionAttributeNames = {};
    
    // Add fields to update expression if they exist in request body
    const updateFields = [
      { key: 'name', attr: '#name' },
      { key: 'type', attr: '#type' },
      { key: 'description', attr: '#description' },
      { key: 'price', attr: null },
      { key: 'duration', attr: '#duration' },  // Using attribute name for reserved keyword
      { key: 'details', attr: null },
      { key: 'imageUrl', attr: null },
      { key: 'status', attr: '#status' }
    ];
    
    updateFields.forEach(field => {
      if (data[field.key] !== undefined) {
        const attrName = field.attr || field.key;
        const placeholder = `:${field.key}`;
        
        if (field.attr) {
          expressionAttributeNames[field.attr] = field.key;
        }
        
        updateExpression += `, ${attrName} = ${placeholder}`;
        expressionAttributeValues[placeholder] = data[field.key];
      }
    });
    
    // Prepare update params
    const updateParams = {
      TableName: process.env.OFFERINGS_TABLE,
      Key: { id },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    };
    
    // Add ExpressionAttributeNames if any field uses reserved keywords
    if (Object.keys(expressionAttributeNames).length > 0) {
      updateParams.ExpressionAttributeNames = expressionAttributeNames;
    }
    
    // Update in DynamoDB
    const result = await dynamoDB.update(updateParams).promise();
    
    return result.Attributes;
  } catch (error) {
    logWithContext('error', `Error updating offering with ID ${id}`, { error: error.message });
    throw error;
  }
}
