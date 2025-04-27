import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';

export interface DnsStackProps extends cdk.StackProps {
  loadBalancer: elbv2.ApplicationLoadBalancer;
  domainName: string;
}

export class DnsStack extends cdk.Stack {
  public readonly hostedZone: route53.IHostedZone;
  public readonly certificate: acm.Certificate;

  constructor(scope: Construct, id: string, props: DnsStackProps) {
    super(scope, id, props);

    // Use existing hosted zone created by the Route53 domain registrar
    // instead of creating a new one to avoid duplicate hosted zones
    this.hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'ImportedHostedZone', {
      zoneName: props.domainName,
      hostedZoneId: 'Z0858162FM97J2FO2QJU', // Registrar-created zone
    });

    // Create an ACM certificate for the domain and www subdomain
    this.certificate = new acm.Certificate(this, 'Certificate', {
      domainName: props.domainName,
      subjectAlternativeNames: [`www.${props.domainName}`],
      validation: acm.CertificateValidation.fromDns(this.hostedZone),
    });
    
    // Note: We don't create target groups or HTTPS listeners here to avoid circular dependencies
    // Instead, we should pass the certificate back to WebAppStack to configure HTTPS

    // REMOVED: Creating the apex A record and www CNAME record
    // These records already exist in the hosted zone which was causing deployment failures
    // If you need to update these records, use the AWS Console or CLI instead
    
    // Output the nameservers and hosted zone ID
    new cdk.CfnOutput(this, 'HostedZoneId', {
      value: this.hostedZone.hostedZoneId,
      description: 'Route53 Hosted Zone ID',
    });

    new cdk.CfnOutput(this, 'CertificateArn', {
      value: this.certificate.certificateArn,
      description: 'ACM Certificate ARN',
    });

    new cdk.CfnOutput(this, 'DnsConfigInstructions', {
      value: `
        Using existing hosted zone ID: ${this.hostedZone.hostedZoneId}
        
        DNS records were NOT created or modified by this stack to avoid conflicts.
        
        To manually update DNS records, use:
        aws route53 change-resource-record-sets --hosted-zone-id ${this.hostedZone.hostedZoneId} --change-batch file://dns-changes.json
        
        Get nameservers with:
        aws route53 get-hosted-zone --id ${this.hostedZone.hostedZoneId} --query "DelegationSet.NameServers" --output text
        
        If you are using an external domain registrar, update the nameservers with those returned by the above command.
      `,
      description: 'DNS configuration instructions',
    });
  }
}
