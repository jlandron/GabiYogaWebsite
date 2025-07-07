import { Stack, StackProps, RemovalPolicy, CfnOutput, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cr from 'aws-cdk-lib/custom-resources';
import { CustomResource } from 'aws-cdk-lib';

export interface WorkMailUserStackProps extends StackProps {
  organizationId: string; // WorkMail organization ID
  emailFrom: string; // Email address for sending
  secretName?: string; // Optional name for the secret
  region?: string; // AWS region
}

/**
 * WorkMail User Stack for Gabi Yoga Website
 * 
 * This stack automates the creation of:
 * 1. A WorkMail user for sending emails
 * 2. A secure randomly-generated password
 * 3. AWS Secrets Manager entry for storing SMTP credentials
 */
export class WorkMailUserStack extends Stack {
  public readonly smtpCredentials: secretsmanager.Secret;
  public readonly workMailUser: CustomResource;

  constructor(scope: Construct, id: string, props: WorkMailUserStackProps) {
    super(scope, id, props);

    const { organizationId, emailFrom, secretName } = props;
    const region = props.region || this.region;
    const emailUser = emailFrom.split('@')[0]; // Extract user part of email (e.g., 'noreply')
    const domain = emailFrom.split('@')[1]; // Extract domain part (e.g., 'gabi.yoga')
    
    // Create a Secrets Manager secret for WorkMail SMTP credentials
    this.smtpCredentials = new secretsmanager.Secret(this, 'WorkMailSmtpCredentials', {
      secretName: secretName || 'gabi-yoga-work-mail-smtp-credentials',
      description: 'WorkMail SMTP credentials for sending emails',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: emailFrom,
          host: `smtp.mail.${region}.awsapps.com`,
          port: 465,
          secure: true
        }),
        generateStringKey: 'password',
        excludePunctuation: false,
        includeSpace: false,
        passwordLength: 32
      },
      removalPolicy: RemovalPolicy.RETAIN, // Important for production credentials
    });

    // Create Lambda function to create the WorkMail user
    const createUserFunction = new lambda.Function(this, 'WorkMailUserFunction', {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: 'index.handler',
      timeout: Duration.minutes(5),
      code: lambda.Code.fromInline(`
const AWS = require('aws-sdk');
const https = require('https');
const url = require('url');

// Helper function to respond to CloudFormation
function sendResponse(event, context, responseStatus, responseData, physicalResourceId) {
  return new Promise((resolve, reject) => {
    const responseBody = JSON.stringify({
      Status: responseStatus,
      Reason: responseStatus === 'FAILED' ? 'See the details in CloudWatch Log Stream: ' + context.logStreamName : 'See the details in CloudWatch Log Stream: ' + context.logStreamName,
      PhysicalResourceId: physicalResourceId || context.logStreamName,
      StackId: event.StackId,
      RequestId: event.RequestId,
      LogicalResourceId: event.LogicalResourceId,
      NoEcho: false,
      Data: responseData
    });

    console.log('Response Body:', responseBody);

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
      console.log('Response status code:', response.statusCode);
      resolve();
    });

    request.on('error', (error) => {
      console.log('Error sending response:', error);
      reject(error);
    });

    request.write(responseBody);
    request.end();
  });
}

exports.handler = async (event, context) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  // Extract properties from the event
  const { 
    OrganizationId,
    Username,
    Email,
    Region,
    SecretArn
  } = event.ResourceProperties;
  
  // Initialize the WorkMail client and Secrets Manager
  const workmail = new AWS.WorkMail({ region: Region });
  const secretsManager = new AWS.SecretsManager({ region: Region });
  let responseData = {};
  let userId = null;
  
  try {
    if (event.RequestType === 'Create' || event.RequestType === 'Update') {
      // Get the password from Secrets Manager
      const secretValue = await secretsManager.getSecretValue({ SecretId: SecretArn }).promise();
      const secretData = JSON.parse(secretValue.SecretString);
      const password = secretData.password;
      
      // Check if user already exists
      try {
        const users = await workmail.listUsers({
          OrganizationId,
          MaxResults: 100
        }).promise();
        
        // Find the user by email or username
        const existingUser = users.Users && users.Users.find(u => 
          u.Email === Email || u.Name === Username);
        
        if (existingUser) {
          userId = existingUser.Id;
          console.log(\`User \${Email} already exists with ID: \${userId}\`);
          
          // Update user password
          await workmail.resetPassword({
            OrganizationId,
            UserId: userId,
            Password: password
          }).promise();
          console.log(\`Updated password for user \${Email}\`);
        }
      } catch (err) {
        console.log('Error checking existing users:', err);
      }
      
      if (!userId) {
        // Create a new user
        console.log(\`Creating new WorkMail user: \${Email}\`);
        const createUserResponse = await workmail.createUser({
          OrganizationId,
          Name: Username,
          DisplayName: Email,
          Password: password
        }).promise();
        
        userId = createUserResponse.UserId;
        console.log(\`Created new user with ID: \${userId}\`);
        
        // Register the user for mail
        await workmail.registerToWorkMail({
          OrganizationId,
          EntityId: userId,
          Email
        }).promise();
        
        console.log(\`Registered user \${Email} for mail\`);
      }
      
      // Update the secret with the email as username
      const updatedSecret = {
        ...secretData,
        username: Email
      };
      
      await secretsManager.putSecretValue({
        SecretId: SecretArn,
        SecretString: JSON.stringify(updatedSecret)
      }).promise();
      
      console.log('Updated secret with WorkMail credentials');
      
      responseData = {
        UserId: userId,
        Email: Email
      };
      
      // Send success response to CloudFormation
      await sendResponse(event, context, 'SUCCESS', responseData, userId);
      
    } else if (event.RequestType === 'Delete') {
      // We don't delete users for safety, just report success
      console.log('Skip deletion of WorkMail user for safety reasons');
      await sendResponse(event, context, 'SUCCESS', {}, event.PhysicalResourceId);
    }
    
    return responseData;
  } catch (error) {
    console.error('Error:', error);
    await sendResponse(event, context, 'FAILED', { Error: error.message }, event.PhysicalResourceId || 'error');
    throw error;
  }
};
      `),
      environment: {
        REGION: region
      }
    });
    
    // Grant permissions for WorkMail and Secrets Manager
    createUserFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'workmail:CreateUser',
          'workmail:ListUsers',
          'workmail:RegisterToWorkMail',
          'workmail:DescribeUser',
          'workmail:UpdateUser',
          'workmail:ResetPassword'
        ],
        resources: ['*']
      })
    );
    
    this.smtpCredentials.grantRead(createUserFunction);
    this.smtpCredentials.grantWrite(createUserFunction);
    
    // Create Custom Resource provider for WorkMail user management
    const workMailProvider = new cr.Provider(this, 'WorkMailProvider', {
      onEventHandler: createUserFunction,
    });
    
    // Create the WorkMail user through a custom resource
    this.workMailUser = new CustomResource(this, 'WorkMailUser', {
      serviceToken: workMailProvider.serviceToken,
      properties: {
        OrganizationId: organizationId,
        Username: emailUser,
        Email: emailFrom,
        Region: region,
        SecretArn: this.smtpCredentials.secretArn,
        // Add a timestamp to force update on each deployment
        UpdateTimestamp: new Date().toISOString(),
      }
    });
    
    // Create a role for the EC2 instances to access the SMTP secret
    const webAppRole = new iam.Role(this, 'WebAppSmtpSecretAccessRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      description: 'Role for accessing WorkMail SMTP credentials',
    });
    
    // Grant read access to the secret
    this.smtpCredentials.grantRead(webAppRole);
    
    // Add outputs with information about the created resources
    new CfnOutput(this, 'WorkMailUserEmail', {
      value: emailFrom,
      description: 'Email address of the WorkMail user'
    });
    
    new CfnOutput(this, 'SmtpSecretArn', {
      value: this.smtpCredentials.secretArn,
      description: 'ARN of the WorkMail SMTP credentials secret'
    });
    
    new CfnOutput(this, 'WebAppRoleArn', {
      value: webAppRole.roleArn,
      description: 'ARN of the IAM role that can access the SMTP secret'
    });
    
    new CfnOutput(this, 'SmtpHost', {
      value: `smtp.mail.${region}.awsapps.com`,
      description: 'SMTP host to use for sending emails'
    });
  }
}
