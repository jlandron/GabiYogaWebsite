/**
 * AWS JWT Secret Loader
 * 
 * Automatically fetches JWT_SECRET from AWS Secrets Manager at server startup.
 * This ensures all server instances use the same JWT secret without manual intervention.
 */

const AWS = require('aws-sdk');
const logger = require('./logger');

/**
 * Fetches JWT_SECRET from AWS Secrets Manager
 * Falls back to environment variable if AWS is not available
 * @returns Promise<string> JWT secret
 */
async function getJWTSecret() {
  const secretName = process.env.JWT_SECRET_NAME || 'gabi-yoga-jwt-secret';
  const region = process.env.AWS_REGION || 'us-west-2';
  
  // Always try AWS Secrets Manager first in all environments
  // We will fall back to environment variable later if AWS fails
  logger.info('Attempting to fetch JWT_SECRET from AWS Secrets Manager first...');
  
  try {
    logger.info(`Fetching JWT_SECRET from AWS Secrets Manager: ${secretName}`);
    
    const secretsManager = new AWS.SecretsManager({ region });
    
    const params = {
      SecretId: secretName
    };
    
    const result = await secretsManager.getSecretValue(params).promise();
    
    if (!result.SecretString) {
      throw new Error('Secret value is empty');
    }
    
    // Parse the secret JSON to get the actual JWT secret
    const secretData = JSON.parse(result.SecretString);
    const jwtSecret = secretData.secret;
    
    if (!jwtSecret) {
      throw new Error('JWT secret not found in secret data');
    }
    
    logger.info('Successfully retrieved JWT_SECRET from AWS Secrets Manager');
    return jwtSecret;
    
  } catch (error) {
    logger.warn('Failed to get JWT_SECRET from AWS Secrets Manager:', {
      error: error.message,
      secretName,
      region
    });
    
    // Fallback to environment variable
    const envSecret = process.env.JWT_SECRET;
    if (envSecret) {
      logger.warn('Using fallback JWT_SECRET from environment variable');
      return envSecret;
    }
    
    // If no secret is available, generate a temporary one and warn
    logger.error('No JWT_SECRET available from AWS or environment!');
    throw new Error('JWT_SECRET not found in AWS Secrets Manager or environment variables');
  }
}

/**
 * Ensures JWT_SECRET exists in AWS Secrets Manager
 * Creates it if it doesn't exist
 * @param {string} secret - The JWT secret to store
 */
async function ensureJWTSecretInAWS(secret) {
  const secretName = process.env.JWT_SECRET_NAME || 'gabi-yoga-jwt-secret';
  const region = process.env.AWS_REGION || 'us-west-2';
  
  try {
    const secretsManager = new AWS.SecretsManager({ region });
    
    // Check if secret exists
    try {
      await secretsManager.getSecretValue({ SecretId: secretName }).promise();
      logger.info('JWT_SECRET already exists in AWS Secrets Manager');
      return;
    } catch (error) {
      if (error.code !== 'ResourceNotFoundException') {
        throw error;
      }
    }
    
    // Create the secret
    logger.info(`Creating JWT_SECRET in AWS Secrets Manager: ${secretName}`);
    
    await secretsManager.createSecret({
      Name: secretName,
      Description: 'JWT Secret for Yoga App Authentication',
      SecretString: JSON.stringify({
        description: 'JWT secret for authentication',
        secret: secret
      }),
      Tags: [
        {
          Key: 'Application',
          Value: 'yoga-app'
        },
        {
          Key: 'Environment',
          Value: process.env.NODE_ENV || 'production'
        }
      ]
    }).promise();
    
    logger.info('Successfully created JWT_SECRET in AWS Secrets Manager');
    
  } catch (error) {
    logger.error('Failed to create JWT_SECRET in AWS Secrets Manager:', {
      error: error.message,
      secretName,
      region
    });
    throw error;
  }
}

/**
 * Generates a cryptographically secure JWT secret
 * @returns {string} Secure JWT secret
 */
function generateSecureJWTSecret() {
  const crypto = require('crypto');
  return crypto.randomBytes(64).toString('hex');
}

/**
 * Initializes JWT secret for the application
 * This function should be called at server startup
 * @returns {Promise<string>} JWT secret
 */
async function initializeJWTSecret() {
  try {
    // Try to get existing secret from AWS
    const secret = await getJWTSecret();
    
    // Validate secret strength
    if (secret.length < 32) {
      logger.warn('JWT_SECRET is too short, should be at least 32 characters');
    }
    
    logger.info('JWT_SECRET initialized successfully', {
      source: 'AWS Secrets Manager',
      length: secret.length
    });
    
    return secret;
    
  } catch (error) {
    logger.error('Failed to initialize JWT_SECRET:', error.message);
    
    // In production, we should not continue without a proper secret
    if (process.env.NODE_ENV === 'production') {
      logger.error('Cannot start server without JWT_SECRET in production');
      throw new Error('JWT_SECRET initialization failed in production environment');
    }
    
    // For development, generate a temporary secret
    logger.warn('Generating temporary JWT_SECRET for development');
    const tempSecret = generateSecureJWTSecret();
    
    // Try to store it in AWS for future use
    try {
      await ensureJWTSecretInAWS(tempSecret);
    } catch (awsError) {
      logger.warn('Could not store temporary secret in AWS:', awsError.message);
    }
    
    return tempSecret;
  }
}

module.exports = {
  getJWTSecret,
  ensureJWTSecretInAWS,
  generateSecureJWTSecret,
  initializeJWTSecret
};
