/**
 * AWS Systems Manager Parameter Store utility for retrieving SMTP password
 * Used by WorkMail email service configuration
 */

const AWS = require('aws-sdk');

// Initialize SSM client
const ssm = new AWS.SSM({
  region: process.env.AWS_REGION || 'us-east-1'
});

/**
 * Retrieve SMTP password from AWS Systems Manager Parameter Store
 * @param {string} parameterName - Name of the parameter in SSM
 * @returns {Promise<string>} SMTP password
 */
async function getSmtpPassword(parameterName = '/gabi-yoga/workmail/smtp-password') {
  try {
    console.log(`Retrieving SMTP password from SSM parameter: ${parameterName}`);
    
    const result = await ssm.getParameter({
      Name: parameterName,
      WithDecryption: true
    }).promise();
    
    if (!result.Parameter || !result.Parameter.Value) {
      throw new Error('Parameter value is empty or not found');
    }
    
    return result.Parameter.Value;
    
  } catch (error) {
    console.error('Error retrieving SMTP password from SSM:', error.message);
    throw new Error(`Failed to get SMTP password: ${error.message}`);
  }
}

/**
 * Get SMTP configuration using environment variables and SSM password
 * @returns {Promise<Object>} SMTP configuration object
 */
async function getSmtpCredentials() {
  try {
    const region = process.env.AWS_REGION || 'us-east-1';
    
    // Get password from SSM
    const password = await getSmtpPassword();
    
    // Get other values from environment variables with defaults
    const config = {
      host: process.env.SMTP_HOST || `smtp.mail.${region}.awsapps.com`,
      port: parseInt(process.env.SMTP_PORT || '465', 10),
      secure: process.env.SMTP_SECURE !== 'false', // Default to true for SSL
      username: process.env.SMTP_USER || process.env.FROM_EMAIL || 'noreply@gabi.yoga',
      password: password
    };
    
    // Validate configuration
    if (!config.username || !config.password) {
      throw new Error('Missing required SMTP configuration: username or password');
    }
    
    return config;
    
  } catch (error) {
    console.error('Error building SMTP credentials:', error.message);
    throw new Error(`Failed to get SMTP credentials: ${error.message}`);
  }
}

/**
 * Store SMTP password in AWS Systems Manager Parameter Store
 * @param {string} password - SMTP password to store
 * @param {string} parameterName - Name of the parameter in SSM
 * @returns {Promise<Object>} Result of the operation
 */
async function storeSmtpPassword(password, parameterName = '/gabi-yoga/workmail/smtp-password') {
  try {
    // Try to update existing parameter first
    try {
      await ssm.putParameter({
        Name: parameterName,
        Value: password,
        Type: 'SecureString',
        Description: 'SMTP password for Gabi Yoga WorkMail integration',
        Overwrite: true
      }).promise();
      
      console.log(`Successfully updated SSM parameter: ${parameterName}`);
      return { action: 'updated', parameter: parameterName };
      
    } catch (error) {
      console.error('Error storing SMTP password in SSM:', error.message);
      throw new Error(`Failed to store SMTP password: ${error.message}`);
    }
    
  } catch (error) {
    console.error('Error storing SMTP password in SSM:', error.message);
    throw new Error(`Failed to store SMTP password: ${error.message}`);
  }
}

/**
 * Test connection to SSM and validate parameter access
 * @param {string} parameterName - Name of the parameter to test
 * @returns {Promise<Object>} Test results
 */
async function testSsmConnection(parameterName = '/gabi-yoga/workmail/smtp-password') {
  try {
    const credentials = await getSmtpCredentials();
    
    return {
      success: true,
      message: 'Successfully retrieved and validated SMTP credentials',
      credentials: {
        host: credentials.host,
        port: credentials.port,
        secure: credentials.secure,
        username: credentials.username,
        passwordSet: !!credentials.password
      }
    };
    
  } catch (error) {
    return {
      success: false,
      message: error.message,
      credentials: null
    };
  }
}

module.exports = {
  getSmtpCredentials,
  getSmtpPassword,
  storeSmtpPassword,
  testSsmConnection
};
