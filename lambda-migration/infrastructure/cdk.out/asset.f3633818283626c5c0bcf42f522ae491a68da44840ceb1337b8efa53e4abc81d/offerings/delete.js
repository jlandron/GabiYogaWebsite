/**
 * DELETE /offerings/{id} API endpoint
 * 
 * Admin endpoint to delete offerings
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
    
    // Delete the offering
    await deleteOffering(offerId);
    
    return createSuccessResponse({
      message: 'Offering deleted successfully',
      id: offerId
    });
  } catch (error) {
    logWithContext('error', 'Error deleting offering', {
      error: error.message,
      stack: error.stack,
      requestId: event.requestContext?.requestId
    });
    
    return createErrorResponse('Failed to delete offering', 500);
  }
};

/**
 * Delete an offering from DynamoDB
 */
async function deleteOffering(id) {
  try {
    // First check if the offering exists
    const existingOffering = await dynamoUtils.getItem(process.env.OFFERINGS_TABLE, { id });
    
    if (!existingOffering) {
      throw new Error('Offering not found');
    }
    
    // Delete from DynamoDB
    await dynamoDB.delete({
      TableName: process.env.OFFERINGS_TABLE,
      Key: { id }
    }).promise();
    
    return true;
  } catch (error) {
    logWithContext('error', `Error deleting offering with ID ${id}`, { error: error.message });
    throw error;
  }
}
