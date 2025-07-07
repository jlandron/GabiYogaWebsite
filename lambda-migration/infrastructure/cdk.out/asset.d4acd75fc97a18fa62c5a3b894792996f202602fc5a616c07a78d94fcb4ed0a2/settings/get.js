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
          let s3Key;
          
          // Handle direct gallery paths (new format - gallery/UUID.jpg)
          if (setting.value.startsWith('gallery/')) {
            s3Key = setting.value;
            logWithContext('info', 'Using direct gallery path for presigned URL', { 
              requestId,
              settingKey,
              s3Key 
            });
          } 
          // Handle old format paths (/images/profile/filename.jpg)
          else {
            // Extract the S3 key from the stored path (strip leading slash if present)
            s3Key = setting.value.startsWith('/') 
              ? setting.value.substring(1)  // Remove leading slash
              : setting.value;
              
            // If this still references an images/profile path, check if we should use gallery/
            if (s3Key.includes('images/profile/')) {
              // Extract just the filename
              const filename = s3Key.split('/').pop();
              
              // If this is a UUID-based filename, assume it should be in gallery/
              if (/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(filename)) {
                s3Key = `gallery/${filename}`;
                logWithContext('info', 'Converted profile image path to gallery format', { 
                  requestId,
                  settingKey,
                  originalPath: setting.value,
                  s3Key 
                });
              }
            }
          }
          
          // Try to check if the object exists in S3
          const objectExists = await s3Utils.objectExists(assetsBucket, s3Key).catch(err => {
            logWithContext('warn', 'Error checking S3 object existence', {
              requestId,
              s3Key,
              error: err.message
            });
            return false;
          });
          
          // If object doesn't exist, try alternative location
          if (!objectExists) {
            // Try gallery path if we were using images/profile
            if (s3Key.includes('images/profile/')) {
              const filename = s3Key.split('/').pop();
              const alternativeKey = `gallery/${filename}`;
              
              const alternativeExists = await s3Utils.objectExists(assetsBucket, alternativeKey).catch(() => false);
              if (alternativeExists) {
                logWithContext('info', 'Using alternative gallery path for image', {
                  requestId,
                  settingKey,
                  originalPath: s3Key,
                  alternativePath: alternativeKey
                });
                s3Key = alternativeKey;
              }
            } 
            // Try images/profile path if we were using gallery
            else if (s3Key.startsWith('gallery/')) {
              const filename = s3Key.split('/').pop();
              const alternativeKey = `images/profile/${filename}`;
              
              const alternativeExists = await s3Utils.objectExists(assetsBucket, alternativeKey).catch(() => false);
              if (alternativeExists) {
                logWithContext('info', 'Using alternative profile path for image', {
                  requestId,
                  settingKey,
                  originalPath: s3Key,
                  alternativePath: alternativeKey
                });
                s3Key = alternativeKey;
              }
            }
          }
          
          // Generate a presigned URL for the image
          const presignedUrl = await s3Utils.getDownloadUrl(assetsBucket, s3Key, 3600); // 1 hour expiry
          
          // Add the presigned URL to the setting object
          setting.presignedUrl = presignedUrl;
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
        let s3Key;
        
        // Handle direct gallery paths (new format - gallery/UUID.jpg)
        if (setting.value.startsWith('gallery/')) {
          s3Key = setting.value;
          logWithContext('info', 'Using direct gallery path for presigned URL', { 
            settingKey: setting.key,
            s3Key: s3Key 
          });
        } 
        // Handle old format paths (/images/profile/filename.jpg)
        else {
          // Extract the S3 key from the stored path (strip leading slash if present)
          s3Key = setting.value.startsWith('/') 
            ? setting.value.substring(1)  // Remove leading slash
            : setting.value;
            
          // If this still references an images/profile path, check if we should use gallery/
          if (s3Key.includes('images/profile/')) {
            // Extract just the filename
            const filename = s3Key.split('/').pop();
            
            // If this is a UUID-based filename, assume it should be in gallery/
            if (/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(filename)) {
              s3Key = `gallery/${filename}`;
              logWithContext('info', 'Converted profile image path to gallery format', { 
                settingKey: setting.key,
                originalPath: setting.value,
                s3Key: s3Key 
              });
            }
          }
        }
        
        // Try to check if the object exists in S3
        const objectExists = await s3Utils.objectExists(bucket, s3Key).catch(err => {
          logWithContext('warn', 'Error checking S3 object existence', {
            s3Key,
            error: err.message
          });
          return false;
        });
        
        // If object doesn't exist, try alternative location
        if (!objectExists && setting.key === 'about_profile_image') {
          // Try gallery path if we were using images/profile
          if (s3Key.includes('images/profile/')) {
            const filename = s3Key.split('/').pop();
            const alternativeKey = `gallery/${filename}`;
            
            const alternativeExists = await s3Utils.objectExists(bucket, alternativeKey).catch(() => false);
            if (alternativeExists) {
              logWithContext('info', 'Using alternative gallery path for image', {
                settingKey: setting.key,
                originalPath: s3Key,
                alternativePath: alternativeKey
              });
              s3Key = alternativeKey;
            }
          } 
          // Try images/profile path if we were using gallery
          else if (s3Key.startsWith('gallery/')) {
            const filename = s3Key.split('/').pop();
            const alternativeKey = `images/profile/${filename}`;
            
            const alternativeExists = await s3Utils.objectExists(bucket, alternativeKey).catch(() => false);
            if (alternativeExists) {
              logWithContext('info', 'Using alternative profile path for image', {
                settingKey: setting.key,
                originalPath: s3Key,
                alternativePath: alternativeKey
              });
              s3Key = alternativeKey;
            }
          }
        }
        
        // Generate a presigned URL for the image
        const presignedUrl = await s3Utils.getDownloadUrl(bucket, s3Key, 3600); // 1 hour expiry
        
        // Add the presigned URL to the setting object
        setting.presignedUrl = presignedUrl;
      } catch (error) {
        console.warn(`Failed to generate presigned URL for ${setting.key}:`, error);
        // Continue without the presigned URL
      }
    }
  }
}
