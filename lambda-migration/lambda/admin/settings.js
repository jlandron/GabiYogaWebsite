/**
 * Admin Settings Lambda Function
 * Handles CRUD operations for application settings
 */

const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const { 
  createSuccessResponse, 
  createErrorResponse,
  logWithContext,
  dynamoUtils,
  getUserFromToken,
  isAdmin
} = require('../shared/utils');

exports.handler = async (event, context) => {
  const requestId = context.awsRequestId;
  
  try {
    logWithContext('info', 'Settings request received', { 
      requestId,
      method: event.httpMethod,
      path: event.path 
    });

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return createSuccessResponse({}, 200);
    }

    // Verify admin role
    const user = await getUserFromToken(event);
    if (!user || !isAdmin(user)) {
      return createErrorResponse('Unauthorized - Admin access required', 403);
    }

    const method = event.httpMethod;
    const pathParameters = event.pathParameters || {};
    const settingKey = pathParameters.key;

    switch (method) {
      case 'GET':
        return await handleGetSettings(requestId, settingKey);
      case 'POST':
      case 'PUT':
        return await handleUpdateSettings(requestId, event);
      case 'DELETE':
        return await handleDeleteSetting(requestId, settingKey);
      default:
        return createErrorResponse(`Method ${method} not allowed`, 405);
    }

  } catch (error) {
    logWithContext('error', 'Settings error', { 
      requestId, 
      error: error.message,
      stack: error.stack 
    });

    return createErrorResponse('An error occurred while processing settings', 500);
  }
};


/**
 * Handle POST/PUT requests for updating settings
 */
async function handleUpdateSettings(requestId, event) {
  try {
    const body = JSON.parse(event.body || '{}');
    const tableName = process.env.SETTINGS_TABLE;
    
    if (!body.key || body.value === undefined) {
      return createErrorResponse('Both key and value are required', 400);
    }

    const timestamp = new Date().toISOString();
    
    const setting = {
      id: body.key,  // Use key as id for DynamoDB
      key: body.key,
      value: body.value,
      description: body.description || null,
      category: body.category || 'general',
      updatedAt: timestamp,
      createdAt: timestamp
    };

    // Check if setting exists to set proper createdAt
    const existingSetting = await dynamoUtils.getItem(tableName, { id: body.key });
    if (existingSetting) {
      setting.createdAt = existingSetting.createdAt;
    }

    await dynamoUtils.putItem(tableName, setting);

    logWithContext('info', 'Setting updated successfully', { 
      requestId, 
      key: body.key 
    });

    return createSuccessResponse({
      message: 'Setting updated successfully',
      setting
    });

  } catch (error) {
    logWithContext('error', 'Error updating setting', { 
      requestId, 
      error: error.message 
    });
    throw error;
  }
}

/**
 * Handle GET requests for settings
 */
async function handleGetSettings(requestId, settingKey) {
  try {
    const tableName = process.env.SETTINGS_TABLE;
    
    // If key provided, get specific setting
    if (settingKey) {
      const setting = await dynamoUtils.getItem(tableName, { id: settingKey });
      if (!setting) {
        return createErrorResponse(`Setting '${settingKey}' not found`, 404);
      }
      return createSuccessResponse({ setting });
    }
    
    // Otherwise, get all settings
    const result = await dynamoDb.scan({
      TableName: tableName,
      ProjectionExpression: 'id, #k, #v, description, category, createdAt, updatedAt',
      ExpressionAttributeNames: {
        '#k': 'key',
        '#v': 'value'
      }
    }).promise();

    // Group settings by category
    const settingsByCategory = result.Items.reduce((acc, setting) => {
      const category = setting.category || 'general';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(setting);
      return acc;
    }, {});

    logWithContext('info', 'Settings retrieved successfully', { 
      requestId,
      count: result.Items.length
    });

    return createSuccessResponse({
      settings: settingsByCategory,
      count: result.Items.length
    });

  } catch (error) {
    logWithContext('error', 'Error retrieving settings', { 
      requestId, 
      error: error.message 
    });
    throw error;
  }
}

/**
 * Handle DELETE requests for settings
 */
async function handleDeleteSetting(requestId, settingKey) {
  try {
    if (!settingKey) {
      return createErrorResponse('Setting key is required', 400);
    }

    const tableName = process.env.SETTINGS_TABLE;
    
    // Check if setting exists
    const existingSetting = await dynamoUtils.getItem(tableName, { id: settingKey });
    if (!existingSetting) {
      return createErrorResponse(`Setting '${settingKey}' not found`, 404);
    }

    // Delete the setting
    await dynamoDb.delete({
      TableName: tableName,
      Key: { id: settingKey }
    }).promise();

    logWithContext('info', 'Setting deleted successfully', { 
      requestId, 
      settingKey 
    });

    return createSuccessResponse({
      message: 'Setting deleted successfully',
      deletedKey: settingKey
    });

  } catch (error) {
    logWithContext('error', 'Error deleting setting', { 
      requestId, 
      error: error.message 
    });
    throw error;
  }
}
