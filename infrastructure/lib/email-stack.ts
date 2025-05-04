import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
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

export interface EmailStackProps extends StackProps {
  domainName: string;
  hostedZoneId?: string; // Optional - if you have an existing hosted zone
}

/**
 * AWS SES Stack for sending emails from the Gabi Yoga website
 * This stack creates the necessary resources for sending emails via AWS SES
 * including domain identity, DKIM records, and IAM policies
 */
export class EmailStack extends Stack {
  public readonly sesIdentity: EmailIdentity;
  public readonly sesIamRole: Role;

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

    // Create SES domain identity with DKIM signing
    this.sesIdentity = new EmailIdentity(this, 'DomainIdentity', {
      identity: Identity.domain(domainName),
      mailFromDomain: `mail.${domainName}`, // Use a subdomain for MAIL FROM
      dkimSigning: true, // Enable DKIM
    });
    
    // Create explicit instructions for manually adding DKIM CNAME records
    new CfnOutput(this, 'DkimSetupInstructions', {
      value: `
========== IMPORTANT: DKIM SETUP REQUIRED ==========

To verify your domain ownership for sending emails, you need to add 3 DKIM CNAME records to your DNS settings.

Follow these steps:
1. Go to the AWS SES console for your domain: 
   https://${this.region}.console.aws.amazon.com/ses/home?region=${this.region}#/verified-identities/${domainName}
   
2. In the "DKIM" section, click "View DKIM settings"

3. Copy each of the 3 CNAME records and add them to your domain's DNS settings

   For each record:
   - Record type: CNAME
   - Name: [token1]._domainkey.${domainName} (from SES console)
   - Value: [token1].dkim.amazonses.com (from SES console)

   Repeat for all 3 CNAME records with their respective tokens.

4. Wait up to 72 hours for the verification process to complete

Note: If using Route53 as your DNS provider and it's managed in this stack, 
the records should be created automatically, but verify they appear in the Route53 console.
`,
      description: 'Instructions for setting up DKIM records'
    });
    
    // Output the SES console URL for easy access
    new CfnOutput(this, 'SesConsoleUrl', {
      value: `https://${this.region}.console.aws.amazon.com/ses/home?region=${this.region}#/verified-identities/${domainName}`,
      description: 'SES Console URL for this domain'
    });

    // Create IAM role for SES access
    this.sesIamRole = new Role(this, 'SesIamRole', {
      assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
      description: 'IAM role for accessing SES',
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('AmazonSESFullAccess')
      ],
      inlinePolicies: {
        'SesPolicy': new PolicyDocument({
          statements: [
            new PolicyStatement({
              sid: 'AllowSendEmail',
              effect: Effect.ALLOW,
              actions: [
                'ses:SendEmail',
                'ses:SendRawEmail',
                'ses:SendTemplatedEmail'
              ],
              resources: ['*']
            })
          ]
        })
      }
    });

    // Create SPF record (TXT record)
    new TxtRecord(this, 'SpfRecord', {
      zone: hostedZone,
      recordName: domainName,
      values: ['v=spf1 include:amazonses.com ~all']
    });

    // Create MAIL FROM MX record
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

    // Outputs
    new CfnOutput(this, 'SesIdentityArn', {
      value: this.sesIdentity.emailIdentityArn,
      description: 'SES domain identity ARN'
    });

    new CfnOutput(this, 'SesIamRoleArn', {
      value: this.sesIamRole.roleArn,
      description: 'IAM role ARN for SES access'
    });
  }
}
