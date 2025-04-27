import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secrets from 'aws-cdk-lib/aws-secretsmanager';

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

    // Allow connections from anywhere within the VPC to avoid circular dependencies
    this.databaseSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.tcp(3306),
      'Allow MySQL connections from within the VPC'
    );

    // Outputs
    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: this.database.dbInstanceEndpointAddress,
      description: 'Database endpoint',
    });

    // The secret ARN output is now in the CredentialsStack
  }
}
