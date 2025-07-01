/**
 * Shared utilities for Lambda functions
 */

const AWS = require('aws-sdk');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Initialize AWS services
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const secretsManager = new AWS.SecretsManager();

// Cache for secrets to avoid repeated API calls
const secretsCache = new Map();

/**
 * Get secret from AWS Secrets Manager with caching
 */
async function getSecret(secretName) {
  if (secretsCache.has(secretName)) {
    return secretsCache.get(secretName);
  }

  try {
    const result = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
    const secret = JSON.parse(result.SecretString);
    secretsCache.set(secretName, secret);
    return secret;
  } catch (error) {
    console.error(`Error getting secret ${secretName}:`, error);
    throw error;
  }
}

/**
 * Get JWT secret
 */
async function getJWTSecret() {
  const jwtSecretName = process.env.JWT_SECRET_NAME;
  if (!jwtSecretName) {
    throw new Error('JWT_SECRET_NAME environment variable not set');
  }

  const secret = await getSecret(jwtSecretName);
  return secret.secret;
}

/**
 * Generate JWT token
 */
function generateToken(user, jwtSecret, expiresIn = '24h') {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role
    },
    jwtSecret,
    { expiresIn }
  );
}

/**
 * Verify JWT token
 */
function verifyToken(token, jwtSecret) {
  try {
    return jwt.verify(token, jwtSecret);
  } catch (error) {
    return null;
  }
}

/**
 * Hash password
 */
async function hashPassword(password) {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Compare password with hash
 */
async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Generate reset token
 */
function generateResetToken() {
  return uuidv4();
}

/**
 * Parse Lambda event body
 */
function parseEventBody(event) {
  try {
    return typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } catch (error) {
    console.error('Error parsing event body:', error);
    return null;
  }
}

/**
 * Create Lambda response
 */
function createResponse(statusCode, body, headers = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Methods': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token, Accept',
    'Access-Control-Allow-Credentials': 'true'
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
   * Update item in DynamoDB
   */
  async updateItem(tableName, key, updateExpression, expressionAttributeValues, expressionAttributeNames = {}) {
    try {
      const params = {
        TableName: tableName,
        Key: key,
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
      };

      if (Object.keys(expressionAttributeNames).length > 0) {
        params.ExpressionAttributeNames = expressionAttributeNames;
      }

      const result = await dynamoDb.update(params).promise();
      return result.Attributes;
    } catch (error) {
      console.error(`Error updating item in ${tableName}:`, error);
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
  },

  /**
   * Delete item from DynamoDB
   */
  async deleteItem(tableName, key) {
    try {
      await dynamoDb.delete({
        TableName: tableName,
        Key: key
      }).promise();
      
      return true;
    } catch (error) {
      console.error(`Error deleting item from ${tableName}:`, error);
      throw error;
    }
  }
};

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
function isValidPassword(password) {
  return password && password.length >= 8;
}

/**
 * Extract authorization token from event
 */
function extractAuthToken(event) {
  const authHeader = event.headers?.Authorization || event.headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

/**
 * Get user from token
 */
async function getUserFromToken(event) {
  const token = extractAuthToken(event);
  if (!token) {
    return null;
  }

  try {
    const jwtSecret = await getJWTSecret();
    const decoded = verifyToken(token, jwtSecret);
    if (!decoded) {
      return null;
    }

    // Get user from database to ensure they still exist
    const user = await dynamoUtils.getItem(process.env.USERS_TABLE, { id: decoded.id });
    return user;
  } catch (error) {
    console.error('Error getting user from token:', error);
    return null;
  }
}

/**
 * Check if user has admin role
 */
function isAdmin(user) {
  return user && user.role === 'admin';
}

module.exports = {
  getSecret,
  getJWTSecret,
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
  generateResetToken,
  parseEventBody,
  createResponse,
  createSuccessResponse,
  createErrorResponse,
  logWithContext,
  dynamoUtils,
  isValidEmail,
  isValidPassword,
  extractAuthToken,
  getUserFromToken,
  isAdmin
};
