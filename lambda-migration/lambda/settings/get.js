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
const s3Utils = require('../shared/s3-utils');
const { generateCdnUrl } = require('../shared/cdn-utils');

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
    const assetsBucket = process.env.ASSETS_BUCKET;
    
    if (settingKey) {
      // Get specific setting by id
      const setting = await dynamoUtils.getItem(tableName, { id: settingKey });
      
      if (!setting) {
        return createErrorResponse(`Setting '${settingKey}' not found`, 404);
      }
      
      // Check if this is a profile image setting and generate presigned URL if needed
      if (settingKey === 'about_profile_image' && setting.value && !setting.value.startsWith('http')) {
        try {
          // Generate a CDN URL for the image
          const cdnUrl = await generateCdnUrl(setting.value);
          
          // Add the presigned URL to the setting object
          setting.presignedUrl = cdnUrl;
        } catch (error) {
          logWithContext('warn', 'Failed to generate presigned URL for profile image', { 
            requestId, 
            settingKey,
            error: error.message 
          });
          // Continue without the presigned URL
        }
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
      
      // Process profile images to add presigned URLs
      await processImageSettings(settings, assetsBucket);
      
      // Transform to key-value pairs for easier frontend consumption
      const settingsMap = {};
      settings.forEach(setting => {
        settingsMap[setting.key] = setting.value;
        // Add presignedUrl to the map if available
        if (setting.presignedUrl) {
          settingsMap[`${setting.key}_url`] = setting.presignedUrl;
        }
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

/**
 * Process any image-based settings to add presigned URLs
 */
async function processImageSettings(settings, bucket) {
  // List of setting keys that contain image paths
  const imageSettingKeys = ['about_profile_image'];
  
  for (const setting of settings) {
    if (imageSettingKeys.includes(setting.key) && setting.value && !setting.value.startsWith('http')) {
      try {

        // Generate a presigned URL for the image
        const cdnUrl = await generateCdnUrl(setting.value);
        
        // Add the presigned URL to the setting object
        setting.presignedUrl = cdnUrl;
      } catch (error) {
        console.warn(`Failed to generate presigned URL for ${setting.key}:`, error);
        // Continue without the presigned URL
      }
    }
  }
}
