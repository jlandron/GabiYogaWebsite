/**
 * POST /offerings API endpoint
 * 
 * Admin endpoint to create new offerings
 * Requires authentication and admin role
 */

const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
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
    
    // Parse request body
    let requestBody;
    try {
      requestBody = JSON.parse(event.body);
    } catch (error) {
      return createErrorResponse('Invalid request body', 400);
    }
    
    // Create the offering
    const result = await createOffering(requestBody, user);
    
    return createSuccessResponse({
      message: 'Offering created successfully',
      offering: result
    }, 201);
  } catch (error) {
    logWithContext('error', 'Error creating offering', {
      error: error.message,
      stack: error.stack,
      requestId: event.requestContext?.requestId
    });
    
    return createErrorResponse('Failed to create offering', 500);
  }
};

/**
 * Create a new offering in DynamoDB
 */
async function createOffering(data, user) {
  try {
    // Validate required fields
    if (!data.name || !data.type || !data.description) {
      throw new Error('Missing required fields: name, type, and description are required');
    }
    
    // Generate a new UUID for the offering
    const offeringId = uuidv4();
    
    // Get current timestamp
    const now = new Date().toISOString();
    
    // Set default status to Draft if not provided
    const status = data.status || 'Draft';
    
    // Create the offering object
    const offering = {
      id: offeringId,
      name: data.name,
      type: data.type,
      description: data.description,
      price: data.price,
      duration: data.duration,
      details: data.details || {},
      imageUrl: data.imageUrl || null,
      coverImage: data.coverImage || null,
      status: status,
      createdAt: now,
      updatedAt: now,
      createdBy: user.id
    };
    
    // Add to DynamoDB
    await dynamoDB.put({
      TableName: process.env.OFFERINGS_TABLE,
      Item: offering
    }).promise();
    
    return offering;
  } catch (error) {
    logWithContext('error', 'Error creating offering in database', { error: error.message });
    throw error;
  }
}
