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

// Default fallback values (only used if environment variables are not available)
const DEFAULT_PASSWORD = 'change_me_please';
const DEFAULT_COOKIE_SECRET = crypto.randomBytes(32).toString('hex');

// Log environment information for debugging
console.log('Environment:', {
  stage: process.env.STAGE,
  region: process.env.AWS_REGION || process.env.REGION,
  hasDevPassword: !!process.env.DEV_PASSWORD,
  hasDevCookieSecret: !!process.env.DEV_COOKIE_SECRET
});

/**
 * Get parameter value from environment variables or use default
 */
function getParameter(paramType) {
  try {
    console.log(`Getting parameter for: ${paramType}`);
    
    if (paramType === 'password') {
      // Check environment variable first
      if (process.env.DEV_PASSWORD) {
        console.log('Using password from environment variable');
        return process.env.DEV_PASSWORD;
      }
      
      // Fall back to default
      console.log('Using default password');
      return DEFAULT_PASSWORD;
    } else if (paramType === 'cookieSecret') {
      // Check environment variable first
      if (process.env.DEV_COOKIE_SECRET) {
        console.log('Using cookie secret from environment variable');
        return process.env.DEV_COOKIE_SECRET;
      }
      
      // Fall back to default
      console.log('Using default cookie secret');
      return DEFAULT_COOKIE_SECRET;
    } else {
      console.log(`Unknown parameter type: ${paramType}`);
      return null;
    }
  } catch (error) {
    console.error(`Unexpected error in getParameter: ${error.message}`);
    
    // Final fallback
    console.log('Using default value after error');
    if (paramType === 'password') {
      return DEFAULT_PASSWORD;
    } else {
      return DEFAULT_COOKIE_SECRET;
    }
  }
}

/**
 * Create a signed authentication cookie
 */
function createAuthCookie(timestamp = Date.now()) {
  // Get the cookie secret
  const cookieSecret = getParameter('cookieSecret');
  
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
function verifyCookie(cookieValue) {
  try {
    // Get the cookie secret
    const cookieSecret = getParameter('cookieSecret');
    
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
    hasDevPassword: !!process.env.DEV_PASSWORD,
    hasDevCookieSecret: !!process.env.DEV_COOKIE_SECRET
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
    const correctPassword = getParameter('password');
    console.log('Password verification complete');
    
    if (!password || password !== correctPassword) {
      console.log('Invalid password attempt');
      return createResponse(401, JSON.stringify({ success: false, message: 'Authentication failed' }), {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      });
    }
    
    // Create authentication cookie
    const cookieValue = createAuthCookie();
    
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
