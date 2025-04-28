# Yoga Website Infrastructure

This directory contains AWS CDK (Cloud Development Kit) code for deploying and managing the yoga website infrastructure. The infrastructure is defined as code, allowing for consistent, repeatable deployments and easier management of cloud resources.

## Infrastructure Components

The application is deployed on AWS using the following components, each defined in its own stack:

### CDK Stacks

- **Network Stack** (`network-stack.ts`): VPC, subnets, security groups, and other networking resources
- **Database Stack** (`database-stack.ts`): RDS MySQL database instance
- **Storage Stack** (`storage-stack.ts`): S3 buckets for static assets and user uploads
- **DNS Stack** (`dns-stack.ts`): Route53 DNS configuration and domain management
- **WebApp Stack** (`webapp-stack.ts`): EC2 instances within an Auto Scaling Group, Load Balancer
- **Credentials Stack** (`credentials-stack.ts`): Secrets Manager for secure credential storage
- **Security Stack** (`security-stack.ts`): IAM roles and security policies

## Deployment Process

### Prerequisites

- AWS CLI installed and configured
- AWS CDK installed (`npm install -g aws-cdk`)
- Node.js and npm

### Initial Deployment

1. Install dependencies:
   ```bash
   cd infrastructure
   npm install
   ```

2. Bootstrap your AWS environment (one-time step):
   ```bash
   cdk bootstrap
   ```

3. Build the TypeScript code:
   ```bash
   npm run build
   ```

4. Deploy all stacks:
   ```bash
   cdk deploy --all
   ```

   Or deploy specific stacks:
   ```bash
   cdk deploy GabiYogaNetwork GabiYogaDatabase GabiYogaWebApp
   ```

### Making Changes to Infrastructure

1. Modify the relevant CDK stack TypeScript files
2. Build the code:
   ```bash
   npm run build
   ```
3. Deploy the changes:
   ```bash
   cdk deploy GabiYogaWebApp  # Replace with the specific stack you modified
   ```
4. For EC2 instance changes, you may need to refresh instances (see below)

## Scripts

The `scripts` directory contains several utility scripts to help manage the infrastructure:

- `build-clean.sh`: Cleans and rebuilds the CDK project
- `deploy.sh`: Simplified deployment script with options
- `refresh-instances.sh`: Updates EC2 instances with latest configuration
- `aws-add-admin.sh`: Adds admin users after deployment
- `ec2-add-admin.sh`: Direct EC2 script for adding admin users
- `install-node-with-nvm.sh`: Installs Node.js using NVM on EC2 instances

## Adding Admin User After Deployment

After deploying the application to AWS, you can add an admin user to the database using the provided scripts:

### Option 1: Local Script with AWS Session Manager (Recommended)

The easiest way to add an admin user is to use the AWS helper script:

```bash
# Make the script executable if needed
chmod +x infrastructure/scripts/aws-add-admin.sh

# Run the script with required parameters
./infrastructure/scripts/aws-add-admin.sh \
  --email=admin@example.com \
  --password=securepassword \
  --first-name=Admin \
  --last-name=User
```

This script will:
- Find a running EC2 instance in your Auto Scaling Group
- Connect to it using AWS Session Manager
- Execute the admin user creation script
- Provide feedback on the operation

**Advanced options:**
```bash
# Specify a different AWS region
./infrastructure/scripts/aws-add-admin.sh --region=us-east-1 ...

# Specify a different Auto Scaling Group name
./infrastructure/scripts/aws-add-admin.sh --asg=MyCustomASG ...
```

### Option 2: Using EC2 Script Directly on the Instance

If you're already connected to the EC2 instance or prefer to run the script directly on the server:

1. Connect to the EC2 instance using SSH or AWS Session Manager
2. Copy the script to the instance (if not already there):
   ```bash
   # From your local machine to EC2 instance
   scp -i your-key.pem infrastructure/scripts/ec2-add-admin.sh ec2-user@instance-ip:/home/ec2-user/
   ```
3. Make it executable and run it:
   ```bash
   # On the EC2 instance
   chmod +x ec2-add-admin.sh
   sudo ./ec2-add-admin.sh \
     --email=admin@example.com \
     --password=securepassword \
     --first-name=Admin \
     --last-name=User
   ```

### Option 3: Direct Database Access

If you have direct access to the RDS database:

1. Copy the `utils/add-admin-user.js` script to your local environment
2. Install required dependencies:
   ```bash
   npm install dotenv bcryptjs mysql2
   ```
3. Configure the `.env` file with your database credentials
4. Run the script locally:
   ```bash
   node add-admin-user.js \
     --email=admin@example.com \
     --password=securepassword \
     --firstName=Admin \
     --lastName=User
   ```

## Applying Node.js Installation Changes

After deploying CDK updates for the Node.js installation method, you need to refresh the EC2 instances:

### Option 1: Automatic Instance Refresh (Recommended for production)

To update all EC2 instances in the Auto Scaling Group:

1. Deploy the CDK changes:
   ```bash
   cd infrastructure
   cdk deploy GabiYogaWebApp
   ```

2. Use the provided refresh script to initiate an instance refresh:
   ```bash
   ./scripts/refresh-instances.sh
   ```

   **Advanced options:**
   ```bash
   # Customize the minimum healthy percentage (default 50%)
   ./scripts/refresh-instances.sh --min-healthy 75
   
   # Start the refresh but don't wait for completion
   ./scripts/refresh-instances.sh --no-wait
   ```

### Option 2: Manual Update (For development/testing)

For quickly updating a single instance:

1. Deploy the CDK changes
2. Identify the instance you want to update
3. Terminate the instance (ASG will automatically create a new one with the updated configuration)

## Troubleshooting

If you encounter issues with the application deployment or operation, refer to the following resources:

1. [Manual Server Restart Guide](./webapp-stack-https.md) - For troubleshooting EC2 instance issues
2. Check CloudWatch Logs for application and infrastructure logs
3. Examine CloudFormation stack events for deployment issues

For specific Node.js path issues or npm installation problems, use our provided fix scripts:

```bash
# On the EC2 instance
sudo ./infrastructure/scripts/fix-service.sh
```

## Security Notes

- Keep your AWS access keys secure and never commit them to version control
- Use the principle of least privilege for IAM roles and policies
- Regularly rotate credentials, especially database passwords
- Ensure security groups are properly configured to minimize attack surface
- Use HTTPS for all public endpoints via the configured ACM certificates
