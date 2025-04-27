#!/bin/bash
# EC2 Admin User Creation Script for Gabi Jyoti Yoga Website
# 
# This script is designed to be run directly on the EC2 instance where
# the application is running. It adds an admin user to the database.
#
# Usage:
#   ./ec2-add-admin.sh --email=admin@example.com --password=securepassword --first-name=Admin --last-name=User

# Default values
EMAIL=""
PASSWORD=""
FIRST_NAME=""
LAST_NAME=""
APP_PATH="/var/www/gabiyoga"

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
    --path=*)
      APP_PATH="${key#*=}"
      shift
      ;;
    --help|-h)
      echo "Usage: $0 --email=admin@example.com --password=securepassword --first-name=Admin --last-name=User [--path=/var/www/gabiyoga]"
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
  echo "Usage: $0 --email=admin@example.com --password=securepassword --first-name=Admin --last-name=User [--path=/var/www/gabiyoga]"
  exit 1
fi

echo "Adding admin user to Gabi Yoga database..."
echo "Email: $EMAIL"
echo "First Name: $FIRST_NAME"
echo "Last Name: $LAST_NAME"
echo "Application Path: $APP_PATH"

# Check if we're in the application directory or navigate to it
if [ "$(pwd)" != "$APP_PATH" ]; then
  echo "Changing to application directory: $APP_PATH"
  cd "$APP_PATH" || {
    echo "Error: Cannot change to application directory $APP_PATH"
    echo "Please ensure the application is deployed correctly or specify the correct path with --path"
    exit 1
  }
fi

# Check if add-admin-user.js exists
if [ ! -f "utils/add-admin-user.js" ]; then
  echo "Error: Admin user script not found at $APP_PATH/utils/add-admin-user.js"
  echo "Please ensure the application is deployed correctly"
  exit 1
fi

# Ensure the script is executable
chmod +x utils/add-admin-user.js

echo "Running admin user creation script..."

# Run the script directly
node utils/add-admin-user.js --email="$EMAIL" --password="$PASSWORD" --firstName="$FIRST_NAME" --lastName="$LAST_NAME"

# Check if the command was successful
if [ $? -eq 0 ]; then
  echo "✅ Admin user creation completed successfully."
  echo "You can now log in with $EMAIL"
else
  echo "❌ Error: Admin user creation may have failed. Check the error messages above."
fi

# Provide information about checking the system logs if needed
echo
echo "If you encounter any issues, check the system logs:"
echo "  journalctl -u gabiyoga -n 50"
echo "Or check the application logs in /var/log/gabiyoga/"
