/**
 * Test script for AWS WorkMail SMTP email functionality using Secrets Manager
 * 
 * This script verifies that the AWS WorkMail SMTP configuration works correctly
 * and can send emails without SES verification restrictions.
 * It can retrieve credentials from AWS Secrets Manager or use .env settings.
 */

// Load environment variables from .env file
require('dotenv').config();

// Import required modules
const nodemailer = require('nodemailer');
const AWS = require('aws-sdk');
const readline = require('readline');
const { getSmtpCredentials } = require('./utils/aws-secrets');

// Format for nice console output
const formatLine = (char = '-') => console.log(char.repeat(80));
const formatHeader = (text) => {
  formatLine('=');
  console.log(`${text}`);
  formatLine('=');
};

formatHeader('AWS WORKMAIL SMTP TEST WITH SECRETS MANAGER');
console.log('Testing email sending with AWS WorkMail SMTP server');

// Create interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Test flow
async function runTest() {
  try {
    // Get AWS region for auto-configuration
    const region = process.env.AWS_REGION || 'us-west-2';
    
    console.log('Determining SMTP configuration source...');
    let useSecretsManager = true;
    
    if (process.env.USE_ENV_CREDENTIALS === 'true') {
      console.log('Using credentials from .env file (USE_ENV_CREDENTIALS=true)');
      useSecretsManager = false;
    } else {
      console.log('Attempting to retrieve credentials from AWS Secrets Manager');
    }
    
    let emailConfig;
    
    // Try to get credentials from Secrets Manager
    if (useSecretsManager) {
      try {
        emailConfig = await getSmtpCredentials();
        console.log('Successfully retrieved SMTP credentials from AWS Secrets Manager');
      } catch (error) {
        console.log('Could not retrieve SMTP credentials from Secrets Manager:', error.message);
        console.log('Falling back to .env file credentials');
        useSecretsManager = false;
      }
    }
    
    // If not using Secrets Manager or it failed, use .env values
    if (!useSecretsManager) {
      emailConfig = {
        host: process.env.SMTP_HOST || `smtp.mail.${region}.awsapps.com`,
        port: parseInt(process.env.SMTP_PORT || '465', 10),
        secure: process.env.SMTP_SECURE !== 'false', // WorkMail uses SSL by default (port 465)
        username: process.env.SMTP_USER,
        password: process.env.SMTP_PASS,
      };
    }
    
    // Always get "from" email from environment if set
    const fromEmail = process.env.EMAIL_FROM || emailConfig.username || 'noreply@gabi.yoga';
    
    console.log('\nAWS WorkMail SMTP configuration:');
    console.log(`SMTP Host: ${emailConfig.host}`);
    console.log(`SMTP Port: ${emailConfig.port}`);
    console.log(`SMTP Secure: ${emailConfig.secure ? 'Yes (SSL/TLS)' : 'No'}`);
    console.log(`From Email: ${fromEmail}`);
    console.log(`SMTP User: ${emailConfig.username ? emailConfig.username : 'Not set'}`);
    console.log(`SMTP Password: ${emailConfig.password ? '*********' : 'Not set'}`);
    console.log(`Credentials Source: ${useSecretsManager ? 'AWS Secrets Manager' : '.env file'}`);
    console.log(`AWS Region: ${region}`);
    
    formatLine();
    
    // Check if credentials are set
    if (!emailConfig.username || !emailConfig.password) {
      console.log('\nWARNING: SMTP username or password is not set.');
      console.log('You need to configure these values to authenticate with AWS WorkMail.');
      const proceed = await askQuestion('Do you want to enter WorkMail credentials now? (y/n): ');
      
      if (proceed.toLowerCase() === 'y') {
        emailConfig.username = await askQuestion('Enter WorkMail username (full email address): ');
        emailConfig.password = await askQuestion('Enter WorkMail password: ');
      } else {
        console.log('\nSkipping email test due to missing credentials.');
        rl.close();
        return;
      }
    }
    
    // Ask for test recipient
    const testRecipient = await askQuestion('\nEnter test recipient email address: ');
    
    console.log(`\nCreating transporter for AWS WorkMail (${emailConfig.host})...`);
    
    // Create Nodemailer transporter for WorkMail
    const transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: {
        user: emailConfig.username,
        pass: emailConfig.password
      }
    });
    
    console.log('Verifying transporter configuration...');
    
    // Verify connection configuration
    await transporter.verify();
    console.log('✅ WorkMail SMTP connection verified successfully!');
    
    console.log(`\nSending test email to ${testRecipient}...`);
    
    // Send test email
    const info = await transporter.sendMail({
      from: fromEmail,
      to: testRecipient,
      subject: 'Gabi Yoga - AWS WorkMail Test with Secrets Manager',
      text: 'This is a test email from the Gabi Yoga website using AWS WorkMail SMTP with Secrets Manager.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #557a95;">AWS WorkMail Test Successful</h2>
          <p>This is a test email from the Gabi Yoga website using AWS WorkMail SMTP.</p>
          <p>If you're seeing this, it means the WorkMail configuration is working correctly! 🎉</p>
          <p>Your email system is now set up to send emails without AWS SES verification restrictions.</p>
          <p><strong>Credentials Source:</strong> ${useSecretsManager ? 'AWS Secrets Manager' : '.env file'}</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
            <p>This is a test message, no action is required.</p>
          </div>
        </div>
      `
    });
    
    formatLine();
    console.log('✅ Test email sent successfully through AWS WorkMail!');
    console.log('Message ID:', info.messageId);
    
    console.log('\nAWS WorkMail has been successfully configured.');
    console.log('You can now send emails directly without AWS SES verification requirements.');
    
  } catch (error) {
    formatLine();
    console.error('❌ ERROR:', error.message);
    
    if (error.message.includes('Invalid login')) {
      console.log('\nAWS WorkMail authentication failed:');
      console.log('1. Check your SMTP_USER and SMTP_PASS values in .env or update the secret in Secrets Manager');
      console.log('2. Ensure SMTP_USER is your full WorkMail email address (e.g., noreply@gabi.yoga)');
      console.log('3. Verify that your WorkMail account is properly set up in the AWS console');
    } else if (error.message.includes('connect')) {
      console.log('\nConnection issue with AWS WorkMail:');
      console.log('1. Check if AWS_REGION in .env matches your WorkMail organization region');
      console.log('2. Verify SMTP_HOST is correct (should be smtp.mail.<region>.awsapps.com)');
      console.log('3. Ensure SMTP_PORT is 465 for SSL or 587 for TLS');
      console.log('4. Check if your network allows connections to WorkMail SMTP server');
    } else if (error.message.includes('SecretId')) {
      console.log('\nAWS Secrets Manager error:');
      console.log('1. Make sure the SMTP secret is properly created in AWS Secrets Manager');
      console.log('2. Verify that the secret name is correct (gabi-yoga-workmail-smtp-credentials)');
      console.log('3. Ensure your AWS credentials have permission to access the secret');
      console.log('4. Set USE_ENV_CREDENTIALS=true in .env to use environment variables instead');
    }
    
    console.log('\nFor WorkMail setup help, refer to: docs/workmail-smtp-integration.md');
  } finally {
    rl.close();
  }
}

// Helper function for prompts
function askQuestion(question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer.trim());
    });
  });
}

// Run the test
runTest();
