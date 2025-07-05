/**
 * Contact form submission handler
 */
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const { isValidEmail, createErrorResponse } = require('./utils');

/**
 * Simple sanitization function to prevent XSS attacks
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Handle contact form submissions
 */
exports.handler = async (event) => {
  console.log('Contact form handler received event:', event.httpMethod);
  
  try {
    // Only allow POST for form submissions
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*'
        },
        body: JSON.stringify({
          success: false,
          message: 'Method not allowed'
        })
      };
    }

    // Parse request body
    const body = JSON.parse(event.body);
    
    // Validate required fields
    if (!body.name || !body.email || !body.message) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*'
        },
        body: JSON.stringify({
          success: false,
          message: 'Name, email and message are required'
        })
      };
    }

    // Validate email format
    if (!isValidEmail(body.email)) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*'
        },
        body: JSON.stringify({
          success: false,
          message: 'Invalid email address'
        })
      };
    }
    
    // Sanitize inputs to prevent XSS
    const name = sanitizeInput(body.name);
    const email = sanitizeInput(body.email.toLowerCase());
    const message = sanitizeInput(body.message);
    
    // Store in DynamoDB
    const dynamoDb = new AWS.DynamoDB.DocumentClient();
    const tableName = process.env.COMMUNICATIONS_TABLE;
    const timestamp = new Date().toISOString();
    
    const params = {
      TableName: tableName,
      Item: {
        id: uuidv4(),
        type: 'CONTACT',
        status: 'NEW',
        name: name,
        email: email,
        message: message,
        createdAt: timestamp,
        updatedAt: timestamp
      }
    };
    
    await dynamoDb.put(params).promise();
    
    // Return success response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*'
      },
      body: JSON.stringify({
        success: true,
        message: 'Contact form submitted successfully'
      })
    };
  } catch (error) {
    console.error('Error processing contact form submission:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*'
      },
      body: JSON.stringify({
        success: false,
        message: error.message || 'An error occurred while processing your request'
      })
    };
  }
};
