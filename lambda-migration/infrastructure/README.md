# Gabi Yoga Lambda Infrastructure (CDK)

This CDK project defines the infrastructure for migrating the Gabi Yoga website from EC2 to a serverless Lambda architecture.

## Architecture Overview

### Stacks
- **Database Stack**: DynamoDB tables with proper indexing and streams
- **Authentication Stack**: JWT secrets, Stripe secrets, and IAM roles
- **API Stack**: Lambda functions and API Gateway with S3 asset storage
- **Monitoring Stack**: CloudWatch dashboards, alarms, and log groups

### Resources Created
- **10 DynamoDB Tables**: Users, BlogPosts, Classes, Bookings, Retreats, Workshops, Gallery, Settings, Communications, JWTBlacklist
- **20+ Lambda Functions**: Organized by service (auth, blog, admin, gallery, booking, payment)
- **API Gateway**: REST API with CORS, throttling, and custom domain support
- **S3 Bucket**: Asset storage with lifecycle policies
- **CloudWatch**: Comprehensive monitoring and alerting
- **Secrets Manager**: JWT and Stripe API keys

## Prerequisites

1. **AWS CLI** configured with appropriate credentials
2. **Node.js** 16+ installed
3. **AWS CDK** CLI installed globally: `npm install -g aws-cdk`
4. **TypeScript** knowledge for modifications

## Setup Instructions

### 1. Install Dependencies
```bash
cd lambda-migration/infrastructure
npm install
```

### 2. Configure Environment
Your AWS account and region are pre-configured:
```bash
# Pre-configured in cdk.json and lambda-stack.ts:
# Account: 891709159344
# Region: us-east-1
```

### 3. Bootstrap CDK (First Time Only)
```bash
npm run bootstrap
```

### 4. Build TypeScript
```bash
npm run build
```

## Deployment Commands

### Development Environment
```bash
# Deploy all stacks to dev environment
npm run deploy:dev

# Deploy individual stack
cdk deploy GabiYogaLambda-dev-Database --context stage=dev

# Check differences before deployment
npm run diff:dev
```

### Production Environment
```bash
# Deploy all stacks to production environment
npm run deploy:prod

# Deploy individual stack
cdk deploy GabiYogaLambda-prod-Database --context stage=prod

# Check differences before deployment
npm run diff:prod
```

### Destroy Stacks (Development Only)
```bash
# Destroy all dev stacks
npm run destroy:dev

# Destroy individual dev stack
cdk destroy GabiYogaLambda-dev-Database --context stage=dev
```

## Stack Dependencies

The stacks are deployed in the following order due to dependencies:
1. **Database Stack** (independent)
2. **Authentication Stack** (depends on Database)
3. **API Stack** (depends on Database + Authentication)
4. **Monitoring Stack** (depends on API)

## Environment Configuration

### Development (`stage=dev`)
- Table names: `GabiYoga-dev-*`
- Function names: `GabiYoga-dev-*`
- S3 bucket: `gabi-yoga-dev-assets-{region}`
- Log retention: 1 week
- CORS: Allow all origins
- Resource removal: `DESTROY` policy

### Production (`stage=prod`)
- Table names: `GabiYoga-prod-*`
- Function names: `GabiYoga-prod-*`
- S3 bucket: `gabi-yoga-prod-assets-{region}`
- Log retention: 1 month
- CORS: Only `gabi.yoga` and `www.gabi.yoga`
- Resource removal: `RETAIN` policy

## Key Features

### Security
- IAM roles with least privilege access
- Secrets Manager for sensitive data
- VPC access execution role for Lambda
- S3 bucket with blocked public access

### Monitoring
- CloudWatch dashboard with key metrics
- Alarms for errors, duration, and throttling
- X-Ray tracing enabled on all functions
- Structured logging with correlation IDs

### Performance
- ARM64 Lambda architecture for better price/performance
- DynamoDB on-demand billing
- S3 lifecycle policies for cost optimization
- Lambda function timeouts optimized per use case

### Scalability
- Auto-scaling DynamoDB tables
- API Gateway throttling configured
- Lambda concurrency can be adjusted
- Global Secondary Indexes for efficient queries

## Custom Domain (Production)

For production, you'll need to:
1. Configure Route 53 hosted zone for `gabi.yoga`
2. Create ACM certificate for `api.gabi.yoga`
3. Update API Gateway custom domain configuration
4. Point DNS to API Gateway

## Monitoring and Alarms

### Created Alarms
- API Gateway 5XX errors > 5 in 10 minutes
- Lambda function errors for critical functions
- Lambda duration > 15 seconds
- DynamoDB read/write throttling

### Dashboard Metrics
- API Gateway request count, errors, latency
- Lambda invocations, errors, duration
- DynamoDB read/write capacity consumption

## Troubleshooting

### Common Issues

1. **Bootstrap Error**: Run `cdk bootstrap` in your target region
2. **Permission Denied**: Ensure AWS credentials have CDK deployment permissions
3. **Resource Conflicts**: Check if resources already exist with same names
4. **Lambda Asset Path**: Ensure `../lambda` directory exists with function code

### Useful Commands
```bash
# List all stacks
cdk list

# Show generated CloudFormation template
npm run synth

# Check CDK version
cdk --version

# Validate cdk.json configuration
cdk doctor
```

## Cost Optimization

### Development
- Use `npm run destroy:dev` when not testing
- DynamoDB on-demand billing prevents idle charges
- Lambda ARM64 provides better price/performance
- Short log retention reduces storage costs

### Production
- Monitor CloudWatch costs for dashboard and alarms
- Set up billing alerts for unexpected usage
- Review DynamoDB capacity modes based on usage patterns
- Implement S3 lifecycle policies for old assets

## Next Steps

1. **Lambda Functions**: Implement the actual Lambda function code in the `../lambda` directory
2. **Database Migration**: Create scripts to migrate data from MySQL to DynamoDB
3. **Testing**: Set up integration tests for the API endpoints
4. **CI/CD**: Integrate with GitHub Actions or CodePipeline
5. **Custom Domain**: Configure Route 53 and ACM certificates

## Security Considerations

- All secrets stored in AWS Secrets Manager
- DynamoDB encryption at rest enabled
- Lambda functions have minimal IAM permissions
- API Gateway configured with proper CORS headers
- S3 bucket blocks all public access

## Support

For issues with this CDK infrastructure:
1. Check CloudFormation console for deployment errors
2. Review CloudWatch logs for Lambda function errors
3. Verify IAM permissions for CDK deployment
4. Check AWS service limits and quotas
