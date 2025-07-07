import { Stack, StackProps, Duration, CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { 
  SecurityGroup, 
  Peer, 
  Port, 
  Vpc, 
  UserData, 
  LaunchTemplate, 
  MachineImage,
  InstanceType,
  InstanceClass,
  InstanceSize,
  SubnetType
} from 'aws-cdk-lib/aws-ec2';
import { 
  Role, 
  ServicePrincipal, 
  ManagedPolicy 
} from 'aws-cdk-lib/aws-iam';
import { 
  ApplicationLoadBalancer, 
  ApplicationListener, 
  ListenerAction, 
  ApplicationProtocol,
  SslPolicy 
} from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { 
  AutoScalingGroup 
} from 'aws-cdk-lib/aws-autoscaling';
import { 
  IBucket 
} from 'aws-cdk-lib/aws-s3';
import { 
  Distribution 
} from 'aws-cdk-lib/aws-cloudfront';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

export interface WebAppStackProps extends StackProps {
  vpc: Vpc;
  bucket: IBucket;
  distribution: Distribution;
  databaseEndpoint?: string; // We'll use this to configure the EC2 instances
  domainName?: string; // Domain name for email configuration
}

export class WebAppStack extends Stack {
  public readonly loadBalancer: ApplicationLoadBalancer;
  public readonly webSecurityGroup: SecurityGroup;
  public readonly asg: AutoScalingGroup;
  private httpListener: ApplicationListener;
  
  constructor(scope: Construct, id: string, props: WebAppStackProps) {
    super(scope, id, props);

    // Create security group for web instances
    this.webSecurityGroup = new SecurityGroup(this, 'WebSecurityGroup', {
      vpc: props.vpc,
      description: 'Security group for web servers',
      allowAllOutbound: true,
    });
    
    const webSg = this.webSecurityGroup; // For readability in the rest of the code

    // Allow inbound HTTP and HTTPS traffic
    webSg.addIngressRule(Peer.anyIpv4(), Port.tcp(80), 'Allow HTTP');
    webSg.addIngressRule(Peer.anyIpv4(), Port.tcp(443), 'Allow HTTPS');

    // Allow SSH access (for administration only - consider using SSM in production)
    webSg.addIngressRule(Peer.anyIpv4(), Port.tcp(22), 'Allow SSH');

    // Create IAM role for EC2 instances
    const webServerRole = new Role(this, 'WebServerRole', {
      assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'), // For SSM
        ManagedPolicy.fromAwsManagedPolicyName('AmazonS3ReadOnlyAccess'), // For S3 access
        ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'), // For CloudWatch
        ManagedPolicy.fromAwsManagedPolicyName('SecretsManagerReadWrite'), // For accessing JWT and DB secrets
      ],
    });

    // Add specific permissions to write to the S3 bucket
    props.bucket.grantReadWrite(webServerRole);

    // Load and prepare user data script from file
    const userData = UserData.forLinux();
    
    // Prepare database information
    // Use the provided database endpoint or a fallback value
    const dbHost = props.databaseEndpoint || 'localhost';
    const awsRegion = this.region || 'us-west-2';
    const bucketName = props.bucket.bucketName;
    const cfDistId = props.distribution.distributionId;
    const dbSecretName = 'gabi-yoga-db-credentials';
    
    // Add the user data commands directly in the file
    userData.addCommands(
      'echo "Starting user data script execution at $(date)"',
      'set -x', // Echo commands for better debugging
      
      // User data script for Gabi Yoga web application
      'yum update -y',
      'yum install -y mysql git mariadb-client',
      
      // Install NVM and Node.js
      'echo "Installing NVM..."',
      'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash',
      'export NVM_DIR="$HOME/.nvm"',
      '[ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"',
      '[ -s "$NVM_DIR/bash_completion" ] && \\. "$NVM_DIR/bash_completion"',
      
      // Source bashrc to ensure NVM is available
      'echo "Sourcing bash profiles to enable NVM"',
      'source ~/.bashrc || source ~/.bash_profile || true',
      'nvm install 16',
      'nvm use 16',
      'nvm alias default 16',
      
      // Create symlinks to make Node.js available system-wide
      'echo "Creating system-wide Node.js symlinks"',
      'NODE_PATH="$HOME/.nvm/versions/node/v16.20.2/bin/node"',
      'NPM_PATH="$HOME/.nvm/versions/node/v16.20.2/bin/npm"',
      '[ -f "$NODE_PATH" ] || NODE_PATH="$(find $HOME/.nvm/versions/node -name node -type f | head -n 1)"',
      '[ -f "$NPM_PATH" ] || NPM_PATH="$(find $HOME/.nvm/versions/node -name npm -type f | head -n 1)"',
      'echo "Node path: $NODE_PATH"',
      'echo "NPM path: $NPM_PATH"',
      
      // Remove existing symlinks if they exist
      'if [ -L "/usr/bin/node" ]; then rm -f /usr/bin/node; fi',
      'if [ -L "/usr/bin/npm" ]; then rm -f /usr/bin/npm; fi',
      'if [ -L "/usr/local/bin/node" ]; then rm -f /usr/local/bin/node; fi',
      'if [ -L "/usr/local/bin/npm" ]; then rm -f /usr/local/bin/npm; fi',
      
      // Create new symlinks
      'ln -sf "$NODE_PATH" /usr/bin/node',
      'ln -sf "$NPM_PATH" /usr/bin/npm',
      'ln -sf "$NODE_PATH" /usr/local/bin/node',
      'ln -sf "$NPM_PATH" /usr/local/bin/npm',
      'ls -la /usr/bin/node || echo "Failed to create symlink"',
      
      // Make NVM available in system profile
      'echo "export NVM_DIR=\\"\\\$HOME/.nvm\\"" >> /etc/profile.d/nvm.sh',
      'echo "[ -s \\\"\\\$NVM_DIR/nvm.sh\\\" ] && \\\\. \\\"\\\$NVM_DIR/nvm.sh\\\"" >> /etc/profile.d/nvm.sh',
      'echo "[ -s \\\"\\\$NVM_DIR/bash_completion\\\" ] && \\\\. \\\"\\\$NVM_DIR/bash_completion\\\"" >> /etc/profile.d/nvm.sh',
      'chmod +x /etc/profile.d/nvm.sh',
      
      // Create application directory
      'mkdir -p /var/www/gabiyoga',
      
      // Clone the repository
      'echo "Cloning application repository..."',
      'git clone https://github.com/jlandron/GabiYogaWebsite.git /var/www/gabiyoga-temp',
      
      // Copy files if clone succeeds
      'if [ $? -eq 0 ]; then',
      '  cp -R /var/www/gabiyoga-temp/* /var/www/gabiyoga/',
      '  cp -R /var/www/gabiyoga-temp/.* /var/www/gabiyoga/ 2>/dev/null || echo "No hidden files to copy"',
      '  rm -rf /var/www/gabiyoga-temp',
      '  echo "✅ Repository cloned successfully"',
      'else',
      '  echo "⚠️ Repository clone failed, creating minimal application"',
      '  # Create server.js file',
      '  cat > /var/www/gabiyoga/server.js << \'EOF\'',
      '// Minimal Express server for Gabi Yoga',
      'const express = require(\'express\');',
      'const app = express();',
      'const port = process.env.PORT || 5001;',
      '',
      '// Middleware',
      'app.use(express.json());',
      'app.use(express.static(\'public\'));',
      '',
      '// Health check endpoint',
      'app.get(\'/api/health\', (req, res) => {',
      '  res.json({ status: \'ok\', message: \'Server is running\' });',
      '});',
      '',
      'app.listen(port, () => {',
      '  console.log(`Server running on port ${port}`);',
      '});',
      'EOF',
      '',
      '  # Create package.json',
      '  cat > /var/www/gabiyoga/package.json << \'EOF\'',
      '{',
      '  "name": "gabi-yoga",',
      '  "version": "1.0.0",',
      '  "description": "Gabi Yoga Web Application",',
      '  "main": "server.js",',
      '  "scripts": {',
      '    "start": "node server.js"',
      '  },',
      '  "dependencies": {',
      '    "express": "^4.17.1"',
      '  }',
      '}',
      'EOF',
      '',
      '  # Create public directory and index.html',
      '  mkdir -p /var/www/gabiyoga/public',
      '  echo "<!DOCTYPE html><html><body><h1>Gabi Yoga</h1><p>Server is running</p></body></html>" > /var/www/gabiyoga/public/index.html',
      'fi',
      
    // Install required tools
    'yum install -y jq',
    
    // Fetch database credentials from Secrets Manager
    `echo "Fetching database credentials from Secrets Manager"`,
    `export AWS_DEFAULT_REGION=${awsRegion}`,
    `echo "Using AWS region: ${awsRegion}"`,
    `SECRET_JSON=$(aws secretsmanager get-secret-value --secret-id ${dbSecretName} --region ${awsRegion} --query SecretString --output text)`,
    `DB_USERNAME=$(echo $SECRET_JSON | jq -r '.username')`,
    `DB_PASSWORD=$(echo $SECRET_JSON | jq -r '.password')`,
    
    // Generate environment file with fetched credentials
    'echo "Creating .env file with secure credentials"',
    
    // Fetch JWT secret from Secrets Manager
    `echo "Fetching JWT secret from Secrets Manager"`,
    `JWT_SECRET_JSON=$(aws secretsmanager get-secret-value --secret-id gabi-yoga-jwt-secret --region ${awsRegion} --query SecretString --output text)`,
    `JWT_SECRET_VALUE=$(echo $JWT_SECRET_JSON | jq -r '.secret')`,
    `echo "JWT secret retrieved successfully"`,
    
    'cat > /var/www/gabiyoga/.env << EOF',
      'NODE_ENV=production',
      'PORT=5001',
      'JWT_SECRET=${JWT_SECRET_VALUE}',
      'JWT_SECRET_NAME=gabi-yoga-jwt-secret',
      'JWT_EXPIRY=24h',
      `DB_TYPE=mysql`,
      `DB_HOST=${dbHost}`,
      'DB_PORT=3306',
      'DB_NAME=yoga',
      'DB_USER=${DB_USERNAME}',
      'DB_PASSWORD=${DB_PASSWORD}',
      `AWS_REGION=${awsRegion}`,
      `S3_BUCKET_NAME=${bucketName}`,
      `CLOUDFRONT_DISTRIBUTION_ID=${cfDistId}`,
      `STRIPE_PUBLISHABLE_KEY=pk_test_51RIECgFvIUQZU80GkNvPQBmwpbKhf0LiFCh4Rv5EPxArapsnz6f3C4CWenkiPrZshZCJW3ghjfvveCpdou1bAJkC00b1TlmLo9`,
      `STRIPE_SECRET_KEY=sk_test_your_secret_key`,
      `STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret`,
      `# Email configuration for password reset`,
      `EMAIL_FROM=noreply@${props.domainName || 'gabi.yoga'}`,
      `BASE_URL=https://${props.domainName || 'gabi.yoga'}`,
    'EOF',
    
    // Create MySQL user with wildcard host for EC2 connectivity
    'echo "Creating MySQL user with wildcard host..."',
    'mysql -h $DB_HOST -u $DB_USERNAME -p$DB_PASSWORD << EOF',
    'CREATE USER IF NOT EXISTS \'$DB_USERNAME\'@\'%\' IDENTIFIED BY \'$DB_PASSWORD\';',
    'GRANT ALL PRIVILEGES ON yoga.* TO \'$DB_USERNAME\'@\'%\';',
    'FLUSH PRIVILEGES;',
    'EOF',
    
    // Create data directory for SQLite (for development mode or explicit override)
    'mkdir -p /var/www/gabiyoga/data',
    'touch /var/www/gabiyoga/data/yoga.sqlite',
    'chmod 644 /var/www/gabiyoga/.env',
      
      // Install dependencies
      'cd /var/www/gabiyoga',
      'npm install --production',
      
      // Setup systemd service with absolute path to node
      'cat > /etc/systemd/system/gabiyoga.service << EOF',
      '[Unit]',
      'Description=Gabi Yoga Web Application',
      'After=network.target',
      '',
      '[Service]',
      'Type=simple',
      'User=root',
      'WorkingDirectory=/var/www/gabiyoga',
      'ExecStart=$NODE_PATH /var/www/gabiyoga/server.js',
      'Restart=on-failure',
      'RestartSec=10',
      'StandardOutput=journal',
      'StandardError=journal',
      'SyslogIdentifier=gabiyoga',
      'Environment=NODE_ENV=production',
      'EnvironmentFile=/var/www/gabiyoga/.env',
      '',
      '[Install]',
      'WantedBy=multi-user.target',
      'EOF',
      'echo "Created systemd service with Node.js path: $NODE_PATH"',
      
      // Start service
      'systemctl daemon-reload',
      'systemctl enable gabiyoga',
      'systemctl start gabiyoga',
      'echo "Gabi Yoga web application startup completed"',
      
      'echo "User data script completed at $(date)"'
    );

    // Create load balancer
    this.loadBalancer = new ApplicationLoadBalancer(this, 'LoadBalancer', {
      vpc: props.vpc,
      internetFacing: true,
      securityGroup: webSg,
    });

    // Add HTTP listener
    this.httpListener = this.loadBalancer.addListener('HttpListener', {
      port: 80,
      open: true,
    });

    // Create Launch Template - Using t2.micro for free tier
    const launchTemplate = new LaunchTemplate(this, 'WebServerLaunchTemplate', {
      machineImage: MachineImage.latestAmazonLinux2(),
      instanceType: InstanceType.of(
        InstanceClass.BURSTABLE2,
        InstanceSize.MICRO // t2.micro is free tier eligible
      ),
      role: webServerRole,
      securityGroup: webSg,
      userData,
    });

    // Create Auto Scaling Group with Launch Template - Reduced capacity for free tier
    this.asg = new AutoScalingGroup(this, 'WebServerASG', {
      vpc: props.vpc,
      launchTemplate: launchTemplate,
      minCapacity: 1, // Reduced to 1 instance for free tier
      maxCapacity: 1, // Capped at 1 instance for free tier
      desiredCapacity: 1, // Using just 1 instance to stay within free tier
      vpcSubnets: { subnetType: SubnetType.PUBLIC },
    });

    // Add ASG to target group
    this.httpListener.addTargets('WebTarget', {
      port: 5001,
      protocol: ApplicationProtocol.HTTP,
      targets: [this.asg],
      healthCheck: {
        path: '/api/health',
        interval: Duration.seconds(30),
        timeout: Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 5,
      },
    });

    // Scale based on CPU usage
    this.asg.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      cooldown: Duration.seconds(300),
    });

    // Create CloudWatch log group
    const logGroup = new LogGroup(this, 'WebAppLogs', {
      retention: RetentionDays.TWO_WEEKS,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Outputs
    new CfnOutput(this, 'LoadBalancerDNS', {
      value: this.loadBalancer.loadBalancerDnsName,
      description: 'Load balancer DNS name',
    });

    new CfnOutput(this, 'WebServerSecurityGroup', {
      value: webSg.securityGroupId,
      description: 'Web server security group ID',
    });
  }
  
  // Add a method to enable HTTPS with the certificate
  public addHttpsListener(certificate: ICertificate) {
    // Add HTTPS listener
    const httpsListener = this.loadBalancer.addListener('HttpsListener', {
      port: 443,
      certificates: [certificate],
      open: true,
      sslPolicy: SslPolicy.RECOMMENDED
    });

    // Add target group to the HTTPS listener
    httpsListener.addTargets('HttpsWebTarget', {
      port: 5001,
      protocol: ApplicationProtocol.HTTP,
      targets: [this.asg],
      healthCheck: {
        path: '/api/health',
        interval: Duration.seconds(30),
        timeout: Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 5,
      }
    });
    
    // Add a redirect from HTTP to HTTPS
    this.httpListener.addAction('HttpToHttpsRedirect', {
      action: ListenerAction.redirect({
        protocol: 'HTTPS',
        port: '443',
        permanent: true
      })
    });
  }
}
