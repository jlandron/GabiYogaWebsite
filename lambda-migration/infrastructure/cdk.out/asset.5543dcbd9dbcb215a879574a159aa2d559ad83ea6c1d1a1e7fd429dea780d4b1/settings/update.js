const { DynamoDB } = require('aws-sdk');
const { verifyToken, isAdmin } = require('../shared/utils');

const dynamodb = new DynamoDB.DocumentClient();

exports.handler = async (event) => {
  try {
    // Verify token and admin role
    const user = await verifyToken(event.headers.Authorization);
    if (!isAdmin(user)) {
      return {
        statusCode: 403,
        body: JSON.stringify({ message: 'Admin access required' })
      };
    }

    const settings = JSON.parse(event.body);

    // Validate required fields
    const requiredFields = ['siteName', 'contactEmail', 'maxClassSize', 'advanceBookingDays', 
                          'cancellationHours', 'currency', 'defaultClassPrice'];
    
    const missingFields = requiredFields.filter(field => !settings[field]);
    if (missingFields.length > 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          message: 'Missing required fields', 
          fields: missingFields 
        })
      };
    }

    // Validate field types and ranges
    if (typeof settings.maxClassSize !== 'number' || settings.maxClassSize < 1) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid maxClassSize' })
      };
    }

    if (typeof settings.advanceBookingDays !== 'number' || settings.advanceBookingDays < 1) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid advanceBookingDays' })
      };
    }

    if (typeof settings.cancellationHours !== 'number' || settings.cancellationHours < 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid cancellationHours' })
      };
    }

    if (!['USD', 'EUR', 'GBP'].includes(settings.currency)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid currency' })
      };
    }

    if (typeof settings.defaultClassPrice !== 'number' || settings.defaultClassPrice < 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid defaultClassPrice' })
      };
    }

    // Save settings to DynamoDB
    await dynamodb.put({
      TableName: process.env.SETTINGS_TABLE,
      Item: {
        id: 'global',
        ...settings,
        updatedAt: new Date().toISOString(),
        updatedBy: user.sub
      }
    }).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Settings updated successfully' })
    };

  } catch (error) {
    console.error('Error updating settings:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error updating settings' })
    };
  }
};
