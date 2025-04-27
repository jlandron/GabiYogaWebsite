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
cd infrastructure
cdk deploy --all --app "npx ts-node bin/app.ts"
```

Alternatively, you can create a `cdk.json` file in the infrastructure directory:

```bash
echo '{ "app": "npx ts-node bin/app.ts" }' > cdk.json
```

After creating this file, you can run:

```bash
cd infrastructure
cdk deploy --all
```

If you prefer to deploy one stack at a time:

```bash
cd infrastructure
cdk deploy GabiYogaNetwork --app "npx ts-node bin/app.ts"
cdk deploy GabiYogaDatabase --app "npx ts-node bin/app.ts"
cdk deploy GabiYogaStorage --app "npx ts-node bin/app.ts"
cdk deploy GabiYogaWebApp --app "npx ts-node bin/app.ts"
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

### 7. DNS Configuration with Route53

To configure DNS for your domain `gabi.yoga`:

1. **Create a hosted zone in Route53:**

   ```bash
   aws route53 create-hosted-zone --name gabi.yoga --caller-reference $(date +%s)
   ```

2. **Note the nameservers** in the output, which will look like:
   
   ```
   ns-123.awsdns-12.com.
   ns-456.awsdns-34.net.
   ns-789.awsdns-56.org.
   ns-012.awsdns-78.co.uk.
   ```

3. **Register the domain** (if not already registered):
   
   ```bash
   aws route53domains register-domain \
     --domain-name gabi.yoga \
     --admin-contact "..." \
     --registrant-contact "..." \
     --tech-contact "..." \
     --years 1 \
     --auto-renew
   ```
   
   Note: You'll need to provide admin, registrant, and technical contact information.
   
   Alternatively, if the domain is already registered elsewhere, update the nameservers with your domain registrar.

4. **Create an SSL certificate** using AWS Certificate Manager:

   ```bash
   aws acm request-certificate \
     --domain-name gabi.yoga \
     --validation-method DNS \
     --region us-west-2
   ```

5. **Create validation DNS records** as prompted by AWS.

6. **Create a Route53 record set** that points to your load balancer:

   ```bash
   # Get your load balancer DNS name from the outputs
   LB_DNS_NAME=$(aws cloudformation describe-stacks \
     --stack-name GabiYogaWebApp \
     --query "Stacks[0].Outputs[?OutputKey=='LoadBalancerDNS'].OutputValue" \
     --output text)
   
   # Create the A record alias to the load balancer
   aws route53 change-resource-record-sets \
     --hosted-zone-id YOUR_HOSTED_ZONE_ID \
     --change-batch '{
       "Changes": [{
         "Action": "CREATE",
         "ResourceRecordSet": {
           "Name": "gabi.yoga",
           "Type": "A",
           "AliasTarget": {
             "HostedZoneId": "YOUR_LOAD_BALANCER_HOSTED_ZONE_ID",
             "DNSName": "'$LB_DNS_NAME'",
             "EvaluateTargetHealth": true
           }
         }
       }]
     }'
   ```

   Note: Replace `YOUR_HOSTED_ZONE_ID` with the actual hosted zone ID and `YOUR_LOAD_BALANCER_HOSTED_ZONE_ID` with the hosted zone ID specific to your load balancer's region.

7. **Configure www subdomain** (optional):

   ```bash
   aws route53 change-resource-record-sets \
     --hosted-zone-id YOUR_HOSTED_ZONE_ID \
     --change-batch '{
       "Changes": [{
         "Action": "CREATE",
         "ResourceRecordSet": {
           "Name": "www.gabi.yoga",
           "Type": "CNAME",
           "TTL": 300,
           "ResourceRecords": [{
             "Value": "gabi.yoga"
           }]
         }
       }]
     }'
   ```

8. **Update your load balancer** to use the new SSL certificate:

   ```bash
   aws elbv2 modify-listener \
     --listener-arn YOUR_LISTENER_ARN \
     --certificates CertificateArn=YOUR_CERTIFICATE_ARN \
     --ssl-policy ELBSecurityPolicy-2016-08
   ```

9. **Verify DNS propagation** (this may take 24-48 hours):

   ```bash
   dig gabi.yoga
   ```

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
