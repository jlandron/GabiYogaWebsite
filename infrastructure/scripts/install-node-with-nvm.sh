#!/bin/bash
# User data script for Gabi Yoga web application
# This script installs Node.js using NVM on Amazon Linux 2 and prevents symlink issues

# Helper function to safely remove any existing symlinks
safely_remove_symlink() {
    local target="$1"
    if [ -L "$target" ]; then
        echo "Removing existing symlink at $target"
        rm "$target"
    elif [ -e "$target" ]; then
        echo "Warning: $target exists but is not a symlink. Moving it to ${target}.bak"
        mv "$target" "${target}.bak"
    fi
}

# Update system and install essential packages
yum update -y
yum install -y mysql mariadb-client git

# Install NVM and Node.js
echo "Installing NVM..."
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
echo "Installing Node.js with NVM..."

# Source bashrc to ensure NVM is available
source ~/.bashrc || source ~/.bash_profile || true
nvm install 16
nvm use 16
nvm alias default 16

# Get the actual path to the Node.js binary
REAL_NODE_PATH="$NVM_DIR/versions/node/v16.20.2/bin/node"
NODE_DIR=$(dirname "$REAL_NODE_PATH")
REAL_NPM_PATH="$NODE_DIR/npm"
echo "Node.js installed version: $($REAL_NODE_PATH -v)"

# Make NVM available in the system profile
echo "export NVM_DIR=\"\$HOME/.nvm\"" >> /etc/profile.d/nvm.sh
echo "[ -s \"\$NVM_DIR/nvm.sh\" ] && \\. \"\$NVM_DIR/nvm.sh\"" >> /etc/profile.d/nvm.sh
echo "[ -s \"\$NVM_DIR/bash_completion\" ] && \\. \"\$NVM_DIR/bash_completion\"" >> /etc/profile.d/nvm.sh
chmod +x /etc/profile.d/nvm.sh

# Remove any existing symlinks to avoid circular references
safely_remove_symlink "/usr/bin/node"
safely_remove_symlink "/usr/bin/npm" 
safely_remove_symlink "/usr/local/bin/node"
safely_remove_symlink "/usr/local/bin/npm"

# Create new clean symlinks to make node and npm available system-wide
ln -sf "$REAL_NODE_PATH" /usr/bin/node
ln -sf "$REAL_NPM_PATH" /usr/bin/npm
ln -sf "$REAL_NODE_PATH" /usr/local/bin/node
ln -sf "$REAL_NPM_PATH" /usr/local/bin/npm

echo "Created system-wide Node.js symlinks"

# Install CloudWatch agent
yum install -y amazon-cloudwatch-agent

# Install required build tools for npm
yum install -y gcc-c++ make

# Create application directory
mkdir -p /var/www/gabiyoga

# Clone the actual repository now that it's public
echo "Cloning application repository..."
git clone https://github.com/jlandron/GabiYogaWebsite.git /var/www/gabiyoga

# If git clone succeeds, copy the files; otherwise create minimal application
if [ $? -eq 0 ]; then
  echo "✅ Repository cloned successfully"
else
  echo "⚠️ Repository clone failed, creating minimal application"
  
  # Create a minimal server.js file for health checks
  cat > /var/www/gabiyoga/server.js << 'EOL'
// Minimal Express server for Gabi Yoga (Fallback version)
const express = require('express');
const app = express();
const port = process.env.PORT || 5001;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Basic API endpoint
app.get('/api', (req, res) => {
  res.json({ 
    message: 'Gabi Yoga API is running',
    version: '1.0.0',
    timestamp: new Date()
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
EOL

# Create package.json
cat > /var/www/gabiyoga/package.json << 'EOL'
{
  "name": "gabi-yoga",
  "version": "1.0.0",
  "description": "Gabi Yoga Web Application",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.17.1"
  }
}
EOL

# Create public directory and index.html
mkdir -p /var/www/gabiyoga/public
cat > /var/www/gabiyoga/public/index.html << 'EOL'
<!DOCTYPE html>
<html>
<head>
  <title>Gabi Yoga</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; color: #333; }
    .container { max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #2c3e50; }
    .status { padding: 20px; background: #f8f9fa; border-radius: 5px; margin-top: 20px; }
    .success { background: #d4edda; color: #155724; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Gabi Yoga</h1>
    <p>This is a temporary placeholder page.</p>
    
    <div class="status success">
      <h2>Server Status</h2>
      <p>The server is running successfully.</p>
    </div>
  </div>
</body>
</html>
EOL

echo "Created minimal application files"

# Setup environment variables
echo "Setting up environment variables"
cat > /var/www/gabiyoga/.env << EOL
NODE_ENV=production
PORT=5001
DB_TYPE=mysql
DB_HOST=${DB_HOST}
DB_PORT=3306
DB_NAME=yoga
DB_USER=admin
DB_PASSWORD=${DB_PASSWORD}
AWS_REGION=${AWS_REGION}
S3_BUCKET_NAME=${S3_BUCKET_NAME}
CLOUDFRONT_DISTRIBUTION_ID=${CLOUDFRONT_DISTRIBUTION_ID}
JWT_SECRET=${JWT_SECRET}
EOL

# Install dependencies with logging
cd /var/www/gabiyoga
echo "Installing npm dependencies..."
npm install --production 2>&1 | tee /var/log/npm-install.log || { echo "npm install failed"; exit 1; }
echo "NPM dependencies installed successfully"

# Create a start script and make sure server.js is the entrypoint
echo "Ensuring start script exists in package.json"
if [ -f /var/www/gabiyoga/package.json ]; then
  node -e 'const fs=require("fs"); const pkg=JSON.parse(fs.readFileSync("/var/www/gabiyoga/package.json")); if(!pkg.scripts) pkg.scripts={}; if(!pkg.scripts.start) pkg.scripts.start="node server.js"; fs.writeFileSync("/var/www/gabiyoga/package.json", JSON.stringify(pkg, null, 2))'
else
  echo "package.json not found, cannot add start script"
fi

# Setup systemd service
cat > /etc/systemd/system/gabiyoga.service << EOL
[Unit]
Description=Gabi Yoga Web Application
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/gabiyoga
ExecStart=/usr/local/bin/node /var/www/gabiyoga/server.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=gabiyoga
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOL

# Set proper permissions
chown -R root:root /var/www/gabiyoga

# Test Node.js before starting the service
echo "Testing Node.js installation..."
which node && echo "Node path: $(which node)"
ls -la /usr/bin/node || echo "Node binary not found in /usr/bin"
ls -la /var/www/gabiyoga/server.js || { echo "server.js not found"; exit 1; }

# Start the service
systemctl daemon-reload
systemctl enable gabiyoga
systemctl restart gabiyoga || echo "Failed to start service, check journalctl -u gabiyoga for details"

# Verify service status (for logging)
systemctl status gabiyoga --no-pager

# Create troubleshooting script
cat > /home/ec2-user/troubleshoot.sh << EOL
#!/bin/bash
echo "=== System Info ==="
date
hostname
uname -a

echo "\n=== Service Status ==="
systemctl status gabiyoga

echo "\n=== Last 30 Lines of Service Logs ==="
journalctl -u gabiyoga -n 30

echo "\n=== Network Ports ==="
netstat -tulpn | grep -E "5001|80|443"

echo "\n=== Node Process ==="
ps aux | grep node

echo "\n=== Environment Check ==="
cd /var/www/gabiyoga
ls -la
cat .env | grep -v PASSWORD

echo "\n=== Available Versions ==="
/usr/local/bin/node -v || echo "Node not found at /usr/local/bin/node"
/usr/local/bin/npm -v || echo "npm not found at /usr/local/bin/npm"
echo "\n=== NVM Installation ==="
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  echo "NVM is installed"
  source "$HOME/.nvm/nvm.sh"
  echo "Node.js via NVM: $(node -v)"
  echo "npm via NVM: $(npm -v)"
else
  echo "NVM not found in $HOME/.nvm"
fi

echo "\n=== Package.json ==="
cat package.json

echo "\n=== Firewall Status ==="
systemctl status firewalld || echo "Firewall not running"

echo "\n=== Network Configuration ==="
ifconfig || ip addr
EOL
chmod +x /home/ec2-user/troubleshoot.sh

# Make sure the ec2-user can access the troubleshooting script
chmod 755 /home/ec2-user/troubleshoot.sh
chown ec2-user:ec2-user /home/ec2-user/troubleshoot.sh

# Run troubleshooting script once on first boot for logs
/home/ec2-user/troubleshoot.sh > /home/ec2-user/first-boot-debug.log 2>&1 || true
chown ec2-user:ec2-user /home/ec2-user/first-boot-debug.log

# Create a log directory for application logs
mkdir -p /var/log/gabiyoga
touch /var/log/gabiyoga/server.log
chmod 644 /var/log/gabiyoga/server.log
chown root:root /var/log/gabiyoga/server.log

# Add a message indicating setup is complete
echo "GabiYoga webapp setup complete at $(date)" >> /var/log/gabiyoga/setup.log

# Create admin scripts directory and ensure scripts are available
echo "Setting up admin scripts..."
APP_PATH="/var/www/gabiyoga"
mkdir -p /home/ec2-user/admin-scripts

# Copy admin user creation script for easy access
cp $APP_PATH/utils/add-admin-user.js /home/ec2-user/admin-scripts/ 2>/dev/null || echo "⚠️ Warning: Could not copy add-admin-user.js"
cp $APP_PATH/infrastructure/scripts/ec2-add-admin.sh /home/ec2-user/admin-scripts/ 2>/dev/null || echo "⚠️ Warning: Could not copy ec2-add-admin.sh"
cp $APP_PATH/infrastructure/scripts/refresh-service.sh /home/ec2-user/admin-scripts/ 2>/dev/null || echo "⚠️ Warning: Could not copy refresh-service.sh"

# If files weren't copied successfully, create them manually
if [ ! -f /home/ec2-user/admin-scripts/add-admin-user.js ]; then
  echo "Creating add-admin-user.js manually..."
  curl -s https://raw.githubusercontent.com/jlandron/GabiYogaWebsite/main/utils/add-admin-user.js > /home/ec2-user/admin-scripts/add-admin-user.js || echo "⚠️ Failed to download add-admin-user.js"
fi

if [ ! -f /home/ec2-user/admin-scripts/ec2-add-admin.sh ]; then
  echo "Creating ec2-add-admin.sh manually..."
  curl -s https://raw.githubusercontent.com/jlandron/GabiYogaWebsite/main/infrastructure/scripts/ec2-add-admin.sh > /home/ec2-user/admin-scripts/ec2-add-admin.sh || echo "⚠️ Failed to download ec2-add-admin.sh"
fi

if [ ! -f /home/ec2-user/admin-scripts/refresh-service.sh ]; then
  echo "Creating refresh-service.sh manually..."
  curl -s https://raw.githubusercontent.com/jlandron/GabiYogaWebsite/main/infrastructure/scripts/refresh-service.sh > /home/ec2-user/admin-scripts/refresh-service.sh || echo "⚠️ Failed to download refresh-service.sh"
fi

# Make scripts executable
chmod +x /home/ec2-user/admin-scripts/*.sh
chmod +x /home/ec2-user/admin-scripts/add-admin-user.js

# Set appropriate ownership
chown -R ec2-user:ec2-user /home/ec2-user/admin-scripts

# Create instructions file
cat > /home/ec2-user/admin-scripts/README.txt << 'EOL'
Gabi Yoga Admin Scripts
=======================

This directory contains administrative scripts for managing the Gabi Yoga website:

1. Add Admin User:
   sudo ./ec2-add-admin.sh --email=admin@example.com --password=securepassword --first-name=Admin --last-name=User

2. Refresh Service (after GitHub updates):
   sudo ./refresh-service.sh

For more options, use the --help flag with any script:
   ./ec2-add-admin.sh --help
   ./refresh-service.sh --help
EOL

echo "Admin scripts installed to /home/ec2-user/admin-scripts"

# Create a manual server check script
cat > /home/ec2-user/check-server.sh << 'EOL'
#!/bin/bash
# Manual server verification script for Gabi Yoga Web App instances

echo "============================================="
echo "Gabi Yoga Server Verification Script"
echo "============================================="
echo

# Check Node.js installation
echo "Checking Node.js installation..."
NODE_VERSION=$(sudo /usr/local/bin/node -v)
if [ $? -ne 0 ]; then
  echo "❌ Node.js is not properly installed at /usr/local/bin/node!"
  echo "Checking NVM installation..."
  if [ -s "$HOME/.nvm/nvm.sh" ]; then
    echo "✅ NVM is installed"
    source "$HOME/.nvm/nvm.sh"
    NODE_NVM_VERSION=$(node -v)
    echo "✅ Node.js version via NVM: $NODE_NVM_VERSION"
  else
    echo "❌ NVM is not properly installed!"
  fi
else
  echo "✅ Node.js version: $NODE_VERSION"
fi

# Check npm installation
echo "Checking npm installation..."
NPM_VERSION=$(sudo /usr/local/bin/npm -v)
if [ $? -ne 0 ]; then
  echo "❌ npm is not properly installed at /usr/local/bin/npm!"
  if [ -s "$HOME/.nvm/nvm.sh" ]; then
    source "$HOME/.nvm/nvm.sh"
    NPM_NVM_VERSION=$(npm -v)
    echo "✅ npm version via NVM: $NPM_NVM_VERSION"
  fi
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
  sudo journalctl -u gabiyoga -n 15
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
EOL
chmod +x /home/ec2-user/check-server.sh
chown ec2-user:ec2-user /home/ec2-user/check-server.sh

# Final message to indicate script completed successfully
echo "Installation and setup completed successfully!"
