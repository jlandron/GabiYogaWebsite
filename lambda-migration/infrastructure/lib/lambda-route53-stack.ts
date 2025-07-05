import * as cdk from 'aws-cdk-lib';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';

export interface LambdaRoute53StackProps extends cdk.StackProps {
  stage: string;
  apiGateway?: any; // Optional to avoid circular dependencies
  domainName: string; // e.g., gabi.yoga
}

export class LambdaRoute53Stack extends cdk.Stack {
  public readonly customDomainName: string;
  public readonly hostedZone: route53.IHostedZone;

  constructor(scope: Construct, id: string, props: LambdaRoute53StackProps) {
    super(scope, id, props);

    const { stage, apiGateway, domainName } = props;
    const resourcePrefix = `GabiYoga-${stage}`;
    
    // Determine the appropriate subdomain based on stage
    this.customDomainName = stage === 'prod' ? domainName : `${stage}.${domainName}`;
    
    // Look up existing Route53 hosted zone - only the domain is managed manually
    this.hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName,
    });
    
    // Create Certificate for custom domain - managed by CDK
    const certificate = new acm.Certificate(this, 'Certificate', {
      domainName: this.customDomainName,
      validation: acm.CertificateValidation.fromDns(this.hostedZone),
    });
    
    // Create a custom domain name for API Gateway - managed by CDK
    const customDomain = new apigateway.DomainName(this, 'CustomDomainName', {
      domainName: this.customDomainName,
      certificate,
      endpointType: apigateway.EndpointType.EDGE,
      securityPolicy: apigateway.SecurityPolicy.TLS_1_2,
    });

    // Only create base path mapping if apiGateway is provided
    if (apiGateway) {
      // Add base path mapping to map the custom domain to API Gateway
      // Use BasePathMapping instead of CfnBasePathMapping for better conflict handling
      customDomain.addBasePathMapping(apiGateway, {
        basePath: '',  // Empty string for root path
      });
    }
    
    // Create A record to point the subdomain to the API Gateway custom domain
    new route53.ARecord(this, 'ApiAliasRecord', {
      zone: this.hostedZone,
      recordName: stage === 'prod' ? undefined : stage, // Omit recordName for root domain in prod
      target: route53.RecordTarget.fromAlias(new targets.ApiGatewayDomain(customDomain)),
      ttl: cdk.Duration.minutes(5),
    });
    
    // Outputs
    new cdk.CfnOutput(this, 'CustomDomainUrl', {
      value: `https://${this.customDomainName}`,
      description: 'Custom domain URL for the API',
      exportName: `${resourcePrefix}-CustomDomainUrl`,
    });
    
    new cdk.CfnOutput(this, 'HostedZoneId', {
      value: this.hostedZone.hostedZoneId,
      description: 'Route53 Hosted Zone ID',
      exportName: `${resourcePrefix}-HostedZoneId`,
    });
    
    new cdk.CfnOutput(this, 'CertificateArn', {
      value: certificate.certificateArn,
      description: 'ACM Certificate ARN',
      exportName: `${resourcePrefix}-CertificateArn`,
    });
  }
}
