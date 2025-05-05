import { Stack, StackProps, RemovalPolicy, CfnOutput, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cr from 'aws-cdk-lib/custom-resources';

export interface SmtpSecretsStackProps extends StackProps {
  emailFrom: string;
}

/**
 * AWS WorkMail SMTP Secrets Stack for Gabi Yoga Website
 * This stack creates:
 * 1. A Secrets Manager secret to store WorkMail SMTP credentials
 * 2. IAM roles with necessary permissions to access the secret
 * 3. Custom Resource to add SMTP configuration details to the secret
 */
export class SmtpSecretsStack extends Stack {
  public readonly smtpCredentials: secretsmanager.Secret;

  constructor(scope: Construct, id: string, props: SmtpSecretsStackProps) {
    super(scope, id, props);

    const { emailFrom } = props;
    const region = this.region;
    
    // Create a Secrets Manager secret for WorkMail SMTP credentials
    this.smtpCredentials = new secretsmanager.Secret(this, 'WorkMailSmtpCredentials', {
      secretName: 'gabi-yoga-workmail-smtp-credentials',
      description: 'WorkMail SMTP credentials for sending emails',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: emailFrom, // Default: the from email address
          host: `smtp.${region}.awsapps.com`,
          port: 465,
          secure: true
        }),
        generateStringKey: 'password',
        excludePunctuation: true,
        includeSpace: false,
        passwordLength: 32
      },
      removalPolicy: RemovalPolicy.RETAIN, // Important for production credentials
    });

    // Create an IAM role for the EC2 instances to access the secret
    const webAppRole = new iam.Role(this, 'WebAppSmtpSecretAccessRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      description: 'Role for accessing WorkMail SMTP credentials',
    });
    
    // Grant read access to the secret
    this.smtpCredentials.grantRead(webAppRole);

    // Create a Lambda function that can update the secret with actual credentials
    const updateSecretFunction = new lambda.Function(this, 'UpdateSmtpSecretFunction', {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: 'index.handler',
      timeout: Duration.minutes(5),
      code: lambda.Code.fromInline(`
const AWS = require('aws-sdk');

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  if (event.RequestType === 'Create' || event.RequestType === 'Update') {
    try {
      // Get the secret ARN from the event properties
      const secretArn = event.ResourceProperties.SecretArn;
      
      // Get the current secret value to preserve all fields
      const secretsManager = new AWS.SecretsManager();
      const currentSecretData = await secretsManager.getSecretValue({
        SecretId: secretArn
      }).promise();
      
      // Parse the current secret JSON
      let currentSecret = JSON.parse(currentSecretData.SecretString);
      
      // Update with the properties from the event, but don't overwrite the password
      const updatedSecret = {
        ...currentSecret,
        username: event.ResourceProperties.Username || currentSecret.username,
        host: event.ResourceProperties.Host || currentSecret.host,
        port: parseInt(event.ResourceProperties.Port || currentSecret.port, 10),
        secure: event.ResourceProperties.Secure === 'true' || currentSecret.secure
      };
      
      // Update the secret (but retain the password that was auto-generated)
      await secretsManager.putSecretValue({
        SecretId: secretArn,
        SecretString: JSON.stringify(updatedSecret)
      }).promise();
      
      console.log('Secret updated successfully');
      
      return {
        PhysicalResourceId: secretArn,
        Data: {
          SecretArn: secretArn
        }
      };
    } catch (error) {
      console.error('Error updating secret:', error);
      throw error;
    }
  } else if (event.RequestType === 'Delete') {
    // Not actually deleting the secret, as it might be in use
    // The secret has RemovalPolicy.RETAIN so it will persist
    console.log('Secret will be retained during deletion');
    return {
      PhysicalResourceId: event.PhysicalResourceId
    };
  }
};
      `),
    });
    
    // Grant the Lambda function permissions to get and update the secret
    this.smtpCredentials.grantRead(updateSecretFunction);
    this.smtpCredentials.grantWrite(updateSecretFunction);
    
    // Create a Custom Resource provider to manage the secret updates
    const updateSecretProvider = new cr.Provider(this, 'UpdateSmtpSecretProvider', {
      onEventHandler: updateSecretFunction,
      providerFunctionName: 'GabiYoga-UpdateSmtpSecretProvider',
    });
    
    // Create Custom Resource to ensure the secret is properly configured
    const secretConfig = new cr.AwsCustomResource(this, 'SmtpSecretConfig', {
      onUpdate: {
        service: 'SecretsManager',
        action: 'describeSecret',
        parameters: {
          SecretId: this.smtpCredentials.secretArn,
        },
        physicalResourceId: cr.PhysicalResourceId.of(this.smtpCredentials.secretArn),
      },
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: ['secretsmanager:DescribeSecret'],
          resources: [this.smtpCredentials.secretArn],
        }),
      ]),
    });
    
    // Add outputs with instructions on how to access and update the SMTP credentials
    new CfnOutput(this, 'SmtpSecretArn', {
      value: this.smtpCredentials.secretArn,
      description: 'ARN of the WorkMail SMTP credentials secret',
    });
    
    new CfnOutput(this, 'WebAppRoleArn', {
      value: webAppRole.roleArn,
      description: 'ARN of the IAM role that can access the SMTP secret',
    });
    
    new CfnOutput(this, 'UpdateSmtpCredentialsCommands', {
      description: 'Commands to update the WorkMail SMTP credentials',
      value: `
=== HOW TO UPDATE WORKMAIL SMTP CREDENTIALS ===

1. After setting up your WorkMail users, update the SMTP password in Secrets Manager:

aws secretsmanager get-secret-value --secret-id ${this.smtpCredentials.secretName} --query SecretString --output text | jq .

# Then update with your actual WorkMail password:
aws secretsmanager update-secret --secret-id ${this.smtpCredentials.secretName} \\
  --secret-string '{"username":"${emailFrom}","host":"smtp.${region}.awsapps.com","port":465,"secure":true,"password":"YOUR_ACTUAL_WORKMAIL_PASSWORD"}'

2. The application will automatically retrieve these credentials when sending emails.
      `,
    });
  }
}
