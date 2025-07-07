/**
 * Communications management for the admin panel
 */
const AWS = require('aws-sdk');
const { isAdmin, getUserFromToken, createErrorResponse } = require('../shared/utils');

/**
 * Get all communication entries (contact form submissions)
 */
exports.handler = async (event) => {
  console.log('Communications handler received event:', event.httpMethod, event.path);
  
  try {
    // Verify admin role
    const user = await getUserFromToken(event);
    if (!user || !isAdmin(user)) {
      return createErrorResponse('Unauthorized - Admin access required', 403);
    }
    if (event.httpMethod === 'GET') {
      return await handleGetCommunications(event);
    } else if (event.httpMethod === 'PUT') {
      return await handleUpdateCommunication(event);
    } else if (event.httpMethod === 'DELETE') {
      return await handleDeleteCommunication(event);
    } else {
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
  } catch (error) {
    console.error('Error in communications handler:', error);
    return createErrorResponse(error.message || 'An error occurred while processing your request', 500);
  }
};

/**
 * Get communications entries with optional filtering
 */
async function handleGetCommunications(event) {
  const queryParams = event.queryStringParameters || {};
  const type = queryParams.type || 'CONTACT';  // Default to contact form messages
  const status = queryParams.status;  // Optional filter by status
  const limit = parseInt(queryParams.limit) || 100;
  
  const dynamoDb = new AWS.DynamoDB.DocumentClient();
  const tableName = process.env.COMMUNICATIONS_TABLE;
  
  let params = {
    TableName: tableName,
    Limit: limit
  };
  
  // Apply type filter using the TypeIndex GSI
  if (type) {
    params = {
      ...params,
      IndexName: 'TypeIndex',
      KeyConditionExpression: '#type = :type',
      ExpressionAttributeNames: {
        '#type': 'type'
      },
      ExpressionAttributeValues: {
        ':type': type
      }
    };
    
    // Add status filter if provided
    if (status) {
      params.FilterExpression = '#status = :status';
      params.ExpressionAttributeNames['#status'] = 'status';
      params.ExpressionAttributeValues[':status'] = status;
    }
  }
  
  // Sort by createdAt descending
  if (type) {
    params.ScanIndexForward = false; // Descending order for query
  } else {
    params.ScanIndexForward = true; // Ascending order is the default
  }
  
  try {
    const result = type ? await dynamoDb.query(params).promise() : await dynamoDb.scan(params).promise();
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*'
      },
      body: JSON.stringify({
        success: true,
        messages: result.Items
      })
    };
  } catch (error) {
    console.error('Error getting communications:', error);
    throw error;
  }
}

/**
 * Update a communication entry (mark as read, archived, etc.)
 */
async function handleUpdateCommunication(event) {
  const id = event.pathParameters?.id;
  if (!id) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*'
      },
      body: JSON.stringify({
        success: false,
        message: 'Missing communication ID'
      })
    };
  }
  
  const body = JSON.parse(event.body);
  const { status, notes } = body;
  
  const dynamoDb = new AWS.DynamoDB.DocumentClient();
  const tableName = process.env.COMMUNICATIONS_TABLE;
  const timestamp = new Date().toISOString();
  
  // Build update expression based on provided fields
  let updateExpression = 'SET updatedAt = :updatedAt';
  const expressionAttributeValues = {
    ':updatedAt': timestamp
  };
  
  if (status) {
    updateExpression += ', #status = :status';
    expressionAttributeValues[':status'] = status;
  }
  
  if (notes !== undefined) {
    updateExpression += ', notes = :notes';
    expressionAttributeValues[':notes'] = notes;
  }
  
  const params = {
    TableName: tableName,
    Key: { id },
    UpdateExpression: updateExpression,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW'
  };
  
  // Add ExpressionAttributeNames if status is being updated
  if (status) {
    params.ExpressionAttributeNames = {
      '#status': 'status'
    };
  }
  
  try {
    const result = await dynamoDb.update(params).promise();
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*'
      },
      body: JSON.stringify({
        success: true,
        message: 'Communication updated',
        data: result.Attributes
      })
    };
  } catch (error) {
    console.error('Error updating communication:', error);
    throw error;
  }
}

/**
 * Delete a communication entry
 */
async function handleDeleteCommunication(event) {
  const id = event.pathParameters?.id;
  if (!id) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*'
      },
      body: JSON.stringify({
        success: false,
        message: 'Missing communication ID'
      })
    };
  }
  
  const dynamoDb = new AWS.DynamoDB.DocumentClient();
  const tableName = process.env.COMMUNICATIONS_TABLE;
  
  const params = {
    TableName: tableName,
    Key: { id }
  };
  
  try {
    await dynamoDb.delete(params).promise();
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*'
      },
      body: JSON.stringify({
        success: true,
        message: 'Communication deleted'
      })
    };
  } catch (error) {
    console.error('Error deleting communication:', error);
    throw error;
  }
}
