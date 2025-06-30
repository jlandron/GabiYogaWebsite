/**
 * Public Settings Lambda Function
 * Handles retrieving settings for public consumption (homepage, etc.)
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
    logWithContext('info', 'Public settings request received', { 
      requestId,
      method: event.httpMethod,
      path: event.path 
    });

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return createSuccessResponse({}, 200);
    }

    // Only allow GET requests for public settings
    if (event.httpMethod !== 'GET') {
      return createErrorResponse(`Method ${event.httpMethod} not allowed`, 405);
    }

    const pathParameters = event.pathParameters || {};
    const settingKey = pathParameters.key;

    return await handleGetSettings(requestId, settingKey);

  } catch (error) {
    logWithContext('error', 'Public settings error', { 
      requestId, 
      error: error.message,
      stack: error.stack 
    });

    return createErrorResponse('An error occurred while retrieving settings', 500);
  }
};

/**
 * Handle GET requests for settings
 */
async function handleGetSettings(requestId, settingKey) {
  try {
    const tableName = process.env.SETTINGS_TABLE;
    
    if (settingKey) {
      // Get specific setting by id
      const setting = await dynamoUtils.getItem(tableName, { id: settingKey });
      
      if (!setting) {
        return createErrorResponse(`Setting '${settingKey}' not found`, 404);
      }

      logWithContext('info', 'Retrieved specific setting', { 
        requestId, 
        settingKey 
      });

      return createSuccessResponse({
        setting
      });
    } else {
      // Get all settings
      const AWS = require('aws-sdk');
      const dynamoDb = new AWS.DynamoDB.DocumentClient();
      
      const result = await dynamoDb.scan({
        TableName: tableName
      }).promise();

      const settings = result.Items || [];
      
      // Transform to key-value pairs for easier frontend consumption
      const settingsMap = {};
      settings.forEach(setting => {
        settingsMap[setting.key] = setting.value;
      });

      // Also provide organized categories for easier access
      const categorizedSettings = {
        content: {},
        general: {},
        contact: {},
        social: {},
        homepage: {}
      };

      settings.forEach(setting => {
        const category = setting.category || 'general';
        if (categorizedSettings[category]) {
          categorizedSettings[category][setting.key] = setting.value;
        }
      });

      logWithContext('info', 'Retrieved all public settings', { 
        requestId, 
        count: settings.length 
      });

      return createSuccessResponse({
        settings: settingsMap,
        categorized: categorizedSettings,
        rawSettings: settings
      });
    }

  } catch (error) {
    logWithContext('error', 'Error retrieving settings', { 
      requestId, 
      error: error.message 
    });
    throw error;
  }
}
