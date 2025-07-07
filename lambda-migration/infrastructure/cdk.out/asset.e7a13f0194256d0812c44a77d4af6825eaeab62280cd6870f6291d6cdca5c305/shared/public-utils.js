/**
 * Lightweight utilities for public Lambda functions
 * Only includes functions needed for public endpoints (no auth dependencies)
 */

const AWS = require('aws-sdk');
// Import functions from the main utils file
const { isAdminUser, getUserFromToken } = require('./utils');

// Initialize AWS services
const dynamoDb = new AWS.DynamoDB.DocumentClient();

/**
 * Create Lambda response
 */
function createResponse(statusCode, body, headers = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Methods': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token'
  };

  return {
    statusCode,
    headers: { ...defaultHeaders, ...headers },
    body: JSON.stringify(body)
  };
}

/**
 * Create success response
 */
function createSuccessResponse(data, statusCode = 200) {
  return createResponse(statusCode, {
    success: true,
    ...data
  });
}

/**
 * Create error response
 */
function createErrorResponse(message, statusCode = 400, details = null) {
  const body = {
    success: false,
    message
  };

  if (details) {
    body.details = details;
  }

  return createResponse(statusCode, body);
}

/**
 * Log with context
 */
function logWithContext(level, message, context = {}) {
  const logData = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context
  };
  
  console[level] = console[level] || console.log;
  console[level](JSON.stringify(logData));
}

/**
 * DynamoDB utilities
 */
const dynamoUtils = {
  /**
   * Get item from DynamoDB
   */
  async getItem(tableName, key) {
    try {
      const result = await dynamoDb.get({
        TableName: tableName,
        Key: key
      }).promise();
      
      return result.Item;
    } catch (error) {
      console.error(`Error getting item from ${tableName}:`, error);
      throw error;
    }
  },

  /**
   * Put item to DynamoDB
   */
  async putItem(tableName, item) {
    try {
      await dynamoDb.put({
        TableName: tableName,
        Item: item
      }).promise();
      
      return item;
    } catch (error) {
      console.error(`Error putting item to ${tableName}:`, error);
      throw error;
    }
  },

  /**
   * Query items from DynamoDB
   */
  async queryItems(tableName, indexName, keyConditionExpression, expressionAttributeValues, expressionAttributeNames = {}) {
    try {
      const params = {
        TableName: tableName,
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeValues: expressionAttributeValues
      };

      if (indexName) {
        params.IndexName = indexName;
      }

      if (Object.keys(expressionAttributeNames).length > 0) {
        params.ExpressionAttributeNames = expressionAttributeNames;
      }

      const result = await dynamoDb.query(params).promise();
      return result.Items;
    } catch (error) {
      console.error(`Error querying items from ${tableName}:`, error);
      throw error;
    }
  }
};

/**
 * Validate token and return user if valid
 */
async function validateToken(authHeader) {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return getUserFromToken({ headers: { Authorization: authHeader } });
}

module.exports = {
  createResponse,
  createSuccessResponse,
  createErrorResponse,
  logWithContext,
  dynamoUtils,
  isAdminUser,
  validateToken,
  getUserFromToken  // Export the getUserFromToken function
};
