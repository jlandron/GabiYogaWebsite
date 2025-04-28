import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secrets from 'aws-cdk-lib/aws-secretsmanager';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface DatabaseStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
}

export class DatabaseStack extends cdk.Stack {
  public readonly database: rds.DatabaseInstance;
  public readonly databaseSecurityGroup: ec2.SecurityGroup;
  public readonly databaseSecret: secrets.Secret;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    // Create security group for database
    this.databaseSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc: props.vpc,
      description: 'Allow database connections',
      allowAllOutbound: true,
    });

    // Create a secret for database credentials
    this.databaseSecret = new secrets.Secret(this, 'DatabaseCredentials', {
      secretName: 'gabi-yoga-db-credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'admin' }),
        generateStringKey: 'password',
        excludePunctuation: true,
        includeSpace: false,
        passwordLength: 16,
      },
    });

    // Create RDS MySQL database - Free tier eligible
    this.database = new rds.DatabaseInstance(this, 'Database', {
      engine: rds.DatabaseInstanceEngine.mysql({
        version: rds.MysqlEngineVersion.VER_8_0 // MySQL 8.0 is compatible with t4g.micro
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE4_GRAVITON, // t4g (Arm-based Graviton processors)
        ec2.InstanceSize.MICRO // db.t4g.micro is free tier eligible
      ),
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [this.databaseSecurityGroup],
      allocatedStorage: 20, // Minimum for free tier
      maxAllocatedStorage: 20, // Cap at free tier eligible size
      allowMajorVersionUpgrade: false,
      autoMinorVersionUpgrade: true,
      backupRetention: cdk.Duration.days(1), // Reduced backup retention for free tier
      deleteAutomatedBackups: true, // Remove automated backups to save costs
      deletionProtection: false, // Disabled for easier testing and cleanup
      databaseName: 'yoga',
      credentials: rds.Credentials.fromSecret(this.databaseSecret),
      multiAz: false, // Single AZ for free tier
      storageType: rds.StorageType.GP2, // GP2 is free tier eligible
      publiclyAccessible: false,
    });

    // IMPORTANT: Allow connections from anywhere within the VPC
    // We ONLY use this general rule to avoid circular dependencies
    // DO NOT add any references to the WebApp security group here!
    this.databaseSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.tcp(3306),
      'Allow MySQL connections from within the VPC'
    );

    // Create a custom resource to configure MySQL user for any host using '%'
    const setupMysqlUsersFunction = new lambda.Function(this, 'SetupMysqlUsersFunction', {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: 'index.handler',
      // Removing VPC configuration to allow internet access
      // No need for VPC since we're not directly connecting to MySQL anymore
      timeout: cdk.Duration.seconds(30), // Reduced timeout since we're doing less work
      memorySize: 256, // Keep increased memory for better performance
      code: lambda.Code.fromInline(`
const AWS = require('aws-sdk');

exports.handler = async (event) => {
  console.log('Event: ', JSON.stringify(event));
  
  const requestType = event.RequestType;
  if (requestType === 'Delete') {
    return await sendResponse(event, 'SUCCESS', {});
  }
  
  try {
    // Get the database credentials from Secrets Manager
    console.log('Fetching credentials from Secrets Manager');
    const secretsManager = new AWS.SecretsManager();
    const secretData = await secretsManager.getSecretValue({
      SecretId: process.env.SECRET_ARN
    }).promise();
    
    const secretJson = JSON.parse(secretData.SecretString);
    const username = secretJson.username;
    const password = secretJson.password;
    const dbEndpoint = process.env.DB_ENDPOINT;
    const dbName = process.env.DB_NAME;
    
    console.log('Retrieved database endpoint:', dbEndpoint);
    console.log('Using database name:', dbName);
    
    // SIMPLIFIED APPROACH: Instead of trying to connect directly to MySQL,
    // we'll simply return success here as the EC2 user data script 
    // will handle user creation as needed.
    console.log('Skipping direct database connection - EC2 will handle user creation');
    
    // Log success for CloudWatch
    console.log('Custom resource execution completed successfully');
    
    // Return success immediately
    return await sendResponse(event, 'SUCCESS', {
      Message: 'MySQL user will be configured by EC2 user data script in webapp-stack.ts'
    });
  } catch (error) {
    console.error('Error configuring MySQL user:', error);
    return await sendResponse(event, 'FAILED', {
      Message: \`Error configuring MySQL user: \${error.message}\`
    });
  }
};

// Helper function to send CloudFormation response
async function sendResponse(event, status, data) {
  const responseBody = JSON.stringify({
    Status: status,
    Reason: \`See details in CloudWatch Log Stream: \${process.env.AWS_LAMBDA_LOG_GROUP_NAME}\`,
    PhysicalResourceId: event.LogicalResourceId,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Data: data
  });
  
  console.log('Response body:', responseBody);
  
  const https = require('https');
  const url = require('url');
  
  return new Promise((resolve, reject) => {
    const parsedUrl = url.parse(event.ResponseURL);
    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.path,
      method: 'PUT',
      headers: {
        'Content-Type': '',
        'Content-Length': responseBody.length
      }
    };
    
    const request = https.request(options, (response) => {
      console.log(\`Response status code: \${response.statusCode}\`);
      resolve();
    });
    
    request.on('error', (error) => {
      console.error('Error sending response:', error);
      reject(error);
    });
    
    request.write(responseBody);
    request.end();
  });
}
      `),
      environment: {
        SECRET_ARN: this.databaseSecret.secretArn,
        DB_ENDPOINT: this.database.dbInstanceEndpointAddress,
        DB_NAME: 'yoga'
      },
    });
    
    // Add required permissions
    this.databaseSecret.grantRead(setupMysqlUsersFunction);
    
    // Create a custom resource provider
    const provider = new cr.Provider(this, 'SetupMysqlUsersProvider', {
      onEventHandler: setupMysqlUsersFunction,
    });
    
    // Create the custom resource
    const setupMysqlUsers = new cdk.CustomResource(this, 'SetupMysqlUsers', {
      serviceToken: provider.serviceToken,
      properties: {
        UpdatedAt: Date.now(), // Force update on each deployment
      }
    });
    
    // Ensure the custom resource runs after the database is created
    setupMysqlUsers.node.addDependency(this.database);

    // Outputs
    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: this.database.dbInstanceEndpointAddress,
      description: 'Database endpoint',
    });

    new cdk.CfnOutput(this, 'DatabaseSecretArn', {
      value: this.databaseSecret.secretArn,
      description: 'Database credentials secret ARN',
    });
  }
}
