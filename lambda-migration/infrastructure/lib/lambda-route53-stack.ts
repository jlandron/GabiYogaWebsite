import * as cdk from 'aws-cdk-lib';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';

export interface LambdaRoute53StackProps extends cdk.StackProps {
  stage: string;
  apiGateway: any; // We don't actually use this in the modified version
  domainName: string; // e.g., gabi.yoga
}

export class LambdaRoute53Stack extends cdk.Stack {
  public readonly customDomainName: string;

  constructor(scope: Construct, id: string, props: LambdaRoute53StackProps) {
    super(scope, id, props);

    const { stage, domainName } = props;
    const resourcePrefix = `GabiYoga-${stage}`;
    
    // Determine the appropriate subdomain based on stage
    this.customDomainName = stage === 'prod' ? domainName : `${stage}.${domainName}`;
    
    // Look up existing Route53 hosted zone
    const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName,
    });
    
    // The following line just creates a dummy resource to prevent the stack from being empty
    // All the actual resources (domain, certificate, base path mapping) are managed manually
    new cdk.CfnResource(this, 'DummyResource', {
      type: 'AWS::CloudFormation::WaitConditionHandle',
    });
    
    // Outputs
    new cdk.CfnOutput(this, 'CustomDomainUrl', {
      value: `https://${this.customDomainName}`,
      description: 'Custom domain URL for the API',
      exportName: `${resourcePrefix}-CustomDomainUrl`,
    });
    
    new cdk.CfnOutput(this, 'HostedZoneId', {
      value: hostedZone.hostedZoneId,
      description: 'Route53 Hosted Zone ID',
      exportName: `${resourcePrefix}-HostedZoneId`,
    });
  }
}
