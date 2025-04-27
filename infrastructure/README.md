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

### Option 2: Manual Execution via SSH or Session Manager

If you prefer to manually connect to an EC2 instance:

1. Connect to an EC2 instance using SSH or AWS Session Manager
2. Navigate to the application directory
3. Run the admin user creation script:
   ```bash
   cd /var/www/gabiyoga
   node utils/add-admin-user.js \
     --email=admin@example.com \
     --password=securepassword \
     --firstName=Admin \
     --lastName=User
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

After deploying the CDK updates for the Node.js installation method, the changes won't automatically apply to already running instances. Here's how to apply the changes:

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

   The script will:
   - Automatically find the Auto Scaling Group in the CloudFormation stack
   - Show you the current instance count
   - Ask for confirmation before starting the refresh
   - Monitor the progress until completion
   
   **Advanced options:**
   ```bash
   # Customize the minimum healthy percentage (default 50%)
   ./scripts/refresh-instances.sh --min-healthy 75
   
   # Start the refresh but don't wait for completion
   ./scripts/refresh-instances.sh --no-wait
   
   # See all available options
   ./scripts/refresh-instances.sh --help
   ```

### Option 2: Manual Update (For development/testing)

For quickly updating a single instance:

1. Deploy the CDK changes
2. Identify the instance you want to update
3. Terminate the instance (ASG will automatically create a new one with the updated configuration)
4. Wait for the new instance to initialize (typically 5-10 minutes)
5. Verify the Node.js installation is working correctly

> ⚠️ **Note:** The instance refresh approach is preferable for production environments as it maintains availability by gradually replacing instances.

## Verifying Node.js Installation

After deploying the CDK changes and refreshing the EC2 instances, you can verify that Node.js is installed correctly using the provided verification script:

```bash
# Basic verification - lists instances in the Auto Scaling Group
./scripts/verify-node-installation.sh

# Detailed verification - runs checks on each instance via SSM
./scripts/verify-node-installation.sh --detailed
```

The detailed verification will:
- Check if Node.js is available at `/usr/local/bin/node`
- Check if npm is available at `/usr/local/bin/npm`
- Verify the NVM installation
- Test Node.js via NVM
- Check the status of the gabiyoga service
- Check for listening ports
- Show recent log entries

> ⚠️ **Note:** The detailed verification uses AWS Systems Manager (SSM), so make sure your instances have the SSM agent installed and appropriate IAM permissions.

## Troubleshooting Issues on EC2 Instances

### Service Not Starting

If after refreshing instances, the Node.js application service is not starting automatically, you can use the included fix-service.sh script to troubleshoot and repair the installation:

1. SSH into the problematic EC2 instance:
   ```bash
   ssh -i your-key.pem ec2-user@instance-ip-address
   ```

2. Copy the fix-service.sh script to the EC2 instance:
   ```bash
   # On your local machine
   scp -i your-key.pem infrastructure/scripts/fix-service.sh ec2-user@instance-ip-address:~
   ```

3. Run the script on the EC2 instance:
   ```bash
   # On the EC2 instance
   sudo chmod +x ~/fix-service.sh
   sudo ./fix-service.sh
   ```

The script will:
- Verify Node.js installation and fix symbolic links if needed
- Check for the application directory and server.js file
- Validate or repair the systemd service configuration
- Enable and start the service
- Perform connectivity tests
- Provide a detailed report of any issues found

If the script doesn't fully resolve your issues, it will provide specific troubleshooting steps based on its findings.

### npm and Node.js Path Issues

If you encounter either of these errors:
- `sudo: npm: command not found`
- `/usr/bin/env: node: No such file or directory`

Use our deployment scripts to fix these issues:

#### For Basic npm Path Issues:

1. SSH into the EC2 instance:
   ```bash
   ssh -i your-key.pem ec2-user@instance-ip-address
   ```

2. Copy the fixed deployment script to the EC2 instance:
   ```bash
   # On your local machine
   scp -i your-key.pem infrastructure/scripts/deploy-app-files-fixed.sh ec2-user@instance-ip-address:~
   ```

3. Run the script on the EC2 instance:
   ```bash
   # On the EC2 instance
   chmod +x ~/deploy-app-files-fixed.sh
   sudo ./deploy-app-files-fixed.sh
   ```

#### For Persistent Node.js Path Issues:

We provide two levels of solutions:

##### Option 1: Basic Path Fix Script

1. SSH into the EC2 instance:
   ```bash
   ssh -i your-key.pem ec2-user@instance-ip-address
   ```

2. Copy the deployment script to the EC2 instance:
   ```bash
   # On your local machine
   scp -i your-key.pem infrastructure/scripts/deploy-app-files-final.sh ec2-user@instance-ip-address:~
   ```

3. Run the script on the EC2 instance:
   ```bash
   # On the EC2 instance
   chmod +x ~/deploy-app-files-final.sh
   sudo ./deploy-app-files-final.sh
   ```

This script:
- Addresses `/usr/bin/env: node: No such file or directory` errors
- Creates appropriate symbolic links for Node.js and npm
- Sets the PATH environment variable in the systemd service

##### Option 2: Ultimate Fix for Circular Symlinks (RECOMMENDED)

If you encounter the "Too many levels of symbolic links" error, use our ultimate script:

1. SSH into the EC2 instance:
   ```bash
   ssh -i your-key.pem ec2-user@instance-ip-address
   ```

2. Copy the ultimate deployment script to the EC2 instance:
   ```bash
   # On your local machine
   scp -i your-key.pem infrastructure/scripts/deploy-app-files-ultimate.sh ec2-user@instance-ip-address:~
   ```

3. Run the script on the EC2 instance:
   ```bash
   # On the EC2 instance
   chmod +x ~/deploy-app-files-ultimate.sh
   sudo ./deploy-app-files-ultimate.sh
   ```

This comprehensive script:
- **Fixes circular symlink issues** by safely removing problematic links
- Directly locates the real Node.js binary from NVM without relying on existing symlinks
- Creates clean symlinks that point directly to the actual binaries
- Verifies symlinks work correctly before proceeding with deployment
- Updates the systemd service to use the real Node.js path
- Includes detailed error diagnostics and fallback installation methods
- Tests the application to confirm it's working correctly
