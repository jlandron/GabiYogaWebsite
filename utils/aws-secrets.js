/**
 * AWS Secrets Manager utility functions
 * 
 * This module provides functions to retrieve secrets from AWS Secrets Manager.
 * It can be used to get database credentials, SMTP credentials, and other sensitive information.
 */

const AWS = require('aws-sdk');
const logger = require('./logger');

// Cache for retrieved secrets to minimize API calls
const secretsCache = new Map();

/**
 * Get a secret from AWS Secrets Manager
 * 
 * @param {string} secretName - The name or ARN of the secret to retrieve
 * @param {number} cacheTimeSeconds - How long to cache the secret in seconds (default: 3600)
 * @returns {Promise<object>} - The parsed secret value as an object
 */
async function getSecret(secretName, cacheTimeSeconds = 3600) {
  // Check cache first
  const now = Date.now();
  const cachedItem = secretsCache.get(secretName);
  
  if (cachedItem && (now - cachedItem.timestamp) < (cacheTimeSeconds * 1000)) {
    logger.debug(`Using cached secret for ${secretName}`);
    return cachedItem.value;
  }
  
  try {
    // Initialize AWS Secrets Manager client
    const client = new AWS.SecretsManager({
      region: process.env.AWS_REGION || 'us-west-2'
    });

    logger.info(`Retrieving secret from AWS Secrets Manager: ${secretName}`);
    const data = await client.getSecretValue({ SecretId: secretName }).promise();
    let secretValue;
    
    // Parse secret value based on its format
    if (data.SecretString) {
      secretValue = JSON.parse(data.SecretString);
    } else {
      const buff = Buffer.from(data.SecretBinary, 'base64');
      secretValue = JSON.parse(buff.toString('ascii'));
    }
    
    // Cache the result
    secretsCache.set(secretName, {
      timestamp: now,
      value: secretValue
    });
    
    return secretValue;
  } catch (error) {
    logger.error(`Error retrieving secret ${secretName}:`, error);
    throw new Error(`Failed to retrieve ${secretName} from AWS Secrets Manager: ${error.message}`);
  }
}

/**
 * Get SMTP credentials for email sending
 * 
 * @returns {Promise<object>} - SMTP credentials with host, port, secure, username and password
 */
async function getSmtpCredentials() {
  // Define the possible secret names, starting with the most preferred one
  const secretNames = [
    process.env.SMTP_SECRET_NAME,                 // First try env var
    'gabi-yoga-work-mail-smtp-credentials',       // New format with hyphen
    'gabi-yoga-workmail-smtp-credentials'         // Legacy format without hyphen
  ].filter(Boolean); // Filter out undefined values
  
  // Try each secret name in order
  for (const secretName of secretNames) {
    try {
      logger.info(`Trying to retrieve SMTP credentials from secret: ${secretName}`);
      return await getSecret(secretName);
    } catch (error) {
      logger.warn(`Could not retrieve SMTP credentials from ${secretName}:`, error.message);
      // Continue to next secret name
    }
  }
  
  // If all attempts fail, use environment variables
  logger.warn('All attempts to retrieve SMTP credentials from Secrets Manager failed. Using environment variables.');
  return {
    host: process.env.SMTP_HOST || `smtp.mail.${process.env.AWS_REGION || 'us-west-2'}.awsapps.com`,
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: process.env.SMTP_SECURE !== 'false',
    username: process.env.SMTP_USER || process.env.EMAIL_FROM || 'noreply@gabi.yoga',
    password: process.env.SMTP_PASS || ''
  };
}

/**
 * Get database credentials for database connections
 * 
 * @returns {Promise<object>} - Database credentials with username and password
 */
async function getDatabaseCredentials() {
  try {
    // The secret name should match what's defined in your infrastructure
    const secretName = process.env.DB_SECRET_NAME || 'gabi-yoga-db-credentials';
    
    return await getSecret(secretName);
  } catch (error) {
    logger.error('Could not retrieve database credentials:', error);
    
    // Database operations will fail without valid credentials,
    // so we don't provide fallback values
    throw error;
  }
}

module.exports = {
  getSecret,
  getSmtpCredentials,
  getDatabaseCredentials
};
