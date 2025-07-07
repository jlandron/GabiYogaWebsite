#!/usr/bin/env node

/**
 * Interactive JWT Token Generator
 * 
 * A user-friendly wrapper for the JWT token generator
 * This script provides an interactive prompt for generating JWT tokens
 * if arguments are not provided.
 * 
 * Usage:
 *   node token-generator.js
 *   
 * Or with direct arguments:
 *   node token-generator.js 123 admin@example.com admin 48h
 */

const { execSync } = require('child_process');
const readline = require('readline');

// Create readline interface for interactive mode
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to prompt for input
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Function to generate token using the main generator script
function generateToken(id, email, role, expiry) {
  const command = `node ${__dirname}/generate-token.js --id "${id}" --email "${email}" --role "${role}"${expiry ? ` --expiry "${expiry}"` : ''}`;
  
  try {
    return execSync(command, { encoding: 'utf8' });
  } catch (error) {
    console.error('Error generating token:', error.message);
    process.exit(1);
  }
}

// Main function
async function main() {
  console.log('🔑 Interactive JWT Token Generator\n');
  
  // If arguments are provided, use them directly
  if (process.argv.length >= 5) {
    const id = process.argv[2];
    const email = process.argv[3];
    const role = process.argv[4];
    const expiry = process.argv[5] || undefined;
    
    console.log(`Generating token for: ID=${id}, Email=${email}, Role=${role}${expiry ? `, Expiry=${expiry}` : ''}`);
    console.log(generateToken(id, email, role, expiry));
    
    process.exit(0);
  }
  
  // Interactive mode
  console.log('Enter the following information to generate a JWT token:');
  
  const id = await prompt('User ID: ');
  if (!id) {
    console.error('Error: User ID cannot be empty');
    process.exit(1);
  }
  
  const email = await prompt('Email address: ');
  if (!email) {
    console.error('Error: Email cannot be empty');
    process.exit(1);
  }
  
  const role = await prompt('User role (admin/user/etc): ');
  if (!role) {
    console.error('Error: Role cannot be empty');
    process.exit(1);
  }
  
  const useCustomExpiry = await prompt('Use custom expiration time? (y/N): ');
  
  let expiry;
  if (useCustomExpiry.toLowerCase() === 'y' || useCustomExpiry.toLowerCase() === 'yes') {
    expiry = await prompt('Expiration time (e.g., 1h, 7d): ');
  }
  
  console.log('\nGenerating token...\n');
  console.log(generateToken(id, email, role, expiry));
  
  rl.close();
}

// Start the program
main().catch(console.error);
