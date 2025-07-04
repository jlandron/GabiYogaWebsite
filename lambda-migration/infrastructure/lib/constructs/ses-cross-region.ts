import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as path from 'path';
import { Construct } from 'constructs';

/**
 * Properties for the SESCrossRegionVerification construct
 */
export interface SESCrossRegionVerificationProps {
  /**
   * The domain name to verify
   */
  domainName: string;
  
  /**
   * The source region where the domain is already verified
   */
  sourceRegion: string;
  
  /**
   * The target region where we want to use the domain
   */
  targetRegion: string;
}

/**
 * A construct to handle cross-region verification of SES domains
 */
export class SESCrossRegionVerification extends Construct {
  public readonly customResource: cdk.CustomResource;
  
  constructor(scope: Construct, id: string, props: SESCrossRegionVerificationProps) {
    super(scope, id);
    
    // Create a Lambda function for the custom resource
    const verificationLambda = new lambda.Function(this, 'VerificationFunction', {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: 'index.handler', // Use index.js as entry point
      code: lambda.Code.fromAsset(path.join(__dirname, '../../resources')),
      timeout: cdk.Duration.minutes(5),
      description: 'Lambda function to handle cross-region SES domain verification',
    });
    
    // Grant permissions to the Lambda function
    verificationLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'ses:GetIdentityVerificationAttributes',
        'ses:GetIdentityDkimAttributes',
        'ses:GetIdentityMailFromDomainAttributes',
        'ses:ListIdentities',
        'ses:VerifyDomainIdentity',
        'ses:SetIdentityDkimEnabled',
        'ses:SetIdentityMailFromDomain'
      ],
      resources: ['*'],
      effect: iam.Effect.ALLOW,
    }));
    
    // Create a provider for the custom resource
    const provider = new cr.Provider(this, 'Provider', {
      onEventHandler: verificationLambda,
    });
    
    // Create the custom resource
    this.customResource = new cdk.CustomResource(this, 'Resource', {
      serviceToken: provider.serviceToken,
      properties: {
        DomainName: props.domainName,
        SourceRegion: props.sourceRegion,
        TargetRegion: props.targetRegion,
      },
    });
  }
}
