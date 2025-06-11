#!/bin/bash

# Multi-Region Image Storage Deployment Script
# This script automates the deployment of the multi-region image storage solution

set -e  # Exit on any error

# Configuration
ACCOUNT_ID="891709159344"
US_REGION="us-west-2"
EU_REGION="eu-west-1"
PRIMARY_BUCKET="gabi-yoga-uploads"

echo "🚀 Starting Multi-Region Image Storage Deployment"
echo "=================================================="
echo "Account ID: $ACCOUNT_ID"
echo "US Region: $US_REGION"
echo "EU Region: $EU_REGION"
echo "Primary Bucket: $PRIMARY_BUCKET"
echo ""

# Function to check if AWS CLI is configured
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        echo "❌ AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! aws sts get-caller-identity &> /dev/null; then
        echo "❌ AWS CLI is not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    echo "✅ AWS CLI is configured"
}

# Function to check if CDK is installed
check_cdk() {
    if ! command -v cdk &> /dev/null; then
        echo "❌ AWS CDK is not installed. Installing..."
        npm install -g aws-cdk
    fi
    
    echo "✅ AWS CDK is available"
}

# Function to bootstrap CDK in a region
bootstrap_region() {
    local region=$1
    echo "🔧 Bootstrapping CDK in region: $region"
    
    if cdk bootstrap "aws://$ACCOUNT_ID/$region" --region $region; then
        echo "✅ CDK bootstrapped successfully in $region"
    else
        echo "❌ Failed to bootstrap CDK in $region"
        echo "💡 This might be okay if already bootstrapped. Continuing..."
    fi
}

# Function to deploy a stack
deploy_stack() {
    local stack_name=$1
    local region=$2
    
    echo "📦 Deploying stack: $stack_name to region: $region"
    
    if cdk deploy $stack_name --region $region --require-approval never; then
        echo "✅ Stack $stack_name deployed successfully"
    else
        echo "❌ Failed to deploy stack $stack_name"
        return 1
    fi
}

# Function to enable S3 versioning
enable_s3_versioning() {
    echo "🔧 Enabling versioning on S3 bucket: $PRIMARY_BUCKET"
    
    if aws s3api put-bucket-versioning \
        --bucket $PRIMARY_BUCKET \
        --versioning-configuration Status=Enabled \
        --region $US_REGION; then
        echo "✅ S3 versioning enabled"
    else
        echo "❌ Failed to enable S3 versioning"
        echo "💡 You may need to do this manually in the AWS Console"
    fi
}

# Function to get replication role ARN from stack outputs
get_replication_role_arn() {
    echo "🔍 Getting replication role ARN from stack outputs..." >&2
    
    local role_arn=$(aws cloudformation describe-stacks \
        --stack-name "GabiYogaMultiRegionStorage" \
        --region $EU_REGION \
        --query "Stacks[0].Outputs[?OutputKey=='ReplicationRoleArn'].OutputValue" \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$role_arn" ]; then
        echo "✅ Found replication role ARN: $role_arn" >&2
        echo "$role_arn"  # Only output the clean ARN to stdout
    else
        echo "⚠️  Could not automatically get replication role ARN" >&2
        echo "Please check the stack outputs manually" >&2
        return 1
    fi
}

# Function to configure S3 replication
configure_s3_replication() {
    local role_arn=$1
    
    echo "🔧 Configuring S3 cross-region replication..."
    
    local replication_config="{
        \"Role\": \"$role_arn\",
        \"Rules\": [
            {
                \"ID\": \"ReplicateGalleryToEU\",
                \"Status\": \"Enabled\",
                \"Prefix\": \"gallery/\",
                \"Destination\": {
                    \"Bucket\": \"arn:aws:s3:::${PRIMARY_BUCKET}-eu\",
                    \"StorageClass\": \"STANDARD_IA\"
                }
            },
            {
                \"ID\": \"ReplicateImagesToEU\",
                \"Status\": \"Enabled\",
                \"Prefix\": \"images/\",
                \"Destination\": {
                    \"Bucket\": \"arn:aws:s3:::${PRIMARY_BUCKET}-eu\",
                    \"StorageClass\": \"STANDARD_IA\"
                }
            }
        ]
    }"
    
    if aws s3api put-bucket-replication \
        --bucket $PRIMARY_BUCKET \
        --replication-configuration "$replication_config" \
        --region $US_REGION; then
        echo "✅ S3 replication configured successfully"
    else
        echo "❌ Failed to configure S3 replication"
        echo "💡 You may need to configure this manually"
        echo "Replication config:"
        echo "$replication_config"
        return 1
    fi
}

# Main deployment process
main() {
    echo "Step 1: Checking prerequisites..."
    check_aws_cli
    check_cdk
    
    echo ""
    echo "Step 2: Installing dependencies..."
    npm install
    
    echo ""
    echo "Step 3: Bootstrapping CDK..."
    bootstrap_region $US_REGION
    bootstrap_region $EU_REGION
    
    echo ""
    echo "Step 4: Deploying multi-region storage stack..."
    if deploy_stack "GabiYogaMultiRegionStorage" $EU_REGION; then
        echo "✅ Multi-region storage stack deployed"
    else
        echo "❌ Multi-region storage stack deployment failed"
        exit 1
    fi
    
    echo ""
    echo "Step 5: Deploying primary bucket policy stack..."
    if deploy_stack "GabiYogaPrimaryBucketPolicy" $US_REGION; then
        echo "✅ Primary bucket policy stack deployed"
    else
        echo "❌ Primary bucket policy stack deployment failed"
        exit 1
    fi
    
    echo ""
    echo "Step 6: Deploying replication configuration stack..."
    if deploy_stack "GabiYogaS3Replication" $US_REGION; then
        echo "✅ Replication configuration stack deployed"
    else
        echo "❌ Replication configuration stack deployment failed"
        exit 1
    fi
    
    echo ""
    echo "Step 7: Configuring S3 bucket..."
    enable_s3_versioning
    
    echo ""
    echo "Step 8: Setting up cross-region replication..."
    if role_arn=$(get_replication_role_arn); then
        configure_s3_replication "$role_arn"
    else
        echo "⚠️  Please configure S3 replication manually using the stack outputs"
    fi
    
    echo ""
    echo "🎉 Multi-Region Image Storage Deployment Complete!"
    echo "=================================================="
    echo ""
    echo "Next steps:"
    echo "1. Update your environment variables:"
    echo "   S3_BUCKET_EU=${PRIMARY_BUCKET}-eu"
    echo "   GLOBAL_CLOUDFRONT_URL=<from stack outputs>"
    echo ""
    echo "2. Update your application code to use multi-region storage"
    echo "3. Test from different geographic locations"
    echo ""
    echo "📊 Stack outputs:"
    echo "US Region stacks:"
    aws cloudformation describe-stacks --region $US_REGION --query "Stacks[?StackName=='GabiYogaS3Replication'].Outputs" --output table 2>/dev/null || echo "No US stacks found"
    echo ""
    echo "EU Region stacks:"
    aws cloudformation describe-stacks --region $EU_REGION --query "Stacks[?StackName=='GabiYogaMultiRegionStorage'].Outputs" --output table 2>/dev/null || echo "No EU stacks found"
}

# Run main function
main "$@"
