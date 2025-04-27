import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secrets from 'aws-cdk-lib/aws-secretsmanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as fs from 'fs';
import * as path from 'path';

export interface WebAppStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  bucket: s3.IBucket;
  distribution: cloudfront.Distribution;
}

export class WebAppStack extends cdk.Stack {
  public readonly loadBalancer: elbv2.ApplicationLoadBalancer;
  public readonly webSecurityGroup: ec2.SecurityGroup;
  public readonly asg: autoscaling.AutoScalingGroup;
  private httpListener: elbv2.ApplicationListener;
  
  constructor(scope: Construct, id: string, props: WebAppStackProps) {
    super(scope, id, props);

    // Create security group for web instances
    this.webSecurityGroup = new ec2.SecurityGroup(this, 'WebSecurityGroup', {
      vpc: props.vpc,
      description: 'Security group for web servers',
      allowAllOutbound: true,
    });
    
    const webSg = this.webSecurityGroup; // For readability in the rest of the code

    // Allow inbound HTTP and HTTPS traffic
    webSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP');
    webSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow HTTPS');

    // Allow SSH access (for administration only - consider using SSM in production)
    webSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'Allow SSH');

    // Create IAM role for EC2 instances
    const webServerRole = new iam.Role(this, 'WebServerRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'), // For SSM
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3ReadOnlyAccess'), // For S3 access
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'), // For CloudWatch
      ],
    });

    // Add specific permissions to write to the S3 bucket
    props.bucket.grantReadWrite(webServerRole);

    // Load and prepare user data script from file
    const userData = ec2.UserData.forLinux();
    
    // Prepare database information
    const dbHost = 'gabiyogadatabase-databaseb269d8bb-tfil5ifuv2c3.cxq64wemez5f.us-west-2.rds.amazonaws.com';
    const dbPassword = '8O4Lfa8tq10wgAg8'; // In production, fetch from Secrets Manager
    const awsRegion = 'us-west-2';
    const bucketName = props.bucket.bucketName;
    const cfDistId = props.distribution.distributionId;

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
      'source ~/.bashrc || source ~/.bash_profile || true',
      'nvm install 16',
      'nvm use 16',
      'nvm alias default 16',
      
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
      
      // Create environment file 
      'cat > /var/www/gabiyoga/.env << EOF',
      `NODE_ENV=production`,
      `PORT=5001`,
      `DB_HOST=${dbHost}`,
      `DB_PORT=3306`,
      `DB_NAME=yoga`,
      `DB_USER=admin`,
      `DB_PASSWORD=${dbPassword}`,
      `AWS_REGION=${awsRegion}`,
      `S3_BUCKET_NAME=${bucketName}`,
      `CLOUDFRONT_DISTRIBUTION_ID=${cfDistId}`,
      'EOF',
      
      // Install dependencies
      'cd /var/www/gabiyoga',
      'npm install --production',
      
      // Setup systemd service
      'cat > /etc/systemd/system/gabiyoga.service << EOF',
      '[Unit]',
      'Description=Gabi Yoga Web Application',
      'After=network.target',
      '',
      '[Service]',
      'Type=simple',
      'User=root',
      'WorkingDirectory=/var/www/gabiyoga',
      'ExecStart=/usr/bin/node /var/www/gabiyoga/server.js',
      'Restart=on-failure',
      'RestartSec=10',
      'StandardOutput=journal',
      'StandardError=journal',
      'SyslogIdentifier=gabiyoga',
      'Environment=NODE_ENV=production',
      '',
      '[Install]',
      'WantedBy=multi-user.target',
      'EOF',
      
      // Start service
      'systemctl daemon-reload',
      'systemctl enable gabiyoga',
      'systemctl start gabiyoga',
      'echo "Gabi Yoga web application startup completed"',
      
      'echo "User data script completed at $(date)"'
    );

    // Create load balancer
    this.loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'LoadBalancer', {
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
    const launchTemplate = new ec2.LaunchTemplate(this, 'WebServerLaunchTemplate', {
      machineImage: ec2.MachineImage.latestAmazonLinux2(),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE2,
        ec2.InstanceSize.MICRO // t2.micro is free tier eligible
      ),
      role: webServerRole,
      securityGroup: webSg,
      userData,
    });

    // Create Auto Scaling Group with Launch Template - Reduced capacity for free tier
    this.asg = new autoscaling.AutoScalingGroup(this, 'WebServerASG', {
      vpc: props.vpc,
      launchTemplate: launchTemplate,
      minCapacity: 1, // Reduced to 1 instance for free tier
      maxCapacity: 1, // Capped at 1 instance for free tier
      desiredCapacity: 1, // Using just 1 instance to stay within free tier
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
    });

    // Add ASG to target group
    this.httpListener.addTargets('WebTarget', {
      port: 5001,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [this.asg],
      healthCheck: {
        path: '/api/health',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 5,
      },
    });

    // Scale based on CPU usage
    this.asg.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      cooldown: cdk.Duration.seconds(300),
    });

    // Database access code removed - we're deploying without a database for free tier

    // Create CloudWatch log group
    const logGroup = new logs.LogGroup(this, 'WebAppLogs', {
      retention: logs.RetentionDays.TWO_WEEKS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Security group rule for database access will be added in app.ts to avoid circular dependencies

    // Outputs
    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: this.loadBalancer.loadBalancerDnsName,
      description: 'Load balancer DNS name',
    });

    new cdk.CfnOutput(this, 'WebServerSecurityGroup', {
      value: webSg.securityGroupId,
      description: 'Web server security group ID',
    });

    new cdk.CfnOutput(this, 'DeploymentInstructions', {
      value: 'Replace placeholders in user data script and update your application code',
      description: 'Follow-up instructions for deployment',
    });
  }
  
  // Add a method to enable HTTPS with the certificate
  public addHttpsListener(certificate: acm.ICertificate) {
    // Add HTTPS listener
    const httpsListener = this.loadBalancer.addListener('HttpsListener', {
      port: 443,
      certificates: [certificate],
      open: true,
      sslPolicy: elbv2.SslPolicy.RECOMMENDED
    });

    // Add target group to the HTTPS listener
    httpsListener.addTargets('HttpsWebTarget', {
      port: 5001,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [this.asg],
      healthCheck: {
        path: '/api/health',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 5,
      }
    });
    
    // Add a redirect from HTTP to HTTPS
    this.httpListener.addAction('HttpToHttpsRedirect', {
      action: elbv2.ListenerAction.redirect({
        protocol: 'HTTPS',
        port: '443',
        permanent: true
      })
    });
  }
}
