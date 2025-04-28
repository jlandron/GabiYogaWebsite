#!/bin/bash

# Script to deploy CDK application with local .env file

echo "Starting deployment process..."

# Clean and build the project
./scripts/build-clean.sh

# Check if build was successful
if [ $? -ne 0 ]; then
  echo "Build failed. Stopping deployment."
  exit 1
fi

echo "Build successful. Deploying infrastructure..."

# Deploy with CDK
# You can add specific stack names if you want to deploy only specific stacks
npx cdk deploy --all --require-approval never

# Check if deployment was successful
if [ $? -ne 0 ]; then
  echo "Deployment failed. Instance refresh will not be initiated."
  exit 1
fi

echo "Deployment completed! Starting instance refresh..."

# Run instance refresh to update EC2 instances with the new .env file
# Using --no-confirm flag to avoid interactive prompts
./scripts/refresh-instances.sh --no-confirm

echo "Instance refresh process initiated!"
echo ""
echo "Your .env file has been securely deployed to EC2 instances without being uploaded to GitHub."
echo "The following environment variables from your local .env have been automatically overridden for production:"
echo "  - NODE_ENV=production"
echo "  - DB_HOST (set to RDS endpoint)"
echo "  - DB_PASSWORD (set to RDS password)"
echo "  - AWS_REGION (set to deployment region)"
echo "  - S3_BUCKET_NAME (set to created bucket name)"
echo "  - CLOUDFRONT_DISTRIBUTION_ID (set to created distribution ID)"
echo ""
echo "All other environment variables were deployed as-is from your local .env file."
