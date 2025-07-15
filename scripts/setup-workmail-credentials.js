#!/usr/bin/env node

/**
 * Setup script for creating WorkMail SMTP credentials in AWS Systems Manager Parameter Store
 * This script helps configure the Gabi Yoga email service to use WorkMail
 */

const AWS = require('aws-sdk');
const readline = require('readline');

// Configure AWS SDK
AWS.config.update({ region: process.env.AWS_REGION || 'us-east-1' });
const ssm = new AWS.SSM();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function for prompts
function askQuestion(question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer.trim());
    });
  });
}

// Helper function for password prompts (hidden input)
function askPassword(question) {
  return new Promise(resolve => {
    process.stdout.write(question);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    let password = '';
    const onData = (char) => {
      if (char === '\r' || char === '\n') {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener('data', onData);
        console.log(); // New line
        resolve(password);
      } else if (char === '\u0003') { // Ctrl+C
        process.exit();
      } else if (char === '\u007f') { // Backspace
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else {
        password += char;
        process.stdout.write('*');
      }
    };
    
    process.stdin.on('data', onData);
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log('AWS WorkMail SMTP Password Setup (SSM Parameter Store)');
  console.log('='.repeat(60));
  console.log();
  
  const region = process.env.AWS_REGION || 'us-east-1';
  const parameterName = '/gabi-yoga/workmail/smtp-password';
  
  console.log(`Region: ${region}`);
  console.log(`Parameter Name: ${parameterName}`);
  console.log();
  console.log('Note: Non-secret values (host, port, username) should be set as Lambda environment variables.');
  console.log();
  
  try {
    // Check if parameter already exists
    try {
      await ssm.getParameter({ Name: parameterName }).promise();
      console.log('⚠️  Parameter already exists!');
      const overwrite = await askQuestion('Do you want to update the existing parameter? (y/N): ');
      if (overwrite.toLowerCase() !== 'y') {
        console.log('Setup cancelled.');
        rl.close();
        return;
      }
    } catch (error) {
      if (error.code !== 'ParameterNotFound') {
        throw error;
      }
      console.log('✅ Parameter does not exist, will create new one.');
    }
    
    console.log();
    console.log('Please enter your WorkMail SMTP password:');
    console.log();
    
    const smtpPass = await askPassword('WorkMail Password: ');
    
    if (!smtpPass) {
      console.log('❌ Password is required!');
      rl.close();
      return;
    }
    
    console.log();
    console.log(`Password: ${'*'.repeat(smtpPass.length)}`);
    console.log();
    
    const confirm = await askQuestion('Store this password in SSM Parameter Store? (y/N): ');
    if (confirm.toLowerCase() !== 'y') {
      console.log('Setup cancelled.');
      rl.close();
      return;
    }
    
    console.log();
    console.log('Creating/Updating SSM parameter...');
    
    // Store parameter in SSM
    await ssm.putParameter({
      Name: parameterName,
      Value: smtpPass,
      Type: 'SecureString',
      Description: 'SMTP password for Gabi Yoga WorkMail integration',
      Overwrite: true
    }).promise();
    
    console.log('✅ Parameter stored successfully!');
    
    console.log();
    console.log('🎉 WorkMail SMTP password has been configured!');
    console.log();
    console.log('Next steps:');
    console.log('1. Ensure your Lambda functions have permission to read this parameter');
    console.log('2. Set these environment variables in your Lambda functions:');
    console.log('   - SMTP_HOST=smtp.mail.' + region + '.awsapps.com');
    console.log('   - SMTP_PORT=465');
    console.log('   - SMTP_SECURE=true');
    console.log('   - SMTP_USER=noreply@gabi.yoga');
    console.log('   - FROM_EMAIL=noreply@gabi.yoga');
    console.log('3. Test the configuration using: node test-email-service.js');
    console.log('4. Deploy your Lambda functions with the updated email service');
    console.log();
    console.log('IAM Policy needed for Lambda:');
    console.log(JSON.stringify({
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Action": ["ssm:GetParameter"],
          "Resource": `arn:aws:ssm:${region}:*:parameter${parameterName}`
        }
      ]
    }, null, 2));
    
  } catch (error) {
    console.error('❌ Error setting up WorkMail password:', error.message);
    if (error.code === 'UnauthorizedOperation' || error.code === 'AccessDenied') {
      console.log();
      console.log('You may need to configure AWS credentials or check IAM permissions.');
      console.log('Required permissions: ssm:PutParameter, ssm:GetParameter');
    }
  } finally {
    rl.close();
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\nSetup cancelled.');
  rl.close();
  process.exit(0);
});

main().catch(error => {
  console.error('Unexpected error:', error);
  rl.close();
  process.exit(1);
});
