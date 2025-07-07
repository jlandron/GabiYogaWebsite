const crypto = require('crypto');
const AWS = require('aws-sdk');

const DEV_COOKIE_NAME = 'devAccessToken';
let DEV_COOKIE_SECRET = null;
let DEV_PASSWORD = null;

// Global flag to track initialization status
let secretsInitialized = false;

// Function to retrieve secret from SSM Parameter Store (more reliable than Secrets Manager for this use case)
const getSSMParameter = async (parameterName) => {
  if (!parameterName) {
    return null;
  }
  
  const ssm = new AWS.SSM({ region: process.env.REGION || 'us-east-1' });
  
  try {
    const response = await ssm.getParameter({
      Name: parameterName,
      WithDecryption: true
    }).promise();
    
    if (response.Parameter && response.Parameter.Value) {
      return response.Parameter.Value;
    }
  } catch (error) {
    // Handle case where parameter doesn't exist yet
    if (error.code === 'ParameterNotFound') {
      console.log(`Parameter ${parameterName} not found, will use default value and create it`);
    } else {
      console.error(`Error retrieving SSM parameter ${parameterName}:`, error);
    }
    return null;
  }
  
  return null;
};

// Function to create/update SSM Parameter
const setSSMParameter = async (parameterName, parameterValue) => {
  if (!parameterName || !parameterValue) {
    return false;
  }
  
  const ssm = new AWS.SSM({ region: process.env.REGION || 'us-east-1' });
  
  try {
    await ssm.putParameter({
      Name: parameterName,
      Value: parameterValue,
      Type: 'SecureString',
      Overwrite: true
    }).promise();
    
    console.log(`Successfully saved parameter ${parameterName}`);
    return true;
  } catch (error) {
    console.error(`Error saving SSM parameter ${parameterName}:`, error);
    return false;
  }
};

// Function to retrieve secret from AWS Secrets Manager (fallback)
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
  // Only initialize once per Lambda instance
  if (secretsInitialized) {
    console.log('Secrets already initialized in this Lambda instance');
    return;
  }
  
  console.log('Initializing secrets');
  
  // First try to get from SSM Parameter Store (faster and more reliable for this use case)
  try {
    // Cookie Secret
    const cookieSecretParam = await getSSMParameter('/GabiYoga/dev/cookieSecret');
    if (cookieSecretParam) {
      console.log('Cookie secret retrieved from Parameter Store');
      DEV_COOKIE_SECRET = cookieSecretParam;
    } else {
      // If the parameter doesn't exist, generate a default and save it
      const defaultCookieSecret = process.env.DEV_COOKIE_SECRET || 
                                 'f8e71f59b98e461aa0f962273491fd0e8173ad511ccf6716a4b9c392cf4e4bd9';
      
      DEV_COOKIE_SECRET = defaultCookieSecret;
      console.log('Using default cookie secret and storing in Parameter Store');
      
      // Save to Parameter Store for future Lambda instances
      await setSSMParameter('/GabiYoga/dev/cookieSecret', defaultCookieSecret);
    }
    
    // Password
    const passwordParam = await getSSMParameter('/GabiYoga/dev/password');
    if (passwordParam) {
      console.log('Password retrieved from Parameter Store');
      DEV_PASSWORD = passwordParam;
    } else {
      // If the parameter doesn't exist, generate a default and save it
      const defaultPassword = process.env.DEV_PASSWORD || 'change_me_please';
      
      DEV_PASSWORD = defaultPassword;
      console.log('Using default password and storing in Parameter Store');
      
      // Save to Parameter Store for future Lambda instances
      await setSSMParameter('/GabiYoga/dev/password', defaultPassword);
    }
    
    // Mark as initialized so we don't do it again in this Lambda instance
    secretsInitialized = true;
    console.log('Secrets initialized successfully:', { 
      passwordSet: !!DEV_PASSWORD, 
      cookieSecretSet: !!DEV_COOKIE_SECRET 
    });
    return;
  } catch (ssmError) {
    console.error('Error initializing secrets from SSM:', ssmError);
  }
  
  // Fallback to Secrets Manager if SSM fails
  try {
    const secretName = process.env.DEV_AUTH_SECRET_NAME;
    if (secretName) {
      console.log('Falling back to Secrets Manager');
      const secret = await getSecret(secretName);
      
      if (secret) {
        if (secret.cookieSecret) {
          DEV_COOKIE_SECRET = secret.cookieSecret;
          console.log('Cookie secret found in Secrets Manager');
        }
        
        if (secret.password) {
          DEV_PASSWORD = secret.password;
          console.log('Password found in Secrets Manager');
        }
      }
    }
  } catch (smError) {
    console.error('Error with Secrets Manager fallback:', smError);
  }
  
  // Final fallback to hard-coded defaults if everything else fails
  if (!DEV_PASSWORD) {
    DEV_PASSWORD = 'change_me_please';
    console.log('Using hard-coded default password as last resort');
  }
  
  if (!DEV_COOKIE_SECRET) {
    DEV_COOKIE_SECRET = 'f8e71f59b98e461aa0f962273491fd0e8173ad511ccf6716a4b9c392cf4e4bd9';
    console.log('Using hard-coded default cookie secret as last resort');
  }
  
  // Mark as initialized
  secretsInitialized = true;
  console.log('Secrets initialized with fallbacks:', { 
    passwordSet: !!DEV_PASSWORD, 
    cookieSecretSet: !!DEV_COOKIE_SECRET 
  });
};

// Expires in 24 hours (in seconds)
const COOKIE_EXPIRY = 24 * 60 * 60; 

// Function to generate a secure cookie value with HMAC signature
async function generateSecureCookie() {
  // Make sure secrets are initialized
  await initSecrets();
  
  const timestamp = Date.now();
  const payload = `${timestamp}`;
  
  console.log(`Generating cookie with secret: ${DEV_COOKIE_SECRET.substring(0, 5)}...`);
  
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

    console.log(`Cookie being verified: ${cookieValue?.substring(0, 10)}...`);

    // If no cookie provided, can't verify
    if (!cookieValue) {
      console.log('No cookie value provided for verification');
      return false;
    }

    const [timestamp, signature] = cookieValue.split('.');

    // Validate parts
    if (!timestamp || !signature) {
      console.log('Invalid cookie format - missing parts');
      return false;
    }

    // Validate signature using the SSM parameter cookie secret
    console.log(`Verifying with secret: ${DEV_COOKIE_SECRET.substring(0, 5)}...`);
    const expectedSignature = crypto.createHmac('sha256', DEV_COOKIE_SECRET)
      .update(timestamp)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.log('Cookie signature invalid');
      return false;
    }

    // Check if the cookie is expired (older than COOKIE_EXPIRY seconds)
    const timestampMs = parseInt(timestamp, 10);
    const now = Date.now();
    if (isNaN(timestampMs) || now - timestampMs > COOKIE_EXPIRY * 1000) {
      console.log('Cookie expired:', {
        cookieTimestamp: new Date(timestampMs).toISOString(),
        currentTime: new Date(now).toISOString(),
        ageSeconds: Math.floor((now - timestampMs) / 1000),
        maxAgeSeconds: COOKIE_EXPIRY
      });
      return false;
    }

    console.log('Cookie verification successful');
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
        
        // Generate cookie string without the Secure flag for dev environment
        // and use Lax SameSite to allow redirects to work properly
        const cookieString = `${DEV_COOKIE_NAME}=${cookieValue}; Path=/; HttpOnly; SameSite=Lax; Expires=${expiryDate.toUTCString()}; Domain=dev.gabi.yoga`;
        
        console.log('Setting cookie:', cookieString);
        
        // Return success with cookie
        return {
          statusCode: 200,
          headers: {
            ...headers,
            'Content-Type': 'application/json',
            'Set-Cookie': cookieString
          },
          body: JSON.stringify({ 
            success: true,
            message: 'Authentication successful. Redirecting back to your requested page.'
          })
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
