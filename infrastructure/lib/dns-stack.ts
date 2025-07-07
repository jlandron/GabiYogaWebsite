import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { IHostedZone, HostedZone } from 'aws-cdk-lib/aws-route53';
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';
import { ApplicationLoadBalancer } from 'aws-cdk-lib/aws-elasticloadbalancingv2';

export interface DnsStackProps extends StackProps {
  loadBalancer: ApplicationLoadBalancer;
  domainName: string;
}

export class DnsStack extends Stack {
  public readonly hostedZone: IHostedZone;
  public readonly certificate: Certificate;

  constructor(scope: Construct, id: string, props: DnsStackProps) {
    super(scope, id, props);

    // Use existing hosted zone created by the Route53 domain registrar
    // instead of creating a new one to avoid duplicate hosted zones
    this.hostedZone = HostedZone.fromHostedZoneAttributes(this, 'ImportedHostedZone', {
      zoneName: props.domainName,
      hostedZoneId: 'Z0858162FM97J2FO2QJU', // Registrar-created zone
    });

    // Create an ACM certificate for the domain and www subdomain
    this.certificate = new Certificate(this, 'Certificate', {
      domainName: props.domainName,
      subjectAlternativeNames: [`www.${props.domainName}`],
      validation: CertificateValidation.fromDns(this.hostedZone),
    });
    
    // Note: We don't create target groups or HTTPS listeners here to avoid circular dependencies
    // Instead, we should pass the certificate back to WebAppStack to configure HTTPS

    // REMOVED: Creating the apex A record and www CNAME record
    // These records already exist in the hosted zone which was causing deployment failures
    // If you need to update these records, use the AWS Console or CLI instead
    
    // Output the nameservers and hosted zone ID
    new CfnOutput(this, 'HostedZoneId', {
      value: this.hostedZone.hostedZoneId,
      description: 'Route53 Hosted Zone ID',
    });

    new CfnOutput(this, 'CertificateArn', {
      value: this.certificate.certificateArn,
      description: 'ACM Certificate ARN',
    });

    new CfnOutput(this, 'DnsConfigInstructions', {
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
