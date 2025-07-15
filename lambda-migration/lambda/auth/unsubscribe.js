/**
 * One-click email unsubscribe handler
 * Updates user communication preferences to opt out of emails
 */

const AWS = require('aws-sdk');
const utils = require('../shared/utils');

const dynamodb = new AWS.DynamoDB.DocumentClient();

/**
 * Handle unsubscribe requests
 * GET /auth/unsubscribe?email=user@example.com
 */
exports.handler = async (event) => {
  console.log('Unsubscribe request:', JSON.stringify(event, null, 2));

  try {
    // Extract email from query parameters
    const email = event.queryStringParameters?.email;
    
    if (!email) {
      return utils.createResponse(400, {
        error: 'Missing email parameter'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return utils.createResponse(400, {
        error: 'Invalid email format'
      });
    }

    console.log(`Processing unsubscribe request for email: ${email}`);

    // Look up user by email
    const getUserParams = {
      TableName: process.env.USERS_TABLE,
      IndexName: 'EmailIndex', // Assuming there's a GSI on email
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email
      }
    };

    let userResult;
    try {
      userResult = await dynamodb.query(getUserParams).promise();
    } catch (error) {
      console.error('Error querying user by email:', error);
      
      // If there's no EmailIndex, fall back to scan (less efficient but works)
      if (error.code === 'ValidationException' && error.message.includes('index')) {
        console.log('EmailIndex not found, falling back to scan operation');
        
        const scanParams = {
          TableName: process.env.USERS_TABLE,
          FilterExpression: 'email = :email',
          ExpressionAttributeValues: {
            ':email': email
          }
        };
        
        userResult = await dynamodb.scan(scanParams).promise();
      } else {
        throw error;
      }
    }

    if (!userResult.Items || userResult.Items.length === 0) {
      console.log(`No user found with email: ${email}`);
      // Return success even if user not found (privacy protection)
      return utils.createResponse(200, 
        generateUnsubscribeHtml(email, true),
        { 'Content-Type': 'text/html' }
      );
    }

    const user = userResult.Items[0];
    console.log(`Found user: ${user.id} (${user.email})`);

    // Update user preferences to opt out of communications
    const updateParams = {
      TableName: process.env.USERS_TABLE,
      Key: {
        id: user.id
      },
      UpdateExpression: 'SET preferences.newsletter = :newsletter, preferences.notifications = :notifications, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':newsletter': false,
        ':notifications': false,
        ':updatedAt': new Date().toISOString()
      },
      ReturnValues: 'UPDATED_NEW'
    };

    const updateResult = await dynamodb.update(updateParams).promise();
    console.log('User preferences updated:', updateResult.Attributes);

    // Log the unsubscribe action
    console.log(`Successfully unsubscribed user ${user.id} (${email}) from communications`);

    // Return HTML response confirming unsubscribe
    return utils.createResponse(200, 
      generateUnsubscribeHtml(email, true),
      { 'Content-Type': 'text/html' }
    );

  } catch (error) {
    console.error('Error processing unsubscribe request:', error);
    
    // Return generic error page (don't expose internal errors)
    return utils.createResponse(500, 
      generateUnsubscribeHtml(null, false),
      { 'Content-Type': 'text/html' }
    );
  }
};

/**
 * Generate HTML response for unsubscribe confirmation
 * @param {string} email - User's email address
 * @param {boolean} success - Whether the unsubscribe was successful
 * @returns {string} HTML content
 */
function generateUnsubscribeHtml(email, success) {
  const baseUrl = process.env.BASE_URL || 'https://gabi.yoga';
  
  if (success) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Unsubscribed - Gabi Yoga</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 600px;
            margin: 50px auto;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
        }
        .success-icon {
            color: #4CAF50;
            font-size: 48px;
            margin-bottom: 20px;
        }
        h1 {
            color: #333;
            margin-bottom: 20px;
        }
        p {
            color: #666;
            margin-bottom: 15px;
        }
        .email {
            font-weight: bold;
            color: #333;
        }
        .button {
            display: inline-block;
            background-color: #8B4513;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 4px;
            margin-top: 20px;
            transition: background-color 0.3s;
        }
        .button:hover {
            background-color: #A0522D;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #999;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="success-icon">✓</div>
        <h1>Successfully Unsubscribed</h1>
        <p>You have been successfully unsubscribed from Gabi Yoga communications.</p>
        ${email ? `<p>Email address: <span class="email">${email}</span></p>` : ''}
        <p>You will no longer receive marketing emails, newsletters, or promotional communications from us.</p>
        <p><strong>Note:</strong> You may still receive important transactional emails related to your bookings and account.</p>
        
        <a href="${baseUrl}" class="button">Return to Gabi Yoga</a>
        
        <div class="footer">
            <p>If you unsubscribed by mistake, please contact us at <a href="mailto:noreply@gabi.yoga">noreply@gabi.yoga</a></p>
            <p>© ${new Date().getFullYear()} Gabi Yoga. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
  } else {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Unsubscribe Error - Gabi Yoga</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 600px;
            margin: 50px auto;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
        }
        .error-icon {
            color: #f44336;
            font-size: 48px;
            margin-bottom: 20px;
        }
        h1 {
            color: #333;
            margin-bottom: 20px;
        }
        p {
            color: #666;
            margin-bottom: 15px;
        }
        .button {
            display: inline-block;
            background-color: #8B4513;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 4px;
            margin-top: 20px;
            transition: background-color 0.3s;
        }
        .button:hover {
            background-color: #A0522D;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #999;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="error-icon">⚠</div>
        <h1>Unsubscribe Error</h1>
        <p>We encountered an error while processing your unsubscribe request.</p>
        <p>Please try again later or contact us directly if the problem persists.</p>
        
        <a href="${baseUrl}" class="button">Return to Gabi Yoga</a>
        
        <div class="footer">
            <p>For assistance, please contact us at <a href="mailto:noreply@gabi.yoga">noreply@gabi.yoga</a></p>
            <p>© ${new Date().getFullYear()} Gabi Yoga. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
  }
}
