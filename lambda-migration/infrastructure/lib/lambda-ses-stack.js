"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LambdaSesStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const ses = __importStar(require("aws-cdk-lib/aws-ses"));
const route53 = __importStar(require("aws-cdk-lib/aws-route53"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const ses_cross_region_1 = require("./constructs/ses-cross-region");
/**
 * Stack for SES email sending infrastructure
 * Handles email domain verification and necessary IAM permissions
 */
class LambdaSesStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const { stage, domainName, hostedZoneId } = props;
        const resourcePrefix = `GabiYoga-${stage}`;
        // Look up the hosted zone if hostedZoneId is provided
        let hostedZone;
        if (hostedZoneId) {
            hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'ImportedHostedZone', {
                hostedZoneId,
                zoneName: domainName,
            });
        }
        // Handle SES domain identity differently based on environment
        if (stage === 'prod') {
            // For production, completely skip creating the domain identity
            // This avoids conflicts with the existing identity in the dev stack
            // Instead, add a comment in the stack outputs
            // Add a metadata node to the stack to document the decision
            this.node.addMetadata('SES.DomainIdentity', {
                domainName: domainName,
                status: 'IMPORTED',
                note: 'Using existing domain identity from dev environment'
            });
            // Output for reference
            new cdk.CfnOutput(this, 'DomainIdentityStatus', {
                value: 'Using existing identity from dev environment',
                description: 'SES Domain Identity Status',
            });
        }
        else {
            // For dev environment, create the domain identity as usual
            new ses.EmailIdentity(this, 'DomainIdentity', {
                identity: ses.Identity.domain(domainName),
                mailFromDomain: `mail.${domainName}`,
            });
        }
        // If we have a hosted zone, we'll add a comment node (CDK metadata) to document
        // that we're reusing the domain from Route53 stack
        if (hostedZone) {
            cdk.Aspects.of(this).add({
                visit(node) {
                    if (node instanceof ses.EmailIdentity) {
                        // Add a CDK metadata annotation to document the domain reuse
                        node.node.addMetadata('info', `Domain ${domainName} is managed by Route53 stack with hosted zone ID: ${hostedZoneId}`);
                    }
                }
            });
        }
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
        new ses_cross_region_1.SESCrossRegionVerification(this, 'CrossRegionVerification', {
            domainName: domainName,
            sourceRegion: 'us-west-2',
            targetRegion: this.region, // Target region where we want to use the domain
        });
        // Determine the appropriate email prefix based on stage
        const emailPrefix = stage === 'prod' ? 'noreply' : 'noreply' + stage;
        // Outputs
        new cdk.CfnOutput(this, 'EmailDomainIdentity', {
            value: domainName,
            description: 'SES Verified Domain',
            exportName: `${resourcePrefix}-EmailDomain`,
        });
        new cdk.CfnOutput(this, 'DefaultSenderAddress', {
            value: `${emailPrefix}@${domainName}`,
            description: 'Default Sender Email Address',
            exportName: `${resourcePrefix}-SenderEmail`,
        });
    }
}
exports.LambdaSesStack = LambdaSesStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFtYmRhLXNlcy1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImxhbWJkYS1zZXMtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMseURBQTJDO0FBQzNDLGlFQUFtRDtBQUNuRCx5REFBMkM7QUFFM0Msb0VBQTJFO0FBUTNFOzs7R0FHRztBQUNILE1BQWEsY0FBZSxTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQzNDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBMEI7UUFDbEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsTUFBTSxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLEdBQUcsS0FBSyxDQUFDO1FBQ2xELE1BQU0sY0FBYyxHQUFHLFlBQVksS0FBSyxFQUFFLENBQUM7UUFFM0Msc0RBQXNEO1FBQ3RELElBQUksVUFBVSxDQUFDO1FBQ2YsSUFBSSxZQUFZLEVBQUU7WUFDaEIsVUFBVSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsd0JBQXdCLENBQUMsSUFBSSxFQUFFLG9CQUFvQixFQUFFO2dCQUNuRixZQUFZO2dCQUNaLFFBQVEsRUFBRSxVQUFVO2FBQ3JCLENBQUMsQ0FBQztTQUNKO1FBRUQsOERBQThEO1FBQzlELElBQUksS0FBSyxLQUFLLE1BQU0sRUFBRTtZQUNwQiwrREFBK0Q7WUFDL0Qsb0VBQW9FO1lBQ3BFLDhDQUE4QztZQUU5Qyw0REFBNEQ7WUFDNUQsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsb0JBQW9CLEVBQUU7Z0JBQzFDLFVBQVUsRUFBRSxVQUFVO2dCQUN0QixNQUFNLEVBQUUsVUFBVTtnQkFDbEIsSUFBSSxFQUFFLHFEQUFxRDthQUM1RCxDQUFDLENBQUM7WUFFSCx1QkFBdUI7WUFDdkIsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFB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QUFXLElBQUksVUFBVSxFQUFFO1lBQ3JDLFdBQVcsRUFBRSw4QkFBOEI7WUFDM0MsVUFBVSxFQUFFLEdBQUcsY0FBYyxjQUFjO1NBQzVDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQWpKRCx3Q0FpSkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgc2VzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zZXMnO1xuaW1wb3J0ICogYXMgcm91dGU1MyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtcm91dGU1Myc7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IFNFU0Nyb3NzUmVnaW9uVmVyaWZpY2F0aW9uIH0gZnJvbSAnLi9jb25zdHJ1Y3RzL3Nlcy1jcm9zcy1yZWdpb24nO1xuXG5leHBvcnQgaW50ZXJmYWNlIExhbWJkYVNlc1N0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XG4gIHN0YWdlOiBzdHJpbmc7XG4gIGRvbWFpbk5hbWU6IHN0cmluZztcbiAgaG9zdGVkWm9uZUlkPzogc3RyaW5nO1xufVxuXG4vKipcbiAqIFN0YWNrIGZvciBTRVMgZW1haWwgc2VuZGluZyBpbmZyYXN0cnVjdHVyZVxuICogSGFuZGxlcyBlbWFpbCBkb21haW4gdmVyaWZpY2F0aW9uIGFuZCBuZWNlc3NhcnkgSUFNIHBlcm1pc3Npb25zXG4gKi9cbmV4cG9ydCBjbGFzcyBMYW1iZGFTZXNTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBMYW1iZGFTZXNTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICBjb25zdCB7IHN0YWdlLCBkb21haW5OYW1lLCBob3N0ZWRab25lSWQgfSA9IHByb3BzO1xuICAgIGNvbnN0IHJlc291cmNlUHJlZml4ID0gYEdhYmlZb2dhLSR7c3RhZ2V9YDtcblxuICAgIC8vIExvb2sgdXAgdGhlIGhvc3RlZCB6b25lIGlmIGhvc3RlZFpvbmVJZCBpcyBwcm92aWRlZFxuICAgIGxldCBob3N0ZWRab25lO1xuICAgIGlmIChob3N0ZWRab25lSWQpIHtcbiAgICAgIGhvc3RlZFpvbmUgPSByb3V0ZTUzLkhvc3RlZFpvbmUuZnJvbUhvc3RlZFpvbmVBdHRyaWJ1dGVzKHRoaXMsICdJbXBvcnRlZEhvc3RlZFpvbmUnLCB7XG4gICAgICAgIGhvc3RlZFpvbmVJZCxcbiAgICAgICAgem9uZU5hbWU6IGRvbWFpbk5hbWUsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBIYW5kbGUgU0VTIGRvbWFpbiBpZGVudGl0eSBkaWZmZXJlbnRseSBiYXNlZCBvbiBlbnZpcm9ubWVudFxuICAgIGlmIChzdGFnZSA9PT0gJ3Byb2QnKSB7XG4gICAgICAvLyBGb3IgcHJvZHVjdGlvbiwgY29tcGxldGVseSBza2lwIGNyZWF0aW5nIHRoZSBkb21haW4gaWRlbnRpdHlcbiAgICAgIC8vIFRoaXMgYXZvaWRzIGNvbmZsaWN0cyB3aXRoIHRoZSBleGlzdGluZyBpZGVudGl0eSBpbiB0aGUgZGV2IHN0YWNrXG4gICAgICAvLyBJbnN0ZWFkLCBhZGQgYSBjb21tZW50IGluIHRoZSBzdGFjayBvdXRwdXRzXG4gICAgICBcbiAgICAgIC8vIEFkZCBhIG1ldGFkYXRhIG5vZGUgdG8gdGhlIHN0YWNrIHRvIGRvY3VtZW50IHRoZSBkZWNpc2lvblxuICAgICAgdGhpcy5ub2RlLmFkZE1ldGFkYXRhKCdTRVMuRG9tYWluSWRlbnRpdHknLCB7XG4gICAgICAgIGRvbWFpbk5hbWU6IGRvbWFpbk5hbWUsXG4gICAgICAgIHN0YXR1czogJ0lNUE9SVEVEJyxcbiAgICAgICAgbm90ZTogJ1VzaW5nIGV4aXN0aW5nIGRvbWFpbiBpZGVudGl0eSBmcm9tIGRldiBlbnZpcm9ubWVudCdcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICAvLyBPdXRwdXQgZm9yIHJlZmVyZW5jZVxuICAgICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0RvbWFpbklkZW50aXR5U3RhdHVzJywge1xuICAgICAgICB2YWx1ZTogJ1VzaW5nIGV4aXN0aW5nIGlkZW50aXR5IGZyb20gZGV2IGVudmlyb25tZW50JyxcbiAgICAgICAgZGVzY3JpcHRpb246ICdTRVMgRG9tYWluIElkZW50aXR5IFN0YXR1cycsXG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gRm9yIGRldiBlbnZpcm9ubWVudCwgY3JlYXRlIHRoZSBkb21haW4gaWRlbnRpdHkgYXMgdXN1YWxcbiAgICAgIG5ldyBzZXMuRW1haWxJZGVudGl0eSh0aGlzLCAnRG9tYWluSWRlbnRpdHknLCB7XG4gICAgICAgIGlkZW50aXR5OiBzZXMuSWRlbnRpdHkuZG9tYWluKGRvbWFpbk5hbWUpLFxuICAgICAgICBtYWlsRnJvbURvbWFpbjogYG1haWwuJHtkb21haW5OYW1lfWAsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBJZiB3ZSBoYXZlIGEgaG9zdGVkIHpvbmUsIHdlJ2xsIGFkZCBhIGNvbW1lbnQgbm9kZSAoQ0RLIG1ldGFkYXRhKSB0byBkb2N1bWVudFxuICAgIC8vIHRoYXQgd2UncmUgcmV1c2luZyB0aGUgZG9tYWluIGZyb20gUm91dGU1MyBzdGFja1xuICAgIGlmIChob3N0ZWRab25lKSB7XG4gICAgICBjZGsuQXNwZWN0cy5vZih0aGlzKS5hZGQoe1xuICAgICAgICB2aXNpdChub2RlKSB7XG4gICAgICAgICAgaWYgKG5vZGUgaW5zdGFuY2VvZiBzZXMuRW1haWxJZGVudGl0eSkge1xuICAgICAgICAgICAgLy8gQWRkIGEgQ0RLIG1ldGFkYXRhIGFubm90YXRpb24gdG8gZG9jdW1lbnQgdGhlIGRvbWFpbiByZXVzZVxuICAgICAgICAgICAgbm9kZS5ub2RlLmFkZE1ldGFkYXRhKCdpbmZvJywgYERvbWFpbiAke2RvbWFpbk5hbWV9IGlzIG1hbmFnZWQgYnkgUm91dGU1MyBzdGFjayB3aXRoIGhvc3RlZCB6b25lIElEOiAke2hvc3RlZFpvbmVJZH1gKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIENyZWF0ZSBhIHNlbmRpbmcgcG9saWN5IHRoYXQgYWxsb3dzIHNlbmRpbmcgZW1haWxzIGZyb20gdGhpcyBkb21haW4gYW5kIHN1YmRvbWFpbnNcbiAgICBuZXcgaWFtLlBvbGljeSh0aGlzLCAnRW1haWxTZW5kaW5nUG9saWN5Jywge1xuICAgICAgcG9saWN5TmFtZTogYCR7cmVzb3VyY2VQcmVmaXh9LUVtYWlsU2VuZGluZ1BvbGljeWAsXG4gICAgICBzdGF0ZW1lbnRzOiBbXG4gICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgJ3NlczpTZW5kRW1haWwnLFxuICAgICAgICAgICAgJ3NlczpTZW5kUmF3RW1haWwnLFxuICAgICAgICAgICAgJ3NlczpTZW5kVGVtcGxhdGVkRW1haWwnLFxuICAgICAgICAgICAgJ3NlczpTZW5kQnVsa1RlbXBsYXRlZEVtYWlsJyxcbiAgICAgICAgICBdLFxuICAgICAgICAgIHJlc291cmNlczogWycqJ10sXG4gICAgICAgICAgY29uZGl0aW9uczoge1xuICAgICAgICAgICAgU3RyaW5nTGlrZToge1xuICAgICAgICAgICAgICAnc2VzOkZyb21BZGRyZXNzJzogW2AqQCR7ZG9tYWluTmFtZX1gLCBgKkAqLiR7ZG9tYWluTmFtZX1gXVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgIF1cbiAgICB9KTtcblxuICAgIC8vIERlZmluZSBhIHRlbXBsYXRlIGZvciB0cmFuc2FjdGlvbmFsIGVtYWlsc1xuICAgIC8vIFRoaXMgd2lsbCBiZSB1c2VkIGZvciBtdWx0aXBsZSBlbWFpbCB0eXBlc1xuICAgIG5ldyBzZXMuQ2ZuVGVtcGxhdGUodGhpcywgJ1RyYW5zYWN0aW9uYWxFbWFpbFRlbXBsYXRlJywge1xuICAgICAgdGVtcGxhdGU6IHtcbiAgICAgICAgdGVtcGxhdGVOYW1lOiBgJHtyZXNvdXJjZVByZWZpeH0tVHJhbnNhY3Rpb25hbEVtYWlsYCxcbiAgICAgICAgc3ViamVjdFBhcnQ6ICd7e3N1YmplY3R9fScsXG4gICAgICAgIGh0bWxQYXJ0OiBgXG4gICAgICAgICAgPCFET0NUWVBFIGh0bWw+XG4gICAgICAgICAgPGh0bWw+XG4gICAgICAgICAgPGhlYWQ+XG4gICAgICAgICAgICAgIDxtZXRhIGNoYXJzZXQ9XCJ1dGYtOFwiPlxuICAgICAgICAgICAgICA8bWV0YSBuYW1lPVwidmlld3BvcnRcIiBjb250ZW50PVwid2lkdGg9ZGV2aWNlLXdpZHRoLCBpbml0aWFsLXNjYWxlPTEuMFwiPlxuICAgICAgICAgICAgICA8dGl0bGU+e3tzdWJqZWN0fX08L3RpdGxlPlxuICAgICAgICAgICAgICA8c3R5bGU+XG4gICAgICAgICAgICAgICAgICBib2R5IHsgZm9udC1mYW1pbHk6IEFyaWFsLCBzYW5zLXNlcmlmOyBsaW5lLWhlaWdodDogMS42OyBjb2xvcjogIzMzMzsgfVxuICAgICAgICAgICAgICAgICAgLmNvbnRhaW5lciB7IG1heC13aWR0aDogNjAwcHg7IG1hcmdpbjogMCBhdXRvOyBwYWRkaW5nOiAyMHB4OyB9XG4gICAgICAgICAgICAgICAgICAuaGVhZGVyIHsgYmFja2dyb3VuZDogbGluZWFyLWdyYWRpZW50KDEzNWRlZywgIzY2N2VlYSAwJSwgIzc2NGJhMiAxMDAlKTsgY29sb3I6IHdoaXRlOyBwYWRkaW5nOiAzMHB4OyB0ZXh0LWFsaWduOiBjZW50ZXI7IGJvcmRlci1yYWRpdXM6IDEwcHggMTBweCAwIDA7IH1cbiAgICAgICAgICAgICAgICAgIC5jb250ZW50IHsgYmFja2dyb3VuZDogI2Y5ZjlmOTsgcGFkZGluZzogMzBweDsgYm9yZGVyLXJhZGl1czogMCAwIDEwcHggMTBweDsgfVxuICAgICAgICAgICAgICAgICAgLmJ1dHRvbiB7IGRpc3BsYXk6IGlubGluZS1ibG9jazsgYmFja2dyb3VuZDogIzY2N2VlYTsgY29sb3I6IHdoaXRlOyBwYWRkaW5nOiAxMnB4IDMwcHg7IHRleHQtZGVjb3JhdGlvbjogbm9uZTsgYm9yZGVyLXJhZGl1czogNXB4OyBtYXJnaW46IDIwcHggMDsgfVxuICAgICAgICAgICAgICAgICAgLmZvb3RlciB7IHRleHQtYWxpZ246IGNlbnRlcjsgbWFyZ2luLXRvcDogMzBweDsgZm9udC1zaXplOiAxNHB4OyBjb2xvcjogIzY2NjsgfVxuICAgICAgICAgICAgICA8L3N0eWxlPlxuICAgICAgICAgIDwvaGVhZD5cbiAgICAgICAgICA8Ym9keT5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRhaW5lclwiPlxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImhlYWRlclwiPlxuICAgICAgICAgICAgICAgICAgICAgIDxoMT7wn6eY4oCN4pmA77iPIEdhYmkgWW9nYTwvaDE+XG4gICAgICAgICAgICAgICAgICAgICAgPHA+e3toZWFkZXJTdWJ0aXRsZX19PC9wPlxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgIHt7Y29udGVudH19XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmb290ZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgICA8cD7CqSAke25ldyBEYXRlKCkuZ2V0RnVsbFllYXIoKX0gR2FiaSBZb2dhLiBBbGwgcmlnaHRzIHJlc2VydmVkLjwvcD5cbiAgICAgICAgICAgICAgICAgICAgICA8cD5UaGlzIGVtYWlsIHdhcyBzZW50IHRvIHt7ZW1haWx9fTwvcD5cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2JvZHk+XG4gICAgICAgICAgPC9odG1sPlxuICAgICAgICBgLFxuICAgICAgICB0ZXh0UGFydDogJ3t7dGV4dENvbnRlbnR9fSdcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIENyb3NzLXJlZ2lvbiBjb25maWd1cmF0aW9uXG4gICAgLy8gV2hlbiB3ZSdyZSBkZXBsb3lpbmcgaW4gdXMtZWFzdC0xIGJ1dCBvdXIgZG9tYWluIGlzIGNvbmZpZ3VyZWQgaW4gdXMtd2VzdC0yXG4gICAgLy8gd2UgbmVlZCB0byBjcmVhdGUgYSBjcm9zcy1yZWdpb24gaWRlbnRpdHlcbiAgICBuZXcgU0VTQ3Jvc3NSZWdpb25WZXJpZmljYXRpb24odGhpcywgJ0Nyb3NzUmVnaW9uVmVyaWZpY2F0aW9uJywge1xuICAgICAgZG9tYWluTmFtZTogZG9tYWluTmFtZSxcbiAgICAgIHNvdXJjZVJlZ2lvbjogJ3VzLXdlc3QtMicsIC8vIFNvdXJjZSByZWdpb24gd2hlcmUgdGhlIGRvbWFpbiBpcyBhbHJlYWR5IHZlcmlmaWVkXG4gICAgICB0YXJnZXRSZWdpb246IHRoaXMucmVnaW9uLCAgLy8gVGFyZ2V0IHJlZ2lvbiB3aGVyZSB3ZSB3YW50IHRvIHVzZSB0aGUgZG9tYWluXG4gICAgfSk7XG5cbiAgICAvLyBEZXRlcm1pbmUgdGhlIGFwcHJvcHJpYXRlIGVtYWlsIHByZWZpeCBiYXNlZCBvbiBzdGFnZVxuICAgIGNvbnN0IGVtYWlsUHJlZml4ID0gc3RhZ2UgPT09ICdwcm9kJyA/ICdub3JlcGx5JyA6ICdub3JlcGx5JyArIHN0YWdlO1xuICAgIFxuICAgIC8vIE91dHB1dHNcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRW1haWxEb21haW5JZGVudGl0eScsIHtcbiAgICAgIHZhbHVlOiBkb21haW5OYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdTRVMgVmVyaWZpZWQgRG9tYWluJyxcbiAgICAgIGV4cG9ydE5hbWU6IGAke3Jlc291cmNlUHJlZml4fS1FbWFpbERvbWFpbmAsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRGVmYXVsdFNlbmRlckFkZHJlc3MnLCB7XG4gICAgICB2YWx1ZTogYCR7ZW1haWxQcmVmaXh9QCR7ZG9tYWluTmFtZX1gLFxuICAgICAgZGVzY3JpcHRpb246ICdEZWZhdWx0IFNlbmRlciBFbWFpbCBBZGRyZXNzJyxcbiAgICAgIGV4cG9ydE5hbWU6IGAke3Jlc291cmNlUHJlZml4fS1TZW5kZXJFbWFpbGAsXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==