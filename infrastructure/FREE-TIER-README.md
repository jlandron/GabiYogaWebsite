# AWS Free Tier Infrastructure Guide

This guide explains how to update your GabiYoga infrastructure to use AWS Free Tier resources and how to handle the CIDR block conflicts reported in your deployment.

## What's Changed

We've updated the AWS CDK infrastructure code to use only free tier eligible resources:

1. **EC2 Instances**:
   - Changed from `t3.small` to `t2.micro` (free tier eligible)
   - Reduced Auto Scaling Group from 2-4 instances to a single instance

2. **RDS Database**:
   - Changed from `db.t3.small` to `db.t2.micro` (free tier eligible)
   - Limited storage to 20GB with no auto-scaling
   - Disabled deletion protection for easier testing/cleanup
   - Reduced backup retention period

3. **Network**:
   - Removed NAT Gateways (not free tier eligible)
   - Changed VPC logical ID to force creation of new resources
   - Using specific CIDR ranges to avoid conflicts

4. **Storage**:
   - Reduced log retention for CloudFront from 30 days to 7 days

## Fixing CIDR Conflicts

The error you encountered is related to subnet CIDR blocks conflicting with existing resources. We've provided two scripts to help:

### Option 1: Analysis Script

Run the cleanup script to analyze your existing resources and see what's causing conflicts:

```bash
cd infrastructure
./scripts/cleanup-vpc-resources.sh
```

This will:
- List all CloudFormation stacks related to the project
- Find and display information about the VPC
- Show all subnets and identify conflicting ones
- Display NAT gateways and route tables
- Provide recommendations for fixing the issues

### Option 2: Complete Rebuild

For a clean start, use the rebuild script:

```bash
cd infrastructure
./scripts/rebuild-free-tier.sh
```

This interactive script will:
1. Install required dependencies
2. Build the CDK project
3. Destroy existing stacks in the correct order
4. Deploy new free tier resources

## Manual Deployment

If you prefer to deploy manually:

1. First destroy the problematic stack:
   ```bash
   cd infrastructure
   npx cdk destroy GabiYogaNetwork --force
   ```

2. Then deploy all stacks:
   ```bash
   npx cdk deploy --all
   ```

## Common Issues

1. **CIDR Conflicts**: The error you encountered happens when AWS tries to create subnets with CIDR blocks that are already in use. Our approach creates a VPC with a new logical ID to force creation of new resources.

2. **Deletion Protection**: We've disabled deletion protection on the RDS instance to make cleanup easier.

3. **Resource Dependencies**: When destroying stacks, you must respect dependencies (DNS → WebApp → Database → Network).

## Cost Savings

These changes should significantly reduce your AWS costs by:
- Using only free tier eligible instance types (t2.micro)
- Eliminating NAT Gateways ($0.045 per hour plus data processing)
- Running only one EC2 instance instead of two
- Reducing backup retention periods
- Using a smaller RDS instance with less storage

If you need to restore your previous infrastructure for production use, simply revert the changes to the following files:
- `infrastructure/lib/webapp-stack.ts`
- `infrastructure/lib/database-stack.ts`
- `infrastructure/lib/network-stack.ts`
- `infrastructure/lib/storage-stack.ts`
