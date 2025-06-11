#!/usr/bin/env node

/**
 * Upload Images to S3 Script
 * 
 * This script uploads local images to S3 for multi-region replication.
 * It handles both gallery images and static images like the hero image.
 */

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');

// Configure AWS SDK
AWS.config.update({
    region: process.env.AWS_REGION || 'us-west-2'
});

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.S3_BUCKET || 'gabi-yoga-uploads';

/**
 * Upload a file to S3
 */
async function uploadFile(localPath, s3Key, contentType) {
    try {
        console.log(`📤 Uploading ${localPath} to s3://${BUCKET_NAME}/${s3Key}`);
        
        const fileContent = fs.readFileSync(localPath);
        
        const params = {
            Bucket: BUCKET_NAME,
            Key: s3Key,
            Body: fileContent,
            ContentType: contentType,
            CacheControl: 'public, max-age=31536000', // 1 year cache
            Metadata: {
                'upload-source': 'local-images-script',
                'upload-date': new Date().toISOString()
            }
        };
        
        const result = await s3.upload(params).promise();
        console.log(`✅ Successfully uploaded to ${result.Location}`);
        return result;
    } catch (error) {
        console.error(`❌ Error uploading ${localPath}:`, error.message);
        throw error;
    }
}

/**
 * Check if file exists in S3
 */
async function fileExistsInS3(s3Key) {
    try {
        await s3.headObject({
            Bucket: BUCKET_NAME,
            Key: s3Key
        }).promise();
        return true;
    } catch (error) {
        if (error.statusCode === 404) {
            return false;
        }
        throw error;
    }
}

/**
 * Upload images from a directory
 */
async function uploadImagesFromDirectory(localDir, s3Prefix = '') {
    const fullLocalPath = path.resolve(localDir);
    
    if (!fs.existsSync(fullLocalPath)) {
        console.log(`⚠️  Directory ${fullLocalPath} does not exist, skipping...`);
        return;
    }
    
    console.log(`📂 Processing directory: ${fullLocalPath}`);
    
    const files = fs.readdirSync(fullLocalPath);
    const imageFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext);
    });
    
    console.log(`Found ${imageFiles.length} image files in ${localDir}`);
    
    for (const file of imageFiles) {
        const localFilePath = path.join(fullLocalPath, file);
        const s3Key = s3Prefix ? `${s3Prefix}/${file}` : file;
        const contentType = mime.lookup(file) || 'application/octet-stream';
        
        // Check if file already exists
        const exists = await fileExistsInS3(s3Key);
        if (exists) {
            console.log(`⏭️  File ${s3Key} already exists in S3, skipping...`);
            continue;
        }
        
        try {
            await uploadFile(localFilePath, s3Key, contentType);
        } catch (error) {
            console.error(`Failed to upload ${file}, continuing with next file...`);
        }
    }
}

/**
 * Main function
 */
async function main() {
    console.log('🚀 Starting S3 image upload process...');
    console.log(`Target bucket: ${BUCKET_NAME}`);
    console.log(`AWS Region: ${AWS.config.region}`);
    console.log('');
    
    try {
        // Test S3 connection
        console.log('🔍 Testing S3 connection...');
        await s3.headBucket({ Bucket: BUCKET_NAME }).promise();
        console.log('✅ S3 connection successful');
        console.log('');
        
        // Upload images from the images directory (hero and static images)
        await uploadImagesFromDirectory('./images', 'images');
        
        // Upload images from uploads/gallery if it exists (gallery images)
        await uploadImagesFromDirectory('./uploads/gallery', 'gallery');
        
        console.log('');
        console.log('🎉 Image upload process completed!');
        console.log('');
        console.log('📋 Next steps:');
        console.log('1. Deploy the multi-region infrastructure');
        console.log('2. Wait for cross-region replication to sync images to EU bucket');
        console.log('3. Test image loading from different geographic locations');
        
    } catch (error) {
        console.error('❌ Upload process failed:', error.message);
        process.exit(1);
    }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Upload Images to S3 Script

Usage: node scripts/upload-images-to-s3.js [options]

Options:
  --help, -h     Show this help message
  --dry-run      Show what would be uploaded without actually uploading

Environment Variables:
  S3_BUCKET      Target S3 bucket name (default: gabi-yoga-uploads)
  AWS_REGION     AWS region (default: us-west-2)
  AWS_PROFILE    AWS profile to use

Examples:
  node scripts/upload-images-to-s3.js
  AWS_PROFILE=production node scripts/upload-images-to-s3.js
  S3_BUCKET=my-bucket node scripts/upload-images-to-s3.js --dry-run
`);
    process.exit(0);
}

// Run the main function
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    uploadFile,
    uploadImagesFromDirectory,
    fileExistsInS3
};
