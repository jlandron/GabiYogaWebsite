#!/bin/bash
# Manual server verification script for Gabi Yoga Web App instances
# Run this script on EC2 instances after deployment to verify service status

echo "============================================="
echo "Gabi Yoga Server Verification Script"
echo "============================================="
echo

# Check Node.js installation
echo "Checking Node.js installation..."
NODE_VERSION=$(node -v)
if [ $? -ne 0 ]; then
  echo "❌ Node.js is not properly installed!"
else
  echo "✅ Node.js version: $NODE_VERSION"
fi

# Check npm installation
echo "Checking npm installation..."
NPM_VERSION=$(npm -v)
if [ $? -ne 0 ]; then
  echo "❌ npm is not properly installed!"
else
  echo "✅ npm version: $NPM_VERSION"
fi

# Check if server.js exists
echo "Checking if server.js exists..."
if [ -f /var/www/gabiyoga/server.js ]; then
  echo "✅ server.js exists"
else
  echo "❌ server.js not found!"
fi

# Check server service status
echo "Checking gabiyoga service status..."
SYSTEMD_STATUS=$(systemctl is-active gabiyoga)
if [ "$SYSTEMD_STATUS" = "active" ]; then
  echo "✅ gabiyoga service is running"
else
  echo "❌ gabiyoga service is not running (status: $SYSTEMD_STATUS)"
  echo "Service logs:"
  echo "---------------------------------------------"
  journalctl -u gabiyoga -n 15
  echo "---------------------------------------------"
fi

# Check port binding
echo "Checking if application is listening on port 5001..."
LISTENING=$(netstat -tulpn 2>/dev/null | grep 5001)
if [ -z "$LISTENING" ]; then
  echo "❌ No process is listening on port 5001"
else
  echo "✅ Process found listening on port 5001:"
  echo "$LISTENING"
fi

# Check if app is responding to requests
echo "Testing HTTP request to localhost:5001/api/health..."
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5001/api/health)
if [ "$HEALTH_CHECK" = "200" ]; then
  echo "✅ Application responded with 200 OK"
else
  echo "❌ Application did not respond correctly (status: $HEALTH_CHECK)"
fi

echo
echo "============================================="
echo "If service is not running, try these commands:"
echo "sudo systemctl restart gabiyoga"
echo "sudo journalctl -u gabiyoga -f"
echo "cd /var/www/gabiyoga && sudo node server.js"
echo "============================================="
