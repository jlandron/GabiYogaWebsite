/**
 * Dev Environment Authentication
 * Provides authentication for the development environment only
 */

const { createResponse } = require('../static/utils');
const crypto = require('crypto');
const AWS = require('aws-sdk');

// Constants
const DEV_COOKIE_NAME = 'devAccessToken';
const COOKIE_MAX_AGE = 24 * 60 * 60; // 24 hours in seconds
const SSM_PASSWORD_PATH = '/GabiYoga/dev/password';
const SSM_COOKIE_SECRET_PATH = '/GabiYoga/dev/cookieSecret';

// Default fallback values (only used if SSM params are not available)
const DEFAULT_PASSWORD = 'change_me_please';
const DEFAULT_COOKIE_SECRET = crypto.randomBytes(32).toString('hex');

// SSM Parameter Store client
const ssm = new AWS.SSM();

// Cache for SSM parameters to reduce API calls
let paramCache = {
  password: null,
  cookieSecret: null,
  lastFetched: 0
};

/**
 * Get parameter from SSM Parameter Store with caching
 */
async function getParameter(parameterName) {
  try {
    // Check if cache is valid (less than 5 minutes old)
    const now = Date.now();
    if (now - paramCache.lastFetched < 5 * 60 * 1000) {
      if (parameterName === SSM_PASSWORD_PATH && paramCache.password) {
        console.log(`Using cached parameter for ${parameterName}`);
        return paramCache.password;
      }
      if (parameterName === SSM_COOKIE_SECRET_PATH && paramCache.cookieSecret) {
        console.log(`Using cached parameter for ${parameterName}`);
        return paramCache.cookieSecret;
      }
    }

    console.log(`Fetching parameter: ${parameterName}`);
    try {
      const response = await ssm.getParameter({
        Name: parameterName,
        WithDecryption: true
      }).promise();

      console.log(`Successfully fetched parameter: ${parameterName}`);
      
      // Update cache
      if (parameterName === SSM_PASSWORD_PATH) {
        paramCache.password = response.Parameter.Value;
      } else if (parameterName === SSM_COOKIE_SECRET_PATH) {
        paramCache.cookieSecret = response.Parameter.Value;
      }
      paramCache.lastFetched = now;

      return response.Parameter.Value;
    } catch (ssmError) {
      console.error(`SSM Error (${ssmError.code}): ${ssmError.message}`);
      
      // Fall through to the default values
      if (ssmError.code === 'ParameterNotFound') {
        console.log(`Parameter ${parameterName} not found in SSM`);
      } else if (ssmError.code === 'AccessDeniedException') {
        console.log(`Access denied to parameter ${parameterName}`);
      }
      
      throw ssmError; // Re-throw to be caught by outer try/catch
    }
  } catch (error) {
    console.error(`Error in getParameter for ${parameterName}:`, error.message);
    console.error('Error stack:', error.stack);
    
    // Return default values as fallback
    if (parameterName === SSM_PASSWORD_PATH) {
      console.log('Using default password');
      return DEFAULT_PASSWORD;
    } else if (parameterName === SSM_COOKIE_SECRET_PATH) {
      console.log('Using default cookie secret');
      return DEFAULT_COOKIE_SECRET;
    }
    
    throw error;
  }
}

/**
 * Create a signed authentication cookie
 */
async function createAuthCookie(timestamp = Date.now()) {
  // Get the cookie secret from SSM
  const cookieSecret = await getParameter(SSM_COOKIE_SECRET_PATH);
  
  // Create cookie payload with timestamp
  const payload = `${timestamp}`;
  
  // Create HMAC signature
  const hmac = crypto.createHmac('sha256', cookieSecret);
  hmac.update(payload);
  const signature = hmac.digest('hex');
  
  // Return the cookie value
  return `${payload}.${signature}`;
}

/**
 * Verify a cookie value
 */
async function verifyCookie(cookieValue) {
  try {
    // Get the cookie secret from SSM
    const cookieSecret = await getParameter(SSM_COOKIE_SECRET_PATH);
    
    // Split the cookie value into payload and signature
    const [payload, signature] = cookieValue.split('.');
    
    // If either part is missing, the cookie is invalid
    if (!payload || !signature) {
      console.log('Invalid cookie format');
      return false;
    }
    
    // Create expected signature
    const hmac = crypto.createHmac('sha256', cookieSecret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');
    
    // Compare signatures
    if (signature !== expectedSignature) {
      console.log('Cookie signature invalid');
      return false;
    }
    
    // Check timestamp
    const timestamp = parseInt(payload, 10);
    const now = Date.now();
    
    // Ensure timestamp is a valid number
    if (isNaN(timestamp)) {
      console.log('Invalid timestamp in cookie');
      return false;
    }
    
    // Check if cookie is expired (24 hours)
    if (now - timestamp > COOKIE_MAX_AGE * 1000) {
      console.log('Cookie expired');
      return false;
    }
    
    // Cookie is valid
    return true;
  } catch (error) {
    console.error('Error verifying cookie:', error);
    return false;
  }
}

/**
 * Handler for dev-auth endpoint
 */
exports.handler = async (event, context) => {
  console.log('Dev auth request:', {
    requestId: context.awsRequestId,
    path: event.path,
    httpMethod: event.httpMethod,
    region: process.env.AWS_REGION
  });
  
  // Log the environment for debugging
  console.log('Environment variables:', {
    stage: process.env.STAGE,
    region: process.env.AWS_REGION,
    // Redact any sensitive info
    hasCredentials: !!process.env.AWS_ACCESS_KEY_ID
  });

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(200, '', {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return createResponse(405, JSON.stringify({ success: false, message: 'Method not allowed' }), {
      'Content-Type': 'application/json'
    });
  }

  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { password } = body;
    
    console.log('Received login request');
    
    // Verify password
    console.log('Verifying password...');
    const correctPassword = await getParameter(SSM_PASSWORD_PATH);
    console.log('Password verification complete');
    
    if (!password || password !== correctPassword) {
      console.log('Invalid password attempt');
      return createResponse(401, JSON.stringify({ success: false, message: 'Authentication failed' }), {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      });
    }
    
    // Create authentication cookie
    const cookieValue = await createAuthCookie();
    
    // Return success with cookie
    return createResponse(200, JSON.stringify({ success: true }), {
      'Content-Type': 'application/json',
      'Set-Cookie': `${DEV_COOKIE_NAME}=${cookieValue}; Path=/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; SameSite=Strict`,
      'Cache-Control': 'no-store'
    });
  } catch (error) {
    console.error('Dev auth error:', error);
    return createResponse(500, JSON.stringify({ success: false, message: 'Internal server error' }), {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    });
  }
};

// Export constants and functions for use in other modules
exports.DEV_COOKIE_NAME = DEV_COOKIE_NAME;
exports.verifyCookie = verifyCookie;
