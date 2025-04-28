#!/bin/bash
# Script to update the application code on EC2 instances without a full instance refresh
# Prerequisites: AWS CLI installed and configured with appropriate permissions

set -e  # Exit on error

# Set default values
STACK_NAME="GabiYogaWebApp"
REGION=$(aws configure get region || echo "us-west-2")
VERBOSE=false

# Option flag for non-interactive mode
INTERACTIVE=true

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --stack-name)
      STACK_NAME="$2"
      shift 2
      ;;
    --region)
      REGION="$2"
      shift 2
      ;;
    --no-confirm)
      INTERACTIVE=false
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --stack-name NAME      CloudFormation stack name (default: GabiYogaWebApp)"
      echo "  --region REGION        AWS region (default: from AWS config or us-west-2)"
      echo "  --no-confirm           Skip confirmation prompt (non-interactive mode)"
      echo "  --verbose              Enable verbose output"
      echo "  -h, --help             Display this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use -h or --help for usage information"
      exit 1
      ;;
  esac
done

echo "======================================================="
echo "Application Update for Gabi Yoga Web Application"
echo "======================================================="
echo "Stack name: $STACK_NAME"
echo "Region: $REGION"
echo ""

# Find the Auto Scaling Group resource ID from the CloudFormation stack
echo "Looking up Auto Scaling Group from CloudFormation stack..."
ASG_RESOURCE=$(aws cloudformation describe-stack-resources \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query "StackResources[?ResourceType=='AWS::AutoScaling::AutoScalingGroup']" \
  --output json)

# Check if we found any ASG resources
ASG_COUNT=$(echo "$ASG_RESOURCE" | jq 'length')
if [[ "$ASG_COUNT" == "0" ]]; then
  echo "Error: No Auto Scaling Group found in stack $STACK_NAME"
  exit 1
fi

# Extract the ASG name
ASG_NAME=$(echo "$ASG_RESOURCE" | jq -r '.[0].PhysicalResourceId')
echo "Found Auto Scaling Group: $ASG_NAME"

# Get all running instances in the ASG
INSTANCES=$(aws autoscaling describe-auto-scaling-groups \
  --auto-scaling-group-names "$ASG_NAME" \
  --region "$REGION" \
  --query "AutoScalingGroups[0].Instances[?LifecycleState=='InService'].InstanceId" \
  --output json)

INSTANCE_COUNT=$(echo "$INSTANCES" | jq 'length')
echo "Found $INSTANCE_COUNT running instance(s)"

if [[ "$INSTANCE_COUNT" == "0" ]]; then
  echo "Error: No running instances found in Auto Scaling Group $ASG_NAME"
  exit 1
fi

# Display the instance IDs
echo "Instance IDs:"
echo "$INSTANCES" | jq -r '.[]'

# Confirm with user before proceeding (if in interactive mode)
if [[ "$INTERACTIVE" == "true" ]]; then
  read -p "Do you want to update the application code on these instances? (y/n): " CONFIRM
  if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
    echo "Operation cancelled."
    exit 0
  fi
else
  echo "Proceeding with application update in non-interactive mode..."
fi

# Update each instance
echo "Updating instances..."
FAILED_INSTANCES=()
SUCCESSFUL_INSTANCES=()

for INSTANCE_ID in $(echo "$INSTANCES" | jq -r '.[]'); do
  echo "------------------------------------------------------"
  echo "Updating instance $INSTANCE_ID..."
  
  # Execute the update commands via SSM Run Command
  echo "Executing update commands via AWS Systems Manager..."
  COMMAND_ID=$(aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --comment "Update Gabi Yoga application code" \
    --parameters '{
      "commands": [
        "cd /var/www/gabiyoga",
        "echo \"Backing up production environment file...\"",
        "cp -f .env .env.production.bak",
        "echo \"Checking out latest code from GitHub repository...\"",
        "git fetch origin",
        "git reset --hard HEAD",
        "git checkout main",
        "git pull origin main",
        "echo \"Restoring production environment file...\"",
        "cp -f .env.production.bak .env",
        "echo \"Ensuring production mode is set...\"",
        "grep -q \"^NODE_ENV=production\" .env || sed -i \"s/^NODE_ENV=.*/NODE_ENV=production/\" .env",
        "echo \"Installing dependencies...\"",
        "npm install --production",
        "echo \"Restarting service...\"",
        "sudo systemctl restart gabiyoga",
        "echo \"Checking service status...\"",
        "systemctl status gabiyoga --no-pager",
        "echo \"Update completed successfully!\""
      ]
    }' \
    --region "$REGION" \
    --output text \
    --query "Command.CommandId")

  echo "Command ID: $COMMAND_ID"
  
  # Wait for command to complete
  echo "Waiting for command to complete..."
  aws ssm wait command-executed \
    --command-id "$COMMAND_ID" \
    --instance-id "$INSTANCE_ID" \
    --region "$REGION"
  
  # Get command output
  COMMAND_OUTPUT=$(aws ssm get-command-invocation \
    --command-id "$COMMAND_ID" \
    --instance-id "$INSTANCE_ID" \
    --region "$REGION")
  
  COMMAND_STATUS=$(echo "$COMMAND_OUTPUT" | jq -r '.Status')
  
  if [[ "$COMMAND_STATUS" == "Success" ]]; then
    echo "✅ Instance $INSTANCE_ID updated successfully"
    SUCCESSFUL_INSTANCES+=("$INSTANCE_ID")
    
    # Print verbose output if requested
    if [[ "$VERBOSE" == "true" ]]; then
      echo "Command output:"
      echo "$COMMAND_OUTPUT" | jq -r '.StandardOutputContent'
    fi
  else
    echo "❌ Failed to update instance $INSTANCE_ID"
    echo "Error details:"
    echo "$COMMAND_OUTPUT" | jq -r '.StandardErrorContent'
    FAILED_INSTANCES+=("$INSTANCE_ID")
  fi
done

echo "======================================================="
echo "Update Summary"
echo "======================================================="
echo "Total instances: $INSTANCE_COUNT"
echo "Successfully updated: ${#SUCCESSFUL_INSTANCES[@]}"
echo "Failed: ${#FAILED_INSTANCES[@]}"

if [[ ${#FAILED_INSTANCES[@]} -gt 0 ]]; then
  echo ""
  echo "Failed instances:"
  for INSTANCE in "${FAILED_INSTANCES[@]}"; do
    echo "- $INSTANCE"
  done
  echo ""
  echo "Some instances failed to update. You may need to try again or run a full instance refresh."
  exit 1
else
  echo ""
  echo "All instances updated successfully!"
  exit 0
fi
