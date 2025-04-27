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

export interface WebAppStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  database: rds.DatabaseInstance;
  databaseSecurityGroup: ec2.SecurityGroup;
  bucket: s3.Bucket;
  distribution: cloudfront.Distribution;
}

export class WebAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: WebAppStackProps) {
    super(scope, id, props);

    // Create security group for web instances
    const webSg = new ec2.SecurityGroup(this, 'WebSecurityGroup', {
      vpc: props.vpc,
      description: 'Security group for web servers',
      allowAllOutbound: true,
    });

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

    // Create a user data script to configure the EC2 instance
    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      'apt-get update -y',
      'apt-get install -y nodejs npm mysql-client',
      'curl -fsSL https://deb.nodesource.com/setup_16.x | bash -',
      'apt-get install -y nodejs',
      
      // Install CloudWatch agent
      'apt-get install -y amazon-cloudwatch-agent',
      
      // Create application directory
      'mkdir -p /var/www/gabiyoga',
      
      // Clone application code (replace with your repository)
      // 'git clone https://github.com/yourusername/gabiyoga.git /var/www/gabiyoga',
      
      // Setup environment variables
      'echo "Setting up environment variables"',
      'cat > /var/www/gabiyoga/.env << EOL',
      'NODE_ENV=production',
      'PORT=5001',
      `DB_TYPE=mysql`,
      `DB_HOST=\${props.database.dbInstanceEndpointAddress}`,
      'DB_PORT=3306',
      'DB_NAME=yoga',
      'DB_USER=admin',
      // In production, you would fetch this from Secrets Manager
      'DB_PASSWORD=${PLACEHOLDER_DB_PASSWORD}',
      `AWS_REGION=us-west-2`,
      `S3_BUCKET_NAME=${props.bucket.bucketName}`,
      `CLOUDFRONT_DISTRIBUTION_ID=${props.distribution.distributionId}`,
      'JWT_SECRET=${PLACEHOLDER_JWT_SECRET}',
      'EOL',
      
      // Install dependencies
      'cd /var/www/gabiyoga',
      'npm install',
      
      // Setup systemd service
      'cat > /etc/systemd/system/gabiyoga.service << EOL',
      '[Unit]',
      'Description=Gabi Yoga Web Application',
      'After=network.target',
      '',
      '[Service]',
      'Type=simple',
      'User=ubuntu',
      'WorkingDirectory=/var/www/gabiyoga',
      'ExecStart=/usr/bin/npm start',
      'Restart=on-failure',
      'Environment=NODE_ENV=production',
      '',
      '[Install]',
      'WantedBy=multi-user.target',
      'EOL',
      
      // Start the service
      'systemctl enable gabiyoga',
      'systemctl start gabiyoga'
    );

    // Create load balancer
    const lb = new elbv2.ApplicationLoadBalancer(this, 'LoadBalancer', {
      vpc: props.vpc,
      internetFacing: true,
      securityGroup: webSg,
    });

    // Add HTTP listener
    const httpListener = lb.addListener('HttpListener', {
      port: 80,
      open: true,
    });

    // Create Auto Scaling Group
    const asg = new autoscaling.AutoScalingGroup(this, 'WebServerASG', {
      vpc: props.vpc,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE3,
        ec2.InstanceSize.SMALL
      ),
      machineImage: ec2.MachineImage.latestAmazonLinux2({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      }),
      securityGroup: webSg,
      role: webServerRole,
      userData,
      minCapacity: 2,
      maxCapacity: 4,
      desiredCapacity: 2,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
    });

    // Add ASG to target group
    httpListener.addTargets('WebTarget', {
      port: 5001,
      targets: [asg],
      healthCheck: {
        path: '/api/health',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 5,
      },
    });

    // Scale based on CPU usage
    asg.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      cooldown: cdk.Duration.seconds(300),
    });

    // Grant the instances access to retrieve database credentials
    if (props.database.secret) {
      props.database.secret.grantRead(webServerRole);
    }

    // Create CloudWatch log group
    const logGroup = new logs.LogGroup(this, 'WebAppLogs', {
      retention: logs.RetentionDays.TWO_WEEKS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Allow connections from web servers to database
    props.databaseSecurityGroup.addIngressRule(
      webSg,
      ec2.Port.tcp(3306),
      'Allow MySQL connections from web servers'
    );

    // Outputs
    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: lb.loadBalancerDnsName,
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
}
