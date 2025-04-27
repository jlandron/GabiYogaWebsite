# Gabi Yoga Website - AWS Deployment Guide

This guide provides instructions for deploying the Gabi Yoga website to AWS using the AWS Cloud Development Kit (CDK).

## Prerequisites

Before you begin, make sure you have:

1. An AWS account (Account number: 891709159344)
2. [AWS CLI](https://aws.amazon.com/cli/) installed and configured
3. [Node.js](https://nodejs.org/) (version 16.x or later)
4. [AWS CDK](https://aws.amazon.com/cdk/) installed (`npm install -g aws-cdk`)

## Project Structure

```
yoga-website/
├── infrastructure/        # AWS CDK deployment code
│   ├── bin/               # CDK app entry point
│   └── lib/               # Stack definitions
├── api/                   # Backend API routes
├── database/              # Database models and schema
├── js/                    # Frontend JavaScript files
├── css/                   # CSS stylesheets
└── ...
```

## Infrastructure Overview

The deployment creates the following AWS resources:

1. **Network Stack:** VPC, subnets, security groups, etc.
2. **Database Stack:** RDS MySQL database instance
3. **Storage Stack:** S3 bucket for uploads and CloudFront distribution
4. **WebApp Stack:** EC2 instances with auto-scaling, load balancer, etc.

## Deployment Steps

### 1. Initial Setup

First, prepare your environment:

```bash
# Navigate to the project root
cd /path/to/yoga-website

# Install project dependencies
npm install

# Navigate to infrastructure directory
cd infrastructure

# Install CDK dependencies
npm install
```

### 2. Environment Setup

Create a `.env` file in the project root with your production settings:

```
NODE_ENV=production
PORT=5001

# JWT Configuration
JWT_SECRET=<generate-a-secure-random-string>
JWT_EXPIRY=24h

# Database Configuration
DB_TYPE=mysql
DB_HOST=<will-be-populated-after-deployment>
DB_PORT=3306
DB_NAME=yoga
DB_USER=admin
DB_PASSWORD=<will-be-populated-after-deployment>

# AWS Configuration
AWS_REGION=us-west-2
S3_BUCKET_NAME=gabi-yoga-uploads
CLOUDFRONT_DISTRIBUTION_ID=<will-be-populated-after-deployment>

# Stripe API Keys (Get these from Stripe dashboard)
STRIPE_PUBLISHABLE_KEY=<your-live-key>
STRIPE_SECRET_KEY=<your-live-key>
STRIPE_WEBHOOK_SECRET=<your-live-webhook-secret>
```

### 3. Bootstrap CDK (One-time setup)

Bootstrap the AWS environment (one-time setup for your AWS account/region):

```bash
cd infrastructure
cdk bootstrap aws://891709159344/us-west-2
```

### 4. Deploy the Stacks

Deploy all the stacks at once:

```bash
cdk deploy --all
```

If you prefer to deploy one stack at a time:

```bash
cdk deploy GabiYogaNetwork
cdk deploy GabiYogaDatabase
cdk deploy GabiYogaStorage
cdk deploy GabiYogaWebApp
```

### 5. Post-Deployment Configuration

After deployment, you'll see several outputs in your terminal including:

- Database endpoint
- CloudFront URL
- Load balancer DNS
- Secret ARNs

#### Update Your .env File

Update these values in your `.env` file:

1. `DB_HOST`: Use the database endpoint from the `GabiYogaDatabase` stack output
2. `DB_PASSWORD`: Retrieve from Secrets Manager (see below)
3. `CLOUDFRONT_DISTRIBUTION_ID`: From the `GabiYogaStorage` stack output

#### Retrieve Database Credentials

Get the database password from Secrets Manager:

```bash
aws secretsmanager get-secret-value --secret-id gabi-yoga-db-credentials --query SecretString --output text
```

The output is JSON containing the username and password.

### 6. Uploading Web Content

You'll need to upload your application code to the EC2 instances:

1. Create a deployment package:

```bash
cd /path/to/yoga-website
zip -r deployment.zip * .env
```

2. Upload to each EC2 instance using AWS Systems Manager (SSM) Session Manager or SCP

### 7. DNS Configuration

To configure DNS for your website:

1. If using Route 53, create a hosted zone for your domain
2. Create an A record that points to your load balancer's DNS name
3. For SSL, request a certificate through ACM and configure it with your load balancer

### 8. Database Migration

Initialize your production database:

1. Connect to the RDS database using the endpoint from CloudFormation outputs
2. Run your schema and seed scripts:

```bash
mysql -h <db-endpoint> -u admin -p yoga < database/schema.sql
```

### 9. Verify Deployment

Access your application through:

1. The load balancer DNS name (for the web application)
2. The CloudFront distribution URL (for static assets)

### 10. Monitoring and Logs

Monitor your application using:

1. CloudWatch for logs and metrics
2. RDS monitoring for database performance

## Cleanup

If you need to delete the deployed resources:

```bash
cdk destroy --all
```

## Security Notes

1. The production database has deletion protection enabled
2. Secrets are stored in AWS Secrets Manager
3. SSL is enabled for both database connections and web traffic
4. The S3 bucket is configured to block public access

## Manual Setup Required

1. Set up Stripe webhook endpoint to notify your application of payment events
2. Create test users in Stripe to validate subscriptions and one-time payments
3. Set up regular backups for your database (beyond the automatic RDS backups)
