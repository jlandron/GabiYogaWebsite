#!/bin/bash
# Script to find the Gabi Yoga ASG and initiate an instance refresh
# Prerequisites: AWS CLI installed and configured with appropriate permissions

set -e  # Exit on error

# Set default values
MIN_HEALTHY_PERCENTAGE=50
STACK_NAME="GabiYogaWebApp"
REGION=$(aws configure get region || echo "us-west-2")
WAIT_FOR_COMPLETION=true

# Option flag for non-interactive mode
INTERACTIVE=true

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --stack-name)
      STACK_NAME="$2"
      shift 2
      ;;
    --min-healthy)
      MIN_HEALTHY_PERCENTAGE="$2"
      shift 2
      ;;
    --region)
      REGION="$2"
      shift 2
      ;;
    --no-wait)
      WAIT_FOR_COMPLETION=false
      shift
      ;;
    --no-confirm)
      INTERACTIVE=false
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --stack-name NAME      CloudFormation stack name (default: GabiYogaWebApp)"
      echo "  --min-healthy PERCENT  Minimum healthy percentage during refresh (default: 50)"
      echo "  --region REGION        AWS region (default: from AWS config or us-west-2)"
      echo "  --no-wait              Don't wait for refresh to complete"
      echo "  --no-confirm           Skip confirmation prompt (non-interactive mode)"
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
echo "Instance Refresh for Gabi Yoga Web Application"
echo "======================================================="
echo "Stack name: $STACK_NAME"
echo "Region: $REGION"
echo "Minimum healthy percentage: $MIN_HEALTHY_PERCENTAGE%"
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

# Get current number of instances
INSTANCE_COUNT=$(aws autoscaling describe-auto-scaling-groups \
  --auto-scaling-group-names "$ASG_NAME" \
  --region "$REGION" \
  --query "AutoScalingGroups[0].Instances | length" \
  --output text)
echo "Current instance count: $INSTANCE_COUNT"

# Confirm with user before proceeding (if in interactive mode)
if [[ "$INTERACTIVE" == "true" ]]; then
  read -p "Do you want to start an instance refresh? This will gradually replace all instances. (y/n): " CONFIRM
  if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
    echo "Operation cancelled."
    exit 0
  fi
else
  echo "Proceeding with instance refresh in non-interactive mode..."
fi

# Start the instance refresh
echo "Starting instance refresh..."
REFRESH_ID=$(aws autoscaling start-instance-refresh \
  --auto-scaling-group-name "$ASG_NAME" \
  --region "$REGION" \
  --preferences "{\"MinHealthyPercentage\": $MIN_HEALTHY_PERCENTAGE, \"InstanceWarmup\": 300}" \
  --query "InstanceRefreshId" \
  --output text)

echo "Instance refresh started with ID: $REFRESH_ID"

# If the user doesn't want to wait, exit here
if [[ "$WAIT_FOR_COMPLETION" == "false" ]]; then
  echo "You can check the status using:"
  echo "aws autoscaling describe-instance-refreshes --auto-scaling-group-name $ASG_NAME --region $REGION"
  exit 0
fi

# Wait for the refresh to complete
echo "Waiting for refresh to complete. This may take several minutes..."
echo "Press Ctrl+C to stop monitoring (refresh will continue in background)"
echo ""

STATUS="Pending"
while [[ "$STATUS" == "Pending" || "$STATUS" == "InProgress" ]]; do
  REFRESH_INFO=$(aws autoscaling describe-instance-refreshes \
    --auto-scaling-group-name "$ASG_NAME" \
    --region "$REGION" \
    --instance-refresh-ids "$REFRESH_ID" \
    --query "InstanceRefreshes[0]")
  
  STATUS=$(echo "$REFRESH_INFO" | jq -r ".Status")
  PERCENTAGE_COMPLETE=$(echo "$REFRESH_INFO" | jq -r ".PercentageComplete")
  INSTANCES_REPLACED=$(echo "$REFRESH_INFO" | jq -r ".InstancesToUpdate")
  
  # Clear previous progress line and show new one
  echo -ne "Status: $STATUS | Progress: $PERCENTAGE_COMPLETE% | Instances to update: $INSTANCES_REPLACED      \r"
  
  # Short sleep to prevent API rate limiting
  sleep 10
done

echo ""
echo "Instance refresh completed with status: $STATUS"
if [[ "$STATUS" == "Successful" ]]; then
  echo "All instances have been replaced successfully!"
else
  echo "Refresh didn't complete successfully. Check the AWS Console for details."
  echo "Failure reason: $(echo "$REFRESH_INFO" | jq -r ".StatusReason")"
fi

echo "Checking new instance status..."
aws autoscaling describe-auto-scaling-groups \
  --auto-scaling-group-names "$ASG_NAME" \
  --region "$REGION" \
  --query "AutoScalingGroups[0].Instances[*].[InstanceId, LifecycleState]" \
  --output table
