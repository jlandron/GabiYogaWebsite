#!/usr/bin/env node

/**
 * Complete deployment script for Gabi Yoga Lambda migration (dev environment)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const STAGE = 'dev';
const REGION = 'us-east-1';
const ACCOUNT = '891709159344';

console.log('🚀 Gabi Yoga Lambda Migration - Dev Deployment');
console.log('='.repeat(50));
console.log(`Stage: ${STAGE}`);
console.log(`Region: ${REGION}`);
console.log(`Account: ${ACCOUNT}`);
console.log('');

/**
 * Execute command with error handling
 */
function execCommand(command, description) {
  console.log(`📋 ${description}...`);
  try {
    console.log(`   Command: ${command}`);
    const output = execSync(command, { 
      stdio: 'inherit',
      cwd: process.cwd(),
      env: {
        ...process.env,
        STAGE,
        AWS_REGION: REGION,
        AWS_DEFAULT_REGION: REGION
      }
    });
    console.log(`   ✅ ${description} completed successfully\n`);
    return output;
  } catch (error) {
    console.error(`   ❌ ${description} failed:`, error.message);
    process.exit(1);
  }
}

/**
 * Check if CDK is bootstrapped
 */
function checkCdkBootstrap() {
  console.log('🔍 Checking CDK Bootstrap status...');
  try {
    // Check if bootstrap stack exists
    execSync(`aws --profile gabi cloudformation describe-stacks --stack-name CDKToolkit --region ${REGION}`, { 
      stdio: 'pipe' 
    });
    console.log('   ✅ CDK is already bootstrapped\n');
    return true;
  } catch (error) {
    console.log('   ⚠️  CDK not bootstrapped, will bootstrap now...');
    return false;
  }
}

/**
 * Bootstrap CDK if needed
 */
function bootstrapCdk() {
  if (!checkCdkBootstrap()) {
    execCommand(
      `cd lambda-migration/infrastructure && npx cdk bootstrap --profile gabi aws://${ACCOUNT}/${REGION}`,
      'Bootstrapping CDK'
    );
  }
}

/**
 * Get CloudFormation stack outputs
 */
function getStackOutputs(stackName) {
  try {
    const command = `aws cloudformation describe-stacks --stack-name ${stackName} --region ${REGION} --query "Stacks[0].Outputs" --output json`;
    const output = execSync(command, { stdio: 'pipe' }).toString();
    return JSON.parse(output);
  } catch (error) {
    console.log(`   ⚠️  Could not get outputs for stack ${stackName}`);
    return [];
  }
}

/**
 * Display deployment results
 */
function displayResults() {
  console.log('🎉 Deployment Results');
  console.log('='.repeat(30));
  
  // Get API Gateway URL
  const apiStackName = `GabiYogaLambda-${STAGE}-Api`;
  const outputs = getStackOutputs(apiStackName);
  
  let apiGatewayUrl = null;
  let bucketName = null;
  
  outputs.forEach(output => {
    if (output.OutputKey === 'ApiGatewayUrl') {
      apiGatewayUrl = output.OutputValue;
    }
    if (output.OutputKey === 'AssetsBucketName') {
      bucketName = output.OutputValue;
    }
  });
  
  console.log('📍 Infrastructure:');
  console.log(`   • Database Stack: GabiYogaLambda-${STAGE}-Database`);
  console.log(`   • Auth Stack: GabiYogaLambda-${STAGE}-Auth`);
  console.log(`   • API Stack: GabiYogaLambda-${STAGE}-Api`);
  console.log(`   • Monitoring Stack: GabiYogaLambda-${STAGE}-Monitoring`);
  console.log('');
  
  if (apiGatewayUrl) {
    console.log('🌐 Your Lambda Website:');
    console.log(`   Homepage: ${apiGatewayUrl}`);
    console.log(`   Blog API: ${apiGatewayUrl}blog`);
    console.log(`   Auth API: ${apiGatewayUrl}auth/login`);
    console.log('');
  }
  
  if (bucketName) {
    console.log('📦 Assets:');
    console.log(`   S3 Bucket: ${bucketName}`);
    console.log('');
  }
  
  console.log('🔧 Next Steps:');
  console.log('   1. Upload your website assets:');
  console.log('      cd lambda-migration && node scripts/upload-assets.js');
  console.log('');
  console.log('   2. Test your APIs:');
  if (apiGatewayUrl) {
    console.log(`      curl ${apiGatewayUrl}blog`);
  }
  console.log('');
  console.log('   3. Monitor your functions:');
  console.log('      aws logs tail /aws/lambda/GabiYoga-dev-BlogList --follow');
  console.log('');
}

/**
 * Main deployment function
 */
async function main() {
  try {
    // Step 1: Check prerequisites
    console.log('🔍 Checking prerequisites...');
    
    // Check if we're in the right directory
    if (!fs.existsSync('lambda-migration/infrastructure')) {
      console.error('❌ Please run this script from the yoga-website root directory');
      process.exit(1);
    }
    
    // Check AWS CLI
    try {
      execSync('aws --version', { stdio: 'pipe' });
      console.log('   ✅ AWS CLI found');
    } catch (error) {
      console.error('   ❌ AWS CLI not found. Please install AWS CLI first.');
      process.exit(1);
    }
    
    // Check AWS credentials
    try {
      const identity = execSync('aws sts --profile gabi get-caller-identity', { stdio: 'pipe' }).toString();
      const identityObj = JSON.parse(identity);
      if (identityObj.Account !== ACCOUNT) {
        console.warn(`   ⚠️  Expected account ${ACCOUNT}, but found ${identityObj.Account}`);
        console.warn('   Make sure you\'re using the correct AWS profile');
      } else {
        console.log(`   ✅ AWS credentials configured for account ${ACCOUNT}`);
      }
    } catch (error) {
      console.error('   ❌ AWS credentials not configured. Run: aws configure');
      process.exit(1);
    }
    
    console.log('');
    
    // Step 2: Bootstrap CDK
    bootstrapCdk();
    
    // Step 3: Build infrastructure
    execCommand(
      'cd lambda-migration/infrastructure && npm run build',
      'Building CDK TypeScript'
    );
    
    // Step 4: Deploy stacks in order
    const stacks = [
      'GabiYogaLambda-dev-Database',
      'GabiYogaLambda-dev-Auth', 
      'GabiYogaLambda-dev-Api',
      'GabiYogaLambda-dev-Monitoring'
    ];
    
    for (const stack of stacks) {
      execCommand(
        `cd lambda-migration/infrastructure && npx cdk deploy ${stack} --profile gabi --require-approval never`,
        `Deploying ${stack}`
      );
    }
    
    // Step 5: Display results
    displayResults();
    
    console.log('🎉 Deployment completed successfully!');
    console.log('');
    console.log('💡 Pro Tips:');
    console.log('   • Use CloudWatch to monitor your Lambda functions');
    console.log('   • Check X-Ray for distributed tracing');
    console.log('   • Upload assets to see your full website');
    console.log('');
    
  } catch (error) {
    console.error('💥 Deployment failed:', error.message);
    console.error('');
    console.error('🔧 Troubleshooting:');
    console.error('   • Check your AWS credentials: aws sts get-caller-identity');
    console.error('   • Verify CDK version: npx cdk --version');
    console.error('   • Check CloudFormation console for detailed errors');
    console.error('');
    process.exit(1);
  }
}

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  console.log('\n⚠️  Deployment interrupted by user');
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };
