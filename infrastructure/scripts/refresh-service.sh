#!/bin/bash
# Refresh Service Script for Gabi Yoga Website
# 
# This script pulls the latest changes from GitHub and refreshes the service.
# It should be run directly on the EC2 instance after pushing changes to your repo.
#
# Usage:
#   ./refresh-service.sh [--path=/var/www/gabiyoga]

# Set default application path
APP_PATH="/var/www/gabiyoga"
REPO_URL="https://github.com/jlandron/GabiYogaWebsite.git"
BRANCH="main"
SERVICE_NAME="gabiyoga"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    --path=*)
      APP_PATH="${key#*=}"
      shift
      ;;
    --repo=*)
      REPO_URL="${key#*=}"
      shift
      ;;
    --branch=*)
      BRANCH="${key#*=}"
      shift
      ;;
    --service=*)
      SERVICE_NAME="${key#*=}"
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [--path=/var/www/gabiyoga] [--repo=repo_url] [--branch=branch_name] [--service=service_name]"
      echo
      echo "Options:"
      echo "  --path      Path to application directory (default: /var/www/gabiyoga)"
      echo "  --repo      Git repository URL (default: GabiYogaWebsite GitHub repo)"
      echo "  --branch    Git branch to pull (default: main)"
      echo "  --service   SystemD service name (default: gabiyoga)"
      exit 0
      ;;
    *)
      echo "Unknown option: $key"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "⚠️ Warning: This script should be run as root or with sudo to restart the service"
  echo "Please run with: sudo $0 ${*}"
  exit 1
fi

echo "=========================================="
echo "🔄 Refreshing Gabi Yoga Website Service"
echo "=========================================="
echo "Application path: $APP_PATH"
echo "Git repository: $REPO_URL"
echo "Git branch: $BRANCH"
echo "Service name: $SERVICE_NAME"
echo "=========================================="

# Check if we're in a git repository or navigate to it
if [ ! -d "$APP_PATH" ]; then
  echo "❌ Error: Application directory $APP_PATH does not exist"
  exit 1
fi

echo "📂 Changing to application directory: $APP_PATH"
cd "$APP_PATH" || {
  echo "❌ Error: Cannot change to application directory $APP_PATH"
  exit 1
}

# Check if this is a git repository
if [ ! -d ".git" ]; then
  echo "⚠️ Warning: This doesn't appear to be a git repository"
  echo "Would you like to clone the repository? (y/n)"
  read -r response
  if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo "📥 Backing up existing files..."
    BACKUP_DIR="/tmp/gabiyoga-backup-$(date +%Y%m%d%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    cp -r "$APP_PATH"/* "$BACKUP_DIR"/ 2>/dev/null || true
    
    echo "🗑️ Removing existing application files..."
    find "$APP_PATH" -mindepth 1 -not -path "$APP_PATH/.env" -not -path "$APP_PATH/data*" -delete
    
    echo "📥 Cloning repository..."
    git clone "$REPO_URL" -b "$BRANCH" --single-branch temp_clone
    cp -r temp_clone/* "$APP_PATH"/ 2>/dev/null || true
    cp -r temp_clone/.* "$APP_PATH"/ 2>/dev/null || true
    rm -rf temp_clone
    
    echo "🔧 Setting up Git repository..."
    git init
    git remote add origin "$REPO_URL"
    git fetch
    git checkout -b "$BRANCH" --track "origin/$BRANCH"
  else
    echo "❌ Operation cancelled"
    exit 1
  fi
fi

echo "📥 Fetching latest changes from git repository..."
git fetch origin

# Check for local changes
if ! git diff --quiet; then
  echo "⚠️ Warning: You have local changes that may be overwritten"
  echo "Would you like to stash these changes? (y/n)"
  read -r response
  if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    git stash
    echo "💾 Local changes have been stashed"
  else
    echo "⚠️ Proceeding with pull, but local changes may cause conflicts"
  fi
fi

# Pull latest changes
echo "⬇️ Pulling latest changes from $BRANCH branch..."
if git pull origin "$BRANCH"; then
  echo "✅ Successfully pulled latest changes"
else
  echo "❌ Error: Failed to pull latest changes"
  echo "Would you like to try a hard reset? (y/n) (Warning: This will discard all local changes)"
  read -r response
  if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    git fetch origin
    git reset --hard "origin/$BRANCH"
    echo "✅ Reset to latest $BRANCH branch"
  else
    echo "❌ Pull failed and reset was declined. Please resolve git issues manually."
    exit 1
  fi
fi

# Install dependencies
echo "📦 Installing/updating npm dependencies..."
npm ci || npm install

# Check for .env file
if [ ! -f ".env" ]; then
  echo "⚠️ No .env file found. Checking for .env.example..."
  if [ -f ".env.example" ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️ Please update the .env file with your actual configuration values"
  else
    echo "⚠️ Warning: No .env or .env.example file found"
    echo "You may need to create a .env file manually"
  fi
fi

# Check for database migrations or schema updates
echo "🔍 Checking for database schema changes..."
if [ -f "database/schema.js" ] || [ -f "database/migrations" ]; then
  echo "Would you like to run database migrations? (y/n)"
  read -r response
  if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo "🔄 Running database updates..."
    node database/schema.js || echo "⚠️ Schema update may have failed"
  else
    echo "⏩ Skipping database migrations"
  fi
fi

# Restart the service
echo "🔄 Restarting $SERVICE_NAME service..."
systemctl restart "$SERVICE_NAME"

# Check service status
echo "🔍 Checking service status..."
if systemctl is-active --quiet "$SERVICE_NAME"; then
  echo "✅ Service is running"
  
  # Additional checks
  echo "🔍 Checking if application is responding..."
  sleep 2 # Give the service a moment to start up
  if curl -s http://localhost:5001/api/health > /dev/null; then
    echo "✅ Application is responding to health check"
  else
    echo "⚠️ Warning: Application doesn't seem to be responding to health check"
    echo "Check logs with: journalctl -u $SERVICE_NAME -n 50"
  fi
else
  echo "❌ Error: Service failed to start"
  echo "Checking service status:"
  systemctl status "$SERVICE_NAME" --no-pager
  echo
  echo "Check logs with: journalctl -u $SERVICE_NAME -n 50"
fi

# Final status
echo
echo "=========================================="
echo "✅ Service refresh operation completed"
echo "=========================================="
echo "For troubleshooting:"
echo " - View logs: journalctl -u $SERVICE_NAME -n 50"
echo " - Check status: systemctl status $SERVICE_NAME"
echo " - Start service: systemctl start $SERVICE_NAME"
echo " - Restart service: systemctl restart $SERVICE_NAME"
echo "=========================================="
