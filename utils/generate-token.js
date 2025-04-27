#!/usr/bin/env node

/**
 * JWT Token Generator
 * 
 * A utility to generate JWT tokens on demand for testing and development.
 * Usage:
 *   node generate-token.js --id <user_id> --email <email> --role <role>
 * 
 * Additional options:
 *   --expiry <time>  Override the default JWT expiry time (e.g., "1h", "7d")
 *   --secret <key>   Override the JWT secret from .env (not recommended)
 */

require('dotenv').config();
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

// Get arguments
const args = process.argv.slice(2);
const params = {};

// Parse command line arguments
for (let i = 0; i < args.length; i += 2) {
  if (args[i].startsWith('--')) {
    const key = args[i].slice(2);
    const value = args[i + 1];
    params[key] = value;
  }
}

// Get JWT secret from environment variable
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('ERROR: JWT_SECRET environment variable is not set!');
  console.error('Please set JWT_SECRET in your .env file');
  process.exit(1);
}

// Override JWT secret if provided (not recommended for production)
if (params.secret) {
  JWT_SECRET = params.secret;
  console.warn('\nWARNING: Using custom JWT secret instead of .env configuration\n');
}

// Get JWT expiry from environment variable or override
const JWT_EXPIRY = params.expiry || process.env.JWT_EXPIRY || '24h';

// Validate required parameters
if (!params.id || !params.email || !params.role) {
  console.error('\nERROR: Missing required parameters');
  console.log('\nUsage:');
  console.log('  node generate-token.js --id <user_id> --email <email> --role <role>');
  console.log('\nAdditional options:');
  console.log('  --expiry <time>  Override the default JWT expiry time (e.g., "1h", "7d")');
  console.log('  --secret <key>   Override the JWT secret from .env (not recommended)');
  console.log('\nExample:');
  console.log('  node generate-token.js --id 123 --email admin@example.com --role admin --expiry 7d');
  process.exit(1);
}

// Prepare the payload
const payload = {
  id: params.id,
  email: params.email,
  role: params.role
};

try {
  // Generate JWT token
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });

  // Display the token and decoded information
  console.log('\n===== JWT Token Generated Successfully =====');
  console.log('\nToken:');
  console.log(token);
  
  // Decode the token to show payload (without verification)
  const decoded = jwt.decode(token);
  
  console.log('\nDecoded Payload:');
  console.log(JSON.stringify(decoded, null, 2));
  
  console.log('\nExpires At:');
  console.log(new Date(decoded.exp * 1000).toLocaleString());
  
  console.log('\nUse with API:');
  console.log('Authorization: Bearer ' + token);
  console.log('\n=========================================');

} catch (error) {
  console.error('Error generating token:', error.message);
  process.exit(1);
}
