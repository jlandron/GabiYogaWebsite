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

    // Create a user data script to configure the EC2 instance
    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      'yum update -y',
      'yum install -y mysql mariadb-client',
      'curl -fsSL https://rpm.nodesource.com/setup_16.x | bash -',
      'yum install -y nodejs',
      
      // Install CloudWatch agent
      'yum install -y amazon-cloudwatch-agent',
      
      // Create application directory
      'mkdir -p /var/www/gabiyoga',
      
      // Clone application code (replace with your repository)
      'git clone https://github.com/jlandron/GabiYogaWebsite.git /var/www/gabiyoga',
      
      // Setup environment variables
      'echo "Setting up environment variables"',
      'cat > /var/www/gabiyoga/.env << EOL',
      'NODE_ENV=production',
      'PORT=5001',
      `DB_TYPE=mysql`,
      `DB_HOST=gabiyogadatabase-databaseb269d8bb-2ftmtodc9lpf.cxq64wemez5f.us-west-2.rds.amazonaws.com`,
      'DB_PORT=3306',
      'DB_NAME=yoga',
      'DB_USER=admin',
      // In production, you would fetch this from Secrets Manager
      'DB_PASSWORD=8O4Lfa8tq10wgAg8',
      `AWS_REGION=us-west-2`,
      `S3_BUCKET_NAME=${props.bucket.bucketName}`,
      `CLOUDFRONT_DISTRIBUTION_ID=${props.distribution.distributionId}`,
      'JWT_SECRET=8b6b566f9125ce96c553d5bc46f6a0e0758bb8211500515e9a24dfe2d6cdebc6e721bb398906c203a7cde28b70b75561e470607cd8eeb49849d34bc8f5782f36131ccbcd516408028fdc85f5bde689f7cf5f2f47287ef28d5ae55728d92db6fc90db2137e781ce15be1744346ea857ee6b8082b672ab9c8ef4eea9062a9ff72c658e0527e98b217bf6d565361ccac0a543306ee220afaf0ecd3aef6dcc4711808389566ffd4b6e1d317b26225e94bfd8598745dcf2c3a9a2a339227c5b2c7ada2b4d8dc840e938f1f1575f7c5cc9c96cc6a084efaa186360bdd64c9dedf1b15c14e3868713710b9f90e90f64feb2a36e587e7f38d09ee5c40be3c4a4d57e35fe',
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

    // Create Launch Template
    const launchTemplate = new ec2.LaunchTemplate(this, 'WebServerLaunchTemplate', {
      machineImage: ec2.MachineImage.latestAmazonLinux2(),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE3,
        ec2.InstanceSize.SMALL
      ),
      role: webServerRole,
      securityGroup: webSg,
      userData,
    });

    // Create Auto Scaling Group with Launch Template
    this.asg = new autoscaling.AutoScalingGroup(this, 'WebServerASG', {
      vpc: props.vpc,
      launchTemplate: launchTemplate,
      minCapacity: 2,
      maxCapacity: 4,
      desiredCapacity: 2,
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

    // Grant the instances access to retrieve database credentials
    if (props.database.secret) {
      props.database.secret.grantRead(webServerRole);
    }

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
