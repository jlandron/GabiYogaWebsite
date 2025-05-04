import { Stack, StackProps, CfnOutput, RemovalPolicy, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { 
  EmailIdentity, 
  Identity
} from 'aws-cdk-lib/aws-ses';
import { 
  Role, 
  ServicePrincipal, 
  ManagedPolicy, 
  PolicyStatement, 
  Effect,
  PolicyDocument
} from 'aws-cdk-lib/aws-iam';
import { 
  HostedZone, 
  CnameRecord, 
  TxtRecord,
  MxRecord
} from 'aws-cdk-lib/aws-route53';
import * as cdk from 'aws-cdk-lib';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export interface EmailStackProps extends StackProps {
  domainName: string;
  hostedZoneId?: string; // Optional - if you have an existing hosted zone
}

/**
 * AWS WorkMail Stack for Gabi Yoga Website
 * This stack creates the necessary resources for:
 * 1. Setting up Amazon WorkMail for the domain
 * 2. Configuring necessary DNS records
 * 3. Setting up IAM roles for access
 */
export class EmailStack extends Stack {
  public readonly sesIdentity: EmailIdentity;
  public readonly sesIamRole: Role;
  public readonly emailBucket?: cdk.aws_s3.Bucket;

  constructor(scope: Construct, id: string, props: EmailStackProps) {
    super(scope, id, props);

    const { domainName, hostedZoneId } = props;
    
    // Import existing hosted zone if ID is provided, otherwise create a new one
    let hostedZone;
    if (hostedZoneId) {
      // Use fromHostedZoneAttributes instead of fromHostedZoneId to have access to zoneName
      hostedZone = HostedZone.fromHostedZoneAttributes(this, 'ImportedHostedZone', {
        zoneName: domainName,
        hostedZoneId: hostedZoneId
      });
    } else {
      hostedZone = new HostedZone(this, 'HostedZone', {
        zoneName: domainName
      });
    }

    // Define a unique name for the WorkMail organization
    const organizationName = `${domainName.replace(/\./g, '-')}-mail-org`;

    // Create SES domain identity (still needed for sending emails)
    this.sesIdentity = new EmailIdentity(this, 'DomainIdentity', {
      identity: Identity.domain(domainName),
      mailFromDomain: `mail.${domainName}`, // Use a subdomain for MAIL FROM
      dkimSigning: true, // Enable DKIM
    });

    // Create IAM role with permissions to use both SES and WorkMail
    this.sesIamRole = new Role(this, 'EmailServicesRole', {
      assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
      description: 'IAM role for accessing email services',
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('AmazonSESFullAccess'),
        ManagedPolicy.fromAwsManagedPolicyName('AmazonWorkMailFullAccess')
      ],
      inlinePolicies: {
        'EmailPolicy': new PolicyDocument({
          statements: [
            new PolicyStatement({
              sid: 'AllowEmailServices',
              effect: Effect.ALLOW,
              actions: [
                'ses:SendEmail',
                'ses:SendRawEmail',
                'ses:SendTemplatedEmail',
                'workmail:*'
              ],
              resources: ['*']
            })
          ]
        })
      }
    });

    // Create WorkMail organization using a Custom Resource
    const workMailOrgFunction = new lambda.Function(this, 'WorkMailOrgFunction', {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const AWS = require('aws-sdk');
        const workmail = new AWS.WorkMail({ region: process.env.AWS_REGION });
        
        exports.handler = async (event) => {
          console.log('Event:', JSON.stringify(event, null, 2));
          
          if (event.RequestType === 'Create') {
            try {
              // Create WorkMail organization - don't set DirectoryId
              const createOrgResult = await workmail.createOrganization({
                Alias: event.ResourceProperties.OrganizationName
              }).promise();
              
              // Now register the domain separately
              try {
                await workmail.registerDomain({
                  OrganizationId: createOrgResult.OrganizationId,
                  DomainName: event.ResourceProperties.DomainName
                }).promise();
                console.log('Domain registered for organization');
              } catch (domainError) {
                console.error('Error registering domain:', domainError);
                // Continue as domain might be added later manually
              }
              
              console.log('Organization created with ID:', createOrgResult.OrganizationId);
              
              return {
                PhysicalResourceId: createOrgResult.OrganizationId,
                Data: {
                  OrganizationId: createOrgResult.OrganizationId
                }
              };
            } catch (error) {
              console.error('Error creating WorkMail organization:', error);
              throw error;
            }
          } else if (event.RequestType === 'Delete') {
            try {
              // Only attempt to delete if it's a valid ID pattern
              if (event.PhysicalResourceId && event.PhysicalResourceId.match(/^m-[0-9a-f]{32}$/)) {
                await workmail.deleteOrganization({
                  OrganizationId: event.PhysicalResourceId,
                  DeleteDirectory: false
                }).promise();
                console.log('Organization deleted');
              } else {
                console.log('Not attempting to delete invalid organization ID:', event.PhysicalResourceId);
              }
              
              return {
                PhysicalResourceId: event.PhysicalResourceId
              };
            } catch (error) {
              console.error('Error deleting WorkMail organization:', error);
              // Don't throw on delete to allow stack cleanup
              return {
                PhysicalResourceId: event.PhysicalResourceId
              };
            }
          } else { // Update
            return {
              PhysicalResourceId: event.PhysicalResourceId,
              Data: {
                OrganizationId: event.PhysicalResourceId
              }
            };
          }
        };
      `),
      timeout: Duration.minutes(5),
    });

    // Grant the Lambda function full access to WorkMail, Directory Service, and SES
    workMailOrgFunction.role?.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName('AmazonSESFullAccess')
    );
    
    workMailOrgFunction.role?.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName('AmazonWorkMailFullAccess')
    );
    
    // Add all required Directory Service permissions explicitly
    workMailOrgFunction.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          // Additional Directory Service permissions
          'ds:*',  // Full Directory Service permissions
          
          // Other required permissions that might be missing
          'ses:*',  // Full SES permissions
          'ec2:DescribeVpcs',
          'ec2:DescribeSubnets',
          'ec2:DescribeAvailabilityZones',
          'route53:*'  // Access to Route53 for DNS management
        ],
        resources: ['*']
      })
    );

    const createWorkMailOrgProvider = new cr.Provider(this, 'WorkMailOrgProvider', {
      onEventHandler: workMailOrgFunction,
      providerFunctionName: `${id}-WorkMailOrgProviderFn`,
    });

    // Create the WorkMail organization
    const workMailOrg = new cdk.CustomResource(this, 'WorkMailOrganization', {
      serviceToken: createWorkMailOrgProvider.serviceToken,
      properties: {
        OrganizationName: organizationName,
        DomainName: domainName,
      },
    });

    const workMailOrgId = workMailOrg.getAttString('OrganizationId');
    
    // Create DNS records for WorkMail - autodiscover for email clients
    new CnameRecord(this, 'AutodiscoverCnameRecord', {
      zone: hostedZone,
      recordName: 'autodiscover',
      domainName: `autodiscover.mail.${this.region}.awsapps.com`,
    });

    // We don't create the SPF TXT record for the domain since it likely already exists
    // Instead we'll add instructions on how to update it
    
    // Create MAIL FROM MX record (needed for SES) 
    new MxRecord(this, 'MailFromMxRecord', {
      zone: hostedZone,
      recordName: `mail.${domainName}`,
      values: [{
        hostName: `feedback-smtp.${this.region}.amazonses.com`,
        priority: 10
      }]
    });

    // Create MAIL FROM SPF record
    new TxtRecord(this, 'MailFromSpfRecord', {
      zone: hostedZone,
      recordName: `mail.${domainName}`,
      values: ['v=spf1 include:amazonses.com ~all']
    });
    
    // Create MX record for domain (for WorkMail)
    new MxRecord(this, 'WorkMailMxRecord', {
      zone: hostedZone,
      recordName: domainName, 
      values: [{
        hostName: `inbound-smtp.${this.region}.amazonaws.com`,
        priority: 10
      }]
    });

    // Output important information about the WorkMail implementation
    new CfnOutput(this, 'WorkMailOrganizationID', {
      value: workMailOrgId,
      description: 'WorkMail Organization ID'
    });

    new CfnOutput(this, 'WorkMailConsoleURL', {
      value: `https://${this.region}.console.aws.amazon.com/workmail/v2/home?region=${this.region}#/organizations/${workMailOrgId}`,
      description: 'WorkMail Console URL'
    });
    
    new CfnOutput(this, 'WorkMailSetupInstructions', {
      value: `
========== AMAZON WORKMAIL SETUP INSTRUCTIONS ==========

To complete the WorkMail setup for ${domainName}:

1. Go to the WorkMail Console:
   https://${this.region}.console.aws.amazon.com/workmail/v2/home?region=${this.region}#/organizations/${workMailOrgId}

2. Complete domain verification if required:
   - In the navigation pane, choose "Domains"
   - Select ${domainName}
   - Follow the steps to verify ownership if needed

3. Create user accounts:
   - In the navigation pane, choose "Users"
   - Click "Create user"
   - Create accounts like:
     * info@${domainName}
     * admin@${domainName}
     * your-name@${domainName}

4. Access WorkMail:
   - After creating users, you can access WorkMail at:
     https://mail.${this.region}.awsapps.com/mail

5. Update your domain's SPF record:
   - You need to manually update the existing SPF record for your domain
   - Find your existing TXT record with "v=spf1" at the beginning
   - Add "include:mail.${this.region}.awsapps.com" before the "~all" or "-all" at the end
   - Example: "v=spf1 include:amazonses.com include:mail.${this.region}.awsapps.com ~all"
   - This step is crucial for email deliverability

6. Set up email clients:
   - Users can set up any email client using their WorkMail credentials
   - IMAP, POP3, and SMTP settings will be provided in the WorkMail console
   - Mobile apps can also be configured with these settings

The following DNS records have been automatically set up:
- MX record for receiving email (domain -> inbound-smtp.${this.region}.amazonaws.com)
- MX record for SES mail-from domain (mail subdomain -> feedback-smtp)
- Autodiscover record for email client configuration
- Additional mail-from SPF record

Note: Domain SPF record needs manual update as explained in step 5.
      `,
      description: 'Amazon WorkMail Setup Instructions'
    });

    new CfnOutput(this, 'SesIdentityArn', {
      value: this.sesIdentity.emailIdentityArn,
      description: 'SES domain identity ARN (for sending emails)'
    });

    new CfnOutput(this, 'EmailServicesRoleArn', {
      value: this.sesIamRole.roleArn,
      description: 'IAM role ARN for accessing email services'
    });
  }
}
