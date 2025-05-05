/**
 * Check SMTP Secret Permissions and Access
 * 
 * This script checks if the application can access the SMTP credentials
 * from AWS Secrets Manager. It tries various secret names and reports results.
 */

require('dotenv').config(); // Load environment variables from .env
const AWS = require('aws-sdk'); 
const secretsManager = new AWS.SecretsManager({
  region: process.env.AWS_REGION || 'us-west-2'
});

// Format for nice console output
const formatLine = (char = '-') => console.log(char.repeat(80));
const formatHeader = (text) => {
  formatLine('=');
  console.log(`${text}`);
  formatLine('=');
};

// Secret names to check
const secretNames = [
  process.env.SMTP_SECRET_NAME,
  'gabi-yoga-work-mail-smtp-credentials',  // New dashed format
  'gabi-yoga-workmail-smtp-credentials'    // Legacy format
].filter(Boolean);

async function checkSecrets() {
  formatHeader('SMTP SECRET ACCESS CHECK');
  
  console.log('AWS Region:', process.env.AWS_REGION || 'us-west-2');
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('Secret Names to check:');
  secretNames.forEach(name => console.log(` - ${name}`));
  
  formatLine();
  
  // Try each secret name
  for (const secretName of secretNames) {
    try {
      console.log(`\nChecking access to "${secretName}"...`);
      
      const result = await secretsManager.describeSecret({ SecretId: secretName }).promise();
      console.log('✅ Secret exists! Details:');
      console.log(` - ARN: ${result.ARN}`);
      console.log(` - Name: ${result.Name}`);
      console.log(` - Last Updated: ${result.LastChangedDate}`);
      
      try {
        // Try to get the actual value
        const secretValue = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
        const secretData = JSON.parse(secretValue.SecretString);
        
        console.log('✅ Successfully retrieved secret value!');
        console.log(' - Host:', secretData.host);
        console.log(' - Port:', secretData.port);
        console.log(' - Username:', secretData.username);
        console.log(' - Password:', secretData.password ? '********' : '<not set>');
        console.log(' - Secure:', secretData.secure);
      } catch (getError) {
        console.log('❌ Could not retrieve secret value:');
        console.log(` - Error: ${getError.code} - ${getError.message}`);
      }
      
    } catch (error) {
      console.log(`❌ Error accessing "${secretName}":`);
      console.log(` - Error: ${error.code} - ${error.message}`);
    }
  }
  
  formatLine();
  
  // Check IAM permissions
  console.log('\nChecking current IAM permissions:');
  try {
    // This will show who we are currently running as
    const sts = new AWS.STS();
    const identity = await sts.getCallerIdentity({}).promise();
    console.log(`✅ Current identity: ${identity.Arn}`);
    console.log(`   Account: ${identity.Account}`);
    console.log(`   User ID: ${identity.UserId}`);
  } catch (stsError) {
    console.log(`❌ Error getting identity: ${stsError.message}`);
  }
  
  formatLine('=');
}

// Run the check
checkSecrets().catch(error => {
  console.error('Error in check-smtp-permissions.js:', error);
});
