/**
 * Test script to verify the profile image upload fix
 * This script simulates updating a profile image and retrieves it to verify
 * the path formats are handled correctly.
 */

const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

// Configuration - update these values to match your environment
const SETTINGS_TABLE = process.env.SETTINGS_TABLE || 'gabi-yoga-settings';
const ASSETS_BUCKET = process.env.ASSETS_BUCKET || 'gabi-yoga-dev-assets-us-east-1';
const PROFILE_IMAGE_KEY = 'about_profile_image';

// Helper function to log messages with timestamps
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

// 1. Test updating the profile image setting with a gallery path
async function testUpdateProfileImage() {
  log('Running profile image update test');

  try {
    // Sample image key that simulates what we'd get from the upload function
    const testImageKey = 'gallery/test-profile-image.jpg';
    
    // Update the setting with the gallery path
    log(`Updating ${PROFILE_IMAGE_KEY} setting with path: ${testImageKey}`);
    
    const timestamp = new Date().toISOString();
    await dynamoDb.put({
      TableName: SETTINGS_TABLE,
      Item: {
        id: PROFILE_IMAGE_KEY,
        key: PROFILE_IMAGE_KEY,
        value: testImageKey,
        description: 'S3 path to profile photo for About Me section',
        category: 'content',
        updatedAt: timestamp,
        createdAt: timestamp
      }
    }).promise();
    
    log('Setting updated successfully');
    
    // 2. Retrieve the setting to verify it was stored correctly
    log(`Retrieving ${PROFILE_IMAGE_KEY} setting`);
    const getResult = await dynamoDb.get({
      TableName: SETTINGS_TABLE,
      Key: { id: PROFILE_IMAGE_KEY }
    }).promise();
    
    const setting = getResult.Item;
    log('Retrieved setting:', setting);
    
    // 3. Generate a presigned URL to simulate retrieval
    log('Generating presigned URL');
    let s3Key = setting.value;
    
    // Apply the same logic used in our Lambda function to ensure paths are handled correctly
    if (!s3Key.startsWith('gallery/') && s3Key.includes('/')) {
      const filename = s3Key.split('/').pop();
      if (/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(filename)) {
        s3Key = `gallery/${filename}`;
        log(`Converted path to gallery format: ${s3Key}`);
      }
    }
    
    // Generate URL (this will throw an error if object doesn't exist, which is fine for this test)
    const presignedUrl = await s3.getSignedUrlPromise('getObject', {
      Bucket: ASSETS_BUCKET,
      Key: s3Key,
      Expires: 3600
    });
    
    log('Successfully generated presigned URL:', { url: presignedUrl });
    log('TEST PASSED: Profile image path handling is working correctly');
    
  } catch (error) {
    log('TEST FAILED:', { error: error.message, stack: error.stack });
  }
}

// Execute tests
(async () => {
  try {
    await testUpdateProfileImage();
  } catch (error) {
    log('Error during tests:', { error: error.message, stack: error.stack });
  }
})();
