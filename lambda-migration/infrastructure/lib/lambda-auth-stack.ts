import * as cdk from 'aws-cdk-lib';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface LambdaAuthStackProps extends cdk.StackProps {
  stage: string;
  usersTable: dynamodb.Table;
  jwtBlacklistTable: dynamodb.Table;
}

export class LambdaAuthStack extends cdk.Stack {
  public readonly jwtSecret: secretsmanager.Secret;
  public readonly stripeSecret: secretsmanager.Secret;
  public readonly lambdaExecutionRole: iam.Role;

  constructor(scope: Construct, id: string, props: LambdaAuthStackProps) {
    super(scope, id, props);

    const { stage, usersTable, jwtBlacklistTable } = props;
    const resourcePrefix = `GabiYoga-${stage}`;

    // JWT Secret for token signing and verification
    this.jwtSecret = new secretsmanager.Secret(this, 'JWTSecret', {
      secretName: `${resourcePrefix}-JWT-Secret`,
      description: `JWT secret for Gabi Yoga Lambda ${stage} environment`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({}),
        generateStringKey: 'secret',
        excludeCharacters: '"@/\\\'',
        includeSpace: false,
        passwordLength: 64,
      },
      removalPolicy: stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // Stripe Secret for payment processing
    this.stripeSecret = new secretsmanager.Secret(this, 'StripeSecret', {
      secretName: `${resourcePrefix}-Stripe-Secret`,
      description: `Stripe API keys for Gabi Yoga Lambda ${stage} environment`,
      secretObjectValue: {
        publishableKey: cdk.SecretValue.unsafePlainText(
          stage === 'prod' 
            ? 'pk_live_your_live_publishable_key_here' 
            : 'pk_test_51RIECgFvIUQZU80GkNvPQBmwpbKhf0LiFCh4Rv5EPxArapsnz6f3C4CWenkiPrZshZCJW3ghjfvveCpdou1bAJkC00b1TlmLo9'
        ),
        secretKey: cdk.SecretValue.unsafePlainText(
          stage === 'prod' 
            ? 'sk_live_your_live_secret_key_here' 
            : 'sk_test_your_test_secret_key_here'
        ),
        webhookSecret: cdk.SecretValue.unsafePlainText(
          stage === 'prod' 
            ? 'whsec_your_live_webhook_secret_here' 
            : 'whsec_your_test_webhook_secret_here'
        ),
      },
      removalPolicy: stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // IAM Role for Lambda functions with authentication permissions
    this.lambdaExecutionRole = new iam.Role(this, 'LambdaExecutionRole', {
      roleName: `${resourcePrefix}-Lambda-Execution-Role`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
      ],
    });

    // Grant Lambda role access to DynamoDB tables
    usersTable.grantReadWriteData(this.lambdaExecutionRole);
    jwtBlacklistTable.grantReadWriteData(this.lambdaExecutionRole);

    // Grant Lambda role access to secrets
    this.jwtSecret.grantRead(this.lambdaExecutionRole);
    this.stripeSecret.grantRead(this.lambdaExecutionRole);

    // Grant additional permissions for authentication operations
    this.lambdaExecutionRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'ses:SendEmail',
        'ses:SendRawEmail',
        'ses:GetSendQuota',
      ],
      resources: ['*'],
    }));

    // Grant S3 permissions for file uploads
    this.lambdaExecutionRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:GetObject',
        's3:PutObject',
        's3:DeleteObject',
        's3:GetObjectAcl',
        's3:PutObjectAcl',
        's3:GetSignedUrl',
      ],
      resources: [
        `arn:aws:s3:::gabi-yoga-${stage}-assets-*/*`,
        `arn:aws:s3:::gabi-yoga-${stage}-assets-*`,
      ],
    }));

    // Grant CloudWatch Logs permissions
    this.lambdaExecutionRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
        'logs:DescribeLogStreams',
        'logs:DescribeLogGroups',
      ],
      resources: [
        `arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/${resourcePrefix}-*`,
        `arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/${resourcePrefix}-*:*`,
      ],
    }));

    // Grant X-Ray tracing permissions
    this.lambdaExecutionRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'xray:PutTraceSegments',
        'xray:PutTelemetryRecords',
      ],
      resources: ['*'],
    }));

    // Tags
    cdk.Tags.of(this.jwtSecret).add('Service', 'GabiYogaLambda');
    cdk.Tags.of(this.jwtSecret).add('Environment', stage);
    cdk.Tags.of(this.jwtSecret).add('Purpose', 'JWT-Authentication');

    cdk.Tags.of(this.stripeSecret).add('Service', 'GabiYogaLambda');
    cdk.Tags.of(this.stripeSecret).add('Environment', stage);
    cdk.Tags.of(this.stripeSecret).add('Purpose', 'Payment-Processing');

    cdk.Tags.of(this.lambdaExecutionRole).add('Service', 'GabiYogaLambda');
    cdk.Tags.of(this.lambdaExecutionRole).add('Environment', stage);
    cdk.Tags.of(this.lambdaExecutionRole).add('Purpose', 'Lambda-Execution');

    // Outputs
    new cdk.CfnOutput(this, 'JWTSecretArn', {
      value: this.jwtSecret.secretArn,
      description: 'JWT Secret ARN',
      exportName: `${resourcePrefix}-JWTSecretArn`,
    });

    new cdk.CfnOutput(this, 'StripeSecretArn', {
      value: this.stripeSecret.secretArn,
      description: 'Stripe Secret ARN',
      exportName: `${resourcePrefix}-StripeSecretArn`,
    });

    new cdk.CfnOutput(this, 'LambdaExecutionRoleArn', {
      value: this.lambdaExecutionRole.roleArn,
      description: 'Lambda Execution Role ARN',
      exportName: `${resourcePrefix}-LambdaExecutionRoleArn`,
    });

    new cdk.CfnOutput(this, 'JWTSecretName', {
      value: this.jwtSecret.secretName,
      description: 'JWT Secret Name',
      exportName: `${resourcePrefix}-JWTSecretName`,
    });

    new cdk.CfnOutput(this, 'StripeSecretName', {
      value: this.stripeSecret.secretName,
      description: 'Stripe Secret Name',
      exportName: `${resourcePrefix}-StripeSecretName`,
    });
  }
}
