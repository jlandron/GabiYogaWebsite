import * as cdk from 'aws-cdk-lib';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { SESCrossRegionVerification } from './constructs/ses-cross-region';

export interface LambdaSesStackProps extends cdk.StackProps {
  stage: string;
  domainName: string;
  hostedZoneId?: string;
}

/**
 * Stack for SES email sending infrastructure
 * Handles email domain verification and necessary IAM permissions
 */
export class LambdaSesStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: LambdaSesStackProps) {
    super(scope, id, props);

    const { stage, domainName } = props;
    const resourcePrefix = `GabiYoga-${stage}`;

    // Create a verified domain identity
    new ses.EmailIdentity(this, 'DomainIdentity', {
      identity: ses.Identity.domain(domainName),
      mailFromDomain: `mail.${domainName}`,
    });

    // Create a sending policy that allows sending emails from this domain and subdomains
    new iam.Policy(this, 'EmailSendingPolicy', {
      policyName: `${resourcePrefix}-EmailSendingPolicy`,
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'ses:SendEmail',
            'ses:SendRawEmail',
            'ses:SendTemplatedEmail',
            'ses:SendBulkTemplatedEmail',
          ],
          resources: ['*'],
          conditions: {
            StringLike: {
              'ses:FromAddress': [`*@${domainName}`, `*@*.${domainName}`]
            }
          }
        })
      ]
    });

    // Define a template for transactional emails
    // This will be used for multiple email types
    new ses.CfnTemplate(this, 'TransactionalEmailTemplate', {
      template: {
        templateName: `${resourcePrefix}-TransactionalEmail`,
        subjectPart: '{{subject}}',
        htmlPart: `
          <!DOCTYPE html>
          <html>
          <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>{{subject}}</title>
              <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                  .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                  .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                  .footer { text-align: center; margin-top: 30px; font-size: 14px; color: #666; }
              </style>
          </head>
          <body>
              <div class="container">
                  <div class="header">
                      <h1>🧘‍♀️ Gabi Yoga</h1>
                      <p>{{headerSubtitle}}</p>
                  </div>
                  <div class="content">
                      {{content}}
                  </div>
                  <div class="footer">
                      <p>© ${new Date().getFullYear()} Gabi Yoga. All rights reserved.</p>
                      <p>This email was sent to {{email}}</p>
                  </div>
              </div>
          </body>
          </html>
        `,
        textPart: '{{textContent}}'
      }
    });

    // Cross-region configuration
    // When we're deploying in us-east-1 but our domain is configured in us-west-2
    // we need to create a cross-region identity
    new SESCrossRegionVerification(this, 'CrossRegionVerification', {
      domainName: domainName,
      sourceRegion: 'us-west-2', // Source region where the domain is already verified
      targetRegion: this.region,  // Target region where we want to use the domain
    });

    // Outputs
    new cdk.CfnOutput(this, 'EmailDomainIdentity', {
      value: domainName,
      description: 'SES Verified Domain',
      exportName: `${resourcePrefix}-EmailDomain`,
    });

    new cdk.CfnOutput(this, 'DefaultSenderAddress', {
      value: `noreply@${domainName}`,
      description: 'Default Sender Email Address',
      exportName: `${resourcePrefix}-SenderEmail`,
    });
  }
}
