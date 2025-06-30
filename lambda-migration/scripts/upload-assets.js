#!/usr/bin/env node

/**
 * Upload website assets to S3 bucket for Lambda migration
 */

const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');
const mime = require('mime-types');
const { execSync } = require('child_process');

// Configure AWS
AWS.config.credentials = new AWS.SharedIniFileCredentials({profile: 'gabi'});
const s3 = new AWS.S3({
  region: process.env.AWS_REGION || 'us-east-1'
});

// Configuration
const STAGE = process.env.STAGE || 'dev';
const BUCKET_NAME = `gabi-yoga-${STAGE}-assets-us-east-1`;
const SOURCE_DIR = path.join(__dirname, '../../');
const DRY_RUN = process.argv.includes('--dry-run');

console.log(`🚀 Starting asset upload to S3`);
console.log(`   Stage: ${STAGE}`);
console.log(`   Bucket: ${BUCKET_NAME}`);
console.log(`   Source: ${SOURCE_DIR}`);
console.log(`   Dry Run: ${DRY_RUN}`);
console.log('');

/**
 * Files and directories to upload
 */
const ASSETS_TO_UPLOAD = [
  // HTML files
  { source: 'index.html', target: 'index.html' },
  { source: 'blog.html', target: 'blog.html' },
  { source: 'dashboard.html', target: 'dashboard.html' },
  { source: 'forgot-password.html', target: 'forgot-password.html' },
  { source: 'reset-password.html', target: 'reset-password.html' },
  { source: 'payment-success.html', target: 'payment-success.html' },
  { source: 'payment-cancel.html', target: 'payment-cancel.html' },
  { source: 'purchase-modals.html', target: 'purchase-modals.html' },
  
  // Admin HTML files
  { source: 'admin-dashboard.html', target: 'admin/dashboard.html' },
  { source: 'admin-blog.html', target: 'admin/blog.html' },
  { source: 'admin-members.html', target: 'admin/members.html' },
  { source: 'admin-photos.html', target: 'admin/photos.html' },
  { source: 'admin-schedule.html', target: 'admin/schedule.html' },
  { source: 'admin-settings.html', target: 'admin/settings.html' },
  
  // Components
  { source: 'components/', target: 'components/', isDirectory: true },
  
  // CSS files
  { source: 'css/', target: 'css/', isDirectory: true },
  
  // JavaScript files
  { source: 'js/', target: 'js/', isDirectory: true },
  
  // Images
  { source: 'images/', target: 'images/', isDirectory: true },
  
  // Fonts
  { source: 'fonts/', target: 'fonts/', isDirectory: true },
  
  // Other static files
  { source: 'robots.txt', target: 'robots.txt' },
  { source: 'sitemap.xml', target: 'sitemap.xml' },
  { source: 'site.webmanifest', target: 'site.webmanifest' }
];

/**
 * Get all files in a directory recursively
 */
function getFilesRecursively(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and other unnecessary directories
      if (!['node_modules', '.git', 'coverage', 'tests', 'database', 'middleware', 'utils', 'api', 'scripts'].includes(file)) {
        getFilesRecursively(filePath, fileList);
      }
    } else {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

/**
 * Upload a single file to S3
 */
async function uploadFile(sourcePath, s3Key) {
  try {
    const fileContent = fs.readFileSync(sourcePath);
    const contentType = mime.lookup(sourcePath) || 'application/octet-stream';
    
    if (DRY_RUN) {
      console.log(`   [DRY RUN] Would upload: ${sourcePath} → s3://${BUCKET_NAME}/${s3Key}`);
      return;
    }
    
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: fileContent,
      ContentType: contentType,
      CacheControl: getCacheControl(s3Key)
    };
    
    await s3.upload(uploadParams).promise();
    console.log(`   ✓ Uploaded: ${s3Key}`);
    
  } catch (error) {
    console.error(`   ✗ Failed to upload ${sourcePath}:`, error.message);
  }
}

/**
 * Get appropriate cache control header
 */
function getCacheControl(key) {
  const extension = path.extname(key).toLowerCase();
  
  // Static assets can be cached longer
  if (['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.otf'].includes(extension)) {
    return 'public, max-age=31536000'; // 1 year
  }
  
  // HTML files should not be cached
  if (extension === '.html') {
    return 'no-cache, no-store, must-revalidate';
  }
  
  // Default cache for other files
  return 'public, max-age=3600'; // 1 hour
}

/**
 * Check if S3 bucket exists
 */
async function checkBucket() {
  try {
    await s3.headBucket({ Bucket: BUCKET_NAME }).promise();
    console.log(`✓ S3 bucket exists: ${BUCKET_NAME}`);
    return true;
  } catch (error) {
    console.error(`✗ S3 bucket not found: ${BUCKET_NAME}`);
    console.error('Make sure your CDK stack is deployed first.');
    return false;
  }
}

/**
 * Update HTML files to point to Lambda API endpoints
 */
function updateHtmlForLambda(content, filePath) {
  // Update API endpoints to point to Lambda
  let updatedContent = content;
  
  // Replace /api/ endpoints with Lambda API Gateway URLs
  const apiReplacements = {
    'fetch\\(\'/api/': `fetch('${process.env.API_GATEWAY_URL || ''}/`,
    'action="/api/': `action="${process.env.API_GATEWAY_URL || ''}/`,
    'url: \'/api/': `url: '${process.env.API_GATEWAY_URL || ''}/`,
    '"/api/': `"${process.env.API_GATEWAY_URL || ''}/`
  };
  
  for (const [pattern, replacement] of Object.entries(apiReplacements)) {
    const regex = new RegExp(pattern, 'g');
    updatedContent = updatedContent.replace(regex, replacement);
  }
  
  // Add Lambda-specific meta tags
  if (filePath.endsWith('index.html')) {
    updatedContent = updatedContent.replace(
      '<head>',
      `<head>
    <meta name="deployment" content="lambda-${STAGE}">
    <meta name="api-gateway" content="${process.env.API_GATEWAY_URL || 'pending'}">`
    );
  }
  
  return updatedContent;
}

/**
 * Main upload function
 */
async function uploadAssets() {
  console.log('📋 Checking S3 bucket...');
  const bucketExists = await checkBucket();
  if (!bucketExists) {
    process.exit(1);
  }
  
  console.log('\n📁 Processing assets...');
  let uploadCount = 0;
  let errorCount = 0;
  
  for (const asset of ASSETS_TO_UPLOAD) {
    const sourcePath = path.join(SOURCE_DIR, asset.source);
    
    try {
      if (!fs.existsSync(sourcePath)) {
        console.log(`   ⚠ Skipping missing: ${asset.source}`);
        continue;
      }
      
      if (asset.isDirectory) {
        // Handle directory uploads
        const files = getFilesRecursively(sourcePath);
        console.log(`\n📂 Processing directory: ${asset.source} (${files.length} files)`);
        
        for (const filePath of files) {
          const relativePath = path.relative(sourcePath, filePath);
          const s3Key = path.join(asset.target, relativePath).replace(/\\/g, '/');
          
          let fileContent = fs.readFileSync(filePath, 'utf8');
          
          // Update HTML files for Lambda
          if (filePath.endsWith('.html')) {
            fileContent = updateHtmlForLambda(fileContent, filePath);
            fs.writeFileSync(filePath + '.lambda-temp', fileContent);
            await uploadFile(filePath + '.lambda-temp', s3Key);
            fs.unlinkSync(filePath + '.lambda-temp');
          } else {
            await uploadFile(filePath, s3Key);
          }
          
          uploadCount++;
        }
      } else {
        // Handle single file uploads
        let fileContent = fs.readFileSync(sourcePath, 'utf8');
        
        // Update HTML files for Lambda
        if (asset.source.endsWith('.html')) {
          fileContent = updateHtmlForLambda(fileContent, sourcePath);
          const tempPath = sourcePath + '.lambda-temp';
          fs.writeFileSync(tempPath, fileContent);
          await uploadFile(tempPath, asset.target);
          fs.unlinkSync(tempPath);
        } else {
          await uploadFile(sourcePath, asset.target);
        }
        
        uploadCount++;
      }
    } catch (error) {
      console.error(`   ✗ Error processing ${asset.source}:`, error.message);
      errorCount++;
    }
  }
  
  console.log('\n📊 Upload Summary:');
  console.log(`   ✓ Uploaded: ${uploadCount} files`);
  console.log(`   ✗ Errors: ${errorCount} files`);
  
  if (errorCount === 0) {
    console.log('\n🎉 All assets uploaded successfully!');
    console.log(`\n🌐 Your Lambda website should now be available at:`);
    console.log(`   ${process.env.API_GATEWAY_URL || 'https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/dev'}`);
  } else {
    console.log('\n⚠️  Some assets failed to upload. Check the errors above.');
    process.exit(1);
  }
}

/**
 * Get API Gateway URL from CDK outputs
 */
async function getApiGatewayUrl() {
  try {
    const cloudformation = new AWS.CloudFormation({ region: 'us-east-1' });
    const stackName = `GabiYogaLambda-${STAGE}-Api`;
    
    const result = await cloudformation.describeStacks({ StackName: stackName }).promise();
    const stack = result.Stacks[0];
    
    if (stack && stack.Outputs) {
      const apiGatewayOutput = stack.Outputs.find(output => 
        output.OutputKey === 'ApiGatewayUrl' || output.OutputKey.includes('RestApi')
      );
      
      if (apiGatewayOutput) {
        process.env.API_GATEWAY_URL = apiGatewayOutput.OutputValue;
        console.log(`✓ Found API Gateway URL: ${apiGatewayOutput.OutputValue}`);
      }
    }
  } catch (error) {
    console.log(`⚠ Could not retrieve API Gateway URL: ${error.message}`);
    console.log('You may need to manually set the API_GATEWAY_URL environment variable');
  }
}

// Main execution
async function main() {
  try {
    // Get API Gateway URL first
    await getApiGatewayUrl();
    
    // Upload assets
    await uploadAssets();
    
  } catch (error) {
    console.error('\n💥 Upload failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  uploadAssets,
  checkBucket,
  BUCKET_NAME
};
