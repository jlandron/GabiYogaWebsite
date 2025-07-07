const crypto = require('crypto');

// Get the dev password from environment variable (set in CDK)
const DEV_PASSWORD = process.env.DEV_PASSWORD || 'change_me_please';
const DEV_COOKIE_NAME = 'devAccessToken';
// Use a fixed secret for cookie signing to avoid invalidating cookies on Lambda cold starts
// In production code, this should be retrieved from Secrets Manager or Parameter Store
const DEV_COOKIE_SECRET = process.env.DEV_COOKIE_SECRET || 'f8e71f59b98e461aa0f962273491fd0e8173ad511ccf6716a4b9c392cf4e4bd9';

// Expires in 24 hours (in seconds)
const COOKIE_EXPIRY = 24 * 60 * 60; 

// Function to generate a secure cookie value with HMAC signature
function generateSecureCookie() {
  const timestamp = Date.now();
  const payload = `${timestamp}`;
  const hmac = crypto.createHmac('sha256', DEV_COOKIE_SECRET)
    .update(payload)
    .digest('hex');
  return `${payload}.${hmac}`;
}

// Function to verify a cookie value
function verifyCookie(cookieValue) {
  try {
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
        const cookieValue = generateSecureCookie();
        
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
