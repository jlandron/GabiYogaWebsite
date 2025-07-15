import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export interface LambdaEmailStackProps extends cdk.StackProps {
  stage: string;
  domainName: string;
}

/**
 * Stack for WorkMail email sending infrastructure
 * Handles WorkMail SMTP credentials and necessary IAM permissions
 */
export class LambdaEmailStack extends cdk.Stack {
  public readonly smtpPasswordParameter: ssm.StringParameter;
  public readonly ssmParameterPolicy: iam.Policy;

  constructor(scope: Construct, id: string, props: LambdaEmailStackProps) {
    super(scope, id, props);

    const { stage, domainName } = props;
    const resourcePrefix = `GabiYoga-${stage}`;
    const parameterName = '/gabi-yoga/workmail/smtp-password';

    // Reference manually created SSM Parameter for WorkMail SMTP password
    // Parameter should be created manually as SecureString type:
    // aws ssm put-parameter --name "/gabi-yoga/workmail/smtp-password" --value "YOUR_PASSWORD" --type "SecureString"
    this.smtpPasswordParameter = {
      parameterName: parameterName,
      parameterArn: `arn:aws:ssm:${this.region}:${this.account}:parameter${parameterName}`,
    } as any;

    // Create IAM policy for accessing the SSM parameter
    this.ssmParameterPolicy = new iam.Policy(this, 'WorkMailSsmParameterPolicy', {
      policyName: `${resourcePrefix}-WorkMailSsmParameterPolicy`,
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['ssm:GetParameter'],
          resources: [this.smtpPasswordParameter.parameterArn],
        }),
      ],
    });

    // Add metadata about the WorkMail configuration
    this.node.addMetadata('WorkMail.Configuration', {
      domainName: domainName,
      smtpHost: `smtp.mail.${this.region}.awsapps.com`,
      smtpPort: 465,
      fromEmail: 'noreply@gabi.yoga',
      parameterName: parameterName,
      note: 'Using AWS WorkMail SMTP with SSM Parameter Store for password storage'
    });

    // Outputs
    new cdk.CfnOutput(this, 'WorkMailSmtpParameterArn', {
      value: this.smtpPasswordParameter.parameterArn,
      description: 'ARN of WorkMail SMTP password parameter',
      exportName: `${resourcePrefix}-WorkMailSmtpParameterArn`,
    });

    new cdk.CfnOutput(this, 'WorkMailSmtpParameterName', {
      value: this.smtpPasswordParameter.parameterName,
      description: 'Name of WorkMail SMTP password parameter',
      exportName: `${resourcePrefix}-WorkMailSmtpParameterName`,
    });

    new cdk.CfnOutput(this, 'DefaultSenderAddress', {
      value: 'noreply@gabi.yoga',
      description: 'Default Sender Email Address for WorkMail',
      exportName: `${resourcePrefix}-WorkMailSenderEmail`,
    });

    new cdk.CfnOutput(this, 'SmtpHost', {
      value: `smtp.mail.${this.region}.awsapps.com`,
      description: 'WorkMail SMTP Host',
      exportName: `${resourcePrefix}-WorkMailSmtpHost`,
    });

    new cdk.CfnOutput(this, 'EmailServiceType', {
      value: 'AWS WorkMail SMTP with SSM',
      description: 'Type of email service being used',
      exportName: `${resourcePrefix}-WorkMailEmailServiceType`,
    });
  }
}
