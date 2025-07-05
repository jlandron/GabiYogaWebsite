/**
 * Contact form submission handler
 */
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const { validateFields, sanitizeInput } = require('./utils');

/**
 * Handle contact form submissions
 */
exports.handler = async (event) => {
  console.log('Processing contact form submission');
  
  try {
    // Parse request body
    const body = JSON.parse(event.body);
    console.log('Request body:', body);
    
    // Validate required fields
    const { name, email, message } = body;
    validateFields({ name, email, message });
    
    // Sanitize inputs
    const sanitizedName = sanitizeInput(name);
    const sanitizedEmail = sanitizeInput(email);
    const sanitizedMessage = sanitizeInput(message);
    
    // Initialize DynamoDB client
    const dynamoDb = new AWS.DynamoDB.DocumentClient();
    const tableName = process.env.COMMUNICATIONS_TABLE;
    
    // Generate unique ID
    const id = uuidv4();
    const timestamp = new Date().toISOString();
    
    // Create record
    const params = {
      TableName: tableName,
      Item: {
        id,
        type: 'CONTACT',
        status: 'NEW',
        name: sanitizedName,
        email: sanitizedEmail,
        message: sanitizedMessage,
        createdAt: timestamp,
        updatedAt: timestamp
      }
    };
    
    // Save to DynamoDB
    await dynamoDb.put(params).promise();
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        success: true,
        message: 'Contact form submitted successfully',
        data: { id }
      })
    };
  } catch (error) {
    console.error('Error processing contact form:', error);
    
    return {
      statusCode: error.statusCode || 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        success: false,
        message: error.message || 'Internal server error'
      })
    };
  }
};
