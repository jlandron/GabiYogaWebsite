const crypto = require('crypto');
const AWS = require('aws-sdk');

const DEV_COOKIE_NAME = 'devAccessToken';
let DEV_COOKIE_SECRET = null;
let DEV_PASSWORD = null;

// Function to retrieve secret from AWS Secrets Manager
const getSecret = async (secretName) => {
  if (!secretName) {
    return null;
  }
  
  const secretsManager = new AWS.SecretsManager({ region: process.env.REGION || 'us-east-1' });
  
  try {
    const data = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
    if (data.SecretString) {
      return JSON.parse(data.SecretString);
    }
  } catch (error) {
    console.error(`Error retrieving secret ${secretName}:`, error);
    return null;
  }
  return null;
};

// Initialize secrets
const initSecrets = async () => {
  // Only initialize once
  if (DEV_COOKIE_SECRET && DEV_PASSWORD) {
    return;
  }
  
  // Try to get from Secrets Manager
  const secretName = process.env.DEV_AUTH_SECRET_NAME;
  if (secretName) {
    try {
      const secret = await getSecret(secretName);
      if (secret) {
        DEV_COOKIE_SECRET = secret.cookieSecret;
        DEV_PASSWORD = secret.password;
        return;
      }
    } catch (error) {
      console.error('Error initializing secrets:', error);
    }
  }
  
  // Fallback to environment variables or defaults
  DEV_PASSWORD = process.env.DEV_PASSWORD || 'change_me_please';
  DEV_COOKIE_SECRET = process.env.DEV_COOKIE_SECRET || 'f8e71f59b98e461aa0f962273491fd0e8173ad511ccf6716a4b9c392cf4e4bd9';
};

// Expires in 24 hours (in seconds)
const COOKIE_EXPIRY = 24 * 60 * 60; 

// Function to generate a secure cookie value with HMAC signature
async function generateSecureCookie() {
  // Make sure secrets are initialized
  await initSecrets();
  
  const timestamp = Date.now();
  const payload = `${timestamp}`;
  const hmac = crypto.createHmac('sha256', DEV_COOKIE_SECRET)
    .update(payload)
    .digest('hex');
  return `${payload}.${hmac}`;
}

// Function to verify a cookie value
async function verifyCookie(cookieValue) {
  try {
    // Make sure secrets are initialized
    await initSecrets();
    
    const [timestamp, signature] = cookieValue.split('.');
    
    // Validate signature
    const expectedSignature = crypto.createHmac('sha256', DEV_COOKIE_SECRET)
      .update(timestamp)
      .digest('hex');
    
    if (signature !== expectedSignature) {
      return false;
    }
    
    // Check if the cookie is expired (older than COOKIE_EXPIRY seconds)
    const timestampMs = parseInt(timestamp, 10);
    const now = Date.now();
    if (isNaN(timestampMs) || now - timestampMs > COOKIE_EXPIRY * 1000) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Cookie verification error:', error);
    return false;
  }
}

exports.handler = async (event) => {
  console.log('Dev auth request:', event.httpMethod);
  
  // Initialize secrets
  await initSecrets();
  
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  
  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }
  
  // Handle POST request for authentication
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      const password = body.password;
      
      // Check if password matches
      if (password === DEV_PASSWORD) {
        // Generate secure cookie
        const cookieValue = await generateSecureCookie();
        
        // Calculate expiry date for the Set-Cookie header
        const expiryDate = new Date();
        expiryDate.setTime(expiryDate.getTime() + (COOKIE_EXPIRY * 1000));
        
        // Return success with cookie
        return {
          statusCode: 200,
          headers: {
            ...headers,
            'Content-Type': 'application/json',
            'Set-Cookie': `${DEV_COOKIE_NAME}=${cookieValue}; Path=/; HttpOnly; Secure; SameSite=Strict; Expires=${expiryDate.toUTCString()}`
          },
          body: JSON.stringify({ success: true })
        };
      } else {
        // Return failure
        return {
          statusCode: 403,
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ success: false, message: 'Invalid password' })
        };
      }
    } catch (error) {
      console.error('Error in dev authentication:', error);
      
      // Return error
      return {
        statusCode: 500,
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ success: false, message: 'Server error' })
      };
    }
  }
  
  // If not a POST or OPTIONS request, return method not allowed
  return {
    statusCode: 405,
    headers: {
      ...headers,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ success: false, message: 'Method not allowed' })
  };
};

// Export the helper functions for use in other modules
exports.verifyCookie = verifyCookie;
exports.DEV_COOKIE_NAME = DEV_COOKIE_NAME;
