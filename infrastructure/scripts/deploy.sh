#!/bin/bash

# Script to deploy CDK application with local .env file
# Allows for full instance refresh or quick code update

# Set default values
UPDATE_MODE="full"  # Default to full deployment
STACK_NAME="GabiYogaWebApp"
REGION=$(aws configure get region || echo "us-west-2")
INTERACTIVE=true

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --quick-update)
      UPDATE_MODE="quick"
      shift
      ;;
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
    -h|--help)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --quick-update         Use quick update mode (only updates code on EC2 instances)"
      echo "  --stack-name NAME      CloudFormation stack name (default: GabiYogaWebApp)"
      echo "  --region REGION        AWS region (default: from AWS config or us-west-2)"
      echo "  --no-confirm           Skip confirmation prompts (non-interactive mode)"
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

echo "Starting deployment process..."
echo "Update mode: $UPDATE_MODE"

# If quick update mode is selected, skip the CDK deployment and instance refresh
if [ "$UPDATE_MODE" == "quick" ]; then
  echo "Using quick update mode - will only update application code on EC2 instances"
  echo "Skipping infrastructure deployment and instance refresh"
  
  # Run the update-app.sh script with the same interactive/non-interactive mode
  CONFIRM_FLAG=""
  if [ "$INTERACTIVE" == "false" ]; then
    CONFIRM_FLAG="--no-confirm"
  fi
  
  # Execute the quick update script
  ./scripts/update-app.sh --stack-name "$STACK_NAME" --region "$REGION" $CONFIRM_FLAG
  
  # Check if update was successful
  if [ $? -ne 0 ]; then
    echo "Quick update failed. Please check the logs for details."
    exit 1
  fi
  
  echo "Quick update completed successfully!"
else
  # Perform normal full deployment
  
  # Run all tests before deployment
  echo "Running all tests before deployment..."
  cd ../..
  
  # Start the server for integration tests in the background
  echo "Starting test server for integration tests on port 5001..."
  NODE_ENV=test PORT=5001 node server.js &
  SERVER_PID=$!
  
  # Give the server a moment to start
  sleep 3
  
  # Run all tests (unit, DOM, and integration)
  npm run test:all
  
  # Store test result
  TEST_RESULT=$?
  
  # Kill the test server
  echo "Stopping test server..."
  kill $SERVER_PID
  
  # Check if tests passed
  if [ $TEST_RESULT -ne 0 ]; then
    echo "Tests failed. Stopping deployment."
    exit 1
  fi

  echo "All tests passed successfully. Proceeding with deployment..."
  cd infrastructure
  
  # Clean and build the project
  ./scripts/build-clean.sh
  
  # Check if build was successful
  if [ $? -ne 0 ]; then
    echo "Build failed. Stopping deployment."
    exit 1
  fi
  
  echo "Build successful. Deploying infrastructure..."
  
  # Deploy with CDK
  # You can add specific stack names if you want to deploy only specific stacks
  npx cdk deploy --all --require-approval never
  
  # Check if deployment was successful
  if [ $? -ne 0 ]; then
    echo "Deployment failed. Instance refresh will not be initiated."
    exit 1
  fi
  
  echo "Deployment completed! Starting instance refresh..."
  
  # Run instance refresh to update EC2 instances with the new .env file
  # Using --no-confirm flag to avoid interactive prompts if specified
  CONFIRM_FLAG=""
  if [ "$INTERACTIVE" == "false" ]; then
    CONFIRM_FLAG="--no-confirm"
  fi
  
  ./scripts/refresh-instances.sh $CONFIRM_FLAG
fi

if [ "$UPDATE_MODE" == "full" ]; then
  echo "Instance refresh process initiated!"
  echo ""
  echo "Your .env file has been securely deployed to EC2 instances without being uploaded to GitHub."
  echo "The following environment variables from your local .env have been automatically overridden for production:"
  echo "  - NODE_ENV=production"
  echo "  - DB_HOST (set to RDS endpoint)"
  echo "  - DB_PASSWORD (set to RDS password)"
  echo "  - AWS_REGION (set to deployment region)"
  echo "  - S3_BUCKET_NAME (set to created bucket name)"
  echo "  - CLOUDFRONT_DISTRIBUTION_ID (set to created distribution ID)"
  echo ""
  echo "All other environment variables were deployed as-is from your local .env file."
else
  echo ""
  echo "Quick update completed. Only application code has been updated on the EC2 instances."
  echo "No changes were made to infrastructure or environment variables."
fi
