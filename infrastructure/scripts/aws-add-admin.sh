#!/bin/bash
# AWS Admin User Creation Script for Gabi Jyoti Yoga Website
# 
# This script connects to a running EC2 instance in the ASG and adds an admin user
# to the database using the add-admin-user.js utility.
#
# Prerequisites:
# - AWS CLI installed and configured
# - Session Manager Plugin for AWS CLI installed
# - Appropriate permissions to access EC2 instances
# - Running EC2 instances in the WebServerASG

# Default values
EMAIL=""
PASSWORD=""
FIRST_NAME=""
LAST_NAME=""
AWS_REGION="us-west-2"
ASG_NAME="WebServerASG"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    --email=*)
      EMAIL="${key#*=}"
      shift
      ;;
    --password=*)
      PASSWORD="${key#*=}"
      shift
      ;;
    --first-name=*|--firstName=*)
      FIRST_NAME="${key#*=}"
      shift
      ;;
    --last-name=*|--lastName=*)
      LAST_NAME="${key#*=}"
      shift
      ;;
    --region=*)
      AWS_REGION="${key#*=}"
      shift
      ;;
    --asg=*)
      ASG_NAME="${key#*=}"
      shift
      ;;
    --help|-h)
      echo "Usage: $0 --email=admin@example.com --password=securePassword --first-name=Admin --last-name=User [--region=us-west-2] [--asg=WebServerASG]"
      exit 0
      ;;
    *)
      echo "Unknown option: $key"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Validate required parameters
if [ -z "$EMAIL" ] || [ -z "$PASSWORD" ] || [ -z "$FIRST_NAME" ] || [ -z "$LAST_NAME" ]; then
  echo "Error: Missing required arguments"
  echo "Usage: $0 --email=admin@example.com --password=securePassword --first-name=Admin --last-name=User [--region=us-west-2] [--asg=WebServerASG]"
  exit 1
fi

echo "Adding admin user to Gabi Yoga database in AWS..."
echo "Email: $EMAIL"
echo "First Name: $FIRST_NAME"
echo "Last Name: $LAST_NAME"
echo "AWS Region: $AWS_REGION"
echo "Auto Scaling Group: $ASG_NAME"

# Get instance IDs from the auto scaling group
echo "Finding running EC2 instances in Auto Scaling Group: $ASG_NAME"
INSTANCE_IDS=$(aws autoscaling describe-auto-scaling-groups \
  --region "$AWS_REGION" \
  --auto-scaling-group-names "$ASG_NAME" \
  --query "AutoScalingGroups[0].Instances[?LifecycleState=='InService'].InstanceId" \
  --output text)

if [ -z "$INSTANCE_IDS" ]; then
  echo "Error: No running instances found in Auto Scaling Group $ASG_NAME"
  exit 1
fi

# Pick the first instance ID
INSTANCE_ID=$(echo "$INSTANCE_IDS" | awk '{print $1}')
echo "Using EC2 instance: $INSTANCE_ID"

# Create the command to run on the remote instance
SSM_COMMAND="cd /var/www/gabiyoga && /usr/local/bin/node utils/add-admin-user.js --email=$EMAIL --password=$PASSWORD --firstName=$FIRST_NAME --lastName=$LAST_NAME"

echo "Connecting to instance via AWS Session Manager..."
echo "Running admin user creation script. This may take a minute..."

# Run the command on the instance using Session Manager
aws ssm start-session \
  --region "$AWS_REGION" \
  --target "$INSTANCE_ID" \
  --document-name "AWS-StartInteractiveCommand" \
  --parameters command="$SSM_COMMAND"

# Check if the command was successful
if [ $? -eq 0 ]; then
  echo "Admin user creation completed. Log in with $EMAIL"
else
  echo "Error: Admin user creation may have failed. Check the output above for errors."
  echo "You can try connecting to the instance manually and running:"
  echo "$SSM_COMMAND"
fi
